// Asset table, loader, pre-baked variants and drawing helpers.
//
// Each sprite sheet is one horizontal row of equal-size frames.
// Sizes and hitboxes are in on-screen pixels (never percentages).
//
// Hitbox / placeholder part format, relative to the asset's on-screen rect:
//   x, y, w, h     plain box (mosquito, room objects)
//   x, w, top, h   anchored to the rect's top edge
//   x, w, bottom, h  anchored to the rect's bottom edge
//   x, w, top, bottom  insets from both edges (stretches with the obstacle)
//
// Obstacle rects are the 70 px column the obstacle occupies. `anchor` is the
// edge that stays put when the tall image is cropped to the obstacle's height.

import { CONFIG } from './config.js';

const MOSQ_SCALE = CONFIG.MOSQUITO_DRAW_W / 128;

export const ASSETS = {
  // ---- Amos ----
  mosquito: {
    file: 'assets/sprites/mosquito_fly.png',
    frameW: 128, frameH: 109, frames: 4, fps: 1000 / CONFIG.WING_FRAME_MS,
    drawW: CONFIG.MOSQUITO_DRAW_W, drawH: 109 * MOSQ_SCALE,
    outline: true,
    // Body only (head, thorax, front of abdomen): no wings, legs or nose.
    hitboxes: [{ x: 26, y: 21, w: 26, h: 13 }],
    placeholder: [
      { x: 14, y: 4, w: 22, h: 14, color: '#c9d6df' },
      { x: 20, y: 22, w: 26, h: 12, color: '#5a3b2c' },
      { x: 38, y: 18, w: 14, h: 14, color: '#5a3b2c' },
      { x: 52, y: 26, w: 14, h: 2, color: '#5a3b2c' },
      { x: 44, y: 21, w: 5, h: 5, color: '#38e1f0' },
      { x: 8, y: 36, w: 30, h: 3, color: '#5a3b2c' },
    ],
  },
  mosquito_dazed: {
    file: 'assets/sprites/mosquito_dazed.webp',
    frameW: 480, frameH: 238, frames: 1, fps: 0,
    drawW: CONFIG.DAZED_ROOM_W, drawH: 238 * (CONFIG.DAZED_ROOM_W / 480),
    outline: true,
    placeholder: [
      { x: 6, y: 18, w: 60, h: 14, color: '#5a3b2c' },
      { x: 20, y: 2, w: 6, h: 6, color: '#ffd23f' },
      { x: 34, y: 0, w: 6, h: 6, color: '#ffd23f' },
      { x: 48, y: 2, w: 6, h: 6, color: '#ffd23f' },
    ],
  },

  // ---- Obstacles ----
  clothes: {
    file: 'assets/images/obstacle_clothes.webp',
    frameW: 160, frameH: 770, frames: 1, fps: 0,
    // Shown at half size: 80 x 385, garments ~57 px wide, centred on the column.
    drawW: 80, drawH: CONFIG.CLOTHES_HEIGHT, offsetX: -5,
    anchor: 'bottom', // bottom garment sits at the gap, top runs off screen
    obstacle: true,
    hitboxes: [{ x: 8, w: 54, top: 0, bottom: 0 }],
    placeholder: [
      { x: 33, w: 4, top: 0, bottom: 0, color: '#8a7f73' },
      { x: 4, w: 62, bottom: 0, h: 60, color: '#e0703a' },
      { x: 6, w: 58, bottom: 64, h: 60, color: '#3f88c5' },
      { x: 4, w: 62, bottom: 128, h: 60, color: '#e3b23c' },
      { x: 6, w: 58, bottom: 192, h: 60, color: '#44af69' },
      { x: 4, w: 62, bottom: 256, h: 60, color: '#d1495b' },
      { x: 6, w: 58, bottom: 320, h: 60, color: '#8e6bbf' },
    ],
  },
  bedpost: {
    file: 'assets/images/obstacle_bedpost.webp',
    frameW: 140, frameH: 800, frames: 1, fps: 0,
    drawW: 70, drawH: 400, offsetX: 0,
    anchor: 'top', // carved top at the gap, base runs off the bottom
    obstacle: true,
    hitboxes: [
      { x: 5, w: 60, top: 5, h: 48 },     // ball
      { x: 3, w: 64, top: 76, h: 22 },    // collar
      { x: 13, w: 43, top: 53, bottom: 0 }, // post
    ],
    placeholder: [
      { x: 6, w: 58, top: 0, h: 52, color: '#8b5a2b' },
      { x: 3, w: 64, top: 76, h: 22, color: '#8b5a2b' },
      { x: 13, w: 43, top: 52, bottom: 0, color: '#6e4420' },
    ],
  },
  coil: {
    file: 'assets/images/obstacle_coil.webp',
    frameW: 140, frameH: 627, frames: 1, fps: 0,
    drawW: 70, drawH: 313.5, offsetX: 0,
    anchor: 'bottom', // coil fixed on the floor, smoke stretched/trimmed above
    obstacle: true,
    hitboxes: [
      { x: 26, w: 26, top: 0, bottom: 40 }, // smoke column, ~26 px, full height
      { x: 2, w: 66, bottom: 16, h: 25 },   // coil
      { x: 17, w: 38, bottom: 0, h: 16 },   // stand
    ],
    placeholder: [
      { x: 26, w: 26, top: 0, bottom: 40, color: 'rgba(200,200,210,0.55)' },
      { x: 2, w: 66, bottom: 16, h: 25, color: '#2f8a3a' },
      { x: 17, w: 38, bottom: 0, h: 16, color: '#666' },
    ],
  },

  // ---- Room (fixed, does not scroll) ----
  bg_room: {
    file: 'assets/images/bg_room.webp',
    frameW: 720, frameH: 1280, frames: 1, fps: 0,
    drawW: CONFIG.WIDTH, drawH: CONFIG.HEIGHT,
    placeholder: [
      { x: 0, y: 0, w: 360, h: 76, color: '#b0743a' },
      { x: 0, y: 76, w: 360, h: 382, color: '#9bb46a' },
      { x: 0, y: 458, w: 360, h: 182, color: '#b8602c' },
      { x: 60, y: 145, w: 130, h: 150, color: '#2a3f6b' },
    ],
  },
  sleeper_asleep: {
    file: 'assets/images/sleeper_asleep.webp',
    frameW: 480, frameH: 228, frames: 1, fps: 0,
    drawW: CONFIG.SLEEPER_W, drawH: CONFIG.SLEEPER_H,
    placeholder: [
      { x: 0, y: 40, w: 240, h: 60, color: '#a33b2c' },
      { x: 160, y: 10, w: 50, h: 40, color: '#6b4f3a' },
      { x: 0, y: 100, w: 10, h: 14, color: '#6e4420' },
      { x: 230, y: 100, w: 10, h: 14, color: '#6e4420' },
    ],
  },
  sleeper_awake: {
    file: 'assets/images/sleeper_awake.webp',
    frameW: 480, frameH: 228, frames: 1, fps: 0,
    drawW: CONFIG.SLEEPER_W, drawH: CONFIG.SLEEPER_H,
    placeholder: [{ x: 0, y: 40, w: 240, h: 60, color: '#a33b2c' }],
  },
  fan_still: {
    file: 'assets/images/fan_still.webp',
    frameW: 124, frameH: 336, frames: 1, fps: 0,
    drawW: CONFIG.FAN_W, drawH: CONFIG.FAN_H,
    placeholder: [
      { x: 2, y: 0, w: 58, h: 58, color: '#8fb8c9' },
      { x: 28, y: 58, w: 6, h: 96, color: '#c9b48a' },
      { x: 8, y: 154, w: 46, h: 14, color: '#c9b48a' },
    ],
  },
  fan_spin: {
    file: 'assets/images/fan_spin.webp',
    frameW: 124, frameH: 336, frames: 1, fps: 0,
    drawW: CONFIG.FAN_W, drawH: CONFIG.FAN_H,
    placeholder: [{ x: 2, y: 0, w: 58, h: 58, color: '#8fb8c9' }],
  },
  logo: {
    file: 'assets/images/logo.webp',
    frameW: 600, frameH: 302, frames: 1, fps: 0,
    drawW: CONFIG.LOGO_W, drawH: 302 * (CONFIG.LOGO_W / 600),
    placeholder: [], // falls back to text on the title screen
  },
};

