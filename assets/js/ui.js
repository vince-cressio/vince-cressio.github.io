/* ============================================================
   ui.js — small rendering helpers shared by every page.
   All sheet text goes through esc() before it reaches innerHTML.
   ============================================================ */
const UI = (() => {
  const { num, str, date } = LTD;

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const $ = sel => document.querySelector(sel);
  const param = k => new URLSearchParams(location.search).get(k);

  function fmtDate(v, opts) {
    const d = v instanceof Date ? v : date(v);
    if (!d) return 'TBD';
    return d.toLocaleDateString('en-US', opts || { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtDateTime(d) {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  const dash = v => (v == null || v === '' ? '—' : v);
  const fixed = (v, d = 1) => (v == null ? '—' : Number(v).toFixed(d));
  const money = v => '$' + Math.round(v).toLocaleString('en-US');
  const pct = v => (v == null ? '—' : Math.round(v * 100) + '%');
  const toPar = v => (v == null ? '—' : v === 0 ? 'E' : (v > 0 ? '+' : '') + v);
  function ordinal(n) {
    if (n == null) return '—';
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function initials(name) {
    return String(name || '?').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }
  // Photo from the Players photo_url column, otherwise initials.
  function avatar(player, cls = '') {
    const name = player ? (player.display_name || player.name) : '';
    const photo = player && str(player.photo_url);
    const fallback = esc(initials(name));
    if (!photo) return `<div class="avatar ${cls}">${fallback}</div>`;
    return `<div class="avatar ${cls}"><img src="${esc(photo)}" alt="" loading="lazy"
      onerror="this.parentNode.textContent='${fallback}'"></div>`;
  }
  function playerLink(id, name) {
    if (!id) return esc(name);
    return `<a class="player-link" href="/player.html?id=${encodeURIComponent(id)}">${esc(name)}</a>`;
  }

  function statusBadge(ev, hasResults) {
    if (LTD.isPreview(ev)) return '<span class="badge badge-gold">Test data</span>';
    if (LTD.isComplete(ev)) return '<span class="badge badge-green">Final</span>';
    const d = date(ev.date);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (d && d < today) return '<span class="badge">Results pending</span>';
    if (d && d.getTime() === today.getTime()) return '<span class="badge badge-gold">Today</span>';
    return '<span class="badge badge-blue">Upcoming</span>';
  }

  const empty = msg => `<div class="empty">${msg}</div>`;
  const previewNotice = () =>
    '<div class="notice"><strong>Test data.</strong> These results are a preview and will be replaced with the real scores after the event.</div>';

  function error(target, err) {
    console.error(err);
    const el = typeof target === 'string' ? $(target) : target;
    if (el) el.innerHTML = `<div class="notice notice-error"><strong>Couldn’t load league data.</strong>
      Check your connection and <a href="?refresh" style="text-decoration:underline">try again</a>.</div>`;
  }

  // Event display helpers
  function eventCourse(ev, courses) {
    const c = courses && courses.find(x => x.course_id === ev.course_id);
    return str(ev.course_name) || (c ? c.name : '');
  }

  // Hole-by-hole card for one Calc.round(). `marks` = { gross:Set, net:Set }
  // of hole numbers where this player won a skin.
  function scorecard(r, marks = {}) {
    const g = marks.gross || new Set(), n = marks.net || new Set();
    const nine = (a, b) => r.holes.slice(a, b);
    const tot = (list, k) => list.every(h => h[k] != null) ? list.reduce((s, h) => s + h[k], 0) : '';
    const cls = h => {
      if (h.gross == null || h.par == null) return '';
      const d = h.gross - h.par;
      return d <= -2 ? 'sc-eagle' : d === -1 ? 'sc-birdie' : d === 1 ? 'sc-bogey' : d >= 2 ? 'sc-double' : '';
    };
    const row = (label, cell, totals) => {
      const cells = [];
      [[0, 9], [9, 18]].forEach(([a, b], i) => {
        nine(a, b).forEach(h => cells.push(cell(h)));
        cells.push(`<td class="tot">${totals[i]}</td>`);
      });
      return `<tr><td>${label}</td>${cells.join('')}<td class="tot">${totals[2]}</td></tr>`;
    };
    const head = [];
    [[1, 9, 'Out'], [10, 18, 'In']].forEach(([a, b, l]) => {
      for (let i = a; i <= b; i++) head.push(`<th>${i}</th>`);
      head.push(`<th>${l}</th>`);
    });
    const parT = [tot(nine(0, 9), 'par'), tot(nine(9, 18), 'par'), tot(r.holes, 'par')];
    const grossT = [tot(nine(0, 9), 'gross'), tot(nine(9, 18), 'gross'), tot(r.holes, 'gross')];
    const netT = [tot(nine(0, 9), 'net'), tot(nine(9, 18), 'net'), tot(r.holes, 'net')];
    const dots = p => (p > 0 ? `<span class="pops">${'•'.repeat(p)}</span>` : p < 0 ? '<span class="pops">+</span>' : '');
    return `<div class="table-wrap"><table class="scorecard">
      <thead><tr><th>Hole</th>${head.join('')}<th>Tot</th></tr></thead>
      <tbody>
        ${row('Par', h => `<td class="muted">${dash(h.par)}</td>`, parT)}
        ${row('Index', h => `<td class="muted">${dash(h.si)}</td>`, ['', '', ''])}
        ${row('Gross', h => `<td class="${g.has(h.hole) ? 'skin-g' : ''}"><span class="sc ${cls(h)}">${dash(h.gross)}${dots(h.pops)}</span></td>`, grossT)}
        ${row('Net', h => `<td class="${n.has(h.hole) ? 'skin-n' : ''}">${dash(h.net)}</td>`, netT)}
      </tbody></table></div>
      <div class="legend">
        <span><i style="border:1px solid var(--gold);border-radius:50%"></i>Birdie or better</span>
        <span><i style="border:1px solid rgba(255,255,255,.3)"></i>Bogey / double+</span>
        <span><span class="gold">•</span> Stroke received</span>
        ${g.size ? '<span><i style="background:rgba(240,192,64,.35)"></i>Gross skin</span>' : ''}
        ${n.size ? '<span><i style="background:rgba(34,197,94,.3)"></i>Net skin</span>' : ''}
        ${r.gross != null && r.rawGross !== r.gross ? `<span>Adjusted gross ${r.gross} (raw ${r.rawGross}, net double bogey max)</span>` : ''}
      </div>`;
  }

  return { esc, $, param, fmtDate, fmtDateTime, dash, fixed, money, pct, toPar, ordinal,
           initials, avatar, playerLink, statusBadge, empty, previewNotice, error, eventCourse, num, scorecard };
})();
