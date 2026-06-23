import * as THREE from 'three';

/**
 * TrafficSystem: vehicles that drive along the street on a loop. Each is both
 * an occluder (its shadow is real, so it sweeps moving shade across the road —
 * "ride the shadow") and a collider (you can't walk through it). The Box3
 * colliders and world matrices are updated every frame so both collision and
 * the shade raycast stay correct, even when driven headlessly without a render.
 *
 * Vehicle config: { from:[x,y,z], to:[x,y,z], speed, size:[w,h,l], color }.
 * `speed` is in units/sec; the vehicle loops from->to and snaps back.
 */
export default class TrafficSystem {
  constructor(scene, configs = []) {
    this.scene = scene;
    this.occluders = [];
    this.colliders = [];
    this.vehicles = configs.map((c) => {
      const from = new THREE.Vector3(...c.from);
      const to = new THREE.Vector3(...c.to);
      const size = c.size || [3, 3.4, 7];
      const mesh = this._build(size, c.color ?? 0xdadfe8);
      mesh.position.copy(from);
      scene.add(mesh);
      this.occluders.push(mesh);
      const box = new THREE.Box3();
      this.colliders.push(box);
      const len = from.distanceTo(to) || 1;
      return { mesh, from, to, len, size, t: Math.random(), frac: (c.speed || 6) / len, box };
    });
    this._sync(0);
  }

  _build([w, h, l], color) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, l),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 })
    );
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    // A window stripe so it reads as a vehicle, not a crate.
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.02, h * 0.3, l * 0.9),
      new THREE.MeshStandardMaterial({ color: 0x18324a, emissive: 0x0a2236, emissiveIntensity: 0.5, roughness: 0.2 })
    );
    glass.position.y = h * 0.68;
    group.add(glass);
    return group;
  }

  _sync() {
    for (const v of this.vehicles) {
      v.mesh.position.lerpVectors(v.from, v.to, v.t);
      v.mesh.updateMatrixWorld(true); // keep raycast/shadow correct headlessly
      const [w, h, l] = v.size;
      v.box.min.set(v.mesh.position.x - w / 2, 0, v.mesh.position.z - l / 2);
      v.box.max.set(v.mesh.position.x + w / 2, h, v.mesh.position.z + l / 2);
    }
  }

  update(dt) {
    for (const v of this.vehicles) {
      v.t += v.frac * dt;
      if (v.t > 1) v.t -= 1; // loop (one-way conveyor)
    }
    this._sync();
  }
}
