// Game states: title, ready, playing, paused, dying, gameover.

import { CONFIG } from './config.js';
import { Mosquito } from './mosquito.js';
import { Obstacles } from './obstacles.js';
import { Nepa } from './nepa.js';
import { audio } from './audio.js';
import { ASSETS, drawAsset, boxesOverlap, hasImage } from './sprites.js';

const W = CONFIG.WIDTH;
const H = CONFIG.HEIGHT;

function loadBest() {
  try {
    const v = parseInt(localStorage.getItem(CONFIG.BEST_KEY), 10);
    return Number.isFinite(v) ? v : 0;
  } catch (e) {
    return 0;
  }
}

function saveBest(v) {
  try {
    localStorage.setItem(CONFIG.BEST_KEY, String(v));
  } catch (e) {
    // Storage blocked: keep the best score for this session only.
  }
}

const RESTART_BTN = { x: W / 2 - 90, y: 500, w: 180, h: 56 };

export class Game {
  constructor() {
    this.mosquito = new Mosquito();
    this.obstacles = new Obstacles();
    this.nepa = new Nepa();
    this.best = loadBest();
    this.debug = false;
    this.time = 0;
    this.state = 'title';
    this.resetRound();
  }

  resetRound() {
    this.mosquito.reset();
    this.obstacles.reset();
    this.nepa.reset();
    this.score = 0;
    this.newBest = false;
    this.deathT = 0;
    this.gameOverAt = 0;
  }

  // ---- Input ----

  // One press = one action. Buttons consume the press, so they never also flap.
  press(x, y) {
    audio.unlock();
    switch (this.state) {
      case 'title':
      case 'ready':
        this.state = 'playing';
        this.mosquito.flap();
        break;
      case 'playing':
        this.mosquito.flap();
        break;
      case 'paused':
        // The whole screen is the Resume button: resume only, no flap.
        this.state = 'playing';
        audio.resumeAll();
        break;
      case 'gameover':
        if (performance.now() - this.gameOverAt < CONFIG.RESTART_LOCK_MS) return;
        // The Restart button, or a tap anywhere: restart only, never a flap.
        // The new round waits on the "ready" screen for its first flap.
        this.resetRound();
        this.state = 'ready';
        break;
      default:
        break; // dying: ignore
    }
  }

  toggleDebug() {
    this.debug = !this.debug;
  }

  onHidden() {
    if (this.state === 'playing') {
      this.state = 'paused';
      audio.pauseAll();
    }
  }

  // ---- Update (fixed step) ----

  update(dt) {
    this.time += dt;
    const m = this.mosquito;

    switch (this.state) {
      case 'title':
      case 'ready':
        m.hover(dt, this.time);
        break;

      case 'playing': {
        this.nepa.update(dt);
        m.update(dt);
        m.y += this.nepa.gust() * dt; // gusts move position, not flap speed
        const passed = this.obstacles.update(dt, m.hitbox.x);
        this.score += passed;
        if (this.checkHit()) this.startDeath();
        break;
      }

      case 'dying':
        this.updateDeath(dt);
        break;

      default:
        break; // paused, gameover: frozen
    }
  }

  checkHit() {
    const m = this.mosquito;
    if (m.touchingFloor()) return true;
    const hb = m.hitbox;
    for (const b of this.obstacles.hitboxes()) {
      if (boxesOverlap(hb, b)) return true;
    }
    return false;
  }

  startDeath() {
    this.state = 'dying';
    this.deathT = 0;
    this.mosquito.vy = 0;
    audio.play('slap');
  }

  updateDeath(dt) {
    const m = this.mosquito;
    this.deathT += dt;
    const flash = CONFIG.DEATH_FLASH_MS / 1000;
    const spinEnd = flash + CONFIG.DEATH_SPIN_S;
    const dazedEnd = spinEnd + CONFIG.DEATH_DAZED_S;

    if (this.deathT < flash) return; // frozen mid-flap

    if (this.deathT < spinEnd) {
      const p = (this.deathT - flash) / CONFIG.DEATH_SPIN_S;
      m.angle = p * CONFIG.DEATH_SPIN_TURNS * Math.PI * 2;
      m.vy = Math.min(m.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL_SPEED);
      m.y = Math.min(m.y + m.vy * dt, CONFIG.FLOOR_Y - ASSETS.mosquito.drawH / 2);
      return;
    }

    m.angle = 0;
    if (this.deathT >= dazedEnd) this.enterGameOver();
  }

  enterGameOver() {
    this.state = 'gameover';
    this.gameOverAt = performance.now();
    if (this.score > this.best) {
      this.best = this.score;
      this.newBest = true;
      saveBest(this.best);
    }
  }

  // ---- Draw ----

  draw(ctx) {
    // Layers: room (darkened) -> obstacles -> Amos -> score, text and buttons.
    this.drawRoom(ctx);
    this.obstacles.draw(ctx);

    if (this.state !== 'gameover') {
      const flashS = CONFIG.DEATH_FLASH_MS / 1000;
      const dying = this.state === 'dying';
      this.mosquito.draw(ctx, {
        flash: dying && this.deathT < flashS,
        dazed: dying && this.deathT >= flashS + CONFIG.DEATH_SPIN_S,
      });
    }

    if (this.debug) this.drawHitboxes(ctx);

    switch (this.state) {
      case 'title': this.drawTitle(ctx); break;
      case 'ready': this.drawScore(ctx); this.drawHint(ctx, 'Tap to fly'); break;
      case 'playing':
      case 'dying': this.drawScore(ctx); break;
      case 'paused': this.drawScore(ctx); this.drawPaused(ctx); break;
      case 'gameover': this.drawGameOver(ctx); break;
      default: break;
    }

    if (this.debug) {
      ctx.fillStyle = '#ff4d4d';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('DEBUG (D)', 8, H - 10);
    }
  }

