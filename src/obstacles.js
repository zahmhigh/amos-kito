// Scrolling obstacle pairs: clothes from the top, bedpost or coil from the bottom.

import { CONFIG } from './config.js';
import { drawObstacle, hitboxesFor, buildCoilArt } from './sprites.js';

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

// Difficulty ramp: speed and gap for a given score.
function rampSteps(bites, every) {
  return Math.floor(Math.max(0, bites - CONFIG.RAMP_START_BITES) / every);
}

export function speedFor(bites) {
  const s = CONFIG.SCROLL_SPEED + CONFIG.RAMP_SPEED_STEP * rampSteps(bites, CONFIG.RAMP_SPEED_EVERY);
  return Math.min(s, CONFIG.RAMP_SPEED_MAX);
}

export function gapFor(bites) {
  const g = CONFIG.GAP_SIZE - CONFIG.RAMP_GAP_STEP * rampSteps(bites, CONFIG.RAMP_GAP_EVERY);
  return Math.max(g, CONFIG.RAMP_GAP_MIN);
}

export class Obstacles {
  constructor() {
    this.reset();
  }

  reset() {
    this.pairs = [];
    this.nextX = CONFIG.FIRST_PAIR_X;
    this.setBites(0);
  }

  // Called with the current score; new pairs use the gap, all pairs the speed.
  setBites(bites) {
    this.speed = speedFor(bites);
    this.gap = gapFor(bites);
  }

  spawn(x) {
    const gap = this.gap;
    const maxTop = Math.min(CONFIG.LONGEST_TOP, CONFIG.FLOOR_Y - gap - CONFIG.MIN_TOP);
    const gapTop = Math.round(randRange(CONFIG.MIN_TOP, maxTop));
    const pair = {
      x,
      gapTop,
      gapBottom: gapTop + gap,
      bottomKey: Math.random() < 0.5 ? 'bedpost' : 'coil',
      passed: false,
      art: {},
    };
    // Coil smoke is fitted to this obstacle's length once, at spawn.
    if (pair.bottomKey === 'coil') pair.art.coil = buildCoilArt(CONFIG.FLOOR_Y - pair.gapBottom);
    this.pairs.push(pair);
  }

  // Returns the number of pairs passed this step.
  update(dt, mosquitoLeft) {
    const dx = this.speed * dt;
    const period = CONFIG.OBSTACLE_WIDTH + CONFIG.PAIR_SPACING;

    for (const p of this.pairs) p.x -= dx;
    this.nextX -= dx;

    while (this.nextX < CONFIG.WIDTH + period) {
      this.spawn(this.nextX);
      this.nextX += period;
    }

    let scored = 0;
    for (const p of this.pairs) {
      if (!p.passed && p.x + CONFIG.OBSTACLE_WIDTH < mosquitoLeft) {
        p.passed = true;
        scored++;
      }
    }
    this.pairs = this.pairs.filter((p) => p.x + CONFIG.OBSTACLE_WIDTH > -10);
    return scored;
  }

  // On-screen rects for each obstacle in a pair.
  rects(p) {
    const w = CONFIG.OBSTACLE_WIDTH;
    return {
      top: { key: 'clothes', rect: { x: p.x, y: 0, w, h: p.gapTop } },
      bottom: { key: p.bottomKey, rect: { x: p.x, y: p.gapBottom, w, h: CONFIG.FLOOR_Y - p.gapBottom } },
    };
  }

  // Every solid box, tagged with what it belongs to ('clothes', 'bedpost' or
  // 'coil'; the coil's smoke box counts as 'coil').
  hitboxes() {
    const out = [];
    for (const p of this.pairs) {
      const r = this.rects(p);
      for (const side of [r.top, r.bottom]) {
        for (const b of hitboxesFor(side.key, side.rect)) out.push({ ...b, key: side.key });
      }
    }
    return out;
  }

  draw(ctx, opts = {}) {
    for (const p of this.pairs) {
      const r = this.rects(p);
      drawObstacle(ctx, r.top.key, r.top.rect, p.art, opts);
      drawObstacle(ctx, r.bottom.key, r.bottom.rect, p.art, opts);
    }
  }
}
