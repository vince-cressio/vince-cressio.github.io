/* Schedule — every event, grouped by season and series. */
(async () => {
  const app = UI.$('#app');
  try {
    const d = await LTD.load('Events', 'Courses', 'Results');
    const m = Calc.model(d);
    if (!m.events.length) { app.innerHTML = UI.empty('No events on the calendar yet.'); return; }

    const seasons = m.seasons.slice().reverse();
    app.innerHTML = seasons.map(season => {
      const evs = m.events.filter(e => e._season === season);
      const regular = evs.filter(e => !e._cup), cup = evs.filter(e => e._cup);
      return `<section class="section">
        <h2 class="section-title">${season} Season <small>${regular.length} stroke-play event${regular.length === 1 ? '' : 's'}${cup.length ? ' · LTD Cup' : ''}</small></h2>
        ${regular.length ? `<div class="sub-title">Regular Season</div>${regular.map(e => eventRow(e, m)).join('')}` : ''}
        ${cup.length ? `<div class="sub-title">LTD Cup</div>${cup.map(e => eventRow(e, m)).join('')}` : ''}
      </section>`;
    }).join('');
  } catch (err) { UI.error(app, err); }

  function eventRow(e, m) {
    const course = UI.eventCourse(e, m.courses);
    const meta = [
      course && (m.coursesById[e.course_id] ? `<a href="/courses.html#${UI.esc(e.course_id)}" style="text-decoration:underline dotted">${UI.esc(course)}</a>` : UI.esc(course)),
      UI.esc(LTD.str(e.format)),
      LTD.str(e.entry_fee) && UI.esc(LTD.str(e.entry_fee)) + ' entry',
    ].filter(Boolean).join(' · ') || 'Details to come';
    const hasResults = !!m.resultsByEvent[e.event_id];
    const signup = LTD.str(e.signup_url);
    const actions = [
      UI.statusBadge(e),
      hasResults && `<a class="btn btn-ghost" href="/results.html?event=${encodeURIComponent(e.event_id)}">Results</a>`,
      !LTD.isComplete(e) && signup && `<a class="btn btn-gold" href="${UI.esc(signup)}" target="_blank" rel="noopener">Sign up</a>`,
    ].filter(Boolean).join('');
    return `<div class="event-row" id="${UI.esc(e.event_id)}">
      ${dateBlock(e)}
      <div><div class="event-name">${UI.esc(e.name)}</div><div class="event-meta">${meta}</div></div>
      <div class="event-actions">${actions}</div>
    </div>`;
  }

  function dateBlock(e) {
    if (!e._date) return '<div class="event-date">TBD<small>Date to come</small></div>';
    return `<div class="event-date">${UI.fmtDate(e._date, { month: 'short', day: 'numeric' })}
      <small>${UI.fmtDate(e._date, { weekday: 'long', year: 'numeric' })}</small></div>`;
  }
})();
