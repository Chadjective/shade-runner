import * as THREE from 'three';

/**
 * A fountain prop + its cooling zone. Returns the mesh group and a low basin
 * collider; the caller registers a matching entry in `coolZones` so standing in
 * the mist recovers health fast. Built from cylinders + a faint mist dome.
 */
export function makeFountain(x, z) {
  const g = new THREE.Group();

  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.5, 0.5, 20),
    new THREE.MeshStandardMaterial({ color: 0x6a7a92, roughness: 0.85 })
  );
  basin.position.set(x, 0.25, z);
  basin.castShadow = true;
  basin.receiveShadow = true;
  g.add(basin);

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(1.12, 1.12, 0.12, 20),
    new THREE.MeshStandardMaterial({ color: 0x4fc3ff, emissive: 0x176aa0, emissiveIntensity: 0.55, roughness: 0.2, transparent: true, opacity: 0.88 })
  );
  water.position.set(x, 0.52, z);
  g.add(water);

  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.17, 1.1, 10),
    new THREE.MeshStandardMaterial({ color: 0x6a7a92, roughness: 0.7 })
  );
  spout.position.set(x, 1.05, z);
  g.add(spout);

  // Cosmetic mist dome — signals the cooling zone.
  const mist = new THREE.Mesh(
    new THREE.SphereGeometry(2.7, 14, 10),
    new THREE.MeshStandardMaterial({ color: 0xcdecff, transparent: true, opacity: 0.08, depthWrite: false })
  );
  mist.position.set(x, 1.5, z);
  g.add(mist);

  const collider = new THREE.Box3(
    new THREE.Vector3(x - 1.5, 0, z - 1.5),
    new THREE.Vector3(x + 1.5, 0.6, z + 1.5)
  );

  return { mesh: g, collider };
}
