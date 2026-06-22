import { MAX_HEALTH, SUN_DAMAGE_RATE, SHADE_RECOVERY_RATE } from '../utils/constants.js';

/**
 * HealthSystem: drains in the sun, recovers in the shade.
 * Tracks a little extra state the HUD uses for feedback (how hard the player
 * is currently being cooked, and whether they just got hurt).
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
  }

  /**
   * @param {number} dt seconds
   * @param {boolean} inSun whether the player is currently exposed
   */
  update(dt, inSun) {
    this.inSun = inSun;

    if (inSun) {
      this.health -= SUN_DAMAGE_RATE * dt;
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
}
