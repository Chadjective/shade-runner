import * as THREE from 'three';
import { DEBRIS_KNOCK } from '../utils/constants.js';

/**
 * DebrisSystem — tumbleweeds blown across the course by the wind. They roll
 * along the current wind direction (faster in a gust), recycle when they leave
 * the play area, and give the player a shove if one rolls into them. Makes the
 * wind a physical thing to dodge, not just a push on the camera.
 *
 * Config: { count, xSpan, zMin, zMax } — null/absent = no debris.
 */
export default class DebrisSystem {
  constructor(scene, cfg) {
    this.scene = scene;
    this.active = !!cfg;
    this.pieces = [];
    if (!cfg) return;

    const count = cfg.count ?? 5;
    this.xSpan = cfg.xSpan ?? 28;
    this.zMin = cfg.zMin ?? 0;
    this.zMax = cfg.zMax ?? -100;
    const geo = new THREE.IcosahedronGeometry(0.6, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9a7b4a, roughness: 1, flatShading: true });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      scene.add(mesh);
      this.pieces.push({
        mesh,
        x: -this.xSpan + Math.random() * this.xSpan * 2,
        z: this.zMin + Math.random() * (this.zMax - this.zMin),
        r: 0.5 + Math.random() * 0.4,
        cd: 0,
      });
    }
  }

  _recycle(p) {
    p.z = this.zMin + Math.random() * (this.zMax - this.zMin);
  }

  /** @param {number} dt  @param {import('./WindSystem.js').default} wind  @param {*} player */
  update(dt, wind, player) {
    if (!this.active) return;
    const dir = wind.dir;
    const sp = 2.5 + wind.strength * 10;
    const pp = player.getPosition();
    for (const p of this.pieces) {
      p.x += dir.x * sp * dt;
      p.z += dir.z * sp * dt;
      if (p.x > this.xSpan) { p.x = -this.xSpan; this._recycle(p); }
      else if (p.x < -this.xSpan) { p.x = this.xSpan; this._recycle(p); }
      p.mesh.position.set(p.x, p.r, p.z);
      const roll = (sp * dt) / p.r;
      p.mesh.rotation.z -= roll * dir.x;
      p.mesh.rotation.x += roll * dir.z;

      if (p.cd > 0) p.cd -= dt;
      const dx = pp.x - p.x;
      const dz = pp.z - p.z;
      if (p.cd <= 0 && dx * dx + dz * dz < 1.3 * 1.3 && Math.abs(pp.y - p.r) < 1.6) {
        p.cd = 0.8; // don't shove every frame
        player.velocity.x += dir.x * DEBRIS_KNOCK;
        player.velocity.z += dir.z * DEBRIS_KNOCK;
        player.velocity.y += 1.5;
      }
    }
  }
}
