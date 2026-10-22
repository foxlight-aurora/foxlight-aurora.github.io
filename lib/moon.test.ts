import { describe, expect, it } from "vitest";
import { moonAt, moonlight } from "./moon";
import { auroraFactor, moonlitKp, OULU } from "./oulu";

describe("moonAt", () => {
  // NASA JPL Horizons, the Moon seen from Oulu (65.01°N 25.47°E): altitude without refraction, illuminated %.
  const JPL = [
    ["2026-10-20T19:00:00Z", 7.99, 69.7],
    ["2026-10-23T10:00:00Z", -21.68, 90.64],
    ["2026-10-26T15:00:00Z", 8.32, 99.61],
    ["2026-10-31T21:00:00Z", 17.22, 60.66],
  ] as const;
  it.each(JPL)("matches JPL at %s", (iso, alt, illum) => {
    const m = moonAt(new Date(iso), OULU.lat, OULU.lon);
    expect(Math.abs(m.alt - alt)).toBeLessThan(0.3);
    expect(Math.abs(m.illum * 100 - illum)).toBeLessThan(1);
  });
});

describe("moonlight", () => {
  it("is zero with the moon down and full for a full moon well up", () => {
    expect(moonlight({ alt: -5, illum: 1 })).toBe(0);
    expect(moonlight({ alt: 40, illum: 1 })).toBeCloseTo(1, 5);
  });
  it("falls steeply with phase: a half moon lights the sky about a tenth as much", () => {
    expect(moonlight({ alt: 40, illum: 0.5 })).toBeGreaterThan(0.05);
    expect(moonlight({ alt: 40, illum: 0.5 })).toBeLessThan(0.15);
  });
  it("fades as the moon gets low", () => {
    expect(moonlight({ alt: 15, illum: 1 })).toBeCloseTo(0.5, 5);
  });
});

describe("moonlitKp", () => {
  it("leaves every spot alone without moonlight", () => {
    for (const k of [3, 4, 5]) expect(moonlitKp(k, 0)).toBeCloseTo(k, 10);
  });
  it("makes a dark spot under a full moon behave like a semi-dark shore, and costs brighter spots less", () => {
    expect(moonlitKp(3, 1)).toBeCloseTo(4, 10);
    expect(moonlitKp(4, 1) - 4).toBeLessThan(1);
    expect(moonlitKp(5, 1) - 5).toBeLessThan(moonlitKp(4, 1) - 4);
  });
  it("lowers the chance for faint auroras", () => {
    expect(auroraFactor(3.5, 3, 1)).toBeLessThan(auroraFactor(3.5, 3, 0) / 2);
  });
});
