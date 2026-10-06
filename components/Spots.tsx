"use client";

import { useState, useSyncExternalStore } from "react";
import type { AuroraData } from "@/lib/data";
import { date, time, TONE } from "@/lib/format";
import { CITY_CENTRE, directionsUrl, rankSpots, scoreLabel, type RankMode } from "@/lib/oulu";
import { useSpotChoice } from "./SpotChoice";
import { Arrow, Card, LABEL, Section } from "./ui";
import { Term } from "./Term";

type Origin = { name: string; lat: number; lon: number };

const SKY: Record<number, string> = { 3: "Dark sky · Kp 3+", 4: "Semi-dark · Kp 4+", 5: "City lights · Kp 5+" };
const STORE = "foxlight:origin";

async function geocode(q: string): Promise<Origin | null> {
  // OpenStreetMap Nominatim, biased to the Oulu region. One request per search, as their policy asks.
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=fi&viewbox=24.4,65.4,26.3,64.7&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error(String(res.status));
  const [hit] = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return hit ? { name: hit.display_name.split(",").slice(0, 2).join(","), lat: Number(hit.lat), lon: Number(hit.lon) } : null;
}

const noSubscribe = () => () => {};
const readSaved = () => {
  try {
    return localStorage.getItem(STORE);
  } catch {
    return null;
  }
};

/** A saved origin, or null if missing or unreadable (e.g. hand-edited or left by an older version). */
const parseSaved = (raw: string | null): Origin | null => {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    return typeof o?.name === "string" && Number.isFinite(o.lat) && Number.isFinite(o.lon) ? o : null;
  } catch {
    return null;
  }
};

