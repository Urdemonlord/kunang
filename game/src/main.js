// Kunang — Penjaga Lentera: game loop and state machine.
// States: title -> play -> (upgrade -> nightclear -> play) x4 -> play
// (night 5, boss) -> dawn, or play -> gameover. The loop runs on
// requestAnimationFrame with a clamped delta; ?shot=start|play|end
// renders one deterministic frame instead, for the screenshots.
// Scoring, nights, lives and pulses all live here; the entities, the
// lantern, the sound and the drawing live in their own files.

import { W, H, NIGHTS, LANTERN, PULSE, LIVES, FEEL, BOSS, GOLDEN, WAVES, SHOWER, FIREFLY_CAP, BAT_CAP, BAT_HARD_CAP, comboMultiplier, comboMilestone, mulberry32 } from './config.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { Lantern } from './lantern.js';
import { Feel } from './feel.js';
import { spawnFirefly, updateFireflies } from './fireflies.js';
import { spawnBat, spawnBoss, spawnWaveBats, updateBats } from './bats.js';
import { drawWorld } from './render.js';
import { applyShot } from './shots.js';
import { loadSprites, Sprites } from './sprites.js';
import { freshUpgrades, rollChoices, applyUpgrade, effPulseMax } from './upgrades.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// HiDPI shell (responsive-canvas-game): the canvas draws in logical
// 1280x720 coordinates, but the backing store is the CSS size times the
// device pixel ratio (capped at 2), so text and glow stay crisp on retina
// displays. At DPR 1 (headless screenshots) the backing store is exactly
// 1280x720, so the deterministic ?shot= frames are unchanged.
let dpr = 1;
function fitCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(320, Math.round(rect.width * dpr));
  const h = Math.max(180, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}
window.addEventListener('resize', fitCanvas);
window.addEventListener('orientationchange', fitCanvas);

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
    feel: new Feel(),
    pulseBufferedAt: -1, // game time of a pulse press that found no charge
    // Upgrades (between nights) and the night-5 boss.
    upgrades: freshUpgrades(),
    upgradeChoices: [],
    upgradeCardRects: [],
    lastUpgrade: null,
    upgradeConfirm: 0, // seconds the picked card stays highlighted
    boss: null,
    bossBanner: 0, // seconds the "Raja Kelelawar datang" banner stays up
    bossDefeatTimer: 0, // seconds of celebration before the night ends
    // Rame pass: waves, golden shower, combo milestones, shake toggle.
    comboMilestone: 0, // highest combo milestone fired so far (0/5/10)
    wavesFired: 0, // waves already triggered this night
    wavePending: null, // { count, timer } between warning and arrival
    waveBanner: 0, // seconds the "Gelombang kelelawar!" banner stays up
    showerAt: -1, // night-time seconds when the golden shower fires (-1: none)
    showerFired: false,
    showerBanner: 0, // seconds the "Hujan Kunang Emas!" banner stays up
    shakeNote: 0, // seconds the shake-strength note stays on screen
    shakeLabel: '',
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
  world.feel = new Feel();
  world.pulseBufferedAt = -1;
  world.rng = mulberry32((Math.random() * 0x7fffffff) | 0);
  world.upgrades = freshUpgrades();
  world.upgradeChoices = [];
  world.upgradeCardRects = [];
  world.lastUpgrade = null;
  world.upgradeConfirm = 0;
  world.boss = null;
  world.bossBanner = 0;
  world.bossDefeatTimer = 0;
  world.comboMilestone = 0;
  world.wavesFired = 0;
  world.wavePending = null;
  world.waveBanner = 0;
  world.showerFired = false;
  world.showerBanner = 0;
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
  world.boss = null;
  world.bossBanner = 0;
  world.bossDefeatTimer = 0;
  world.wavesFired = 0;
  world.wavePending = null;
  world.waveBanner = 0;
  // The golden shower: once per night from night 3, at a random point
  // 40-70% into the night (world rng, so ?shot= states stay stable).
  world.showerFired = false;
  world.showerBanner = 0;
  world.showerAt = n >= SHOWER.minNight
    ? NIGHTS[n - 1].duration * (0.4 + world.rng() * 0.3)
    : -1;
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
  // The upgrade choice comes first; the night-clear banner after the
  // pick shows what was chosen. No choices left (everything maxed) skips
  // straight to the banner.
  world.upgradeChoices = rollChoices(world);
  if (world.upgradeChoices.length === 0) {
    world.state = 'nightclear';
    world.bannerTimer = 2.8;
    return;
  }
  world.upgradeConfirm = 0;
  world.state = 'upgrade';
}

