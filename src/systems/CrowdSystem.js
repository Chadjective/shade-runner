import * as THREE from 'three';

/**
 * CrowdSystem — pedestrians milling along the street. You weave through them
 * (slim moving colliders), and the ones carrying parasols are mobile cover:
 * each parasol is an occluder the shade raycast reads, so you can tuck behind
 * someone for a moment of shade.
 *
 * Config: array of peds — { x, z, axis:'x'|'z', range, speed, parasol, color }.
 * Each paddles back and forth around (x,z) along its axis.
 */
const SKIN = [0xd9a07a, 0xb5764f, 0xe8c6a0, 0x8a5a3c];
const CLOTHES = [0x4a6fa5, 0xa5544a, 0x4a9a72, 0x9a8a4a, 0x6a5a9a];
const PARASOLS = [0xff6a4a, 0x4aa0ff, 0xffc24a, 0x8a6aff];

export default class CrowdSystem {
  constructor(scene, defs = []) {
    this.scene = scene;
    this.time = 0;
    this.occluders = [];
    this.colliders = [];
    this.peds = defs.map((d, i) => this._build(d, i));
    this._sync(0);
  }

  _build(d, i) {
    const group = new THREE.Group();
    const cloth = d.color ?? CLOTHES[i % CLOTHES.length];
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.8, 4, 8),
      new THREE.MeshStandardMaterial({ color: cloth, roughness: 0.8 })
    );
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 8),
      new THREE.MeshStandardMaterial({ color: SKIN[i % SKIN.length], roughness: 0.7 })
    );
    head.position.y = 1.4;
    head.castShadow = true;
    group.add(head);

    if (d.parasol) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6),
        new THREE.MeshStandardMaterial({ color: 0x6b6b6b })
      );
      pole.position.y = 2.0;
      group.add(pole);
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(1.0, 0.4, 14),
        new THREE.MeshStandardMaterial({ color: PARASOLS[i % PARASOLS.length], roughness: 0.6, side: THREE.DoubleSide })
      );
      canopy.position.y = 2.6;
      canopy.castShadow = true;
      canopy.userData.shadeFactor = 0.7; // partial mobile shade
      group.add(canopy);
      this.occluders.push(canopy);
    }

    this.scene.add(group);
    const box = new THREE.Box3();
    this.colliders.push(box);
    return {
      group, box,
      bx: d.x, bz: d.z,
      axis: d.axis === 'z' ? 'z' : 'x',
      range: d.range ?? 6,
      w: (0.45 + (d.speed ?? 0.6)) * (i % 2 ? 1 : -1),
      phase: i * 1.3,
    };
  }

  _sync() {
    for (const p of this.peds) {
      const off = Math.sin(this.time * p.w + p.phase) * p.range;
      const x = p.axis === 'x' ? p.bx + off : p.bx;
      const z = p.axis === 'z' ? p.bz + off : p.bz;
      p.group.position.set(x, Math.abs(Math.sin(this.time * 6 + p.phase)) * 0.04, z);
      // Face direction of travel.
      const dir = Math.cos(this.time * p.w + p.phase) * p.w;
      p.group.rotation.y = p.axis === 'x' ? (dir >= 0 ? Math.PI / 2 : -Math.PI / 2) : (dir >= 0 ? 0 : Math.PI);
      p.group.updateMatrixWorld(true);
      p.box.min.set(x - 0.4, 0, z - 0.4);
      p.box.max.set(x + 0.4, 1.7, z + 0.4);
    }
  }

  update(dt) {
    this.time += dt;
    this._sync();
  }
}
