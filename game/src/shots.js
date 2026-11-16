// Deterministic screenshot states for Kunang.
// ?shot=start shows the title screen, ?shot=play a fixed mid-play scene,
// ?shot=end the Dawn victory screen — all from a seeded RNG, so the same
// query renders the same bytes on every run. The live game never calls
// this; main.js calls it once when a ?shot= query is present.

import { W, H, NIGHTS, LANTERN, mulberry32 } from './config.js';
import { spawnFirefly, updateFireflies } from './fireflies.js';
import { spawnBat, updateBats } from './bats.js';

export function applyShot(world, name, seed) {
  const rng = mulberry32(seed);
  world.rng = rng;
  world.time = 0;
  world.fireflies = [];
  world.bats = [];
  if (name === 'start') {
    buildTitleScene(world, rng);
  } else if (name === 'play') {
    buildPlayScene(world, rng);
  } else if (name === 'end') {
    buildDawnScene(world, rng);
  }
}

// Title: the lantern glowing under a quiet sky, fireflies drifting.
function buildTitleScene(world, rng) {
  world.state = 'title';
  world.bestScore = 0;
  world.lantern.x = W / 2;
  for (let i = 0; i < 12; i++) {
    const f = spawnFirefly(rng);
    f.y = 90 + rng() * 420;
    f.x = 60 + rng() * (W - 120);
    prefillTrail(f);
    world.fireflies.push(f);
  }
}

// Mid-play, night 2: a real simulated stretch of the game, frozen.
// The lantern sweeps after the fireflies for nine seconds of fixed steps,
// so the fireflies, bats and trails sit where live play would put them.
function buildPlayScene(world, rng) {
  world.state = 'play';
  world.night = 2;
  world.nightDuration = NIGHTS[1].duration;
  world.nightTime = 18;
  world.nightFog = NIGHTS[1].fog;
  world.score = 340;
  world.combo = 5;
  world.bestCombo = 7;
  world.saved = 27;
  world.lantern.lives = 3;
  world.lantern.pulseCharges = 2;
  world.lantern.flash = 0.55;
  const cfg = NIGHTS[1];
  let fireflyAcc = 0;
  let batAcc = 0;
  const dt = 1 / 60;
  for (let step = 0; step < 720; step++) {
    const t = step * dt;
    world.time = t;
    world.lantern.x = 640 + Math.sin(t * 0.45) * 280;
    fireflyAcc += cfg.fireflyRate * dt;
    while (fireflyAcc >= 1) {
      fireflyAcc -= 1;
      world.fireflies.push(spawnFirefly(rng));
    }
    batAcc += cfg.batRate * dt;
    while (batAcc >= 1) {
      batAcc -= 1;
      world.bats.push(spawnBat(rng, cfg.batSpeed));
    }
    updateFireflies(world, dt);
    updateBats(world, dt);
  }
  // The simulation decides the scene; the scoreboard is set, not earned.
  world.score = 340;
  world.combo = 5;
  world.bestCombo = 7;
  world.saved = 27;
  world.lantern.lives = 3;
  world.lantern.pulseCharges = 2;
  world.lantern.flash = 0.55;
  // Guarantee the frame reads as a hunt: at least two bats on screen.
  while (world.bats.length < 2) {
    const b = spawnBat(rng, cfg.batSpeed);
    b.x = 300 + rng() * 680;
    b.y = 150 + rng() * 160;
    world.bats.push(b);
  }
}

// Dawn: the fifth night survived, the sun rising over the valley.
function buildDawnScene(world, rng) {
  world.state = 'dawn';
  world.night = 5;
  world.nightDuration = NIGHTS[4].duration;
  world.nightTime = NIGHTS[4].duration;
  world.nightFog = 0.25;
  world.score = 1240;
  world.combo = 0;
  world.bestCombo = 11;
  world.saved = 86;
  world.bestScore = 1240;
  world.lantern.lives = 2;
  world.lantern.pulseCharges = 3;
  world.lantern.x = W / 2;
  for (let i = 0; i < 9; i++) {
    const f = spawnFirefly(rng);
    f.y = 260 + rng() * 320;
    f.x = 80 + rng() * (W - 160);
    prefillTrail(f);
    world.fireflies.push(f);
  }
}

// A short trail behind a placed firefly, so it glows like it just flew.
function prefillTrail(f) {
  for (let i = 5; i >= 1; i--) {
    f.trail.push({ x: f.x + Math.sin(i) * 6, y: f.y - i * 7 });
  }
}
