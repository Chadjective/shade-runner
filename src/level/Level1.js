import * as THREE from 'three';
import { makeFountain } from './props.js';

/**
 * Level 1 — an urban canyon that runs down the -Z axis:
 *
 *   START → narrow alley → open plaza → market (awnings) → construction
 *         → wide boulevard → park (trees) → FINISH pavilion
 *
 * Everything is built from boxes / cylinders / icosahedrons. The function
 * returns the geometry group plus the two arrays the game logic needs:
 *   - colliders: Box3[]  the player can't walk through (and can stand on)
 *   - occluders: Mesh[]  things that block the sun (cast shade)
 *
 * Buildings line BOTH sides of the whole course, so they double as the level
 * boundary. How wide the canyon is per segment decides how exposed you are:
 * the narrow alley stays cool, the wide plaza and boulevard leave you out in
 * the open — and because the sun starts low, even the far walls throw long
 * shadows early on that shrink away as the day climbs.
 */

const COOL_WALLS = [0x4a5680, 0x3b4a78, 0x5a6390, 0x42507a, 0x6470a0, 0x394067];
const HEIGHT_JITTER = [0, 4, -2, 6, 1, -3, 3, 5];

export default function buildLevel1() {
  const group = new THREE.Group();
  const colliders = [];
  const occluders = [];

  // -- helpers --------------------------------------------------------------
  function addBox(cx, cy, cz, sx, sy, sz, color, opts = {}) {
    const { collide = true, occlude = true, receive = true, roughness = 0.92, emissive = 0x000000 } = opts;
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.0, emissive, emissiveIntensity: emissive ? 1 : 0 });
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
    trunk.receiveShadow = true;
    group.add(trunk);
    colliders.push(new THREE.Box3(
      new THREE.Vector3(x - 0.35 * scale, 0, z - 0.35 * scale),
      new THREE.Vector3(x + 0.35 * scale, trunkH, z + 0.35 * scale)
    ));

    const canopyR = 1.9 * scale;
    const canopy = new THREE.Mesh(
      new THREE.IcosahedronGeometry(canopyR, 0),
      new THREE.MeshStandardMaterial({ color: 0x2f7d4f, roughness: 0.95, flatShading: true })
    );
    canopy.position.set(x, trunkH + canopyR * 0.6, z);
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    group.add(canopy);
    occluders.push(canopy); // organic shade
  }

  // -- ground ---------------------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 320),
    new THREE.MeshStandardMaterial({ color: 0xc9c3b4, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -100);
  ground.receiveShadow = true;
  group.add(ground);

  // -- segments -------------------------------------------------------------
  const segments = [
    { type: 'alley', zStart: 4, zEnd: -22, laneHalf: 4, baseH: 16 },
    { type: 'plaza', zStart: -22, zEnd: -54, laneHalf: 17, baseH: 20 },
    { type: 'market', zStart: -54, zEnd: -90, laneHalf: 6, baseH: 12 },
    { type: 'construction', zStart: -90, zEnd: -122, laneHalf: 8, baseH: 14 },
    { type: 'boulevard', zStart: -122, zEnd: -154, laneHalf: 17, baseH: 22 },
    { type: 'park', zStart: -154, zEnd: -186, laneHalf: 12, baseH: 13 },
    { type: 'finish', zStart: -186, zEnd: -204, laneHalf: 7, baseH: 10 },
  ];

  const STEP = 6.5;
  const DEPTH = 9; // how far buildings extend away from the street
  let tile = 0;

  for (const seg of segments) {
    for (const side of [-1, 1]) {
      let c = seg.zEnd + STEP / 2;
      while (c < seg.zStart) {
        const h = seg.baseH + HEIGHT_JITTER[tile % HEIGHT_JITTER.length];
        const color = COOL_WALLS[tile % COOL_WALLS.length];
        const innerX = side * seg.laneHalf;
        const cx = innerX + side * (DEPTH / 2);
        addBox(cx, h / 2, c, DEPTH, h, STEP + 0.25, color);
        c += STEP;
        tile++;
      }
    }

    if (seg.type === 'market') addMarket(seg);
    if (seg.type === 'construction') addConstruction(seg);
    if (seg.type === 'park') addPark(seg);
    if (seg.type === 'plaza') addPlazaShelter(seg);
  }

  // -- market: alternating awnings over the street --------------------------
  function addMarket(seg) {
    let z = seg.zStart - 4;
    let side = -1;
    while (z > seg.zEnd + 3) {
      const innerX = side * seg.laneHalf;
      const depth = 3.2;
      const cx = innerX - side * (depth / 2);
      const color = side < 0 ? 0xd2552f : 0x2f86d2;
      addBox(cx, 3.3, z, depth, 0.3, 4.4, color, { collide: false, roughness: 0.7 });
      // little support strut (visual + slim collider)
      addBox(innerX - side * 0.2, 1.65, z, 0.2, 3.3, 0.2, 0x6b6b6b, { occlude: false });
      side *= -1;
      z -= 5.2;
    }
  }

  // -- construction: scaffolding decks + crate steps ------------------------
  function addConstruction(seg) {
    const midZ = (seg.zStart + seg.zEnd) / 2;
    const steel = 0x8a8f9c;

    // Two stacked decks you can climb onto for shade.
    addBox(-2.5, 2.4, midZ + 6, 7, 0.3, 6, steel, { roughness: 0.6 }); // lower deck
    addBox(2.5, 4.6, midZ - 4, 7, 0.3, 6, steel, { roughness: 0.6 }); // upper deck

    // Corner poles for the frame (thin, collidable).
    for (const dx of [-5.5, 1]) {
      for (const dz of [3, 9]) {
        addBox(dx, 2.4, midZ + 6 + (dz - 6), 0.25, 4.8, 0.25, steel);
      }
    }

    // Crate staircase up to the lower deck.
    addBox(-2.5, 0.5, midZ + 12.5, 1.4, 1, 1.4, 0x8a5a2b);
    addBox(-2.5, 1.4, midZ + 11.1, 1.4, 1.8, 1.4, 0x9a6634);
    // Crates bridging up to the higher deck.
    addBox(0.5, 3.0, midZ + 1.5, 1.4, 1.2, 1.4, 0x8a5a2b);
    addBox(2.5, 3.9, midZ, 1.4, 1.0, 1.4, 0x9a6634);
  }

  // -- park: a scatter of trees forming a shade path ------------------------
  function addPark(seg) {
    const trees = [
      [-7, -158, 1.1], [6, -160, 1.0], [-2, -163, 1.3], [8, -166, 0.9],
      [-8, -168, 1.0], [2, -171, 1.2], [-5, -174, 1.0], [7, -176, 1.1],
      [0, -179, 1.3], [-9, -181, 0.9], [9, -182, 1.0], [4, -184, 1.1],
    ];
    for (const [x, z, s] of trees) addTree(x, z, s);
  }

  // -- plaza: a lone bus-shelter — a tiny island of shade -------------------
  function addPlazaShelter(seg) {
    const x = 4.5, z = -38;
    addBox(x, 2.7, z, 4, 0.25, 2.6, 0x37557a, { roughness: 0.6 }); // roof
    addBox(x - 1.6, 1.3, z, 0.18, 2.6, 0.18, 0x6b6b6b); // posts
    addBox(x + 1.6, 1.3, z, 0.18, 2.6, 0.18, 0x6b6b6b);
  }

  // -- finish pavilion ------------------------------------------------------
  const finishZ = -196;
  // Big covered roof.
  addBox(0, 6, finishZ, 13, 0.5, 14, 0x2a3f70, { roughness: 0.7 });
  // Pillars.
  for (const px of [-5.5, 5.5]) {
    for (const pz of [finishZ + 6, finishZ - 6]) {
      addBox(px, 3, pz, 0.6, 6, 0.6, 0x9aa0b5);
    }
  }

  // -- start & finish pads (cosmetic glowing markers) -----------------------
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

  // -- finish zone (win trigger) --------------------------------------------
  const finishBox = new THREE.Box3(
    new THREE.Vector3(-4, -1, finishZ - 4),
    new THREE.Vector3(4, 6, finishZ + 4)
  );

  // -- pickups --------------------------------------------------------------
  const items = [
    { type: 'hat', x: 0, y: 1.0, z: -14 }, // alley: meet the sprint-vs-hat trade-off early
    { type: 'sunglasses', x: -3, y: 1.0, z: -44 }, // plaza
    { type: 'water', x: 3, y: 1.0, z: -68 }, // market: a reward slightly off the racing line
    { type: 'umbrella', x: -3, y: 1.0, z: -100 }, // construction: grab cover before the gauntlet
    { type: 'sunscreen', x: 0, y: 1.0, z: -119 }, // right before the boulevard sun gauntlet
  ];

  // -- cooling fountain in the park -----------------------------------------
  const fountain = makeFountain(5, -168);
  group.add(fountain.mesh);
  colliders.push(fountain.collider);
  const coolZones = [{ x: 5, z: -168, r: 3.2 }];

  // -- tinted-glass skybridge over the open boulevard (only HALF-blocks sun) -
  const sky = addBox(0, 5.5, -132, 12, 0.3, 7, 0x8fc7ff, { collide: false, roughness: 0.1 });
  sky.castShadow = false; // glass shouldn't drop a hard shadow
  sky.userData.shadeFactor = 0.5;

  // -- surface zones --------------------------------------------------------
  const zones = [
    { type: 'puddle', x: 2, z: -46, r: 2.2 }, // plaza — pairs with the rain shower
    { type: 'mist', x: -3, z: -72, r: 2.4 }, // market — cool but slick
    { type: 'mud', x: 3, z: -100, r: 2.6 }, // construction — slow going
    { type: 'hazard', x: 0, z: -138, r: 2.6, sunScaled: true }, // boulevard — reflective hot-spot (between the traffic lanes)
  ];

  // -- traffic in the boulevard: ride the moving shade ----------------------
  const traffic = [
    { from: [-4, 0, -118], to: [-4, 0, -160], speed: 7, size: [3, 3.4, 7], color: 0xe0584a },
    { from: [4, 0, -122], to: [4, 0, -164], speed: 5.5, size: [3, 3.4, 7], color: 0x4a78e0 },
  ];

  return {
    name: 'The Canyon',
    subtitle: 'A straight shot through the shade. Learn the heat.',
    group,
    colliders,
    occluders,
    items,
    coolZones,
    zones,
    traffic,
    weather: { events: ['rain'] }, // a passing shower partway through
    startPos: new THREE.Vector3(0, 0.9, 0),
    startYaw: 0,
    finishBox,
    finishCenter: new THREE.Vector3(0, 0, finishZ),
    courseLength: Math.abs(finishZ),
  };
}
