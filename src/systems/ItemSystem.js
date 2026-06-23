import * as THREE from 'three';
import { ITEM_PICKUP_RADIUS } from '../utils/constants.js';

const PALETTE = {
  water: { body: 0x33b5ff, glow: 0x1488d8 },
  sunscreen: { body: 0xffa23c, glow: 0xd85a14 },
  umbrella: { body: 0xff5a3c, glow: 0x9c2a12 },
  hat: { body: 0xe8d27a, glow: 0x8a6a18 },
  sunglasses: { body: 0x2a2f3a, glow: 0x101218 },
};

/**
 * ItemSystem: floating pickups. It builds/spins/bobs the meshes and, on
 * proximity, marks them taken and returns the picked TYPES for this frame —
 * the Game routes each type to the right effect (heal, buff, or equip).
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
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

    if (type === 'sunscreen') {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.46, 14), bodyMat);
      group.add(tube);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 14), white);
      cap.position.y = 0.28;
      group.add(cap);
    } else if (type === 'umbrella') {
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.34, 16), bodyMat);
      canopy.position.y = 0.2;
      group.add(canopy);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 6), white);
      pole.position.y = -0.1;
      group.add(pole);
    } else if (type === 'hat') {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 18), bodyMat);
      group.add(brim);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.28, 16), bodyMat);
      crown.position.y = 0.16;
      group.add(crown);
    } else if (type === 'sunglasses') {
      const lensMat = new THREE.MeshStandardMaterial({ color: 0x101218, emissive: 0x223044, emissiveIntensity: 0.6, roughness: 0.15, metalness: 0.3 });
      for (const dx of [-0.2, 0.2]) {
        const lens = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.06), lensMat);
        lens.position.set(dx, 0, 0);
        group.add(lens);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.05), bodyMat);
      group.add(bridge);
    } else {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 14), bodyMat);
      group.add(bottle);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 12), white);
      cap.position.y = 0.31;
      group.add(cap);
    }

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
   * @returns {string[]} types picked up this frame (e.g. ['water'])
   */
  update(dt, playerPos) {
    this.time += dt;
    const picked = [];
    for (const item of this.items) {
      if (item.taken) continue;
      item.mesh.rotation.y += dt * 1.6;
      item.mesh.position.y = item.baseY + Math.sin(this.time * 2.2 + item.phase) * 0.14;

      if (item.pos.distanceTo(playerPos) < ITEM_PICKUP_RADIUS) {
        item.taken = true;
        item.mesh.visible = false;
        picked.push(item.type);
      }
    }
    return picked;
  }

  dispose() {
    for (const item of this.items) this.scene.remove(item.mesh);
    this.items = [];
  }
}
