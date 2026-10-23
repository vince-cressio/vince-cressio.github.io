/* Sign-up — links from each upcoming event's signup_url. */
(async () => {
  const app = UI.$('#app');
  try {
    const d = await LTD.load('Events', 'Courses');
    const m = Calc.model(d);
    if (!m.upcoming.length) { app.innerHTML = UI.empty('No upcoming events right now. Check the <a href="/schedule.html" class="gold">schedule</a>.'); return; }

    const open = m.upcoming.filter(e => LTD.str(e.signup_url));
    const soon = m.upcoming.filter(e => !LTD.str(e.signup_url));
    const card = (e, link) => {
      const course = UI.eventCourse(e, m.courses);
      const fee = LTD.str(e.entry_fee);
      return `<div class="card" style="display:flex;flex-direction:column;gap:10px">
        <div class="card-title" style="margin:0">${e._date ? UI.fmtDate(e._date) : 'Date TBD'}</div>
        <div class="event-name" style="font-size:1.15rem">${UI.esc(e.name)}</div>
        <div class="event-meta">${[UI.esc(course), UI.esc(LTD.str(e.format)), fee && UI.esc(fee) + ' entry'].filter(Boolean).join(' · ') || 'Details to come'}</div>
        <div style="margin-top:auto;padding-top:6px">${link
          ? `<a class="btn btn-gold" href="${UI.esc(link)}" target="_blank" rel="noopener">Sign up ↗</a>`
          : '<span class="btn btn-ghost" aria-disabled="true">Sign-up opens soon</span>'}</div>
      </div>`;
    };

    app.innerHTML = `
      <section class="section">
        <h2 class="section-title">Open for sign-up</h2>
        ${open.length ? `<div class="grid grid-3">${open.map(e => card(e, LTD.str(e.signup_url))).join('')}</div>`
                      : UI.empty('No sign-ups are open yet. Links appear here as soon as they’re posted.')}
      </section>
      ${soon.length ? `<section class="section">
        <h2 class="section-title">Coming up <small>sign-up not open yet</small></h2>
        <div class="grid grid-3">${soon.map(e => card(e, null)).join('')}</div>
      </section>` : ''}`;
  } catch (err) { UI.error(app, err); }
})();
