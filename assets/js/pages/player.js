/* Player profile — player.html?id=P003 */
(async () => {
  const app = UI.$('#app');
  try {
    const d = await LTD.load('Players', 'Events', 'Courses', 'Holes', 'Results', 'Scorecards');
    const m = Calc.model(d);
    const id = UI.param('id');
    const p = m.playersById[id];
    if (!p) {
      UI.$('#page-title').textContent = 'Player not found';
      app.innerHTML = UI.empty(`We couldn’t find a player with ID “${UI.esc(id || '')}”. <a class="gold" href="/roster.html">Back to the roster</a>.`);
      return;
    }
    document.title = p.display_name + ' | LTD Golf Club';

    // Every published event this player has a result or scorecard in.
    const history = m.published.map(ev => {
      const res = (m.resultsByEvent[ev.event_id] || []).find(r => r.player_id === id);
      const rounds = m.roundsByEvent[ev.event_id] || [];
      const rd = rounds.find(r => r.player_id === id);
      if (!res && !rd) return null;
      const sk = rd ? Calc.skins(rounds.filter(r => r.complete), LTD.CONFIG.skinBuyIn) : null;
      const won = sk && sk.byPlayer[id];
      return {
        ev, res, rd, won,
        marks: sk ? {
          gross: new Set(sk.gross.filter(s => s.player_id === id).map(s => s.hole)),
          net: new Set(sk.net.filter(s => s.player_id === id).map(s => s.hole)),
        } : {},
      };
    }).filter(Boolean).reverse();

    const fin = h => h.res ? LTD.num(h.res.finish) : null;
    const grossList = history.map(h => h.res ? LTD.num(h.res.gross) : h.rd && h.rd.gross).filter(v => v != null);
    const netList = history.map(h => h.res ? LTD.num(h.res.net) : h.rd && h.rd.net).filter(v => v != null);
    const avg = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
    const skinsTotal = history.reduce((s, h) => s + (h.won ? h.won.amount : 0), 0);

    const season = m.currentSeason;
    const seasonEvs = Calc.seasonEvents(m, season).filter(e => m.resultsByEvent[e.event_id]);
    const table = Calc.standings(seasonEvs, seasonEvs.flatMap(e => m.resultsByEvent[e.event_id]), m.players, 4);
    const mine = table.find(r => r.player_id === id);

    // Header
    const hcp = LTD.num(p.handicap);
    UI.$('.page-head .container').innerHTML = `
      <div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">
        ${UI.avatar(p, 'avatar-lg')}
        <div>
          <div class="eyebrow">Player Profile${LTD.bool(p.active) || LTD.isBlank(p.active) ? '' : ' · Former member'}</div>
          <h1 class="page-title">${UI.esc(p.display_name)}</h1>
          <p class="page-intro" style="margin-top:6px">${[hcp != null ? 'Handicap index ' + hcp.toFixed(1) : '', LTD.str(p.joined) && 'Member since ' + UI.esc(p.joined),
            mine ? `${UI.ordinal(mine.rank)}${mine.tied ? ' (tied)' : ''} in ${season} standings` : ''].filter(Boolean).join(' · ')}</p>
        </div>
      </div>`;

    if (!history.length) {
      app.innerHTML = UI.empty(`${UI.esc(p.first_name || p.display_name)} hasn’t played a scored event yet.`);
      return;
    }

    const mix = Calc.scoringMix(history.map(h => h.rd).filter(Boolean));
    const tile = (v, l, cls = '') => `<div class="tile"><div class="v ${cls}">${v}</div><div class="l">${l}</div></div>`;
    const share = n => (mix.holes ? Math.round(n / mix.holes * 100) + '%' : '');

    app.innerHTML = `${history.some(h => LTD.isPreview(h.ev)) ? UI.previewNotice() : ''}
      <section class="section">
        <h2 class="section-title">Career</h2>
        <div class="tiles">
          ${tile(history.length, 'Events')}
          ${tile(history.filter(h => fin(h) === 1).length, 'Flight wins', 'gold')}
          ${tile(history.filter(h => fin(h) != null && fin(h) <= 3).length, 'Top 3')}
          ${tile(UI.fixed(avg(grossList)), 'Avg gross')}
          ${tile(UI.fixed(avg(netList)), 'Avg net')}
          ${tile(grossList.length ? Math.min(...grossList) : '—', 'Best gross')}
          ${tile(netList.length ? Math.min(...netList) : '—', 'Best net')}
          ${tile(skinsTotal ? UI.money(skinsTotal) : '—', 'Skins won', 'green')}
          ${mine ? tile(mine.best, season + ' pts (best 4)', 'gold') : ''}
        </div>
        ${mix.holes ? `<div class="sub-title">Scoring</div><div class="tiles">
          ${tile(mix.birdies, 'Birdies or better · ' + share(mix.birdies), 'gold')}
          ${tile(mix.pars, 'Pars · ' + share(mix.pars))}
          ${tile(mix.bogeys, 'Bogeys · ' + share(mix.bogeys))}
          ${tile(mix.doubles, 'Double+ · ' + share(mix.doubles))}
        </div>` : ''}
      </section>
      <section class="section">
        <h2 class="section-title">Event history <small>tap an event for the scorecard</small></h2>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Date</th><th>Event</th><th>Flight</th><th class="r">Gross</th><th class="r">Net</th><th class="r">Finish</th><th class="r">Pts</th><th class="r">Skins</th></tr></thead>
          <tbody>${history.map(h => {
            const r = h.res || {};
            const f = fin(h);
            const pts = LTD.num(r.league_pts) ?? LTD.num(r.points);
            return `<tr class="${h.rd ? 'expandable' : ''}">
                <td class="muted">${h.ev._date ? UI.fmtDate(h.ev._date, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}</td>
                <td><a class="player-link" href="/results.html?event=${encodeURIComponent(h.ev.event_id)}">${UI.esc(h.ev.name)}</a>
                  <div class="muted" style="font-size:.78rem">${UI.esc(UI.eventCourse(h.ev, m.courses))}</div></td>
                <td>${UI.esc(LTD.str(r.flight) || (h.rd && h.rd.flight) || '—')}</td>
                <td class="r num">${UI.dash(LTD.num(r.gross) ?? (h.rd && h.rd.gross))}</td>
                <td class="r num"><b>${UI.dash(LTD.num(r.net) ?? (h.rd && h.rd.net))}</b></td>
                <td class="r num ${f === 1 ? 'gold' : ''}">${f == null ? '—' : UI.ordinal(f)}</td>
                <td class="r num gold">${UI.dash(pts)}</td>
                <td class="r num">${h.won ? '<span class="green">' + UI.money(h.won.amount) + '</span>' : '<span class="muted">—</span>'}</td>
              </tr>
              ${h.rd ? `<tr class="detail" hidden><td colspan="8">${UI.scorecard(h.rd, h.marks)}</td></tr>` : ''}`;
          }).join('')}</tbody>
        </table></div>
      </section>`;

    app.querySelectorAll('tr.expandable').forEach(tr => tr.addEventListener('click', e => {
      if (e.target.closest('a')) return;
      tr.nextElementSibling.hidden = !tr.nextElementSibling.hidden;
    }));
  } catch (err) { UI.error(app, err); }
})();