  // Fixed bedroom background with the fan and sleeper on it. Only this layer
  // is darkened; obstacles and Amos are drawn on top afterwards.
  drawRoom(ctx) {
    drawAsset(ctx, 'bg_room', { x: 0, y: 0, w: W, h: H });

    const fanKey = this.nepa.isFanOn() ? 'fan_spin' : 'fan_still';
    drawAsset(ctx, fanKey, {
      x: CONFIG.FAN_RIGHT_X - CONFIG.FAN_W,
      y: CONFIG.FAN_BASE_Y - CONFIG.FAN_H,
      w: CONFIG.FAN_W,
      h: CONFIG.FAN_H,
    });

    // Sleeper breathing: the asleep image swells taller from the bed legs.
    let sleeperKey = 'sleeper_awake';
    let h = CONFIG.SLEEPER_H;
    if (!this.nepa.isSleeperAwake()) {
      sleeperKey = 'sleeper_asleep';
      const phase = (this.time / CONFIG.BREATH_PERIOD_S) * Math.PI * 2;
      h *= 1 + CONFIG.BREATH_SWELL * (0.5 - 0.5 * Math.cos(phase));
    }
    drawAsset(ctx, sleeperKey, {
      x: CONFIG.SLEEPER_X,
      y: CONFIG.SLEEPER_LEGS_Y - h,
      w: CONFIG.SLEEPER_W,
      h,
    });

    this.nepa.drawUnlitBulb(ctx);
    this.nepa.drawDarkness(ctx);
  }

  drawText(ctx, text, x, y, size, color = '#fff', align = 'center') {
    ctx.font = `800 ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(3, size / 7);
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  drawScore(ctx) {
    this.drawText(ctx, `Bites: ${this.score}`, W / 2, 48, 30);
  }

  drawHint(ctx, text) {
    const a = 0.6 + 0.4 * Math.sin(this.time * 5);
    ctx.globalAlpha = a;
    this.drawText(ctx, text, W / 2, 420, 26, '#ffe08a');
    ctx.globalAlpha = 1;
  }

  drawTitle(ctx) {
    if (hasImage('logo')) {
      const a = ASSETS.logo;
      drawAsset(ctx, 'logo', { x: (W - a.drawW) / 2, y: 60, w: a.drawW, h: a.drawH });
    } else {
      this.drawText(ctx, 'Amos Kito', W / 2, 150, 52, '#ffd23f');
      this.drawText(ctx, 'E No Let Me Sleep!', W / 2, 200, 24, '#fff');
    }
    this.drawHint(ctx, 'Tap to fly');
    if (this.best > 0) this.drawText(ctx, `Best: ${this.best} Bites`, W / 2, 470, 18, '#cfd8e3');
  }

  drawPaused(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    this.drawText(ctx, 'Paused', W / 2, 270, 36);
    this.drawHint(ctx, 'Tap to resume');
  }

  drawGameOver(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    const dw = CONFIG.DAZED_GAMEOVER_W;
    const dh = ASSETS.mosquito_dazed.frameH * (dw / ASSETS.mosquito_dazed.frameW);
    drawAsset(ctx, 'mosquito_dazed', { x: (W - dw) / 2, y: 270 - 24 - dh, w: dw, h: dh });
    this.drawText(ctx, 'Dem don slap you!', W / 2, 290, 32, '#ff6b5b');
    this.drawText(ctx, `Bites: ${this.score}`, W / 2, 360, 28);
    this.drawText(ctx, `Best: ${this.best}`, W / 2, 400, 22, '#cfd8e3');
    if (this.newBest) this.drawText(ctx, 'New best!', W / 2, 440, 20, '#ffd23f');

    const ready = performance.now() - this.gameOverAt >= CONFIG.RESTART_LOCK_MS;
    const b = RESTART_BTN;
    ctx.globalAlpha = ready ? 1 : 0.5;
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(b.x, b.y, b.w, b.h, 14) : ctx.rect(b.x, b.y, b.w, b.h);
    ctx.fill();
    ctx.font = '800 24px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1b2433';
    ctx.fillText('Fly again', W / 2, b.y + b.h / 2);
    ctx.globalAlpha = 1;
  }

  drawHitboxes(ctx) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ff2d55';
    for (const b of this.obstacles.hitboxes()) ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    if (this.state !== 'gameover') {
      const hb = this.mosquito.hitbox;
      ctx.strokeStyle = '#39ff14';
      ctx.strokeRect(hb.x + 0.5, hb.y + 0.5, hb.w - 1, hb.h - 1);
    }
    ctx.strokeStyle = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.FLOOR_Y - 0.5);
    ctx.lineTo(W, CONFIG.FLOOR_Y - 0.5);
    ctx.stroke();
  }
}
