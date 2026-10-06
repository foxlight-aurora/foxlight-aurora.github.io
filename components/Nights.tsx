import type { AuroraData } from "@/lib/data";
import { nightLabel, nightOf } from "@/lib/forecast";
import { date } from "@/lib/format";
import { NightsChart, type NightView } from "./NightsChart";
import { BySpot, SpotSelect } from "./SpotChoice";
import { Term } from "./Term";

export function Nights({ data }: { data: AuroraData }) {
  const now = new Date(data.generatedAt);

  // The next three nights at each spot; the picked spot's are shown.
  const views = data.spots.map((s) => {
    const nights: NightView[] = s.nights.slice(0, 3).map((n) => ({
      date: n.date,
      label: nightLabel(n.date, now).replace(/ night$/, ""),
      // The evening the night starts on (after midnight, "Tonight" is still the previous evening's night).
      day: date(n.date),
      peak: n.peak,
      start: n.start,
      end: n.end,
      limit: n.limit,
      minKp: s.minKp,
      hours: s.hours
        .filter((h) => nightOf(h.time) === n.date && h.sunAlt < -6)
        .map(({ time, score, kp, cloud }) => ({ time, score, kp, cloud })),
    }));
    return [s.id, nights.some((n) => n.hours.length) ? <NightsChart key={s.id} nights={nights} now={data.generatedAt} /> : null] as const;
  });
  if (!views.some(([, v]) => v)) return null;

  return (
    <section id="nights" aria-labelledby="nights-h" className="mt-4 rounded-2xl border border-rule bg-tile p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="nights-h" className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">
          Next 3 nights at <span className="tracking-normal normal-case"><SpotSelect /></span>
        </h2>
        <p className="flex items-center gap-4 text-sm text-muted">
          <span className="flex items-center gap-2"><span className="size-3 rounded-sm bg-great" /><Term k="chance">Chance</Term></span>
          <span className="flex items-center gap-2"><span className="size-3 rounded-sm bg-cloud" /><Term k="clouds">Clouds</Term></span>
        </p>
      </div>
      <div className="mt-4">
        <BySpot views={Object.fromEntries(views)} />
      </div>
    </section>
  );
}
