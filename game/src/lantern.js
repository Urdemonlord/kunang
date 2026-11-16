// The lantern: the keeper, the light, and the lives.
// It glides along the valley floor after the mouse (or the arrow keys),
// holds the pulse charges, and flashes bright when a pulse fires. A bat
// hit leaves it briefly invulnerable so one bat cannot take two lives.

import { W, LANTERN, PULSE, LIVES } from './config.js';
import { scareBats } from './bats.js';

export class Lantern {
  constructor() {
    this.x = W / 2;
    this.lives = LIVES;
    this.pulseCharges = PULSE.max;
    this.pulseTimer = 0; // seconds since the last recharge tick
    this.flash = 0; // seconds of pulse brightness remaining
    this.invuln = 0; // seconds of bat-hit protection remaining
    this.shake = 0; // screen-shake seconds remaining
  }

  reset() {
    this.x = W / 2;
    this.lives = LIVES;
    this.pulseCharges = PULSE.max;
    this.pulseTimer = 0;
    this.flash = 0;
    this.invuln = 0;
    this.shake = 0;
  }

  update(world, dt) {
    const input = world.input;
    const dir = input.moveDir();
    if (dir !== 0) {
      // Keys move the lantern directly; the mouse takes over on move.
      this.x += dir * LANTERN.keySpeed * dt;
      input.mouseInside = false;
    } else if (input.mouseInside) {
      const target = Math.max(50, Math.min(W - 50, input.mouseX));
      const diff = target - this.x;
      const step = LANTERN.followSpeed * dt;
      this.x += Math.abs(diff) < step ? diff : Math.sign(diff) * step;
    }
    this.x = Math.max(46, Math.min(W - 46, this.x));
    // Pulse charges trickle back, one every PULSE.rechargeSec seconds.
    if (this.pulseCharges < PULSE.max) {
      this.pulseTimer += dt;
      if (this.pulseTimer >= PULSE.rechargeSec) {
        this.pulseTimer = 0;
        this.pulseCharges += 1;
      }
    }
    if (this.flash > 0) this.flash -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.shake > 0) this.shake -= dt;
  }

  // Fire a pulse: scare every bat away and brighten the cone. Returns
  // true when a charge was spent, false when the lantern is empty.
  pulse(world) {
    if (this.pulseCharges <= 0) return false;
    this.pulseCharges -= 1;
    this.pulseTimer = 0;
    this.flash = PULSE.flashSec;
    scareBats(world);
    return true;
  }
}
