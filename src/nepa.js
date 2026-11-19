// NEPA power event, fan gusts and the room's lighting.
// Phase 2: the room is always dark (light = 0). Phase 3 adds the power event,
// which raises `light` to 1 and back.

import { CONFIG } from './config.js';

const W = CONFIG.WIDTH;
const H = CONFIG.HEIGHT;
const LAYER_SCALE = 2; // bake the light layers at 2x so gradients stay smooth

function makeLayer() {
  const c = document.createElement('canvas');
  c.width = W * LAYER_SCALE;
  c.height = H * LAYER_SCALE;
  const x = c.getContext('2d');
  x.scale(LAYER_SCALE, LAYER_SCALE);
  return { c, x };
}

function radial(x, cx, cy, r, stops) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [t, col] of stops) g.addColorStop(t, col);
  return g;
}

export class Nepa {
  constructor() {
    this.light = 0; // 0 = dark (NEPA took light), 1 = fully lit
    this.darkLayer = null;
    this.glowLayer = null;
  }

  reset() {
    this.light = 0;
  }

  update() {}

  // Extra vertical drift (px/s) added to the mosquito's position. Zero for now.
  gust() { return 0; }

  isFanOn() { return this.light > 0.5; }
  isSleeperAwake() { return this.light > 0.5; }

  // Darkness with soft holes for the lamp and the moonlit window.
  buildDarkLayer() {
    const { c, x } = makeLayer();
    x.fillStyle = `rgba(6,8,20,${CONFIG.BG_DARKEN})`;
    x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = radial(x, CONFIG.LAMP_X, CONFIG.LAMP_Y, CONFIG.LAMP_GLOW_R, [
      [0, 'rgba(0,0,0,0.92)'], [0.35, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0)'],
    ]);
    x.fillRect(0, 0, W, H);
    x.fillStyle = radial(x, CONFIG.MOON_X, CONFIG.MOON_Y, CONFIG.MOON_R, [
      [0, `rgba(0,0,0,${CONFIG.MOON_STRENGTH})`], [1, 'rgba(0,0,0,0)'],
    ]);
    x.fillRect(0, 0, W, H);
    return c;
  }

  // Warm lamp glow and a cool hint of moonlight, added on top of the dark room.
  buildGlowLayer() {
    const { c, x } = makeLayer();
    x.fillStyle = radial(x, CONFIG.LAMP_X, CONFIG.LAMP_Y, CONFIG.LAMP_GLOW_R * 1.15, [
      [0, `rgba(255,196,110,${CONFIG.LAMP_GLOW_ALPHA})`],
      [0.4, `rgba(255,170,80,${CONFIG.LAMP_GLOW_ALPHA * 0.45})`],
      [1, 'rgba(255,150,60,0)'],
    ]);
    x.fillRect(0, 0, W, H);
    x.fillStyle = radial(x, CONFIG.MOON_X, CONFIG.MOON_Y, CONFIG.MOON_R, [
      [0, 'rgba(120,150,255,0.08)'], [1, 'rgba(120,150,255,0)'],
    ]);
    x.fillRect(0, 0, W, H);
    return c;
  }

  // The background art has the ceiling bulb painted on. In the dark, cover it
  // with an unlit bulb and dim its painted halo.
  drawUnlitBulb(ctx) {
    const dark = 1 - this.light;
    if (dark <= 0) return;
    const bx = CONFIG.BULB_X;
    const by = CONFIG.BULB_Y;
    ctx.save();
    ctx.globalAlpha = dark;
    ctx.fillStyle = radial(ctx, bx, by, 85, [[0, 'rgba(40,30,10,0.55)'], [1, 'rgba(40,30,10,0)']]);
    ctx.fillRect(bx - 90, 0, 180, by + 90);

    ctx.beginPath();
    ctx.moveTo(bx - 7, by - 16);
    ctx.lineTo(bx + 7, by - 16);
    // Round glass: arc from the right shoulder, under the bottom, to the left.
    ctx.arc(bx, by + 3, 13, -0.9, Math.PI + 0.9, false);
    ctx.closePath();
    const glass = ctx.createLinearGradient(bx - 13, by - 10, bx + 13, by + 16);
    glass.addColorStop(0, '#e9e4d6');
    glass.addColorStop(1, '#a8a294');
    ctx.fillStyle = glass;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#3b2c20';
    ctx.stroke();
    // Filament hint
    ctx.beginPath();
    ctx.moveTo(bx - 3, by - 6);
    ctx.lineTo(bx - 3, by + 2);
    ctx.moveTo(bx + 3, by - 6);
    ctx.lineTo(bx + 3, by + 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(80,70,60,0.7)';
    ctx.stroke();
    ctx.restore();
  }

  // Darken the background layer only. Called before obstacles and Amos are drawn.
  drawDarkness(ctx) {
    const dark = 1 - this.light;
    if (dark <= 0) return;
    if (!this.darkLayer) this.darkLayer = this.buildDarkLayer();
    if (!this.glowLayer) this.glowLayer = this.buildGlowLayer();
    ctx.save();
    ctx.globalAlpha = dark;
    ctx.drawImage(this.darkLayer, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(this.glowLayer, 0, 0, W, H);
    ctx.restore();
  }
}
