// Bats: the night's hunters.
// Three kinds, each with its own behaviour and silhouette:
//   swift  — small, fast, dives straight at the nearest firefly;
//   hunter — the original: stalks the nearest firefly, circling in;
//   tank   — big, slow, takes 2 pulse hits to flee instead of 1.
// Night 1 is hunter-only so the first night stays gentle; the mix widens
// every night after. Night 5 adds the boss, Raja Kelelawar: 3 pulse hits,
// dive attacks on the lantern, and he calls in regular bats while alive.
// A pulse flash scares bats away only inside its radius of the lantern.

import { W, H, LANTERN, BOSS } from './config.js';

let nextId = 1;

// Per-type tuning: silhouette scale, speed multiplier, pulse hits to flee.
export const BAT_TYPES = {
  swift: { scale: 0.7, speed: 1.6, pulseHp: 1 },
  hunter: { scale: 1.0, speed: 1.0, pulseHp: 1 },
  tank: { scale: 1.5, speed: 0.65, pulseHp: 2 },
  boss: { scale: BOSS.scale, speed: 1.0, pulseHp: BOSS.hp },
};

// Spawn mix per night: [swift, hunter, tank] weights. Night 1 is
// hunter-only; the fast and the heavy join from night 2 on.
const NIGHT_MIX = {
  1: [0, 1, 0],
  2: [0.3, 0.7, 0],
  3: [0.3, 0.5, 0.2],
  4: [0.35, 0.4, 0.25],
  5: [0.35, 0.35, 0.3],
};

export class Bat {
  constructor(x, y, speed, dir, rng, type = 'hunter') {
    this.id = nextId++;
    this.type = type;
    const t = BAT_TYPES[type];
    this.scale = t.scale;
    this.speed = speed * t.speed;
    this.pulseHp = t.pulseHp;
    this.pulseHits = 0;
    this.x = x;
    this.y = y;
    this.dir = dir; // -1: flying left, 1: flying right (set from steering)
    const r = rng || Math.random;
    this.flap = r() * Math.PI * 2;
    this.flapSpeed = 9 + r() * 4;
    this.state = 'hunt'; // 'hunt' | 'flee' (boss: 'enter' | 'circle' | 'dive' | 'stagger')
    this.retarget = 0;
    this.tx = x;
    this.ty = y;
    this.prey = null;
    this.stagger = 0; // seconds of pulse-stagger remaining (tank/boss only)
    // Boss-only fields.
    this.mode = null;
    this.modeTimer = 0;
    this.spawnTimer = 0;
    this.diveX = 0;
    this.diveY = 0;
    this.dead = false;
  }
}

export function spawnBat(rng, speed, night = 1) {
  const fromLeft = rng() < 0.5;
  const x = fromLeft ? -30 : W + 30;
  const y = 60 + rng() * 320;
  const mix = NIGHT_MIX[night] || NIGHT_MIX[5];
  const roll = rng();
  let type = 'hunter';
  if (roll < mix[0]) type = 'swift';
  else if (roll < mix[0] + mix[1]) type = 'hunter';
  else type = 'tank';
  return new Bat(x, y, speed, fromLeft ? 1 : -1, rng, type);
}

// A bat wave: `count` bats arriving together from alternating sides,
// mixed types for the night, spread across the upper sky. Pure: returns
// the bats, the caller pushes them into the world (and caps the total).
export function spawnWaveBats(rng, speed, night, count) {
  const bats = [];
  for (let i = 0; i < count; i++) {
    const b = spawnBat(rng, speed, night);
    b.x = i % 2 === 0 ? -30 - rng() * 60 : W + 30 + rng() * 60;
    b.y = 80 + rng() * 260;
    bats.push(b);
  }
  return bats;
}

// The boss swoops in from the top centre of the sky.
export function spawnBoss(rng) {
  const b = new Bat(W / 2, -60, BOSS.speed, 1, rng, 'boss');
  b.state = 'enter';
  b.mode = 'enter';
  b.modeTimer = 0;
  b.spawnTimer = BOSS.minionEverySec;
  return b;
}

