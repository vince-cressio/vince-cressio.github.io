/* LTD Cup landing — past champions are static; future Cups come from Events (series = "LTD Cup"). */
(async () => {
  const grid = UI.$('#cup-years');
  try {
    const m = Calc.model(await LTD.load('Events', 'Courses'));
    const archived = new Set([2026]);
    const years = [...new Set(m.events.filter(e => e._cup).map(e => e._season))].filter(y => y && !archived.has(y)).sort((a, b) => b - a);
    grid.insertAdjacentHTML('afterbegin', years.map(y => {
      const rounds = m.events.filter(e => e._cup && e._season === y);
      const first = rounds.find(e => e._date);
      return `<a class="card player-card" href="/cup/${y}.html" style="display:block">
        <div class="card-title">${y} · ${first ? UI.fmtDate(first._date, { month: 'long', year: 'numeric' }) : 'Dates TBD'}</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;line-height:1.1">Coming up</div>
        <div class="muted" style="font-size:.88rem;margin-top:4px">${rounds.length} round${rounds.length === 1 ? '' : 's'} on the schedule</div>
        <div class="gold" style="font-size:.85rem;margin-top:10px">Schedule &amp; details →</div>
      </a>`;
    }).join(''));
  } catch (err) { console.error(err); }
})();
