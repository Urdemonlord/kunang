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
  // Screen shake after a bat hit: a small random offset that dies fast.
  if (world.lantern.shake > 0) {
    const s = world.lantern.shake * 7;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawSky(ctx, world);
  drawStars(ctx, world);
  drawMoon(ctx, world);
  drawGround(ctx, world);
  drawLightCone(ctx, world);
  drawLanternGlow(ctx, world);
  drawFireflies(ctx, world);
  drawBats(ctx, world);
  drawLantern(ctx, world);
  drawFog(ctx, world);
  drawVignette(ctx);
  ctx.restore();
  drawHud(ctx, world);
  drawOverlay(ctx, world);
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
  // Handle.
  ctx.strokeStyle = '#3a2c18';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(lx, ly - 34, 14, Math.PI, 0);
  ctx.stroke();
  // Body: warm glass with a dark iron frame.
  const glass = ctx.createLinearGradient(lx - 20, ly - 28, lx + 20, ly + 22);
  glass.addColorStop(0, '#ffd98a');
  glass.addColorStop(1, '#ff9e2c');
  ctx.fillStyle = glass;
  roundRect(ctx, lx - 20, ly - 28, 40, 52, 8);
  ctx.fill();
  ctx.strokeStyle = '#2c2113';
  ctx.lineWidth = 3;
  roundRect(ctx, lx - 20, ly - 28, 40, 52, 8);
  ctx.stroke();
  // Frame bars and caps.
  ctx.fillStyle = '#2c2113';
  ctx.fillRect(lx - 22, ly - 30, 44, 6);
  ctx.fillRect(lx - 22, ly + 20, 44, 6);
  ctx.fillRect(lx - 2, ly - 28, 4, 50);
  // Flame, flickering.
  const fl = 1 + Math.sin(world.time * 9) * 0.12;
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.ellipse(lx, ly + 2, 6 * fl, 11 * fl, 0, 0, Math.PI * 2);
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

function drawHud(ctx, world) {
  if (world.state === 'title') return;
  ctx.save();
  ctx.textBaseline = 'top';
  // Score, top left.
  ctx.fillStyle = COLORS.hud;
  ctx.font = `700 30px ${HUD_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`Skor ${world.score}`, 24, 18);
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
  ctx.fillRect(W / 2 - 90, 52, 180, 5);
  ctx.fillStyle = COLORS.amber;
  ctx.fillRect(W / 2 - 90, 52, 180 * prog, 5);
  // Lives (little lanterns) and pulse charges, top right.
  ctx.textAlign = 'right';
  for (let i = 0; i < 3; i++) {
    drawMiniLantern(ctx, W - 30 - i * 34, 34, i < world.lantern.lives);
  }
  ctx.fillStyle = COLORS.hud;
  ctx.font = `700 18px ${HUD_FONT}`;
  ctx.fillText(`Kunang diselamatkan ${world.saved}`, W - 24, 56);
  // Pulse charges as glowing dots under the lives.
  for (let i = 0; i < PULSE.max; i++) {
    const cx = W - 32 - i * 26;
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
  ctx.font = `400 13px ${HUD_FONT}`;
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText('Spasi: kilau', W - 24, 112);
  // Mute state, bottom right, quiet and small.
  ctx.font = `400 13px ${HUD_FONT}`;
  ctx.fillText(world.audio.muted ? 'Suara: mati (M)' : 'Suara: hidup (M)', W - 24, H - 26);
  ctx.restore();
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

function drawTitle(ctx, world) {
  scrim(ctx, 0.45);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.amberSoft;
  ctx.font = `400 26px ${TITLE_FONT}`;
  ctx.fillText('— K U N A N G —', W / 2, 158);
  ctx.fillStyle = COLORS.hud;
  ctx.font = `700 110px ${TITLE_FONT}`;
  ctx.fillText('Kunang', W / 2, 248);
  ctx.fillStyle = COLORS.amber;
  ctx.font = `italic 400 30px ${TITLE_FONT}`;
  ctx.fillText('Penjaga Lentera', W / 2, 322);
  ctx.fillStyle = COLORS.hud;
  ctx.font = `400 20px ${HUD_FONT}`;
  ctx.fillText('Lima malam. Satu lentera terakhir. Bawa kunang-kunang pulang,', W / 2, 388);
  ctx.fillText('jangan biarkan kelelawar memadamkan cahayamu.', W / 2, 416);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = `400 17px ${HUD_FONT}`;
  ctx.fillText('Gerakkan lentera dengan mouse atau ← →  •  Spasi / klik: kilau pengusir kelelawar  •  P: jeda  •  M: suara', W / 2, 478);
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

function drawPause(ctx, world) {
  scrim(ctx, 0.55);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.hud;
  ctx.font = `700 64px ${TITLE_FONT}`;
  ctx.fillText('Jeda', W / 2, H / 2 - 30);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = `400 20px ${HUD_FONT}`;
  ctx.fillText('Tekan P untuk melanjutkan', W / 2, H / 2 + 30);
  ctx.restore();
}

function drawNightClear(ctx, world) {
  scrim(ctx, 0.35);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.amberSoft;
  ctx.font = `700 72px ${TITLE_FONT}`;
  ctx.fillText(`Malam ${world.night} Terlewati`, W / 2, H / 2 - 50);
  ctx.fillStyle = COLORS.hud;
  ctx.font = `400 24px ${HUD_FONT}`;
  ctx.fillText(`Skor ${world.score}  •  ${world.saved} kunang diselamatkan`, W / 2, H / 2 + 16);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = `400 19px ${HUD_FONT}`;
  ctx.fillText(world.night < 5 ? 'Kabut menebal. Kelelawar makin berani.' : '', W / 2, H / 2 + 56);
  ctx.restore();
}

function drawDawn(ctx, world) {
  scrim(ctx, 0.25);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff3c4';
  ctx.font = `700 84px ${TITLE_FONT}`;
  ctx.fillText('FAJAR TIBA', W / 2, 210);
  ctx.fillStyle = COLORS.hud;
  ctx.font = `italic 400 26px ${TITLE_FONT}`;
  ctx.fillText('Lima malam kau jaga cahayanya. Lembah pun terang kembali.', W / 2, 282);
  drawStats(ctx, world, 350);
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
  drawStats(ctx, world, 330);
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
  ctx.fillText(`Skor akhir  ${world.score}`, W / 2, y);
  ctx.font = `400 21px ${HUD_FONT}`;
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText(
    `Kunang diselamatkan ${world.saved}   •   Kombo terbaik x${world.bestCombo}   •   Malam ${world.night} / 5`,
    W / 2,
    y + 46,
  );
  if (world.score > 0 && world.score >= world.bestScore) {
    ctx.fillStyle = COLORS.amber;
    ctx.font = `700 20px ${HUD_FONT}`;
    ctx.fillText('★ Skor terbaik baru ★', W / 2, y + 92);
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
