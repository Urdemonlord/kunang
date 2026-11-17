// Tuning constants for Kunang — Penjaga Lentera.
// One place for every number the game balances on: speeds, spawn rates,
// night difficulty, lantern geometry, pulse economy. Nothing here loads
// anything from the network; this file is pure numbers.

export const W = 1280;
export const H = 720;

// The valley floor the lantern sits on.
export const GROUND_Y = 668;

export const NIGHTS = [
  // night 1: gentle introduction, few bats
  { duration: 35, fireflyRate: 1.15, batRate: 0.10, batSpeed: 95, fog: 0.30 },
  // night 2: the valley wakes up
  { duration: 40, fireflyRate: 1.45, batRate: 0.20, batSpeed: 112, fog: 0.38 },
  // night 3: bats hunt in earnest
  { duration: 45, fireflyRate: 1.75, batRate: 0.28, batSpeed: 130, fog: 0.46 },
  // night 4: thick fog, fast wings
  { duration: 45, fireflyRate: 2.05, batRate: 0.38, batSpeed: 150, fog: 0.54 },
  // night 5: the last night before dawn
  { duration: 50, fireflyRate: 2.40, batRate: 0.50, batSpeed: 172, fog: 0.62 },
];

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

// Game-feel tuning (game-feel skill tiers). Small tier (save): particles
// only. Medium tier (night clear): particles + flash. Large tier (lantern
// hit): trauma 0.7, 0.08 s hit-stop, 20-40 particles, hit flash.
// Spectacle tier (boss): trauma 0.9, 0.12 s hit-stop, big bursts.
export const FEEL = {
  traumaHit: 0.7,
  hitStopSec: 0.08,
  hitStopSlow: 0.05,
  shakeDecay: 1.2, // trauma lost per real second
  maxOffsetX: 12,
  maxOffsetY: 8,
  particlesPerSave: 8,
  particlesGolden: 24,
  particlesBossHit: 30,
  particlesBossDefeat: 60,
  particleCap: 120,
  traumaBossHit: 0.9,
  hitStopBossSec: 0.12,
  popSec: 0.18, // lantern squash-and-stretch pop after a save
};

// Combo tiers: consecutive saves 0-4 pay x1, 5-9 pay x2, 10+ pay x3.
export function comboMultiplier(combo) {
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  return 1;
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