// ---------------------------------------------------------------------------
// Loading and pre-baking

const images = {};   // raw loaded images
const baked = {};    // key -> { frames: [canvas], white: [canvas], pad }  (outlined sprites)
const darkened = {}; // key -> canvas (obstacles, lightly darkened)

// Supersample factor for baked sprites, so they stay sharp on phone screens.
const BAKE_SCALE = 2;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

// Crisp silhouette of `src` in a flat colour (alpha thresholded, no soft edge).
function silhouette(src, color) {
  const c = makeCanvas(src.width, src.height);
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  const img = x.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  for (let i = 0; i < d.length; i += 4) {
    const on = d[i + 3] > 60;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = on ? 255 : 0;
  }
  x.putImageData(img, 0, 0);
  return c;
}

// Bake each frame at display size (x BAKE_SCALE) with a thin cream outline,
// plus an all-white version for the hit flash.
function bakeOutlined(key, img) {
  const a = ASSETS[key];
  const s = (a.drawW / a.frameW) * BAKE_SCALE;
  const ow = CONFIG.OUTLINE_PX * BAKE_SCALE;
  const pad = Math.ceil(ow) + 1;
  const fw = a.frameW * s;
  const fh = a.frameH * s;
  const frames = [];
  const white = [];
  for (let f = 0; f < a.frames; f++) {
    const plain = makeCanvas(fw + pad * 2, fh + pad * 2);
    plain.getContext('2d').drawImage(img, f * a.frameW, 0, a.frameW, a.frameH, pad, pad, fw, fh);

    const sil = silhouette(plain, CONFIG.OUTLINE_COLOR);
    const out = makeCanvas(plain.width, plain.height);
    const ox = out.getContext('2d');
    const steps = 16;
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      ox.drawImage(sil, Math.cos(t) * ow, Math.sin(t) * ow);
    }
    ox.drawImage(plain, 0, 0);
    frames.push(out);
    white.push(silhouette(plain, '#ffffff'));
  }
  baked[key] = { frames, white, pad: pad / BAKE_SCALE };
}

