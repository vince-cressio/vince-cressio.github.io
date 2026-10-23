/* One LTD Cup year (cup/2027.html etc.): reads <body data-year>, lists that year's Cup rounds from Events. */
(async () => {
  const app = UI.$('#app');
  const year = Number(document.body.dataset.year);
  try {
    const m = Calc.model(await LTD.load('Events', 'Courses'));
    const rounds = m.events.filter(e => e._cup && e._season === year);
    const dated = rounds.filter(e => e._date);
    if (dated.length) {
      const a = dated[0]._date, b = dated[dated.length - 1]._date;
      UI.$('#page-eyebrow').textContent = UI.fmtDate(a, { month: 'long', day: 'numeric' })
        + (b > a ? ' – ' + UI.fmtDate(b, { month: 'long', day: 'numeric' }) : '') + ', ' + a.getFullYear();
    }
    app.innerHTML = `<section class="section">
      <h2 class="section-title">Rounds</h2>
      ${rounds.length ? rounds.map(e => {
        const course = UI.eventCourse(e, m.courses);
        return `<div class="event-row">
          <div class="event-date">${e._date ? UI.fmtDate(e._date, { month: 'short', day: 'numeric' }) + `<small>${UI.fmtDate(e._date, { weekday: 'long' })}</small>` : 'TBD<small>Date to come</small>'}</div>
          <div><div class="event-name">${UI.esc(e.name)}</div>
            <div class="event-meta">${[course && UI.esc(course), UI.esc(LTD.str(e.format))].filter(Boolean).join(' · ') || 'Course and format to be announced'}</div></div>
          <div class="event-actions">${UI.statusBadge(e)}</div>
        </div>`;
      }).join('') : UI.empty(`No ${year} Cup rounds on the schedule yet.`)}
    </section>
    <section class="section">
      <h2 class="section-title">Teams &amp; matches</h2>
      ${UI.empty('Captains, the draft and match results will be posted here. Until then, relive the <a class="gold" href="/cup/2026.html">2026 Cup</a>.')}
    </section>`;
  } catch (err) { UI.error(app, err); }
})();
