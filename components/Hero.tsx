import type { AuroraData } from "@/lib/data";
import { nightLabel, outlookHighlights, verdict, type Night, type Verdict } from "@/lib/forecast";
import { date, day, kp, time, TONE } from "@/lib/format";
import { directionsUrl } from "@/lib/oulu";
import { BySpot, SpotSelect } from "./SpotChoice";
import { Score } from "./ui";
import { Term } from "./Term";

type Spot = AuroraData["spots"][number];

const TITLE: Record<Verdict, string> = {
  now: "Go out now",
  tonight: "Good chance tonight",
  maybe: "Maybe tonight",
  unlikely: "Unlikely tonight",
  bright: "Too bright for auroras",
};

const HEAD_COLOR: Record<Verdict, string> = {
  now: "text-great",
  tonight: "text-great",
  maybe: "text-maybe",
  unlikely: "text-ink",
  bright: "text-ink",
};

const ALERT = {
  city: { text: "Good chance even from the city centre", tone: "great" },
  "dark-sky": { text: "Good chance at dark spots around Oulu", tone: "good" },
  quiet: { text: "Quiet — auroras rarely reach Oulu at this level", tone: "low" },
} as const;

const SUB = "mt-0.5 block text-xs font-normal text-muted";
const B = "font-medium text-ink";
const pct = (c: number | null) => (c === null ? "?" : Math.round(c));

/** The hero's answer: the verdict, tonight, the window it points to and where to go. */
export function recommend(data: AuroraData) {
  const now = new Date(data.generatedAt);
  const tonight = data.nights.find((n) => nightLabel(n.date, now) === "Tonight") ?? data.nights[0] ?? null;
  const bestNow = data.spots.reduce((a, b) => (b.now > a.now ? b : a));
  const v = verdict({ nowScore: bestNow.now, sunAlt: data.now.sunAlt, tonight });
  const later = data.nights.find((n) => n !== tonight && n.peak >= 15);
  // The window the When/Where/Chance row describes: now, tonight, or the next good night.
  const target = v === "now" ? null : tonight && tonight.peak >= 15 ? tonight : (later ?? null);
  const where = v === "now" ? bestNow : target ? data.spots.find((s) => s.id === target.spotId)! : null;
  return { now, tonight, bestNow, v, later, target, where };
}

/** "Sat 4 Oct" + "05:00–07:00"; a window starting after midnight belongs to the previous evening's night (as in "Next nights"). */
const windowOf = (n: Night) => ({
  date: day(n.start),
  time: `${time(n.start)}–${time(n.end)}${day(n.start) !== date(n.date) ? ` · ${date(n.date).split(" ")[0]} night` : ""}`,
});

function Cells(p: { when: { date: string; time: string } | null; where: Spot | null; score: number; chance: React.ReactNode }) {
  return [
    ["When", "When", p.when ? <>{p.when.date}<span className={SUB}>{p.when.time}</span></> : "–"],
    ["Where", "Where", p.where ? (
      <>
        {p.where.name.split(" · ")[0]}
        <a href={directionsUrl(null, p.where)} target="_blank" rel="noopener noreferrer"
          className="mt-0.5 block text-xs font-normal text-great/90 underline-offset-4 hover:underline">
          Directions →
        </a>
      </>
    ) : "–"],
    ["Chance", <Term key="t" k="chance">Chance</Term>, <><Score value={p.score} />{p.chance}</>],
  ].map(([key, label, val]) => (
    <div key={key as string} className="min-w-0 px-4 py-4 sm:px-5">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="mt-1 text-sm leading-snug font-medium sm:text-base">{val}</dd>
    </div>
  ));
}

const kpAndClouds = (n: { kp: number; cloud: number | null }) => (
  <span className={SUB}><Term k="kp">Kp</Term> {kp(n.kp)} · clouds {pct(n.cloud)}%</span>
);

