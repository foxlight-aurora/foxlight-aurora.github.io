# Foxlight Aurora

*Northern lights forecast for Oulu · Revontulet Oulussa*

Answers **"Should I go out tonight, when, and where?"** for aurora hunting around Oulu, Finland (65°N).
Enter an area or landmark (or use your location) to rank the viewing spots by distance from you.

Built with Next.js 16 (static export), Tailwind CSS 4 and TypeScript. No UI libraries; charts are inline SVG.
Hosted on GitHub Pages and rebuilt with fresh data by GitHub Actions: every 10 minutes while it can be dark, hourly in daylight.

```bash
npm install
npm test         # vitest — the visibility model, parsers and forecast logic
npm run dev      # http://localhost:3000
npm run build    # static site in ./out (set BASE_PATH=/repo-name for a project page)
```

## How it works

- **Build-time aggregator** — `lib/data.ts#getAuroraData` fetches every source in parallel, trims the payloads
  (~5 MB raw → ~16 KB) and computes the forecast. The page and `data.json` are both generated from it.
  Every fetch is retried, every parser validates the format and throws on anything unexpected.
- **Never a confident wrong answer** — if a critical source (Kp forecast, FMI cloud forecast) is missing or incomplete,
  the build fails and the previous correct deployment stays online. Optional sources show as "unavailable", and live
  readings older than 30 min show as "delayed" instead of "now". If the page itself is over 75 min old, visitors see a
  warning banner (computed in the browser, so it works even if the update pipeline stops).