function bakeDarkened(key, img) {
  const c = makeCanvas(img.width, img.height);
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = `rgba(0,0,0,${CONFIG.OBSTACLE_DARKEN})`;
  x.fillRect(0, 0, c.width, c.height);
  darkened[key] = c;
}

// Load every asset. A file that fails to load keeps its coloured-box fallback.
export function loadAssets() {
  const jobs = Object.entries(ASSETS).map(([key, a]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        images[key] = img;
        if (a.outline) bakeOutlined(key, img);
        if (a.obstacle) bakeDarkened(key, img);
      } catch (e) {
        delete images[key]; // baking failed: fall back to boxes
      }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = a.file;
  }));
  return Promise.all(jobs);
}

export function hasImage(key) {
  return !!images[key];
}

// ---------------------------------------------------------------------------
// Geometry

export function frameAt(key, timeS) {
  const a = ASSETS[key];
  if (a.frames <= 1 || !a.fps) return 0;
  return Math.floor(timeS * a.fps) % a.frames;
}

export function resolvePart(p, rect) {
  let top, height;
  if (p.y !== undefined) { top = rect.y + p.y; height = p.h; }
  else if (p.top !== undefined && p.bottom !== undefined) {
    top = rect.y + p.top; height = rect.h - p.top - p.bottom;
  } else if (p.top !== undefined) { top = rect.y + p.top; height = p.h; }
  else { top = rect.y + rect.h - p.bottom - p.h; height = p.h; }
  return { x: rect.x + p.x, y: top, w: p.w, h: Math.max(0, height) };
}

export function hitboxesFor(key, rect) {
  return (ASSETS[key].hitboxes || []).map((p) => resolvePart(p, rect));
}

export function boxesOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---------------------------------------------------------------------------
// Drawing