export function Spots({ spots, dark }: { spots: Omit<AuroraData["spots"][number], "hours" | "nights">[]; dark: boolean }) {
  // Origin remembered from a previous visit (read after hydration; the server always renders the city centre).
  const saved = useSyncExternalStore(noSubscribe, readSaved, () => null);
  const [picked, setPicked] = useState<Origin | null>(null);
  const origin: Origin = picked ?? parseSaved(saved) ?? CITY_CENTRE;
  const [mode, setMode] = useState<RankMode>("chance");
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const choose = (o: Origin | null) => {
    const next = o ?? CITY_CENTRE;
    setPicked(next);
    setMsg(null);
    try {
      if (o) localStorage.setItem(STORE, JSON.stringify(o));
      else localStorage.removeItem(STORE);
    } catch {}
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setMsg("Searching…");
    try {
      const hit = await geocode(query);
      if (hit) {
        choose(hit);
        setMode("nearest");
      } else setMsg("Couldn't find that place. Try an area or landmark, e.g. “Nallikari” or “Tuira”.");
    } catch {
      setMsg("Place search is unavailable right now.");
    }
    setBusy(false);
  };

  const locate = () => {
    if (!navigator.geolocation) return setMsg("Location isn't available in this browser.");
    setMsg("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        choose({ name: "Your location", lat: p.coords.latitude, lon: p.coords.longitude });
        setMode("nearest");
      },
      () => setMsg("Couldn't get your location. Check the browser's permission."),
      { timeout: 10000, maximumAge: 600000 },
    );
  };

  const ranked = rankSpots(spots, origin, mode);
  const isDefault = origin.name === CITY_CENTRE.name;
  const pick = useSpotChoice();

  // Picking a spot here drives the forecast at the top, so take the reader there.
  const show = (id: string) => {
    pick.choose(id);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
  };

  return (
    <Section id="spots" title="Where to go" hint="Always face north">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={search} className="flex flex-1 gap-2 lg:max-w-md">
            <label htmlFor="addr" className="sr-only">Starting point</label>
            <input
              id="addr"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Start from, e.g. Tuira"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-full border border-rule bg-bg px-4 py-2 font-mono text-sm placeholder:text-faint focus:border-great/50 focus:outline-none"
            />
            <button type="submit" disabled={busy}
              className="rounded-full border border-rule px-4 text-sm font-medium transition-colors hover:border-great/50 disabled:opacity-50">
              Find
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-sm">
            <p className="text-muted">
              From <span className="text-ink">{origin.name}</span>
              {!isDefault && (
                <button onClick={() => choose(null)} className="ml-2 text-faint underline underline-offset-4 hover:text-muted">
                  reset
                </button>
              )}
              <span className="mx-2 text-faint">·</span>
              <button onClick={locate} className="text-great underline-offset-4 hover:underline">Use my location</button>
            </p>
            <div role="radiogroup" aria-label="Sort spots" className="flex rounded-full border border-rule p-0.5">
              {(["chance", "nearest"] as const).map((m) => (
                <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${mode === m ? "bg-line text-ink" : "text-muted hover:text-ink"}`}>
                  {m === "chance" ? "Best chance" : "Nearest"}
                </button>
              ))}
            </div>
          </div>
        </div>
        {msg && <p className="mt-3 text-sm text-maybe" aria-live="polite">{msg}</p>}
      </Card>

      {/* One ruled table: details on the left, the three figures and the picker on the right (stacked on phones). */}
      <div className="mt-3 grid gap-px overflow-hidden rounded-2xl border border-rule bg-rule">
        <div className={`hidden bg-tile px-6 py-3 lg:grid ${ROW} ${LABEL}`} aria-hidden>
          <span>Spot</span><span>Now</span><span>Best, 3 nights</span><span>Clouds</span><span />
        </div>
        {ranked.map((s) => {
          const picked = pick.id === s.id;
          return (
            <article key={s.id} aria-label={s.name} className={`p-5 sm:px-6 lg:grid lg:items-center ${ROW} ${picked ? "bg-surface" : "bg-tile"}`}>
              <div className="min-w-0">
                <div className="flex items-baseline gap-3">
                  <h3 className="font-display text-2xl leading-none font-bold tracking-wide uppercase sm:text-[1.7rem]">{s.name}</h3>
                  <span className="ml-auto font-mono text-xs text-muted tabular-nums lg:ml-0">{s.distanceKm} km</span>
                </div>
                <p className="mt-2 font-mono text-xs text-muted"><Term k="spotKp">{SKY[s.minKp]}</Term></p>
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">{s.note}</p>
                <a href={directionsUrl(origin, s)} target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-great underline-offset-4 hover:underline">
                  Directions <Arrow />
                </a>
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-rule pt-4 lg:contents">
                <Figure label="Now">
                  {dark ? <Big value={s.now} /> : <span className="font-display text-2xl font-bold text-muted uppercase">Daylight</span>}
                </Figure>
                <Figure label="Best, 3 nights">
                  {s.best ? <Big value={s.best.peak} /> : "–"}
                  {s.best && s.best.peak >= 15 && (
                    <span className="mt-1 block font-mono text-xs text-muted">{date(s.best.date).split(" ")[0]} {time(s.best.start)}–{time(s.best.end)}</span>
                  )}
                </Figure>
                <Figure label="Clouds">
                  <span className="font-display text-3xl leading-none font-bold text-cloud tabular-nums">
                    {s.cloud === null ? "–" : Math.round(s.cloud)}<span className="ml-0.5 text-lg">%</span>
                  </span>
                </Figure>
              </dl>

              <button type="button" onClick={() => show(s.id)} aria-pressed={picked}
                className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors lg:mt-0 ${
                  picked ? "border-great/40 bg-great/10 text-great" : "border-rule text-ink hover:border-great/50"
                }`}>
                {picked ? "Showing above" : "Show forecast"}
                <Arrow className="-rotate-90" />
              </button>
            </article>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-xs text-faint">
        Place search by OpenStreetMap. Your starting point is only kept in this browser.
      </p>
    </Section>
  );
}

const ROW = "lg:grid-cols-[minmax(0,1fr)_7rem_9rem_6rem_10rem] lg:gap-6";

/** A labelled figure: the label shows on phones; on wide screens the table head names the column. */
function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={`${LABEL} lg:sr-only`}>{label}</dt>
      <dd className="mt-2 lg:mt-0">{children}</dd>
    </div>
  );
}

/** A chance as a big number with its word, coloured by the label. */
function Big({ value }: { value: number }) {
  const { label, tone } = scoreLabel(value);
  return (
    <span className="block">
      <span className="font-display text-3xl leading-none font-bold tabular-nums">{value}</span>
      <span className={`mt-1 flex items-center gap-1.5 text-xs font-medium ${TONE[tone].text}`}>
        <span className={`size-1.5 rounded-full ${TONE[tone].dot}`} />{label}
      </span>
    </span>
  );
}
