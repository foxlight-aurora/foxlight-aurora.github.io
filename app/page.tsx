import { Advanced } from "@/components/Advanced";
import { CookieSettings } from "@/components/Analytics";
import { AuroraFx } from "@/components/AuroraFx";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Hero, recommend } from "@/components/Hero";
import { Metrics } from "@/components/Metrics";
import { Nights } from "@/components/Nights";
import { Outlook } from "@/components/Outlook";
import { SpotChoiceProvider } from "@/components/SpotChoice";
import { Spots } from "@/components/Spots";
import { StaleBanner } from "@/components/StaleBanner";
import { Section } from "@/components/ui";
import { loadAuroraData } from "@/lib/load";
import { day, time } from "@/lib/format";
import { CITY_CENTRE, OULU, rankSpots } from "@/lib/oulu";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";

const TIPS = [
  ["Look north", "In Oulu the aurora usually starts as a pale arc low on the northern horizon."],
  ["Give it 20 minutes", "Eyes need time to adapt. Avoid your phone screen — or set it to red/night mode."],
  ["Use your camera", "Phones in night mode see faint aurora as green before your eyes do."],
  ["Peak hours", "Activity over Finland usually peaks between 22:00 and 02:00, but can flare up any time it's dark."],
  ["Dress for −20 °C", "Waiting is part of it. Layers, a hat, and something warm to drink."],
];

// Shown on the page and repeated in the FAQPage structured data below; the two must stay identical.
const FAQ = [
  [
    "Can you see the northern lights in Oulu?",
    "Yes. Oulu is at 65°N, near the edge of the auroral oval, and FMI counts auroras on about one in four clear, dark nights here between late August and mid-April. From around Kp 3 there is a fair chance at dark spots outside the city; the city centre usually needs Kp 5.",
  ],
  [
    "When is the best time to see the aurora in Oulu?",
    "The season runs from late August to mid-April; in summer the nights are too light. Activity over Finland usually peaks between 22:00 and 02:00, but auroras can appear whenever it is dark and clear. The forecast above shows the best window for the next three nights.",
  ],
  [
    "Where are the best places to see the northern lights near Oulu?",
    "Somewhere dark with an open view to the north. Nallikari beach and the northern tip of Hietasaari work on good nights; for fainter displays go further out, to Virpiniemi, Sanginjoki or Hailuoto (Marjaniemi). The list above ranks them for tonight.",
  ],
  [
    "How does this forecast work?",
    "It combines NOAA's Kp forecast and real-time solar wind with FMI's local auroral activity (R-index), the FMI cloud forecast and the position of the sun into a chance for each viewing spot, refreshed several times an hour. It is a forecast, not a promise.",
  ],
];

function structuredData(generatedAt: string) {
  const graph = [
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: SITE_NAME, description: SITE_DESCRIPTION, inLanguage: "en" },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#page`,
      url: `${SITE_URL}/`,
      name: SITE_TITLE,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@type": "Place", name: "Oulu, Finland", geo: { "@type": "GeoCoordinates", latitude: OULU.lat, longitude: OULU.lon } },
      dateModified: generatedAt,
      inLanguage: "en",
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];
  // Escape "<" so no string can close the script tag.
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}

export default function Home() {
  const data = loadAuroraData();
  // Spots for the picker, best first; it starts at the spot the hero recommends.
  const spotOptions = rankSpots(data.spots, CITY_CENTRE, "chance").map(({ id, name }) => ({ id, name }));
  const spot = recommend(data).where?.id ?? spotOptions[0].id;
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData(data.generatedAt) }} />
    <AuroraFx kp={data.now.effectiveKp} />
    <main className="relative z-[1] mx-auto max-w-3xl px-4 pb-20 sm:px-6">
      <AutoRefresh generatedAt={data.generatedAt} />
      <StaleBanner generatedAt={data.generatedAt} />
      <SpotChoiceProvider initial={spot} options={spotOptions}>
        <Hero data={data} />
        <Nights data={data} />
      </SpotChoiceProvider>
      {/* The per-spot hours only feed "Next nights"; keep them out of this client component. */}
      <Spots spots={data.spots.map((s) => ({ ...s, hours: undefined, nights: undefined }))} dark={data.now.sunAlt < -6} />
      <Metrics data={data} />
      <Outlook data={data} />

      <Section id="tips" title="First time?">
        <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {TIPS.map(([t, d]) => (
            <li key={t}>
              <p className="font-medium">{t}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="faq" title="Northern lights in Oulu">
        <div className="divide-y divide-line rounded-2xl border border-line bg-surface/70">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex items-baseline justify-between gap-4">
                <h3 className="font-medium">{q}</h3>
                <span aria-hidden className="shrink-0 text-faint transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </Section>

      <Advanced data={data} />

      <footer className="mt-16 border-t border-line pt-6 text-xs leading-relaxed text-faint">
        <p className="mb-3 text-muted">
          Why Foxlight? In Finnish the aurora is <i lang="fi">revontulet</i> — &ldquo;fox fires&rdquo; — after the Arctic fox
          whose tail sweeps sparks from the snow into the sky.
        </p>
        <p>
          Updated {day(data.generatedAt)} {time(data.generatedAt)} (Oulu time) · refreshed several times an hour.
        </p>
        <p className="mt-1">
          Data:{" "}
          <a className="underline underline-offset-4 hover:text-muted" href="https://en.ilmatieteenlaitos.fi/auroras-in-finland">FMI</a>,{" "}
          <a className="underline underline-offset-4 hover:text-muted" href="https://rwc-finland.fmi.fi/">RWC Finland</a>,{" "}
          <a className="underline underline-offset-4 hover:text-muted" href="https://www.swpc.noaa.gov/">NOAA SWPC</a>.
          A forecast, not a promise — the aurora is famously unpredictable.
        </p>
        <p className="mt-1">
          An independent, non-commercial project — not affiliated with FMI or NOAA. No sign-up. We use Google Analytics for
          website statistics only if you allow it. You can change your mind any time in <CookieSettings />. A starting point you search for is looked up on
          OpenStreetMap and saved only in your browser.
        </p>
        <p className="mt-1">
          © 2026 Abhishek Singh Sambyal. Licensed under the{" "}
          <a className="underline underline-offset-4 hover:text-muted" href="https://www.gnu.org/licenses/gpl-3.0.html">
            GNU GPLv3
          </a>
          .
        </p>
      </footer>
    </main>
    </>
  );
}
