// Mouse + keyboard input for Kunang (input-systems skill).
// Gameplay reads named ACTIONS, not raw keys: 'pulse', 'pause', 'mute',
// 'start', 'restart' are edge-triggered and queued once per press, so a
// held key never double-fires. Movement is the one held read: the lantern
// follows the pointer, or the left/right move actions while they are held.
// Pointer coordinates are normalised to logical 1280x720 space from the
// canvas bounding rect (responsive-canvas-game), so HiDPI backing stores
// and CSS scaling never shift the aim. Pointer events cover mouse, touch
// and pen through the same path.

import { W, H } from './config.js';

// Discrete actions, bound by key (physical position on the keyboard is
// what matters; these are single letters, so layout is not an issue).
const KEY_ACTIONS = {
  ' ': 'pulse',
  p: 'pause',
  m: 'mute',
  enter: 'start',
  r: 'restart',
};

// Held movement: -1 left, +1 right.
const MOVE_KEYS = { arrowleft: -1, a: -1, arrowright: 1, d: 1 };

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouseX = W / 2;
    this.mouseY = H / 2;
    this.mouseInside = false;
    this.keys = new Set();
    // One-shot action queue: 'pulse', 'pause', 'mute', 'start', 'restart'.
    this.actions = [];
    this._onPointerMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - r.left) * W) / r.width;
      this.mouseY = ((e.clientY - r.top) * H) / r.height;
      this.mouseInside = true;
    };
    this._onPointerDown = (e) => {
      this._onPointerMove(e);
      this.actions.push('pulse');
    };
    this._onPointerLeave = () => {
      // The pointer left the canvas: keys take over until it returns.
      this.mouseInside = false;
    };
    this._onPointerCancel = () => {
      this.mouseInside = false;
    };
    this._onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if ([' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) {
        e.preventDefault();
      }
      if (e.repeat) return;
      this.keys.add(k);
      const action = KEY_ACTIONS[k];
      if (action) this.actions.push(action);
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.key.toLowerCase());
    };
    this._onBlur = () => {
      this.keys.clear();
    };
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointerleave', this._onPointerLeave);
    canvas.addEventListener('pointercancel', this._onPointerCancel);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  // Pull and clear the queued actions (call once per frame).
  drainActions() {
    const out = this.actions;
    this.actions = [];
    return out;
  }

  moveDir() {
    let dir = 0;
    for (const k of this.keys) dir += MOVE_KEYS[k] || 0;
    return Math.max(-1, Math.min(1, dir));
  }

  // Mouse steering wins when the pointer is over the canvas; otherwise keys.
  targetX(fallbackX) {
    return this.mouseInside ? this.mouseX : fallbackX;
  }
}
