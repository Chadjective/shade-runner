import * as THREE from 'three';
import { HOT_ZONE_DPS, MUD_SPEED_MULT, MIST_TRACTION, PUDDLE_HYDRATE_RATE } from '../utils/constants.js';

/**
 * ZoneSystem: one place for all "stand in an area → effect" surfaces. A level
 * lists circular zones; each frame query(pos) returns the combined effects the
 * Game applies. Types:
 *   cool   — fast health + hydration recovery (fountains/misters; no prop here)
 *   hazard — contact damage/sec (hot grates, coals, asphalt); `sunScaled` ramps
 *            it with the sun's height (reflective glass / baking pavement)
 *   mud    — drags movement speed (deep sand / mud)
 *   mist   — cools AND drops traction (slick mist; skid)
 *   puddle — cools + rehydrates + a little slip
 *
 * Builds a flat ground decal for the visible types (cool zones are drawn by the
 * level's fountain prop).
 */
const COLORS = {
  hazard: { color: 0xff5a2a, emissive: 0xc02000, op: 0.55 },
  mud: { color: 0x6b4a2a, emissive: 0x000000, op: 0.92 },
  mist: { color: 0xbfe6ff, emissive: 0x2f7fc0, op: 0.22 },
  puddle: { color: 0x3a8fd0, emissive: 0x176aa0, op: 0.6 },
};

export default class ZoneSystem {
  constructor(scene, zones = []) {
    this.scene = scene;
    this.zones = zones.map((z) => ({ ...z, r2: (z.r ?? 2) * (z.r ?? 2) }));
    for (const z of this.zones) this._buildProp(z);
  }

  _buildProp(z) {
    const c = COLORS[z.type];
    if (!c) return; // cool zones have no decal (the fountain mesh is its own prop)
    const h = z.type === 'mist' ? 0.5 : 0.05;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(z.r ?? 2, z.r ?? 2, h, 24),
      new THREE.MeshStandardMaterial({
        color: c.color,
        emissive: c.emissive,
        emissiveIntensity: c.emissive ? 0.8 : 0,
        roughness: z.type === 'puddle' ? 0.15 : 0.9,
        metalness: z.type === 'puddle' ? 0.4 : 0,
        transparent: c.op < 1,
        opacity: c.op,
        depthWrite: c.op >= 1,
      })
    );
    mesh.position.set(z.x, h / 2 + 0.02, z.z);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    z.mesh = mesh;
  }

  /** @returns combined effects for the player's current position */
  query(pos) {
    const out = { cool: false, hazardFlat: 0, hazardSun: 0, speedMult: 1, traction: 1, wet: false, hydrate: 0 };
    for (const z of this.zones) {
      const dx = pos.x - z.x;
      const dz = pos.z - z.z;
      if (dx * dx + dz * dz >= z.r2) continue;
      switch (z.type) {
        case 'cool':
          out.cool = true;
          break;
        case 'hazard': {
          const dps = z.dps ?? HOT_ZONE_DPS;
          if (z.sunScaled) out.hazardSun += dps;
          else out.hazardFlat += dps;
          break;
        }
        case 'mud':
          out.speedMult = Math.min(out.speedMult, z.speed ?? MUD_SPEED_MULT);
          break;
        case 'mist':
          out.cool = true;
          out.wet = true;
          out.traction = Math.min(out.traction, z.traction ?? MIST_TRACTION);
          break;
        case 'puddle':
          out.cool = true;
          out.wet = true;
          out.hydrate += PUDDLE_HYDRATE_RATE;
          out.traction = Math.min(out.traction, 0.7);
          break;
        default:
          break;
      }
    }
    return out;
  }
}
