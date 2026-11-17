// Sprite atlas for Kunang round 5 (visual overhaul).
// The v2 sprites live in game/assets/ (procedural PNGs, polished from real
// photo references — see ~/workspace/makefun/kunang-sprites/README-v2.md).
// They are NOT AI-generated, and they are not hand-drawn final art either:
// vector shapes drawn in code from real references. The game loads them
// once at boot; every render function falls back to the procedural drawing
// when a file fails to load, so a missing file can never break the game.
//
// The mapping table below is pure data (no DOM), so node unit tests can
// import it: every bat type maps to one sprite file and one on-screen
// width. The widths stay close to the procedural silhouettes they replace
// (swift ~64px, hunter ~68px, tank ~126px, boss ~478px at scale 1), with
// the small bats nudged a little larger so they still read at contact
// sheet size. The hitboxes never change: they come from config.js.

export const SPRITE_FILES = {
  sky: 'assets/bg-sky-v2.png',
  trees: 'assets/bg-trees-v2.png',
  grass: 'assets/bg-grass-v2.png',
  fireflyBright: 'assets/firefly-bright-v2.png',
  fireflyDim: 'assets/firefly-dim-v2.png',
  fireflyTrail: 'assets/firefly-trail-v2.png',
  batSwift: 'assets/bat-swift-v2.png',
  batBig: 'assets/bat-big-v2.png',
  batBoss: 'assets/bat-boss-v2.png',
  lanternLit: 'assets/lantern-lit-v2.png',
  lanternOff: 'assets/lantern-off-v2.png',
  lanternPulse: 'assets/lantern-pulse-v2.png',
  // Derived from lantern-pulse-v2.png (same file, lantern erased with a
  // feathered mask): the organic halo alone, so the game's own lantern
  // stays the only lantern in the frame. Built by a script, not by hand.
  pulseHalo: 'assets/pulse-halo-v2.png',
  glow: 'assets/glow-v2.png',
  sparkle: 'assets/sparkle-v2.png',
};

// Native pixel size of each sprite file (checked by the unit suite).
export const SPRITE_SIZES = {
  sky: [1280, 720],
  trees: [1280, 720],
  grass: [1280, 720],
  fireflyBright: [96, 96],
  fireflyDim: [96, 96],
  fireflyTrail: [192, 96],
  batSwift: [160, 90],
  batBig: [220, 130],
  batBoss: [320, 190],
  lanternLit: [120, 160],
  lanternOff: [120, 160],
  lanternPulse: [200, 200],
  pulseHalo: [200, 200],
  glow: [512, 512],
  sparkle: [128, 128],
};

// Bat type -> sprite file + on-screen draw width in logical pixels.
// Hunter and tank share bat-big-v2 (the set has no separate tank art);
// the size gap (96 vs 150) plus their speed and behaviour is what tells
// them apart, same as the procedural silhouettes did.
export const BAT_SPRITE = {
  swift: { file: 'batSwift', width: 84 },
  hunter: { file: 'batBig', width: 96 },
  tank: { file: 'batBig', width: 150 },
  boss: { file: 'batBoss', width: 460 },
};

export function batSpriteFor(type) {
  return BAT_SPRITE[type] || BAT_SPRITE.hunter;
}

// Draw height for a bat sprite at its mapped width (keeps the file's
// aspect ratio; the sprite is drawn centred on the bat's position).
export function batDrawHeight(type) {
  const m = batSpriteFor(type);
  const [nw, nh] = SPRITE_SIZES[m.file];
  return (m.width * nh) / nw;
}

// Firefly sprite draw size: the sprite's glow fills most of its 96px
// frame, so ~7x the simulation size lands the visible glow where the
// procedural radial gradient used to be (size * 3.2 radius).
export function fireflyDrawSize(f) {
  return f.size * 7;
}

// Crescent moon geometry (pure, so the unit suite can check it): the
// moon is one filled path, an outer disc with the inner disc cut out of
// it counter-clockwise — never a solid-colour disc painted over the sky,
// which is what made the old moon read as a dark disc over its halo.
export function moonCrescent(mx, my) {
  return {
    outer: { x: mx, y: my, r: 34 },
    inner: { x: mx + 16, y: my - 8, r: 30, ccw: true },
  };
}

// Loaded images. `ready` is true only when every file loaded and decoded;
// `img` holds the Image per key (a failed file is simply absent, and the
// render code falls back to procedural drawing for that one sprite).
export const Sprites = {
  ready: false,
  failed: [],
  img: {},
};

function loadOne(key, src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // decode() resolves only when the pixels are really there, so a
      // deterministic ?shot= frame can never catch a half-loaded sprite.
      if (typeof img.decode === 'function') {
        img.decode().then(() => resolve({ key, img })).catch(() => resolve({ key, img: null }));
      } else {
        resolve({ key, img });
      }
    };
    img.onerror = () => resolve({ key, img: null });
    img.src = src;
  });
}

// Load every sprite. Resolves when all have settled (loaded or failed);
// the game never blocks forever on a missing file.
export async function loadSprites() {
  const results = await Promise.all(
    Object.entries(SPRITE_FILES).map(([key, src]) => loadOne(key, src)),
  );
  Sprites.failed = [];
  Sprites.img = {};
  for (const { key, img } of results) {
    if (img && img.complete && img.naturalWidth > 0) {
      Sprites.img[key] = img;
    } else {
      Sprites.failed.push(key);
    }
  }
  Sprites.ready = Sprites.failed.length === 0;
  return Sprites;
}

// One image, or null when it failed to load (render falls back).
export function sprite(key) {
  return Sprites.img[key] || null;
}