/** Tonight at one spot, as the text either side of the spot picker. */
function spotTonight(spot: Spot, night: Night): [React.ReactNode, React.ReactNode] {
  if (night.peak >= 15) {
    return [
      <>Best between <b className={B}>{time(night.start)}</b> and <b className={B}>{time(night.end)}</b> at </>,
      <>. Expected <Term k="kp">Kp</Term> {kp(night.kp)}, clouds {pct(night.cloud)}%.</>,
    ];
  }
  if (night.limit === "clouds") return ["At ", <>, clouds will likely hide the sky tonight ({pct(night.cloud)}%).</>];
  return ["At ", <>, activity is too low tonight: expected <Term k="kp">Kp</Term> {kp(night.kp)}, this spot needs about Kp {spot.minKp}.</>];
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

  let detail: React.ReactNode;
  let cells: React.ReactNode;
  if (v === "now") {
    detail = <>Auroras are likely right now. Head to <b className={B}>{bestNow.name}</b> and look north.</>;
    cells = (
      <Cells when={{ date: day(data.generatedAt), time: `Now – ${data.now.dark ? time(data.now.dark.end) : "dawn"}` }} where={bestNow}
        score={bestNow.now} chance={data.now.driver === "fmi" && data.now.activity ? (
          <span className={SUB}><Term k="rIndex">Local activity</Term>: {data.now.activity.level} · clouds {pct(bestNow.cloud)}%</span>
        ) : kpAndClouds({ kp: data.now.effectiveKp, cloud: bestNow.cloud })} />
    );
  } else if (tonight && (v === "tonight" || v === "maybe")) {
    // Tonight's window at each spot; the spot picked in the sentence drives the sentence, the row and "Next nights".
    const views = data.spots.flatMap((s) => {
      const n = s.nights.find((x) => x.date === tonight.date);
      return n ? [{ id: s.id, s, n }] : [];
    });
    const text = views.map(({ id, s, n }) => [id, spotTonight(s, n)] as const);
    // The picker stays outside the switching text, so it keeps focus while you change it.
    detail = (
      <>
        <BySpot views={Object.fromEntries(text.map(([id, [before]]) => [id, before]))} />
        <SpotSelect />
        <BySpot views={Object.fromEntries(text.map(([id, [, after]]) => [id, after]))} />
      </>
    );
    cells = (
      <BySpot views={Object.fromEntries(views.map(({ id, s, n }) => [id,
        <Cells key={id} when={n.peak >= 15 ? windowOf(n) : null} where={s} score={n.peak} chance={kpAndClouds(n)} />,
      ]))} />
    );
  } else {
    if (v === "bright") {
      detail = <>Oulu nights are too light right now. Aurora season runs from late August to mid-April.</>;
    } else {
      const why = tonight?.limit === "clouds" ? "Clouds will cover the sky" : "Solar activity is too low to reach Oulu";
      detail = (
        <>{why}.{" "}
          {later ? <>Better chance <b className={B}>{nightLabel(later.date, now).toLowerCase()}</b>, {time(later.start)}–{time(later.end)}.</>
            : nextActive ? <>Next active days expected around <b className={B}>{date(nextActive.from)}</b> (Kp {nextActive.kp}).</>
            : null}
        </>
      );
    }
    const basis = target ?? tonight;
    cells = (
      <Cells when={target ? windowOf(target) : null} where={where} score={basis?.peak ?? 0} chance={basis && kpAndClouds(basis)} />
    );
  }

  return (
    <header className="pt-10 sm:pt-16">
      <h1 className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
        Foxlight Aurora <span className="text-faint">· Northern lights forecast for Oulu</span>
      </h1>
      <p role="status" className={`mt-4 text-5xl font-semibold tracking-tight text-balance sm:text-6xl ${HEAD_COLOR[v]}`}>
        {TITLE[v]}
      </p>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">{detail}</p>

      {target && target !== tonight && <p className="mt-8 mb-2 text-xs text-faint">Next good window</p>}
      <dl className={`${target && target !== tonight ? "" : "mt-8"} grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-surface/70`}>
        {cells}
      </dl>

      <p className="mt-4 inline-block rounded-2xl border border-line bg-bg px-3 py-1.5 text-xs leading-relaxed text-muted">
        <span className={`mr-2 inline-block size-1.5 rounded-full align-middle ${TONE[alert.tone].dot}`} />
        {data.now.driver === "fmi" && data.now.activity ? (
          <Term k="rIndex" icon><span className="text-ink">Local activity: {data.now.activity.level}</span></Term>
        ) : (
          <Term k="kp" icon><span className="font-mono text-ink tabular-nums">Kp {kp(data.now.effectiveKp)}</span></Term>
        )}{" "}
        {alert.text}
        {caveats.length > 0 && <span className="text-faint"> ({caveats.join(", ")})</span>}
      </p>
    </header>
  );
}
