# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static multi-page site for the **LTD Golf Club**, a ~30-member league with five stroke-play events per season plus the three-day LTD Cup. Hosted on GitHub Pages at `ltdcup.com`. No build step. All data comes from a Google Sheet published as CSV and is parsed in the browser with PapaParse (cdnjs, pinned 5.4.1). See README.md for the data workflow.

## Development

Serve the repo root over HTTP (pages use root-relative `/assets/...` paths and `fetch`). Opening files directly won't work:

```bash
python -m http.server 8080
```

`?refresh` on any URL bypasses the localStorage data cache.

**Deployment:** Push to `main`. GitHub Pages publishes automatically.

## Architecture

```
index.html, schedule.html, results.html (?event=), standings.html (?season=),
roster.html, player.html (?id=P003), courses.html (#C01), signup.html
cup/index.html     Cup landing (2026 champion card is static HTML)
cup/2026.html      frozen archive of the original single-page Cup site (own inline CSS/JS)
cup/2027.html      per-year Cup page; <body data-year> drives assets/js/pages/cup-year.js
assets/css/site.css    design tokens (:root) + every shared component
assets/js/data.js      LTD: tab gids, fetch + cache, header-keyed rows, value helpers, publish rules
assets/js/calc.js      Calc: rounds/net/caps, skins, standings, hole stats, model() joining tabs
assets/js/ui.js        UI: esc(), formatting, avatars, badges, scorecard renderer
assets/js/layout.js    injects header/nav/footer + "Last updated" into #site-header/#site-footer
assets/js/pages/*.js   one script per page
```

- Every page loads, in order: papaparse → data.js → calc.js → ui.js → layout.js → its page script (all `defer`).
- **Read columns by header name only.** `data.js` ignores blank and duplicate headers (Scorecards has ~20 unlabeled helper columns) and drops rows missing `REQUIRED` keys.
- **Publish rule:** an event's results and scorecards are visible only if `status` is complete or its id is in `LTD.CONFIG.previewEvents`. `Calc.model()` enforces this, so pages should get results and rounds from the model, not from raw tabs.
- Sheet text must pass through `UI.esc()` before going into `innerHTML`.
- Skins, standings and hole stats are computed in `calc.js`. The sheet's Standings, Stats, Hole Stats and Skins tabs are intentionally unused.

### Design System (CSS variables in `:root`)
- Colors: `--bg`, `--panel`, `--panel2`, `--gold`, `--red`, `--blue`, `--green`, `--muted`, `--text`, `--line`
- Fonts: Bebas Neue (display), DM Sans (body), Teko (labels/eyebrows), loaded from Google Fonts
- Dark theme only. Shared layout classes are prefixed `site-` so they don't collide with the Cup archive's legacy classes.
- Logos: `assets/img/club_logo.png` is the club master (RGB, no alpha). The site uses `club_logo_96.png` / `club_logo_256.png` (by height, corners made transparent) in the header, footer, favicon and Home hero. `assets/img/logo.png` is the LTD Cup crest, used only inside `cup/2026.html`.