// Bats prefer golden fireflies: a golden prey counts as half the distance
// away, so a golden firefly is hunted first unless a normal one is much
// closer. That is the risk half of the golden risk/reward.
function nearestFirefly(world, bat) {
  let best = null;
  let bestD = Infinity;
  for (const f of world.fireflies) {
    const dx = f.x - bat.x;
    const dy = f.y - bat.y;
    const d = (dx * dx + dy * dy) * (f.golden ? 0.25 : 1);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return best;
}

// Advance every bat one step. Returns { eaten: [], hitLantern: n }.
// (The boss is defeated only by pulse hits, so his defeat is reported
// by pulseHitBats, not here.)
export function updateBats(world, dt) {
  const eaten = [];
  let hitLantern = 0;
  const lantern = world.lantern;
  for (const bat of world.bats) {
    if (bat.dead) continue;
    bat.flap += bat.flapSpeed * dt;
    bat.retarget -= dt;
    if (bat.stagger > 0) {
      // Pulse-staggered (tank took 1 of 2 hits, boss took a hit): hangs
      // in the air, wings beating fast, then resumes the hunt.
      bat.stagger -= dt;
      bat.flap += bat.flapSpeed * dt * 2;
      continue;
    }
    if (bat.type === 'boss') {
      hitLantern += updateBoss(world, bat, dt);
      continue;
    }
    if (bat.state === 'flee') {
      // Scared off: climb away from the valley, fast.
      bat.x += bat.dir * bat.speed * 1.7 * dt;
      bat.y -= bat.speed * 0.9 * dt;
      if (bat.x < -60 || bat.x > W + 60 || bat.y < -60) bat.dead = true;
      continue;
    }
    // Re-aim at the nearest firefly a few times a second; if none is near,
    // circle down toward the lantern instead. Swifts re-aim faster and fly
    // straighter; hunters and tanks wobble in.
    if (bat.retarget <= 0) {
      bat.retarget = bat.type === 'swift' ? 0.2 : 0.35;
      const prey = nearestFirefly(world, bat);
      if (prey) {
        bat.tx = prey.x;
        bat.ty = prey.y;
        bat.prey = prey;
      } else {
        bat.tx = lantern.x;
        bat.ty = LANTERN.y;
        bat.prey = null;
      }
    }
    const dx = bat.tx - bat.x;
    const dy = bat.ty - bat.y;
    const d = Math.hypot(dx, dy) || 1;
    const wobble = bat.type === 'swift' ? 0 : Math.sin(bat.flap * 0.6) * 26;
    bat.x += (dx / d) * bat.speed * dt + wobble * dt * 0.4;
    bat.y += (dy / d) * bat.speed * dt;
    bat.dir = dx >= 0 ? 1 : -1;
    // Snatch the firefly it was chasing.
    if (bat.prey && !bat.prey.dead) {
      const pdx = bat.prey.x - bat.x;
      const pdy = bat.prey.y - bat.y;
      const reach = 18 * bat.scale;
      if (pdx * pdx + pdy * pdy < reach * reach) {
        bat.prey.dead = true;
        eaten.push(bat.prey);
        bat.prey = null;
        bat.state = 'flee';
        bat.dir = bat.x < W / 2 ? -1 : 1;
      }
    }
    // Slam into the lantern: a life is lost, the bat is driven off.
    const ldx = bat.x - lantern.x;
    const ldy = bat.y - LANTERN.y;
    const hitR = LANTERN.radius + 14 * bat.scale;
    if (ldx * ldx + ldy * ldy < hitR * hitR) {
      if (lantern.invuln <= 0) {
        hitLantern += 1;
        lantern.invuln = 2.0;
      }
      bat.state = 'flee';
      bat.dir = bat.x < lantern.x ? -1 : 1;
      bat.y -= 10;
    }
    if (bat.x < -80 || bat.x > W + 80 || bat.y > H + 80) bat.dead = true;
  }
  world.fireflies = world.fireflies.filter((f) => !f.dead);
  world.bats = world.bats.filter((b) => !b.dead);
  return { eaten, hitLantern };
}

// The boss cycle: enter from the sky, circle above the valley calling in
// minions, then dive at the lantern. A dive that reaches the lantern costs
// a life and the boss climbs back to circle; a dive that misses the
// lantern (it swept past) recovers the same way.
function updateBoss(world, bat, dt) {
  const lantern = world.lantern;
  let hitLantern = 0;
  bat.modeTimer -= dt;
  if (bat.mode === 'enter') {
    bat.y += bat.speed * 1.4 * dt;
    bat.x += Math.sin(bat.flap * 0.5) * 20 * dt;
    if (bat.y >= 170) {
      bat.mode = 'circle';
      bat.modeTimer = BOSS.diveEverySec;
    }
    return hitLantern;
  }
  if (bat.mode === 'circle') {
    // Slow patrol across the top, wings wide.
    bat.x += Math.sin(world.time * 0.7) * 55 * dt;
    bat.y += Math.sin(world.time * 1.3) * 12 * dt;
    bat.x = Math.max(120, Math.min(W - 120, bat.x));
    bat.dir = Math.sin(world.time * 0.7) >= 0 ? 1 : -1;
    // Call in a regular bat every few seconds while alive.
    bat.spawnTimer -= dt;
    if (bat.spawnTimer <= 0 && world.bats.length < 14) {
      bat.spawnTimer = BOSS.minionEverySec;
      const minion = spawnBat(world.rng, 130, 5);
      minion.x = bat.x;
      minion.y = bat.y + 30;
      world.bats.push(minion);
    }
    if (bat.modeTimer <= 0) {
      bat.mode = 'dive';
      bat.diveX = lantern.x;
      bat.diveY = LANTERN.y;
    }
    return hitLantern;
  }
  if (bat.mode === 'dive') {
    // A fast straight dive at where the lantern was when the dive began.
    const dx = bat.diveX - bat.x;
    const dy = bat.diveY - bat.y;
    const d = Math.hypot(dx, dy) || 1;
    const diveSpeed = bat.speed * 2.4;
    bat.x += (dx / d) * diveSpeed * dt;
    bat.y += (dy / d) * diveSpeed * dt;
    bat.dir = dx >= 0 ? 1 : -1;
    const ldx = bat.x - lantern.x;
    const ldy = bat.y - LANTERN.y;
    const hitR = LANTERN.radius + 40;
    if (ldx * ldx + ldy * ldy < hitR * hitR) {
      if (lantern.invuln <= 0) {
        hitLantern += 1;
        lantern.invuln = 2.0;
      }
      bat.mode = 'circle';
      bat.modeTimer = BOSS.diveEverySec;
      bat.y = Math.min(bat.y, 220);
      return hitLantern;
    }
    // Swept past the lantern and below the floor: climb back up.
    if (bat.y > LANTERN.y + 30 || d < 12) {
      bat.mode = 'circle';
      bat.modeTimer = BOSS.diveEverySec;
    }
    return hitLantern;
  }
  return hitLantern;
}

// A pulse flash: every bat inside the pulse radius of the lantern takes a
// hit. Hunters and swifts flee on 1 hit; tanks stagger on the first hit
// and flee on the second; the boss staggers on each hit and is defeated
// on the third. Returns { fled, bossHit, bossDefeated, bossX, bossY }.
export function pulseHitBats(world, radius) {
  const lantern = world.lantern;
  let fled = 0;
  let bossHit = false;
  let bossDefeated = false;
  let bossX = 0;
  let bossY = 0;
  for (const bat of world.bats) {
    if (bat.dead || bat.state === 'flee') continue;
    const dx = bat.x - lantern.x;
    const dy = bat.y - LANTERN.y;
    if (dx * dx + dy * dy > radius * radius) continue;
    bat.pulseHits += 1;
    if (bat.type === 'boss') {
      bossHit = true;
      bossX = bat.x;
      bossY = bat.y;
      if (bat.pulseHits >= bat.pulseHp) {
        bat.dead = true;
        bossDefeated = true;
      } else {
        // Knocked out of his dive, hanging staggered in the air.
        bat.mode = 'circle';
        bat.modeTimer = BOSS.diveEverySec;
        bat.stagger = 0.9;
      }
      continue;
    }
    if (bat.pulseHits >= bat.pulseHp) {
      bat.state = 'flee';
      bat.dir = bat.x < W / 2 ? -1 : 1;
      fled += 1;
    } else {
      bat.stagger = 0.6;
    }
  }
  world.bats = world.bats.filter((b) => !b.dead);
  return { fled, bossHit, bossDefeated, bossX, bossY };
}
