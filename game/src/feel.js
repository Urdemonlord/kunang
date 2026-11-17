// Game feel: the juice layer (game-feel skill).
// One job: feedback bundles that fire on discrete events, without ever
// touching the simulation. Trauma-based screen shake (shake = trauma^2,
// summed sines, decays in real time), a short hit-stop that restores in
// real time, save-burst particles and combo popups. Everything here is
// visual-only: in the deterministic ?shot= states the feel state is fresh
// (trauma 0, no particles, no popups), so those frames are unchanged.

import { FEEL } from './config.js';

export class Feel {
  constructor() {
    this.trauma = 0; // 0..1; shake strength is trauma^2
    this.hitStop = 0; // real seconds of hit-stop remaining
    this.timeScale = 1; // 1, or FEEL.hitStopSlow while hit-stop runs
    this.hitFlash = 0; // 0..1, red edge flash after a lantern hit
    this.glowFlash = 0; // 0..1, soft amber wash for medium/large events
    this.strength = 1; // shake strength setting: 1, 0.5, or 0 (G key)
    this.particles = []; // { x, y, vx, vy, life, maxLife, size, color }
    this.popups = []; // { x, y, text, life, maxLife }
    this._shakeT = 0; // phase accumulator, advanced in real time
    this._flashCd = 0; // real seconds until the next glow flash may fire
  }

  // The ONE feedback entry point (game-feel skill): every event fires its
  // tier's bundle from here, so the whole game stays proportional.
  // opts: { color, popup, flash } — flash:false keeps the glow off (the
  // lantern hit uses its own red edge flash instead).
  feedback(tier, x, y, opts = {}) {
    const t = FEEL.tiers[tier];
    if (!t) return;
    this.addTrauma(t.trauma);
    // Hit-stop: one per impact, never stacked. A hit that lands during
    // an active stop still adds trauma and particles, but does not
    // extend the freeze — a golden shower cannot lock the game.
    if (t.hitStop > 0 && this.hitStop <= 0) this.hitStopFor(t.hitStop);
    // Glow flash: at most ~3 per second (WCAG 2.3.1), soft amber only.
    if (t.flash && opts.flash !== false && this._flashCd <= 0) {
      this.glowFlash = 1;
      this._flashCd = FEEL.flashCooldownSec;
    }
    if (t.particles > 0) this.burst(x, y, t.particles, opts.color || '#d8ff7a');
    if (opts.popup) this.popup(x, y, opts.popup);
  }

  // Tier bundles (game-feel tiers): small = particles only, medium adds a
  // flash, large adds trauma + hit-stop. Called from the event site.
  addTrauma(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  // Freeze the game briefly. Only the newest call matters in practice:
  // lantern hits cannot repeat faster than the 2s invulnerability window.
  hitStopFor(seconds) {
    this.hitStop = Math.max(this.hitStop, seconds);
    this.timeScale = FEEL.hitStopSlow;
  }

  burst(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 130;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.35,
        size: 2 + Math.random() * 3,
        color,
      });
    }
    // Bounded: particles never grow forever (responsive-canvas-game).
    if (this.particles.length > FEEL.particleCap) {
      this.particles.splice(0, this.particles.length - FEEL.particleCap);
    }
  }

  popup(x, y, text) {
    this.popups.push({ x, y, text, life: 0, maxLife: 0.75 });
    if (this.popups.length > 8) this.popups.shift();
  }

  // Real-time update: hit-stop timer and trauma decay must keep running
  // while the game is frozen, or the shake would stick off-centre.
  updateReal(realDt) {
    if (this.hitStop > 0) {
      this.hitStop -= realDt;
      if (this.hitStop <= 0) {
        this.hitStop = 0;
        this.timeScale = 1;
      }
    }
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - FEEL.shakeDecay * realDt);
      this._shakeT += realDt * 30;
    }
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - realDt * 2.5);
    if (this.glowFlash > 0) this.glowFlash = Math.max(0, this.glowFlash - realDt * 2.5);
    if (this._flashCd > 0) this._flashCd = Math.max(0, this._flashCd - realDt);
  }

  // Game-time update: particles and popups freeze during hit-stop and
  // pause, like the rest of the world.
  updateGame(dt) {
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 160 * dt; // a little gravity, so sparks arc and fall
      p.vx *= 1 - 2.2 * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.maxLife);
    for (const p of this.popups) p.life += dt;
    this.popups = this.popups.filter((p) => p.life < p.maxLife);
  }

  // Screen-shake offset in logical pixels. Summed sines at unrelated
  // rates: smooth, never a per-frame random buzz. Snaps to (0, 0) at rest.
  // The shake-strength setting scales the offset; at 0 there is no shake.
  shakeOffset() {
    if (this.trauma <= 0 || this.strength <= 0) return { x: 0, y: 0 };
    const s = this.trauma * this.trauma * this.strength;
    return {
      x: FEEL.maxOffsetX * s * Math.sin(this._shakeT * 1.7),
      y: FEEL.maxOffsetY * s * Math.sin(this._shakeT * 2.3),
    };
  }
}
