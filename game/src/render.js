// Render: every pixel of Kunang is drawn here, on one canvas.
// Sky, stars, moon, drifting fog, the valley floor, the lantern's warm
// cone of light, glowing fireflies with trails, bat silhouettes with red
// eyes, the vignette, the HUD, and every menu screen. Palette: deep
// indigo night against warm amber light, so the scene reads at a glance
// even when the screenshot is shrunk to a contact sheet.

import { W, H, GROUND_Y, COLORS, LANTERN, PULSE, BOSS, GOLDEN } from './config.js';
import { coneHalfWidthAt } from './fireflies.js';
import { effConeScale, effMaxLives, effPulseMax, UPGRADE_DEFS } from './upgrades.js';
import {
  Sprites, sprite, batSpriteFor, batDrawHeight, fireflyDrawSize, moonCrescent,
} from './sprites.js';

const TITLE_FONT = 'Georgia, "Times New Roman", serif';
const HUD_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function drawWorld(ctx, world) {
  ctx.save();
  // Trauma-based screen shake (game-feel): shake = trauma^2, summed
  // sines, decays in real time. Snaps to (0, 0) at rest — no per-frame
  // random buzz, and the camera offset never touches the simulation.
  const sh = world.feel.shakeOffset();
  if (sh.x !== 0 || sh.y !== 0) ctx.translate(sh.x, sh.y);
  drawSky(ctx, world);
  drawStars(ctx, world);
  drawMoon(ctx, world);
  drawGround(ctx, world);
  drawLightCone(ctx, world);
  drawLanternGlow(ctx, world);
  drawPulseRing(ctx, world);
  drawFireflies(ctx, world);
  drawBats(ctx, world);
  drawLantern(ctx, world);
  drawParticles(ctx, world);
  drawPopups(ctx, world);
  drawFog(ctx, world);
  drawVignette(ctx);
  drawGlowFlash(ctx, world);
  drawHitFlash(ctx, world);
  ctx.restore();
  drawHud(ctx, world);
  drawOverlay(ctx, world);
}

// Save-burst particles: small amber sparks that arc and fade. A golden
// burst draws the v2 sparkle instead of a dot, so the biggest moments
// (golden save, boss defeat) read as starlight, not dust.
function drawParticles(ctx, world) {
  if (world.feel.particles.length === 0) return;
  const sparkImg = sprite('sparkle');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of world.feel.particles) {
    const a = 1 - p.life / p.maxLife;
    if (sparkImg && p.color === GOLDEN.color) {
      const s = (p.size * 3 + 6) * a + 4;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.life * 4);
      ctx.globalAlpha = a;
      ctx.drawImage(sparkImg, -s / 2, -s / 2, s, s);
      ctx.restore();
      continue;
    }
    ctx.fillStyle = p.color === '#d8ff7a'
      ? `rgba(216, 255, 122, ${0.85 * a})`
      : p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Combo popups: "+10" rising and fading above the saved firefly.
