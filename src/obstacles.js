// Scrolling obstacle pairs: clothes from the top, bedpost or coil from the bottom.

import { CONFIG } from './config.js';
import { drawAsset, hitboxesFor } from './sprites.js';

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export class Obstacles {
  constructor() {
    this.reset();
  }

  reset() {
    this.pairs = [];
    this.nextX = CONFIG.FIRST_PAIR_X;
  }

  spawn(x) {
    const gap = CONFIG.GAP_SIZE;
    const maxTop = Math.min(CONFIG.LONGEST_TOP, CONFIG.FLOOR_Y - gap - CONFIG.MIN_TOP);
    const gapTop = Math.round(randRange(CONFIG.MIN_TOP, maxTop));
    this.pairs.push({
      x,
      gapTop,
      gapBottom: gapTop + gap,
      bottomKey: Math.random() < 0.5 ? 'bedpost' : 'coil',
      passed: false,
    });
  }

  // Returns the number of pairs passed this step.
  update(dt, mosquitoLeft) {
    const dx = CONFIG.SCROLL_SPEED * dt;
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

  hitboxes() {
    const out = [];
    for (const p of this.pairs) {
      const r = this.rects(p);
      out.push(...hitboxesFor(r.top.key, r.top.rect));
      out.push(...hitboxesFor(r.bottom.key, r.bottom.rect));
    }
    return out;
  }

  draw(ctx) {
    for (const p of this.pairs) {
      const r = this.rects(p);
      drawAsset(ctx, r.top.key, r.top.rect);
      drawAsset(ctx, r.bottom.key, r.bottom.rect);
    }
  }
}
