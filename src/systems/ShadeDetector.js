import * as THREE from 'three';
import { PLAYER_HEIGHT, SUN_DISTANCE } from '../utils/constants.js';

/**
 * ShadeDetector answers one question every frame: is the player standing in
 * direct sunlight, or is something between them and the sun?
 *
 * It fires a ray from roughly the player's torso straight at the sun (along
 * SunSystem.toSun). If that ray hits any occluder (a building, awning, tree
 * canopy, tunnel roof...) before reaching the sky, the player is in shade.
 *
 * This is independent of the shadow map — it reads true geometry, so shade
 * health logic stays accurate even where shadow-map resolution is fuzzy.
 */
export default class ShadeDetector {
  constructor(occluders) {
    this.occluders = occluders; // array of Meshes that block the sun
    this.ray = new THREE.Raycaster();
    this.ray.far = SUN_DISTANCE + 5;
    this._origin = new THREE.Vector3();
  }

  /**
   * @param {THREE.Vector3} playerPos  player center position
   * @param {THREE.Vector3} toSun      unit vector toward the sun
   * @returns {boolean} true if the player is exposed to direct sun
   */
  isInSun(playerPos, toSun) {
    // Fire from a little below the head so a low awning still counts as cover
    // but the ray clearly clears the ground the player stands on.
    this._origin.copy(playerPos);
    this._origin.y += PLAYER_HEIGHT * 0.25;

    this.ray.set(this._origin, toSun);
    const hits = this.ray.intersectObjects(this.occluders, false);
    return hits.length === 0;
  }
}
