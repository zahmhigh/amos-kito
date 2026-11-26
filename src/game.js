// Game states: title, ready, playing, paused, dying, gameover.

import { CONFIG } from './config.js';
import { Mosquito } from './mosquito.js';
import { Obstacles } from './obstacles.js';
import { Nepa } from './nepa.js';
import { audio } from './audio.js';
import { ASSETS, drawAsset, drawThumb, boxesOverlap, hasImage } from './sprites.js';

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

const RESTART_BTN = { x: W / 2 - 90, y: 494, w: 180, h: 56 };
const SHARE_BTN = { x: W / 2 - 90, y: 558, w: 180, h: 44 };

function shareMessage(score) {
  const n = `${score} obstacle${score === 1 ? '' : 's'}`;
  return CONFIG.SHARE_TEXT.replace('{n}', n);
}

// Copy text without the async Clipboard API (older browsers, non-HTTPS).
function legacyCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}
const MUTE_BTN = CONFIG.MUTE_BTN;

function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export class Game {
  constructor() {
    this.mosquito = new Mosquito();
    this.obstacles = new Obstacles();
    this.nepa = new Nepa();
    this.best = loadBest();
    this.debug = false;
    this.time = 0;
    this.state = 'title';
    this.lastLine = '';
    this.gameOverLine = '';
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
    this.shakeT = 0;
    this.sharePressed = false;
    this.toast = '';
    this.toastUntil = 0;
  }

  // ---- Input ----

  // One press = one action. Buttons consume the press, so they never also flap.
  press(x, y) {
    audio.unlock();
    // Mute button works in every state and does nothing else.
    if (inRect(x, y, MUTE_BTN)) {
      audio.toggleMute();
      return;
    }
    switch (this.state) {
      case 'title':
      case 'ready':
        this.state = 'playing';
        this.flap();
        break;
      case 'playing':
        this.flap();
        break;
      case 'paused':
        // The whole screen is the Resume button: resume only, no flap.
        this.state = 'playing';
        audio.resumeAll();
        break;
      case 'gameover':
        // Share fires on release (browsers only allow the share sheet from a
        // completed tap), so here the press is just held for release().
        if (inRect(x, y, SHARE_BTN)) {
          this.sharePressed = true;
          return;
        }
        if (performance.now() - this.gameOverAt < CONFIG.RESTART_LOCK_MS) return;
        // The Restart button, or a tap anywhere else: restart only, never a flap.
        // The new round waits on the "ready" screen for its first flap.
        audio.stopVoices(); // don't let a voice line run into the new round
        this.resetRound();
        this.state = 'ready';
        break;
      default:
        break; // dying: ignore
    }
  }

  // Pointer / key released. Only the Share button acts on release.
  release(x, y) {
    const pressed = this.sharePressed;
    this.sharePressed = false;
    if (pressed && this.state === 'gameover' && inRect(x, y, SHARE_BTN)) this.share();
  }

  // Phone share sheet if there is one, otherwise copy the message and link.
  share() {
    const text = shareMessage(this.score);
    const url = CONFIG.SHARE_URL;
    if (navigator.share) {
      navigator.share({ title: document.title, text, url }).catch((e) => {
        // Cancelled by the player: do nothing. Any other failure: copy instead.
        if (!e || e.name !== 'AbortError') this.copyShare(text, url);
      });
      return;
    }
    this.copyShare(text, url);
  }

  copyShare(text, url) {
    const full = `${text} ${url}`;
    const done = (ok) => this.showToast(ok ? 'Link copied!' : 'Could not copy the link');
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(full).then(() => done(true), () => done(legacyCopy(full)));
    } else {
      done(legacyCopy(full));
    }
  }

  showToast(text) {
    this.toast = text;
    this.toastUntil = performance.now() + CONFIG.TOAST_MS;
  }

  flap() {
    this.mosquito.flap();
    audio.flap();
  }

  toggleMute() {
    audio.unlock();
    audio.toggleMute();
  }

  toggleDebug() {
    this.debug = !this.debug;
  }

  // Debug (N key): start the NEPA event now.
  debugNepa() {
    if (this.state === 'playing') this.nepa.trigger();
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
    this.shakeT = Math.max(0, this.shakeT - dt);
    const m = this.mosquito;

    switch (this.state) {
      case 'title':
      case 'ready':
        m.hover(dt, this.time);
        break;

      case 'playing': {
        const bonus = this.nepa.update(dt, this.score); // +3 when the light cuts
        m.update(dt, this.nepa.gust()); // gusts move position, not flap speed
        this.obstacles.setBites(this.score); // difficulty ramp
        const passed = this.obstacles.update(dt, m.hitbox.x);
        this.score += passed + bonus;
        const hit = this.checkHit();
        if (hit) this.startDeath(hit);
        break;
      }

      case 'dying':
        this.updateDeath(dt);
        break;

      default:
        break; // paused, gameover: frozen
    }

    // Continuous sounds follow the game state.
    const alive = this.state === 'title' || this.state === 'ready' || this.state === 'playing';
    audio.update({
      buzz: alive,
      asleep: !this.nepa.isSleeperAwake(),
      breathPhase: this.breathPhase(),
      dark: !this.nepa.isLit(),
    });
  }

  // 0..2π over one breath; the sleeper swells (and snores) in the first half.
  breathPhase() {
    return ((this.time / CONFIG.BREATH_PERIOD_S) % 1) * Math.PI * 2;
  }

  // Game-over line, chosen by what Amos crashed into (see GAME_OVER_LINES in
  // config.js). Light on: the "lit" group only. Otherwise: the cause's group
  // plus the general group. Never the same line twice in a row when there's
  // another to choose.
  pickGameOverLine(cause, lit) {
    const groups = CONFIG.GAME_OVER_LINES;
    let pool = lit && groups.lit && groups.lit.length
      ? groups.lit.slice()
      : [...(groups[cause] || []), ...(groups.general || [])];
    if (pool.length > 1) pool = pool.filter((l) => l !== this.lastLine);
    if (!pool.length) { this.gameOverLine = ''; return; }
    this.gameOverLine = pool[Math.floor(Math.random() * pool.length)];
    this.lastLine = this.gameOverLine;
  }

  // What Amos hit this step: 'floor', 'clothes', 'bedpost', 'coil' or null.
  checkHit() {
    const m = this.mosquito;
    if (m.touchingFloor()) return 'floor';
    const hb = m.hitbox;
    for (const b of this.obstacles.hitboxes()) {
      if (boxesOverlap(hb, b)) return b.key;
    }
    return null;
  }

  startDeath(cause = 'floor') {
    // Remember what he hit, and whether NEPA's light was on, for the game-over line.
    this.crashCause = cause;
    this.crashLit = this.nepa.isLit();
    this.state = 'dying';
    this.deathT = 0;
    this.mosquito.vy = 0;
    this.shakeT = CONFIG.SHAKE_S;
    audio.stopVoices(); // cut any NEPA line so it doesn't talk over the crash line
    audio.play('thud');
    audio.play('youNoSeeRoad', CONFIG.VOICE_AFTER_CRASH_S);
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
    this.pickGameOverLine(this.crashCause, this.crashLit);
    if (this.score > this.best) {
      this.best = this.score;
      this.newBest = true;
      saveBest(this.best);
    }
  }

  // ---- Draw ----

  draw(ctx) {
    // Layers: room (darkened) -> obstacles -> Amos -> score, text and buttons.
    // The crash shakes the world layers only; text and buttons stay steady.
    ctx.save();
    if (this.shakeT > 0) {
      const k = this.shakeT / CONFIG.SHAKE_S;
      const amp = CONFIG.SHAKE_PX * k;
      const zoom = 1 + (2 * CONFIG.SHAKE_PX) / W; // hide the edges while shaking
      ctx.translate(W / 2 + Math.sin(this.time * 97) * amp, H / 2 + Math.cos(this.time * 83) * amp);
      ctx.scale(zoom, zoom);
      ctx.translate(-W / 2, -H / 2);
    }
    this.drawRoom(ctx);
    this.nepa.drawWind(ctx); // behind the obstacles, so it never hides them
    this.obstacles.draw(ctx, { lit: this.nepa.isLit(), sway: this.nepa.clothesSway() });

    if (this.state !== 'gameover') {
      const flashS = CONFIG.DEATH_FLASH_MS / 1000;
      const dying = this.state === 'dying';
      this.mosquito.draw(ctx, {
        flash: dying && this.deathT < flashS,
        dazed: dying && this.deathT >= flashS + CONFIG.DEATH_SPIN_S,
      });
    }

    if (this.debug) this.drawHitboxes(ctx);
    ctx.restore();

    switch (this.state) {
      case 'title': this.drawTitle(ctx); break;
      case 'ready': this.drawScore(ctx); this.drawHint(ctx, 'Tap to fly'); break;
      case 'playing':
      case 'dying': this.drawScore(ctx); this.drawNepaHud(ctx); break;
      case 'paused': this.drawScore(ctx); this.drawNepaHud(ctx); this.drawPaused(ctx); break;
      case 'gameover': this.drawGameOver(ctx); break;
      default: break;
    }

    this.drawMuteButton(ctx);

    if (this.debug) {
      ctx.fillStyle = '#ff4d4d';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('DEBUG (D) · N = NEPA', 8, H - 10);
    }
  }

  // Speaker icon, top right. Crossed out when muted.
  drawMuteButton(ctx) {
    const b = MUTE_BTN;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(cx, cy, b.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    // Speaker body
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 4);
    ctx.lineTo(cx - 5, cy - 4);
    ctx.lineTo(cx + 1, cy - 9);
    ctx.lineTo(cx + 1, cy + 9);
    ctx.lineTo(cx - 5, cy + 4);
    ctx.lineTo(cx - 10, cy + 4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    if (audio.muted) {
      ctx.moveTo(cx + 5, cy - 5);
      ctx.lineTo(cx + 12, cy + 5);
      ctx.moveTo(cx + 12, cy - 5);
      ctx.lineTo(cx + 5, cy + 5);
    } else {
      ctx.arc(cx + 2, cy, 6, -0.9, 0.9);
      ctx.moveTo(cx + 2 + 10 * Math.cos(-0.9), cy + 10 * Math.sin(-0.9));
      ctx.arc(cx + 2, cy, 10, -0.9, 0.9);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Fixed bedroom background with the fan and sleeper on it. Only this layer
  // is darkened; obstacles and Amos are drawn on top afterwards.
  drawRoom(ctx) {
    drawAsset(ctx, 'bg_room', { x: 0, y: 0, w: W, h: H });

    // Fan: spinning image and a ~1 px shake while the power is on.
    const fanKey = this.nepa.isFanOn() ? 'fan_spin' : 'fan_still';
    const shake = this.nepa.fanShake(this.time);
    drawAsset(ctx, fanKey, {
      x: CONFIG.FAN_RIGHT_X - CONFIG.FAN_W + shake.x,
      y: CONFIG.FAN_BASE_Y - CONFIG.FAN_H + shake.y,
      w: CONFIG.FAN_W,
      h: CONFIG.FAN_H,
    });

    // Sleeper breathing: the asleep image swells taller from the bed legs.
    let sleeperKey = 'sleeper_awake';
    let h = CONFIG.SLEEPER_H;
    if (!this.nepa.isSleeperAwake()) {
      sleeperKey = 'sleeper_asleep';
      h *= 1 + CONFIG.BREATH_SWELL * (0.5 - 0.5 * Math.cos(this.breathPhase()));
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

  drawNepaHud(ctx) {
    this.nepa.drawHud(ctx, (text, x, y, size, color) => this.drawText(ctx, text, x, y, size, color));
  }

  drawScore(ctx) {
    this.drawText(ctx, `Bites: ${this.score}`, W / 2, 48, 30);
  }

  drawHint(ctx, text, y = 420) {
    const a = 0.6 + 0.4 * Math.sin(this.time * 5);
    ctx.globalAlpha = a;
    this.drawText(ctx, text, W / 2, y, 26, '#ffe08a');
    ctx.globalAlpha = 1;
  }

  drawTitle(ctx) {
    if (hasImage('logo')) {
      const a = ASSETS.logo;
      drawAsset(ctx, 'logo', { x: (W - a.drawW) / 2, y: 14, w: a.drawW, h: a.drawH });
    } else {
      this.drawText(ctx, 'Amos Kito', W / 2, 80, 52, '#ffd23f');
      this.drawText(ctx, 'E No Let Me Sleep!', W / 2, 130, 24, '#fff');
    }
    if (this.best > 0) this.drawText(ctx, `Best: ${this.best} Bites`, W / 2, 184, 16, '#cfd8e3');
    this.drawTutorial(ctx);
    this.drawHint(ctx, 'Tap to fly', 612);
  }

  // "Dodge these!" card: the three obstacles with their real art, plus tips.
  drawTutorial(ctx) {
    const card = { x: 14, y: 344, w: W - 28, h: 238 };
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,20,0.78)';
    ctx.strokeStyle = 'rgba(255,210,63,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(card.x, card.y, card.w, card.h, 16) : ctx.rect(card.x, card.y, card.w, card.h);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    this.drawText(ctx, 'Dodge these!', W / 2, card.y + 22, 20, '#ffd23f');
    const items = [
      ['clothes', 'Clothes line'],
      ['bedpost', 'Bedpost'],
      ['coil', 'Coil + smoke'],
    ];
    const colW = card.w / items.length;
    items.forEach(([key, label], i) => {
      const cx = card.x + colW * i + colW / 2;
      drawThumb(ctx, key, { x: cx - 40, y: card.y + 42, w: 80, h: 96 });
      this.drawText(ctx, label, cx, card.y + 154, 15, '#ffffff');
    });
    this.drawText(ctx, 'Tap to flap through the gaps.', W / 2, card.y + 186, 15, '#ffe7c2');
    this.drawText(ctx, 'When NEPA brings light, the fan blows you!', W / 2, card.y + 212, 14, '#9fd3ff');
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
    this.drawText(ctx, 'You no see road?!', W / 2, 290, 32, '#ff6b5b');
    if (this.gameOverLine) this.drawText(ctx, this.gameOverLine, W / 2, 328, 18, '#ffe7c2');
    this.drawText(ctx, `Bites: ${this.score}`, W / 2, 380, 28);
    this.drawText(ctx, `Best: ${this.best}`, W / 2, 418, 22, '#cfd8e3');
    if (this.newBest) this.drawText(ctx, 'New best!', W / 2, 456, 20, '#ffd23f');

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

    // Share: outlined, secondary to "Fly again".
    const s = SHARE_BTN;
    ctx.fillStyle = this.sharePressed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)';
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(s.x, s.y, s.w, s.h, 14) : ctx.rect(s.x, s.y, s.w, s.h);
    ctx.fill();
    ctx.stroke();
    ctx.font = '800 20px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffd23f';
    ctx.fillText('Share score', W / 2, s.y + s.h / 2);

    if (this.toast && performance.now() < this.toastUntil) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(W / 2 - 110, 607, 220, 28, 10) : ctx.rect(W / 2 - 110, 607, 220, 28);
      ctx.fill();
      ctx.font = '700 15px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(this.toast, W / 2, 621);
    }
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
