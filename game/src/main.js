// Kunang — Penjaga Lentera: game loop and state machine.
// States: title -> play -> (nightclear -> play) x5 -> dawn, or play ->
// gameover. The loop runs on requestAnimationFrame with a clamped delta;
// ?shot=start|play|end renders one deterministic frame instead, for the
// screenshots. Scoring, nights, lives and pulses all live here; the
// entities, the lantern, the sound and the drawing live in their own files.

import { W, H, NIGHTS, LANTERN, PULSE, LIVES, comboMultiplier, mulberry32 } from './config.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { Lantern } from './lantern.js';
import { spawnFirefly, updateFireflies } from './fireflies.js';
import { spawnBat, updateBats } from './bats.js';
import { drawWorld } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function createWorld() {
  const rng = mulberry32(20261117);
  const stars = [];
  for (let i = 0; i < 110; i++) {
    stars.push({
      x: rng() * W,
      y: rng() * 430,
      size: rng() < 0.85 ? 1.5 : 2.5,
      alpha: 0.35 + rng() * 0.6,
      speed: 0.6 + rng() * 2.2,
      phase: rng() * Math.PI * 2,
    });
  }
  const fogBanks = [];
  for (let i = 0; i < 12; i++) {
    fogBanks.push({
      x: rng() * W,
      y: 120 + rng() * 480,
      r: 130 + rng() * 150,
      alpha: 0.08 + rng() * 0.10,
      speed: 6 + rng() * 14,
    });
  }
  return {
    state: 'title',
    time: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    saved: 0,
    bestScore: loadBest(),
    night: 1,
    nightTime: 0,
    nightDuration: NIGHTS[0].duration,
    nightFog: NIGHTS[0].fog,
    fireflies: [],
    bats: [],
    lantern: new Lantern(),
    input: new Input(canvas),
    audio: new AudioSys(),
    rng: mulberry32((Math.random() * 0x7fffffff) | 0),
    stars,
    fogBanks,
    spawnFireflyAcc: 0,
    spawnBatAcc: 0,
    bannerTimer: 0,
    ambientAcc: 0,
  };
}

function loadBest() {
  try {
    return Number(window.localStorage.getItem('kunang-best') || 0) || 0;
  } catch (e) {
    return 0;
  }
}

function saveBest(world) {
  if (world.score > world.bestScore) {
    world.bestScore = world.score;
    try {
      window.localStorage.setItem('kunang-best', String(world.bestScore));
    } catch (e) {
      /* best score stays in memory only */
    }
  }
}

const world = createWorld();

// Debug handle for play-testing (headless runs drive the game through it);
// the game itself never reads it.
window.__kunang = world;

// --- flow ---------------------------------------------------------------

function startGame() {
  world.score = 0;
  world.combo = 0;
  world.bestCombo = 0;
  world.saved = 0;
  world.night = 1;
  world.nightTime = 0;
  world.nightDuration = NIGHTS[0].duration;
  world.nightFog = NIGHTS[0].fog;
  world.fireflies = [];
  world.bats = [];
  world.spawnFireflyAcc = 0;
  world.spawnBatAcc = 0;
  world.lantern.reset();
  world.rng = mulberry32((Math.random() * 0x7fffffff) | 0);
  world.state = 'play';
  world.audio.ensure();
}

function beginNight(n) {
  world.night = n;
  world.nightTime = 0;
  world.nightDuration = NIGHTS[n - 1].duration;
  world.nightFog = NIGHTS[n - 1].fog;
  world.fireflies = [];
  world.bats = [];
  world.spawnFireflyAcc = 0;
  world.spawnBatAcc = 0;
  world.state = 'play';
}

function endNight() {
  saveBest(world);
  world.audio.nightClear();
  if (world.night >= 5) {
    world.state = 'dawn';
    world.bannerTimer = 0;
    return;
  }
  world.state = 'nightclear';
  world.bannerTimer = 2.8;
}

function gameOver() {
  saveBest(world);
  world.state = 'gameover';
}

