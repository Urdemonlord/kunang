// Fireflies: the souls the keeper guides home.
// They spawn at the top of the sky, drift down with a gentle wobble, and
// feel the pull of the lantern's light cone. A firefly that reaches the
// lantern is saved; one that slips past the bottom of the valley is lost.
// Each firefly keeps a short trail so its path glows behind it.

import { W, H, LANTERN, GROUND_Y } from './config.js';

let nextId = 1;

export class Firefly {
  constructor(x, y, rng) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.baseFall = 26 + rng() * 22;
    this.wobbleAmp = 14 + rng() * 22;
    this.wobbleSpeed = 0.9 + rng() * 1.4;
    this.phase = rng() * Math.PI * 2;
    this.size = 3 + rng() * 2.4;
    this.twinkle = rng() * Math.PI * 2;
    this.trail = [];
    this.dead = false;
  }
}

export function spawnFirefly(rng) {
  return new Firefly(40 + rng() * (W - 80), -12, rng);
}

// Half-width of the light cone at a given height (narrow at the top,
// wide at the lantern).
export function coneHalfWidthAt(y) {
  const t = (y - LANTERN.coneTopY) / (LANTERN.y - LANTERN.coneTopY);
  const clamped = Math.max(0, Math.min(1, t));
  return LANTERN.coneHalfTop + (LANTERN.coneHalfBottom - LANTERN.coneHalfTop) * clamped;
}

export function fireflyInCone(f, lanternX) {
  if (f.y < LANTERN.coneTopY || f.y > LANTERN.y) return false;
  return Math.abs(f.x - lanternX) < coneHalfWidthAt(f.y);
}

// Advance every firefly one step. Returns { saved: [], lost: [] } with the
// fireflies that reached the lantern or slipped past the valley floor.
export function updateFireflies(world, dt) {
  const saved = [];
  const lost = [];
  const lantern = world.lantern;
  for (const f of world.fireflies) {
    if (f.dead) continue;
    // Remember the trail before moving, so the glow follows the path.
    f.trail.push({ x: f.x, y: f.y });
    if (f.trail.length > 9) f.trail.shift();
    const t = world.time + f.phase;
    let vx = Math.sin(t * f.wobbleSpeed) * f.wobbleAmp;
    let vy = f.baseFall;
    if (fireflyInCone(f, lantern.x)) {
      // The light pulls the firefly toward the lantern and hurries it home.
      // A velocity bias toward the cone centre, proportional to the offset
      // (LANTERN.pull / 60 per second), frame-rate independent: the old
      // term was throttled by a stray * 0.06 * dt, so the pull was ~2 px/s
      // against a wobble of up to 36 px/s and a firefly dropped above the
      // lantern could drift past it. With the real pull, the wobble's
      // steady-state offset stays inside the 34 px save radius.
      vx += (lantern.x - f.x) * (LANTERN.pull / 60);
      vy += 26;
    }
    f.x += vx * dt;
    f.y += vy * dt;
    if (f.x < 6) f.x = 6;
    if (f.x > W - 6) f.x = W - 6;
    const dx = f.x - lantern.x;
    const dy = f.y - LANTERN.y;
    if (dx * dx + dy * dy < LANTERN.radius * LANTERN.radius) {
      f.dead = true;
      saved.push(f);
    } else if (f.y > GROUND_Y + 8) {
      f.dead = true;
      lost.push(f);
    }
  }
  world.fireflies = world.fireflies.filter((f) => !f.dead);
  return { saved, lost };
}