export function drawPlaceholder(ctx, key, rect) {
  for (const p of ASSETS[key].placeholder) {
    const b = resolvePart(p, rect);
    ctx.fillStyle = p.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
}

// Draw a plain asset (room objects, logo, large dazed) into rect.
export function drawAsset(ctx, key, rect, timeS = 0) {
  const a = ASSETS[key];
  const img = images[key];
  if (!img) { drawPlaceholder(ctx, key, rect); return; }
  const f = frameAt(key, timeS);
  ctx.drawImage(img, f * a.frameW, 0, a.frameW, a.frameH, rect.x, rect.y, rect.w, rect.h);
}

// Draw an outlined sprite (Amos). `white` draws the hit-flash silhouette.
export function drawSprite(ctx, key, rect, frame = 0, { white = false } = {}) {
  const b = baked[key];
  if (!b) { drawPlaceholder(ctx, key, rect); return false; }
  const list = white ? b.white : b.frames;
  const c = list[frame % list.length];
  ctx.drawImage(c, rect.x - b.pad, rect.y - b.pad, c.width / BAKE_SCALE, c.height / BAKE_SCALE);
  return true;
}

// Coil art for one obstacle: the coil (bottom 90 px of the image) stays on the
// floor; the smoke above is trimmed or stretched to fit, top faded out.
// Built once per obstacle pair and cached on it, in a dark and a lit version.
export function buildCoilArt(lengthPx) {
  if (!images.coil) return null;
  return {
    dark: fitCoil(darkened.coil || images.coil, lengthPx),
    lit: fitCoil(images.coil, lengthPx),
  };
}

function fitCoil(src, lengthPx) {
  const a = ASSETS.coil;
  const scale = a.frameW / a.drawW;                // source px per screen px (2)
  const baseSrc = CONFIG.COIL_BASE_SRC_H;
  const smokeSrcFull = a.frameH - baseSrc;         // smoke height in the image
  const smokeScreen = Math.max(0, lengthPx - baseSrc / scale);
  const smokeOut = smokeScreen * scale;            // output smoke height (source px)

  const c = makeCanvas(a.frameW, smokeOut + baseSrc);
  const x = c.getContext('2d');
  // Coil: copied 1:1 at the bottom.
  x.drawImage(src, 0, smokeSrcFull, a.frameW, baseSrc, 0, c.height - baseSrc, a.frameW, baseSrc);
  if (smokeOut > 0) {
    if (smokeOut <= smokeSrcFull) {
      // Trim: keep the part of the smoke nearest the coil.
      x.drawImage(src, 0, smokeSrcFull - smokeOut, a.frameW, smokeOut, 0, 0, a.frameW, smokeOut);
    } else {
      // Stretch the whole column.
      x.drawImage(src, 0, 0, a.frameW, smokeSrcFull, 0, 0, a.frameW, smokeOut);
    }
    // Fade the top of the smoke.
    const fade = Math.min(CONFIG.COIL_SMOKE_FADE * scale, smokeOut);
    const g = x.createLinearGradient(0, 0, 0, fade);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = g;
    x.fillRect(0, 0, a.frameW, fade);
  }
  return c;
}

// Draw an obstacle into its column rect, cropping the tall image by its anchor.
// `cache` holds per-pair art (the coil); the canvas edge does the cropping.
// In the dark, obstacles use their lightly darkened version; when lit, the
// original. `sway` (px) leans the hanging clothes in the wind (visual only).
export function drawObstacle(ctx, key, rect, cache, { lit = false, sway = 0 } = {}) {
  const a = ASSETS[key];
  const img = lit ? images[key] : (darkened[key] || images[key]);
  if (!img) { drawPlaceholder(ctx, key, rect); return; }
  const x = rect.x + (a.offsetX || 0);

  if (key === 'coil') {
    const art = cache && cache.coil;
    if (!art) { drawPlaceholder(ctx, key, rect); return; }
    ctx.drawImage(lit ? art.lit : art.dark, x, rect.y, a.drawW, rect.h);
    return;
  }
  if (a.anchor === 'bottom') {
    // Bottom of the image at the rect's bottom; anything above y=0 is off screen.
    if (sway && key === 'clothes' && rect.h > 0) {
      // Hung from a line above the screen: skew so the bottom swings most.
      ctx.save();
      ctx.transform(1, 0, sway / rect.h, 1, 0, 0);
      ctx.drawImage(img, x, rect.y + rect.h - a.drawH, a.drawW, a.drawH);
      ctx.restore();
    } else {
      ctx.drawImage(img, x, rect.y + rect.h - a.drawH, a.drawW, a.drawH);
    }
  } else {
    // Top of the image at the rect's top; the base runs off the bottom.
    ctx.drawImage(img, x, rect.y, a.drawW, a.drawH);
  }
}
