import * as THREE from 'three';
import { ZIPLINE_SPEED, ZIPLINE_GRAB_RADIUS } from '../utils/constants.js';

const UP = new THREE.Vector3(0, 1, 0);

/**
 * ZiplineSystem: cables you ride from a high point to a low one.
 *
 * Run near a cable's high end and you auto-grab; you then slide to the far end
 * (fast, hands-free) and drop off — or tap Space to bail early. While riding,
 * `player.onZipline` is true so PlayerController skips its own physics and the
 * ZiplineSystem owns the position. Great for bailing off the high road fast.
 *
 * Config: { from:[x,y,z], to:[x,y,z] } — `from` is the grab (high) end.
 */
export default class ZiplineSystem {
  constructor(scene, defs = []) {
    this.scene = scene;
    this.cooldown = 0;
    this.active = null;
    this.t = 0;
    this.lines = defs.map((d) => {
      const from = new THREE.Vector3(...d.from);
      const to = new THREE.Vector3(...d.to);
      this._buildCable(scene, from, to);
      return { from, to, len: from.distanceTo(to) || 1 };
    });
    this._dir = new THREE.Vector3();
  }

  _buildCable(scene, from, to) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, len, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.6 })
    );
    cable.position.copy(from).addScaledVector(dir, 0.5);
    cable.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
    scene.add(cable);
    // End posts so the grab point reads.
    for (const end of [from, to]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 1.0, 8),
        new THREE.MeshStandardMaterial({ color: 0x9aa0b5, roughness: 0.7 })
      );
      post.position.set(end.x, end.y - 0.5, end.z);
      post.castShadow = true;
      scene.add(post);
    }
  }

  update(dt, player) {
    if (this.cooldown > 0) this.cooldown -= dt;

    if (player.onZipline && this.active) {
      // Bail early with a jump.
      if (player.keys.Space) {
        this._detach(player, true);
        return;
      }
      this.t += (ZIPLINE_SPEED * dt) / this.active.len;
      if (this.t >= 1) {
        this._detach(player, false);
        return;
      }
      player.mesh.position.lerpVectors(this.active.from, this.active.to, this.t);
      player.mesh.position.y -= 0.9; // hang below the cable
      return;
    }

    if (!player.onZipline && this.cooldown <= 0) {
      for (const l of this.lines) {
        if (player.getPosition().distanceTo(l.from) < ZIPLINE_GRAB_RADIUS) {
          this._attach(player, l);
          break;
        }
      }
    }
  }

  _attach(player, line) {
    this.active = line;
    this.t = 0;
    player.onZipline = true;
    player.velocity.set(0, 0, 0);
  }

  _detach(player, bailed) {
    player.onZipline = false;
    // Carry momentum off the end (or a small hop when bailing).
    this._dir.subVectors(this.active.to, this.active.from).setY(0);
    if (this._dir.lengthSq() > 1e-4) this._dir.normalize();
    const fwd = bailed ? 4 : 7;
    player.velocity.set(this._dir.x * fwd, bailed ? 3 : 1, this._dir.z * fwd);
    this.active = null;
    this.t = 0;
    this.cooldown = 0.6; // don't immediately re-grab
  }
}
