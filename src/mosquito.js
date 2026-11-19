// Amos Kito, the player mosquito. Fixed x, moves only up and down.

import { CONFIG } from './config.js';
import { ASSETS, drawSprite, frameAt, hitboxesFor } from './sprites.js';

export class Mosquito {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = CONFIG.MOSQUITO_X;
    this.y = CONFIG.MOSQUITO_START_Y; // centre
    this.vy = 0;
    this.angle = 0;
    this.animTime = 0;
  }

  get rect() {
    const a = ASSETS.mosquito;
    return { x: this.x - a.drawW / 2, y: this.y - a.drawH / 2, w: a.drawW, h: a.drawH };
  }

  get hitbox() {
    return hitboxesFor('mosquito', this.rect)[0];
  }

  flap() {
    this.vy = CONFIG.FLAP_PUSH;
  }

  // Idle bob for title / ready screens.
  hover(dt, timeS) {
    this.animTime += dt;
    const t = (timeS / CONFIG.HOVER_PERIOD_S) * Math.PI * 2;
    this.y = CONFIG.MOSQUITO_START_Y + Math.sin(t) * CONFIG.HOVER_AMPLITUDE;
    this.vy = 0;
  }

  // `drift` (px/s) is the fan gust: added straight to position, never to vy,
  // because every flap resets vy and would cancel it.
  update(dt, drift = 0) {
    this.animTime += dt;
    this.vy = Math.min(this.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL_SPEED);
    this.y += (this.vy + drift) * dt;

    // Ceiling: stop at the top edge and kill upward speed.
    const hb = this.hitbox;
    if (hb.y < 0) {
      this.y -= hb.y;
      if (this.vy < 0) this.vy = 0;
    }
  }

  // True once the body touches the floor.
  touchingFloor() {
    const hb = this.hitbox;
    return hb.y + hb.h >= CONFIG.FLOOR_Y;
  }

  // During the death sequence animTime stops advancing, so Amos stays frozen
  // on one wing-flap frame while he flashes and spins.
  draw(ctx, { flash = false, dazed = false } = {}) {
    const key = dazed ? 'mosquito_dazed' : 'mosquito';
    const a = ASSETS[key];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    const rect = { x: -a.drawW / 2, y: -a.drawH / 2, w: a.drawW, h: a.drawH };
    drawSprite(ctx, key, rect, dazed ? 0 : frameAt('mosquito', this.animTime), { white: flash });
    ctx.restore();
  }
}
