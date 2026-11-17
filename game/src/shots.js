// Deterministic screenshot states for Kunang.
// ?shot=start shows the title screen, ?shot=play a fixed mid-play scene,
// ?shot=boss the night-5 boss fight, ?shot=wave a dense night-4 wave
// moment, ?shot=upgrade the between-night upgrade choice, ?shot=end the
// Dawn victory screen — all from a seeded RNG, so the same query renders
// the same bytes on every run. The live game never calls this; main.js
// calls it once when a ?shot= query is present.

import { W, H, NIGHTS, LANTERN, BOSS, WAVES, mulberry32 } from './config.js';
import { spawnFirefly, updateFireflies } from './fireflies.js';
import { spawnBat, spawnBoss, spawnWaveBats, updateBats } from './bats.js';
import { rollChoices } from './upgrades.js';

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
  } else if (name === 'boss') {
    buildBossScene(world, rng);
  } else if (name === 'wave') {
    buildWaveScene(world, rng);
  } else if (name === 'upgrade') {
    buildUpgradeScene(world, rng);
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
      world.fireflies.push(spawnFirefly(rng, 2));
    }
    batAcc += cfg.batRate * dt;
    while (batAcc >= 1) {
      batAcc -= 1;
      world.bats.push(spawnBat(rng, cfg.batSpeed, 2));
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
    const b = spawnBat(rng, cfg.batSpeed, 2);
    b.x = 300 + rng() * 680;
    b.y = 150 + rng() * 160;
    world.bats.push(b);
  }
}

// Boss fight, night 5: a real simulated stretch, frozen mid-dive. The
// boss swoops in at 2 s, circles, and is caught here diving at the
// lantern with one pulse-hit already taken (one pip empty). A golden
// firefly hangs near the lantern for the risk/reward read.
function buildBossScene(world, rng) {
  world.state = 'play';
  world.night = 5;
  world.nightDuration = NIGHTS[4].duration;
  world.nightTime = 14;
  world.nightFog = NIGHTS[4].fog;
  world.score = 890;
  world.combo = 6;
  world.bestCombo = 9;
  world.saved = 61;
  world.lantern.lives = 3;
  world.lantern.pulseCharges = 2;
  world.lantern.flash = 0.55;
  world.bossBanner = 0;
  const cfg = NIGHTS[4];
  let fireflyAcc = 0;
  let batAcc = 0;
  const dt = 1 / 60;
  let boss = null;
  for (let step = 0; step < 840; step++) {
    const t = step * dt;
    world.time = t;
    world.lantern.x = 640 + Math.sin(t * 0.4) * 260;
    if (!boss && t >= BOSS.spawnAtSec) {
      boss = spawnBoss(rng);
      world.bats.push(boss);
      world.boss = boss;
    }
    fireflyAcc += cfg.fireflyRate * dt;
    while (fireflyAcc >= 1) {
      fireflyAcc -= 1;
      world.fireflies.push(spawnFirefly(rng, 5));
    }
    batAcc += cfg.batRate * dt;
    while (batAcc >= 1) {
      batAcc -= 1;
      world.bats.push(spawnBat(rng, cfg.batSpeed, 5));
    }
    updateFireflies(world, dt);
    updateBats(world, dt);
  }
  // Freeze the frame on the dive: boss above the lantern, diving in,
  // one hit taken, banner gone, flash lit.
  if (boss) {
    boss.mode = 'dive';
    boss.diveX = world.lantern.x;
    boss.diveY = LANTERN.y;
    boss.x = world.lantern.x + 140;
    boss.y = 220;
    boss.pulseHits = 1;
  }
  // Guarantee a golden firefly in frame near the lantern.
  const gold = spawnFirefly(rng, 5);
  gold.golden = true;
  gold.x = world.lantern.x - 90;
  gold.y = 430;
  prefillTrail(gold);
  world.fireflies.push(gold);
  // Guarantee at least two regular bats besides the boss.
  const regulars = world.bats.filter((b) => b.type !== 'boss');
  while (regulars.length < 2) {
    const b = spawnBat(rng, cfg.batSpeed, 5);
    b.x = 300 + rng() * 680;
    b.y = 150 + rng() * 160;
    world.bats.push(b);
    regulars.push(b);
  }
  world.score = 890;
  world.combo = 6;
  world.bestCombo = 9;
  world.saved = 61;
  world.lantern.lives = 3;
  world.lantern.pulseCharges = 2;
  world.lantern.flash = 0.55;
}

