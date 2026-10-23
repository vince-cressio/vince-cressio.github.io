/* Courses — tee info, hole-by-hole card, league hole difficulty. */
(async () => {
  const app = UI.$('#app');
  let m;
  try {
    const d = await LTD.load('Courses', 'Holes', 'Events', 'Scorecards');
    m = Calc.model(d);
    if (!m.courses.length) { app.innerHTML = UI.empty('No courses have been added yet.'); return; }

    // Published rounds grouped by course
    const roundsByCourse = {};
    Object.values(m.roundsByEvent).flat().forEach(r => {
      const cid = r.course_id || (m.eventsById[r.event_id] || {}).course_id;
      (roundsByCourse[cid] = roundsByCourse[cid] || []).push(r);
    });

    const nav = `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:26px">${m.courses.map(c =>
      `<a class="btn btn-ghost" href="#${UI.esc(c.course_id)}">${UI.esc(c.name)}</a>`).join('')}</div>`;
    app.innerHTML = nav + m.courses.map(c => courseHtml(c, m.holes[c.course_id] || {}, roundsByCourse[c.course_id] || [])).join('');
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  } catch (err) { UI.error(app, err); }

  function courseHtml(c, holes, rounds) {
    const n = LTD.num;
    const events = m.events.filter(e => e.course_id === c.course_id);
    const tees = [
      ['Men', c.tees_m, c.par_m, c.rating_m, c.slope_m],
      ['Women', c.tees_f, c.par_f, c.rating_f, c.slope_f],
    ].filter(t => !LTD.isBlank(t[1]) || !LTD.isBlank(t[2]));
    const stats = rounds.length ? Calc.holeStats(rounds) : null;
    const list = Object.values(holes).sort((a, b) => a.hole - b.hole);
    const hasW = list.some(h => h.yards.w != null);
    const maxDev = stats ? Math.max(0.5, ...stats.filter(s => s.n).map(s => Math.abs(s.vsPar))) : 1;

    const diffCell = s => {
      if (!s || !s.n) return '<td class="muted">—</td>';
      const w = Math.min(50, Math.abs(s.vsPar) / maxDev * 50);
      const v = (s.vsPar > 0 ? '+' : '') + s.vsPar.toFixed(2);
      return `<td><div class="diff" title="Hole ${s.hole}: averages ${s.avg.toFixed(2)} (${v} vs par) over ${s.n} rounds">
        <div class="diff-track"><div class="diff-bar ${s.vsPar >= 0 ? 'over' : 'under'}" style="width:${w}%"></div></div>
        <span class="num" style="min-width:44px;text-align:right">${v}</span></div></td>`;
    };
    const sumRow = (label, a, b) => {
      const part = list.filter(h => h.hole >= a && h.hole <= b);
      const tot = (k, t) => part.every(h => h[k][t] != null) && part.length ? part.reduce((s, h) => s + h[k][t], 0) : '—';
      return `<tr class="tot" style="background:rgba(255,255,255,.03)"><td><b>${label}</b></td><td class="c"><b>${tot('par', 'm')}</b></td>
        <td class="r num"><b>${tot('yards', 'm')}</b></td><td></td>${hasW ? `<td class="r num muted">${tot('yards', 'w')}</td><td></td>` : ''}
        ${stats ? '<td></td><td></td><td></td><td></td><td></td>' : ''}</tr>`;
    };
    const holeRow = h => {
      const s = stats && stats[h.hole - 1];
      return `<tr><td><b>${h.hole}</b></td><td class="c">${UI.dash(h.par.m)}</td><td class="r num">${UI.dash(h.yards.m)}</td><td class="c muted">${UI.dash(h.si.m)}</td>
        ${hasW ? `<td class="r num muted">${UI.dash(h.yards.w)}${h.par.w !== h.par.m ? ' <small>(par ' + h.par.w + ')</small>' : ''}</td><td class="c muted">${UI.dash(h.si.w)}</td>` : ''}
        ${stats ? `<td class="r num">${s.n ? s.avg.toFixed(2) : '—'}</td>${diffCell(s)}<td class="c ${s.rank === 1 ? 'gold' : ''}">${UI.dash(s.rank)}</td>
          <td class="r num">${UI.pct(s.birdieRate)}</td><td class="r num">${UI.pct(s.bogeyPlusRate)}</td>` : ''}</tr>`;
    };

    let callouts = '';
    if (stats) {
      const ranked = stats.filter(s => s.n).sort((a, b) => a.rank - b.rank);
      const hard = ranked[0], easy = ranked[ranked.length - 1];
      callouts = `<div class="tiles" style="margin-bottom:14px">
        <div class="tile"><div class="v">#${hard.hole}</div><div class="l">Hardest · +${hard.vsPar.toFixed(2)}</div></div>
        <div class="tile"><div class="v">#${easy.hole}</div><div class="l">Easiest · ${(easy.vsPar > 0 ? '+' : '') + easy.vsPar.toFixed(2)}</div></div>
        <div class="tile"><div class="v">${rounds.length}</div><div class="l">League rounds</div></div>
      </div>`;
    }

    return `<section class="section" id="${UI.esc(c.course_id)}" style="scroll-margin-top:calc(var(--header-h) + 16px)">
      <h2 class="section-title">${UI.esc(c.name)} <small>${UI.esc(LTD.str(c.city))}</small></h2>
      <div class="grid grid-3" style="margin-bottom:14px">
        ${tees.map(t => `<div class="card"><div class="card-title">${t[0]} · ${UI.esc(LTD.str(t[1]) || 'Tees TBD')}</div>
          <div class="num" style="font-size:.95rem">Par <b>${UI.dash(n(t[2]))}</b> · Rating <b>${UI.dash(n(t[3]))}</b> · Slope <b>${UI.dash(n(t[4]))}</b></div></div>`).join('')}
        ${events.length ? `<div class="card"><div class="card-title">On the schedule</div>${events.map(e =>
          `<div style="font-size:.9rem"><a class="player-link" href="/schedule.html#${UI.esc(e.event_id)}">${UI.esc(e.name)}</a>
           <span class="muted">· ${e._date ? UI.fmtDate(e._date, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}</span></div>`).join('')}</div>` : ''}
      </div>
      ${callouts}
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Hole</th><th class="c">Par</th><th class="r">Yards</th><th class="c">Index</th>
          ${hasW ? '<th class="r">W Yards</th><th class="c">W Index</th>' : ''}
          ${stats ? '<th class="r">Avg</th><th>vs Par</th><th class="c">Rank</th><th class="r">Birdie%</th><th class="r">Bogey+%</th>' : ''}</tr></thead>
        <tbody>${list.filter(h => h.hole <= 9).map(holeRow).join('')}${sumRow('Out', 1, 9)}
          ${list.filter(h => h.hole > 9).map(holeRow).join('')}${sumRow('In', 10, 18)}${sumRow('Total', 1, 18)}</tbody>
      </table></div>
      ${stats ? '<p class="muted" style="font-size:.8rem;margin-top:8px">League scoring averages use gross scores from all posted rounds. Rank 1 = hardest hole relative to par.</p>'
              : '<p class="muted" style="font-size:.85rem;margin-top:8px">No league rounds posted here yet — hole difficulty appears after our first event on this course.</p>'}`
        : UI.empty('Hole-by-hole data hasn’t been added for this course yet.')}
    </section>`;
  }
})();
