import type { AuroraData } from "@/lib/data";
import { nightLabel, nightOf } from "@/lib/forecast";
import { date } from "@/lib/format";
import { NightColumns, type NightView } from "./NightColumns";
import { BySpot, SpotSelect } from "./SpotChoice";
import { Section } from "./ui";
import { Term } from "./Term";

export function Nights({ data }: { data: AuroraData }) {
  const now = new Date(data.generatedAt);

  // The next three nights at each spot; the picked spot's are shown.
  const views = data.spots.map((s) => {
    const nights: NightView[] = s.nights.slice(0, 3).map((n) => ({
      ...n,
      label: nightLabel(n.date, now).replace(/ night$/, ""),
      // The evening the night starts on (after midnight, "Tonight" is still the previous evening's night).
      day: date(n.date),
      minKp: s.minKp,
      hours: s.hours
        .filter((h) => nightOf(h.time) === n.date && h.sunAlt < -6)
        .map(({ time, score, kp, cloud }) => ({ time, score, kp, cloud })),
    }));
    return [s.id, nights.length ? <NightColumns key={s.id} nights={nights} /> : null] as const;
  });
  if (!views.some(([, v]) => v)) return null;

  return (
    <Section id="nights" title="Next nights" hint={<><Term k="chance">Hourly chance</Term> at <SpotSelect /> · <Term k="kp">Kp</Term> forecast × clouds × darkness</>}>
      <BySpot views={Object.fromEntries(views)} />
    </Section>
  );
}