// A dense night-4 wave moment (rame pass): a real simulated stretch to
// the first wave, frozen just as the wave bats arrive under the warning
// banner, the sky crowded with fireflies. The wave is placed by hand
// (not by the live scheduler) so the frame is exact every run.
function buildWaveScene(world, rng) {
  world.state = 'play';
  world.night = 4;
  world.nightDuration = NIGHTS[3].duration;
  world.nightFog = NIGHTS[3].fog;
  world.score = 760;
  world.combo = 8;
  world.bestCombo = 10;
  world.saved = 54;
  world.lantern.lives = 3;
  world.lantern.pulseCharges = 2;
  world.lantern.flash = 0.55;
  world.waveBanner = 2.0;
  world.wavesFired = 1;
  world.comboMilestone = 5;
  const cfg = NIGHTS[3];
  const waveAt = WAVES[4][0].at * cfg.duration;
  let fireflyAcc = 0;
  let batAcc = 0;
  const dt = 1 / 60;
  for (let step = 0; step < Math.round(waveAt * 60); step++) {
    const t = step * dt;
    world.time = t;
    world.nightTime = t;
    world.lantern.x = 640 + Math.sin(t * 0.45) * 280;
    fireflyAcc += cfg.fireflyRate * dt;
    while (fireflyAcc >= 1) {
      fireflyAcc -= 1;
      world.fireflies.push(spawnFirefly(rng, 4));
    }
    batAcc += cfg.batRate * dt;
    while (batAcc >= 1) {
      batAcc -= 1;
      world.bats.push(spawnBat(rng, cfg.batSpeed, 4));
    }
    updateFireflies(world, dt);
    updateBats(world, dt);
  }
  world.nightTime = waveAt;
  // The wave itself: 7 bats, mixed types, arriving from both sides.
  world.bats.push(...spawnWaveBats(rng, cfg.batSpeed, 4, WAVES[4][0].size));
  // Guarantee the frame reads as crowded: at least 25 fireflies and
  // 8 bats on screen.
  while (world.fireflies.length < 25) {
    const f = spawnFirefly(rng, 4);
    f.y = 90 + rng() * 420;
    f.x = 60 + rng() * (W - 120);
    prefillTrail(f);
    world.fireflies.push(f);
  }
  while (world.bats.length < 8) {
    const b = spawnBat(rng, cfg.batSpeed, 4);
    b.x = 300 + rng() * 680;
    b.y = 150 + rng() * 160;
    world.bats.push(b);
  }
  // Guarantee a golden firefly in frame for the risk/reward read.
  const gold = spawnFirefly(rng, 4);
  gold.golden = true;
  gold.x = world.lantern.x - 90;
  gold.y = 430;
  prefillTrail(gold);
  world.fireflies.push(gold);
  world.score = 760;
  world.combo = 8;
  world.bestCombo = 10;
  world.saved = 54;
  world.lantern.lives = 3;
  world.lantern.pulseCharges = 2;
  world.lantern.flash = 0.55;
}

// Upgrade choice after night 2: three cards, one upgrade already picked
// (Kerucut Lebar Lv1) so the level steps read on the cards.
function buildUpgradeScene(world, rng) {
  world.state = 'upgrade';
  world.night = 2;
  world.nightDuration = NIGHTS[1].duration;
  world.nightTime = NIGHTS[1].duration;
  world.nightFog = NIGHTS[1].fog;
  world.score = 420;
  world.combo = 0;
  world.bestCombo = 8;
  world.saved = 33;
  world.lantern.lives = 3;
  world.lantern.pulseCharges = 3;
  world.lantern.x = W / 2;
  world.upgrades = { cone: 1, recharge: 0, charge: 0, life: 0, pull: 0, radius: 0 };
  world.upgradeChoices = rollChoices(world);
  world.upgradeConfirm = 0;
  world.lastUpgrade = null;
  for (let i = 0; i < 10; i++) {
    const f = spawnFirefly(rng, 2);
    f.y = 120 + rng() * 380;
    f.x = 60 + rng() * (W - 120);
    prefillTrail(f);
    world.fireflies.push(f);
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
