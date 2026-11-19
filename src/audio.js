// Sound: Web Audio, started on the first tap, with a remembered mute toggle.
//
// Effects (buzz, snoring, generator, fan, switch click, bulb buzz, power cut,
// slap) are synthesised in code, so there are no licences to worry about.
// Any one-shot can be replaced by a recording: put the file in assets/audio/
// and set its path in CONFIG.AUDIO_FILES. Voice lines ("Up NEPA!",
// "NEPA Took Light!", "Dem don slap you!") only play once a file is set; the
// game shows them as text either way, so it stays clear with sound off.

import { CONFIG } from './config.js';

function loadMuted() {
  try {
    return localStorage.getItem(CONFIG.MUTE_KEY) === '1';
  } catch (e) {
    return false;
  }
}

function saveMuted(v) {
  try {
    localStorage.setItem(CONFIG.MUTE_KEY, v ? '1' : '0');
  } catch (e) {
    // Storage blocked: the setting lasts for this session only.
  }
}

class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = loadMuted();
    this.hidden = false;   // tab hidden
    this.paused = false;   // game paused
    this.buffers = {};     // recorded one-shots, by key
    this.noiseBuf = null;
    this.loops = null;
    this.fanOn = false;
  }

  // Must be called from a user gesture (tap, click, key).
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch (e) {
        return;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : CONFIG.MASTER_VOLUME;
      this.master.connect(this.ctx.destination);
      this.noiseBuf = this.makeNoise(2);
      this.buildLoops();
      this.loadFiles();
    }
    this.apply();
  }

  // ---- Mute / pause ----

  toggleMute() {
    this.muted = !this.muted;
    saveMuted(this.muted);
    if (this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : CONFIG.MASTER_VOLUME, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  setHidden(h) { this.hidden = h; this.apply(); }
  pauseAll() { this.paused = true; this.apply(); }
  resumeAll() { this.paused = false; this.apply(); }

  apply() {
    if (!this.ctx) return;
    const stop = this.hidden || this.paused;
    if (stop && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
    if (!stop && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  // ---- Building blocks ----

  makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  noiseSource(loop = true) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = loop;
    return s;
  }

  osc(type, freq) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    return o;
  }

  filter(type, freq, q = 1) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  gain(v = 0) {
    const g = this.ctx.createGain();
    g.gain.value = v;
    return g;
  }

  // Continuous sounds. All start silent; update() sets their levels.
  buildLoops() {
    const c = this.ctx;
    const L = {};

    // Mosquito buzz: two detuned saws, band-passed, with a wingbeat flutter.
    L.buzzA = this.osc('sawtooth', CONFIG.BUZZ_HZ);
    L.buzzB = this.osc('sawtooth', CONFIG.BUZZ_HZ * 1.008);
    const buzzF = this.filter('bandpass', CONFIG.BUZZ_HZ * 2.5, 1.2);
    const flutter = this.gain(1);
    const flutterLfo = this.osc('sine', 38);
    const flutterDepth = this.gain(0.35);
    flutterLfo.connect(flutterDepth).connect(flutter.gain);
    L.buzz = this.gain(0);
    L.buzzA.connect(buzzF);
    L.buzzB.connect(buzzF);
    buzzF.connect(flutter).connect(L.buzz).connect(this.master);

    // Snoring: low-passed noise plus a low growl, swelling with each breath.
    const snoreN = this.noiseSource();
    const snoreF = this.filter('lowpass', 420, 4);
    const growl = this.osc('sawtooth', 62);
    const growlF = this.filter('lowpass', 260, 2);
    const growlG = this.gain(0.5);
    L.snore = this.gain(0);
    snoreN.connect(snoreF).connect(L.snore);
    growl.connect(growlF).connect(growlG).connect(L.snore);
    L.snore.connect(this.master);

    // Neighbour's generator, far away: low hum with a slow wobble.
    const genA = this.osc('sawtooth', 49);
    const genB = this.osc('square', 98);
    const genF = this.filter('lowpass', 170, 1);
    const genLfo = this.osc('sine', 0.35);
    const genLfoG = this.gain(1.5);
    genLfo.connect(genLfoG);
    genLfoG.connect(genA.frequency);
    genLfoG.connect(genB.frequency);
    const genBG = this.gain(0.4);
    L.gen = this.gain(0);
    genA.connect(genF);
    genB.connect(genBG).connect(genF);
    genF.connect(L.gen).connect(this.master);

    // Standing fan: airy noise plus a motor hum whose pitch spins up and down.
    const fanN = this.noiseSource();
    const fanF = this.filter('bandpass', 380, 0.6);
    L.motor = this.osc('triangle', 30);
    const motorG = this.gain(0.35);
    L.fan = this.gain(0);
    fanN.connect(fanF).connect(L.fan);
    L.motor.connect(motorG).connect(L.fan);
    L.fan.connect(this.master);

    const t = c.currentTime;
    for (const s of [L.buzzA, L.buzzB, flutterLfo, snoreN, growl, genA, genB, genLfo, fanN, L.motor]) s.start(t);
    this.loops = L;
  }

  // ---- Per-step control from the game ----
  // state: { buzz, asleep, breathPhase, dark }
  update(state) {
    if (!this.loops || this.ctx.state !== 'running') return;
    const L = this.loops;
    const t = this.ctx.currentTime;
    L.buzz.gain.setTargetAtTime(state.buzz ? CONFIG.BUZZ_VOL : 0, t, 0.05);
    // Snore on the in-breath, while the sleeper swells.
    const s = Math.max(0, Math.sin(state.breathPhase));
    L.snore.gain.setTargetAtTime(state.asleep ? CONFIG.SNORE_VOL * s * s : 0, t, 0.08);
    L.gen.gain.setTargetAtTime(state.dark ? CONFIG.GENERATOR_VOL : 0, t, 0.4);
  }

  // Buzz pitch jumps up on each flap, then glides back.
  flap() {
    if (!this.loops) return;
    const t = this.ctx.currentTime;
    for (const [o, k] of [[this.loops.buzzA, 1], [this.loops.buzzB, 1.008]]) {
      const base = CONFIG.BUZZ_HZ * k;
      o.frequency.cancelScheduledValues(t);
      o.frequency.setValueAtTime(base * CONFIG.BUZZ_FLAP_RISE, t);
      o.frequency.setTargetAtTime(base, t + 0.03, CONFIG.BUZZ_FLAP_GLIDE_S);
    }
  }

  // ---- One-shots ----

  play(name, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    if (this.buffers[name]) { this.playBuffer(name, t); return; }
    const synth = this.synths[name];
    if (synth) synth.call(this, t);
  }

  playBuffer(name, t) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.buffers[name];
    const g = this.gain(CONFIG.VOICE_VOL);
    s.connect(g).connect(this.master);
    s.start(t);
  }

  // Recorded files from CONFIG.AUDIO_FILES (null entries are skipped).
  loadFiles() {
    for (const [key, path] of Object.entries(CONFIG.AUDIO_FILES)) {
      if (!path) continue;
      fetch(path)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
        .then((ab) => new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej)))
        .then((buf) => { this.buffers[key] = buf; })
        .catch(() => {}); // missing or broken file: keep the synth / text
    }
  }

  // Envelope helper: quick attack, exponential decay.
  env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
}

