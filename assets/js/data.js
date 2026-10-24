/* ============================================================
   data.js — loads the league Google Sheet (published as CSV).

   Every tab is fetched once, cached in localStorage for a few
   minutes, and returned as an array of plain objects keyed by the
   tab's header row. Pages never look at column positions, so
   columns can be reordered or added in the sheet freely.

     const { Events, Results } = await LTD.load('Events', 'Results');
     const players = await LTD.get('Players');
   ============================================================ */
const LTD = (() => {
  const SHEET = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vThPl-aawUyKmKR5HVxCzjhnptGU-dNYddfwgyd5khcLSmLO4lcx9TrQsUxbCW0EjNeDiOkhPWV_K1J/pub';

  // gid of each published tab. Meta holds the "last updated" stamp
  // written by the sheet's Apps Script (see README); leave it null
  // until that tab is published and the footer falls back to the
  // time the data was fetched.
  const TABS = {
    Players:    388113535,
    Courses:    547045433,
    Holes:      120928939,
    Events:     1355106842,
    Scorecards: 1342989548,
    Results:    380470810,
    Meta:       null,
  };

  // A row is kept only if these columns are filled in, which drops
  // the blank placeholder rows the sheet carries (e.g. P034–P039).
  const REQUIRED = {
    Players:    ['player_id', 'display_name'],
    Courses:    ['course_id'],
    Holes:      ['course_id', 'hole'],
    Events:     ['event_id'],
    Scorecards: ['event_id', 'player_id'],
    Results:    ['event_id', 'player_id'],
    Meta:       ['key'],
  };

  const CONFIG = {
    cacheMinutes: 5,
    // Results normally appear only once an event's status is
    // "complete". Events listed here are published early and shown
    // with a test-data banner until their status becomes complete,
    // so leaving an id here after the event is harmless.
    previewEvents: ['E2027-01'],
    skinBuyIn: 10,
  };

  const CACHE_PREFIX = 'ltd:v1:';
  const forceRefresh = new URLSearchParams(location.search).has('refresh');
  const inflight = {};
  let fetchedAt = null;

  function url(tab) {
    return SHEET + '?gid=' + TABS[tab] + '&single=true&output=csv';
  }

  function readCache(tab) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + tab);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function writeCache(tab, text) {
    try { localStorage.setItem(CACHE_PREFIX + tab, JSON.stringify({ t: Date.now(), text })); } catch (e) {}
  }

  // Header row → keys. Blank and duplicate headers are ignored, so
  // the unlabeled helper columns at the end of Scorecards drop out.
  function toObjects(text, tab) {
    const rows = Papa.parse(text, { skipEmptyLines: 'greedy' }).data;
    if (!rows.length) return [];
    const header = rows[0].map(h => String(h).trim());
    const cols = [];
    header.forEach((h, i) => { if (h && !cols.some(c => c.key === h)) cols.push({ key: h, i }); });
    const required = REQUIRED[tab] || [];
    return rows.slice(1)
      .map(r => {
        const o = {};
        cols.forEach(c => { o[c.key] = r[c.i] == null ? '' : String(r[c.i]).trim(); });
        return o;
      })
      .filter(o => required.every(k => o[k]));
  }

  async function fetchText(tab) {
    const cached = readCache(tab);
    const fresh = cached && Date.now() - cached.t < CONFIG.cacheMinutes * 60000;
    if (fresh && !forceRefresh) return { text: cached.text, t: cached.t };
    try {
      const res = await fetch(url(tab), { cache: 'no-store' });
      if (!res.ok) throw new Error(tab + ': HTTP ' + res.status);
      const text = await res.text();
      // A tab that was never published returns Google's HTML sign-in page.
      if (/^\s*<!DOCTYPE html/i.test(text)) throw new Error(tab + ' is not published as CSV');
      writeCache(tab, text);
      return { text, t: Date.now() };
    } catch (err) {
      if (cached) { console.warn('[LTD] using cached', tab, err); return { text: cached.text, t: cached.t, stale: true }; }
      throw err;
    }
  }

  function get(tab) {
    if (!(tab in TABS)) return Promise.reject(new Error('Unknown tab: ' + tab));
    if (TABS[tab] == null) return Promise.resolve([]);
    if (!inflight[tab]) {
      inflight[tab] = fetchText(tab).then(({ text, t }) => {
        fetchedAt = Math.max(fetchedAt || 0, t);
        return toObjects(text, tab);
      });
    }
    return inflight[tab];
  }

  async function load(...tabs) {
    const lists = await Promise.all(tabs.map(get));
    const out = {};
    tabs.forEach((t, i) => { out[t] = lists[i]; });
    return out;
  }

  // ---- value helpers: blank / "TBD" / "-" all mean "no value" ----
  const BLANK = /^(|tbd|tba|n\/a|na|-|—|–)$/i;
  function isBlank(v) { return v == null || BLANK.test(String(v).trim()); }
  function num(v) {
    if (isBlank(v)) return null;
    const n = Number(String(v).replace(/[$,%+]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  function str(v) { return isBlank(v) ? '' : String(v).trim(); }
  function bool(v) { return /^(true|yes|y|1|x)$/i.test(String(v || '').trim()); }
  // "2026-10-24" → local Date (not UTC, so it doesn't shift a day).
  function date(v) {
    if (isBlank(v)) return null;
    const m = String(v).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    const d = new Date(v);
    return isNaN(d) ? null : d;
  }

  // ---- event helpers ----
  function isComplete(ev) { return /^(complete|completed|final|done)$/i.test(str(ev.status)); }
  function isPreview(ev) { return CONFIG.previewEvents.includes(ev.event_id) && !isComplete(ev); }
  function isPublished(ev) { return isComplete(ev) || isPreview(ev); }
  function isCup(ev) { return /cup/i.test(str(ev.series)); }
  function season(ev) {
    const m = String(ev.event_id || '').match(/^E(\d{4})/);
    if (m) return +m[1];
    const d = date(ev.date);
    return d ? d.getFullYear() : null;
  }
  // Dated events by date, then undated (TBD) ones in event_id order.
  function sortEvents(events) {
    return events.slice().sort((a, b) => {
      const da = date(a.date), db = date(b.date);
      if (da && db && da - db) return da - db;
      if (da && !db) return -1;
      if (!da && db) return 1;
      return String(a.event_id).localeCompare(String(b.event_id));
    });
  }

  async function lastUpdated() {
    let stamp = null;
    try {
      const meta = await get('Meta');
      const row = meta.find(r => r.key === 'last_updated');
      if (row && !isBlank(row.value)) {
        const d = new Date(row.value);
        if (!isNaN(d)) stamp = d;
      }
    } catch (e) { console.warn('[LTD] Meta tab unavailable', e); }
    return stamp
      ? { date: stamp, source: 'sheet' }
      : { date: fetchedAt ? new Date(fetchedAt) : null, source: 'fetched' };
  }

  return {
    TABS, CONFIG, get, load, lastUpdated,
    isBlank, num, str, bool, date,
    isComplete, isPreview, isPublished, isCup, season, sortEvents,
  };
})();
