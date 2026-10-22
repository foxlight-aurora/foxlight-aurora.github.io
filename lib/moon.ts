// Moon position and brightness, accurate to a few tenths of a degree: plenty for "is the moon up, and how bright".

const RAD = Math.PI / 180;
const sin = (deg: number) => Math.sin(deg * RAD);
const cos = (deg: number) => Math.cos(deg * RAD);

/**
 * The moon seen from a place: altitude (degrees, topocentric) and illuminated fraction (0–1). Low-precision series
 * from the Astronomical Almanac for the moon, and the same solar series as sunAltitude for the phase.
 */
export function moonAt(date: Date, lat: number, lon: number): { alt: number; illum: number } {
  const d = date.getTime() / 86400000 - 10957.5; // days since J2000.0
  const T = d / 36525;
  // Ecliptic longitude, latitude and horizontal parallax of the moon.
  const lambda =
    218.32 + 481267.881 * T +
    6.29 * sin(135.0 + 477198.87 * T) - 1.27 * sin(259.3 - 413335.36 * T) + 0.66 * sin(235.7 + 890534.22 * T) +
    0.21 * sin(269.9 + 954397.74 * T) - 0.19 * sin(357.5 + 35999.05 * T) - 0.11 * sin(186.5 + 966404.03 * T);
  const beta =
    5.13 * sin(93.3 + 483202.02 * T) + 0.28 * sin(228.2 + 960400.89 * T) -
    0.28 * sin(318.3 + 6003.15 * T) - 0.17 * sin(217.6 - 407332.21 * T);
  const parallax =
    0.9508 + 0.0518 * cos(135.0 + 477198.87 * T) + 0.0095 * cos(259.3 - 413335.36 * T) +
    0.0078 * cos(235.7 + 890534.22 * T) + 0.0028 * cos(269.9 + 954397.74 * T);

  // Ecliptic → equatorial → horizontal.
  const eps = 23.439 - 0.00000036 * d;
  const x = cos(beta) * cos(lambda);
  const y = cos(eps) * cos(beta) * sin(lambda) - sin(eps) * sin(beta);
  const z = sin(eps) * cos(beta) * sin(lambda) + cos(eps) * sin(beta);
  const ra = Math.atan2(y, x) / RAD;
  const dec = Math.asin(z) / RAD;
  const gmst = (18.697374558 + 24.06570982441908 * d) * 15;
  const ha = gmst + lon - ra;
  const geo = Math.asin(sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(ha)) / RAD;
  const alt = geo - parallax * cos(geo); // seen from the ground, not Earth's centre: up to ~1° lower

  // Phase from the moon's elongation from the sun.
  const g = 357.529 + 0.98560028 * d;
  const sunLon = 280.459 + 0.98564736 * d + 1.915 * sin(g) + 0.02 * sin(2 * g);
  const elong = Math.acos(cos(beta) * cos(lambda - sunLon)) / RAD;
  return { alt, illum: (1 - cos(elong)) / 2 };
}

/**
 * How much the moon brightens the sky, 0–1 (1 = a full moon at least 30° up). Brightness by phase follows Allen's
 * law for the moon's magnitude, so a half moon gives about a tenth of a full one; it fades as the moon gets low.
 */
export function moonlight(m: { alt: number; illum: number }): number {
  if (m.alt <= 0) return 0;
  const phaseAngle = Math.acos(Math.min(1, Math.max(-1, 2 * m.illum - 1))) / RAD; // 0° = full
  const relative = 10 ** (-0.4 * (0.026 * phaseAngle + 4e-9 * phaseAngle ** 4));
  return relative * Math.min(1, m.alt / 30);
}
