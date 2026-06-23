import * as THREE from 'three';
import {
  PLAYER_SPEED,
  PLAYER_ACCEL,
  JUMP_FORCE,
  GRAVITY,
  PLAYER_RADIUS,
  PLAYER_HEIGHT,
  COYOTE_TIME,
  CAM_DISTANCE,
  CAM_HEIGHT,
  CAM_LOOK_HEIGHT,
  MOUSE_SENSITIVITY,
  CAM_PITCH_MIN,
  CAM_PITCH_MAX,
  UMBRELLA_SPEED_MULT,
  SLIDE_DURATION,
  SLIDE_SPEED_MULT,
  SLIDE_COOLDOWN,
  SLIDE_HEIGHT_MULT,
} from '../utils/constants.js';

const FULL_HALF_Y = PLAYER_HEIGHT / 2;

/**
 * PlayerController: an animated runner in third person.
 *
 * - WASD moves relative to the camera; mouse (pointer lock) orbits it.
 * - Space jumps (coyote-time grace + gravity); collision is swept AABB with
 *   min-penetration resolution so you can also land on platforms.
 * - Shift slides: a brief speed burst that lowers your collision box so you can
 *   duck under low cover.
 * - E toggles a picked-up umbrella open/closed (open = mobile shade but slower).
 * - While riding a zipline the ZiplineSystem drives the position; we just pose
 *   and follow with the camera.
 */
export default class PlayerController {
  constructor(scene, domElement) {
    this.domElement = domElement;
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0.42;
    this.onGround = false;
    this.timeSinceGround = 0;
    this.lookEnabled = false;

    // Collision half-extents (mutated during a slide).
    this.half = new THREE.Vector3(PLAYER_RADIUS, FULL_HALF_Y, PLAYER_RADIUS);

    // Ability state.
    this.hasUmbrella = false;
    this.umbrellaOpen = false;
    this.sliding = false;
    this.slideTime = 0;
    this.slideCooldown = 0;
    this.onZipline = false;

    this.keys = Object.create(null);
    this._tmpForward = new THREE.Vector3();
    this._tmpRight = new THREE.Vector3();
    this._move = new THREE.Vector3();
    this._camTarget = new THREE.Vector3();
    this._camPos = new THREE.Vector3();

    this.mesh = this._buildMesh();
    scene.add(this.mesh);
    this.position = this.mesh.position;

    this._onKeyDown = (e) => this._setKey(e, true);
    this._onKeyUp = (e) => this._setKey(e, false);
    this._onMouseMove = (e) => this._look(e);
  }

