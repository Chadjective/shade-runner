import * as THREE from 'three';
import { makeFountain } from './props.js';

/**
 * Level 5 — "The Furnace" (desert biome). Shade is rare and precious: a couple
 * of oases, sparse sandstone mesas, and a rock arch. Deep sand slows you, dust
 * storms roll through, and the sun is high and fast — water and the umbrella are
 * lifelines. Also the parkour level: a grabbable mesa ledge and a long wall to
 * wall-run across a sun gap.
 *
 * Runs down -Z. Built from boxes/cylinders.
 */
export default function buildLevel5() {
  const group = new THREE.Group();
  const colliders = [];
  const occluders = [];

  function addBox(cx, cy, cz, sx, sy, sz, color, opts = {}) {
    const { collide = true, occlude = true, receive = true, roughness = 0.95 } = opts;
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    mesh.position.set(cx, cy, cz);
    mesh.castShadow = occlude;
    mesh.receiveShadow = receive;
    group.add(mesh);
    if (occlude) occluders.push(mesh);
    if (collide) {
      colliders.push(new THREE.Box3(
        new THREE.Vector3(cx - sx / 2, cy - sy / 2, cz - sz / 2),
        new THREE.Vector3(cx + sx / 2, cy + sy / 2, cz + sz / 2)
      ));
    }
    return mesh;
  }

  function addPalm(x, z) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.26, 3.2, 7),
      new THREE.MeshStandardMaterial({ color: 0x7a5a32, roughness: 1 })
    );
    trunk.position.set(x, 1.6, z);
    trunk.castShadow = true;
    group.add(trunk);
    colliders.push(new THREE.Box3(new THREE.Vector3(x - 0.3, 0, z - 0.3), new THREE.Vector3(x + 0.3, 3.2, z + 0.3)));
    const fronds = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, 0),
      new THREE.MeshStandardMaterial({ color: 0x3f7d3a, roughness: 0.95, flatShading: true })
    );
    fronds.position.set(x, 3.4, z);
    fronds.scale.y = 0.5;
    fronds.castShadow = true;
    group.add(fronds);
    occluders.push(fronds);
  }

  // -- sandy ground ---------------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 240),
    new THREE.MeshStandardMaterial({ color: 0xd8c89a, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -90);
  ground.receiveShadow = true;
  group.add(ground);

  // Low dune walls bound the course loosely (short — they don't shade much).
  const SAND = [0xcdb888, 0xc2a874, 0xd2bd90];
  for (const side of [-1, 1]) {
    let z = 2;
    let i = 0;
    while (z > -190) {
      const h = 3 + (i % 3);
      addBox(side * 15 + side * 4, h / 2, z - 5, 8, h, 10.5, SAND[i % SAND.length], { occlude: false });
      z -= 10;
      i++;
    }
  }

  // -- start oasis: palms + a fountain (precious early shade) ----------------
  addPalm(-3, -6);
  addPalm(3, -10);
  const oasis = makeFountain(0, -12);
  group.add(oasis.mesh);
  colliders.push(oasis.collider);

  // -- sandstone mesas (rare cover) -----------------------------------------
  addBox(-8, 5, -44, 7, 10, 9, 0xb5824a); // big mesa, casts a long shadow
  addBox(7, 3, -64, 8, 6, 7, 0xc89a6a);

  // A rock arch you can shelter under (overhead bridge).
  addBox(-6, 7, -88, 3, 1.4, 8, 0xb5824a); // arch span (overhead cover)
  addBox(-8.5, 3.5, -88, 2, 7, 2, 0xa8743e);
  addBox(-3.5, 3.5, -88, 2, 7, 2, 0xa8743e);

  // -- GRABBABLE MESA: a ~4m ledge to jump, grab, and climb -----------------
  addBox(2, 2, -104, 5, 4, 5, 0xc28a4a); // top at y4 — head-height on a jump

  // -- WALL-RUN WALL: a long wall to run along past an open gap --------------
  addBox(-9, 4, -130, 1.5, 8, 26, 0xb5824a); // long wall on the left, z[-143,-117]

  // -- a couple of cacti as minor obstacles ---------------------------------
  for (const [cx, cz] of [[6, -120], [-2, -150], [8, -150]]) {
    const cac = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.5, 2.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x4f7d4a, roughness: 1 })
    );
    cac.position.set(cx, 1.2, cz);
    cac.castShadow = true;
    group.add(cac);
    colliders.push(new THREE.Box3(new THREE.Vector3(cx - 0.5, 0, cz - 0.5), new THREE.Vector3(cx + 0.5, 2.4, cz + 0.5)));
  }

  // -- finish: a shaded canyon pavilion -------------------------------------
  const finishZ = -178;
  addBox(0, 6, finishZ, 13, 0.6, 13, 0x8a5a32, { roughness: 0.8 });
  for (const px of [-5.5, 5.5]) {
    for (const pz of [finishZ + 5.5, finishZ - 5.5]) addBox(px, 3, pz, 0.7, 6, 0.7, 0xa8743e);
  }

  // -- pads -----------------------------------------------------------------
  const startPad = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 0.06, 32),
    new THREE.MeshStandardMaterial({ color: 0x6ad7ff, emissive: 0x2aa0ff, emissiveIntensity: 1.2, roughness: 0.4 })
  );
  startPad.position.set(0, 0.04, 0);
  startPad.receiveShadow = true;
  group.add(startPad);
  const finishPad = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3, 0.06, 32),
    new THREE.MeshStandardMaterial({ color: 0x8effa6, emissive: 0x35ff7a, emissiveIntensity: 1.3, roughness: 0.4 })
  );
  finishPad.position.set(0, 0.05, finishZ);
  group.add(finishPad);

  const finishBox = new THREE.Box3(
    new THREE.Vector3(-4, -1, finishZ - 4),
    new THREE.Vector3(4, 6, finishZ + 4)
  );

  return {
    name: 'The Furnace',
    subtitle: 'Desert. Shade is rare, sand is slow, and the sun is merciless.',
    group,
    colliders,
    occluders,
    items: [
      { type: 'water', x: 0, y: 1.0, z: -30 },
      { type: 'umbrella', x: -8, y: 1.0, z: -54 },
      { type: 'ice', x: 7, y: 1.0, z: -76 },
      { type: 'water', x: 0, y: 1.0, z: -112 },
      { type: 'sunscreen', x: -3, y: 1.0, z: -140 },
      { type: 'water', x: 4, y: 1.0, z: -160 },
    ],
    coolZones: [{ x: 0, z: -12, r: 3.2 }],
    // Deep sand stretches slow you down.
    zones: [
      { type: 'mud', x: 0, z: -30, r: 8, speed: 0.55 },
      { type: 'mud', x: 0, z: -150, r: 9, speed: 0.55 },
    ],
    startPos: new THREE.Vector3(0, 0.9, 0),
    startYaw: 0,
    finishBox,
    finishCenter: new THREE.Vector3(0, 0, finishZ),
    courseLength: Math.abs(finishZ),
    // Brutal desert sun + dust + heat.
    sun: { cycle: 45, startAngle: 30 },
    wind: { gustMax: 1.1, period: 8 },
    weather: { events: ['dust'], calm: 10 },
  };
}
