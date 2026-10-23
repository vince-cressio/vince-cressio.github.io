/* Season standings — best 4 of 5 regular-season events, flights combined. */
(async () => {
  const app = UI.$('#app');
  try {
    const d = await LTD.load('Events', 'Players', 'Results');
    const m = Calc.model(d);
    const season = UI.num(UI.param('season')) || m.currentSeason;
    UI.$('#page-eyebrow').textContent = season ? season + ' Season Race' : 'Season Race';

    const regular = m.events.filter(e => !e._cup && e._season === season);
    const counted = Calc.seasonEvents(m, season).filter(e => m.resultsByEvent[e.event_id]);
    const results = counted.flatMap(e => m.resultsByEvent[e.event_id]);
    const table = Calc.standings(counted, results, m.players, 4);

    const seasons = m.seasons.filter(s => m.events.some(e => !e._cup && e._season === s));
    const picker = seasons.length > 1 ? `<select class="select" id="season-pick">${seasons.slice().reverse().map(s =>
      `<option value="${s}"${s === season ? ' selected' : ''}>${s} season</option>`).join('')}</select>` : '';

    const head = `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px">
      <div class="muted" style="font-size:.9rem">${counted.length} of ${regular.length || 5} events complete${counted.some(LTD.isPreview) ? ' · includes test data' : ''}</div>
      ${picker}</div>`;

    if (!table.length) {
      app.innerHTML = head + UI.empty('No events scored yet this season. Standings appear after the first event.');
    } else {
      const cols = regular;
      app.innerHTML = head + (counted.some(LTD.isPreview) ? UI.previewNotice() : '') + `
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Pos</th><th>Player</th>
            ${cols.map((e, i) => `<th class="c" title="${UI.esc(e.name)}">E${i + 1}</th>`).join('')}
            <th class="r">Events</th><th class="r">Wins</th><th class="r">Best 4</th><th class="r">Dropped</th><th class="r">Back</th></tr></thead>
          <tbody>${table.map(p => {
            const pts = Object.fromEntries(p.scores.map(s => [s.event_id, s.pts]));
            return `<tr>
              <td><span class="pos ${p.rank === 1 ? 'pos-1' : ''}">${p.tied ? 'T' : ''}${p.rank}</span></td>
              <td><div class="player-cell">${UI.avatar(m.playersById[p.player_id] || { name: p.name })}${UI.playerLink(p.player_id, p.name)}</div></td>
              ${cols.map(e => {
                const v = pts[e.event_id];
                if (v == null) return `<td class="c muted">${e._published ? '·' : ''}</td>`;
                const dropped = !p.counted.has(e.event_id);
                return `<td class="c num" style="${dropped ? 'color:var(--muted);text-decoration:line-through' : ''}">${v}</td>`;
              }).join('')}
              <td class="r num">${p.events}</td>
              <td class="r num">${p.wins || '—'}</td>
              <td class="r num gold"><b>${p.best}</b></td>
              <td class="r num muted">${p.dropped || '—'}</td>
              <td class="r num muted">${p.behind ? '−' + p.behind : '—'}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
        <div class="legend" style="margin-top:10px">
          ${cols.map((e, i) => `<span>E${i + 1} = ${UI.esc(e.name)}</span>`).join('')}
          <span><s>12</s> = dropped (outside best 4)</span>
        </div>`;
    }

    const pick = UI.$('#season-pick');
    if (pick) pick.addEventListener('change', () => { location.search = '?season=' + pick.value; });
  } catch (err) { UI.error(app, err); }
})();
