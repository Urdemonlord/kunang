// Bats: the night's hunters.
// A bat sweeps in from a side of the valley, flaps toward the nearest
// firefly, and snatches it. If it reaches the lantern it knocks a life off
// the keeper and is driven off. A pulse flash scares every bat away: they
// turn tail and flee off-screen.

import { W, H, LANTERN } from './config.js';

let nextId = 1;

export class Bat {
  constructor(x, y, speed, dir, rng) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.dir = dir; // -1: flying left, 1: flying right (set from steering)
    const r = rng || Math.random;
    this.flap = r() * Math.PI * 2;
    this.flapSpeed = 9 + r() * 4;
    this.state = 'hunt'; // 'hunt' | 'flee'
    this.retarget = 0;
    this.tx = x;
    this.ty = y;
    this.dead = false;
  }
}

export function spawnBat(rng, speed) {
  const fromLeft = rng() < 0.5;
  const x = fromLeft ? -30 : W + 30;
  const y = 60 + rng() * 320;
  return new Bat(x, y, speed, fromLeft ? 1 : -1, rng);
}

function nearestFirefly(world, bat) {
  let best = null;
  let bestD = Infinity;
  for (const f of world.fireflies) {
    const dx = f.x - bat.x;
    const dy = f.y - bat.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return best;
}

// Advance every bat one step. Returns { eaten: [], hitLantern: n }.
export function updateBats(world, dt) {
  const eaten = [];
  let hitLantern = 0;
  const lantern = world.lantern;
  for (const bat of world.bats) {
    if (bat.dead) continue;
    bat.flap += bat.flapSpeed * dt;
    bat.retarget -= dt;
    if (bat.state === 'flee') {
      // Scared off: climb away from the valley, fast.
      bat.x += bat.dir * bat.speed * 1.7 * dt;
      bat.y -= bat.speed * 0.9 * dt;
      if (bat.x < -60 || bat.x > W + 60 || bat.y < -60) bat.dead = true;
      continue;
    }
    // Re-aim at the nearest firefly a few times a second; if none is near,
    // circle down toward the lantern instead.
    if (bat.retarget <= 0) {
      bat.retarget = 0.35;
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
    const wobble = Math.sin(bat.flap * 0.6) * 26;
    bat.x += (dx / d) * bat.speed * dt + wobble * dt * 0.4;
    bat.y += (dy / d) * bat.speed * dt;
    bat.dir = dx >= 0 ? 1 : -1;
    // Snatch the firefly it was chasing.
    if (bat.prey && !bat.prey.dead) {
      const pdx = bat.prey.x - bat.x;
      const pdy = bat.prey.y - bat.y;
      if (pdx * pdx + pdy * pdy < 18 * 18) {
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
    if (ldx * ldx + ldy * ldy < (LANTERN.radius + 14) * (LANTERN.radius + 14)) {
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

// Every bat on screen turns tail at once (the pulse flash).
export function scareBats(world) {
  for (const bat of world.bats) {
    if (bat.state !== 'flee') {
      bat.state = 'flee';
      bat.dir = bat.x < W / 2 ? -1 : 1;
    }
  }
}
