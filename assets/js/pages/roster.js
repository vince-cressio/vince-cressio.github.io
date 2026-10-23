/* Roster — active members, searchable, linking to each profile. */
(async () => {
  const app = UI.$('#app');
  try {
    const d = await LTD.load('Players', 'Events', 'Results');
    const m = Calc.model(d);
    const active = m.players.filter(p => LTD.isBlank(p.active) || LTD.bool(p.active));
    const inactive = m.players.filter(p => !active.includes(p));
    if (!m.players.length) { app.innerHTML = UI.empty('The roster hasn’t been posted yet.'); return; }

    const played = {};
    Object.values(m.resultsByEvent).flat().forEach(r => { played[r.player_id] = (played[r.player_id] || 0) + 1; });

    const card = p => {
      const hcp = LTD.num(p.handicap);
      const meta = [hcp != null ? 'HCP ' + hcp.toFixed(1) : '', LTD.str(p.joined) && 'Since ' + UI.esc(p.joined),
                    played[p.player_id] ? played[p.player_id] + ' event' + (played[p.player_id] > 1 ? 's' : '') : ''].filter(Boolean).join(' · ');
      return `<a class="player-card" href="/player.html?id=${encodeURIComponent(p.player_id)}" data-name="${UI.esc(p.display_name.toLowerCase())}">
        ${UI.avatar(p)}<div><div class="name">${UI.esc(p.display_name)}</div><div class="meta">${meta}</div></div></a>`;
    };
    const byLast = (a, b) => (LTD.str(a.last_name) || a.display_name).localeCompare(LTD.str(b.last_name) || b.display_name)
      || a.display_name.localeCompare(b.display_name);

    UI.$('#page-intro').textContent = `${active.length} active members. Tap a player for their profile, results and stats.`;
    app.innerHTML = `
      <input class="search" id="q" type="search" placeholder="Search players…" aria-label="Search players">
      <div class="grid grid-auto" id="grid">${active.sort(byLast).map(card).join('')}</div>
      <div class="empty" id="none" hidden>No players match that search.</div>
      ${inactive.length ? `<div class="sub-title" style="margin-top:36px">Former members</div>
        <div class="grid grid-auto" style="opacity:.7">${inactive.sort(byLast).map(card).join('')}</div>` : ''}`;

    const q = UI.$('#q');
    q.addEventListener('input', () => {
      const s = q.value.trim().toLowerCase();
      let shown = 0;
      app.querySelectorAll('#grid .player-card').forEach(el => {
        const hit = !s || el.dataset.name.includes(s);
        el.hidden = !hit; if (hit) shown++;
      });
      UI.$('#none').hidden = shown > 0;
    });
  } catch (err) { UI.error(app, err); }
})();