// Synthesised one-shots. `this` is the GameAudio instance.
GameAudio.prototype.synths = {
  // Light switch click.
  switch(t) {
    const n = this.noiseSource(false);
    const f = this.filter('highpass', 2500, 1);
    const g = this.gain(0);
    n.connect(f).connect(g).connect(this.master);
    this.env(g, t, 0.5, 0.002, 0.03);
    n.start(t);
    n.stop(t + 0.05);
    const o = this.osc('square', 1800);
    const og = this.gain(0);
    o.connect(og).connect(this.master);
    this.env(og, t, 0.12, 0.001, 0.015);
    o.start(t);
    o.stop(t + 0.03);
  },

  // Flickering bulb buzz, chopped in time with the flicker.
  bulbBuzz(t) {
    const o = this.osc('square', 100);
    const f = this.filter('bandpass', 300, 3);
    const g = this.gain(0);
    o.connect(f).connect(g).connect(this.master);
    let at = t;
    const chops = [0.06, 0.05, 0.04, 0.07, 0.03, 0.05];
    chops.forEach((d, i) => {
      g.gain.setValueAtTime(i % 2 === 0 ? CONFIG.BULB_BUZZ_VOL : 0.0001, at);
      at += d;
    });
    g.gain.setValueAtTime(0.0001, at);
    o.start(t);
    o.stop(at + 0.02);
  },

  // Fan spins up: hum fades in and the motor pitch rises, before any gust.
  fanOn(t) {
    const L = this.loops;
    if (!L) return;
    L.fan.gain.cancelScheduledValues(t);
    L.fan.gain.setTargetAtTime(CONFIG.FAN_VOL, t, CONFIG.FAN_SPINUP_S / 3);
    L.motor.frequency.cancelScheduledValues(t);
    L.motor.frequency.setTargetAtTime(110, t, CONFIG.FAN_SPINUP_S / 3);
  },

  // Fan winds down when the power cuts.
  fanOff(t) {
    const L = this.loops;
    if (!L) return;
    L.fan.gain.cancelScheduledValues(t);
    L.fan.gain.setTargetAtTime(0, t, CONFIG.FAN_WINDDOWN_S / 3);
    L.motor.frequency.cancelScheduledValues(t);
    L.motor.frequency.setTargetAtTime(25, t, CONFIG.FAN_WINDDOWN_S / 3);
  },

  // Power cut thunk (plays under the "NEPA Took Light!" voice line).
  powerCut(t) {
    const o = this.osc('sine', 140);
    const g = this.gain(0);
    o.connect(g).connect(this.master);
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(35, t + 0.35);
    this.env(g, t, 0.5, 0.005, 0.35);
    o.start(t);
    o.stop(t + 0.45);
  },

  // A sharp slap: bright noise crack plus a body thump.
  slap(t) {
    const n = this.noiseSource(false);
    const f = this.filter('lowpass', 7000, 0.8);
    f.frequency.setValueAtTime(7000, t);
    f.frequency.exponentialRampToValueAtTime(900, t + 0.12);
    const g = this.gain(0);
    n.connect(f).connect(g).connect(this.master);
    this.env(g, t, CONFIG.SLAP_VOL, 0.002, 0.14);
    n.start(t);
    n.stop(t + 0.2);
    const o = this.osc('sine', 160);
    const og = this.gain(0);
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.15);
    o.connect(og).connect(this.master);
    this.env(og, t, CONFIG.SLAP_VOL * 0.8, 0.003, 0.16);
    o.start(t);
    o.stop(t + 0.25);
  },

  // Voice lines have no synth: they play only from recorded files.
  upNepa() {},
  nepaTookLight() {},
  demDonSlapYou() {},
};

export const audio = new GameAudio();
