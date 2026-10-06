import type { AuroraData } from "@/lib/data";
import { kp, time, TONE } from "@/lib/format";
import type { TermKey } from "@/lib/glossary";
import { CITY_KP, DARK_KP, kpAlert, type KpAlert, type Tone } from "@/lib/oulu";
import { BySpot } from "./SpotChoice";
import { Term } from "./Term";

const KP_TONE: Record<KpAlert, Tone> = { city: "great", "dark-sky": "good", quiet: "low" };
const KP_STATUS: Record<KpAlert, string> = { city: "Strong for Oulu", "dark-sky": "Good for dark spots", quiet: "Quiet for Oulu" };
const LEVEL = { none: ["None", "low", "No auroral activity"], medium: ["Medium", "good", "Weak auroras likely"], high: ["High", "great", "Strong auroras likely"] } as const;

type Bar = { frac: number; tone: Tone; marks?: number[] };
type Tile = {
  label: string;
  term: TermKey;
  /** Where the reading applies: the whole region, the Oulu area, or the picked spot. */
  scope: string;
  value: React.ReactNode;
  unit?: string;
  bar?: Bar;
  icon?: React.ReactNode;
  status: string;
  tone: Tone;
};
type Spot = AuroraData["spots"][number];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** A hairline gauge: the value fills from the left, ticks mark where it starts to matter. */
function Gauge({ frac, tone, marks = [] }: Bar) {
  return (
    <span className="relative mt-4 block h-1.5 rounded-full bg-line" aria-hidden>
      <span className={`absolute inset-y-0 left-0 rounded-full ${TONE[tone].bg}`} style={{ width: `${Math.max(3, clamp01(frac) * 100)}%` }} />
      {marks.map((m) => <span key={m} className="absolute -inset-y-1 w-px bg-muted/70" style={{ left: `${clamp01(m) * 100}%` }} />)}
    </span>
  );
}

