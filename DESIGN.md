---
name: Foxlight Aurora
description: A weather-station dashboard for Oulu's night sky, with the aurora alive behind it.
colors:
  night-ground: "#05080d"
  night-surface: "#0a1118"
  tile-slate: "rgb(9 14 21 / 0.88)"
  rule: "#1c2733"
  line: "#17212c"
  ink: "#e8eef4"
  muted: "#8b98a6"
  faint: "#707d8b"
  aurora-mint: "#3ee6a8"
  lime-good: "#a8e26c"
  amber-maybe: "#f0c35a"
  slate-low: "#3a4653"
  cloud-blue: "#6f8db8"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(3.25rem, 7vw, 5.5rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.025em"
  numeral:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.025em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.16em"
  data:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    letterSpacing: "0.08em"
    fontFeature: "tnum"
rounded:
  pill: "9999px"
  card: "16px"
  tooltip: "12px"
  cell: "8px"
  inline: "0.5em"
spacing:
  hairline: "1px"
  tile-sm: "16px"
  tile: "20px"
  card: "28px"
  grid-gap: "16px"
  section: "80px"
components:
  card:
    backgroundColor: "{colors.tile-slate}"
    rounded: "{rounded.card}"
    padding: "28px"
  tile:
    backgroundColor: "{colors.tile-slate}"
    textColor: "{colors.ink}"
    padding: "20px"
  chip:
    backgroundColor: "{colors.night-ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  button-pill:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
  input-search:
    backgroundColor: "{colors.night-ground}"
    textColor: "{colors.ink}"
    typography: "{typography.data}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  spot-select:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.inline}"
    padding: "0 0.45em"
  tooltip:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tooltip}"
    padding: "8px 12px"
---

# Design System: Foxlight Aurora

## Overview

**Creative North Star: "The Night Weather Station"**

Foxlight reads like a weather board bolted to a hut on the Oulu shore: a mono coordinate line, a giant condensed uppercase place name, a ruled grid of instrument tiles with big numerals and hairline gauges, and a line-and-area hourly curve. All of it sits on a near-black night ground, and a slow aurora curtain moves behind the top of the page, brighter when Kp is higher. The page gives a verdict and backs it with readings. It is not a soft forecast column of rounded cards.

The page is dense where the data is and quiet everywhere else. Three type voices each have one job. Condensed caps carry headlines and numerals, mono carries times, coordinates and readings, and Geist carries every sentence. Color is reserved for meaning: aurora mint is the chance, slate-blue is cloud, and lime and amber grade the tone. Everything else is ink, muted and faint grey on slate.

Dark only, by design. People read the site outdoors at night, and a light surface would ruin their night vision.