function drawPopups(ctx, world) {
  if (world.feel.popups.length === 0) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 22px ${HUD_FONT}`;
  for (const p of world.feel.popups) {
    const t = p.life / p.maxLife;
    const y = p.y - t * 40;
    ctx.globalAlpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
    ctx.fillStyle = COLORS.amberSoft;
    ctx.fillText(p.text, p.x, y);
  }
  ctx.restore();
}

// One brief red edge flash after a lantern hit. A single event, far
// under the three-flashes-per-second photosensitivity limit.
function drawHitFlash(ctx, world) {
  if (world.feel.hitFlash <= 0) return;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(255, 77, 77, 0)');
  g.addColorStop(1, `rgba(255, 77, 77, ${0.28 * world.feel.hitFlash})`);
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, W + 40, H + 40);
}

// Soft amber wash for medium/large feedback bundles (combo milestones,
// golden saves, boss hits). Capped low and rate-limited to ~3 per second
// in Feel, so it reads as warmth, never as a strobe.
function drawGlowFlash(ctx, world) {
  if (world.feel.glowFlash <= 0) return;
  ctx.fillStyle = `rgba(255, 179, 71, ${0.14 * world.feel.glowFlash})`;
  ctx.fillRect(-20, -20, W + 40, H + 40);
}

function drawSky(ctx, world) {
  const dawn = world.state === 'dawn';
  // At night the v2 sky sprite is the base: it bakes the gradient, the
  // stars and the crescent moon, so drawStars/drawMoon skip themselves
  // while it is on. Dawn keeps the procedural sky (the sprite is night
  // only), and a failed load falls back to the old gradient.
  const skyImg = dawn ? null : sprite('sky');
  if (skyImg) {
    ctx.drawImage(skyImg, 0, 0, W, H);
    return;
  }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (dawn) {
    g.addColorStop(0, COLORS.dawnTop);
    g.addColorStop(0.55, COLORS.dawnMid);
    g.addColorStop(1, COLORS.dawnLow);
  } else {
    g.addColorStop(0, COLORS.skyTop);
    g.addColorStop(0.6, COLORS.skyMid);
    g.addColorStop(1, COLORS.skyLow);
  }
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, W + 40, H + 40);
  if (dawn) {
    // The rising sun: a low warm glow on the horizon.
    const sun = ctx.createRadialGradient(W / 2, GROUND_Y, 10, W / 2, GROUND_Y, 320);
    sun.addColorStop(0, 'rgba(255, 214, 140, 0.85)');
    sun.addColorStop(0.4, 'rgba(255, 170, 90, 0.35)');
    sun.addColorStop(1, 'rgba(255, 170, 90, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawStars(ctx, world) {
  if (world.state === 'dawn') return;
  if (sprite('sky')) return; // the stars are baked into the sky sprite
  for (const s of world.stars) {
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(world.time * s.speed + s.phase));
    ctx.globalAlpha = tw * s.alpha;
    ctx.fillStyle = '#e8ecff';
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

function drawMoon(ctx, world) {
  if (world.state === 'dawn') return;
  if (sprite('sky')) return; // the crescent is baked into the sky sprite
  // Low on the right, clear of the HUD block at the top.
  const mx = W - 130;
  const my = 215;
  const glow = ctx.createRadialGradient(mx, my, 8, mx, my, 90);
  glow.addColorStop(0, 'rgba(232, 236, 255, 0.35)');
  glow.addColorStop(1, 'rgba(232, 236, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(mx - 90, my - 90, 180, 180);
  // Crescent as ONE path: outer disc, inner disc cut counter-clockwise.
  // The old code painted the cut-out with a solid sky colour, which is
  // darker than the gradient behind it at this height — that is the dark
  // disc the moon used to wear over its halo.
  const c = moonCrescent(mx, my);
  ctx.fillStyle = '#eef1ff';
  ctx.beginPath();
  ctx.arc(c.outer.x, c.outer.y, c.outer.r, 0, Math.PI * 2);
  ctx.arc(c.inner.x, c.inner.y, c.inner.r, 0, Math.PI * 2, true);
  ctx.fill();
}

function drawGround(ctx, world) {
  ctx.fillStyle = COLORS.ground;
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, GROUND_Y + 6);
  // Rolling hilltops, drawn once from a fixed curve.
  ctx.quadraticCurveTo(220, GROUND_Y - 26, 460, GROUND_Y + 2);
  ctx.quadraticCurveTo(700, GROUND_Y + 22, 940, GROUND_Y - 6);
  ctx.quadraticCurveTo(1120, GROUND_Y - 22, W, GROUND_Y + 4);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  // The v2 tree line and grass blades sit on the hill: silhouettes
  // against the sky, grass at the lantern's feet. The procedural hill
  // stays underneath as the base (and as the fallback when a file fails).
  const trees = sprite('trees');
  if (trees) ctx.drawImage(trees, 0, 0, W, H);
  const grass = sprite('grass');
  if (grass) ctx.drawImage(grass, 0, 0, W, H);
  // A thin warm rim where the lantern light kisses the ground.
  const rim = ctx.createLinearGradient(0, GROUND_Y - 4, 0, GROUND_Y + 18);
  rim.addColorStop(0, 'rgba(255, 179, 71, 0.20)');
  rim.addColorStop(1, 'rgba(255, 179, 71, 0)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, GROUND_Y - 4, W, 22);
}

// The cone is pre-rendered once to an offscreen sprite: thin horizontal
// slices, each fading to transparent at its own edges and brighter toward
// the lantern. Drawing a gradient across the whole trapezoid left a hard
// step where the clip cut it; slices have no edge at all. The sprite is
// rebuilt when the cone upgrade changes its width.
let coneSprite = null;
let coneSpriteScale = 1;

function buildConeSprite(scale) {
  if (coneSprite && scale === coneSpriteScale) return coneSprite;
  coneSpriteScale = scale;
  const pad = 30;
  const w = Math.ceil((LANTERN.coneHalfBottom * scale + pad) * 2);
  const h = LANTERN.y - LANTERN.coneTopY;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const cx = w / 2;
  for (let y = 0; y < h; y += 6) {
    const worldY = LANTERN.coneTopY + y;
    const half = coneHalfWidthAt(worldY, scale);
    // Faint at the sky, strong near the lantern.
    const v = Math.pow(y / h, 1.6);
    const peak = 0.34 * v + 0.015;
    const grad = g.createLinearGradient(cx - half, 0, cx + half, 0);
    grad.addColorStop(0, 'rgba(255, 190, 110, 0)');
    grad.addColorStop(0.5, `rgba(255, 190, 110, ${peak})`);
    grad.addColorStop(1, 'rgba(255, 190, 110, 0)');
    g.fillStyle = grad;
    g.fillRect(cx - half, y, half * 2, 6);
  }
  coneSprite = c;
  return c;
}

function drawLightCone(ctx, world) {
  const sprite = buildConeSprite(effConeScale(world.upgrades));
  const lx = world.lantern.x;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(sprite, lx - sprite.width / 2, LANTERN.coneTopY);
  // A pulse flash lays the beam down a second time, brighter.
  if (world.lantern.flash > 0) {
    ctx.globalAlpha = 0.5;
    ctx.drawImage(sprite, lx - sprite.width / 2, LANTERN.coneTopY);
  }
  ctx.restore();
}

function drawLanternGlow(ctx, world) {
  const lx = world.lantern.x;
  const ly = LANTERN.y;
  const flicker = 1 + Math.sin(world.time * 7.3) * 0.06 + Math.sin(world.time * 13.1) * 0.04;
  const flash = world.lantern.flash > 0 ? 1.6 : 1;
  const glowImg = sprite('glow');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (glowImg) {
    // One soft radial falloff (v2 glow), breathing with the same
    // flicker math the old gradient used, so the light still breathes.
    const r = 150 * flicker * flash;
    ctx.globalAlpha = Math.min(1, 0.85 * flash);
    ctx.drawImage(glowImg, lx - r, ly - r, r * 2, r * 2);
  } else {
    const r = 150 * flicker * flash;
    const g = ctx.createRadialGradient(lx, ly, 10, lx, ly, r);
    g.addColorStop(0, `rgba(255, 190, 90, ${0.5 * flash})`);
    g.addColorStop(0.45, 'rgba(255, 160, 60, 0.18)');
    g.addColorStop(1, 'rgba(255, 160, 60, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
  }
  ctx.restore();
}

// The pulse shockwave: the organic v2 halo (lantern-pulse with the
// lantern itself erased, so the game's own lantern stays the only one),
// expanding and fading over the flash. Nothing when the halo is missing:
// the glow above already brightens on a pulse.
function drawPulseRing(ctx, world) {
  const halo = sprite('pulseHalo');
  if (!halo || world.lantern.flash <= 0) return;
  const u = 1 - world.lantern.flash / PULSE.flashSec; // 0 at fire, 1 at end
  const s = 300 + 220 * u;
  const lx = world.lantern.x;
  const ly = LANTERN.y;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.8 * (1 - u);
  ctx.drawImage(halo, lx - s / 2, ly - s / 2, s, s);
  ctx.restore();
}

function drawFireflies(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const f of world.fireflies) {
    const tw = 0.65 + 0.35 * Math.sin(world.time * 3 + f.twinkle);
    if (f.golden) {
      // Golden fireflies keep the procedural gold rendering: the glow,
      // the core and the dotted trail are all gold, so they never lose
      // their colour to a green sprite.
      drawGoldFirefly(ctx, f, tw);
      continue;
    }
    drawTrailRibbon(ctx, f, tw);
    // Body + glow: dim far away (atmospheric perspective), bright once
    // the firefly has dropped into the valley. The sprite's own glow
    // replaces the old radial gradient; the twinkle is its alpha.
    const bodyImg = f.y < 220 ? sprite('fireflyDim') : sprite('fireflyBright');
    if (bodyImg) {
      const s = fireflyDrawSize(f);
      ctx.globalAlpha = 0.55 + 0.45 * tw;
      ctx.drawImage(bodyImg, f.x - s / 2, f.y - s / 2, s, s);
      ctx.globalAlpha = 1;
    } else {
      drawPlainFirefly(ctx, f, tw, '216, 255, 122', COLORS.fireflyCore);
    }
  }
  ctx.restore();
}

// The old procedural firefly (glow + core, no sprite): the fallback when
// a sprite file failed, and the base the golden rendering builds on.
function drawPlainFirefly(ctx, f, tw, glowRgb, core) {
  const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 3.2);
  glow.addColorStop(0, `rgba(${glowRgb}, ${0.75 * tw})`);
  glow.addColorStop(1, `rgba(${glowRgb}, 0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.size * 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.size * 0.62, 0, Math.PI * 2);
  ctx.fill();
}

