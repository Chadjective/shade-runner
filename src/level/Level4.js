import * as THREE from 'three';
import { makeFountain } from './props.js';

/**
 * Level 4 — "Last Light". A dusk run: the sun starts high and SETS over the
 * course (reverse arc), so shadows lengthen and rake sideways as the low sun
 * slides across — safe spots keep shifting. Front-loaded heat that eases toward
 * a calm, orange-lit finish, with an eclipse and a flare for mid-run spice.
 *
 * Showcases the Phase-F package: eclipse + checkpoints + wind tells + an
 * ice-drink, on top of clouds, retracting awnings, traffic and a fountain.
 */

const COOL_WALLS = [0x4a5680, 0x3b4a78, 0x5a6390, 0x42507a, 0x6470a0, 0x394067];
const HJIT = [0, 4, -2, 6, 1, -3, 3, 5];

export default function buildLevel4() {
  const group = new THREE.Group();
  const colliders = [];
  const occluders = [];

  function addBox(cx, cy, cz, sx, sy, sz, color, opts = {}) {
    const { collide = true, occlude = true, receive = true, roughness = 0.9 } = opts;
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
    new THREE.PlaneGeometry(150, 250),
    new THREE.MeshStandardMaterial({ color: 0xcbbca6, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -85);
  ground.receiveShadow = true;
  group.add(ground);

  // -- segments / boundary buildings ----------------------------------------
  const segments = [
    { type: 'alley', zStart: 4, zEnd: -16, laneHalf: 4.5, baseH: 15 },
    { type: 'boulevard', zStart: -16, zEnd: -58, laneHalf: 15, baseH: 19 },
    { type: 'market', zStart: -58, zEnd: -96, laneHalf: 6, baseH: 12 },
    { type: 'square', zStart: -96, zEnd: -134, laneHalf: 14, baseH: 18 },
    { type: 'park', zStart: -134, zEnd: -162, laneHalf: 11, baseH: 13 },
    { type: 'finish', zStart: -162, zEnd: -178, laneHalf: 7, baseH: 10 },
  ];
  const STEP = 7;
  const DEPTH = 9;
  let tile = 0;
  for (const seg of segments) {
    for (const side of [-1, 1]) {
      let c = seg.zEnd + STEP / 2;
      while (c < seg.zStart) {
        const h = seg.baseH + HJIT[tile % HJIT.length];
        addBox(side * seg.laneHalf + side * (DEPTH / 2), h / 2, c, DEPTH, h, STEP + 0.25, COOL_WALLS[tile % COOL_WALLS.length]);
        c += STEP;
        tile++;
      }
    }
  }

  // -- park trees + a fountain in the square --------------------------------
  for (const [x, z, s] of [[-7, -140, 1.1], [6, -144, 1.0], [0, -150, 1.3], [-5, -155, 1.0], [8, -158, 0.9]]) addTree(x, z, s);
  const fountain = makeFountain(5, -115);
  group.add(fountain.mesh);
  colliders.push(fountain.collider);

  // -- finish pavilion ------------------------------------------------------
  const finishZ = -170;
  addBox(0, 6, finishZ, 13, 0.5, 14, 0x223a66, { roughness: 0.7 });
  for (const px of [-5.5, 5.5]) for (const pz of [finishZ + 6, finishZ - 6]) addBox(px, 3, pz, 0.6, 6, 0.6, 0x9aa0b5);

  // -- glowing pads ---------------------------------------------------------
  const startPad = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 0.06, 32),
    new THREE.MeshStandardMaterial({ color: 0x6ad7ff, emissive: 0x2aa0ff, emissiveIntensity: 1.2, roughness: 0.4 })
  );
  startPad.position.set(0, 0.04, 0);
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
    name: 'Last Light',
    subtitle: 'Dusk run. The sun sets as you go — long, raking shadows and a calm, fiery finish.',
    group,
    colliders,
    occluders,
    items: [
      { type: 'hat', x: 0, y: 1.0, z: -10 },
      { type: 'sunglasses', x: 3, y: 1.0, z: -40 },
      { type: 'water', x: 0, y: 1.0, z: -72 },
      { type: 'ice', x: 0, y: 1.0, z: -84 },
      { type: 'umbrella', x: -3, y: 1.0, z: -102 },
      { type: 'sunscreen', x: 0, y: 1.0, z: -128 },
    ],
    coolZones: [{ x: 5, z: -115, r: 3.2 }],
    checkpoints: [{ x: 0, z: -30 }, { x: 0, z: -75 }, { x: 0, z: -118 }],
    windTells: [{ x: -6, z: -30 }, { x: 6, z: -46 }, { x: 0, z: -110 }],
    traffic: [
      { from: [-4.5, 0, -20], to: [-4.5, 0, -56], speed: 7, size: [3, 3.4, 7], color: 0xe0a84a },
      { from: [4.5, 0, -24], to: [4.5, 0, -56], speed: 5.5, size: [3, 3.4, 7], color: 0x4ad0c0 },
    ],
    dynamicShade: {
      clouds: { count: 3, y: 28, shade: 0.6, speed: 5, spanX: 70, zFrom: -16, zTo: -134, size: 11 },
      awnings: [
        { x: 0, z: -70, w: 8, d: 3.5, y: 3.3, period: 8, phase: 0 },
        { x: 0, z: -84, w: 8, d: 3.5, y: 3.3, period: 8, phase: 4 },
      ],
    },
    startPos: new THREE.Vector3(0, 0.9, 0),
    startYaw: 0,
    finishBox,
    finishCenter: new THREE.Vector3(0, 0, finishZ),
    courseLength: Math.abs(finishZ),
    // Setting sun: starts high (50°), rakes down low (18°); sky fades to dusk.
    sun: { cycle: 70, startAngle: 50, endAngle: 18, skyStart: 0xbfe3ff, skyEnd: 0xff7a4a },
    wind: { gustMax: 0.9, period: 8 },
    weather: { events: ['eclipse', 'flare'], calm: 13 }, // an eclipse and a flare roll through
  };
}
