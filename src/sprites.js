// Asset table, loader and animation helpers.
//
// Every asset lists its file, frame size, frame count, fps, on-screen draw size
// and its hitboxes in on-screen pixels (never percentages).
//
// Hitbox / placeholder part format, relative to the asset's on-screen rect:
//   x, w           horizontal offset and width
//   top, h         anchored to the rect's top edge
//   bottom, h      anchored to the rect's bottom edge
//   top, bottom    insets from both edges (stretches with the obstacle)
//
// `anchor` says which edge of an obstacle stays fixed when it is cropped.

import { CONFIG } from './config.js';

export const ASSETS = {
  mosquito: {
    file: 'assets/sprites/mosquito_fly.png',
    frameW: 128, frameH: 109, frames: 4, fps: 1000 / CONFIG.WING_FRAME_MS,
    drawW: 64, drawH: 54,
    // Body only: no wings, no legs, no nose.
    hitboxes: [{ x: 22, y: 22, w: 22, h: 14 }],
    placeholder: [
      { x: 18, y: 8, w: 22, h: 12, color: '#c9d6df' },   // wings
      { x: 20, y: 20, w: 26, h: 18, color: '#3b2a24' },  // body
      { x: 42, y: 18, w: 12, h: 12, color: '#3b2a24' },  // head
      { x: 54, y: 24, w: 10, h: 2, color: '#3b2a24' },   // nose
      { x: 47, y: 20, w: 5, h: 5, color: '#38e1f0' },    // eye
      { x: 8, y: 36, w: 28, h: 3, color: '#3b2a24' },    // legs
    ],
  },
  mosquito_dazed: {
    file: 'assets/sprites/mosquito_dazed.webp',
    frameW: 480, frameH: 238, frames: 1, fps: 0,
    drawW: 72, drawH: 36,
    placeholder: [
      { x: 6, y: 18, w: 60, h: 14, color: '#3b2a24' },
      { x: 20, y: 2, w: 6, h: 6, color: '#ffd23f' },
      { x: 34, y: 0, w: 6, h: 6, color: '#ffd23f' },
      { x: 48, y: 2, w: 6, h: 6, color: '#ffd23f' },
    ],
  },
  clothes: {
    file: 'assets/images/obstacle_clothes.webp',
    frameW: 160, frameH: 770, frames: 1, fps: 0,
    drawW: CONFIG.OBSTACLE_WIDTH, drawH: CONFIG.CLOTHES_HEIGHT,
    anchor: 'bottom', // bottom garment sits at the gap
    hitboxes: [{ x: 6, w: 58, top: 0, bottom: 0 }],
    placeholder: [
      { x: 33, w: 4, top: 0, bottom: 0, color: '#8a7f73' },        // line
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
    drawW: CONFIG.OBSTACLE_WIDTH, drawH: 400,
    anchor: 'top', // carved top at the gap, base runs off the bottom
    hitboxes: [
      { x: 8, w: 54, top: 0, h: 34 },     // carved top
      { x: 20, w: 30, top: 34, bottom: 0 }, // post
    ],
    placeholder: [
      { x: 6, w: 58, top: 0, h: 36, color: '#8b5a2b' },
      { x: 18, w: 34, top: 36, bottom: 0, color: '#6e4420' },
    ],
  },
  coil: {
    file: 'assets/images/obstacle_coil.webp',
    frameW: 140, frameH: 627, frames: 1, fps: 0,
    drawW: CONFIG.OBSTACLE_WIDTH, drawH: 313,
    anchor: 'bottom', // coil stays on the floor, smoke stretches up to the gap
    hitboxes: [
      { x: 22, w: 26, top: 0, bottom: 45 }, // smoke column, full height
      { x: 4, w: 62, bottom: 0, h: 45 },    // coil
    ],
    placeholder: [
      { x: 22, w: 26, top: 0, bottom: 45, color: 'rgba(200,200,210,0.55)' },
      { x: 2, w: 66, bottom: 0, h: 45, color: '#2f6b3a' },
    ],
  },
  sleeper: {
    file: 'assets/images/sleeper_asleep.webp',
    frameW: 480, frameH: 228, frames: 1, fps: 0,
    drawW: 240, drawH: 114,
    placeholder: [
      { x: 0, y: 40, w: 240, h: 60, color: '#4a3b5c' },
      { x: 10, y: 20, w: 40, h: 30, color: '#6b4f3a' },
      { x: 0, y: 100, w: 10, h: 14, color: '#3a2a1a' },
      { x: 230, y: 100, w: 10, h: 14, color: '#3a2a1a' },
    ],
  },
  fan: {
    file: 'assets/images/fan_still.webp',
    frameW: 124, frameH: 336, frames: 1, fps: 0,
    drawW: 62, drawH: 168,
    placeholder: [
      { x: 2, y: 0, w: 58, h: 58, color: '#5d6d7e' },
      { x: 28, y: 58, w: 6, h: 96, color: '#4d5656' },
      { x: 8, y: 154, w: 46, h: 14, color: '#4d5656' },
    ],
  },
};

const images = {};

// Loads art when CONFIG.LOAD_ART is on. Missing images fall back to boxes.
export function loadAssets() {
  if (!CONFIG.LOAD_ART) return Promise.resolve();
  const jobs = Object.entries(ASSETS).map(([key, a]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { images[key] = img; resolve(); };
    img.onerror = () => resolve();
    img.src = a.file;
  }));
  return Promise.all(jobs);
}

export function getImage(key) {
  return images[key] || null;
}

// Current frame index for a looping animation.
export function frameAt(key, timeS) {
  const a = ASSETS[key];
  if (a.frames <= 1 || !a.fps) return 0;
  return Math.floor(timeS * a.fps) % a.frames;
}

// Turn a part spec into an absolute box inside rect {x, y, w, h}.
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

// Draw an asset into rect. Uses the image if loaded, otherwise coloured boxes.
export function drawAsset(ctx, key, rect, timeS = 0) {
  const a = ASSETS[key];
  const img = getImage(key);
  if (img) {
    const f = frameAt(key, timeS);
    ctx.drawImage(img, f * a.frameW, 0, a.frameW, a.frameH, rect.x, rect.y, rect.w, rect.h);
    return;
  }
  for (const p of a.placeholder) {
    const b = resolvePart(p, rect);
    ctx.fillStyle = p.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
}

export function boxesOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
