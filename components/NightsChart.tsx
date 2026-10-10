"use client";

import { useState } from "react";
import { hour, kp, time, TONE } from "@/lib/format";
import { scoreLabel } from "@/lib/oulu";

type HourView = { time: string; score: number; kp: number; cloud: number | null };
export type NightView = {
  date: string;
  label: string;
  day: string;
  peak: number;
  start: string;
  end: string;
  limit: "clouds" | "activity";
  minKp: number;
  hours: HourView[];
};

const GAP = 1.5; // hour-widths between nights
const MIN = 9; // a night already under way keeps at least this width, so its name fits on a phone
const pct = (c: number | null) => (c === null ? "?" : Math.round(c));

function summary(n: NightView) {
  if (n.peak >= 15) return `${n.label}: best ${time(n.start)}–${time(n.end)} · ${scoreLabel(n.peak).label} ${n.peak}`;
  if (n.limit === "clouds") return `${n.label}: cloudy — auroras hide behind clouds`;
  return `${n.label}: low activity — this spot needs about Kp ${n.minKp}+`;
}

/**
 * The next nights as one line-and-area chart of hourly chance (dark hours only, nights side by side), with cloud cover
 * as bars underneath. Hover, tap or arrow through the hours to read chance, Kp and clouds.
 */
export function NightsChart({ nights, now }: { nights: NightView[]; now: string }) {
  const [picked, setPicked] = useState<number | null>(null);

  // Lay every dark hour on one x axis, nights separated by a gap.
  const points: { x: number; h: HourView; night: number }[] = [];
  const spans: { from: number; to: number }[] = [];
  let x = 0;
  nights.forEach((n, k) => {
    if (k > 0) x += GAP;
    const from = x;
    // The hours already gone are blank space at the start of the night.
    x += Math.max(0, MIN - n.hours.length);
    n.hours.forEach((h) => points.push({ x: x++ + 0.5, h, night: k }));
    spans.push({ from, to: x });
  });
  const W = Math.max(x, 1);
  if (!points.length) return null;

  const at = (i: number) => points[i];
  const line = (k: number) => points.filter((p) => p.night === k).map((p) => `${p.x},${100 - p.h.score}`);
  const sel = picked === null ? null : at(picked);
  // Peak of each night, labelled on the curve.
  const peaks = nights.map((_, k) => points.filter((p) => p.night === k).reduce<(typeof points)[number] | null>((a, p) => (!a || p.h.score > a.h.score ? p : a), null));

  return (
    <div>
      <p className={`min-h-6 text-sm text-muted ${sel ? "font-mono" : ""}`} aria-live="polite">
        {sel ? (
          <>
            <span className="text-ink">{nights[sel.night].label} {time(sel.h.time)}</span>
            {" · "}<span className={TONE[scoreLabel(sel.h.score).tone].text}>{scoreLabel(sel.h.score).label} {sel.h.score}</span>
            {" · "}Kp {kp(sel.h.kp)} · <span className="text-cloud">clouds {pct(sel.h.cloud)}%</span>
          </>
        ) : (
          nights.map((n) => summary(n)).join("   ·   ")
        )}
      </p>

      <div className="relative mt-5 ml-9 sm:ml-11" onPointerLeave={(e) => e.pointerType === "mouse" && setPicked(null)}>
        {/* Chance plot */}
        <div className="relative h-44 sm:h-56">
          {[0, 25, 50, 75, 100].map((g) => (
            <span key={g} className="absolute inset-x-0 border-t border-line" style={{ top: `${100 - g}%` }} aria-hidden>
              <span className="absolute -top-2 -left-9 w-8 text-right font-mono text-[0.7rem] leading-none text-faint sm:-left-11 sm:w-10">{g}</span>
            </span>
          ))}
          <svg viewBox={`0 0 ${W} 100`} preserveAspectRatio="none" className="chart-reveal absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id="chance-fill" x1="0" x2="0" y1="0" y2="1">
                {/* The curtain's own light: mint at the edge fading through violet. */}
                <stop offset="0" stopColor="var(--color-great)" stopOpacity="0.4" />
                <stop offset="0.65" stopColor="rgb(139 92 246)" stopOpacity="0.12" />
                <stop offset="1" stopColor="rgb(139 92 246)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {spans.map((s, k) => {
              const pts = line(k);
              if (!pts.length) return null;
              const first = points.find((p) => p.night === k)!.x;
              const last = [...points].reverse().find((p) => p.night === k)!.x;
              return (
                <g key={k}>
                  <path d={`M${first},100 L${pts.join(" L")} L${last},100 Z`} fill="url(#chance-fill)" />
                  <path d={`M${pts.join(" L")}`} fill="none" stroke="var(--color-great)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </g>
              );
            })}
            {sel && <line x1={sel.x} x2={sel.x} y1={0} y2={100} stroke="var(--color-ink)" strokeOpacity="0.5" vectorEffect="non-scaling-stroke" />}
          </svg>
          {/* Points and labels sit in HTML so they keep their shape at any width. */}
          {peaks.map((p) => p && (
            <span key={p.h.time} className="pointer-events-none absolute -translate-x-1/2" style={{ left: `${(p.x / W) * 100}%`, top: `${100 - p.h.score}%` }}>
              <span className="absolute left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-great" />
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-xs font-semibold text-ink">{p.h.score}</span>
            </span>
          ))}
          {sel && (
            <span className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-ink"
              style={{ left: `${(sel.x / W) * 100}%`, top: `${100 - sel.h.score}%` }} />
          )}
        </div>

        {/* Cloud cover, like a rain-chance strip */}
        <div className="relative mt-2 h-8" aria-hidden>
          <span className="absolute top-1/2 -left-9 w-8 -translate-y-1/2 text-right font-mono text-[0.65rem] leading-none text-cloud sm:-left-11 sm:w-10">cloud</span>
          {points.map((p, i) => (
            <span key={p.h.time} className="absolute bottom-0 rounded-sm bg-cloud transition-opacity"
              style={{ left: `${((p.x - 0.4) / W) * 100}%`, width: `${(0.8 / W) * 100}%`, height: `${Math.max(4, p.h.cloud ?? 50)}%`, opacity: picked === null || picked === i ? 0.55 : 0.25 }} />
          ))}
        </div>

        {/* Hours and night names */}
        <div className="relative mt-2 h-4 font-mono text-[0.7rem] text-faint" aria-hidden>
          {points.map((p, i) => {
            const first = i === 0 || points[i - 1].night !== p.night;
            return (first || Number(hour(p.h.time)) % 3 === 0) && (
              <span key={p.h.time} className={`absolute -translate-x-1/2 ${first ? "" : "hidden sm:block"}`} style={{ left: `${(p.x / W) * 100}%` }}>
                {i === 0 && Date.parse(p.h.time) <= Date.parse(now) ? <span className="text-ink">Now</span> : hour(p.h.time)}
              </span>
            );
          })}
        </div>
        <div className="relative mt-2 h-5" aria-hidden>
          {spans.map((s, k) => (
            // Each name stays inside its own night: the date shows only where it fits, and a name that still doesn't is cut short.
            <span key={k} className="@container absolute truncate border-t border-rule pt-1.5 text-xs font-semibold tracking-[0.12em] text-muted uppercase"
              style={{ left: `${(s.from / W) * 100}%`, width: `${((s.to - s.from) / W) * 100}%` }}>
              {nights[k].label} <span className="hidden font-normal tracking-normal text-faint normal-case @min-[9rem]:inline">{nights[k].day}</span>
            </span>
          ))}
        </div>

        {/* One target per hour: hover, tap, or tab and read */}
        <div className="absolute inset-x-0 top-0 h-44 sm:h-56">
          {points.map((p, i) => (
            <button key={p.h.time} type="button" className="absolute inset-y-0 focus:outline-none focus-visible:bg-ink/5"
              style={{ left: `${((p.x - 0.5) / W) * 100}%`, width: `${(1 / W) * 100}%` }}
              aria-label={`${nights[p.night].label} ${time(p.h.time)}: chance ${p.h.score}, Kp ${kp(p.h.kp)}, clouds ${pct(p.h.cloud)}%`}
              onPointerEnter={() => setPicked(i)} onFocus={() => setPicked(i)} onClick={() => setPicked(i)} />
          ))}
        </div>
      </div>
    </div>
  );
}
