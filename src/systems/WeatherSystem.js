import { WEATHER_CALM, WEATHER_DURATION, FLARE_WARN } from '../utils/constants.js';

/**
 * WeatherSystem: runs timed weather events one at a time, with calm gaps.
 *
 * Events are drawn in order from the level's enabled list (`rain`, `flare`,
 * `dust`), so a level themes itself by which it allows. Flares get a short
 * telegraphed warning first. `intensity` ramps 0..1 for smooth fade in/out.
 *
 * Effects live in Game; this just answers "what's happening, how strong":
 *   is('rain' | 'flare' | 'dust'), warningFor('flare'), intensity.
 */
export default class WeatherSystem {
  constructor(opts = {}) {
    this.events = opts.events || [];
    this.calm = opts.calm ?? WEATHER_CALM;
    this.duration = opts.duration ?? WEATHER_DURATION;
    this.idx = 0;
    this.current = null;
    this.state = 'calm'; // 'calm' | 'warn' | 'active'
    this.timer = this.calm;
    this.intensity = 0;
  }

  update(dt) {
    this.timer -= dt;
    const target = this.state === 'active' ? 1 : 0;
    this.intensity += (target - this.intensity) * (1 - Math.pow(0.02, dt));

    if (this.state === 'calm') {
      if (this.timer <= 0 && this.events.length) {
        this.current = this.events[this.idx % this.events.length];
        this.idx++;
        if (this.current === 'flare') {
          this.state = 'warn';
          this.timer = FLARE_WARN;
        } else {
          this.state = 'active';
          this.timer = this.duration;
        }
      }
    } else if (this.state === 'warn') {
      if (this.timer <= 0) {
        this.state = 'active';
        this.timer = this.duration;
      }
    } else if (this.state === 'active') {
      if (this.timer <= 0) {
        this.state = 'calm';
        this.timer = this.calm;
        this.current = null;
      }
    }
  }

  is(name) {
    return this.state === 'active' && this.current === name;
  }

  warningFor(name) {
    return this.state === 'warn' && this.current === name;
  }
}
