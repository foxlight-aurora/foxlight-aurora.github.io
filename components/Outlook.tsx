import type { AuroraData } from "@/lib/data";
import { outlookHighlights } from "@/lib/forecast";
import { date } from "@/lib/format";
import { LABEL, Section } from "./ui";
import { Term } from "./Term";

// Daily max Kp → cell colour: quiet days recede, active days glow in the scale's tones.
const CELL: Record<number, string> = {
  0: "text-faint", 1: "text-faint", 2: "text-muted",
  3: "bg-maybe/10 text-maybe", 4: "bg-good/15 text-good", 5: "bg-great/20 text-great",
};

export function Outlook({ data }: { data: AuroraData }) {
  const days = data.outlook;
  if (!days.length) return null;
  const highlights = outlookHighlights(days);
  const lead = (new Date(days[0].date).getUTCDay() + 6) % 7; // Monday-first calendar

  return (
    <Section id="outlook" title="Coming weeks" hint={<><Term k="outlook">NOAA 27-day outlook</Term> · max <Term k="kp">Kp</Term> per day</>}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="rounded-2xl border border-rule bg-tile p-5 sm:p-6">
          {highlights.length ? (
            <ul className="-mt-3 divide-y divide-rule">
              {highlights.map((h) => (
                <li key={h.from} className="flex items-baseline justify-between gap-4 py-3">
                  <span className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
                    {date(h.from)}{h.to !== h.from && ` – ${date(h.to)}`}
                  </span>
                  <span className={`font-mono text-sm ${h.kp >= 5 ? "text-great" : "text-good"}`}>Kp {h.kp}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-display text-2xl leading-tight font-bold tracking-wide uppercase">No stormy days expected</p>
          )}
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {highlights.length
              ? "Long-range outlooks follow the Sun’s 27-day rotation, so treat them as hints and check clouds on the day."
              : "Nothing above Kp 4 in the next four weeks. Kp 3 nights can still deliver from dark spots."}
          </p>
        </div>

        <div className="rounded-2xl border border-rule bg-tile p-4 sm:p-5">
          <div className="grid grid-cols-7 gap-1 text-center">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d} className={`pb-2 ${LABEL}`}>{d}</span>
            ))}
            {Array.from({ length: lead }, (_, i) => <span key={`pad${i}`} />)}
            {days.map((d) => (
              <div key={d.date} title={`${date(d.date)} · Kp ${d.kp}${d.shortRange ? " · 3-day forecast" : ""}`}
                className={`rounded-lg py-2 ${CELL[Math.min(d.kp, 5)]} ${d.shortRange ? "ring-1 ring-line ring-inset" : ""}`}>
                <span className="block font-display text-xl leading-none font-bold tabular-nums sm:text-2xl">{Number(d.date.slice(8))}</span>
                <span className="mt-1 block font-mono text-[0.7rem] whitespace-nowrap">Kp {d.kp}</span>
              </div>
            ))}
          </div>
          {days.some((d) => d.shortRange) && (
            <p className="mt-3 text-xs text-faint">Outlined days use NOAA&rsquo;s 3-day forecast and today&rsquo;s activity, which replace the weekly outlook as they come in.</p>
          )}
        </div>
      </div>
    </Section>
  );
}
