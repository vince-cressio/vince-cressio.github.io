/* Results — one event at a time: flight leaderboards and skins. */
(async () => {
  const app = UI.$('#app');
  try {
    const d = await LTD.load('Events', 'Courses', 'Holes', 'Players', 'Results', 'Scorecards');
    const m = Calc.model(d);
    const withResults = m.published.filter(e => m.resultsByEvent[e.event_id] || m.roundsByEvent[e.event_id]);
    if (!withResults.length) {
      app.innerHTML = UI.empty('No results posted yet. Check back after the first event of the season.');
      return;
    }

    const requested = UI.param('event');
    const ev = withResults.find(e => e.event_id === requested) || withResults[withResults.length - 1];
    const results = m.resultsByEvent[ev.event_id] || [];
    const rounds = m.roundsByEvent[ev.event_id] || [];
    const roundsById = Object.fromEntries(rounds.map(r => [r.player_id, r]));
    const sk = Calc.skins(rounds.filter(r => r.complete), LTD.CONFIG.skinBuyIn);

    UI.$('#page-eyebrow').textContent = ev._date ? UI.fmtDate(ev._date) : 'Date TBD';
    UI.$('#page-title').textContent = ev.name;
    UI.$('#page-intro').textContent = [UI.eventCourse(ev, m.courses), LTD.str(ev.format), rounds.length ? rounds.length + ' players' : '']
      .filter(Boolean).join(' · ');
    document.title = ev.name + ' Results | LTD Golf Club';

    const picker = withResults.length > 1 ? `<div style="margin-bottom:20px">
      <label class="muted" for="ev-pick" style="font-size:.85rem;margin-right:8px">Event</label>
      <select class="select" id="ev-pick">${withResults.slice().reverse().map(e =>
        `<option value="${UI.esc(e.event_id)}"${e === ev ? ' selected' : ''}>${UI.esc(e.name)}${e._date ? ' — ' + UI.fmtDate(e._date, { month: 'short', day: 'numeric' }) : ''}</option>`).join('')}
      </select></div>` : '';

    app.innerHTML = `${picker}${LTD.isPreview(ev) ? UI.previewNotice() : ''}
      <section class="section">
        <h2 class="section-title">Leaderboard <small>tap a player for their scorecard</small></h2>
        ${results.length ? flightsHtml() : UI.empty('Final standings haven’t been posted for this event yet.')}
      </section>
      <section class="section">
        <h2 class="section-title">Skins <small>$${LTD.CONFIG.skinBuyIn} per player into each pot · no carryovers · ties void the skin</small></h2>
        ${rounds.length ? skinsHtml() : UI.empty('Skins are calculated from scorecards, which aren’t posted for this event.')}
      </section>`;

    const pick = UI.$('#ev-pick');
    if (pick) pick.addEventListener('change', () => { location.search = '?event=' + encodeURIComponent(pick.value); });
    app.querySelectorAll('tr.expandable').forEach(tr => tr.addEventListener('click', e => {
      if (e.target.closest('a')) return;
      const next = tr.nextElementSibling;
      next.hidden = !next.hidden;
      tr.setAttribute('aria-expanded', !next.hidden);
    }));

    function skinHoles(pid) {
      return {
        gross: new Set(sk.gross.filter(s => s.player_id === pid).map(s => s.hole)),
        net: new Set(sk.net.filter(s => s.player_id === pid).map(s => s.hole)),
      };
    }

    function flightsHtml() {
      const flights = [...new Set(results.map(r => LTD.str(r.flight).toUpperCase() || '—'))].sort();
      const tables = flights.map(f => {
        const rows = results.filter(r => (LTD.str(r.flight).toUpperCase() || '—') === f)
          .sort((a, b) => (LTD.num(a.finish) ?? 999) - (LTD.num(b.finish) ?? 999) || (LTD.num(a.net) ?? 999) - (LTD.num(b.net) ?? 999));
        const finishCount = {};
        rows.forEach(r => { const k = LTD.num(r.finish); finishCount[k] = (finishCount[k] || 0) + 1; });
        const body = rows.map(r => {
          const p = m.playersById[r.player_id];
          const name = p ? p.display_name : LTD.str(r.display_name);
          const fin = LTD.num(r.finish);
          const won = sk.byPlayer[r.player_id];
          const rd = roundsById[r.player_id];
          const pts = LTD.num(r.league_pts) ?? LTD.num(r.points);
          return `<tr class="${rd ? 'expandable' : ''}" ${rd ? 'aria-expanded="false"' : ''}>
              <td><span class="pos ${fin === 1 ? 'pos-1' : ''}">${fin == null ? '—' : (finishCount[fin] > 1 ? 'T' : '') + fin}</span></td>
              <td><div class="player-cell">${UI.avatar(p || { name })}${UI.playerLink(r.player_id, name)}</div></td>
              <td class="r num">${UI.dash(LTD.num(r.gross))}</td>
              <td class="r num muted">${UI.dash(LTD.num(r.course_hcp))}</td>
              <td class="r num"><b>${UI.dash(LTD.num(r.net))}</b></td>
              <td class="r num gold">${UI.dash(pts)}</td>
              <td class="r num">${won ? '<span class="green">' + UI.money(won.amount) + '</span>' : '<span class="muted">—</span>'}</td>
            </tr>
            ${rd ? `<tr class="detail" hidden><td colspan="7">${UI.scorecard(rd, skinHoles(r.player_id))}</td></tr>` : ''}`;
        }).join('');
        return `<div>
          <div class="sub-title" style="margin-top:0">Flight ${UI.esc(f)} <span style="letter-spacing:0">· ${rows.length} players</span></div>
          <div class="table-wrap"><table class="data">
            <thead><tr><th>Pos</th><th>Player</th><th class="r">Gross</th><th class="r">Hcp</th><th class="r">Net</th><th class="r">Pts</th><th class="r">Skins</th></tr></thead>
            <tbody>${body}</tbody>
          </table></div></div>`;
      });
      return `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,520px),1fr))">${tables.join('')}</div>`;
    }

    function skinsHtml() {
      const nameOf = s => UI.playerLink(s.player_id, (m.playersById[s.player_id] || {}).display_name || s.name);
      // "Eagle", "net birdie", "net −4" … (ace only for a gross 1)
      const label = (score, par, isNet) => {
        if (par == null) return '';
        if (!isNet && score === 1) return 'Ace';
        const dlt = score - par;
        const name = { '-3': 'Albatross', '-2': 'Eagle', '-1': 'Birdie', '0': 'Par', '1': 'Bogey' }[dlt];
        const text = name || UI.toPar(dlt).replace('-', '−');
        return isNet ? 'net ' + text.toLowerCase() : text;
      };
      const potCard = (title, list, pay, extra, isNet) => `<div class="card">
        <div class="card-title">${title}</div>
        <div class="tiles" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:14px">
          <div class="tile"><div class="v">${UI.money(sk.pot)}</div><div class="l">Pot</div></div>
          <div class="tile"><div class="v">${pay.count}</div><div class="l">Skins</div></div>
          <div class="tile"><div class="v gold">${pay.count ? UI.money(pay.each) : '—'}</div><div class="l">Per skin</div></div>
        </div>
        ${list.length || extra ? `<div class="table-wrap"><table class="data">
          <thead><tr><th>Hole</th><th>Player</th><th class="r">Score</th></tr></thead>
          <tbody>${list.map(s => `<tr><td>#${s.hole}</td><td>${nameOf(s)}</td>
            <td class="r num">${s.score} <span class="muted">${label(s.score, s.par, isNet)}</span></td></tr>`).join('')}
            ${extra || ''}</tbody></table></div>` : UI.empty('No skins awarded — every hole was tied.')}
        <p class="muted" style="font-size:.8rem;margin-top:10px">${pay.count
          ? `${UI.money(sk.pot)} ÷ ${pay.count} = ${UI.money(pay.each)} per skin (rounded down). ${UI.money(pay.toClub)} to the club.`
          : `No skins won — the full ${UI.money(sk.pot)} goes to the club.`}</p>
      </div>`;

      const lowRow = sk.lowRound ? `<tr><td><span class="badge badge-gold">Low round</span></td><td>${nameOf(sk.lowRound)}</td>
        <td class="r num">${sk.lowRound.score} <span class="muted">${sk.lowRound.tiedOnTotal ? 'won on tiebreak' : 'gross'}</span></td></tr>` : '';

      const winners = Object.entries(sk.byPlayer).sort((a, b) => b[1].amount - a[1].amount);
      const totals = winners.length ? `<div class="sub-title">Skins winnings</div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Player</th><th class="r">Gross</th><th class="r">Net</th><th class="r">Total</th></tr></thead>
          <tbody>${winners.map(([pid, w]) => `<tr><td>${UI.playerLink(pid, (m.playersById[pid] || {}).display_name || pid)}</td>
            <td class="r num">${w.gross || '—'}</td><td class="r num">${w.net || '—'}</td>
            <td class="r num green"><b>${UI.money(w.amount)}</b></td></tr>`).join('')}</tbody>
        </table></div>` : '';

      return `<div class="grid grid-2">${potCard('Gross skins', sk.gross, sk.grossPay, lowRow)}${potCard('Net skins', sk.net, sk.netPay, '', true)}</div>${totals}`;
    }
  } catch (err) { UI.error(app, err); }
})();