- **Scheduled rebuilds** — `.github/workflows/deploy.yml` runs tests, builds and deploys on every push, every 10 min
  from 13:00 to 05:59 UTC (when it can be dark in Oulu) and hourly otherwise. GitHub runs schedules late or skips
  them, so an external timer triggers the same workflow on the same pattern (see [Reliable refresh](#reliable-refresh)).
  Open pages check `version.json` at once when opened, brought back or back online, and every 2 minutes while open,
  and load a newer build under a one-off address so neither GitHub's CDN nor the browser (10-minute caches) can serve
  the old one. Runs queue rather than cancel each other, with timeouts, so one stuck deploy can't block updates.
- **Visibility model** — `lib/oulu.ts`:
  `chance = 100 × activity(Kp, spot.minKp, moonlight) × (1 − clouds) × darkness(sun altitude)`.
  Activity is a logistic curve, even at `minKp + 0.25` with a 0.5 Kp scale; spots have an even chance from Kp 3+
  (dark sky), 4+ (semi-dark shore) or 5+ (city lights). Calibrated to FMI's statistic that auroras show on ~25% of
  clear, dark nights around Oulu: over Sep 2014 – Apr 2025 (GFZ Kp), dark spots average ~34 on clear dark nights,
  semi-dark ~16. Alerts follow the same points: Kp 3+ → "Activity reaches dark spots", 5+ → "reaches the city centre".
- **Moonlight** — `lib/moon.ts` gives the moon's altitude and phase (within 0.3° and 1% of JPL Horizons) and a
  0–1 moonlight from Allen's phase law (a half moon ≈ a tenth of a full one), fading below 30° altitude. It adds to
  the sky's own glow, each minKp step being about a doubling of glow (`moonlitKp`): a full moon high up turns a dark
  spot into a semi-dark one (+1 Kp) and costs brighter spots less. Backtested on GFZ Kp 2014–2025: dark spots 31.7%
  → 29.0% of clear dark nights overall, 29.6% → 18.5% on the nights with a bright moon up.
- **Nowcast** — Kp is raised by FMI's R-index from Oulujärvi and Ranua (either side of Oulu), FMI's own 5-minute
  auroral activity index with per-station thresholds (yellow = 50% chance of weak auroras → even chance at dark
  spots, red = 50% chance of strong auroras → even chance in the city). It catches local substorms the global
  3-hour Kp misses.
- **Forecast** — `lib/forecast.ts` scores 72 hours per spot, groups them into nights and finds each night's best window.
  The current hour uses the measured nowcast (so it agrees with "now"), handing over to NOAA's Kp forecast
  linearly within 3 hours.
- **Search engines** — `app/robots.ts`, `app/sitemap.ts` (lastmod = data time), `app/manifest.ts`, a static
  share image (`app/opengraph-image.png`, PNG so GitHub Pages serves it as an image), canonical URL and JSON-LD
  (WebSite, WebPage, FAQPage) in `app/page.tsx`. Site name, title and description live in `lib/site.ts`.
- **Analytics** — `components/Analytics.tsx` loads Google Analytics (G-8BDX35ERF0) only after a visitor taps
  "Allow" (EU consent rules); declining sends nothing to Google. The choice is kept in `localStorage` and can be changed
  from the footer. Only counted on foxlight-aurora.github.io, and auto-refresh reloads are not counted as page views.
- **Your location** — place search uses OpenStreetMap Nominatim from the browser; the chosen point is kept only in
  `localStorage`. Distances default to Oulu Market Square.

## Correctness checks

Two safety nets, so a wrong score doesn't wait for someone to notice it:

- **Before every deploy** — `scripts/fetch-data.mts` runs `verifySnapshot` (`lib/verify.ts`) and skips the deploy if
  it finds anything, leaving the last good site online. It checks that every spot's "now" follows from its inputs,
  that the chart's current hour uses the same activity and clouds as "now", that night peaks and best nights add up,
  that Kp and the nowcast follow from NOAA and FMI, and the sun by a second formula (NOAA's full algorithm). Every
  check is exact or has a wide margin, so a correct snapshot never fails (including at dusk). Separately, the data
  step refuses an FMI cloud answer a cache has held over 20 minutes. `lib/data.test.ts` breaks a snapshot in each of
  these ways and checks it's caught.
- **After every deploy and every 30 minutes** — `.github/workflows/watchdog.yml` runs `scripts/watchdog.mts` on the
  live site: it's updating (35 min at night, 90 by day, allowing for NOAA's ~15-minute Kp gap after midnight UTC),
  the page and `data.json` come from the same build, the data passes `verifySnapshot`, and its Kp matches NOAA's. A
  failure opens the issue "Live site check failed" (GitHub emails the owner), closed again once the checks pass. Run
  it locally with `npx tsx scripts/watchdog.mts`.

## Reliable refresh

GitHub's `schedule:` trigger is best effort (runs are often hours late), so [cron-job.org](https://cron-job.org)
calls the workflow's `workflow_dispatch` on time. Two jobs, timezone UTC, both `POST`ing to
`https://api.github.com/repos/foxlight-aurora/foxlight-aurora.github.io/actions/workflows/deploy.yml/dispatches`
with body `{"ref":"main"}`:

| Job | Minutes | Hours (UTC) |
|---|---|---|
| Night | 0, 10, 20, 30, 40, 50 | 13–23, 0–5 |
| Day | 0 | 6–12 |

Headers: `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2026-03-10`,
`Authorization: Bearer <token>`. The token is a fine-grained personal access token scoped to this repository only,
with **Actions: Read and write** and nothing else. A successful call returns `200` with the run details (`204` on the older `2022-11-28` API version). When the token expires,
create a new one and paste it into both jobs.

## Data sources

| What | Source |
| --- | --- |
| Kp observed + 3-day forecast | NOAA SWPC `noaa-planetary-k-index-forecast.json` |
| Solar wind speed, Bz | NOAA SWPC real-time solar wind (`json/rtsw/*`) |
| 27-day outlook | NOAA SWPC `27-day-outlook.txt` |
| OVATION aurora probability | NOAA SWPC `ovation_aurora_latest.json` |
| Cloud cover forecast per spot | FMI open data (meteorologist-edited forecast) |
| Auroral activity now | FMI R-index ([space.fmi.fi](https://space.fmi.fi/image/realtime/SSA/r-index/)), Oulujärvi + Ranua |

Note: GitHub pauses scheduled workflows after 60 days without repository activity — re-enable it from the Actions tab if that happens.

## License

Copyright © 2026 Abhishek Singh Sambyal

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public
License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later
version. It is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied
warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See [LICENSE](LICENSE) for the full text.

Forecast data comes from NOAA SWPC and FMI under their own terms; the Geist, Barlow Condensed and JetBrains Mono fonts are under the SIL Open Font License.
