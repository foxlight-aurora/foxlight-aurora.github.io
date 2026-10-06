import type { AuroraData } from "@/lib/data";
import { nightLabel, outlookHighlights, verdict, type Night, type Verdict } from "@/lib/forecast";
import { date, day, kp, time, tzName, TONE } from "@/lib/format";
import { directionsUrl, OULU, scoreLabel, type Tone } from "@/lib/oulu";
import { BySpot, SpotSelect } from "./SpotChoice";
import { Term } from "./Term";
import { Tiles } from "./Tiles";
import { Arrow } from "./ui";

type Spot = AuroraData["spots"][number];

const TITLE: Record<Verdict, string> = {
  now: "Go out now",
  tonight: "Good chance tonight",
  maybe: "Maybe tonight",
  unlikely: "Unlikely tonight",
  bright: "Too bright for auroras",
};

const LABEL: Record<Verdict, string> = { now: "Right now", tonight: "Tonight", maybe: "Tonight", unlikely: "Tonight", bright: "Tonight" };

const ALERT = {
  city: { text: "Good chance even from the city centre", tone: "great" },
  "dark-sky": { text: "Good chance at dark spots around Oulu", tone: "good" },
  quiet: { text: "Quiet — auroras rarely reach Oulu at this level", tone: "low" },
} as const;

const B = "font-medium text-ink";
const pct = (c: number | null) => (c === null ? "?" : Math.round(c));
const coord = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}°${v >= 0 ? pos : neg}`;

/** The hero's answer: the verdict, tonight, the window it points to and where to go. */
export function recommend(data: AuroraData) {
  const now = new Date(data.generatedAt);
  const tonight = data.nights.find((n) => nightLabel(n.date, now) === "Tonight") ?? data.nights[0] ?? null;
  const bestNow = data.spots.reduce((a, b) => (b.now > a.now ? b : a));
  const v = verdict({ nowScore: bestNow.now, sunAlt: data.now.sunAlt, tonight });
  const later = data.nights.find((n) => n !== tonight && n.peak >= 15);
  // The window the card describes: now, tonight, or the next good night.
  const target = v === "now" ? null : tonight && tonight.peak >= 15 ? tonight : (later ?? null);
  const where = v === "now" ? bestNow : target ? data.spots.find((s) => s.id === target.spotId)! : null;
  return { now, tonight, bestNow, v, later, target, where };
}

/** "05:00–06:00", plus "· Sun night" when the window starts after midnight (it belongs to the previous evening). */
const windowOf = (n: Night) =>
  `${time(n.start)}–${time(n.end)}${day(n.start) !== date(n.date) ? ` · ${date(n.date).split(" ")[0]} night` : ""}`;

/** Aurora arcs over a horizon, in the verdict's colour; a cloud drifts over them when clouds are the problem. */
function Glyph({ tone, cloudy }: { tone: Tone; cloudy: boolean }) {
  return (
    <svg viewBox="0 0 72 72" className={`size-16 shrink-0 sm:size-20 ${TONE[tone].text}`} aria-hidden>
      <path d="M8 50c10-22 46-22 56 0" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.95" />
      <path d="M14 42c9-15 35-15 44 0" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />
      <path d="M21 35c7-8 23-8 30 0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
      <path d="M4 58h64" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" />
      {cloudy && (
        <path d="M30 60h28a9 9 0 0 0 0-18 13 13 0 0 0-24-2 9 9 0 0 0-4 20Z" fill="var(--color-cloud)" stroke="var(--color-bg)" strokeWidth="2.5" />
      )}
    </svg>
  );
}

function Chip({ tone, href, children }: { tone?: Tone; href?: string; children: React.ReactNode }) {
  const cls = "inline-flex items-center gap-2 rounded-full border border-rule bg-bg/60 px-3 py-1.5 text-sm font-medium text-ink";
  const body = <>{tone && <span className={`size-2 shrink-0 rounded-full ${TONE[tone].dot}`} />}<span>{children}</span></>;
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} transition-colors hover:border-great/50`}>{body}</a>
  ) : (
    <span className={cls}>{body}</span>
  );
}

/** The big number with its glyph: the chance, coloured by its label; a cloud over the arcs when clouds are the limit. */
function Chance({ value, cloudy }: { value: number; cloudy: boolean }) {
  const { label, tone } = scoreLabel(value);
  return (
    <div className="mt-3 flex items-center gap-4 sm:gap-6">
      <Glyph tone={tone} cloudy={cloudy} />
      <p className="flex items-start leading-none" aria-label={`Chance ${value}: ${label}`}>
        <span className="font-display text-[5.5rem] font-extrabold tracking-tight tabular-nums sm:text-[7rem]">{value}</span>
        <span className={`mt-2 ml-1 font-display text-3xl font-bold sm:text-4xl ${TONE[tone].text}`}>%</span>
      </p>
    </div>
  );
}

/** Kp, clouds and the dark hours, coloured like the reference's high/low line. */
function Facts({ kpValue, cloud, dark }: { kpValue: number; cloud: number | null; dark: string | null }) {
  return (
    <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.95rem]">
      <span className="text-great"><Term k="kp">Kp</Term> {kp(kpValue)}</span>
      <span className="text-cloud">Clouds {pct(cloud)}%</span>
      {dark && <span className="text-muted">{dark}</span>}
    </p>
  );
}

/** Tonight at one spot, as the text either side of the spot picker. */
function spotTonight(spot: Spot, night: Night): [React.ReactNode, React.ReactNode] {
  if (night.peak >= 15) return [<>Best <b className={B}>{windowOf(night)}</b> at </>, null];
  if (night.limit === "clouds") return ["Clouds will likely hide the sky at ", " tonight."];
  return ["Too little activity for ", <> tonight: this spot needs about <Term k="kp">Kp</Term> {spot.minKp}+.</>];
}

