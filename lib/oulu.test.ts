import { describe, expect, it } from "vitest";
import {
  auroraFactor,
  CITY_KP,
  DARK_KP,
  darknessFactor,
  kpAlert,
  rIndexKp,
  scoreLabel,
  sunAltitude,
  visibilityScore,
  OULU,
  CITY_CENTRE,
  rankSpots,
  directionsUrl,
  distanceKm,
} from "./oulu";

describe("sunAltitude (Oulu 65.01°N)", () => {
  it("is ~48° at summer-solstice solar noon", () => {
    expect(sunAltitude(new Date("2026-06-21T10:20:00Z"), OULU.lat, OULU.lon)).toBeCloseTo(48.4, 0);
  });
  it("barely clears the horizon at winter-solstice solar noon", () => {
    expect(sunAltitude(new Date("2026-12-21T10:20:00Z"), OULU.lat, OULU.lon)).toBeCloseTo(1.5, 0);
  });
  it("is ~-48° at winter-solstice solar midnight", () => {
    expect(sunAltitude(new Date("2026-12-21T22:20:00Z"), OULU.lat, OULU.lon)).toBeCloseTo(-48.4, 0);
  });
});

describe("kpAlert — Oulu thresholds", () => {
  it("is quiet below Kp 3+", () => {
    expect(kpAlert(2.33)).toBe("quiet");
    expect(kpAlert(3)).toBe("quiet");
  });
  it("flags dark spots from Kp 3+ (even chance there)", () => {
    expect(kpAlert(3.33)).toBe("dark-sky");
    expect(kpAlert(5)).toBe("dark-sky");
  });
  it("flags the city centre from Kp 5+", () => {
    expect(kpAlert(5.33)).toBe("city");
    expect(kpAlert(7)).toBe("city");
  });
});

describe("auroraFactor — calibrated to FMI (~25% of clear dark nights around Oulu)", () => {
  it("gives an even chance just above the spot's Kp", () => expect(auroraFactor(3.25, 3)).toBeCloseTo(0.5, 5));
  it("rises over about two Kp steps", () => {
    expect(auroraFactor(2.25, 3)).toBeCloseTo(0.12, 2);
    expect(auroraFactor(4.25, 3)).toBeCloseTo(0.88, 2);
  });
  it("keeps quiet Kp 2 nights unlikely even at dark spots", () => expect(auroraFactor(2.33, 3)).toBeLessThan(0.15));
  it("is near-certain at dark spots in a storm", () => expect(auroraFactor(5.67, 3)).toBeGreaterThan(0.99));
  it("is ~0 for the city on a quiet night", () => expect(auroraFactor(1, 5)).toBeLessThan(0.001));
});

describe("darknessFactor", () => {
  it("is 0 in daylight and civil twilight", () => {
    expect(darknessFactor(10)).toBe(0);
    expect(darknessFactor(-6)).toBe(0);
  });
  it("is 1 once the sun is 12° below the horizon", () => expect(darknessFactor(-15)).toBe(1));
  it("ramps linearly in between", () => expect(darknessFactor(-9)).toBe(0.5));
});

describe("visibilityScore", () => {
  it("is 0 when fully overcast", () =>
    expect(visibilityScore({ kp: 6, minKp: 3, cloud: 100, sunAlt: -30 })).toBe(0));
  it("is 0 in daylight", () =>
    expect(visibilityScore({ kp: 6, minKp: 3, cloud: 0, sunAlt: 5 })).toBe(0));
  it("is 100 for a strong storm, clear dark sky", () =>
    expect(visibilityScore({ kp: 6, minKp: 3, cloud: 0, sunAlt: -30 })).toBe(100));
  it("combines factors multiplicatively", () =>
    expect(visibilityScore({ kp: 3.25, minKp: 3, cloud: 40, sunAlt: -30 })).toBe(30));
  it("treats unknown cloud cover as 50%", () =>
    expect(visibilityScore({ kp: 6, minKp: 3, cloud: null, sunAlt: -30 })).toBe(50));
  // 4 Oct 2026, 21–22 at Nallikari (semi-dark): Kp 5.67 and a substorm; very good auroras were seen there.
  it("rates a Kp 5.67 storm night at Nallikari as great", () =>
    expect(scoreLabel(visibilityScore({ kp: 5.67, minKp: 4, cloud: 0, sunAlt: -18 })).label).toBe("Great"));
});

