// Render: every pixel of Kunang is drawn here, on one canvas.
// Sky, stars, moon, drifting fog, the valley floor, the lantern's warm
// cone of light, glowing fireflies with trails, bat silhouettes with red
// eyes, the vignette, the HUD, and every menu screen. Palette: deep
// indigo night against warm amber light, so the scene reads at a glance
// even when the screenshot is shrunk to a contact sheet.

import { W, H, GROUND_Y, COLORS, LANTERN, PULSE } from './config.js';
import { coneHalfWidthAt } from './fireflies.js';

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
  drawFireflies(ctx, world);
  drawBats(ctx, world);
  drawLantern(ctx, world);
  drawParticles(ctx, world);
  drawPopups(ctx, world);
  drawFog(ctx, world);
  drawVignette(ctx);
  drawHitFlash(ctx, world);
  ctx.restore();
  drawHud(ctx, world);
  drawOverlay(ctx, world);
}

// Save-burst particles: small amber sparks that arc and fade.
function drawParticles(ctx, world) {
  if (world.feel.particles.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of world.feel.particles) {
    const a = 1 - p.life / p.maxLife;
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

function drawSky(ctx, world) {
  const dawn = world.state === 'dawn';
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
  // Low on the right, clear of the HUD block at the top.
  const mx = W - 130;
  const my = 215;
  const glow = ctx.createRadialGradient(mx, my, 8, mx, my, 90);
  glow.addColorStop(0, 'rgba(232, 236, 255, 0.35)');
  glow.addColorStop(1, 'rgba(232, 236, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(mx - 90, my - 90, 180, 180);
  // Crescent: a pale disc with the night sky cut out of it.
  ctx.fillStyle = '#eef1ff';
  ctx.beginPath();
  ctx.arc(mx, my, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.skyTop;
  ctx.beginPath();
  ctx.arc(mx + 16, my - 8, 30, 0, Math.PI * 2);
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
// step where the clip cut it; slices have no edge at all.
let coneSprite = null;

function buildConeSprite() {
  if (coneSprite) return coneSprite;
  const pad = 30;
  const w = Math.ceil((LANTERN.coneHalfBottom + pad) * 2);
  const h = LANTERN.y - LANTERN.coneTopY;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const cx = w / 2;
  for (let y = 0; y < h; y += 6) {
    const worldY = LANTERN.coneTopY + y;
    const half = coneHalfWidthAt(worldY);
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
  const sprite = buildConeSprite();
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
  const r = 150 * flicker * flash;
  const g = ctx.createRadialGradient(lx, ly, 10, lx, ly, r);
  g.addColorStop(0, `rgba(255, 190, 90, ${0.5 * flash})`);
  g.addColorStop(0.45, 'rgba(255, 160, 60, 0.18)');
  g.addColorStop(1, 'rgba(255, 160, 60, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
  ctx.restore();
}

function drawFireflies(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const f of world.fireflies) {
    const tw = 0.65 + 0.35 * Math.sin(world.time * 3 + f.twinkle);
    // Trail: the last few positions fading out behind the dot.
    for (let i = 0; i < f.trail.length; i++) {
      const p = f.trail[i];
      const a = (i / f.trail.length) * 0.22 * tw;
      ctx.fillStyle = `rgba(216, 255, 122, ${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, f.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 3.2);
    glow.addColorStop(0, `rgba(216, 255, 122, ${0.75 * tw})`);
    glow.addColorStop(1, 'rgba(216, 255, 122, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.size * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.fireflyCore;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.size * 0.62, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBats(ctx, world) {
  for (const bat of world.bats) {
    const flap = Math.sin(bat.flap) * 0.9;
    ctx.save();
    ctx.translate(bat.x, bat.y);
    ctx.scale(bat.dir, 1);
    ctx.fillStyle = COLORS.bat;
    // Wings: two broad arcs that beat with the flap.
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
    // Body and ears.
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2);
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
  // Lives (little lanterns) and pulse charges, top right.
  ctx.textAlign = 'right';
  for (let i = 0; i < 3; i++) {
    drawMiniLantern(ctx, W - 32 - i * 32, 32, i < world.lantern.lives);
  }
  ctx.fillStyle = COLORS.hud;
  ctx.font = `700 18px ${HUD_FONT}`;
  ctx.fillText(`Diselamatkan ${world.saved}`, W - 24, 56);
  // Pulse charges as glowing dots under the lives.
  for (let i = 0; i < PULSE.max; i++) {
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

// Night-clear banner: rises 16px and fades in over 0.35 s (ease-out),
// fades out over the last 0.4 s. One entrance, one easing curve.
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
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = `400 19px ${HUD_FONT}`;
  ctx.fillText(world.night < 5 ? 'Kabut menebal. Kelelawar makin berani.' : '', W / 2, H / 2 + 56 + rise);
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
