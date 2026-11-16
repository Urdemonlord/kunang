// Mouse + keyboard input for Kunang.
// The lantern follows the mouse along the bottom of the valley; arrow keys
// or A/D move it too. Space or a click fires a pulse. P pauses, M mutes,
// Enter starts, R restarts on the end screens. Edge-triggered actions are
// queued and consumed once by the main loop, so a held key never double-fires.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouseX = 640;
    this.mouseY = 360;
    this.mouseInside = false;
    this.keys = new Set();
    // One-shot action queue: 'pulse', 'pause', 'mute', 'start', 'restart'.
    this.actions = [];
    this._onMouseMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / r.width;
      this.mouseX = (e.clientX - r.left) * scaleX;
      this.mouseY = (e.clientY - r.top) * (this.canvas.height / r.height);
      this.mouseInside = true;
    };
    this._onMouseDown = () => {
      this.actions.push('pulse');
    };
    this._onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if ([' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) {
        e.preventDefault();
      }
      if (e.repeat) return;
      this.keys.add(k);
      if (k === ' ') this.actions.push('pulse');
      if (k === 'p') this.actions.push('pause');
      if (k === 'm') this.actions.push('mute');
      if (k === 'enter') this.actions.push('start');
      if (k === 'r') this.actions.push('restart');
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.key.toLowerCase());
    };
    this._onBlur = () => {
      this.keys.clear();
    };
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
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
    if (this.keys.has('arrowleft') || this.keys.has('a')) dir -= 1;
    if (this.keys.has('arrowright') || this.keys.has('d')) dir += 1;
    return dir;
  }

  // Mouse steering wins when the pointer is over the canvas; otherwise keys.
  targetX(fallbackX) {
    return this.mouseInside ? this.mouseX : fallbackX;
  }
}
