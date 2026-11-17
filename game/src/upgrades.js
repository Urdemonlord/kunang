// Upgrades: the between-night choice.
// After each cleared night (1-4) the player picks 1 of 3 cards drawn at
// random from the 6 options below; a maxed-out option is never offered.
// Levels live on world.upgrades; every system reads its effective value
// through the helpers here, so the base numbers in config.js stay the
// single source of truth for a fresh game.

import { LANTERN, PULSE, LIVES, MAX_LIVES } from './config.js';

export const UPGRADE_DEFS = [
  {
    id: 'cone',
    name: 'Kerucut Lebar',
    desc: 'Cahaya lentera 25% lebih lebar, kunang lebih gampang ketarik.',
    max: 2,
  },
  {
    id: 'recharge',
    name: 'Kilau Cepat',
    desc: 'Kilau isi ulang lebih cepat: 12 dtk, lalu 8 dtk, lalu 5 dtk.',
    max: 2,
  },
  {
    id: 'charge',
    name: 'Kilau Ganda',
    desc: '+1 kilau tersimpan. Langsung terisi satu saat dipilih.',
    max: 2,
  },
  {
    id: 'life',
    name: 'Lentera Kuat',
    desc: '+1 nyawa (maks 5). Langsung pulih satu nyawa saat dipilih.',
    max: 2,
  },
  {
    id: 'pull',
    name: 'Tarik Cahaya',
    desc: 'Cahaya menarik kunang 30% lebih kuat.',
    max: 2,
  },
  {
    id: 'radius',
    name: 'Kilau Luas',
    desc: 'Kilau menjangkau 20% lebih jauh.',
    max: 2,
  },
];

export function freshUpgrades() {
  return { cone: 0, recharge: 0, charge: 0, life: 0, pull: 0, radius: 0 };
}

// Effective values: what the game actually uses, given picked levels.
export function effConeScale(u) {
  return 1 + 0.25 * u.cone;
}

export function effPull(u) {
  return LANTERN.pull * (1 + 0.3 * u.pull);
}

export function effRechargeSec(u) {
  return [12, 8, 5][u.recharge];
}

export function effPulseMax(u) {
  return PULSE.max + u.charge;
}

export function effPulseRadius(u) {
  return PULSE.radius * (1 + 0.2 * u.radius);
}

export function effMaxLives(u) {
  return Math.min(MAX_LIVES, LIVES + u.life);
}

// Roll 3 distinct choices from the options that are not maxed out yet.
// Uses the world's rng so the deterministic ?shot= states stay stable.
export function rollChoices(world) {
  const open = UPGRADE_DEFS.filter((d) => world.upgrades[d.id] < d.max);
  // Fisher-Yates on a copy, driven by the world rng.
  const pool = open.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(world.rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

// Apply one picked upgrade. Returns the def, for the confirmation line.
export function applyUpgrade(world, def) {
  world.upgrades[def.id] += 1;
  if (def.id === 'charge') {
    world.lantern.pulseCharges = Math.min(
      effPulseMax(world.upgrades),
      world.lantern.pulseCharges + 1,
    );
  }
  if (def.id === 'life') {
    world.lantern.maxLives = effMaxLives(world.upgrades);
    world.lantern.lives = Math.min(world.lantern.maxLives, world.lantern.lives + 1);
  }
  world.lastUpgrade = def;
  return def;
}
