// Procedural WebAudio for Kunang — no audio files, everything is
// synthesised: a soft chime when a firefly is saved (its pitch climbs with
// the combo), a low thud when a bat hits the lantern, a filtered whoosh for
// the pulse, and a quiet two-tone drone underneath the night.
// The context is created on the first user gesture only, so the game never
// tries to play sound before the browser allows it. M toggles mute.

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.droneNodes = null;
    this.muted = false;
  }

  // Call from a user gesture (start, click, key). Safe to call repeatedly.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this._startDrone();
    } catch (e) {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  _startDrone() {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.045;
    gain.connect(this.master);
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 55;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 55 * 1.5;
    const o2g = ctx.createGain();
    o2g.gain.value = 0.4;
    o1.connect(gain);
    o2.connect(o2g);
    o2g.connect(gain);
    // Slow breathing on the drone so the night feels alive.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    o1.start();
    o2.start();
    lfo.start();
    this.droneNodes = { o1, o2, lfo };
  }

  // A bright two-note chime; the base pitch rises a semitone per combo step.
  chime(combo) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const steps = Math.min(combo, 12);
    const base = 523.25 * Math.pow(2, steps / 12);
    [base, base * 1.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + i * 0.06);
      g.gain.linearRampToValueAtTime(0.32, t + i * 0.06 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.7);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.8);
    });
  }

  // Low thud: a sine dropping fast plus a short noise burst.
  thud() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  // Airy whoosh: white noise swept through a band-pass filter.
  whoosh() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(2400, t + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + 0.55);
  }

  // Short high sparkle when a night is cleared.
  nightClear() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + i * 0.09);
      g.gain.linearRampToValueAtTime(0.22, t + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.6);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t + i * 0.09);
      osc.stop(t + i * 0.09 + 0.65);
    });
  }
}
