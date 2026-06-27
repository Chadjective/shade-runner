import * as THREE from 'three';

/**
 * DynamicShadeSystem — moving / changing overhead cover, all of it real shade
 * the ShadeDetector raycast reads via `mesh.userData.shadeFactor`:
 *
 *   clouds  — translucent blobs that DRIFT across the sky (partial shade, ~0.6)
 *             each with a dark ground "shadow" you can chase
 *   blimp   — one big, slow, near-total shadow that crosses the whole level
 *   awnings — mechanical cover that RETRACTS and extends on a timer
 *
 * Generalises TrafficSystem's "moving occluder + per-frame matrix" idea. Ground
 * shadow decals are projected along the real sun direction each frame, so the
 * safe spot is visible and lines up with where the raycast actually clears.
 *
 * Level config (`level.dynamicShade`):
 *   { clouds:{count,y,shade,speed,spanX,zFrom,zTo,size},
 *     blimp:{y,shade,speed,xFrom,xTo,z},
 *     awnings:[{x,z,w,d,y,period,phase}] }
 */
export default class DynamicShadeSystem {
  constructor(scene, cfg = {}) {
    this.scene = scene;
    this.occluders = [];
    this.clouds = [];
    this.awnings = [];
    this.blimp = null;
    this.time = 0;
    this._g = new THREE.Vector3();

    if (cfg.clouds) this._buildClouds(cfg.clouds);
    if (cfg.blimp) this._buildBlimp(cfg.blimp);
    for (const a of cfg.awnings || []) this._buildAwning(a);
  }

  _decal(radius, opacity = 0.22) {
    const d = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 28),
      new THREE.MeshBasicMaterial({ color: 0x0a1020, transparent: true, opacity, depthWrite: false, fog: false })
    );
    d.rotation.x = -Math.PI / 2;
    d.position.y = 0.05;
    this.scene.add(d);
    return d;
  }

  _buildClouds(c) {
    const count = c.count ?? 3;
    const size = c.size ?? 11;
    const y = c.y ?? 30;
    const shade = c.shade ?? 0.6;
    const spanX = c.spanX ?? 60;
    const zFrom = c.zFrom ?? 0;
    const zTo = c.zTo ?? -60;
    const mat = new THREE.MeshStandardMaterial({ color: 0xf2f5fb, roughness: 1, transparent: true, opacity: 0.9, flatShading: true });
    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();
      // A few overlapping flattened puffs read as a cloud.
      for (let p = 0; p < 3; p++) {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(size * (0.6 + p * 0.18), 0), mat);
        puff.scale.y = 0.35;
        puff.position.set((p - 1) * size * 0.7, 0, (p % 2) * size * 0.3);
        puff.userData.shadeFactor = shade;
        group.add(puff);
        this.occluders.push(puff);
      }
      const z = zFrom + (zTo - zFrom) * ((i + 0.5) / count);
      const x0 = -spanX / 2 + (i / count) * spanX;
      group.position.set(x0, y, z);
      this.scene.add(group);
      this.clouds.push({
        group,
        z,
        y,
        xMin: -spanX / 2,
        xMax: spanX / 2,
        speed: (c.speed ?? 4) * (0.8 + i * 0.15),
        decal: this._decal(size * 1.3, 0.24),
      });
    }
  }

  _buildBlimp(b) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(3.4, 18, 12),
      new THREE.MeshStandardMaterial({ color: 0xb24a3a, roughness: 0.6, metalness: 0.1 })
    );
    body.scale.set(2.3, 1, 1);
    body.userData.shadeFactor = b.shade ?? 0.85;
    group.add(body);
    this.occluders.push(body);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.2), new THREE.MeshStandardMaterial({ color: 0x8a3328 }));
    fin.position.set(-7, 0, 0);
    group.add(fin);
    const y = b.y ?? 34;
    group.position.set(b.xFrom ?? -20, y, b.z ?? -120);
    this.scene.add(group);
    this.blimp = {
      group,
      y,
      z: b.z ?? -120,
      xFrom: b.xFrom ?? -20,
      xTo: b.xTo ?? 20,
      speed: b.speed ?? 3,
      dir: 1,
      decal: this._decal(9, 0.32),
    };
  }

  _buildAwning(a) {
    const w = a.w ?? 6;
    const d = a.d ?? 4;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.3, d),
      new THREE.MeshStandardMaterial({ color: 0xd2552f, roughness: 0.7 })
    );
    mesh.position.set(a.x, a.y ?? 3.4, a.z);
    mesh.castShadow = true;
    mesh.userData.shadeFactor = 1;
    this.scene.add(mesh);
    this.occluders.push(mesh);
    this.awnings.push({ mesh, baseZ: a.z, depth: d, period: a.period ?? 8, phase: a.phase ?? 0 });
  }

  /** @param {number} dt  @param {THREE.Vector3} toSun  unit vector toward the sun */
  update(dt, toSun) {
    this.time += dt;
    const project = (pos, decal, baseR) => {
      const t = pos.y / Math.max(0.15, toSun.y);
      decal.position.set(pos.x - toSun.x * t, 0.05, pos.z - toSun.z * t);
    };

    for (const c of this.clouds) {
      c.group.position.x += c.speed * dt;
      if (c.group.position.x > c.xMax) c.group.position.x = c.xMin;
      c.group.updateMatrixWorld(true);
      project(c.group.position, c.decal);
    }

    if (this.blimp) {
      const b = this.blimp;
      b.group.position.x += b.speed * b.dir * dt;
      if (b.group.position.x > b.xTo) b.dir = -1;
      else if (b.group.position.x < b.xFrom) b.dir = 1;
      b.group.updateMatrixWorld(true);
      project(b.group.position, b.decal);
    }

    for (const a of this.awnings) {
      // Triangle wave 0..1: extended (1) -> retracted (0) -> extended.
      const t = ((this.time + a.phase) % a.period) / a.period;
      const ext = t < 0.5 ? 1 - t * 2 : (t - 0.5) * 2; // 1 -> 0 -> 1
      a.mesh.userData.shadeFactor = ext; // partial shade as it slides
      a.mesh.position.z = a.baseZ - (1 - ext) * a.depth * 0.9; // slide back to the wall
      a.mesh.scale.z = 0.15 + ext * 0.85;
      a.mesh.updateMatrixWorld();
    }
  }
}
