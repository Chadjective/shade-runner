import * as THREE from 'three';
import { ITEM_PICKUP_RADIUS } from '../utils/constants.js';

const PALETTE = {
  water: { body: 0x33b5ff, glow: 0x1488d8 },
  sunscreen: { body: 0xffa23c, glow: 0xd85a14 },
};

/**
 * ItemSystem: floating pickups (water = instant heal, sunscreen = timed sun
 * shield). It builds the meshes, spins/bobs them, and on proximity applies the
 * effect through the HealthSystem, returning a short label for HUD feedback.
 */
export default class ItemSystem {
  constructor(scene, defs = []) {
    this.scene = scene;
    this.time = 0;
    this.items = defs.map((def, i) => {
      const mesh = this._build(def.type);
      const y = def.y ?? 1.0;
      mesh.position.set(def.x, y, def.z);
      scene.add(mesh);
      return { type: def.type, mesh, baseY: y, phase: i * 1.7, taken: false, pos: new THREE.Vector3(def.x, y, def.z) };
    });
  }

  _build(type) {
    const c = PALETTE[type] || PALETTE.water;
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: c.body, emissive: c.glow, emissiveIntensity: 0.9, roughness: 0.35 });

    if (type === 'sunscreen') {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.46, 14), bodyMat);
      group.add(tube);
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.1, 14),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
      );
      cap.position.y = 0.28;
      group.add(cap);
    } else {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 14), bodyMat);
      group.add(bottle);
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
      );
      cap.position.y = 0.31;
      group.add(cap);
    }

    // Floating halo ring so it reads as a pickup from a distance.
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.04, 8, 24),
      new THREE.MeshStandardMaterial({ color: c.body, emissive: c.glow, emissiveIntensity: 1.4, roughness: 0.4 })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -0.12;
    group.add(halo);

    return group;
  }

  /**
   * @returns {string[]} labels for any items picked up this frame
   */
  update(dt, playerPos, health) {
    this.time += dt;
    const picked = [];
    for (const item of this.items) {
      if (item.taken) continue;
      item.mesh.rotation.y += dt * 1.6;
      item.mesh.position.y = item.baseY + Math.sin(this.time * 2.2 + item.phase) * 0.14;

      if (item.pos.distanceTo(playerPos) < ITEM_PICKUP_RADIUS) {
        item.taken = true;
        item.mesh.visible = false;
        picked.push(health.applyPickup(item.type));
      }
    }
    return picked;
  }

  dispose() {
    for (const item of this.items) {
      this.scene.remove(item.mesh);
    }
    this.items = [];
  }
}
