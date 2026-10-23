/* Home — next event, latest winners, top of the standings, LTD Cup. */
(async () => {
  const app = UI.$('#app');
  const next = UI.$('#next-event');
  try {
    const d = await LTD.load('Events', 'Courses', 'Holes', 'Players', 'Results', 'Scorecards');
    const m = Calc.model(d);
    next.innerHTML = nextEventHtml(m.upcoming[0]);
    app.innerHTML = latestHtml() + `<div class="grid grid-2 section">${standingsHtml()}${cupHtml()}</div>`;

    function nextEventHtml(e) {
      if (!e) return `<div class="card"><div class="card-title">Next event</div>
        <p class="muted">The next season’s schedule hasn’t been posted yet.</p></div>`;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const days = e._date ? Math.round((e._date - today) / 86400000) : null;
      const when = days == null ? 'Date to be announced' : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
      const course = UI.eventCourse(e, m.courses);
      const signup = LTD.str(e.signup_url);
      return `<div class="card" style="box-shadow:var(--shadow);padding:26px">
        <div class="card-title">Next event · ${when}</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;line-height:1.05">${UI.esc(e.name)}</div>
        <div class="muted" style="margin-top:6px">${e._date ? UI.fmtDate(e._date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Date TBD'}</div>
        <div style="margin-top:4px">${[course && `<a class="player-link" href="/courses.html#${UI.esc(e.course_id)}">${UI.esc(course)}</a>`,
          UI.esc(LTD.str(e.format)), LTD.str(e.entry_fee) && UI.esc(LTD.str(e.entry_fee)) + ' entry'].filter(Boolean).join(' · ')}</div>
        ${days != null && days > 0 ? `<div class="countdown"><div><b>${days}</b><span>day${days === 1 ? '' : 's'}</span></div></div>` : ''}
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">
          ${signup ? `<a class="btn btn-gold" href="${UI.esc(signup)}" target="_blank" rel="noopener">Sign up ↗</a>`
                   : '<span class="btn btn-ghost" aria-disabled="true">Sign-up opens soon</span>'}
          <a class="btn btn-ghost" href="/schedule.html#${UI.esc(e.event_id)}">Full schedule</a>
        </div>
      </div>`;
    }

    function latestHtml() {
      const ev = m.latest;
      if (!ev) return `<section class="section"><h2 class="section-title">Latest results</h2>
        ${UI.empty('No events scored yet this season. Winners show up here after each event.')}</section>`;
      const results = m.resultsByEvent[ev.event_id] || [];
      const rounds = (m.roundsByEvent[ev.event_id] || []).filter(r => r.complete);
      const sk = rounds.length ? Calc.skins(rounds, LTD.CONFIG.skinBuyIn) : null;
      const nameOf = (id, fallback) => (m.playersById[id] || {}).display_name || fallback || id;
      const flights = [...new Set(results.map(r => LTD.str(r.flight).toUpperCase()).filter(Boolean))].sort();

      const winnerCard = f => {
        const w = results.filter(r => LTD.str(r.flight).toUpperCase() === f && LTD.num(r.finish) === 1);
        if (!w.length) return '';
        return `<div class="card"><div class="card-title">Flight ${UI.esc(f)} winner${w.length > 1 ? 's' : ''}</div>
          ${w.map(r => `<div class="player-cell" style="margin-top:6px">${UI.avatar(m.playersById[r.player_id] || { name: r.display_name })}
            <div><div style="font-weight:700">${UI.playerLink(r.player_id, nameOf(r.player_id, r.display_name))}</div>
            <div class="muted num" style="font-size:.82rem">Net ${UI.dash(LTD.num(r.net))} · Gross ${UI.dash(LTD.num(r.gross))}</div></div></div>`).join('')}
        </div>`;
      };
      const lowCard = sk && sk.lowRound ? `<div class="card"><div class="card-title">Low gross</div>
        <div class="player-cell" style="margin-top:6px">${UI.avatar(m.playersById[sk.lowRound.player_id] || { name: sk.lowRound.name })}
          <div><div style="font-weight:700">${UI.playerLink(sk.lowRound.player_id, nameOf(sk.lowRound.player_id, sk.lowRound.name))}</div>
          <div class="muted num" style="font-size:.82rem">${sk.lowRound.score} gross</div></div></div></div>` : '';
      const top = sk && Object.entries(sk.byPlayer).sort((a, b) => b[1].amount - a[1].amount)[0];
      const skinCard = top ? `<div class="card"><div class="card-title">Top skins</div>
        <div class="player-cell" style="margin-top:6px">${UI.avatar(m.playersById[top[0]] || { name: top[0] })}
          <div><div style="font-weight:700">${UI.playerLink(top[0], nameOf(top[0]))}</div>
          <div class="muted num" style="font-size:.82rem">${top[1].gross + top[1].net} skin${top[1].gross + top[1].net > 1 ? 's' : ''} · <span class="green">${UI.money(top[1].amount)}</span></div></div></div></div>` : '';

      return `<section class="section">
        <h2 class="section-title">Latest results <small>${UI.esc(ev.name)} · ${ev._date ? UI.fmtDate(ev._date, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</small></h2>
        ${LTD.isPreview(ev) ? UI.previewNotice() : ''}
        <div class="grid grid-auto">${flights.map(winnerCard).join('')}${lowCard}${skinCard}</div>
        <div style="margin-top:14px"><a class="btn btn-ghost" href="/results.html?event=${encodeURIComponent(ev.event_id)}">Full results &amp; skins →</a></div>
      </section>`;
    }

    function standingsHtml() {
      const season = m.currentSeason;
      const evs = Calc.seasonEvents(m, season).filter(e => m.resultsByEvent[e.event_id]);
      const table = Calc.standings(evs, evs.flatMap(e => m.resultsByEvent[e.event_id]), m.players, 4).slice(0, 5);
      return `<div class="card">
        <div class="card-title">${season || ''} Standings · best 4 of 5</div>
        ${table.length ? `<table class="data" style="font-size:.9rem"><tbody>${table.map(p => `<tr>
            <td style="width:44px"><span class="pos ${p.rank === 1 ? 'pos-1' : ''}">${p.tied ? 'T' : ''}${p.rank}</span></td>
            <td><div class="player-cell">${UI.avatar(m.playersById[p.player_id] || { name: p.name })}${UI.playerLink(p.player_id, p.name)}</div></td>
            <td class="r num gold"><b>${p.best}</b> <span class="muted">pts</span></td></tr>`).join('')}</tbody></table>
          <div style="margin-top:12px"><a class="btn btn-ghost" href="/standings.html">Full standings →</a></div>`
          : '<p class="muted">Standings start after the first event.</p>'}
      </div>`;
    }

    function cupHtml() {
      const cupEvents = m.events.filter(e => e._cup && !LTD.isComplete(e));
      const nextCup = cupEvents[0];
      return `<div class="card" style="border-color:rgba(240,192,64,.3);background:linear-gradient(160deg,rgba(240,192,64,.07),var(--panel) 60%)">
        <div class="card-title">The LTD Cup</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.7rem;line-height:1.1">2026 Champions: Drawshank Redemption</div>
        <p class="muted" style="margin-top:6px;font-size:.9rem">Kirk Westbrook’s squad beat the Doe Boys 9.5–6.5 over three days in Monterey. Kevin Conway took MVP at 3-0-0.</p>
        ${nextCup ? `<p style="margin-top:10px;font-size:.9rem"><b>Next up:</b> ${UI.esc(nextCup._season)} LTD Cup · ${nextCup._date ? UI.fmtDate(nextCup._date) : 'dates TBD'}</p>` : ''}
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
          <a class="btn btn-gold" href="/cup/">LTD Cup history</a>
          <a class="btn btn-ghost" href="/cup/2026.html">2026 recap</a>
        </div>
      </div>`;
    }
  } catch (err) {
    UI.error(app, err);
    next.innerHTML = '';
  }
})();