function drawGoldFirefly(ctx, f, tw) {
  const glowRgb = '255, 211, 77';
  // Trail: the last few positions fading out behind the dot.
  for (let i = 0; i < f.trail.length; i++) {
    const p = f.trail[i];
    const a = (i / f.trail.length) * 0.22 * tw;
    ctx.fillStyle = `rgba(${glowRgb}, ${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, f.size * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  drawPlainFirefly(ctx, f, tw, glowRgb, GOLDEN.colorCore);
}

// Trail ribbon: the v2 trail sprite, head at the firefly, tail along the
// last few positions. Skipped when the firefly barely moved (the angle
// would be noise) or the file failed — then the old dotted trail shows.
function drawTrailRibbon(ctx, f, tw) {
  const trailImg = sprite('fireflyTrail');
  if (!trailImg || f.trail.length < 2) {
    drawDottedTrail(ctx, f, tw, '216, 255, 122');
    return;
  }
  const p0 = f.trail[0];
  const dx = f.x - p0.x;
  const dy = f.y - p0.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) {
    drawDottedTrail(ctx, f, tw, '216, 255, 122');
    return;
  }
  // The sprite is a 2:1 ribbon with the bright head at its right end,
  // so the right edge lands on the firefly and the tail streams behind.
  const len = Math.min(70, Math.max(14, dist * 1.4));
  const h = Math.min(20, len * 0.5);
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.globalAlpha = 0.75 * tw;
  ctx.drawImage(trailImg, -len, -h / 2, len, h);
  ctx.restore();
}

function drawDottedTrail(ctx, f, tw, glowRgb) {
  for (let i = 0; i < f.trail.length; i++) {
    const p = f.trail[i];
    const a = (i / f.trail.length) * 0.22 * tw;
    ctx.fillStyle = `rgba(${glowRgb}, ${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, f.size * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBats(ctx, world) {
  for (const bat of world.bats) {
    if (bat.type === 'boss') {
      drawBoss(ctx, world, bat);
      continue;
    }
    const m = batSpriteFor(bat.type);
    const img = sprite(m.file);
    if (!img) {
      drawBatProcedural(ctx, world, bat);
      continue;
    }
    // The v2 bat: veined wings, red eyes, baked in. Flap is a vertical
    // squash breathing with the wingbeat; the sprite is symmetric, so
    // the direction flip only keeps the transform honest.
    const w = m.width;
    const h = batDrawHeight(bat.type);
    const flapK = 1 - 0.14 * Math.sin(bat.flap);
    ctx.save();
    ctx.translate(bat.x, bat.y);
    ctx.scale(bat.dir, flapK);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

// The old vector bats (swift / tank / hunter silhouettes with red eyes):
// kept as the fallback when a sprite file fails to load.
function drawBatProcedural(ctx, world, bat) {
    const flap = Math.sin(bat.flap) * 0.9;
    const s = bat.scale;
    ctx.save();
    ctx.translate(bat.x, bat.y);
    ctx.scale(bat.dir * s, s);
    ctx.fillStyle = COLORS.bat;
    if (bat.type === 'swift') {
      // Swift: long narrow pointed wings, built for a straight dive.
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-20, -10 - flap * 14, -46, -2 - flap * 18);
      ctx.quadraticCurveTo(-24, 2, -8, 3);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(20, -10 - flap * 14, 46, -2 - flap * 18);
      ctx.quadraticCurveTo(24, 2, 8, 3);
      ctx.closePath();
      ctx.fill();
    } else if (bat.type === 'tank') {
      // Tank: broad round wings and a heavy body, slow but hard to scare.
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-20, -20 - flap * 14, -42, -8 - flap * 20);
      ctx.quadraticCurveTo(-30, 6, -10, 6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(20, -20 - flap * 14, 42, -8 - flap * 20);
      ctx.quadraticCurveTo(30, 6, 10, 6);
      ctx.closePath();
      ctx.fill();
    } else {
      // Hunter: the original broad arcs.
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-16, -14 - flap * 16, -34, -6 - flap * 22);
      ctx.quadraticCurveTo(-20, 2, -8, 4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(16, -14 - flap * 16, 34, -6 - flap * 22);
      ctx.quadraticCurveTo(20, 2, 8, 4);
      ctx.closePath();
      ctx.fill();
    }
    // Body and ears.
    ctx.beginPath();
    ctx.ellipse(0, 0, bat.type === 'tank' ? 14 : 11, bat.type === 'tank' ? 10 : 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-7, -6);
    ctx.lineTo(-10, -14);
    ctx.lineTo(-3, -8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(7, -6);
    ctx.lineTo(10, -14);
    ctx.lineTo(3, -8);
    ctx.closePath();
    ctx.fill();
    // Red eyes, the only colour a bat carries.
    ctx.fillStyle = COLORS.batEye;
    ctx.beginPath();
    ctx.arc(4, -2, 2.1, 0, Math.PI * 2);
    ctx.arc(9, -2, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// Raja Kelelawar: the v2 boss sprite (horned ears, fangs, forked tail,
// red eyes baked in) at 460px wide, with his remaining pulse-hits as
// pips above him, so the fight reads at a glance. The old vector boss
// stays as the fallback when the sprite file fails to load.
function drawBoss(ctx, world, bat) {
  const blink = bat.stagger > 0 && Math.floor(world.time * 12) % 2 === 0;
  const img = sprite('batBoss');
  ctx.save();
  ctx.translate(bat.x, bat.y);
  if (blink) ctx.globalAlpha = 0.55;
  if (img) {
    const w = batSpriteFor('boss').width;
    const h = batDrawHeight('boss');
    const flapK = 1 - 0.08 * Math.sin(bat.flap);
    ctx.scale(bat.dir, flapK);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    drawBossProcedural(ctx, world, bat);
  }
  ctx.restore();
  // Hit pips above the boss: filled = hits still needed. Above the
  // sprite now (its wings reach ~140px up), not at -62.
  const hpLeft = bat.pulseHp - bat.pulseHits;
  ctx.save();
  ctx.translate(bat.x, bat.y - 150);
  for (let i = 0; i < bat.pulseHp; i++) {
    const cx = (i - (bat.pulseHp - 1) / 2) * 22;
    ctx.fillStyle = i < hpLeft ? COLORS.batEye : 'rgba(245, 236, 215, 0.25)';
    ctx.beginPath();
    ctx.moveTo(cx, -7);
    ctx.lineTo(cx + 6, 0);
    ctx.lineTo(cx, 7);
    ctx.lineTo(cx - 6, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// The old vector boss: broad veined wings, horned ears, fangs, forked
// tail, red eyes. Fallback only.
function drawBossProcedural(ctx, world, bat) {
  const flap = Math.sin(bat.flap) * 0.9;
  ctx.save();
  ctx.translate(0, 0);
  ctx.scale(bat.dir, 1);
  ctx.fillStyle = COLORS.bat;
  // Wings: huge, with a scalloped trailing edge between the finger tips.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(side * 44, -38 - flap * 34, side * 92, -14 - flap * 46);
    ctx.quadraticCurveTo(side * 76, -2, side * 58, 2);
    ctx.quadraticCurveTo(side * 48, -4, side * 36, 4);
    ctx.quadraticCurveTo(side * 24, -2, side * 12, 6);
    ctx.closePath();
    ctx.fill();
  }
  // Forked tail.
  ctx.beginPath();
  ctx.moveTo(-8, 14);
  ctx.lineTo(-16, 34);
  ctx.lineTo(-6, 24);
  ctx.lineTo(0, 36);
  ctx.lineTo(6, 24);
  ctx.lineTo(16, 34);
  ctx.lineTo(8, 14);
  ctx.closePath();
  ctx.fill();
  // Body.
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  // Horned ears.
  ctx.beginPath();
  ctx.moveTo(-18, -14);
  ctx.lineTo(-26, -36);
  ctx.lineTo(-8, -20);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(18, -14);
  ctx.lineTo(26, -36);
  ctx.lineTo(8, -20);
  ctx.closePath();
  ctx.fill();
  // Fangs.
  ctx.fillStyle = '#f5ecd7';
  ctx.beginPath();
  ctx.moveTo(-8, 12);
  ctx.lineTo(-4, 22);
  ctx.lineTo(0, 12);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.lineTo(4, 22);
  ctx.lineTo(8, 12);
  ctx.closePath();
  ctx.fill();
  // Red eyes, bigger and angrier than a regular bat's.
  ctx.fillStyle = COLORS.batEye;
  ctx.beginPath();
  ctx.arc(10, -4, 4.5, 0, Math.PI * 2);
  ctx.arc(22, -4, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLantern(ctx, world) {
  const l = world.lantern;
  const lx = l.x;
  const ly = LANTERN.y;
  const blink = l.invuln > 0 && Math.floor(world.time * 10) % 2 === 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;
  // Squash-and-stretch pop after a save: scale around the lantern's
  // centre, so the pop never moves the hitbox or the light cone.
  ctx.translate(lx, ly);
  const s = l.popScale();
  if (s !== 1) ctx.scale(s, s);
  // The v2 lantern: bulged glass, teardrop flame, vented chimney, at the
  // same 44px footprint as the old vector body, so the light cone and
  // the save radius still line up with the picture. On game over the
  // lamp is out: the unlit sprite, "Lentera Padam" in the picture too.
  const lanternImg = world.state === 'gameover'
    ? sprite('lanternOff')
    : sprite('lanternLit');
  if (lanternImg) {
    ctx.drawImage(lanternImg, -22, -32, 44, 59);
  } else {
  // Handle.
  ctx.strokeStyle = '#3a2c18';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, -34, 14, Math.PI, 0);
  ctx.stroke();
  // Body: warm glass with a dark iron frame.
  const glass = ctx.createLinearGradient(-20, -28, 20, 22);
  glass.addColorStop(0, '#ffd98a');
  glass.addColorStop(1, '#ff9e2c');
  ctx.fillStyle = glass;
  roundRect(ctx, -20, -28, 40, 52, 8);
  ctx.fill();
  ctx.strokeStyle = '#2c2113';
  ctx.lineWidth = 3;
  roundRect(ctx, -20, -28, 40, 52, 8);
  ctx.stroke();
  // Frame bars and caps.
  ctx.fillStyle = '#2c2113';
  ctx.fillRect(-22, -30, 44, 6);
  ctx.fillRect(-22, 20, 44, 6);
  ctx.fillRect(-2, -28, 4, 50);
  // Flame, flickering.
  const fl = 1 + Math.sin(world.time * 9) * 0.12;
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.ellipse(0, 2, 6 * fl, 11 * fl, 0, 0, Math.PI * 2);
  ctx.fill();
  }
  ctx.restore();
}

function drawFog(ctx, world) {
  const fogAlpha = world.nightFog;
  ctx.save();
  for (const bank of world.fogBanks) {
    const x = ((bank.x + world.time * bank.speed) % (W + 480)) - 240;
    // Scale the context so the radial gradient itself is elliptical:
    // a circular gradient clipped to an ellipse leaves a hard edge.
    ctx.save();
    ctx.translate(x, bank.y);
    ctx.scale(1, 0.32);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, bank.r);
    g.addColorStop(0, `rgba(148, 163, 214, ${bank.alpha * fogAlpha})`);
    g.addColorStop(1, 'rgba(148, 163, 214, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, bank.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawVignette(ctx) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(5, 8, 20, 0)');
  g.addColorStop(1, 'rgba(5, 8, 20, 0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// --- HUD -----------------------------------------------------------------

// HUD: anchored to the corners on a 4px grid (unslop spacing pass),
// one accent (amber) for the number that matters, quiet chrome otherwise.
// Numbers sit in one right-aligned column; shortcuts are keycaps.
function drawHud(ctx, world) {
  if (world.state === 'title') return;
  ctx.save();
  ctx.textBaseline = 'top';
  // Score, top left.
  ctx.fillStyle = COLORS.hud;
  ctx.font = `700 30px ${HUD_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`Skor ${world.score}`, 24, 20);
  if (world.combo >= 2) {
    ctx.fillStyle = COLORS.amber;
    ctx.font = `700 20px ${HUD_FONT}`;
    ctx.fillText(`Combo x${world.combo}`, 24, 56);
  }
  // Night, top centre, with a thin progress line for the night.
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.hud;
  ctx.font = `700 24px ${HUD_FONT}`;
  ctx.fillText(`Malam ${world.night} / 5`, W / 2, 20);
  const prog = world.nightDuration > 0 ? 1 - world.nightTime / world.nightDuration : 0;
  ctx.fillStyle = 'rgba(245, 236, 215, 0.25)';
  ctx.fillRect(W / 2 - 90, 52, 180, 4);
  ctx.fillStyle = COLORS.amber;
  ctx.fillRect(W / 2 - 90, 52, 180 * prog, 4);
  // Lives (little lanterns) and pulse charges, top right. Both grow
  // with upgrades: lives to 5, pulse charges to 5.
  ctx.textAlign = 'right';
  for (let i = 0; i < effMaxLives(world.upgrades); i++) {
    drawMiniLantern(ctx, W - 32 - i * 32, 32, i < world.lantern.lives);
  }
  ctx.fillStyle = COLORS.hud;
  ctx.font = `700 18px ${HUD_FONT}`;
  ctx.fillText(`Diselamatkan ${world.saved}`, W - 24, 56);
  // Pulse charges as glowing dots under the lives.
  for (let i = 0; i < effPulseMax(world.upgrades); i++) {
    const cx = W - 32 - i * 28;
    const cy = 96;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    if (i < world.lantern.pulseCharges) {
      ctx.fillStyle = COLORS.amber;
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 179, 71, 0.25)';
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(245, 236, 215, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  // Pulse hint: a keycap, then the word. Right-aligned as one group.
  ctx.textBaseline = 'middle';
  const hint = 'kilau';
  ctx.font = `400 13px ${HUD_FONT}`;
  const hintW = ctx.measureText(hint).width;
  drawKeycap(ctx, W - 24 - hintW - 8, 120, 'Spasi', 'right');
  ctx.fillStyle = COLORS.hudDim;
  ctx.textAlign = 'right';
  ctx.fillText(hint, W - 24, 120);
  // Mute state, bottom right, quiet and small.
  ctx.textBaseline = 'top';
  ctx.font = `400 13px ${HUD_FONT}`;
  ctx.fillText(world.audio.muted ? 'Suara: mati (M)' : 'Suara: hidup (M)', W - 24, H - 28);
  // Shake-strength note, bottom centre, only while it is fresh.
  if (world.shakeNote > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, world.shakeNote / 0.4);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.hud;
    ctx.font = `400 14px ${HUD_FONT}`;
    ctx.fillText(world.shakeLabel, W / 2, H - 28);
    ctx.restore();
  }
  // Picked upgrades, bottom left: one quiet line, so a build reads in
  // the HUD without shouting. Hidden until the first pick.
  const picked = UPGRADE_DEFS.filter((d) => world.upgrades[d.id] > 0);
  if (picked.length > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = `400 14px ${HUD_FONT}`;
    ctx.fillText(
      picked.map((d) => `${d.name} Lv${world.upgrades[d.id]}`).join('  •  '),
      24, H - 28,
    );
  }
  ctx.restore();
  drawBossBanner(ctx, world);
  drawEventBanner(ctx, world);
}

// Event banners (rame pass): the wave warning and the golden shower,
// same typography and placement as the boss banner, so the family stays
// one voice. Only one shows at a time; the wave takes precedence.
function drawEventBanner(ctx, world) {
  let title = null;
  let sub = null;
  let color = COLORS.amber;
  let t = 0;
  if (world.waveBanner > 0) {
    title = 'Gelombang kelelawar!';
    sub = 'Mereka datang bergerombol. Siap-siap kilau.';
    color = '#ff8a7a';
    t = world.waveBanner;
  } else if (world.showerBanner > 0) {
    title = 'Hujan Kunang Emas!';
    sub = 'Lima kunang emas sekaligus. Cepat selamatkan.';
    color = GOLDEN.color;
    t = world.showerBanner;
  }
  if (!title) return;
  const alpha = Math.min(1, t / 0.5);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.font = `700 56px ${TITLE_FONT}`;
  ctx.fillText(title, W / 2, 168);
  ctx.fillStyle = COLORS.hud;
  ctx.font = `italic 400 22px ${TITLE_FONT}`;
  ctx.fillText(sub, W / 2, 216);
  ctx.restore();
}

// The boss intro banner, drawn over play (not in the overlay, so the
// fight stays visible behind it): big red serif, fading out over its life.
function drawBossBanner(ctx, world) {
  if (!world.bossBanner || world.bossBanner <= 0) return;
  const alpha = Math.min(1, world.bossBanner / 0.5);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff8a7a';
  ctx.font = `700 64px ${TITLE_FONT}`;
  ctx.fillText('Raja Kelelawar datang', W / 2, 168);
  ctx.fillStyle = COLORS.hud;
  ctx.font = `italic 400 22px ${TITLE_FONT}`;
  ctx.fillText('Tiga kilau untuk mengusirnya. Jangan biarkan dia menyentuh lentera.', W / 2, 216);
  ctx.restore();
}

// A small keycap chip for a keyboard shortcut (unslop details pass).
// align 'right' puts the cap's right edge at x; returns the cap width.
function drawKeycap(ctx, x, y, label, align) {
  ctx.save();
  ctx.font = `700 13px ${HUD_FONT}`;
  const w = Math.ceil(ctx.measureText(label).width) + 16;
  const h = 24;
  const rx = align === 'right' ? x - w : x;
  ctx.fillStyle = 'rgba(245, 236, 215, 0.12)';
  ctx.strokeStyle = 'rgba(245, 236, 215, 0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, rx, y - h / 2, w, h, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.hud;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rx + w / 2, y + 1);
  ctx.restore();
  return w;
}

function drawMiniLantern(ctx, x, y, lit) {
  ctx.save();
  ctx.fillStyle = lit ? COLORS.amber : 'rgba(245, 236, 215, 0.18)';
  roundRect(ctx, x - 8, y - 10, 16, 20, 4);
  ctx.fill();
  ctx.fillStyle = '#2c2113';
  ctx.fillRect(x - 9, y - 12, 18, 3);
  ctx.fillRect(x - 9, y + 9, 18, 3);
  ctx.restore();
}

// --- Overlays (menus and end screens) -------------------------------------

function drawOverlay(ctx, world) {
  if (world.state === 'title') drawTitle(ctx, world);
  else if (world.state === 'pause') drawPause(ctx, world);
  else if (world.state === 'upgrade') drawUpgrade(ctx, world);
  else if (world.state === 'nightclear') drawNightClear(ctx, world);
  else if (world.state === 'dawn') drawDawn(ctx, world);
  else if (world.state === 'gameover') drawGameOver(ctx, world);
}

function scrim(ctx, alpha) {
  ctx.fillStyle = `rgba(6, 9, 24, ${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

// Title (unslop direction: still, watchful, warm; the lantern glow and
// the fireflies are the only bright things). No tracked-out eyebrow, no
// em dashes: the wordmark is the title. Shortcuts are keycaps, on the
// 4px grid, one primary action.
function drawTitle(ctx, world) {
  scrim(ctx, 0.45);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.hud;
  ctx.font = `700 110px ${TITLE_FONT}`;
  ctx.fillText('Kunang', W / 2, 248);
  ctx.fillStyle = COLORS.amber;
  ctx.font = `italic 400 30px ${TITLE_FONT}`;
  ctx.fillText('Penjaga Lentera', W / 2, 320);
  ctx.fillStyle = COLORS.hud;
  ctx.font = `400 20px ${HUD_FONT}`;
  ctx.fillText('Lima malam. Satu lentera terakhir. Bawa kunang-kunang pulang,', W / 2, 388);
  ctx.fillText('jangan biarkan kelelawar memadamkan cahayamu.', W / 2, 416);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = `italic 400 18px ${TITLE_FONT}`;
  ctx.fillText('Malam kelima dijaga Raja Kelelawar. Tiga kilau untuk mengusirnya.', W / 2, 446);
  // Controls as keycap rows, centred.
  drawControlRow(ctx, 472, `400 17px ${HUD_FONT}`, [
    { cap: '←' }, { cap: '→' }, { text: 'gerakkan lentera' },
    { gap: 32 },
    { cap: 'Spasi' }, { text: 'kilau pengusir kelelawar' },
  ]);
  drawControlRow(ctx, 508, `400 17px ${HUD_FONT}`, [
    { cap: 'P' }, { text: 'jeda' },
    { gap: 32 },
    { cap: 'M' }, { text: 'suara' },
    { gap: 32 },
    { cap: 'G' }, { text: 'goyangan layar' },
  ]);
  // Breathing start prompt.
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 2.4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = COLORS.amber;
  ctx.font = `700 26px ${HUD_FONT}`;
  ctx.fillText('Klik atau tekan Enter untuk mulai', W / 2, 548);
  ctx.globalAlpha = 1;
  if (world.bestScore > 0) {
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = `400 17px ${HUD_FONT}`;
    ctx.fillText(`Skor terbaik: ${world.bestScore}`, W / 2, 592);
  }
  ctx.restore();
}

// A centred row mixing keycap chips and plain labels. Segments:
// { cap: 'P' } draws a keycap, { text: 'jeda' } draws a label,
// { gap: 32 } adds space. All on the 4px grid.
function drawControlRow(ctx, y, font, segments) {
  ctx.save();
  ctx.textBaseline = 'middle';
  let total = 0;
  for (const s of segments) {
    if (s.gap) total += s.gap;
    else if (s.cap) total += keycapWidth(ctx, s.cap) + 8;
    else if (s.text) {
      ctx.font = font;
      total += Math.ceil(ctx.measureText(s.text).width) + 8;
    }
  }
  total -= 8; // no trailing gap after the last segment
  let x = Math.round((W - total) / 2);
  for (const s of segments) {
    if (s.gap) { x += s.gap; continue; }
    if (s.cap) {
      const w = drawKeycap(ctx, x, y, s.cap, 'left');
      x += w + 8;
      continue;
    }
    ctx.font = font;
    ctx.fillStyle = COLORS.hudDim;
    ctx.textAlign = 'left';
    ctx.fillText(s.text, x, y);
    x += Math.ceil(ctx.measureText(s.text).width) + 8;
  }
  ctx.restore();
}

function keycapWidth(ctx, label) {
  ctx.save();
  ctx.font = `700 13px ${HUD_FONT}`;
  const w = Math.ceil(ctx.measureText(label).width) + 16;
  ctx.restore();
  return w;
}

function drawPause(ctx, world) {
  scrim(ctx, 0.55);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.hud;
  ctx.font = `700 64px ${TITLE_FONT}`;
  ctx.fillText('Jeda', W / 2, H / 2 - 32);
  drawControlRow(ctx, H / 2 + 32, `400 20px ${HUD_FONT}`, [
    { text: 'Tekan' }, { cap: 'P' }, { text: 'untuk melanjutkan' },
  ]);
  ctx.restore();
}

// Upgrade choice: three solid dark cards on a 4px grid, one amber accent,
// keycaps 1/2/3. The picked card highlights while the confirmation runs.
// Card rectangles are stored on the world for click hit-testing.
function drawUpgrade(ctx, world) {
  scrim(ctx, 0.55);
  const choices = world.upgradeChoices;
  const pickedIdx = world.upgradeConfirm > 0
    ? choices.findIndex((d) => d === world.lastUpgrade)
    : -1;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.amberSoft;
  ctx.font = `700 56px ${TITLE_FONT}`;
  ctx.fillText(`Malam ${world.night} terlewati`, W / 2, 128);
  ctx.fillStyle = COLORS.hud;
  ctx.font = `400 22px ${HUD_FONT}`;
  ctx.fillText('Pilih satu hadiah sebelum malam berikutnya.', W / 2, 184);
  const cardW = 300;
  const cardH = 240;
  const gap = 24;
  const totalW = cardW * 3 + gap * 2;
  const x0 = Math.round((W - totalW) / 2);
  const y0 = 236;
  world.upgradeCardRects = [];
  choices.forEach((def, i) => {
    const x = x0 + i * (cardW + gap);
    const y = y0;
    world.upgradeCardRects.push({ x, y, w: cardW, h: cardH });
    const picked = i === pickedIdx;
    const dimmed = pickedIdx >= 0 && !picked;
    ctx.save();
    if (dimmed) ctx.globalAlpha = 0.45;
    // Solid dark panel, thin amber border (thicker when picked).
    ctx.fillStyle = '#0a0e22';
    roundRect(ctx, x, y, cardW, cardH, 8);
    ctx.fill();
    ctx.strokeStyle = picked ? COLORS.amber : 'rgba(255, 179, 71, 0.45)';
    ctx.lineWidth = picked ? 3 : 1;
    roundRect(ctx, x, y, cardW, cardH, 8);
    ctx.stroke();
    // Keycap with the pick key.
    drawKeycap(ctx, x + 24, y + 32, String(i + 1), 'left');
    // Name, level step, description.
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.hud;
    ctx.font = `700 24px ${HUD_FONT}`;
    ctx.fillText(def.name, x + 24, y + 76);
    ctx.fillStyle = COLORS.amber;
    ctx.font = `700 17px ${HUD_FONT}`;
    const lvl = world.upgrades[def.id];
    ctx.fillText(`Lv ${lvl}  →  Lv ${lvl + 1}   (maks ${def.max})`, x + 24, y + 108);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = `400 16px ${HUD_FONT}`;
    wrapText(ctx, def.desc, x + 24, y + 140, cardW - 48, 22);
    ctx.restore();
  });
  ctx.textAlign = 'center';
  if (pickedIdx >= 0) {
    ctx.fillStyle = COLORS.amber;
    ctx.font = `700 24px ${HUD_FONT}`;
    ctx.fillText(`Terpilih: ${world.lastUpgrade.name}`, W / 2, 532);
  } else {
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = `400 18px ${HUD_FONT}`;
    ctx.fillText('Tekan 1, 2, 3 atau klik kartunya', W / 2, 532);
  }
  ctx.restore();
}

// Greedy word wrap for one short description, left-aligned.
function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}
function drawNightClear(ctx, world) {
  scrim(ctx, 0.35);
  const total = 2.8;
  const elapsed = total - world.bannerTimer;
  const enter = Math.min(1, elapsed / 0.35);
  const exit = Math.min(1, Math.max(0, world.bannerTimer / 0.4));
  const alpha = Math.min(enter, exit);
  const rise = Math.pow(1 - enter, 3) * 16; // ease-out cubic: 16px -> 0
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.amberSoft;
  ctx.font = `700 72px ${TITLE_FONT}`;
  ctx.fillText(`Malam ${world.night} terlewati`, W / 2, H / 2 - 48 + rise);
  ctx.fillStyle = COLORS.hud;
  ctx.font = `400 24px ${HUD_FONT}`;
  ctx.fillText(`Skor ${world.score}  •  ${world.saved} kunang diselamatkan`, W / 2, H / 2 + 16 + rise);
  // The upgrade picked after this night, named on the banner.
  let fogY = H / 2 + 56 + rise;
  if (world.lastUpgrade) {
    ctx.fillStyle = COLORS.amber;
    ctx.font = `700 20px ${HUD_FONT}`;
    ctx.fillText(
      `Dipilih: ${world.lastUpgrade.name} (Lv${world.upgrades[world.lastUpgrade.id]})`,
      W / 2, H / 2 + 56 + rise,
    );
    fogY = H / 2 + 92 + rise;
  }
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = `400 19px ${HUD_FONT}`;
  ctx.fillText(world.night < 5 ? 'Kabut menebal. Kelelawar makin berani.' : '', W / 2, fogY);
  ctx.restore();
}

function drawDawn(ctx, world) {
  scrim(ctx, 0.25);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff3c4';
  ctx.font = `700 84px ${TITLE_FONT}`;
  ctx.fillText('Fajar tiba', W / 2, 208);
  ctx.fillStyle = COLORS.hud;
  ctx.font = `italic 400 26px ${TITLE_FONT}`;
  ctx.fillText('Lima malam kau jaga cahayanya. Lembah pun terang kembali.', W / 2, 280);
  drawStats(ctx, world, 352);
  ctx.fillStyle = COLORS.amber;
  ctx.font = `700 26px ${HUD_FONT}`;
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 2.4);
  ctx.globalAlpha = pulse;
  ctx.fillText('Tekan R atau klik untuk bermain lagi', W / 2, 560);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawGameOver(ctx, world) {
  scrim(ctx, 0.62);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff8a7a';
  ctx.font = `700 72px ${TITLE_FONT}`;
  ctx.fillText('Lentera Padam', W / 2, 200);
  ctx.fillStyle = COLORS.hud;
  ctx.font = `italic 400 24px ${TITLE_FONT}`;
  ctx.fillText('Malam menelan cahaya terakhir lembah itu.', W / 2, 268);
  drawStats(ctx, world, 332);
  ctx.fillStyle = COLORS.amber;
  ctx.font = `700 26px ${HUD_FONT}`;
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 2.4);
  ctx.globalAlpha = pulse;
  ctx.fillText('Tekan R atau klik untuk mencoba lagi', W / 2, 540);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawStats(ctx, world, y) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.hud;
  ctx.font = `700 30px ${HUD_FONT}`;
  ctx.fillText(`Skor akhir ${world.score}`, W / 2, y);
  ctx.font = `400 21px ${HUD_FONT}`;
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText(
    `Kunang diselamatkan ${world.saved}   •   Kombo terbaik x${world.bestCombo}   •   Malam ${world.night} / 5`,
    W / 2,
    y + 44,
  );
  if (world.score > 0 && world.score >= world.bestScore) {
    ctx.fillStyle = COLORS.amber;
    ctx.font = `700 20px ${HUD_FONT}`;
    ctx.fillText('Skor terbaik baru', W / 2, y + 92);
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
