import {
  MAX_HEALTH,
  SUN_DAMAGE_RATE,
  SHADE_RECOVERY_RATE,
  SUNSCREEN_DURATION,
  SUNSCREEN_DAMAGE_MULT,
  WATER_HEAL,
} from '../utils/constants.js';

/**
 * HealthSystem: drains in the sun, recovers in the shade.
 *
 * Pickups modify it: water heals instantly; sunscreen grants a timed buff that
 * scales down sun damage. Tracks a little extra state the HUD uses for feedback
 * (exposure intensity, and the remaining sunscreen timer).
 */
export default class HealthSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.health = MAX_HEALTH;
    this.inSun = false;
    this.dead = false;
    // 0..1 ramp of "exposure intensity" — climbs while in sun, falls in shade.
    // The HUD uses it to fade the red edge-tint in and out smoothly.
    this.exposure = 0;
    this.sunscreen = 0; // seconds of protection remaining
  }

  /**
   * @param {number} dt seconds
   * @param {boolean} inSun whether the player is currently exposed
   */
  update(dt, inSun) {
    this.inSun = inSun;
    if (this.sunscreen > 0) this.sunscreen = Math.max(0, this.sunscreen - dt);

    if (inSun) {
      const mult = this.sunscreen > 0 ? SUNSCREEN_DAMAGE_MULT : 1;
      this.health -= SUN_DAMAGE_RATE * mult * dt;
      this.exposure = Math.min(1, this.exposure + dt * 2.2);
    } else {
      this.health += SHADE_RECOVERY_RATE * dt;
      this.exposure = Math.max(0, this.exposure - dt * 1.8);
    }

    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    } else if (this.health > MAX_HEALTH) {
      this.health = MAX_HEALTH;
    }
  }

  /** Apply a pickup effect. Returns a short label for HUD feedback. */
  applyPickup(type) {
    if (type === 'water') {
      this.health = Math.min(MAX_HEALTH, this.health + WATER_HEAL);
      return `+${WATER_HEAL} Water`;
    }
    if (type === 'sunscreen') {
      this.sunscreen = SUNSCREEN_DURATION;
      return 'Sunscreen!';
    }
    return '';
  }

  get protected() {
    return this.sunscreen > 0;
  }
}
