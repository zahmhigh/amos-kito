// NEPA power event, fan gusts and the room's lighting.
//
// The room is dark by default. Every so often power returns:
//   idle (dark) -> flicker (bulb stutters, "Up NEPA!") -> fade (dark -> lit,
//   fan starts, sleeper wakes) -> lit (fan spun up, then gusts) -> cutwarn
//   (bulb stutters, gusts die down) -> cut: dark again, "NEPA Took Light!",
//   +3 bites.
// Every change of state is warned before it happens.

import { CONFIG } from './config.js';
import { audio } from './audio.js';

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

function rand(min, max) {
  return min + Math.random() * (max - min);
}

// Bulb on/off pattern while the power stutters (seconds, starting "on").
const FLICKER_PATTERN = [0.06, 0.05, 0.04, 0.07, 0.03, 0.05];

function flickerOn(t) {
  let acc = 0;
  for (let i = 0; i < FLICKER_PATTERN.length; i++) {
    acc += FLICKER_PATTERN[i];
    if (t < acc) return i % 2 === 0;
  }
  return true;
}

export class Nepa {
  constructor() {
    this.darkLayer = null;
    this.glowLayer = null;
    this.reset();
  }

  reset() {
    this.state = 'idle';
    this.t = 0;              // time in the current state
    this.roundT = 0;         // time since the round started
    this.first = true;
    this.nextAt = rand(CONFIG.NEPA_FIRST_MIN_S, CONFIG.NEPA_FIRST_MAX_S);
    this.idleT = 0;          // time since the last cut
    this.light = 0;          // 0 = dark, 1 = fully lit (background overlay)
    this.bulbOn = false;
    this.fanOn = false;
    this.fanT = 0;           // time since the fan started
    this.gustEnv = 0;        // 0..1 gust strength
    this.gustT = 0;
    this.gustSign = 1;
    this.litFor = 0;         // lit-state duration for this event
    this.bannerT = 0;        // >0 while "NEPA Took Light!" shows
    this.shoutT = 0;         // >0 while "Up NEPA!" shows
    this.wind = [];
  }

  // Advance the event. Returns bonus bites earned this step.
  update(dt, score) {
    this.roundT += dt;
    this.bannerT = Math.max(0, this.bannerT - dt);
    this.shoutT = Math.max(0, this.shoutT - dt);
    this.t += dt;
    let bonus = 0;

    switch (this.state) {
      case 'idle': {
        this.idleT += dt;
        const clock = this.first ? this.roundT : this.idleT;
        const ready = !this.first || score >= CONFIG.NEPA_FIRST_MIN_BITES;
        if (clock >= this.nextAt && ready) this.enter('flicker');
        break;
      }
      case 'flicker':
        this.bulbOn = flickerOn(this.t);
        if (this.t >= CONFIG.NEPA_FLICKER_S) this.enter('fade');
        break;
      case 'fade':
        this.light = Math.min(1, this.t / CONFIG.NEPA_FADE_S);
        if (this.t >= CONFIG.NEPA_FADE_S) this.enter('lit');
        break;
      case 'lit':
        if (this.t >= this.litFor) this.enter('cutwarn');
        break;
      case 'cutwarn':
        this.bulbOn = flickerOn(this.t);
        this.light = this.bulbOn ? 1 : 0.75;
        if (this.t >= CONFIG.NEPA_CUT_WARN_S) {
          this.enter('idle');
          bonus = CONFIG.NEPA_BONUS;
        }
        break;
      default:
        break;
    }

    this.updateFan(dt);
    this.updateWind(dt);
    return bonus;
  }

  enter(state) {
    this.state = state;
    this.t = 0;
    switch (state) {
      case 'flicker':
        this.bulbOn = true;
        this.shoutT = CONFIG.UP_NEPA_TEXT_S;
        audio.play('switch');
        audio.play('bulbBuzz');
        audio.play('upNepa', 0.15);
        break;
      case 'fade':
        this.bulbOn = true;
        // Fan and sleeper react as the light comes up; gusts wait for spin-up.
        this.fanOn = true;
        this.fanT = 0;
        this.gustT = 0;
        this.gustSign = Math.random() < 0.5 ? 1 : -1;
        this.litFor = rand(CONFIG.NEPA_LIT_MIN_S, CONFIG.NEPA_LIT_MAX_S)
          - CONFIG.NEPA_FADE_S - CONFIG.NEPA_CUT_WARN_S;
        audio.play('fanOn');
        break;
      case 'lit':
        this.light = 1;
        break;
      case 'cutwarn':
        audio.play('bulbBuzz');
        break;
      case 'idle':
        // Power cut.
        this.light = 0;
        this.bulbOn = false;
        this.fanOn = false;
        this.gustEnv = 0;
        this.bannerT = CONFIG.NEPA_BANNER_S;
        this.first = false;
        this.idleT = 0;
        this.nextAt = rand(CONFIG.NEPA_EVERY_MIN_S, CONFIG.NEPA_EVERY_MAX_S);
        audio.play('powerCut');
        audio.play('fanOff');
        audio.play('nepaTookLight', 0.1);
        break;
      default:
        break;
    }
  }

  // Debug (N key): start the power event right away if the room is dark.
  trigger() {
    if (this.state === 'idle') this.enter('flicker');
  }