/** Bz as an arrow: south (negative) points down, the direction that lets solar energy in. */
function BzArrow({ bz }: { bz: number }) {
  return (
    <svg viewBox="0 0 40 40" className="size-10 shrink-0" aria-hidden>
      <circle cx="20" cy="20" r="18" fill="none" stroke="var(--color-line)" strokeWidth="2" />
      <g transform={bz < 0 ? "rotate(180 20 20)" : undefined} className={bz <= -5 ? "text-great" : bz < 0 ? "text-good" : "text-muted"}>
        <path d="M20 30V11M13 17l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** Six live readings in a ruled 3×2 grid, each with a big figure, a gauge and one line of meaning. */
export function Tiles({ data }: { data: AuroraData }) {
  const n = data.now;
  const a = n.activity;
  // Why a value is missing: the source failed, or its latest reading was too old to show as "now".
  const missing = (id: string) => (data.sources.find((s) => s.id === id)?.status === "stale" ? "Data delayed" : "Unavailable");
  const live = n.stations.filter((s) => !s.stale);
  const rFrac = live.length ? Math.max(...live.map((s) => s.r / s.red)) : 0;
  const yellowMark = live.length ? Math.min(...live.map((s) => s.yellow / s.red)) : 0.35;
  const alert = kpAlert(n.kp);

  const short = (sp: Spot) => sp.name.split(" · ")[0];
  // Clouds and darkness differ by spot, so these two follow the spot picker.
  const cloudTile = (sp: Spot): Tile => ({
    label: "Cloud cover", term: "clouds", scope: short(sp), value: sp.cloud === null ? "–" : Math.round(sp.cloud), unit: "%",
    bar: sp.cloud === null ? undefined : { frac: sp.cloud / 100, tone: sp.cloud < 30 ? "great" : sp.cloud < 70 ? "maybe" : "low" },
    status: sp.cloud === null ? "Unavailable" : sp.cloud < 30 ? "Mostly clear" : sp.cloud < 70 ? "Partly cloudy" : "Cloudy",
    tone: sp.cloud === null ? "low" : sp.cloud < 30 ? "great" : sp.cloud < 70 ? "maybe" : "low",
  });
  const darkTile = (sp: Spot): Tile => ({
    label: "Darkness", term: "sunAlt", scope: short(sp),
    value: sp.dark ? (
      <span className="flex flex-col gap-1 text-[1.75rem] leading-none sm:text-[2rem]">
        <span>{sp.sunAlt < -12 ? "Dark now" : time(sp.dark.start)}</span>
        <span>{time(sp.dark.end)}</span>
      </span>
    ) : "–",
    status: sp.dark ? `${sp.sunAlt < -12 ? "Until dawn" : "Dark from, until"} · sun ${Math.round(sp.sunAlt)}°` : "No dark night now",
    tone: sp.sunAlt < -12 ? "great" : sp.sunAlt < -6 ? "maybe" : "low",
  });
  const perSpot = { clouds: cloudTile, darkness: darkTile };

  const tiles: (Tile | keyof typeof perSpot)[] = [
    {
      label: "Kp index", term: "kp", scope: "Global", value: kp(n.kp), unit: "/ 9",
      bar: { frac: n.kp / 9, tone: KP_TONE[alert], marks: [DARK_KP / 9, CITY_KP / 9] },
      status: KP_STATUS[alert], tone: KP_TONE[alert],
    },
    {
      label: "Local activity", term: "rIndex", scope: "Oulu area", value: a ? LEVEL[a.level][0] : "–",
      bar: a ? { frac: rFrac, tone: LEVEL[a.level][1], marks: [yellowMark] } : undefined,
      status: a ? `${LEVEL[a.level][2]} · ${time(a.time)}` : missing("rindex"), tone: a ? LEVEL[a.level][1] : "low",
    },
    "clouds",
    {
      label: "Solar wind", term: "solarWind", scope: "Global", value: n.speed === null ? "–" : Math.round(n.speed), unit: "km/s",
      bar: n.speed === null ? undefined : { frac: n.speed / 800, tone: n.speed >= 600 ? "great" : n.speed >= 450 ? "good" : "low", marks: [450 / 800] },
      status: n.speed === null ? missing("wind") : n.speed >= 600 ? "Fast — powers strong auroras" : n.speed >= 450 ? "Elevated" : "Calm",
      tone: n.speed === null ? "low" : n.speed >= 600 ? "great" : n.speed >= 450 ? "good" : "low",
    },
    {
      label: "Bz", term: "bz", scope: "Global", value: n.bz === null ? "–" : n.bz.toFixed(1), unit: "nT",
      icon: n.bz === null ? undefined : <BzArrow bz={n.bz} />,
      status: n.bz === null ? missing("mag") : n.bz <= -5 ? "Strongly south — energy pouring in" : n.bz < 0 ? "South — energy gets in" : "North — energy mostly kept out",
      tone: n.bz === null ? "low" : n.bz <= -5 ? "great" : n.bz < 0 ? "good" : "low",
    },
    "darkness",
  ];

  return (
    <section aria-label="Live conditions" className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-3">
      {tiles.map((t) =>
        typeof t === "string" ? (
          <BySpot key={t} views={Object.fromEntries(data.spots.map((sp) => [sp.id, <TileView key={sp.id} t={perSpot[t](sp)} />]))} />
        ) : (
          <TileView key={t.label} t={t} />
        ),
      )}
    </section>
  );
}

function TileView({ t }: { t: Tile }) {
  return (
    <div className="flex min-w-0 flex-col bg-tile p-4 sm:p-5">
      <div>
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] whitespace-nowrap text-muted sm:text-xs">
          {/* Buttons don't inherit text-transform, so the caps go on the text itself. */}
          <Term k={t.term}><span className="uppercase">{t.label}</span></Term>
        </p>
        <p className="mt-1 truncate font-mono text-[0.65rem] tracking-[0.08em] text-faint uppercase">{t.scope}</p>
      </div>
      <div className="mt-3 flex items-center gap-3">
        {t.icon}
        <p className="flex items-baseline gap-1.5 font-display leading-none font-bold tabular-nums">
          <span className="text-[2.5rem] sm:text-5xl">{t.value}</span>
          {t.unit && <span className="text-lg text-muted sm:text-xl">{t.unit}</span>}
        </p>
      </div>
      {t.bar && <Gauge {...t.bar} />}
      <p className={`mt-auto pt-3 text-sm leading-snug ${t.tone === "low" ? "text-muted" : TONE[t.tone].text}`}>{t.status}</p>
    </div>
  );
}