  _buildMesh() {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3d8bff, roughness: 0.55, metalness: 0.05, emissive: 0x0a1c44, emissiveIntensity: 0.4 });
    const limbMat = new THREE.MeshStandardMaterial({ color: 0x2f6fd0, roughness: 0.6, emissive: 0x081634, emissiveIntensity: 0.4 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x9ec5ff, roughness: 0.5 });
    const faceMat = new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffcf6a, emissiveIntensity: 0.9, roughness: 0.3 });

    const rig = new THREE.Group();
    group.add(rig);
    this.rig = rig;

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), bodyMat);
    torso.position.y = 0.12;
    torso.castShadow = true;
    rig.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), headMat);
    head.position.y = 0.64;
    head.castShadow = true;
    rig.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.06), faceMat);
    visor.position.set(0, 0.66, 0.18);
    rig.add(visor);

    const makeLimb = (w, len) => {
      const pivot = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, w), limbMat);
      m.position.y = -len / 2;
      m.castShadow = true;
      pivot.add(m);
      return pivot;
    };

    this.armL = makeLimb(0.15, 0.6); this.armL.position.set(-0.33, 0.42, 0); rig.add(this.armL);
    this.armR = makeLimb(0.15, 0.6); this.armR.position.set(0.33, 0.42, 0); rig.add(this.armR);
    this.legL = makeLimb(0.18, 0.82); this.legL.position.set(-0.15, -0.08, 0); rig.add(this.legL);
    this.legR = makeLimb(0.18, 0.82); this.legR.position.set(0.15, -0.08, 0); rig.add(this.legR);

    // Umbrella, carried at the right shoulder; hidden until picked up.
    const umb = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.6 })
    );
    pole.position.y = 0.75;
    umb.add(pole);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.95, 0.5, 18),
      new THREE.MeshStandardMaterial({ color: 0xff5a3c, emissive: 0x400e04, emissiveIntensity: 0.5, roughness: 0.6 })
    );
    canopy.position.y = 1.55;
    canopy.castShadow = true;
    umb.add(canopy);
    umb.position.set(0.34, 0.3, 0);
    umb.visible = false;
    rig.add(umb);
    this.umbrella = umb;
    this.umbrellaCanopy = canopy;

    this._animPhase = 0;
    this._animTime = 0;
    this.footstepId = 0;
    this._footSide = 1;
    this._lastSin = 0;
    this.lastFootstep = new THREE.Vector3();

    return group;
  }

  animate(dt) {
    this._animTime += dt;

    if (this.onZipline) {
      // Hang from the cable: arms up, legs dangling.
      const k = 1 - Math.pow(0.0008, dt);
      this.armL.rotation.x = lerp(this.armL.rotation.x, -2.7, k);
      this.armR.rotation.x = lerp(this.armR.rotation.x, -2.7, k);
      this.legL.rotation.x = lerp(this.legL.rotation.x, 0.25, k);
      this.legR.rotation.x = lerp(this.legR.rotation.x, -0.15, k);
      this.rig.rotation.x = lerp(this.rig.rotation.x, 0, k);
      this.rig.position.y = lerp(this.rig.position.y, 0, k);
      return;
    }

    if (this.sliding) {
      // Crouch low and lean forward.
      const k = 1 - Math.pow(0.0001, dt);
      this.rig.position.y = lerp(this.rig.position.y, -0.32, k);
      this.rig.rotation.x = lerp(this.rig.rotation.x, 0.5, k);
      this.legL.rotation.x = lerp(this.legL.rotation.x, -0.7, k);
      this.legR.rotation.x = lerp(this.legR.rotation.x, 0.5, k);
      this.armL.rotation.x = lerp(this.armL.rotation.x, -0.6, k);
      this.armR.rotation.x = lerp(this.armR.rotation.x, -0.6, k);
      return;
    }

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    const running = speed > 0.4 && this.onGround;

    if (!this.onGround) {
      const k = 1 - Math.pow(0.0008, dt);
      this.legL.rotation.x = lerp(this.legL.rotation.x, -0.6, k);
      this.legR.rotation.x = lerp(this.legR.rotation.x, 0.4, k);
      this.armL.rotation.x = lerp(this.armL.rotation.x, -2.1, k);
      this.armR.rotation.x = lerp(this.armR.rotation.x, -2.1, k);
      this.rig.rotation.x = lerp(this.rig.rotation.x, 0.08, k);
      this.rig.position.y = lerp(this.rig.position.y, 0, k);
    } else if (running) {
      const amp = Math.min(speed / PLAYER_SPEED, 1);
      this._animPhase += dt * (7 + amp * 7);
      const s = Math.sin(this._animPhase);
      this.legL.rotation.x = s * 0.9 * amp;
      this.legR.rotation.x = -s * 0.9 * amp;
      this.armL.rotation.x = -s * 0.7 * amp;
      this.armR.rotation.x = s * 0.7 * amp;
      this.rig.position.y = Math.abs(Math.sin(this._animPhase)) * 0.05 * amp;
      this.rig.rotation.x = 0.16 * amp;

      if ((this._lastSin <= 0 && s > 0) || (this._lastSin >= 0 && s < 0)) {
        this._footSide = -this._footSide;
        const yaw = this.mesh.rotation.y;
        const rx = Math.cos(yaw);
        const rz = -Math.sin(yaw);
        this.lastFootstep.set(
          this.mesh.position.x + rx * this._footSide * 0.18,
          0.04,
          this.mesh.position.z + rz * this._footSide * 0.18
        );
        this.footstepId++;
      }
      this._lastSin = s;
    } else {
      const k = 1 - Math.pow(0.02, dt);
      this.legL.rotation.x = lerp(this.legL.rotation.x, 0, k);
      this.legR.rotation.x = lerp(this.legR.rotation.x, 0, k);
      this.armL.rotation.x = lerp(this.armL.rotation.x, 0, k);
      this.armR.rotation.x = lerp(this.armR.rotation.x, 0, k);
      this.rig.rotation.x = lerp(this.rig.rotation.x, 0, k);
      this.rig.position.y = Math.sin(this._animTime * 2) * 0.015;
    }
  }

  enable() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
  }

  disable() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    this.keys = Object.create(null);
  }

  reset(startPos, startYaw = 0) {
    this.mesh.position.copy(startPos);
    this.velocity.set(0, 0, 0);
    this.yaw = startYaw;
    this.pitch = 0.42;
    this.onGround = false;
    this.timeSinceGround = 0;
    this.keys = Object.create(null);

    this.half.set(PLAYER_RADIUS, FULL_HALF_Y, PLAYER_RADIUS);
    this.hasUmbrella = false;
    this.umbrellaOpen = false;
    this.sliding = false;
    this.slideTime = 0;
    this.slideCooldown = 0;
    this.onZipline = false;
    if (this.umbrella) this.umbrella.visible = false;

    this._animPhase = 0;
    this._animTime = 0;
    this.footstepId = 0;
    this._footSide = 1;
    this._lastSin = 0;
    if (this.rig) {
      this.rig.position.y = 0;
      this.rig.rotation.x = 0;
      this.armL.rotation.x = this.armR.rotation.x = 0;
      this.legL.rotation.x = this.legR.rotation.x = 0;
    }
  }

  // ---- abilities ----------------------------------------------------------
  giveUmbrella() {
    this.hasUmbrella = true;
    this.umbrellaOpen = true;
    if (this.umbrella) this.umbrella.visible = true;
    this._applyUmbrellaPose();
  }

  _toggleUmbrella() {
    this.umbrellaOpen = !this.umbrellaOpen;
    this._applyUmbrellaPose();
  }

  _applyUmbrellaPose() {
    if (!this.umbrella) return;
    if (this.umbrellaOpen) {
      this.umbrella.rotation.z = 0;
      this.umbrellaCanopy.scale.setScalar(1);
    } else {
      this.umbrella.rotation.z = -1.25; // folded, carried at the side
      this.umbrellaCanopy.scale.setScalar(0.32);
    }
  }

  _startSlide() {
    if (this.sliding || !this.onGround || this.slideCooldown > 0) return;
    if (Math.hypot(this.velocity.x, this.velocity.z) < 1) return;
    this.sliding = true;
    this.slideTime = SLIDE_DURATION;
    this.half.y = FULL_HALF_Y * SLIDE_HEIGHT_MULT;
    this.mesh.position.y -= FULL_HALF_Y - this.half.y; // keep feet on the ground
  }

  _endSlide() {
    if (!this.sliding) return;
    const old = this.half.y;
    this.half.y = FULL_HALF_Y;
    this.mesh.position.y += FULL_HALF_Y - old;
    this.sliding = false;
    this.slideCooldown = SLIDE_COOLDOWN;
  }

  _setKey(e, down) {
    const code = e.code;
    if (!ALLOWED.has(code)) return;
    const was = this.keys[code];
    this.keys[code] = down;
    if (code === 'Space') e.preventDefault();
    if (down && !was) {
      if (code === 'KeyE' && this.hasUmbrella) this._toggleUmbrella();
      if (code === 'ShiftLeft' || code === 'ShiftRight') this._startSlide();
    }
  }

  _look(e) {
    if (!this.lookEnabled) return;
    this.yaw -= e.movementX * MOUSE_SENSITIVITY;
    this.pitch -= e.movementY * MOUSE_SENSITIVITY;
    this.pitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, this.pitch));
  }

  _wishDirection() {
    this._tmpForward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this._tmpRight.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const k = this.keys;
    const f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    const r = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);

    this._move.set(0, 0, 0);
    this._move.addScaledVector(this._tmpForward, f);
    this._move.addScaledVector(this._tmpRight, r);
    if (this._move.lengthSq() > 1e-4) this._move.normalize();
    return this._move;
  }

  /**
   * @param {number} dt
   * @param {THREE.Box3[]} colliders
   * @param {THREE.Camera} camera
   */
  update(dt, colliders, camera) {
    // On a zipline, the ZiplineSystem owns position — just present & follow.
    if (this.onZipline) {
      this._updateCamera(camera);
      this.animate(dt);
      return;
    }

    // Slide timers.
    if (this.sliding) {
      this.slideTime -= dt;
      if (this.slideTime <= 0) this._endSlide();
    } else if (this.slideCooldown > 0) {
      this.slideCooldown -= dt;
    }

    const wish = this._wishDirection();

    let spd = PLAYER_SPEED;
    if (this.umbrellaOpen) spd *= UMBRELLA_SPEED_MULT;
    if (this.sliding) spd *= SLIDE_SPEED_MULT;

    const accel = PLAYER_ACCEL * dt;
    this.velocity.x = approach(this.velocity.x, wish.x * spd, accel);
    this.velocity.z = approach(this.velocity.z, wish.z * spd, accel);

    // Jump (cancels a slide).
    this.timeSinceGround = this.onGround ? 0 : this.timeSinceGround + dt;
    if (this.keys.Space && this.timeSinceGround <= COYOTE_TIME) {
      if (this.sliding) this._endSlide();
      this.velocity.y = JUMP_FORCE;
      this.onGround = false;
      this.timeSinceGround = COYOTE_TIME + 1;
    }

    this.velocity.y -= GRAVITY * dt;

    const p = this.mesh.position;
    p.x += this.velocity.x * dt;
    p.y += this.velocity.y * dt;
    p.z += this.velocity.z * dt;

    this.onGround = false;
    for (let i = 0; i < 3; i++) {
      if (this._resolve(p, colliders)) this.onGround = true;
    }

    if (wish.lengthSq() > 1e-4) {
      const targetYaw = Math.atan2(wish.x, wish.z);
      this.mesh.rotation.y = lerpAngle(this.mesh.rotation.y, targetYaw, 1 - Math.pow(0.0001, dt));
    }

    this._updateCamera(camera);
    this.animate(dt);
  }

  _resolve(p, colliders) {
    const H = this.half;
    let grounded = false;

    if (p.y - H.y < 0) {
      p.y = H.y;
      if (this.velocity.y < 0) this.velocity.y = 0;
      grounded = true;
    }

    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      const minX = p.x - H.x, maxX = p.x + H.x;
      const minY = p.y - H.y, maxY = p.y + H.y;
      const minZ = p.z - H.z, maxZ = p.z + H.z;

      if (maxX <= b.min.x || minX >= b.max.x) continue;
      if (maxY <= b.min.y || minY >= b.max.y) continue;
      if (maxZ <= b.min.z || minZ >= b.max.z) continue;

      const ox = Math.min(maxX - b.min.x, b.max.x - minX);
      const oy = Math.min(maxY - b.min.y, b.max.y - minY);
      const oz = Math.min(maxZ - b.min.z, b.max.z - minZ);

      if (oy <= ox && oy <= oz) {
        const boxMidY = (b.min.y + b.max.y) * 0.5;
        if (p.y > boxMidY) {
          p.y = b.max.y + H.y;
          if (this.velocity.y < 0) this.velocity.y = 0;
          grounded = true;
        } else {
          p.y = b.min.y - H.y;
          if (this.velocity.y > 0) this.velocity.y = 0;
        }
      } else if (ox <= oz) {
        p.x = p.x > (b.min.x + b.max.x) * 0.5 ? b.max.x + H.x : b.min.x - H.x;
        this.velocity.x = 0;
      } else {
        p.z = p.z > (b.min.z + b.max.z) * 0.5 ? b.max.z + H.z : b.min.z - H.z;
        this.velocity.z = 0;
      }
    }
    return grounded;
  }

  snapCamera(camera) {
    this._updateCamera(camera, true);
  }

  _updateCamera(camera, snap = false) {
    this._camTarget.copy(this.mesh.position);
    this._camTarget.y += CAM_LOOK_HEIGHT;

    const horiz = CAM_DISTANCE * Math.cos(this.pitch);
    this._camPos.set(
      this._camTarget.x + horiz * Math.sin(this.yaw),
      this._camTarget.y + CAM_HEIGHT + CAM_DISTANCE * Math.sin(this.pitch),
      this._camTarget.z + horiz * Math.cos(this.yaw)
    );
    if (snap) {
      camera.position.copy(this._camPos);
    } else {
      camera.position.lerp(this._camPos, 1 - Math.pow(0.0008, 1 / 60));
    }
    camera.lookAt(this._camTarget);
  }

  getPosition() {
    return this.mesh.position;
  }
}

const ALLOWED = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyE',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight',
]);

function approach(current, target, maxDelta) {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return current;
}

function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
