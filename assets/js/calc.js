/* ============================================================
   calc.js — league math, kept free of any DOM code.
   Rounds, net scoring, skins, season standings, hole difficulty.
   ============================================================ */
const Calc = (() => {
  const { num, str } = LTD;
  const isWomen = g => /^(f|w)/i.test(str(g));

  // Holes tab → { C01: { 1: { par:{m,w}, yards:{m,w}, si:{m,w} }, ... } }
  function courseHoles(holesRows) {
    const out = {};
    holesRows.forEach(r => {
      const h = num(r.hole);
      if (!h) return;
      (out[r.course_id] = out[r.course_id] || {})[h] = {
        hole: h,
        par:   { m: num(r.par_m),            w: num(r.par_w) ?? num(r.par_m) },
        yards: { m: num(r.yards_m),          w: num(r.yards_w) },
        si:    { m: num(r.stroke_index_m),   w: num(r.stroke_index_w) ?? num(r.stroke_index_m) },
      };
    });
    return out;
  }

  // Strokes received on a hole. Plus handicaps give strokes back,
  // starting from the easiest hole (stroke index 18).
  function pops(courseHcp, si) {
    if (courseHcp == null || si == null) return 0;
    if (courseHcp >= 0) return Math.floor(courseHcp / 18) + (si <= courseHcp % 18 ? 1 : 0);
    const plus = -courseHcp;
    return -(Math.floor(plus / 18) + (si > 18 - (plus % 18) ? 1 : 0));
  }

  // One Scorecards row → a round with per-hole gross, pops, net and
  // the net-double-bogey capped score used for adjusted gross.
  function round(card, holesByCourse) {
    const course = holesByCourse[card.course_id] || {};
    const t = isWomen(card.gender) ? 'w' : 'm';
    const ch = num(card.course_hcp);
    const holes = [];
    for (let h = 1; h <= 18; h++) {
      const info = course[h];
      const par = info ? info.par[t] : null;
      const si = info ? info.si[t] : null;
      const gross = num(card['h' + h]);
      const p = pops(ch, si);
      holes.push({
        hole: h, par, si, gross, pops: p,
        net: gross == null ? null : gross - p,
        capped: gross == null ? null : (par == null ? gross : Math.min(gross, par + 2 + p)),
      });
    }
    const played = holes.filter(x => x.gross != null);
    const sum = (k, list = played) => list.reduce((a, x) => a + x[k], 0);
    const complete = played.length === 18;
    const adjGross = complete ? sum('capped') : null;
    return {
      event_id: card.event_id,
      course_id: card.course_id,
      player_id: card.player_id,
      name: str(card.player_name),
      flight: str(card.flight).toUpperCase(),
      women: t === 'w',
      courseHcp: ch,
      holes, complete,
      out: sum('gross', played.filter(x => x.hole <= 9)),
      in: sum('gross', played.filter(x => x.hole > 9)),
      rawGross: complete ? sum('gross') : null,
      gross: adjGross,
      net: adjGross == null || ch == null ? null : adjGross - ch,
      par: holes.every(x => x.par != null) ? sum('par', holes) : null,
    };
  }

  // Lowest score wins outright; any tie for low means no skin.
  function outrightLow(entries) {
    if (!entries.length) return null;
    const low = Math.min(...entries.map(e => e.score));
    const at = entries.filter(e => e.score === low);
    return at.length === 1 ? at[0] : null;
  }

  // Low gross round: adjusted gross total, then capped scores hole by
  // hole from stroke index 1 upward (same order as the sheet's tiebreak).
  function grossTiebreakKey(r) {
    const bySi = r.holes.slice().sort((a, b) => (a.si ?? 99) - (b.si ?? 99)).map(h => h.capped);
    return [r.gross, ...bySi];
  }
  function compareKeys(a, b) {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  }

  // Gross and net skins, no carryovers, plus one gross skin for the
  // low gross round. Each pot is $buyIn × players, split evenly over
  // the skins awarded in it and rounded down; the rest goes to the club.
  function skins(rounds, buyIn) {
    const players = rounds.length;
    const pot = buyIn * players;
    const gross = [], net = [];
    for (let h = 1; h <= 18; h++) {
      const g = outrightLow(rounds.filter(r => r.holes[h - 1].gross != null)
        .map(r => ({ player_id: r.player_id, name: r.name, hole: h, score: r.holes[h - 1].gross, par: r.holes[h - 1].par })));
      if (g) gross.push(g);
      const n = outrightLow(rounds.filter(r => r.holes[h - 1].net != null)
        .map(r => ({ player_id: r.player_id, name: r.name, hole: h, score: r.holes[h - 1].net, par: r.holes[h - 1].par, pops: r.holes[h - 1].pops })));
      if (n) net.push(n);
    }

    let lowRound = null;
    const ranked = rounds.filter(r => r.gross != null)
      .map(r => ({ r, key: grossTiebreakKey(r) }))
      .sort((a, b) => compareKeys(a.key, b.key));
    if (ranked.length && (ranked.length === 1 || compareKeys(ranked[0].key, ranked[1].key) !== 0)) {
      const r = ranked[0].r;
      lowRound = { player_id: r.player_id, name: r.name, score: r.gross,
                   tiedOnTotal: ranked.length > 1 && ranked[1].r.gross === r.gross };
    }

    const pay = count => {
      const each = count ? Math.floor(pot / count) : 0;
      return { count, each, toClub: pot - each * count };
    };
    const grossPay = pay(gross.length + (lowRound ? 1 : 0));
    const netPay = pay(net.length);

    const byPlayer = {};
    const credit = (pid, kind, amt) => {
      const p = byPlayer[pid] = byPlayer[pid] || { gross: 0, net: 0, amount: 0 };
      p[kind]++; p.amount += amt;
    };
    gross.forEach(s => credit(s.player_id, 'gross', grossPay.each));
    if (lowRound) credit(lowRound.player_id, 'gross', grossPay.each);
    net.forEach(s => credit(s.player_id, 'net', netPay.each));

    return { players, pot, gross, net, lowRound, grossPay, netPay, byPlayer };
  }

  // Standard competition ranking (1, 1, 3) on a numeric field.
  function rank(list, field, desc = true) {
    list.forEach((x, i) => {
      const prev = list[i - 1];
      x.rank = prev && prev[field] === x[field] ? prev.rank : i + 1;
    });
    list.forEach(x => {
      x.tied = list.filter(y => y.rank === x.rank).length > 1;
    });
    return list;
  }

  // Season standings: sum of each player's best `best` event point
  // totals across published regular-season events. Flights combined.
  function standings(events, results, players, best = 4) {
    const evIds = new Set(events.map(e => e.event_id));
    const nameOf = id => (players.find(p => p.player_id === id) || {}).display_name;
    const by = {};
    results.filter(r => evIds.has(r.event_id)).forEach(r => {
      const pts = num(r.league_pts) ?? num(r.points);
      if (pts == null) return;
      const p = by[r.player_id] = by[r.player_id] || {
        player_id: r.player_id, name: nameOf(r.player_id) || str(r.display_name), scores: [], wins: 0,
      };
      p.scores.push({ event_id: r.event_id, pts });
      if (num(r.finish) === 1) p.wins++;
    });
    const list = Object.values(by).map(p => {
      const sorted = p.scores.slice().sort((a, b) => b.pts - a.pts);
      const counted = sorted.slice(0, best);
      const total = p.scores.reduce((a, s) => a + s.pts, 0);
      const bestN = counted.reduce((a, s) => a + s.pts, 0);
      return { ...p, events: p.scores.length, total, best: bestN, dropped: total - bestN,
               counted: new Set(counted.map(s => s.event_id)) };
    });
    list.sort((a, b) => b.best - a.best || b.wins - a.wins || a.name.localeCompare(b.name));
    rank(list, 'best');
    const lead = list.length ? list[0].best : 0;
    list.forEach(p => { p.behind = lead - p.best; });
    return list;
  }

  // Per-hole scoring across all given rounds on one course.
  // Difficulty rank 1 = hardest (highest average over par).
  function holeStats(rounds) {
    const stats = [];
    for (let h = 1; h <= 18; h++) {
      const scored = rounds.map(r => r.holes[h - 1]).filter(x => x.gross != null && x.par != null);
      const n = scored.length;
      if (!n) { stats.push({ hole: h, n: 0 }); continue; }
      const sum = k => scored.reduce((a, x) => a + k(x), 0);
      stats.push({
        hole: h, n,
        avg: sum(x => x.gross) / n,
        vsPar: sum(x => x.gross - x.par) / n,
        birdieRate: scored.filter(x => x.gross < x.par).length / n,
        parRate: scored.filter(x => x.gross === x.par).length / n,
        bogeyPlusRate: scored.filter(x => x.gross > x.par).length / n,
      });
    }
    const ranked = stats.filter(s => s.n).sort((a, b) => b.vsPar - a.vsPar);
    ranked.forEach((s, i) => { s.rank = i + 1; });
    return stats;
  }

  // Birdies-or-better / pars / bogeys / doubles-plus for a set of rounds.
  function scoringMix(rounds) {
    const mix = { birdies: 0, pars: 0, bogeys: 0, doubles: 0, holes: 0 };
    rounds.forEach(r => r.holes.forEach(x => {
      if (x.gross == null || x.par == null) return;
      const d = x.gross - x.par;
      mix.holes++;
      if (d < 0) mix.birdies++; else if (d === 0) mix.pars++; else if (d === 1) mix.bogeys++; else mix.doubles++;
    }));
    return mix;
  }

  // Joins whatever tabs a page loaded into one model. Only events that
  // are published (complete, or listed in CONFIG.previewEvents) expose
  // their results and scorecards.
  function model(d) {
    const players = (d.Players || []).filter(p => str(p.display_name));
    const playersById = Object.fromEntries(players.map(p => [p.player_id, p]));
    const courses = d.Courses || [];
    const coursesById = Object.fromEntries(courses.map(c => [c.course_id, c]));
    const holes = courseHoles(d.Holes || []);

    const events = LTD.sortEvents(d.Events || []).map(ev => ({
      ...ev,
      _date: LTD.date(ev.date),
      _season: LTD.season(ev),
      _published: LTD.isPublished(ev),
      _cup: LTD.isCup(ev),
    }));
    const eventsById = Object.fromEntries(events.map(e => [e.event_id, e]));
    const published = events.filter(e => e._published);
    const pubIds = new Set(published.map(e => e.event_id));

    const resultsByEvent = {};
    (d.Results || []).filter(r => pubIds.has(r.event_id)).forEach(r => {
      (resultsByEvent[r.event_id] = resultsByEvent[r.event_id] || []).push(r);
    });
    const roundsByEvent = {};
    (d.Scorecards || []).filter(c => pubIds.has(c.event_id)).forEach(c => {
      (roundsByEvent[c.event_id] = roundsByEvent[c.event_id] || []).push(round(c, holes));
    });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    // Preview events stay "upcoming" until their status is complete.
    const upcoming = events.filter(e => !LTD.isComplete(e) && (!e._date || e._date >= today));
    const latest = published.filter(e => resultsByEvent[e.event_id]).slice(-1)[0] || null;
    const seasons = [...new Set(events.map(e => e._season).filter(Boolean))].sort();
    const currentSeason = (upcoming[0] && upcoming[0]._season) || (latest && latest._season) || seasons[seasons.length - 1] || null;

    return { players, playersById, courses, coursesById, holes, events, eventsById, published,
             resultsByEvent, roundsByEvent, upcoming, latest, seasons, currentSeason };
  }

  // Published regular-season (non-Cup) events in a season.
  function seasonEvents(m, season) {
    return m.published.filter(e => !e._cup && e._season === season);
  }

  return { courseHoles, pops, round, skins, standings, holeStats, scoringMix, rank, isWomen, model, seasonEvents };
})();
