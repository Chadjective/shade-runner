import * as THREE from 'three';
import { WIND_DIR, WIND_BASE, WIND_GUST_MAX, WIND_GUST_PERIOD } from '../utils/constants.js';

const TAU = Math.PI * 2;

/**
 * WindSystem: a steady breeze punctuated by sharp gusts. It exposes a
 * horizontal `vec` (direction × strength) and a 0..1 `strength`; the player
 * reacts to both — pushed sideways (much harder with an open umbrella), the hat
 * worked loose in strong gusts, and the umbrella flipped shut at the peaks.
 *
 * Gusts are time-driven (no RNG) so runs stay deterministic. Per-level config:
 * { dir:[x,y,z], base, gustMax, period }.
 */
export default class WindSystem {
  constructor(opts = {}) {
    this.dir = new THREE.Vector3(...(opts.dir || WIND_DIR));
    this.dir.y = 0;
    if (this.dir.lengthSq() < 1e-4) this.dir.set(1, 0, 0);
    this.dir.normalize();
    this.base = opts.base ?? WIND_BASE;
    this.gustMax = opts.gustMax ?? WIND_GUST_MAX;
    this.period = opts.period ?? WIND_GUST_PERIOD;
    this.time = 0;
    this.strength = this.base;
    this.vec = new THREE.Vector3();
  }

  update(dt) {
    this.time += dt;
    // Cubed sine lobes: mostly calm with occasional sharp gusts.
    const pulse = Math.max(0, Math.sin(this.time * TAU / this.period));
    this.strength = this.base + (this.gustMax - this.base) * Math.pow(pulse, 3);
    this.vec.copy(this.dir).multiplyScalar(this.strength);
    return this.strength;
  }
}