// Apply the picked upgrade card, then show the night-clear banner (which
// names the pick) before the next night begins.
function pickUpgrade(world, index) {
  if (world.state !== 'upgrade' || world.upgradeConfirm > 0) return;
  const def = world.upgradeChoices[index];
  if (!def) return;
  applyUpgrade(world, def);
  world.audio.nightClear();
  world.upgradeConfirm = 1.0;
}

// The spectacle for a pulse that hit the boss, all through the single
// feedback(tier, pos) call: a large bundle where he hangs. A defeated
// boss pays the bonus, bursts gold on top of the large tier, and ends
// night 5 after a short celebration.
function handlePulseResult(world, res) {
  if (!res) return;
  if (res.bossHit) {
    world.feel.feedback('large', res.bossX, res.bossY, { color: '#ff8a7a' });
    world.audio.thud();
  }
  if (res.bossDefeated) {
    world.score += BOSS.scoreBonus;
    // Burst at the death point, popup above it.
    world.feel.feedback('large', res.bossX, res.bossY - 40, {
      color: GOLDEN.color,
      popup: `Raja Kelelawar kalah! +${BOSS.scoreBonus}`,
    });
    // The defeat tops the large tier up: extra bursts and trauma 1.
    world.feel.burst(res.bossX, res.bossY, FEEL.particlesBossDefeat, GOLDEN.color);
    world.feel.burst(res.bossX, res.bossY, FEEL.particlesBossDefeat / 2, '#d8ff7a');
    world.feel.addTrauma(0.15);
    world.audio.nightClear();
    world.boss = null;
    world.bossDefeatTimer = 1.2;
  }
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
  // Night 5: the boss swoops in a couple of seconds after the night starts.
  if (world.night === 5 && !world.boss && world.bossDefeatTimer <= 0
      && world.nightTime >= BOSS.spawnAtSec) {
    world.boss = spawnBoss(world.rng);
    world.bats.push(world.boss);
    world.bossBanner = 2.5;
  }
  if (world.bossBanner > 0) world.bossBanner -= dt;
  // Bat waves (rame pass): the schedule for this night fires a warning
  // banner first, then the bats arrive together 0.9 s later.
  const waveSched = WAVES[world.night] || [];
  const nextWave = waveSched[world.wavesFired];
  if (nextWave && !world.wavePending
      && world.nightTime >= nextWave.at * world.nightDuration) {
    world.wavePending = { count: nextWave.size, timer: 0.9 };
    world.waveBanner = 2.2;
    world.wavesFired += 1;
  }
  if (world.wavePending) {
    world.wavePending.timer -= dt;
    if (world.wavePending.timer <= 0) {
      const room = Math.max(0, BAT_HARD_CAP - world.bats.length);
      const n = Math.min(world.wavePending.count, room);
      if (n > 0) {
        world.bats.push(...spawnWaveBats(world.rng, cfg.batSpeed, world.night, n));
        world.audio.whoosh();
      }
      world.wavePending = null;
    }
  }
  if (world.waveBanner > 0) world.waveBanner -= dt;
  // Golden shower (rame pass): once per night from night 3, a handful
  // of golden fireflies arrive at once under a gold banner.
  if (world.showerAt > 0 && !world.showerFired && world.nightTime >= world.showerAt) {
    world.showerFired = true;
    world.showerBanner = 2.2;
    for (let i = 0; i < SHOWER.count; i++) {
      const f = spawnFirefly(world.rng, world.night, true);
      f.x = 120 + (W - 240) * (i / (SHOWER.count - 1));
      world.fireflies.push(f);
    }
    world.audio.nightClear();
  }
  if (world.showerBanner > 0) world.showerBanner -= dt;
  // The boss is defeated: celebrate the burst for a moment, then the
  // night ends early. No new spawns during the celebration.
  if (world.bossDefeatTimer > 0) {
    world.bossDefeatTimer -= dt;
    world.lantern.update(world, dt);
    updateFireflies(world, dt);
    updateBats(world, dt);
    if (world.bossDefeatTimer <= 0) endNight();
    return;
  }
  // Spawn accumulators freeze at the density caps, so the screen stays
  // busy but readable and the lantern can still keep up.
  if (world.fireflies.length < FIREFLY_CAP) {
    world.spawnFireflyAcc += cfg.fireflyRate * dt;
    while (world.spawnFireflyAcc >= 1) {
      world.spawnFireflyAcc -= 1;
      world.fireflies.push(spawnFirefly(world.rng, world.night));
    }
  }
  if (world.bats.length < BAT_CAP) {
    world.spawnBatAcc += cfg.batRate * dt;
    while (world.spawnBatAcc >= 1) {
      world.spawnBatAcc -= 1;
      world.bats.push(spawnBat(world.rng, cfg.batSpeed, world.night));
    }
  }
  world.lantern.update(world, dt);
  // A pulse pressed just before a charge landed fires now (input-systems
  // action buffer: 0.15 s, game time, consumed once).
  if (world.pulseBufferedAt >= 0 && world.time - world.pulseBufferedAt <= 0.15) {
    const res = world.lantern.pulse(world);
    if (res) {
      world.audio.whoosh();
      handlePulseResult(world, res);
      world.pulseBufferedAt = -1;
    }
  } else if (world.pulseBufferedAt >= 0) {
    world.pulseBufferedAt = -1; // expired
  }
  const { saved, lost } = updateFireflies(world, dt);
  for (const f of saved) {
    world.combo += 1;
    world.bestCombo = Math.max(world.bestCombo, world.combo);
    // Golden fireflies pay 5x: a large feedback bundle, the biggest
    // single-save celebration in the game.
    const gain = 10 * comboMultiplier(world.combo) * (f.golden ? GOLDEN.scoreMult : 1);
    world.score += gain;
    world.saved += 1;
    if (f.golden) {
      world.audio.chime(world.combo + 8);
      world.feel.feedback('large', f.x, f.y - 12, {
        color: GOLDEN.color,
        popup: `Kunang Emas +${gain}`,
      });
    } else {
      world.audio.chime(world.combo);
      // Small tier on purpose: a routine save gets particles and a
      // popup, no hit-stop, no flash — over-juicing it would hide the
      // real impacts and feel nauseating on a busy screen.
      world.feel.feedback('small', f.x, f.y - 12, {
        color: '#d8ff7a',
        popup: `+${gain}`,
      });
    }
    // Lantern pop, bigger on combo milestones.
    world.lantern.pop = FEEL.popSec;
    // Combo milestones fire once per crossing: x5 is a medium bundle,
    // x10 is a large one, both above the lantern with a bigger pop.
    const m = comboMilestone(world.combo);
    if (m > world.comboMilestone) {
      world.comboMilestone = m;
      world.feel.feedback(m >= 10 ? 'large' : 'medium', world.lantern.x, LANTERN.y - 80, {
        color: '#ffcf7d',
        popup: `Kombo x${m}!`,
      });
      world.lantern.popAmp = m >= 10 ? 0.35 : 0.25;
      world.lantern.pop = FEEL.popSec;
      world.audio.chime(world.combo + 4);
    }
  }
  // A lost firefly costs one combo step instead of resetting it: on a
  // busy screen losses interleave with saves constantly, and a full
  // reset would make the x5/x10 milestones unreachable. Being eaten by
  // a bat or hit by a bat still resets the combo to zero.
  if (lost.length > 0) {
    world.combo = Math.max(0, world.combo - lost.length);
    world.comboMilestone = comboMilestone(world.combo);
  }
  const { eaten, hitLantern } = updateBats(world, dt);
  if (eaten.length > 0) {
    world.combo = 0;
    world.comboMilestone = 0;
  }
  for (let i = 0; i < hitLantern; i++) {
    world.lantern.lives -= 1;
    world.combo = 0;
    world.comboMilestone = 0;
    world.pulseBufferedAt = -1;
    // Large-tier feedback bundle through the single call, plus the red
    // edge flash (the glow flash stays off: one flash per event).
    world.feel.feedback('large', world.lantern.x, LANTERN.y, {
      color: '#ff8a7a',
      flash: false,
    });
    world.feel.hitFlash = 1;
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
  if (world.shakeNote > 0) world.shakeNote -= dt;
  if (world.state === 'pause') return; // frozen, feel included
  world.feel.updateGame(dt);
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
  if (world.state === 'upgrade') {
    // The choice waits on the player, no timer. After a pick, the chosen
    // card stays highlighted briefly, then the night-clear banner names it.
    driftAmbient(world, dt, 0.7);
    if (world.upgradeConfirm > 0) {
      world.upgradeConfirm -= dt;
      if (world.upgradeConfirm <= 0) {
        world.state = 'nightclear';
        world.bannerTimer = 2.8;
      }
    }
    return;
  }
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
    if (action === 'shake') {
      // Cycle the shake strength: 100% -> 50% -> 0% -> 100%. A small
      // note on screen confirms the new setting (game-feel skill:
      // ship a shake-strength toggle, 0-100%).
      const next = world.feel.strength >= 1 ? 0.5
        : world.feel.strength >= 0.5 ? 0 : 1;
      world.feel.strength = next;
      world.shakeLabel = next >= 1 ? 'Goyangan: penuh'
        : next >= 0.5 ? 'Goyangan: 50%' : 'Goyangan: mati';
      world.shakeNote = 1.5;
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
        const res = world.lantern.pulse(world);
        if (res) {
          world.audio.whoosh();
          handlePulseResult(world, res);
        } else if (world.lantern.pulseCharges < effPulseMax(world.upgrades)) {
          // No charge yet: remember the press briefly, so it fires the
          // moment the next charge lands (0.15 s window, game time).
          world.pulseBufferedAt = world.time;
        }
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
      continue;
    }
    if (action === 'pick1' || action === 'pick2' || action === 'pick3') {
      if (world.state === 'upgrade') {
        pickUpgrade(world, Number(action.slice(4)) - 1);
      }
      continue;
    }
  }
  // Upgrade cards are also clickable: a pointer down inside a card picks it.
  if (world.state === 'upgrade' && world.upgradeConfirm <= 0) {
    for (const click of world.input.drainClicks()) {
      const idx = world.upgradeCardRects.findIndex((r) => (
        click.x >= r.x && click.x <= r.x + r.w
        && click.y >= r.y && click.y <= r.y + r.h
      ));
      if (idx >= 0) {
        pickUpgrade(world, idx);
        break;
      }
    }
  } else {
    world.input.drainClicks();
  }
}

