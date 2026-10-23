// Checks that a snapshot is consistent with itself, run before every deploy (scripts/fetch-data.mts: a failure stops
// it) and on the live site (scripts/watchdog.mts). Every check is exact or has a wide margin, so a correct snapshot
// never fails: a false alarm here would hold back a correct site.
import type { AuroraData } from "./data";
import { kpAt, nightOf } from "./forecast";
import { nowcastKp, rIndexKp, visibilityScore } from "./oulu";

const RAD = Math.PI / 180;

/** Solar altitude by NOAA's full solar position algorithm: a second, independent formula to check the site's against. */
export function sunAltitudeNoaa(t: Date, lat: number, lon: number): number {
  const s = (deg: number) => Math.sin(deg * RAD);
  const c = (deg: number) => Math.cos(deg * RAD);
  const jc = (t.getTime() / 86400000 + 2440587.5 - 2451545) / 36525;
  const L0 = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360;
  const M = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
  const e = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
  const C = s(M) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) + s(2 * M) * (0.019993 - 0.000101 * jc) + s(3 * M) * 0.000289;
  const omega = 125.04 - 1934.136 * jc;
  const lambda = L0 + C - 0.00569 - 0.00478 * s(omega);
  const eps = 23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60 + 0.00256 * c(omega);
  const dec = Math.asin(s(eps) * s(lambda)) / RAD;
  const y = Math.tan((eps / 2) * RAD) ** 2;
  const eotMin = (4 / RAD) * (y * s(2 * L0) - 2 * e * s(M) + 4 * e * y * s(M) * c(2 * L0) - 0.5 * y * y * s(4 * L0) - 1.25 * e * e * s(2 * M));
  const minutes = t.getUTCHours() * 60 + t.getUTCMinutes() + t.getUTCSeconds() / 60;
  const hourAngle = ((((minutes + eotMin + 4 * lon) % 1440) + 1440) % 1440) / 4 - 180;
  const cosZenith = s(lat) * s(dec) + c(lat) * c(dec) * c(hourAngle);
  return 90 - Math.acos(Math.min(1, Math.max(-1, cosZenith))) / RAD;
}

/** What's wrong with a snapshot; empty when it's consistent. */
export function verifySnapshot(d: AuroraData): string[] {
  const errors: string[] = [];
  const at = new Date(d.generatedAt);
  const thisHour = new Date(Math.floor(at.getTime() / 3600000) * 3600000).toISOString().replace(".000", "");

  // Every score is a whole number from 0 to 100 (no NaN slipping through).
  const isScore = (x: number) => Number.isInteger(x) && x >= 0 && x <= 100;
  for (const s of d.spots) {
    if (!isScore(s.now) || ![...s.hours.map((h) => h.score), ...s.nights.map((n) => n.peak)].every(isScore))
      errors.push(`${s.name}: a score is not a whole number from 0 to 100`);
  }

  // Kp now is NOAA's 3-hour value, and the nowcast follows from it and FMI's live local activity.
  const kp = kpAt(d.kpBins, at);
  if (kp !== d.now.kp) errors.push(`Kp now: NOAA's 3-hour value is ${kp}, the snapshot says ${d.now.kp}`);
  const live = d.now.stations.filter((s) => !s.stale);
  const localKp = (r: (s: (typeof live)[number]) => number) => Math.max(...live.map((s) => rIndexKp(r(s), s.yellow, s.red)));
  const nowcast = nowcastKp(d.now.kp, live.length ? { now: localKp((s) => s.r), recent: localKp((s) => s.rRecent) } : null);
  if (Math.abs(nowcast - d.now.effectiveKp) > 0.01) errors.push(`Nowcast: Kp and the R-index give ${nowcast.toFixed(2)}, the snapshot says ${d.now.effectiveKp.toFixed(2)}`);

  // The sun, by an independent formula (the site's is accurate to ~0.1°).
  const sun = sunAltitudeNoaa(at, 65.01, 25.47);
  if (Math.abs(sun - d.now.sunAlt) > 0.5) errors.push(`Sun: ${sun.toFixed(2)}° by NOAA's algorithm, the snapshot says ${d.now.sunAlt.toFixed(2)}°`);

  for (const s of d.spots) {
    // "Now" follows from its inputs.
    const now = visibilityScore({ kp: d.now.effectiveKp, minKp: s.minKp, cloud: s.cloud, sunAlt: d.now.sunAlt, moon: d.now.moon.light });
    if (now !== s.now) errors.push(`${s.name}: its inputs give ${now} for now, the snapshot says ${s.now}`);

    // The chart's current hour uses the same activity and clouds as "now". (Only those: it judges the sun at mid-hour,
    // so at dusk its score can rightly differ.)
    const h = s.hours.find((x) => x.time === thisHour);
    if (h && (Math.abs(h.kp - d.now.effectiveKp) > 0.01 || h.cloud !== s.cloud))
      errors.push(`${s.name}: the chart's current hour has Kp ${h.kp} and clouds ${h.cloud}, now has ${d.now.effectiveKp.toFixed(2)} and ${s.cloud}`);

    // Each night's peak is its best hour, and the spot's best is its best night.
    for (const n of s.nights) {
      const peak = Math.max(...s.hours.filter((x) => nightOf(x.time) === n.date).map((x) => x.score));
      if (peak !== n.peak) errors.push(`${s.name} ${n.date}: the best hour is ${peak}, the night says ${n.peak}`);
    }
    if (s.nights.length && s.best?.peak !== Math.max(...s.nights.map((n) => n.peak))) errors.push(`${s.name}: its best night doesn't match its nights`);
  }
  return errors;
}