describe("scoreLabel", () => {
  it.each([
    [80, "Great"],
    [45, "Good"],
    [20, "Possible"],
    [5, "Unlikely"],
  ])("%i → %s", (s, label) => expect(scoreLabel(s).label).toBe(label));
});

describe("rIndexKp — FMI R-index → Kp-equivalent for Oulu", () => {
  // FMI thresholds: yellow = 50% chance of weak auroras, red = 50% chance of strong auroras (Oulujärvi 68 / 200)
  it("is 0 with no activity", () => expect(rIndexKp(0, 68, 200)).toBe(0));
  it("gives an even chance at dark spots on the yellow line (50% chance of weak auroras)", () => {
    expect(rIndexKp(68, 68, 200)).toBe(DARK_KP);
    expect(auroraFactor(rIndexKp(68, 68, 200), 3)).toBeCloseTo(0.5, 5);
  });
  it("gives an even chance in the city on the red line (50% chance of strong auroras)", () => {
    expect(rIndexKp(200, 68, 200)).toBe(CITY_KP);
    expect(auroraFactor(rIndexKp(200, 68, 200), 5)).toBeCloseTo(0.5, 5);
  });
  it("interpolates between the thresholds", () => expect(rIndexKp(134, 68, 200)).toBeCloseTo((DARK_KP + CITY_KP) / 2, 2));
  it("scales linearly below yellow", () => expect(rIndexKp(34, 68, 200)).toBeCloseTo(DARK_KP / 2, 2));
  it("caps at the red line's value above it", () => expect(rIndexKp(500, 68, 200)).toBe(CITY_KP));
});

describe("distanceKm", () => {
  it("measures Oulu city centre → Hailuoto Marjaniemi (~42 km)", () => {
    expect(distanceKm(CITY_CENTRE, { lat: 65.04, lon: 24.562 })).toBeCloseTo(42.4, 0);
  });
});

describe("rankSpots", () => {
  const spots = [
    { id: "far-dark", lat: 65.04, lon: 24.562, minKp: 3, best: { peak: 60 } },
    { id: "near-city", lat: 65.022, lon: 25.459, minKp: 5, best: { peak: 30 } },
    { id: "mid-dark", lat: 64.965, lon: 25.879, minKp: 3, best: { peak: 60 } },
    { id: "none", lat: 65.03, lon: 25.412, minKp: 4, best: null },
  ];

  it("adds rounded distances from the chosen origin", () => {
    const r = rankSpots(spots, CITY_CENTRE, "chance");
    expect(r.find((s) => s.id === "far-dark")!.distanceKm).toBe(42);
  });
  it("by chance: best peak first, then darker sky, then nearer", () => {
    expect(rankSpots(spots, CITY_CENTRE, "chance").map((s) => s.id)).toEqual(["mid-dark", "far-dark", "near-city", "none"]);
  });
  it("by distance: nearest first", () => {
    expect(rankSpots(spots, CITY_CENTRE, "nearest").map((s) => s.id)).toEqual(["near-city", "none", "mid-dark", "far-dark"]);
  });
  it("re-ranks for a different origin", () => {
    const hailuoto = { lat: 65.0, lon: 24.7 };
    expect(rankSpots(spots, hailuoto, "nearest")[0].id).toBe("far-dark");
  });
});

describe("directionsUrl", () => {
  it("routes between exact coordinates, which Google Maps always resolves", () => {
    expect(directionsUrl(CITY_CENTRE, { lat: 65.03, lon: 25.412 })).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=65.0135,25.4637&destination=65.03,25.412",
    );
  });
});

describe("directionsUrl without an origin", () => {
  it("lets Google Maps start from the viewer's current location", () => {
    expect(directionsUrl(null, { lat: 65.03, lon: 25.412 })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=65.03,25.412",
    );
  });
});
