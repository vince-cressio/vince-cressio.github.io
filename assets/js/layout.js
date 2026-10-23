/* ============================================================
   layout.js — shared header, nav and footer for every page.
   Pages include <header id="site-header"></header> and
   <footer id="site-footer"></footer>; this fills them in.
   ============================================================ */
(() => {
  const NAV = [
    { href: '/',               label: 'Home' },
    { href: '/schedule.html',  label: 'Schedule' },
    { href: '/results.html',   label: 'Results' },
    { href: '/standings.html', label: 'Standings' },
    { href: '/roster.html',    label: 'Roster', also: ['/player.html'] },
    { href: '/courses.html',   label: 'Courses' },
    { href: '/signup.html',    label: 'Sign Up' },
    { href: '/cup/',           label: 'LTD Cup', cls: 'nav-cup', prefix: '/cup/' },
  ];

  const path = location.pathname.replace(/index\.html$/, '');
  const isActive = n => (n.prefix ? path.startsWith(n.prefix) : path === n.href || (n.also || []).includes(path));
  const links = cls => NAV.map(n =>
    `<a href="${n.href}" class="${[n.cls, cls, isActive(n) ? 'active' : ''].filter(Boolean).join(' ')}">${n.label}</a>`
  ).join('');

  const header = document.getElementById('site-header');
  if (header) {
    header.className = 'site-header';
    header.innerHTML = `
      <div class="container">
        <a class="site-brand" href="/"><img src="/assets/img/club_logo_96.png" alt="" width="30" height="40"><span>LTD Golf Club</span></a>
        <button class="nav-toggle" aria-label="Menu" aria-expanded="false" aria-controls="site-nav">☰</button>
        <nav class="site-nav" id="site-nav">${links()}</nav>
      </div>`;
    const toggle = header.querySelector('.nav-toggle');
    const nav = header.querySelector('.site-nav');
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
      toggle.textContent = open ? '✕' : '☰';
    });
  }

  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="container">
        <div>
          <div class="foot-brand"><img src="/assets/img/club_logo_96.png" alt="" width="27" height="36">
            <span style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;letter-spacing:.1em;color:var(--text)">LTD Golf Club</span></div>
          <div class="last-updated" id="last-updated" style="margin-top:8px"></div>
        </div>
        <nav class="foot-links">${NAV.map(n => `<a href="${n.href}">${n.label}</a>`).join('')}</nav>
      </div>`;
  }

  // "Last updated" — the sheet's Meta stamp when available, otherwise
  // when this browser fetched the data. Pages without sheet data
  // (e.g. the 2026 Cup archive) set data-static on <body> to skip it.
  const note = document.getElementById('last-updated');
  if (note && typeof LTD !== 'undefined' && !document.body.hasAttribute('data-static')) {
    // Let the page's own requests start first so this reuses them.
    setTimeout(async () => {
      try {
        await LTD.get('Events');
        const { date, source } = await LTD.lastUpdated();
        if (!date) return;
        note.innerHTML = (source === 'sheet' ? 'Last updated ' : 'Data as of ') + '<b>' + UI.fmtDateTime(date) + '</b>';
      } catch (e) { /* page shows its own error */ }
    }, 0);
  }
})();
