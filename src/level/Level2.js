import * as THREE from 'three';

/**
 * Level 2 — "The Interchange". A multi-path, multi-level course.
 *
 * A long central median splits the course in two; both roads rejoin at a merge
 * plaza before the finish:
 *
 *   HIGH ROAD (left)  — climb a couple of blocks onto an elevated walkway.
 *                       Fast and direct, but exposed to the sun; carries a
 *                       sunscreen pickup and a couple of shade canopies.
 *   LOW ROAD (right)  — a ground-level tunnel. Fully shaded and safe, with a
 *                       water pickup, but the slower, longer way around.
 *
 * Runs down -Z like Level 1. Built entirely from boxes/cylinders.
 */

const COOL_WALLS = [0x4a5680, 0x3b4a78, 0x5a6390, 0x42507a, 0x6470a0];
const HJIT = [0, 5, -2, 7, 2, -4, 4];

export default function buildLevel2() {
  const group = new THREE.Group();
  const colliders = [];
  const occluders = [];

  function addBox(cx, cy, cz, sx, sy, sz, color, opts = {}) {
    const { collide = true, occlude = true, receive = true, roughness = 0.9, emissive = 0x000000 } = opts;
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, emissive, emissiveIntensity: emissive ? 1 : 0 });
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

  // -- ground ---------------------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 130),
    new THREE.MeshStandardMaterial({ color: 0xcabfa9, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -46);
  ground.receiveShadow = true;
  group.add(ground);

  // -- boundary buildings both sides (inner faces at x = +/-13) -------------
  const STEP = 7;
  let tile = 0;
  for (const side of [-1, 1]) {
    let z = 2;
    while (z > -96) {
      const h = 13 + HJIT[tile % HJIT.length];
      addBox(side * 13 + side * 4.5, h / 2, z - STEP / 2, 9, h, STEP + 0.25, COOL_WALLS[tile % COOL_WALLS.length]);
      z -= STEP;
      tile++;
    }
  }

  // -- central median that forces the fork ----------------------------------
  addBox(0, 3, -39, 3.2, 6, 50, 0x39406a); // x[-1.6,1.6], z[-64,-14], top y6

  // ===================== HIGH ROAD (left, x < -1.6) ========================
  // Two climbable blocks up onto an elevated walkway.
  addBox(-7, 0.75, -16, 3.6, 1.5, 3.2, 0x6470a0, { roughness: 0.6 }); // step, top 1.5
  const walkway = -7;
  addBox(walkway, 2.85, -40, 4, 0.3, 46, 0x8a90a8, { roughness: 0.55 }); // deck, top 3.0, z[-63,-17]
  // Side rails (thin, mostly cosmetic but collidable so you don't slide off easily)
  addBox(walkway - 2.1, 3.4, -40, 0.2, 0.8, 46, 0x9aa0b8, { occlude: false });
  addBox(walkway + 2.1, 3.4, -40, 0.2, 0.8, 46, 0x9aa0b8, { occlude: false });
  // Shade canopies over the exposed walkway (overhead cover; not collidable).
  addBox(walkway, 5.2, -28, 5, 0.3, 6, 0x2f86d2, { collide: false, roughness: 0.6 });
  addBox(walkway, 5.2, -52, 5, 0.3, 6, 0xd2552f, { collide: false, roughness: 0.6 });

  // ===================== LOW ROAD (right, x > 1.6) =========================
  // Ground-level tunnel: a long roof on pillars -> fully shaded.
  addBox(7, 3.9, -38, 9, 0.5, 48, 0x2a3f70, { roughness: 0.7 }); // roof top ~4.15, x[2.5,11.5], z[-62,-14]
  for (const px of [3, 11]) {
    for (const pz of [-16, -38, -60]) {
      addBox(px, 1.9, pz, 0.45, 3.8, 0.45, 0x8a8f9c);
    }
  }

  // -- merge plaza breather canopy + finish pavilion ------------------------
  addBox(0, 4.4, -72, 7, 0.3, 6, 0x37557a, { collide: false, roughness: 0.6 }); // small shade island at the merge
  for (const px of [-3, 3]) addBox(px, 2.2, -72, 0.4, 4.4, 0.4, 0x9aa0b8);

  const finishZ = -88;
  addBox(0, 5.6, finishZ, 12, 0.5, 11, 0x223a66, { roughness: 0.7 }); // pavilion roof
  for (const px of [-4.6, 4.6]) {
    for (const pz of [finishZ + 4.5, finishZ - 4.5]) {
      addBox(px, 2.8, pz, 0.55, 5.6, 0.55, 0x9aa0b5);
    }
  }

  // -- glowing start / finish pads ------------------------------------------
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

  // -- pickups: sunscreen rewards the exposed high road, water the tunnel ---
  const items = [
    { type: 'sunscreen', x: walkway, y: 3.9, z: -40 }, // on the elevated walkway
    { type: 'water', x: 7, y: 1.0, z: -38 }, // inside the shaded tunnel
  ];

  return {
    name: 'The Interchange',
    subtitle: 'High road or low road — sun and speed, or shade and patience.',
    group,
    colliders,
    occluders,
    items,
    startPos: new THREE.Vector3(0, 0.9, 0),
    startYaw: 0,
    finishBox,
    finishCenter: new THREE.Vector3(0, 0, finishZ),
    courseLength: Math.abs(finishZ),
    // A hotter, faster day than Level 1 — the sun climbs quicker here.
    sun: { cycle: 45, startAngle: 22 },
  };
}
