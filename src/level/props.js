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

/**
 * An updraft vent: a floor grate with a faint rising air column. Returns just
 * the mesh; the caller registers a matching entry in `updrafts` so the player
 * gets launched upward inside the column (great paired with the umbrella glide).
 */
export function makeVent(x, z, top = 6) {
  const g = new THREE.Group();

  const grate = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.12, 2),
    new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.7, metalness: 0.3 })
  );
  grate.position.set(x, 0.06, z);
  grate.receiveShadow = true;
  g.add(grate);

  // Faint shimmering air column so the lift reads.
  const col = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.0, top, 12, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xdff1ff, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide })
  );
  col.position.set(x, top / 2, z);
  g.add(col);

  return { mesh: g };
}
