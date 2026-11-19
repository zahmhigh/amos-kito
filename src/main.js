// Boot, fixed-timestep loop, scaling and input.

import { CONFIG } from './config.js';
import { Game } from './game.js';
import { loadAssets } from './sprites.js';
import { audio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const game = new Game();

// ---- Scaling: fit 360x640 into the window with bars, sharp on high-DPI ----
let scale = 1;
let dpr = 1;

function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  scale = Math.min(vw / CONFIG.WIDTH, vh / CONFIG.HEIGHT);
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  const cssW = Math.floor(CONFIG.WIDTH * scale);
  const cssH = Math.floor(CONFIG.HEIGHT * scale);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

// ---- Input ----
function toLogical(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * CONFIG.WIDTH,
    y: ((clientY - r.top) / r.height) * CONFIG.HEIGHT,
  };
}

// Pointer events cover touch, mouse and pen. Listen on the whole page so taps
// on the letterbox bars still count.
window.addEventListener('pointerdown', (e) => {
  if (e.button !== undefined && e.button > 0) return; // left click / touch only
  e.preventDefault();
  const p = toLogical(e.clientX, e.clientY);
  game.press(p.x, p.y);
}, { passive: false });

// Block scrolling, pinch and double-tap zoom.
for (const type of ['touchstart', 'touchmove', 'touchend', 'gesturestart', 'dblclick']) {
  window.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
// Older iOS only unlocks audio from touchend, so try there too.
window.addEventListener('touchend', () => audio.unlock(), { passive: true });
window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    if (e.repeat) return; // holding Space never repeats
    game.press(-1, -1);
  } else if (e.repeat) {
    // ignore held keys
  } else if (e.code === 'KeyD') {
    game.toggleDebug();
  } else if (e.code === 'KeyM') {
    game.toggleMute();
  } else if (e.code === 'KeyN') {
    game.debugNepa(); // debug: trigger the NEPA event now
  }
});

// ---- Pause when hidden ----
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.onHidden();
  audio.setHidden(document.hidden); // all sound stops while the tab is hidden
});
window.addEventListener('pagehide', () => game.onHidden());
window.addEventListener('blur', () => game.onHidden());

// ---- Fixed-timestep loop ----
let last = performance.now();
let acc = 0;

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > CONFIG.MAX_FRAME_DT) dt = CONFIG.STEP; // big jump: skip it
  acc += dt;

  let steps = 0;
  while (acc >= CONFIG.STEP && steps < CONFIG.MAX_STEPS_PER_FRAME) {
    game.update(CONFIG.STEP);
    acc -= CONFIG.STEP;
    steps++;
  }
  if (steps === CONFIG.MAX_STEPS_PER_FRAME) acc = 0; // drop the backlog

  const k = scale * dpr;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  game.draw(ctx);

  requestAnimationFrame(frame);
}

loadAssets().then(() => {
  last = performance.now();
  requestAnimationFrame(frame);
});
