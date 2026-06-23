import {
  MAX_HEALTH,
  SUN_DAMAGE_RATE,
  SHADE_RECOVERY_RATE,
  SUNSCREEN_DURATION,
  SUNSCREEN_DAMAGE_MULT,
  WATER_HEAL,
  MAX_HYDRATION,
  HYDRATION_DRAIN,
  HYDRATION_LOW,
  DEHYDRATION_DMG_MULT,
  WATER_HYDRATE,
} from '../utils/constants.js';

/**
 * HealthSystem: drains in the sun, recovers in the shade.
 *
 * Layered modifiers on sun damage: sunscreen (timed buff), gear (hat/glasses,
 * passed in), and hydration — sweating in the sun drains your water, and once
 * you're dehydrated the sun bites harder. Water refills both health and
 * hydration; cooling zones top hydration back up.
 */
export default class HealthSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.health = MAX_HEALTH;
    this.inSun = false;
    this.dead = false;
    this.exposure = 0;
    this.sunscreen = 0;
    this.hydration = MAX_HYDRATION;
  }

  /**
   * @param {number} dt seconds
   * @param {boolean} inSun whether the player is currently exposed
   * @param {number} gearMult extra sun-damage multiplier from gear (hat/glasses)
   */
  update(dt, inSun, gearMult = 1) {
    this.inSun = inSun;
    if (this.sunscreen > 0) this.sunscreen = Math.max(0, this.sunscreen - dt);

    if (inSun) {
      this.hydration = Math.max(0, this.hydration - HYDRATION_DRAIN * dt);
      const dehydrated = this.hydration < HYDRATION_LOW;
      const mult =
        (this.sunscreen > 0 ? SUNSCREEN_DAMAGE_MULT : 1) *
        gearMult *
        (dehydrated ? DEHYDRATION_DMG_MULT : 1);
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
      this.hydration = Math.min(MAX_HYDRATION, this.hydration + WATER_HYDRATE);
      return `+${WATER_HEAL} Water`;
    }
    if (type === 'sunscreen') {
      this.sunscreen = SUNSCREEN_DURATION;
      return 'Sunscreen!';
    }
    return '';
  }

  /** Top up hydration (e.g. standing in a misting fountain). */
  hydrate(amount) {
    this.hydration = Math.min(MAX_HYDRATION, this.hydration + amount);
  }

  get dehydrated() {
    return this.hydration < HYDRATION_LOW;
  }

  get protected() {
    return this.sunscreen > 0;
  }
}
