// Tuning constants for Kunang — Penjaga Lentera.
// One place for every number the game balances on: speeds, spawn rates,
// night difficulty, lantern geometry, pulse economy. Nothing here loads
// anything from the network; this file is pure numbers.

export const W = 1280;
export const H = 720;

// The valley floor the lantern sits on.
export const GROUND_Y = 668;

export const NIGHTS = [
  // night 1: gentle introduction, few bats — UNCHANGED by the rame pass.
  { duration: 35, fireflyRate: 1.15, batRate: 0.10, batSpeed: 95, fog: 0.30 },
  // night 2: the valley wakes up — and gets busy from here on.
  { duration: 40, fireflyRate: 3.0, batRate: 1.0, batSpeed: 112, fog: 0.38 },
  // night 3: bats hunt in earnest, in numbers.
  { duration: 45, fireflyRate: 3.5, batRate: 1.4, batSpeed: 130, fog: 0.46 },
  // night 4: thick fog, fast wings, a crowded sky.
  { duration: 45, fireflyRate: 4.0, batRate: 1.8, batSpeed: 150, fog: 0.54 },
  // night 5: the last night before dawn, the busiest sky.
  { duration: 50, fireflyRate: 4.0, batRate: 2.2, batSpeed: 172, fog: 0.62 },
];

// Density caps (rame pass): the spawn accumulators freeze at the cap, so
// the screen stays busy but readable and the lantern can still keep up.
// Regular spawns stop at BAT_CAP; a wave may push the total to BAT_HARD_CAP.
export const FIREFLY_CAP = 48;
export const BAT_CAP = 12;
export const BAT_HARD_CAP = 18;

// Bat waves (rame pass): { at } is a fraction of the night duration,
// { size } is how many bats arrive together after a short warning.
// Night 2-3 get one wave, nights 4-5 get two. No waves on night 1.
export const WAVES = {
  2: [{ at: 0.55, size: 6 }],
  3: [{ at: 0.55, size: 6 }],
  4: [{ at: 0.35, size: 7 }, { at: 0.70, size: 8 }],
  5: [{ at: 0.30, size: 7 }, { at: 0.60, size: 8 }],
};

// Golden shower (rame pass): once per night from night 3, SHOWER.count
// golden fireflies arrive at once at a random point 40-70% into the night.
export const SHOWER = {
  minNight: 3,
  count: 5,
};

export const LANTERN = {
  y: 640,
  radius: 34,
  // Light cone: narrow at the lantern, wide at the top of the sky.
  coneTopY: 70,
  coneHalfTop: 52,
  coneHalfBottom: 170,
  // How strongly the cone pulls a firefly sideways toward its centre:
  // a velocity bias of pull/60 per second of offset (1.2/s at 72).
  pull: 72,
  // How fast the lantern follows the mouse / keys.
  followSpeed: 900,
  keySpeed: 620,
};

export const PULSE = {
  max: 3,
  rechargeSec: 12,
  // The pulse scares bats away only inside this radius of the lantern, so
  // positioning matters a little: 720 covers the whole lower valley and
  // most of the sky from the lantern, only the far top corners escape.
  // The "Kilau Luas" upgrade widens it; level 2 covers the whole screen.
  radius: 720,
  flashSec: 1.4,
};

export const LIVES = 3;
export const MAX_LIVES = 5;

// Raja Kelelawar, the night-5 boss: 3 pulse hits to drive off, a big
// score bonus for defeating him, and he calls in regular bats while alive.
export const BOSS = {
  hp: 3,
  scoreBonus: 500,
  spawnAtSec: 2.0, // seconds into night 5 before he swoops in
  minionEverySec: 4.0,
  diveEverySec: 3.5,
  scale: 2.6,
  speed: 120,
};

// Kunang Emas: a rare golden firefly, faster and worth 5x, and the one
// bats prefer to hunt. Only from night 2 on.
export const GOLDEN = {
  chance: 1 / 12,
  scoreMult: 5,
  fallMult: 1.5,
  color: '#ffd34d',
  colorCore: '#fff3c4',
};

// Game-feel tuning (game-feel skill tiers). Every event fires its bundle
// from ONE Feel.feedback(tier, x, y) call, so the whole game stays
// proportional: small = particles only, medium adds a short hit-stop and a
// soft glow flash, large adds heavy trauma and a longer hit-stop. The
// boss defeat tops the large tier up to trauma 1 with extra bursts.
// Routine saves stay small on purpose: no hit-stop, no flash, no nausea.
export const FEEL = {
  hitStopSlow: 0.05,
  shakeDecay: 1.2, // trauma lost per real second
  maxOffsetX: 12,
  maxOffsetY: 8,
  particleCap: 120,
  popSec: 0.18, // lantern squash-and-stretch pop after a save
  flashCooldownSec: 0.34, // glow flashes at most ~3 per second (WCAG 2.3.1)
  glowFlashMax: 0.14, // soft amber wash, never a full-screen strobe
  tiers: {
    small: { trauma: 0.15, hitStop: 0, particles: 4, flash: false },
    medium: { trauma: 0.4, hitStop: 0.05, particles: 10, flash: true },
    large: { trauma: 0.85, hitStop: 0.12, particles: 30, flash: true },
  },
  particlesBossDefeat: 60, // extra gold burst on top of the large tier
};

// Combo tiers: consecutive saves 0-4 pay x1, 5-9 pay x2, 10+ pay x3.
export function comboMultiplier(combo) {
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  return 1;
}

// Combo milestone watermark: 0, 5, or 10. Milestones fire feedback when
// the combo first crosses them, and can fire again if the combo falls
// below and climbs back.
export function comboMilestone(combo) {
  if (combo >= 10) return 10;
  if (combo >= 5) return 5;
  return 0;
}

export const COLORS = {
  skyTop: '#0b1026',
  skyMid: '#131a3d',
  skyLow: '#1d2547',
  dawnTop: '#2b3a6e',
  dawnMid: '#7a5a7e',
  dawnLow: '#e8a56b',
  ground: '#0a0e22',
  amber: '#ffb347',
  amberSoft: '#ffcf7d',
  firefly: '#d8ff7a',
  fireflyCore: '#f4ffd0',
  bat: '#0a0a16',
  batEye: '#ff4d4d',
  hud: '#f5ecd7',
  hudDim: '#b9b3a4',
};

// Small deterministic RNG (mulberry32) so the ?shot= scenes and the
// screenshot states render the same bytes on every run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
