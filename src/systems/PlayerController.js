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
  UMBRELLA_GLIDE_GRAVITY_MULT,
  UMBRELLA_GLIDE_MAX_FALL,
  SLIDE_DURATION,
  SLIDE_SPEED_MULT,
  SLIDE_COOLDOWN,
  SLIDE_HEIGHT_MULT,
  HAT_SHAKE_SPEED,
  HAT_DRAIN_RATE,
  HAT_RECOVER_RATE,
  SPRINT_SPEED_MULT,
  WALK_SPEED_MULT,
  SPRINT_STAMINA_DRAIN,
  SPRINT_STAMINA_RECOVER,
  WIND_PUSH,
  UMBRELLA_WIND_CATCH,
  UMBRELLA_FLIP_STRENGTH,
  HAT_WIND_THRESHOLD,
  HAT_WIND_DRAIN,
  HEAT_DRIFT,
  DIVE_SPEED,
  DIVE_UP,
  DIVE_DURATION,
  HARD_LAND_SPEED,
  ROLL_DURATION,
  ROLL_SPEED_MULT,
  ROLL_WINDOW,
  STUMBLE_DURATION,
  STUMBLE_SPEED_MULT,
  SNEAKERS_SPEED_MULT,
} from '../utils/constants.js';

const FULL_HALF_Y = PLAYER_HEIGHT / 2;

/**
 * PlayerController: an animated runner in third person.
 *
 * Movement: WASD relative to camera; mouse orbits. Space jumps. Hold Shift to
 * SPRINT (burst speed, drains stamina, shakes a hat loose). Hold C to crouch —
 * walk slowly, or tap it at speed to SLIDE under cover. Gear toggles: E umbrella
 * (open = mobile shade, slower, and a slow glide in mid-air), G sunglasses.
 */
