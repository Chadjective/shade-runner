/**
 * AudioSystem — all sound is synthesized at runtime (Web Audio), no asset files.
 *
 * Two looping ambience beds:
 *   - sizzle: band-passed noise that swells the hotter you are (sun exposure)
 *   - wind:   low-passed noise that tracks gust strength
 * Plus short one-shots: footsteps, pickups, checkpoint, jump, flare warning,
 * death, win.
 *
 * The AudioContext is only created/resumed on a user gesture (the click-to-play),
 * so nothing ever autoplays. A mute flag zeroes the master gain.
 */
export default class AudioSystem {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.started = false;
  }

  /** Call from a user gesture (the play/resume click). */
  resume() {
    if (!this.ctx) this._init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  _init() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    let ctx;
    try { ctx = new Ctx(); } catch { return; }
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(ctx.destination);

    this.noiseBuf = this._makeNoise(2);

    // Sun sizzle bed.
    this.sizzleGain = ctx.createGain();
    this.sizzleGain.gain.value = 0;
    const sf = ctx.createBiquadFilter();
    sf.type = 'bandpass';
    sf.frequency.value = 3400;
    sf.Q.value = 0.6;
    const sizzle = this._loop(this.noiseBuf);
    sizzle.connect(sf);
    sf.connect(this.sizzleGain);
    this.sizzleGain.connect(this.master);
    sizzle.start();

    // Wind bed.
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.015;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 480;
    const wind = this._loop(this.noiseBuf);
    wind.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.master);
    wind.start();

    this.started = true;
  }

  _makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _loop(buf) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    return s;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.55;
  }

  /** Per-frame ambience. exposure 0..1 (heat), windStrength 0..1. */
  ambience(exposure, windStrength) {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    this.sizzleGain.gain.setTargetAtTime(Math.min(0.13, exposure * 0.13), t, 0.25);
    this.windGain.gain.setTargetAtTime(0.012 + Math.min(0.1, windStrength * 0.1), t, 0.25);
    this.windFilter.frequency.setTargetAtTime(420 + windStrength * 900, t, 0.25);
  }

  // ---- one-shots ----------------------------------------------------------
  _tone(freq, dur, { type = 'sine', gain = 0.18, to = null, delay = 0 } = {}) {
    if (!this.started || this.muted) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (to) o.frequency.linearRampToValueAtTime(to, start + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  footstep() {
    if (!this.started || this.muted) return;
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 320;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.11);
    s.connect(f);
    f.connect(g);
    g.connect(this.master);
    s.start();
    s.stop(ctx.currentTime + 0.12);
  }

  pickup() { this._tone(660, 0.1, { type: 'triangle', gain: 0.16 }); this._tone(990, 0.13, { type: 'triangle', gain: 0.13, delay: 0.06 }); }
  checkpoint() { this._tone(520, 0.12, { gain: 0.16 }); this._tone(784, 0.18, { gain: 0.14, delay: 0.08 }); }
  jump() { this._tone(280, 0.16, { gain: 0.1, to: 520 }); }
  flareWarn() { this._tone(200, 0.55, { type: 'sawtooth', gain: 0.1, to: 720 }); }
  respawn() { this._tone(440, 0.18, { type: 'sine', gain: 0.12, to: 660 }); }
  death() { this._tone(320, 0.8, { type: 'sawtooth', gain: 0.2, to: 70 }); }
  win() { [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.4, { gain: 0.14, delay: i * 0.12 })); }

  /** Close the context on unmount — AudioContexts are a limited resource. */
  dispose() {
    if (this.ctx) {
      try { this.ctx.close(); } catch { /* ignore */ }
      this.ctx = null;
      this.started = false;
    }
  }
}
