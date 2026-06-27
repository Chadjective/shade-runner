import * as THREE from 'three';
import {
  SUN_CYCLE_DURATION,
  SUN_START_ANGLE,
  SUN_END_ANGLE,
  SUN_AZIMUTH_START,
  SUN_AZIMUTH_END,
  SUN_DISTANCE,
  SUN_LIGHT_COLOR,
  SKY_DAWN,
  SKY_NOON,
} from '../utils/constants.js';

const DEG = Math.PI / 180;

/**
 * SunSystem owns the DirectionalLight (the "sun") and moves it across the sky.
 *
 * As the level plays out the sun rises from a low eastern angle (long, soft
 * shadows — forgiving) to a high western angle (short shadows — brutal), which
 * is what makes a safe path turn into a death zone over time.
 *
 * The light follows the player horizontally so the shadow-map frustum stays
 * tight and the shadows stay crisp wherever the player is. `toSun` is the unit
 * vector pointing FROM the world TOWARD the sun — the ShadeDetector fires its
 * ray along it.
 */
export default class SunSystem {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.toSun = new THREE.Vector3(0, 1, 0);
    this.elapsed = 0;
    this.progress = 0;

    // Per-level overrides fall back to the global tuning defaults.
    this.cycle = opts.cycle ?? SUN_CYCLE_DURATION;
    this.startAngle = opts.startAngle ?? SUN_START_ANGLE;
    this.endAngle = opts.endAngle ?? SUN_END_ANGLE;

    // The sun itself.
    const light = new THREE.DirectionalLight(SUN_LIGHT_COLOR, 3.2);
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.bias = -0.0006;
    light.shadow.normalBias = 0.04;

    // Tight ortho frustum that rides along with the player (see update()).
    const cam = light.shadow.camera;
    cam.near = 1;
    cam.far = SUN_DISTANCE * 2;
    const span = 42;
    cam.left = -span;
    cam.right = span;
    cam.top = span;
    cam.bottom = -span;
    cam.updateProjectionMatrix();

    scene.add(light);
    scene.add(light.target);
    this.light = light;

    // A visible "sun" disc so the player can read where the light is coming
    // from. Purely cosmetic — the real light is the DirectionalLight above.
    const disc = new THREE.Mesh(
      new THREE.SphereGeometry(3, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff2c4, fog: false })
    );
    scene.add(disc);
    this.disc = disc;

    // Sky drifts from skyStart -> skyEnd across the day (per-level overridable,
    // e.g. a dusk level fading to orange).
    this._skyDawn = new THREE.Color(opts.skyStart ?? SKY_DAWN);
    this._skyNoon = new THREE.Color(opts.skyEnd ?? SKY_NOON);
    this._sky = new THREE.Color();
  }

  /** Position of the sun relative to a focus point, given current arc state. */
  _computeDirection() {
    const p = this.progress;
    const elevation = THREE.MathUtils.lerp(this.startAngle, this.endAngle, p) * DEG;
    const azimuth = THREE.MathUtils.lerp(SUN_AZIMUTH_START, SUN_AZIMUTH_END, p) * DEG;

    const cosE = Math.cos(elevation);
    // Azimuth sweeps the sun across the X axis (east -> west) while a fixed
    // tilt along +Z keeps shadows falling down the length of the course.
    this.toSun.set(cosE * Math.sin(azimuth), Math.sin(elevation), cosE * Math.cos(azimuth) * 0.6 + 0.35);
    this.toSun.normalize();
  }

  /**
   * @param {number} dt    seconds since last frame
   * @param {THREE.Vector3} focus  point the light should follow (the player)
   */
  update(dt, focus) {
    this.elapsed += dt;
    this.progress = Math.min(this.elapsed / this.cycle, 1);
    this._computeDirection();

    // Light target tracks the player on the ground; light sits up the toSun ray.
    this.light.target.position.set(focus.x, 0, focus.z);
    this.light.position.copy(this.light.target.position).addScaledVector(this.toSun, SUN_DISTANCE);
    this.light.target.updateMatrixWorld();

    // Sun gets fiercer (brighter) as it climbs.
    this.light.intensity = THREE.MathUtils.lerp(2.4, 3.8, this.progress);
    this.disc.position.copy(this.light.position);

    // Sky drifts from a dawn glow toward a bleached midday blue.
    this._sky.copy(this._skyDawn).lerp(this._skyNoon, this.progress);
    if (this.scene.background && this.scene.background.isColor) {
      this.scene.background.copy(this._sky);
    }
    if (this.scene.fog) {
      this.scene.fog.color.copy(this._sky);
    }
  }

  /** 0..1 across the level day; handy for the HUD clock. */
  getProgress() {
    return this.progress;
  }

  /** Current sun elevation in degrees (for debugging / future tuning). */
  getElevationDeg() {
    return THREE.MathUtils.lerp(this.startAngle, this.endAngle, this.progress);
  }
}
