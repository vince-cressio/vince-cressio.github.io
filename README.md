# LTD Golf Club

Static site for the LTD Golf Club at [ltdcup.com](https://ltdcup.com). There's no build step: plain HTML/CSS/JS on GitHub Pages. All league data comes from the club's Google Sheet, published as CSV.

## Running locally

Pages fetch data and use root-relative paths (`/assets/...`), so serve the repo root over HTTP. Opening the files directly won't work:

```bash
python -m http.server 8080      # or: npx serve .
```

Add `?refresh` to any URL to skip the 5-minute data cache.

## Running an event

1. Enter scorecards in the **Scorecards** tab. The sheet fills in **Results**.
2. Set the event's `status` in **Events** to `complete`. Results stay hidden until you do this.
3. Results, skins, standings, player profiles and course hole stats all update within a few minutes, because Google's published CSV lags a bit.

To show an event's results *before* it's marked complete (for example, test data), add its `event_id` to `previewEvents` in `assets/js/data.js`. Those results appear with a "Test data" banner until the event's status is set to `complete`; then the banner disappears on its own, with no code change needed. The list is empty right now.

## How things are calculated

All math is in `assets/js/calc.js` and comes from the Scorecards hole columns (`h1`–`h18`), `course_hcp`, `gender`, and the stroke indexes in **Holes**:

- **Net per hole:** strokes are given out by stroke index (women's index for women). Plus handicaps give strokes back from index 18.
- **Adjusted gross:** each hole is capped at net double bogey. This matches the sheet's `gross` column.
- **Skins:** gross and net, with no carryovers, and a tie for low voids that hole's skin. One extra gross skin goes to the low adjusted-gross round. Ties are broken by comparing capped hole scores from stroke index 1 upward, like the sheet's tiebreak.
  Each pot is `$10 × players`, divided by the skins awarded in that pot and rounded down. The remainder goes to the club.
- **Standings:** each player's best 4 regular-season `league_pts` totals in the season. Flights are combined. Cup rounds (`series` = LTD Cup) don't count.
- **Hole difficulty:** average gross vs. par across all posted rounds. Rank 1 is the hardest hole.

The sheet's Standings, Stats, Hole Stats and Skins tabs aren't used. The site computes those itself, so unpublished events never leak into them.

## "Last updated" (Meta tab)

The footer shows the time of the sheet's last edit once the Meta tab exists. Until then it shows when the data was fetched.

1. Add a tab named **Meta** with `key` in A1, `value` in B1, and `last_updated` in A2.
2. Go to **Extensions → Apps Script** and paste:

   ```js
   function onEdit(e) {
     var sheet = e.range.getSheet();
     if (sheet.getName() === 'Meta') return;
     var stamp = new Date().toISOString();
     e.source.getSheetByName('Meta').getRange('B2').setNumberFormat('@').setValue(stamp);
   }
   ```

   This is a simple trigger, so it needs no setup. It fires on edits made by people, not on formula recalculation.
3. **File → Share → Publish to web**, pick the Meta tab as CSV, and copy the `gid=` number from the link into `TABS.Meta` in `assets/js/data.js`.

## Players' photos

Set `photo_url` in **Players** to any image URL. Players without one get their initials. Photos from the 2026 Cup are already in the repo:

| Player | photo_url |
|---|---|
| P001 Ted Bojorquez | `/assets/img/players/bojorquez.jpg` |
| P002 Kirk Westbrook | `/assets/img/players/westbrook.jpg` |
| P003 Vince Cressio | `/assets/img/players/cressio.jpg` |
| P004 Damon Doe | `/assets/img/players/doe.jpg` |
| P005 Kevin Conway | `/assets/img/players/conway.jpg` |
| P006 Rob Neimeyer | `/assets/img/players/neimeyer.jpg` |
| P007 John Slattery | `/assets/img/players/slattery.jpg` |
| P008 Ramon Villamor | `/assets/img/players/villamor.jpg` |
| P009 David Peterson | `/assets/img/players/peterson.jpg` |
| P011 Jeff Hull | `/assets/img/players/hull.jpg` |
| P012 Fernando Gonzalez | `/assets/img/players/gonzalez.jpg` |
| P013 Victor Flores | `/assets/img/players/flores.jpg` |
| P014 Jeffery Javier | `/assets/img/players/javier.jpg` |
| P015 Pete Lopez | `/assets/img/players/lopez.jpg` |
| P016 Rusty Weekes | `/assets/img/players/weekes.jpg` |
| (2026 Cup "Teddy Li") | `/assets/img/players/li.jpg` |

## Adding a new LTD Cup year

Copy `cup/2027.html` to `cup/<year>.html` and change `data-year` and the title. Its rounds come from Events rows with `series` = `LTD Cup`. The Cup landing page lists any year that has Cup events. `cup/2026.html` is a frozen, read-only archive of the original Cup site.
