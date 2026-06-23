import * as THREE from 'three';
import { makeFountain } from './props.js';

/**
 * Level 3 — "The Long Mile". The big one: ~305 units, roughly the length of
 * Levels 1 and 2 combined, and it uses every mechanic in the game.
 *
 *   START alley → boulevard w/ traffic → market awnings → the SPLIT
 *   (high walkway + zipline vs shaded tunnel) → park + fountain → a second,
 *   longer traffic boulevard (the gauntlet) → construction climb → FINISH.
 *
 * Pickups (umbrella, water, sunscreen) are spread along it; the sun cycle is
 * stretched to match the length so it stays tense-but-fair.
 */

const COOL_WALLS = [0x4a5680, 0x3b4a78, 0x5a6390, 0x42507a, 0x6470a0, 0x394067];
const HJIT = [0, 4, -2, 6, 1, -3, 3, 5];

export default function buildLevel3() {
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

  function addTree(x, z, scale = 1) {
    const trunkH = 2.4 * scale;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22 * scale, 0.3 * scale, trunkH, 8),
      new THREE.MeshStandardMaterial({ color: 0x4b3a2a, roughness: 1 })
    );
    trunk.position.set(x, trunkH / 2, z);
    trunk.castShadow = true;
    group.add(trunk);
    colliders.push(new THREE.Box3(
      new THREE.Vector3(x - 0.35 * scale, 0, z - 0.35 * scale),
      new THREE.Vector3(x + 0.35 * scale, trunkH, z + 0.35 * scale)
    ));
    const r = 1.9 * scale;
    const canopy = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r, 0),
      new THREE.MeshStandardMaterial({ color: 0x2f7d4f, roughness: 0.95, flatShading: true })
    );
    canopy.position.set(x, trunkH + r * 0.6, z);
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    group.add(canopy);
    occluders.push(canopy);
  }

  // -- ground ---------------------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 420),
    new THREE.MeshStandardMaterial({ color: 0xc9c3b4, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -150);
  ground.receiveShadow = true;
  group.add(ground);

  // -- segments (boundary buildings line both sides the whole way) ----------
  const segments = [
    { type: 'alley', zStart: 4, zEnd: -24, laneHalf: 4.5, baseH: 16 },
    { type: 'boulevard', zStart: -24, zEnd: -70, laneHalf: 16, baseH: 20 },
    { type: 'market', zStart: -70, zEnd: -108, laneHalf: 6, baseH: 12 },
    { type: 'split', zStart: -108, zEnd: -170, laneHalf: 13, baseH: 18 },
    { type: 'park', zStart: -170, zEnd: -205, laneHalf: 12, baseH: 13 },
    { type: 'gauntlet', zStart: -205, zEnd: -255, laneHalf: 16, baseH: 22 },
    { type: 'construction', zStart: -255, zEnd: -290, laneHalf: 8, baseH: 14 },
    { type: 'finish', zStart: -290, zEnd: -308, laneHalf: 7, baseH: 10 },
  ];

  const STEP = 7;
  const DEPTH = 9;
  let tile = 0;
  for (const seg of segments) {
    for (const side of [-1, 1]) {
      let c = seg.zEnd + STEP / 2;
      while (c < seg.zStart) {
        const h = seg.baseH + HJIT[tile % HJIT.length];
        const cx = side * seg.laneHalf + side * (DEPTH / 2);
        addBox(cx, h / 2, c, DEPTH, h, STEP + 0.25, COOL_WALLS[tile % COOL_WALLS.length]);
        c += STEP;
        tile++;
      }
    }
    if (seg.type === 'market') addMarket(seg);
  }

  function addMarket(seg) {
    let z = seg.zStart - 4;
    let side = -1;
    while (z > seg.zEnd + 3) {
      const innerX = side * seg.laneHalf;
      const cx = innerX - side * 1.6;
      addBox(cx, 3.3, z, 3.2, 0.3, 4.4, side < 0 ? 0xd2552f : 0x2f86d2, { collide: false, roughness: 0.7 });
      addBox(innerX - side * 0.2, 1.65, z, 0.2, 3.3, 0.2, 0x6b6b6b, { occlude: false });
      side *= -1;
      z -= 5.2;
    }
  }

  // -- the split: high walkway (+ zipline) vs shaded tunnel -----------------
  addBox(0, 3, -138, 3.2, 6, 57, 0x39406a); // median, z[-166.5,-109.5]
  // high road (left)
  addBox(-7, 0.75, -112, 3.6, 1.5, 3.2, 0x6470a0, { roughness: 0.6 }); // step, top 1.5
  addBox(-7, 2.85, -138, 4, 0.3, 52, 0x8a90a8, { roughness: 0.55 }); // walkway, top 3.0
  addBox(-9.1, 3.4, -138, 0.2, 0.8, 52, 0x9aa0b8, { occlude: false });
  addBox(-4.9, 3.4, -138, 0.2, 0.8, 52, 0x9aa0b8, { occlude: false });
  addBox(-7, 5.2, -124, 5, 0.3, 6, 0x2f86d2, { collide: false, roughness: 0.6 });
  addBox(-7, 5.2, -152, 5, 0.3, 6, 0xd2552f, { collide: false, roughness: 0.6 });
  // low road (right): tunnel
  addBox(7, 3.9, -138, 9, 0.5, 54, 0x2a3f70, { roughness: 0.7 });
  for (const px of [3, 11]) {
    for (const pz of [-114, -138, -162]) addBox(px, 1.9, pz, 0.45, 3.8, 0.45, 0x8a8f9c);
  }

  // -- park: trees + a cooling fountain -------------------------------------
  const trees = [
    [-8, -174, 1.1], [7, -176, 1.0], [0, -180, 1.3], [-5, -185, 1.0],
    [8, -188, 0.9], [-9, -192, 1.0], [4, -196, 1.1], [-3, -200, 1.0],
  ];
  for (const [x, z, s] of trees) addTree(x, z, s);
  const fountain = makeFountain(6, -188);
  group.add(fountain.mesh);
  colliders.push(fountain.collider);

  // -- construction climb (off the racing line; optional shade decks) -------
  addBox(-3, 2.4, -268, 7, 0.3, 6, 0x8a8f9c, { roughness: 0.6 });
  addBox(3, 4.4, -278, 7, 0.3, 6, 0x8a8f9c, { roughness: 0.6 });
  addBox(-3, 0.5, -262, 1.4, 1, 1.4, 0x8a5a2b);
  addBox(-3, 1.4, -264, 1.4, 1.8, 1.4, 0x9a6634);

  // -- finish pavilion ------------------------------------------------------
  const finishZ = -300;
  addBox(0, 6, finishZ, 13, 0.5, 14, 0x223a66, { roughness: 0.7 });
  for (const px of [-5.5, 5.5]) {
    for (const pz of [finishZ + 6, finishZ - 6]) addBox(px, 3, pz, 0.6, 6, 0.6, 0x9aa0b5);
  }

  // -- glowing pads ---------------------------------------------------------
  const startPad = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 0.06, 32),
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

  // -- interactive content --------------------------------------------------
  const items = [
    { type: 'hat', x: 0, y: 1.0, z: -16 }, // alley
    { type: 'sunglasses', x: 3, y: 1.0, z: -50 }, // first boulevard
    { type: 'water', x: 3, y: 1.0, z: -88 }, // market
    { type: 'sunscreen', x: -7, y: 3.9, z: -138 }, // high-road walkway
    { type: 'water', x: 7, y: 1.0, z: -138 }, // low-road tunnel
    { type: 'umbrella', x: 0, y: 1.0, z: -203 }, // grab cover before the gauntlet
    { type: 'sunscreen', x: 0, y: 1.0, z: -272 }, // construction stretch
  ];

  const coolZones = [{ x: 6, z: -188, r: 3.2 }];

  const ziplines = [
    { from: [-7, 3.5, -162], to: [-1.5, 2.2, -178] }, // bail off the walkway into the park
  ];

  const traffic = [
    // boulevard #1
    { from: [-4.5, 0, -28], to: [-4.5, 0, -66], speed: 7, size: [3, 3.4, 7], color: 0xe0584a },
    { from: [4.5, 0, -32], to: [4.5, 0, -68], speed: 5.5, size: [3, 3.4, 7], color: 0x4a78e0 },
    // the gauntlet (boulevard #2) — busier
    { from: [-5, 0, -208], to: [-5, 0, -252], speed: 8, size: [3, 3.4, 7], color: 0xe0a84a },
    { from: [5, 0, -210], to: [5, 0, -254], speed: 6, size: [3, 3.4, 7], color: 0x4ad0c0 },
    { from: [0, 0, -212], to: [0, 0, -250], speed: 9, size: [3, 3.4, 8], color: 0xd24a9a },
  ];

  return {
    name: 'The Long Mile',
    subtitle: 'Everything at once, twice as far. Survive the whole crosstown run.',
    group,
    colliders,
    occluders,
    items,
    coolZones,
    ziplines,
    traffic,
    startPos: new THREE.Vector3(0, 0.9, 0),
    startYaw: 0,
    finishBox,
    finishCenter: new THREE.Vector3(0, 0, finishZ),
    courseLength: Math.abs(finishZ),
    // Longer course -> a longer day so the danger ramp matches the run length.
    sun: { cycle: 95, startAngle: 16 },
  };
}
