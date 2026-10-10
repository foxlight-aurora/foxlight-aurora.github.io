// One-line explanations for every technical term on the page: what it is, and how to read it.

export const GLOSSARY = {
  kp: "Kp index (0–9) measures how disturbed Earth's magnetic field is worldwide. The higher it is, the further south auroras reach — around Oulu, about 3 gives an even chance at dark spots, 5 in town.",
  chance:
    "Our 0–100 estimate of the chance to see auroras (about a % chance), combining Kp, cloud cover and darkness. Calibrated to FMI's statistics: around Oulu auroras show on roughly 1 in 4 clear, dark nights. 60+ great, 35+ good, 15+ possible, below that unlikely.",
  spotKp:
    "The Kp for about an even chance at a spot, on a clear dark night. Dark sky (little light pollution) from Kp 3+, semi-dark shores from 4+, city lights only from 5+.",
  clouds: "Share of the sky covered by cloud. Auroras are ~100 km up, above all clouds — under 30% is good, over 70% usually hides them.",
  bz: "Bz is the north–south direction of the Sun's magnetic field arriving at Earth (in nT). Negative = south, which lets solar energy in; below −5 often means auroras within the hour.",
  solarWind: "The stream of particles from the Sun, in km/s. Around 400 is normal; above ~450 drives stronger, livelier auroras.",
  rIndex:
    "FMI's real-time auroral activity index, measured every 5 minutes by magnetometers next to Oulu. Above the yellow line there's a 50% chance of weak auroras, above the red line a 50% chance of strong ones.",
  nowcast:
    "Our estimate of activity over Oulu right now: the higher of the global Kp and FMI's local R-index (converted: yellow line ≈ even chance at dark spots, Kp 3+; red line ≈ even chance in town, Kp 5+).",
  ovation:
    "NOAA's OVATION model: the % chance of aurora directly overhead in the next ~30–90 min. 'Within view' also counts auroras visible low on the northern horizon.",
  sunAlt: "How high the Sun is (negative = below the horizon). Below −12° the sky is dark enough for auroras; above −6° it is too bright.",
  outlook:
    "NOAA's 4-week forecast of the largest Kp per day, based on the Sun's 27-day rotation: active regions that faced Earth tend to come back. A hint, not a promise. The next few days use NOAA's 3-day forecast instead, which sees storms the outlook can't.",
  kpKind: "Observed = measured. Estimated = preliminary measurement. Predicted = NOAA's forecast.",
} as const;

export type TermKey = keyof typeof GLOSSARY;
