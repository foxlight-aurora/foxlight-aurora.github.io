# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Oulu locals** checking in the evening whether it is worth heading out tonight, and where.
- **Visitors and tourists** on a short stay who want the best night and spot, often without knowing what Kp means or where the places are.
- **Photographers** who want the detail behind the call: hourly timing, Kp, solar wind, clouds, FMI's R-index.

Many check on a phone, outdoors or about to go out, after dark.

## Product Purpose

Foxlight Aurora answers one question for Oulu, Finland: should I go out to see the northern lights, when, and where? It combines NOAA's Kp forecast and real-time solar wind, FMI's local R-index and cloud forecast, and the sun's position into an hourly chance for six named viewing spots over the next three nights, plus a 27-day outlook. Success is people going out on nights that deliver and staying in on nights that do not.

## Positioning

Built for Oulu only: named local spots with their own cloud forecasts and light-pollution class, FMI's magnetometers next to Oulu for the nowcast, and a chance score calibrated to FMI's statistic that auroras show on roughly 1 in 4 clear, dark nights around Oulu.

## Operating Context

Static site on GitHub Pages, rebuilt every ~10 minutes after dark; open pages reload when a newer build is live. Data snapshot is also published as `/data.json`. Directions open in Google Maps. Place search uses OpenStreetMap; the starting point is stored only in the browser. Google Analytics only with consent.

## Capabilities and Constraints

- Next.js 16 static export, Tailwind CSS v4, no server at runtime.
- Times are Oulu time (Europe/Helsinki). Kp is a 0–9 global index in thirds; the chance is a 0–100 score (Great 60+, Good 35+, Possible 15+, Unlikely below).
- A failing critical source fails the build so the last correct page stays online; stale live readings are shown as delayed, never as "now".
- A forecast, not a promise: copy must never overstate certainty.

## Brand Commitments

- Name: Foxlight Aurora. From the Finnish *revontulet*, "fox fires".
- An aurora animation that responds to activity is part of the identity.
- Independent, non-commercial, not affiliated with FMI or NOAA. Licensed GPL-3.0-or-later, © Abhishek Singh Sambyal.

## Evidence on Hand

Live data only (NOAA SWPC, FMI, RWC Finland). FMI's published visibility statistics for Finland. One confirmed sighting by the author: very good auroras at Nallikari beach, 4 Oct 2026, 21–22 Oulu time (Kp 5.67, substorm). No testimonials, user counts or press exist; none may be invented.

## Product Principles

1. Answer "go or not, when, where" first; detail is for those who ask.
2. Reliability over excitement: calibrated numbers, honest uncertainty, visible data age.
3. Local beats global: Oulu's spots, Oulu's clouds, Oulu's magnetometers.
4. Explain every technical term in place, for visitors who have never heard of Kp.

## Accessibility & Inclusion

Readable at night outdoors on a phone without wrecking night vision; every term has a tap-to-explain tooltip; keyboard and screen-reader access for pickers and charts.
