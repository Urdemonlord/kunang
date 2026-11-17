// The lantern: the keeper, the light, and the lives.
// It glides along the valley floor after the mouse (or the arrow keys),
// holds the pulse charges, and flashes bright when a pulse fires. A bat
// hit leaves it briefly invulnerable so one bat cannot take two lives.

import { W, LANTERN, PULSE, LIVES, FEEL } from './config.js';
import { pulseHitBats } from './bats.js';
import { effPulseMax, effPulseRadius, effRechargeSec } from './upgrades.js';

export class Lantern {
  constructor() {
    this.x = W / 2;
    this.lives = LIVES;
    this.maxLives = LIVES;
    this.pulseCharges = PULSE.max;
    this.pulseTimer = 0; // seconds since the last recharge tick
    this.flash = 0; // seconds of pulse brightness remaining
    this.invuln = 0; // seconds of bat-hit protection remaining
    this.pop = 0; // squash-and-stretch pop seconds remaining after a save
    this.popAmp = 0.15; // pop size: 0.15 routine, bigger on combo milestones
  }

  reset() {
    this.x = W / 2;
    this.lives = LIVES;
    this.maxLives = LIVES;
    this.pulseCharges = PULSE.max;
    this.pulseTimer = 0;
    this.flash = 0;
    this.invuln = 0;
    this.pop = 0;
    this.popAmp = 0.15;
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
    // Pulse charges trickle back, one every recharge interval; upgrades
    // shorten the interval and raise the cap.
    if (this.pulseCharges < effPulseMax(world.upgrades)) {
      this.pulseTimer += dt;
      if (this.pulseTimer >= effRechargeSec(world.upgrades)) {
        this.pulseTimer = 0;
        this.pulseCharges += 1;
      }
    }
    if (this.flash > 0) this.flash -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.pop > 0) {
      this.pop -= dt;
      if (this.pop <= 0) {
        this.pop = 0;
        this.popAmp = 0.15; // back to the routine size; popScale is 1 at rest
      }
    }
  }

  // Squash-and-stretch scale for the pop: 1 + popAmp at the moment of
  // the save, settling back to exactly 1 with a small overshoot
  // (back ease-out: the scale dips just under 1 mid-way, then lands on 1).
  popScale() {
    if (this.pop <= 0) return 1;
    const u = 1 - this.pop / FEEL.popSec; // 0 at pop start, 1 at rest
    const backOut = 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);
    return 1 + this.popAmp * (1 - backOut);
  }

  // Fire a pulse: bats inside the pulse radius take a hit and the cone
  // brightens. Returns null when the lantern is empty, otherwise the
  // pulseHitBats result { fled, bossHit, bossDefeated } so the caller can
  // play the boss-hit spectacle and score the defeat.
  pulse(world) {
    if (this.pulseCharges <= 0) return null;
    this.pulseCharges -= 1;
    this.pulseTimer = 0;
    this.flash = PULSE.flashSec;
    return pulseHitBats(world, effPulseRadius(world.upgrades));
  }
}