// --- per-frame update ----------------------------------------------------

function driftAmbient(world, dt, rate) {
  // A few fireflies always wander the sky so menus never sit still.
  world.ambientAcc += rate * dt;
  while (world.ambientAcc >= 1) {
    world.ambientAcc -= 1;
    if (world.fireflies.length < 14) world.fireflies.push(spawnFirefly(world.rng));
  }
  updateFireflies(world, dt);
  // Ambient fireflies that reach the ground just fade away, unsaved.
  world.fireflies = world.fireflies.filter((f) => f.y < H - 40);
}

function updatePlay(world, dt) {
  const cfg = NIGHTS[world.night - 1];
  world.nightTime += dt;
  world.spawnFireflyAcc += cfg.fireflyRate * dt;
  while (world.spawnFireflyAcc >= 1) {
    world.spawnFireflyAcc -= 1;
    world.fireflies.push(spawnFirefly(world.rng));
  }
  world.spawnBatAcc += cfg.batRate * dt;
  while (world.spawnBatAcc >= 1) {
    world.spawnBatAcc -= 1;
    world.bats.push(spawnBat(world.rng, cfg.batSpeed));
  }
  world.lantern.update(world, dt);
  const { saved, lost } = updateFireflies(world, dt);
  for (const f of saved) {
    world.combo += 1;
    world.bestCombo = Math.max(world.bestCombo, world.combo);
    world.score += 10 * comboMultiplier(world.combo);
    world.saved += 1;
    world.audio.chime(world.combo);
  }
  if (lost.length > 0) world.combo = 0;
  const { eaten, hitLantern } = updateBats(world, dt);
  if (eaten.length > 0) world.combo = 0;
  for (let i = 0; i < hitLantern; i++) {
    world.lantern.lives -= 1;
    world.lantern.shake = 0.5;
    world.combo = 0;
    world.audio.thud();
    if (world.lantern.lives <= 0) {
      gameOver();
      return;
    }
  }
  if (world.nightTime >= world.nightDuration) endNight();
}

function update(world, dt) {
  world.time += dt;
  if (world.state === 'title') {
    driftAmbient(world, dt, 0.5);
    return;
  }
  if (world.state === 'play') {
    updatePlay(world, dt);
    return;
  }
  if (world.state === 'nightclear') {
    driftAmbient(world, dt, 0.7);
    world.bannerTimer -= dt;
    if (world.bannerTimer <= 0) beginNight(world.night + 1);
    return;
  }
  if (world.state === 'pause') return; // frozen
  // dawn + gameover: the sky keeps breathing behind the end screen.
  driftAmbient(world, dt, 0.4);
}

// --- input actions --------------------------------------------------------

function handleActions(world) {
  for (const action of world.input.drainActions()) {
    if (action === 'mute') {
      world.audio.toggleMute();
      continue;
    }
    if (action === 'pause') {
      if (world.state === 'play') world.state = 'pause';
      else if (world.state === 'pause') world.state = 'play';
      continue;
    }
    if (action === 'pulse') {
      if (world.state === 'title') {
        startGame();
      } else if (world.state === 'play') {
        world.audio.ensure();
        if (world.lantern.pulse(world)) world.audio.whoosh();
      } else if (world.state === 'dawn' || world.state === 'gameover') {
        startGame();
      }
      continue;
    }
    if (action === 'start') {
      if (world.state === 'title' || world.state === 'dawn' || world.state === 'gameover') {
        startGame();
      }
      continue;
    }
    if (action === 'restart') {
      if (world.state === 'dawn' || world.state === 'gameover' || world.state === 'pause') {
        startGame();
      }
    }
  }
}

// --- boot -----------------------------------------------------------------

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  // Screenshot mode: one deterministic frame, no loop, no sound.
  const seed = Number(params.get('seed') || 1);
  applyShot(world, shot, seed);
  drawWorld(ctx, world);
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    handleActions(world);
    update(world, dt);
    drawWorld(ctx, world);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
