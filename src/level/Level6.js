import * as THREE from 'three';
import { makeFountain } from './props.js';

/**
 * Level 6 — "The Long Run" (endless). A procedurally assembled gauntlet: random
 * cover clusters, open sun gaps, pillar fields, and the odd oasis, stitched into
 * one very long course. There's a finish at the far end if you can survive the
 * whole thing — but really it's a distance challenge (Game tracks how far you
 * get and saves your furthest).
 *
 * The centre lane is kept runnable; danger comes from the shifting sun + how
 * much cover happens to be near you. Built fresh each run (Math.random).
 */
const COOL_WALLS = [0x4a5680, 0x3b4a78, 0x5a6390, 0x42507a, 0x6470a0, 0x394067];
const LANE = 13;
const LENGTH = 900;

export default function buildLevel6() {
  const group = new THREE.Group();
  const colliders = [];
  const occluders = [];
  const items = [];
  const coolZones = [];

  function addBox(cx, cy, cz, sx, sy, sz, color, opts = {}) {
    const { collide = true, occlude = true } = opts;
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    mesh.position.set(cx, cy, cz);
    mesh.castShadow = occlude;
    mesh.receiveShadow = true;
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
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, LENGTH + 120),
    new THREE.MeshStandardMaterial({ color: 0xc9c3b4, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -LENGTH / 2);
  ground.receiveShadow = true;
  group.add(ground);

  // boundary buildings both sides, full length
  for (const side of [-1, 1]) {
    let z = 2;
    let i = 0;
    while (z > -LENGTH - 10) {
      const h = 10 + ((i * 7) % 14);
      addBox(side * LANE + side * 4.5, h / 2, z - 4, 9, h, 8.5, COOL_WALLS[i % COOL_WALLS.length]);
      z -= 8;
      i++;
    }
  }

  // procedural features every ~28 units; keep the centre lane mostly runnable
  for (let z = -24; z > -LENGTH + 30; z -= 28) {
    const kind = pick(['cover', 'cover', 'pillars', 'awnings', 'open', 'oasis']);
    if (kind === 'cover') {
      // a few buildings flanking, with one overhead canopy near centre
      const sx = side2();
      addBox(sx * rnd(5, 9), rnd(4, 8), z, rnd(3, 5), rnd(8, 16), rnd(4, 7), pick(COOL_WALLS));
      addBox(rnd(-3, 3), 4.6 + rnd(-0.3, 0.3), z + rnd(-3, 3), rnd(4, 6), 0.3, rnd(4, 6), 0x2f86d2, { collide: false }); // canopy
    } else if (kind === 'pillars') {
      for (let k = 0; k < 4; k++) addBox(rnd(-9, 9), 2.5, z + rnd(-4, 4), 0.6, 5, 0.6, 0x8a8f9c);
    } else if (kind === 'awnings') {
      const sx = side2();
      addBox(sx * 5, 3.3, z, 4, 0.3, 4, pick([0xd2552f, 0x2f86d2]), { collide: false });
    } else if (kind === 'oasis') {
      const fx = side2() * rnd(4, 7);
      const f = makeFountain(fx, z);
      group.add(f.mesh);
      colliders.push(f.collider);
      coolZones.push({ x: fx, z, r: 3.2 });
    }
    // 'open' = nothing (a sun gap)
  }

  function side2() { return Math.random() < 0.5 ? -1 : 1; }

  // scatter consumables along the way
  const TYPES = ['water', 'water', 'sunscreen', 'ice', 'umbrella'];
  for (let z = -40; z > -LENGTH + 40; z -= rnd(55, 80)) {
    items.push({ type: pick(TYPES), x: rnd(-7, 7), y: 1.0, z });
  }

  // far finish (survive the whole thing)
  const finishZ = -LENGTH;
  addBox(0, 6, finishZ, 13, 0.5, 12, 0x223a66, { collide: false });
  const finishPad = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3, 0.06, 32),
    new THREE.MeshStandardMaterial({ color: 0x8effa6, emissive: 0x35ff7a, emissiveIntensity: 1.3, roughness: 0.4 })
  );
  finishPad.position.set(0, 0.05, finishZ);
  group.add(finishPad);

  const startPad = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 0.06, 32),
    new THREE.MeshStandardMaterial({ color: 0x6ad7ff, emissive: 0x2aa0ff, emissiveIntensity: 1.2, roughness: 0.4 })
  );
  startPad.position.set(0, 0.04, 0);
  group.add(startPad);

  return {
    name: 'The Long Run',
    subtitle: 'Endless. Procedurally generated — how far can you get?',
    endless: true,
    group,
    colliders,
    occluders,
    items,
    coolZones,
    startPos: new THREE.Vector3(0, 0.9, 0),
    startYaw: 0,
    finishBox: new THREE.Box3(new THREE.Vector3(-4, -1, finishZ - 4), new THREE.Vector3(4, 6, finishZ + 4)),
    finishCenter: new THREE.Vector3(0, 0, finishZ),
    courseLength: LENGTH,
    sun: { cycle: 140, startAngle: 16 },
    wind: { gustMax: 1.0, period: 8 },
    weather: { events: ['flare', 'dust', 'eclipse'], calm: 13 },
  };
}