export default class PlayerController {
  constructor(scene, domElement) {
    this.scene = scene;
    this.domElement = domElement;
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0.42;
    this.onGround = false;
    this.timeSinceGround = 0;
    this.lookEnabled = false;

    this.half = new THREE.Vector3(PLAYER_RADIUS, FULL_HALF_Y, PLAYER_RADIUS);

    // Ability / gear state.
    this.hasUmbrella = false;
    this.umbrellaOpen = false;
    this.sliding = false;
    this.slideTime = 0;
    this.slideCooldown = 0;
    this.onZipline = false;
    this.crouching = false;
    this.isSprinting = false;
    this.isWalking = false;
    this.stamina = 1;
    this.hasHat = false;
    this.hatStability = 1;
    this.hasSunglasses = false;
    this.sunglassesOn = false;
    this.hasTowel = false;
    this.towelWet = 0; // 0..1; dries out, re-wet at fountains
    this.hasSleeves = false; // strong sun cover, but you sweat faster
    this._ownsSleeves = false;
    this.hasSneakers = false; // faster + better grip
    this._fallingHat = null;

    // Traversal verbs (Phase C).
    this.diving = false;
    this.diveTime = 0;
    this.rolling = false;
    this.rollTime = 0;
    this.stumbling = false;
    this.stumbleTime = 0;
    this._prevOnGround = false;
    this._timeSinceRollKey = 99;

    // External forces, set by Game each step.
    this.windVec = new THREE.Vector3();
    this.windStrength = 0;
    this.heatDrift = 0;
    this.traction = 1; // <1 on wet ground -> skiddy (slower to change velocity)
    this.zoneSpeedMult = 1; // <1 in mud/sand zones

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

  _newHat() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xe8d27a, roughness: 0.8, emissive: 0x2a2208, emissiveIntensity: 0.3 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 18), mat);
    brim.castShadow = true;
    g.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.24, 16), mat);
    crown.position.y = 0.14;
    crown.castShadow = true;
    g.add(crown);
    return g;
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

    // Sunglasses (hidden until equipped) — sit over the visor.
    const sun = new THREE.Group();
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x0c0e14, emissive: 0x1a2636, emissiveIntensity: 0.5, roughness: 0.12, metalness: 0.4 });
    for (const dx of [-0.09, 0.09]) {
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.04), lensMat);
      lens.position.set(dx, 0, 0);
      sun.add(lens);
    }
    sun.position.set(0, 0.66, 0.21);
    sun.visible = false;
    rig.add(sun);
    this.sunglasses = sun;

    // Hat (hidden until equipped) — sits on the head; can wobble + fall off.
    const hat = this._newHat();
    hat.position.set(0, 0.86, 0);
    hat.visible = false;
    rig.add(hat);
    this.hat = hat;

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

    // --- Phase E gear visuals (hidden until picked up) ---
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x6a5a9a, roughness: 0.8 });
    this.sleeves = [this.armL, this.armR].map((arm) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 0.2), sleeveMat);
      s.position.y = -0.22;
      s.visible = false;
      arm.add(s);
      return s;
    });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xff5aa0, roughness: 0.6 });
    this.shoes = [this.legL, this.legR].map((leg) => {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.34), shoeMat);
      sh.position.set(0, -0.82, 0.07);
      sh.visible = false;
      leg.add(sh);
      return sh;
    });
    this.towelMat = new THREE.MeshStandardMaterial({ color: 0x4ad0e0, roughness: 0.85 });
    this.towel = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.07), this.towelMat);
    this.towel.position.set(0, 0.34, -0.19);
    this.towel.visible = false;
    rig.add(this.towel);

    // Umbrella (hidden until picked up), carried at the right shoulder.
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
    this._updateFallingHat(dt);

    // Hat wobble — gentle when steady, frantic when it's about to blow off.
    if (this.hasHat && this.hat) {
      const speed = Math.hypot(this.velocity.x, this.velocity.z);
      const wob = 0.04 + (speed > HAT_SHAKE_SPEED ? 0.35 : 0) + (1 - this.hatStability) * 0.45;
      this.hat.rotation.z = Math.sin(this._animTime * 22) * wob;
      this.hat.rotation.x = Math.cos(this._animTime * 19) * wob * 0.6;
    }

    if (this.onZipline) {
      const k = 1 - Math.pow(0.0008, dt);
      this.armL.rotation.x = lerp(this.armL.rotation.x, -2.7, k);
      this.armR.rotation.x = lerp(this.armR.rotation.x, -2.7, k);
      this.legL.rotation.x = lerp(this.legL.rotation.x, 0.25, k);
      this.legR.rotation.x = lerp(this.legR.rotation.x, -0.15, k);
      this.rig.rotation.x = lerp(this.rig.rotation.x, 0, k);
      this.rig.position.y = lerp(this.rig.position.y, 0, k);
      return;
    }

    if (this.rolling) {
      // A full forward tumble, dipping low through the middle of the roll.
      const p = 1 - this.rollTime / ROLL_DURATION;
      this.rig.rotation.x = p * Math.PI * 2;
      this.rig.position.y = -0.25 * Math.sin(p * Math.PI);
      this.legL.rotation.x = 1.2; this.legR.rotation.x = 1.2;
      this.armL.rotation.x = -0.6; this.armR.rotation.x = -0.6;
      return;
    }

    if (this.diving) {
      // Superman lunge: body horizontal, arms thrown forward.
      const k = 1 - Math.pow(0.0006, dt);
      this.rig.rotation.x = lerp(this.rig.rotation.x, 1.45, k);
      this.rig.position.y = lerp(this.rig.position.y, -0.3, k);
      this.armL.rotation.x = lerp(this.armL.rotation.x, -2.7, k);
      this.armR.rotation.x = lerp(this.armR.rotation.x, -2.7, k);
      this.legL.rotation.x = lerp(this.legL.rotation.x, 0.2, k);
      this.legR.rotation.x = lerp(this.legR.rotation.x, -0.2, k);
      return;
    }

    if (this.stumbling) {
      // Off-balance lurch with flailing arms.
      const k = 1 - Math.pow(0.01, dt);
      this.rig.rotation.x = lerp(this.rig.rotation.x, 0.5, k);
      this.rig.position.y = lerp(this.rig.position.y, -0.1, k);
      this.armL.rotation.x = lerp(this.armL.rotation.x, -1.9, k);
      this.armR.rotation.x = lerp(this.armR.rotation.x, -1.4, k);
      this.legL.rotation.x = lerp(this.legL.rotation.x, 0.3, k);
      this.legR.rotation.x = lerp(this.legR.rotation.x, -0.3, k);
      return;
    }

    if (this.sliding) {
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
      const amp = Math.min(speed / PLAYER_SPEED, 1.4);
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

  _updateFallingHat(dt) {
    const f = this._fallingHat;
    if (!f) return;
    f.v.y -= GRAVITY * dt;
    f.mesh.position.addScaledVector(f.v, dt);
    f.mesh.rotation.x += f.spin.x * dt;
    f.mesh.rotation.z += f.spin.z * dt;
    f.life -= dt;
    if (f.mesh.position.y < 0.1 || f.life <= 0) {
      this.scene.remove(f.mesh);
      this._fallingHat = null;
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
    this.crouching = false;
    this.isSprinting = false;
    this.isWalking = false;
    this.stamina = 1;
    this.hasHat = false;
    this.hatStability = 1;
    this.hasSunglasses = false;
    this.sunglassesOn = false;
    this.hasTowel = false;
    this.towelWet = 0;
    this.hasSleeves = false;
    this._ownsSleeves = false;
    this.hasSneakers = false;
    if (this.towel) this.towel.visible = false;
    if (this.sleeves) this.sleeves.forEach((s) => { s.visible = false; });
    if (this.shoes) this.shoes.forEach((s) => { s.visible = false; });
    this.windStrength = 0;
    this.heatDrift = 0;
    this.traction = 1;
    this.zoneSpeedMult = 1;
    this.diving = false;
    this.diveTime = 0;
    this.rolling = false;
    this.rollTime = 0;
    this.stumbling = false;
    this.stumbleTime = 0;
    this._prevOnGround = false;
    this._timeSinceRollKey = 99;
    this.windVec.set(0, 0, 0);
    if (this.umbrella) this.umbrella.visible = false;
    if (this.hat) { this.hat.visible = false; this.hat.rotation.set(0, 0, 0); }
    if (this.sunglasses) this.sunglasses.visible = false;
    if (this._fallingHat) { this.scene.remove(this._fallingHat.mesh); this._fallingHat = null; }

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

  /** Lightweight respawn at a checkpoint — reposition + clear motion, keep gear. */
  respawn(pos) {
    this.mesh.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.onGround = false;
    this.sliding = false;
    this.diving = false;
    this.rolling = false;
    this.stumbling = false;
    this.onZipline = false;
    this.half.set(PLAYER_RADIUS, FULL_HALF_Y, PLAYER_RADIUS);
    if (this.rig) { this.rig.rotation.x = 0; this.rig.position.y = 0; }
  }

  // ---- gear ---------------------------------------------------------------
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
      this.umbrella.rotation.z = -1.25;
      this.umbrellaCanopy.scale.setScalar(0.32);
    }
  }

  giveHat() {
    this.hasHat = true;
    this.hatStability = 1;
    if (this.hat) this.hat.visible = true;
  }

  _dropHat() {
    this.hasHat = false;
    if (this.hat) this.hat.visible = false;
    // Spawn a tumbling hat that flies off and falls away.
    const fall = this._newHat();
    fall.position.set(this.mesh.position.x, this.mesh.position.y + 0.95, this.mesh.position.z);
    this.scene.add(fall);
    const yaw = this.mesh.rotation.y;
    this._fallingHat = {
      mesh: fall,
      v: new THREE.Vector3(-Math.sin(yaw) * 2 + (Math.random() - 0.5) * 2, 3.5, -Math.cos(yaw) * 2 + (Math.random() - 0.5) * 2),
      spin: new THREE.Vector3((Math.random() - 0.5) * 14, 0, (Math.random() - 0.5) * 14),
      life: 3,
    };
  }

  giveSunglasses() {
    this.hasSunglasses = true;
    this.sunglassesOn = true;
    if (this.sunglasses) this.sunglasses.visible = true;
  }

  _toggleSunglasses() {
    this.sunglassesOn = !this.sunglassesOn;
    if (this.sunglasses) this.sunglasses.visible = this.sunglassesOn;
  }

  giveTowel() {
    this.hasTowel = true;
    this.towelWet = 1;
    if (this.towel) this.towel.visible = true;
  }

  giveSleeves() {
    this._ownsSleeves = true;
    this.hasSleeves = true;
    if (this.sleeves) this.sleeves.forEach((s) => { s.visible = true; });
  }

  _toggleSleeves() {
    if (!this._ownsSleeves) return;
    this.hasSleeves = !this.hasSleeves; // shed them in shade to stop overheating
    if (this.sleeves) this.sleeves.forEach((s) => { s.visible = this.hasSleeves; });
  }

  giveSneakers() {
    this.hasSneakers = true;
    if (this.shoes) this.shoes.forEach((s) => { s.visible = true; });
  }

  _startSlide() {
    if (this.sliding || !this.onGround || this.slideCooldown > 0) return;
    if (Math.hypot(this.velocity.x, this.velocity.z) < 1) return;
    this.sliding = true;
    this.slideTime = SLIDE_DURATION;
    this.half.y = FULL_HALF_Y * SLIDE_HEIGHT_MULT;
    this.mesh.position.y -= FULL_HALF_Y - this.half.y;
  }

  _endSlide() {
    if (!this.sliding) return;
    const old = this.half.y;
    this.half.y = FULL_HALF_Y;
    this.mesh.position.y += FULL_HALF_Y - old;
    this.sliding = false;
    this.slideCooldown = SLIDE_COOLDOWN;
  }

  // A committed forward lunge — good for diving into shade at the last second.
  _startDive() {
    if (this.diving || this.rolling) return;
    if (this.sliding) this._endSlide();
    this.diving = true;
    this.diveTime = DIVE_DURATION;
    const sp = Math.hypot(this.velocity.x, this.velocity.z);
    let dx, dz;
    if (sp > 0.5) { dx = this.velocity.x / sp; dz = this.velocity.z / sp; }
    else { dx = Math.sin(this.mesh.rotation.y); dz = Math.cos(this.mesh.rotation.y); }
    this.velocity.x = dx * DIVE_SPEED;
    this.velocity.z = dz * DIVE_SPEED;
    this.velocity.y = DIVE_UP;
    this.onGround = false;
  }

  _startRoll() {
    this.stumbling = false;
    this.rolling = true;
    this.rollTime = ROLL_DURATION;
  }

  _startStumble() {
    this.stumbling = true;
    this.stumbleTime = STUMBLE_DURATION;
    this.velocity.x *= 0.3;
    this.velocity.z *= 0.3;
  }

  // Did the player ask to roll (crouch held, or tapped just before landing)?
  _rollRequested() {
    return !!this.keys.KeyC || this._timeSinceRollKey < ROLL_WINDOW;
  }

  _setKey(e, down) {
    const code = e.code;
    if (!ALLOWED.has(code)) return;
    const was = this.keys[code];
    this.keys[code] = down;
    if (code === 'Space') e.preventDefault();
    if (down && !was) {
      if (code === 'KeyE' && this.hasUmbrella) this._toggleUmbrella();
      if (code === 'KeyG' && this.hasSunglasses) this._toggleSunglasses();
      if (code === 'KeyR' && this._ownsSleeves) this._toggleSleeves();
      if (code === 'KeyF') this._startDive();
      if (code === 'KeyC') {
        this.crouching = true;
        this._timeSinceRollKey = 0; // arm a landing roll
        if (this.onGround && Math.hypot(this.velocity.x, this.velocity.z) > PLAYER_SPEED * 0.7) this._startSlide();
      }
    }
    if (!down && code === 'KeyC') this.crouching = false;
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

  update(dt, colliders, camera) {
    this.jumpedThisFrame = false;
    if (this.onZipline) {
      this._updateCamera(camera);
      this.animate(dt);
      return;
    }

    if (this.sliding) {
      this.slideTime -= dt;
      if (this.slideTime <= 0) this._endSlide();
    } else if (this.slideCooldown > 0) {
      this.slideCooldown -= dt;
    }

    // Traversal verb timers.
    this._timeSinceRollKey += dt;
    if (this.diving) { this.diveTime -= dt; if (this.diveTime <= 0) this.diving = false; }
    if (this.rolling) {
      this.rollTime -= dt;
      if (this.rollTime <= 0) { this.rolling = false; if (this.rig) { this.rig.rotation.x = 0; this.rig.position.y = 0; } }
    }
    if (this.stumbling) { this.stumbleTime -= dt; if (this.stumbleTime <= 0) this.stumbling = false; }

    const wish = this._wishDirection();
    const moving = wish.lengthSq() > 1e-4;

    // Sprint (hold Shift) vs walk (hold C). Sprint burns stamina.
    const wantSprint = (this.keys.ShiftLeft || this.keys.ShiftRight) && moving && this.onGround &&
      !this.sliding && !this.crouching && !this.rolling && !this.stumbling && !this.diving;
    this.isSprinting = wantSprint && this.stamina > 0;
    this.isWalking = this.crouching && !this.sliding;
    if (this.isSprinting) this.stamina = Math.max(0, this.stamina - SPRINT_STAMINA_DRAIN * dt);
    else this.stamina = Math.min(1, this.stamina + SPRINT_STAMINA_RECOVER * dt);

    let spd = PLAYER_SPEED;
    if (this.sliding) spd *= SLIDE_SPEED_MULT;
    else if (this.isSprinting) spd *= SPRINT_SPEED_MULT;
    else if (this.isWalking) spd *= WALK_SPEED_MULT;
    if (this.umbrellaOpen) spd *= UMBRELLA_SPEED_MULT;
    if (this.rolling) spd *= ROLL_SPEED_MULT; // a clean roll keeps momentum
    if (this.stumbling) spd *= STUMBLE_SPEED_MULT; // botched landing slows you
    if (this.hasSneakers) spd *= SNEAKERS_SPEED_MULT; // a touch faster on foot
    spd *= this.zoneSpeedMult; // mud / sand drag

    // A dive is a committed lunge — keep its velocity, no steering accel.
    if (!this.diving) {
      const accel = PLAYER_ACCEL * this.traction * dt;
      this.velocity.x = approach(this.velocity.x, wish.x * spd, accel);
      this.velocity.z = approach(this.velocity.z, wish.z * spd, accel);
    }

    // Wind shoves you sideways; an open umbrella catches much more of it, a
    // strong gust works the hat loose and even flips the umbrella shut.
    if (this.windStrength > 0) {
      let wf = WIND_PUSH;
      if (this.umbrellaOpen) wf *= UMBRELLA_WIND_CATCH;
      this.velocity.x += this.windVec.x * wf * dt;
      this.velocity.z += this.windVec.z * wf * dt;
      if (this.hasHat && this.windStrength > HAT_WIND_THRESHOLD) {
        this.hatStability -= (this.windStrength - HAT_WIND_THRESHOLD) * HAT_WIND_DRAIN * dt;
        if (this.hatStability <= 0) this._dropHat();
      }
      if (this.umbrellaOpen && this.windStrength > UMBRELLA_FLIP_STRENGTH) {
        this.umbrellaOpen = false;
        this._applyUmbrellaPose();
      }
    }

    // Heatstroke: a wandering sideways drift while baking in the sun.
    if (this.heatDrift > 0) {
      const d = Math.sin(this._animTime * 3.3) * HEAT_DRIFT * this.heatDrift;
      this.velocity.x += Math.cos(this.yaw) * d * dt;
      this.velocity.z += -Math.sin(this.yaw) * d * dt;
    }

    this.timeSinceGround = this.onGround ? 0 : this.timeSinceGround + dt;
    if (this.keys.Space && this.timeSinceGround <= COYOTE_TIME) {
      if (this.sliding) this._endSlide();
      this.velocity.y = JUMP_FORCE;
      this.onGround = false;
      this.timeSinceGround = COYOTE_TIME + 1;
      this.jumpedThisFrame = true;
    }

    // Gravity — an open umbrella turns a fall into a slow glide.
    let g = GRAVITY;
    const gliding = !this.onGround && this.umbrellaOpen;
    if (gliding) g *= UMBRELLA_GLIDE_GRAVITY_MULT;
    this.velocity.y -= g * dt;
    if (gliding && this.velocity.y < -UMBRELLA_GLIDE_MAX_FALL) this.velocity.y = -UMBRELLA_GLIDE_MAX_FALL;

    const p = this.mesh.position;
    p.x += this.velocity.x * dt;
    p.y += this.velocity.y * dt;
    p.z += this.velocity.z * dt;

    const impactVy = this.velocity.y; // fall speed captured before resolve zeroes it
    this.onGround = false;
    for (let i = 0; i < 3; i++) {
      if (this._resolve(p, colliders)) this.onGround = true;
    }

    // Landing: a hard impact needs a roll (crouch) or you stumble. A dive
    // always commits to a roll-or-stumble on touchdown.
    if (this.onGround && !this._prevOnGround) {
      const impact = -impactVy;
      if (this.diving) {
        this.diving = false;
        if (this._rollRequested()) this._startRoll();
        else if (impact > HARD_LAND_SPEED * 0.5) this._startStumble();
      } else if (impact > HARD_LAND_SPEED) {
        if (this._rollRequested()) this._startRoll();
        else this._startStumble();
      }
    }
    this._prevOnGround = this.onGround;

    // Hat physics: too fast for too long and it shakes loose.
    if (this.hasHat) {
      const sp = Math.hypot(this.velocity.x, this.velocity.z);
      if (sp > HAT_SHAKE_SPEED) {
        this.hatStability -= HAT_DRAIN_RATE * dt;
        if (this.hatStability <= 0) this._dropHat();
      } else {
        this.hatStability = Math.min(1, this.hatStability + HAT_RECOVER_RATE * dt);
      }
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
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyE', 'KeyG', 'KeyC', 'KeyF', 'KeyR',
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