export function Hero({ data }: { data: AuroraData }) {
  const { now, tonight, bestNow, v, later, target, where } = recommend(data);
  const nextActive = outlookHighlights(data.outlook)[0];
  const alert = ALERT[data.now.alert];
  // The alert is about solar activity; say so when darkness or clouds stand in the way.
  const caveats = alert.tone === "low" ? [] : [
    data.now.sunAlt > -6 && "once dark",
    data.now.cloudCity >= 70 && "if the clouds clear",
  ].filter(Boolean);
  const dark = data.now.dark
    ? data.now.sunAlt < -12 ? `Dark until ${time(data.now.dark.end)}` : `Dark ${time(data.now.dark.start)}–${time(data.now.dark.end)}`
    : null;

  // Left card body below the title: the big number, the sentence, the facts and the directions chip.
  let figure: React.ReactNode;
  let sentence: React.ReactNode;
  let facts: React.ReactNode;
  let go: React.ReactNode = null;
  if (tonight && (v === "tonight" || v === "maybe")) {
    // Tonight at each spot; the spot picked in the sentence drives the number, the facts, the chip and the chart.
    const views = data.spots.flatMap((s) => {
      const n = s.nights.find((x) => x.date === tonight.date);
      return n ? [{ id: s.id, s, n }] : [];
    });
    const by = (f: (s: Spot, n: Night) => React.ReactNode) => <BySpot views={Object.fromEntries(views.map(({ id, s, n }) => [id, f(s, n)]))} />;
    const text = Object.fromEntries(views.map(({ id, s, n }) => [id, spotTonight(s, n)]));
    figure = by((_, n) => <Chance value={n.peak} cloudy={n.limit === "clouds" && n.peak < 35} />);
    // The picker stays outside the switching text, so it keeps focus while you change it.
    sentence = (
      <>
        <BySpot views={Object.fromEntries(Object.entries(text).map(([id, [before]]) => [id, before]))} />
        <SpotSelect />
        <BySpot views={Object.fromEntries(Object.entries(text).map(([id, [, after]]) => [id, after]))} />
      </>
    );
    facts = by((_, n) => <Facts kpValue={n.kp} cloud={n.cloud} dark={dark} />);
    go = by((s) => <Chip href={directionsUrl(null, s)}>Directions to {s.name.split(" · ")[0]} <Arrow /></Chip>);
  } else if (v === "now") {
    figure = <Chance value={bestNow.now} cloudy={false} />;
    sentence = <>Auroras are likely right now. Head to <b className={B}>{bestNow.name}</b> and look north.</>;
    facts = <Facts kpValue={data.now.effectiveKp} cloud={bestNow.cloud} dark={dark} />;
    go = <Chip href={directionsUrl(null, bestNow)}>Directions to {bestNow.name.split(" · ")[0]} <Arrow /></Chip>;
  } else {
    figure = <Chance value={tonight?.peak ?? 0} cloudy={v !== "bright" && tonight?.limit === "clouds"} />;
    if (v === "bright") {
      sentence = <>Oulu nights are too light right now. Aurora season runs from late August to mid-April.</>;
    } else {
      const why = tonight?.limit === "clouds" ? "Clouds will cover the sky" : "Solar activity is too low to reach Oulu";
      sentence = (
        <>{why}.{" "}
          {later ? <>Better chance <b className={B}>{nightLabel(later.date, now).toLowerCase()}</b>, {time(later.start)}–{time(later.end)}.</>
            : nextActive ? <>Next active days expected around <b className={B}>{date(nextActive.from)}</b> (Kp {nextActive.kp}).</>
            : null}
        </>
      );
    }
    facts = tonight && <Facts kpValue={tonight.kp} cloud={tonight.cloud} dark={dark} />;
    if (where && target) go = <Chip href={directionsUrl(null, where)}>{nightLabel(target.date, now)}: {where.name.split(" · ")[0]} <Arrow /></Chip>;
  }

  return (
    <header className="pt-8 sm:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-[0.12em] text-muted uppercase sm:text-sm">
            {coord(OULU.lat, "N", "S")} · {coord(OULU.lon, "E", "W")} · Foxlight Aurora
          </p>
          <h1 className="mt-2 font-display text-[3.25rem] leading-[0.9] font-extrabold tracking-tight uppercase sm:text-7xl lg:text-[5.5rem]">
            Oulu northern lights
          </h1>
        </div>
        <p className="font-mono text-xs leading-relaxed text-muted sm:text-right sm:text-sm">
          Updated <b className="font-semibold text-ink">{day(data.generatedAt)}, {time(data.generatedAt)}</b>
          <br />
          Times in Oulu ({tzName(data.generatedAt)})
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section aria-labelledby="verdict" className="flex flex-col rounded-2xl border border-rule bg-tile p-6 sm:p-7">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">{LABEL[v]}</p>
          {figure}
          <p id="verdict" role="status" className="mt-3 font-display text-3xl leading-none font-bold tracking-wide uppercase sm:text-4xl">
            {TITLE[v]}
          </p>
          <p className="mt-2 text-lg leading-relaxed text-muted">{sentence}</p>
          {facts}
          <div className="mt-5 flex flex-wrap gap-2">
            <Chip tone={alert.tone}>
              {alert.text}
              {caveats.length > 0 && <span className="font-normal text-muted"> ({caveats.join(", ")})</span>}
            </Chip>
            {go}
          </div>
        </section>

        <Tiles data={data} />
      </div>
    </header>
  );
}