// --- boot -----------------------------------------------------------------

// The context transform maps the logical 1280x720 scene onto the actual
// backing store: backing pixels per logical pixel. On a 1280x720 desktop
// at DPR 1 that is 1; on a narrow phone (390 CSS px wide, DPR 2) it is
// 780/1280, so the whole scene fits instead of clipping to the top-left.
function drawScale() {
  return canvas.width / W;
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
fitCanvas();
// Sprites load first: a ?shot= frame must never catch a half-loaded
// sprite, or two renders of the same shot would differ. Shot mode waits
// for the full load (local files, fast; a failed file falls back to the
// procedural drawing, deterministically). Live mode starts after 3 s at
// the latest, with whatever loaded by then.
window.__kunangSprites = Sprites;
function boot() {
  window.__kunangReady = true;
  if (shot) {
    // Screenshot mode: one deterministic frame, no loop, no sound.
    const seed = Number(params.get('seed') || 1);
    applyShot(world, shot, seed);
    const s = drawScale();
    ctx.setTransform(s, 0, 0, s, 0, 0);
    drawWorld(ctx, world);
    return;
  }
  let last = performance.now();
  function frame(now) {
    // Real dt first: the feel layer (hit-stop timer, trauma decay) runs
    // on real time, then the simulation runs on the scaled dt.
    const realDt = Math.min((now - last) / 1000, 0.05);
    last = now;
    world.feel.updateReal(realDt);
    const dt = realDt * world.feel.timeScale;
    handleActions(world);
    update(world, dt);
    const s = drawScale();
    ctx.setTransform(s, 0, 0, s, 0, 0);
    drawWorld(ctx, world);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
if (shot) {
  loadSprites().then(boot);
} else {
  Promise.race([
    loadSprites(),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]).then(boot);
}
