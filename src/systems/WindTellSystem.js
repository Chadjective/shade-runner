import * as THREE from 'three';

/**
 * WindTellSystem: flags on poles that make the wind readable. Each flag turns
 * to stream downwind and lifts from a limp droop (calm) to horizontal +
 * fluttering (strong gust), so players can anticipate a shove before it hits.
 * Purely cosmetic — driven by the WindSystem's direction + strength.
 *
 * Level config: `level.windTells: [{x,z}]`.
 */
export default class WindTellSystem {
  constructor(scene, positions = []) {
    this.time = 0;
    this.flags = positions.map((p, i) => {
      const g = new THREE.Group();
      g.position.set(p.x, 0, p.z);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.07, 3, 8),
        new THREE.MeshStandardMaterial({ color: 0x8a8f9c, roughness: 0.7 })
      );
      pole.position.y = 1.5;
      pole.castShadow = true;
      g.add(pole);

      const pivot = new THREE.Group();
      pivot.position.set(0, 2.85, 0);
      g.add(pivot);

      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.8),
        new THREE.MeshStandardMaterial({ color: i % 2 ? 0xff6a3c : 0x4aa0ff, roughness: 0.85, side: THREE.DoubleSide })
      );
      flag.position.set(0.7, 0, 0); // streams out along the pivot's local +X
      pivot.add(flag);

      scene.add(g);
      return { pivot, phase: i * 1.3 };
    });
  }

  update(dt, windDir, strength) {
    this.time += dt;
    const yaw = Math.atan2(-windDir.z, windDir.x); // local +X arm points downwind
    const lift = Math.min(1, strength * 1.6);
    for (const f of this.flags) {
      f.pivot.rotation.y = yaw;
      // -1.2 rad = drooped straight down when calm; ~0 = horizontal in a gust.
      f.pivot.rotation.z = -1.2 * (1 - lift) + Math.sin(this.time * 9 + f.phase) * 0.18 * lift;
    }
  }
}
