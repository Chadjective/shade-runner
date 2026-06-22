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
} from '../utils/constants.js';

const HALF = new THREE.Vector3(PLAYER_RADIUS, PLAYER_HEIGHT / 2, PLAYER_RADIUS);

/**
 * PlayerController: a capsule you run around in third person.
 *
 * - WASD moves relative to where the camera is looking.
 * - Mouse (under pointer lock) orbits the camera; the capsule turns to face
 *   its movement direction.
 * - Space jumps (with coyote-time grace and proper gravity).
 * - Collision is swept AABB vs. the level's box colliders, with min-penetration
 *   resolution so you can also land on top of platforms and ledges.
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

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x3d8bff,
      roughness: 0.55,
      metalness: 0.05,
      emissive: 0x0a1c44,
      emissiveIntensity: 0.4,
    });
    const cylLen = PLAYER_HEIGHT - PLAYER_RADIUS * 2;
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(PLAYER_RADIUS, cylLen, 6, 14),
      bodyMat
    );
    body.castShadow = true;
    group.add(body);

    // A bright "visor" on the +Z face so its facing direction is readable.
    const faceMat = new THREE.MeshStandardMaterial({
      color: 0xfff0c0,
      emissive: 0xffcf6a,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    });
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.12), faceMat);
    face.position.set(0, 0.35, PLAYER_RADIUS - 0.02);
    group.add(face);

    return group;
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
  }

  _setKey(e, down) {
    const code = e.code;
    if (
      code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD' ||
      code === 'Space' || code === 'ArrowUp' || code === 'ArrowDown' ||
      code === 'ArrowLeft' || code === 'ArrowRight' || code === 'ShiftLeft'
    ) {
      this.keys[code] = down;
      if (code === 'Space') e.preventDefault();
    }
  }

  _look(e) {
    if (!this.lookEnabled) return;
    this.yaw -= e.movementX * MOUSE_SENSITIVITY;
    this.pitch -= e.movementY * MOUSE_SENSITIVITY;
    this.pitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, this.pitch));
  }

  _wishDirection() {
    // Camera-relative basis on the ground plane.
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
    const wish = this._wishDirection();

    // Horizontal acceleration toward the wished velocity (snappy but not instant).
    const targetVX = wish.x * PLAYER_SPEED;
    const targetVZ = wish.z * PLAYER_SPEED;
    const accel = PLAYER_ACCEL * dt;
    this.velocity.x = approach(this.velocity.x, targetVX, accel);
    this.velocity.z = approach(this.velocity.z, targetVZ, accel);

    // Jump (with coyote time so a frame-late press off a ledge still works).
    this.timeSinceGround = this.onGround ? 0 : this.timeSinceGround + dt;
    if (this.keys.Space && this.timeSinceGround <= COYOTE_TIME) {
      this.velocity.y = JUMP_FORCE;
      this.onGround = false;
      this.timeSinceGround = COYOTE_TIME + 1; // consume; no double jump
    }

    // Gravity.
    this.velocity.y -= GRAVITY * dt;

    // Integrate then resolve.
    const p = this.mesh.position;
    p.x += this.velocity.x * dt;
    p.y += this.velocity.y * dt;
    p.z += this.velocity.z * dt;

    this.onGround = false;
    for (let i = 0; i < 3; i++) {
      if (this._resolve(p, colliders)) this.onGround = true;
    }

    // Face the direction of travel.
    if (wish.lengthSq() > 1e-4) {
      const targetYaw = Math.atan2(wish.x, wish.z);
      this.mesh.rotation.y = lerpAngle(this.mesh.rotation.y, targetYaw, 1 - Math.pow(0.0001, dt));
    }

    this._updateCamera(camera);
  }

  /** One pass of AABB resolution. Returns true if standing on something. */
  _resolve(p, colliders) {
    let grounded = false;

    // Ground plane at y = 0.
    if (p.y - HALF.y < 0) {
      p.y = HALF.y;
      if (this.velocity.y < 0) this.velocity.y = 0;
      grounded = true;
    }

    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      const minX = p.x - HALF.x, maxX = p.x + HALF.x;
      const minY = p.y - HALF.y, maxY = p.y + HALF.y;
      const minZ = p.z - HALF.z, maxZ = p.z + HALF.z;

      if (maxX <= b.min.x || minX >= b.max.x) continue;
      if (maxY <= b.min.y || minY >= b.max.y) continue;
      if (maxZ <= b.min.z || minZ >= b.max.z) continue;

      const ox = Math.min(maxX - b.min.x, b.max.x - minX);
      const oy = Math.min(maxY - b.min.y, b.max.y - minY);
      const oz = Math.min(maxZ - b.min.z, b.max.z - minZ);

      if (oy <= ox && oy <= oz) {
        const boxMidY = (b.min.y + b.max.y) * 0.5;
        if (p.y > boxMidY) {
          p.y = b.max.y + HALF.y; // land on top
          if (this.velocity.y < 0) this.velocity.y = 0;
          grounded = true;
        } else {
          p.y = b.min.y - HALF.y; // bonk head
          if (this.velocity.y > 0) this.velocity.y = 0;
        }
      } else if (ox <= oz) {
        p.x = p.x > (b.min.x + b.max.x) * 0.5 ? b.max.x + HALF.x : b.min.x - HALF.x;
        this.velocity.x = 0;
      } else {
        p.z = p.z > (b.min.z + b.max.z) * 0.5 ? b.max.z + HALF.z : b.min.z - HALF.z;
        this.velocity.z = 0;
      }
    }
    return grounded;
  }

  /** Place the camera instantly behind the player (no follow lerp). */
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
      // Smooth follow.
      camera.position.lerp(this._camPos, 1 - Math.pow(0.0008, 1 / 60));
    }
    camera.lookAt(this._camTarget);
  }

  getPosition() {
    return this.mesh.position;
  }
}

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