**Key Characteristics:**
- Night ground (#05080d) under opaque slate tiles divided by 1px rules; the aurora shows only around the tiles.
- Condensed 700/800 uppercase display and numerals; mono for data; Geist for prose.
- Color means something: mint = chance/great, lime = good, amber = possible, slate-blue = cloud, grey = low.
- Every score is written as "N / 100" and Kp as "N / 9". Never "%" for the chance.
- Motion is limited to the aurora curtain and a one-time chart reveal.

## Colors

The ground is a cold near-black. The neutrals are blue-tinged slate, and the accent set reads as a signal scale.

### Primary
- **Aurora Mint** (aurora-mint): the chance itself. Used for the chance curve and its fill, "great" tone dots (with a soft mint glow), strong-tone status lines, Kp in the facts line, link text, focus outlines (at 60%), hover borders (at 50%), selection, accent and caret color. It is also the brightest band of the background curtain.

### Secondary
- **Cloud Slate-Blue** (cloud-blue): cloud cover only. Used for cloud bars under the chart, the clouds fact, cloud numerals in the spot list, the cloud glyph over the aurora arcs, and the chart legend swatch.

### Tertiary
- **Lime Good** (lime-good) and **Amber Possible** (amber-maybe): the middle steps of the tone scale (Good 35+, Possible 15+). Amber also marks warnings such as the stale-data banner and its 40% border. In the outlook calendar, tones appear as tinted cells (10–20% fill plus tone text).

### Neutral
- **Night Ground** (night-ground): page background, theme color, chip fill at 60%, inputs, and the knock-out ring around chart points.
- **Night Surface** (night-surface): raised inline controls and tooltips.
- **Tile Slate** (tile-slate): every card and tile, nearly opaque so the curtain doesn't wash through the data.
- **Rule** (rule): the 1px borders on cards, chips and dividers, and the hairline gaps between tiles.
- **Line** (line): chart gridlines, gauge tracks, the spot-select border and the Bz ring.
- **Ink** (ink): headings, numerals and primary text.
- **Muted** (muted): sentences, labels, units and low-tone status.
- **Faint** (faint): the lowest text tone (≥4.5:1 on the ground). Used for scope tags, axis numbers, footnotes and score digits.
- **Low Slate** (slate-low): the "low" tone's dots and bars, and the scrollbar.

### Named Rules
**The Signal Scale Rule.** Color is reserved for tone: great → mint, good → lime, possible → amber, low → muted grey. Every tone-bearing element (dot, gauge fill, status line, calendar cell) takes its color from that one map. No other hues may be introduced for data.

**The Faint Floor Rule.** Faint (#707d8b) is the darkest any text may go. Rules and gridlines use rule/line (#1c2733 / #17212c) and never carry text.

**The Night Only Rule.** There is no light theme. `color-scheme: dark` is fixed.

## Typography

**Display Font:** Barlow Condensed 600/700/800 (with Arial Narrow)
**Body Font:** Geist (with system-ui)
**Label/Mono Font:** JetBrains Mono (with ui-monospace)

**Character:** Condensed caps are the board's stencil lettering, mono is the instrument readout, and Geist is the plain voice that explains what the readings mean.

### Hierarchy
- **Display** (800, 3.25rem → 4.5rem → 5.5rem, 0.9, tight tracking, uppercase): the place-name headline only.
- **Chance numeral** (800, 5.5rem → 7rem, tabular): the hero score, followed by a tone-colored "/ 100" at 700, 1.5–1.875rem.
- **Headline** (800, 2.25rem → 3rem, leading 1, tight, uppercase): section titles.
- **Numeral** (700, 2.5rem → 3rem, tabular): tile values. The unit or prefix sits beside the number at 1.125–1.25rem in muted.
- **Title** (700, 1.5–2.25rem, leading 1, wide tracking 0.025em, uppercase): the verdict, spot names, outlook dates and tip titles.
- **Body** (400, 0.875rem small / 1.125rem hero sentence, 1.625, max 65ch): every explanatory sentence, in muted. Emphasis goes to ink at 500.
- **Label** (600, 0.7rem → 0.75rem, 0.16em tracking, uppercase, muted): tile labels, table heads, weekday heads and the chart card heading.
- **Data** (mono 400, 0.65–0.95rem, tabular): coordinates (0.12em tracking, uppercase), update times, scope tags (0.65rem, 0.08em, uppercase, faint), facts lines, axis ticks and chart readouts.

### Named Rules
**The Mono Is Data Rule.** Monospace is only for times, coordinates and data values. A sentence in mono is a bug.

**The Caps Belong To Condensed Rule.** Uppercase display text uses Barlow Condensed. The only uppercase Geist is the small tracked label.

**The Score Format Rule.** The chance is a 0–100 score written "N / 100" or "Label N", and Kp is written "N / 9". Never show the chance with "%".

## Layout

There is a single centered column, max 72rem (`max-w-6xl`), with 16px gutters (24px from `sm`). Most wide rows use a 5:7 two-column split from `lg`: tonight card | tiles, outlook list | calendar, tips | FAQ, footer brand | footer notes. These rows stack below `lg`. The live tiles form a 3×2 grid (2×3 on phones) built with 1px gaps over the rule color, so the dividers are actual rules and not borders on each tile. Gaps between cards are 16px. Sections are separated by 80px, and a section's headline sits 20px above its content. The first viewport is the mono coordinate line, the giant headline, the update time pinned right, and then the tonight card beside the tiles.

## Elevation & Depth

The system is flat. Depth comes from layering: the night ground, then the fixed aurora layer (stars plus blurred curtain, masked to fade out by 70vh), then opaque slate tiles. Cards cast no shadows. The only shadows are a functional one under the floating tooltip and the mint glow on "great" tone dots.

### Shadow Vocabulary
- **Tooltip lift** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)`): only on the portal tooltip, which floats over content.
- **Great glow** (`box-shadow: 0 0 10px rgb(62 230 168 / 0.6)`): only on great-tone dots.

### Named Rules
**The Sky Behind Glass-Free Tiles Rule.** Tiles are opaque slate (88%), never frosted glass. The aurora lives in the gutters and around the tiles, never inside them.

**The Two Motions Rule.** Only two things move: the aurora curtain (transform and opacity only, 48–70s flow, 8–10s pulse) and the chart's single left-to-right clip-path reveal (1.1s, cubic-bezier(0.16, 1, 0.3, 1)). Both are off under `prefers-reduced-motion`. State changes are limited to color transitions and the plus icon rotating 45°.

## Shapes

Containers use one generous radius (16px) and are outlined by a 1px rule. Anything you press or pick is a full pill: chips, toggle buttons, the search field, the segmented control. Calendar cells use 8px, the tooltip 12px, and the inline spot picker 0.5em so it scales with its sentence. Gauges are 6px rounded tracks with 1px tick marks that overshoot the track by 4px on each side. Dots are perfect circles (6–8px). Icons are hand-drawn SVG with round caps at a 1.6–1.75 stroke.

## Components

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** tile slate, with a 1px rule border.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Internal Padding:** 24–28px for hero and chart cards, 20–24px for lists. Rows in lists are divided by the rule color.

### Live Tile (signature)
Every tile follows the same anatomy:
1. A small-caps label with a dotted-underline glossary term.
2. A mono scope tag in faint: GLOBAL, OULU AREA, or the spot's name.
3. A condensed numeral with its muted unit, plus an optional authored SVG icon to the left (the Bz arrow).
4. An optional hairline gauge: the fill is in the tone color, and ticks mark where the value starts to matter.
5. One status line directly under it, in the tone color (muted when low).

### Chips
- **Style:** pill, 1px rule border, night ground at 60%, 14px/500 ink text, with an optional tone dot.
- **State:** link chips end in the SVG arrow and get a mint border at 50% on hover.

### Buttons
- **Shape:** full pill, 1px rule border, 14px/500 text.
- **Hover / Focus:** border goes mint at 50%. Focus uses a 2px mint outline at 60%, offset 2px. Disabled is 50% opacity.
- **Segmented toggle:** pills inside a pill track with 2px padding. The active segment is filled.

### Inputs / Fields
- **Style:** pill, night ground fill, 1px rule border, mono 14px text, faint placeholder.
- **Focus:** border turns mint at 50%, with no outline glow.

### Inline Spot Picker (signature)
The spot's name sits inside the sentence as a 0.5em-rounded chip on night surface with a line border and a mint chevron. A transparent native select covers it. Hovering nudges the chevron down 1px and turns the border mint. Keyboard focus draws a mint outline at 40%.

### Glossary Term
Technical words get a dotted faint underline (offset 4px) that turns muted on hover and mint on focus. They open a 288px max tooltip on night surface with a 12px radius, clamped to the viewport.

### Hourly Chart (signature)
A mint line (2.5px, non-scaling) sits over an area that fades from mint at 40% to violet to transparent. Gridlines are drawn at 0/25/50/75/100 with faint mono ticks. Each night's peak gets a mint dot ringed in the night ground with its score in mono above it. Slate-blue cloud bars run along the bottom like a rain strip, and below them come mono hour ticks and a small-caps night label on a rule. The readout line switches to mono when you pick an hour.

## Do's and Don'ts

### Do:
- **Do** build every new reading as a Live Tile: label, mono scope tag, condensed numeral with unit, optional gauge with meaning ticks, one status line.
- **Do** color data only through the tone map (mint / lime / amber / muted) and cloud through slate-blue.
- **Do** keep tiles opaque slate on 1px rules (#1c2733), with 16px corners.
- **Do** write the chance as "N / 100" and Kp as "N / 9", with tabular numerals.
- **Do** draw icons as authored inline SVG with currentColor and round caps.
- **Do** switch off any new motion under `prefers-reduced-motion`, and animate only transform, opacity or clip-path.

### Don't:
- **Don't** put kicker or eyebrow labels above headings. The headline speaks for itself.
- **Don't** show the chance with "%". It is a score, not a probability.
- **Don't** set prose in monospace.
- **Don't** use text darker than faint (#707d8b), and don't use rule colors for text.
- **Don't** add a light theme or light surfaces.
- **Don't** use text glyphs (→, ↑, ✓) as icons.
- **Don't** frost or blur the tiles, or let the aurora show through them.
- **Don't** add drop shadows to cards.