  // Gusts start only after the fan has visibly spun up, and die down during
  // the cut warning, so no change in drift comes without notice.
  updateFan(dt) {
    if (!this.fanOn) { this.gustEnv = 0; return; }
    this.fanT += dt;
    const target = this.state === 'lit' && this.fanT >= CONFIG.FAN_SPINUP_S ? 1 : 0;
    const rate = this.state === 'cutwarn' ? 1 / CONFIG.NEPA_CUT_WARN_S : 1 / CONFIG.GUST_RAMP_S;
    if (this.gustEnv < target) this.gustEnv = Math.min(target, this.gustEnv + rate * dt);
    else this.gustEnv = Math.max(target, this.gustEnv - rate * dt);
    if (this.gustEnv > 0) this.gustT += dt;
  }

  // Vertical drift (px/s) added straight to the mosquito's position.
  gust() {
    if (this.gustEnv <= 0) return 0;
    const phase = (this.gustT / CONFIG.GUST_PERIOD_S) * Math.PI * 2;
    return this.gustSign * CONFIG.GUST_AMPLITUDE * this.gustEnv * Math.sin(phase);
  }

  // -1..1, which way the wind is pushing right now (for visuals).
  gustDir() {
    return this.gust() / CONFIG.GUST_AMPLITUDE;
  }

  updateWind(dt) {
    const want = this.fanOn ? CONFIG.WIND_LINES : 0;
    while (this.wind.length < want) {
      this.wind.push({
        x: W + Math.random() * W,
        y: rand(70, H - 60),
        len: rand(26, 60),
        speed: CONFIG.WIND_LINE_SPEED * rand(0.8, 1.2),
      });
    }
    const vy = this.gust();
    for (const l of this.wind) {
      l.x -= l.speed * dt;
      l.y += vy * dt;
    }
    this.wind = this.fanOn ? this.wind.filter((l) => l.x + l.len > 0) : [];
  }

  isFanOn() { return this.fanOn; }
  isSleeperAwake() { return this.fanOn; }
  isLit() { return this.light > 0.5; }

  // Clothes sway in the wind (visual only), in px at the gap edge.
  clothesSway() {
    return -CONFIG.CLOTHES_SWAY_PX * this.gustDir();
  }

  fanShake(time) {
    if (!this.fanOn) return { x: 0, y: 0 };
    const p = CONFIG.FAN_SHAKE_PX;
    return { x: Math.sin(time * 71) * p, y: Math.cos(time * 53) * p * 0.6 };
  }

  // ---- Drawing ----

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

  // The background art has the ceiling bulb painted on. While the bulb is off,
  // cover it with an unlit bulb and dim its painted halo.
  drawUnlitBulb(ctx) {
    if (this.bulbOn) return;
    const bx = CONFIG.BULB_X;
    const by = CONFIG.BULB_Y;
    ctx.save();
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
    if (dark > 0) {
      if (!this.darkLayer) this.darkLayer = this.buildDarkLayer();
      if (!this.glowLayer) this.glowLayer = this.buildGlowLayer();
      ctx.save();
      ctx.globalAlpha = dark;
      ctx.drawImage(this.darkLayer, 0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(this.glowLayer, 0, 0, W, H);
      ctx.restore();
    }
    this.drawBulbGlow(ctx);
  }

  // Glow round the lit ceiling bulb (also during flickers).
  drawBulbGlow(ctx) {
    if (!this.bulbOn) return;
    const r = CONFIG.BULB_GLOW_R;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = radial(ctx, CONFIG.BULB_X, CONFIG.BULB_Y, r, [
      [0, `rgba(255,235,170,${CONFIG.BULB_GLOW_ALPHA})`],
      [0.25, `rgba(255,220,140,${CONFIG.BULB_GLOW_ALPHA * 0.5})`],
      [1, 'rgba(255,210,120,0)'],
    ]);
    ctx.fillRect(CONFIG.BULB_X - r, 0, r * 2, CONFIG.BULB_Y + r);
    ctx.restore();
  }

  // Faint wind lines blowing from the fan side across the room.
  drawWind(ctx) {
    if (!this.wind.length) return;
    const alpha = CONFIG.WIND_ALPHA_MIN + (CONFIG.WIND_ALPHA_MAX - CONFIG.WIND_ALPHA_MIN) * this.gustEnv;
    // Lines tilt with the gust (x3 so the direction reads at a glance).
    const slope = (3 * this.gust()) / CONFIG.WIND_LINE_SPEED;
    ctx.save();
    ctx.strokeStyle = `rgba(250,252,255,${alpha})`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const l of this.wind) {
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x + l.len, l.y - slope * l.len);
    }
    ctx.stroke();
    ctx.restore();
  }

  // "Up NEPA!" shout and "NEPA Took Light!" banner, drawn above everything.
  // drawText(text, x, y, size, color) is the game's outlined text helper.
  drawHud(ctx, drawText) {
    if (this.shoutT > 0) {
      const p = 1 - this.shoutT / CONFIG.UP_NEPA_TEXT_S;
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.shoutT / 0.3);
      drawText('Up NEPA!', 128 + p * 10, 130 - p * 6, 20, '#fff4c2');
      ctx.restore();
    }
    if (this.bannerT > 0) {
      const p = 1 - this.bannerT / CONFIG.NEPA_BANNER_S;
      const pop = p < 0.15 ? 0.6 + (p / 0.15) * 0.4 : 1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.bannerT / 0.25);
      ctx.translate(W / 2, 230);
      ctx.scale(pop, pop);
      ctx.fillStyle = 'rgba(10,10,20,0.6)';
      ctx.fillRect(-170, -42, 340, 92);
      drawText('NEPA Took Light!', 0, -12, 34, '#ffd23f');
      drawText(`+${CONFIG.NEPA_BONUS} Bites`, 0, 28, 24, '#9dff8a');
      ctx.restore();
    }
  }
}
