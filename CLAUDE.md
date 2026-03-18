# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static single-page website for **LTD Cup 2026**, a competitive golf event. Hosted on GitHub Pages at `ltdcup.com`. No build system — the entire site is a single `index.html` file with embedded CSS and JavaScript.

## Development

**No build step required.** To preview locally, open `index.html` directly in a browser or use any static file server:

```bash
# Python (if available)
python -m http.server 8080

# Node (if available)
npx serve .
```

**Deployment:** Push to `main` branch — GitHub Pages automatically publishes.

## Architecture

Everything lives in `index.html` (~1900+ lines):

1. **`<style>` block** — All CSS, organized by section with comments. Uses CSS custom properties defined in `:root` for the design system (colors, spacing, shadows).
2. **`<body>`** — HTML structure for all page sections (nav, hero, teams, draft, leaderboard, stats).
3. **`<script>` block** — All JavaScript at the bottom.

### Design System (CSS variables in `:root`)
- Colors: `--bg`, `--panel`, `--panel2`, `--gold`, `--red`, `--blue`, `--green`, `--muted`, `--text`
- Shared: `--radius: 16px`, `--shadow`, `--line` (border color)
- Fonts: Bebas Neue (display/headings), DM Sans (body), Teko (UI accents) — loaded from Google Fonts

### Page Sections
- **Nav (`.topbar`)** — Sticky, glassmorphism blur
- **Hero** — Countdown timer, event intro
- **Teams/Roster** — Team cards with player lists
- **Draft** — Draft results table
- **Leaderboard** — Match records, standings
- **Player Stats** — Individual player statistics
