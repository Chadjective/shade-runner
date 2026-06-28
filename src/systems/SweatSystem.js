import * as THREE from 'three';

/**
 * SweatSystem: the sun's toll, made visible.
 *
 * While the player MOVES IN THE SUN, two things happen:
 *   - sweat drips off the body, falls, and splats on the ground; and
 *   - a droplet is stamped under each footfall (driven by PlayerController's
 *     footstepId), tracing their path.
 * Drops then fade out, leaving a short-lived wet trail. Nothing is emitted in
 * shade, and the hotter the player is (exposure), the faster they sweat.
 *
 * Implemented as a fixed pool of meshes recycled in a ring — cheap and bounded.
 */
const GROUND_Y = 0.04;
const FALL_G = 12;
const TRAIL_LIFE = 2.4; // seconds a ground drop lingers before fully fading

export default class SweatSystem {
  constructor(scene, max = 80, trailColor = 0xbfe6ff) {
    this.scene = scene;
    this.max = max;
    this.cursor = 0;
    this.bodyTimer = 0;
    this._seenFootstep = 0;

    const emissive = new THREE.Color(trailColor).multiplyScalar(0.55);
    const geo = new THREE.SphereGeometry(0.07, 8, 6);
    this.pool = [];
    for (let i = 0; i < max; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: trailColor,
        emissive,
        emissiveIntensity: 0.5,
        roughness: 0.25,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push({ mesh, mat, active: false, falling: false, vy: 0, life: 0 });
    }
  }

  _next() {
    const d = this.pool[this.cursor % this.max];
    this.cursor++;
    return d;
  }

  _spawnFalling(x, y, z) {
    const d = this._next();
    d.mesh.position.set(x, y, z);
    d.mesh.scale.set(1, 1.4, 1); // teardrop
    d.mat.opacity = 0.95;
    d.active = true;
    d.falling = true;
    d.vy = -0.3 - Math.random() * 0.5;
    d.life = TRAIL_LIFE;
    d.mesh.visible = true;
  }

  _spawnTrail(x, z) {
    const d = this._next();
    d.mesh.position.set(x, GROUND_Y, z);
    d.mesh.scale.set(1.5, 0.25, 1.5); // flat splat
    d.mat.opacity = 0.8;
    d.active = true;
    d.falling = false;
    d.life = TRAIL_LIFE;
    d.mesh.visible = true;
  }

  /**
   * @param {number} dt
   * @param {import('./PlayerController.js').default} player
   * @param {import('./HealthSystem.js').default} health
   */
  update(dt, player, health, suppressEmit = false) {
    const speed = Math.hypot(player.velocity.x, player.velocity.z);
    const moving = speed > 0.6;

    if (health.inSun && moving && !suppressEmit) {
      // Body sweat — faster when hotter (exposure climbs the longer you bake).
      this.bodyTimer -= dt;
      if (this.bodyTimer <= 0) {
        this.bodyTimer = 0.34 - health.exposure * 0.18;
        const p = player.getPosition();
        this._spawnFalling(p.x + (Math.random() - 0.5) * 0.3, p.y + 0.55, p.z + (Math.random() - 0.5) * 0.3);
      }
      // Footstep trail — one droplet per planted foot.
      if (player.footstepId !== this._seenFootstep) {
        this._seenFootstep = player.footstepId;
        this._spawnTrail(player.lastFootstep.x, player.lastFootstep.z);
      }
    } else {
      // Keep the marker in sync so re-entering sun doesn't dump a backlog.
      this._seenFootstep = player.footstepId;
    }

    // Integrate / fade all live drops.
    for (const d of this.pool) {
      if (!d.active) continue;
      if (d.falling) {
        d.vy -= FALL_G * dt;
        d.mesh.position.y += d.vy * dt;
        if (d.mesh.position.y <= GROUND_Y) {
          d.mesh.position.y = GROUND_Y;
          d.falling = false;
          d.mesh.scale.set(1.5, 0.25, 1.5);
          d.life = TRAIL_LIFE;
        }
      } else {
        d.life -= dt;
        d.mat.opacity = Math.max(0, d.life / TRAIL_LIFE) * 0.82;
        if (d.life <= 0) {
          d.active = false;
          d.mesh.visible = false;
        }
      }
    }
  }

  activeCount() {
    let n = 0;
    for (const d of this.pool) if (d.active) n++;
    return n;
  }
}
