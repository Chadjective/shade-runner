import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import SunSystem from './systems/SunSystem.js';
import ShadeDetector from './systems/ShadeDetector.js';
import HealthSystem from './systems/HealthSystem.js';
import PlayerController from './systems/PlayerController.js';
import ItemSystem from './systems/ItemSystem.js';
import SweatSystem from './systems/SweatSystem.js';
import TrafficSystem from './systems/TrafficSystem.js';
import ZiplineSystem from './systems/ZiplineSystem.js';
import WindSystem from './systems/WindSystem.js';
import { LEVELS } from './level/index.js';
import {
  AMBIENT_SKY_COLOR,
  AMBIENT_GROUND_COLOR,
  SKY_DAWN,
  MAX_HEALTH,
  COOL_RECOVERY_RATE,
  COOL_HYDRATE_RATE,
  SUNGLASSES_DAMAGE_MULT,
  HAT_DAMAGE_MULT,
  STREAK_PER_MULT,
  STREAK_MAX_MULT,
} from './utils/constants.js';

const ITEM_LABEL = { water: '+35 Water', sunscreen: 'Sunscreen!', umbrella: 'Umbrella!', hat: 'Hat!', sunglasses: 'Sunglasses!' };

/**
 * Game owns the imperative Three.js world and the per-frame game loop. React
 * only handles the surrounding UI; this component bridges the two by reporting
 * lightweight stats up through onStats and firing onDeath / onWin once.
 *
 * Pointer lock drives a simple pause: lose the lock (Esc) and the world freezes
 * with a "click to resume" overlay; regaining it resumes.
 */
export default function Game({ levelIndex = 0, onStats, onDeath, onWin }) {
  const mountRef = useRef(null);
  const [paused, setPaused] = useState(true);
  const startRef = useRef(null); // function to (re)start the run + grab the mouse

  useEffect(() => {
    const mount = mountRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // ---- renderer / scene / camera ----
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SKY_DAWN);
    scene.fog = new THREE.Fog(SKY_DAWN, 60, 260);

    const camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 600);

    // Cool fill so shaded areas read as cool-blue rather than pitch black.
    const hemi = new THREE.HemisphereLight(AMBIENT_SKY_COLOR, AMBIENT_GROUND_COLOR, 1.05);
    scene.add(hemi);

    // ---- systems ----
    const levelDef = LEVELS[levelIndex] || LEVELS[0];
    const level = levelDef.build();
    scene.add(level.group);
    const sun = new SunSystem(scene, level.sun);
    const traffic = new TrafficSystem(scene, level.traffic || []);
    // Vehicles block the player and cast moving shade.
    level.colliders.push(...traffic.colliders);
    const shade = new ShadeDetector([...level.occluders, ...traffic.occluders]);
    const health = new HealthSystem();
    const items = new ItemSystem(scene, level.items || []);
    const sweat = new SweatSystem(scene);
    const zip = new ZiplineSystem(scene, level.ziplines || []);
    const wind = new WindSystem(level.wind);
    const coolZones = level.coolZones || [];
    const player = new PlayerController(scene, renderer.domElement);
    player.reset(level.startPos, level.startYaw);
    player.enable();
    player.snapCamera(camera);

    // Compute world matrices once up front so the shade raycaster is accurate
    // from frame zero (and from the headless QA harness, which steps without
    // rendering). The static occluders never move, so this single pass holds.
    scene.updateMatrixWorld(true);

    // ---- run state / pointer lock / pause ----
    // The simulation advances whenever the run is "active". Pointer lock is
    // best-effort mouse capture layered on top: if the browser grants it,
    // losing it (Esc) pauses the run; if it denies it, the game still plays —
    // mouse-look just isn't recentered. This keeps the game from soft-locking
    // on the pause screen when a browser refuses pointer lock.
    const el = renderer.domElement;
    let running = false;
    let hadLock = false;

    const requestLock = () => {
      try {
        const r = el.requestPointerLock();
        if (r && typeof r.catch === 'function') r.catch(() => {});
      } catch (_) {
        /* browser may throttle rapid requests */
      }
    };

    const setRunning = (v) => {
      running = v;
      player.lookEnabled = v;
      setPaused(!v);
    };
    const startRun = () => {
      setRunning(true);
      requestLock();
    };
    startRef.current = startRun;

    const onLockChange = () => {
      const locked = document.pointerLockElement === el;
      if (locked) hadLock = true;
      else if (hadLock && running) setRunning(false); // lost the lock -> pause
      player.lookEnabled = running;
    };
    const onCanvasClick = () => {
      if (!running) startRun();
      else if (document.pointerLockElement !== el) requestLock();
    };
    const onEscKey = (e) => {
      if (e.code === 'Escape' && running) {
        if (document.pointerLockElement === el) document.exitPointerLock();
        setRunning(false);
      }
    };
    document.addEventListener('pointerlockchange', onLockChange);
    el.addEventListener('click', onCanvasClick);
    window.addEventListener('keydown', onEscKey);

    // ---- resize ----
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ---- loop ----
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    let finished = false;
    let pickupLabel = '';
    let pickupId = 0;
    let lastCooling = false;
    let lastRawInSun = false;
    let coolStreak = 0;
    let bestStreak = 0;
    let score = 0;
    let coolMult = 1;
    const reported = { health: -1, time: -1, inSun: null, prog: -1, pickup: -1 };

    const report = () => {
      const hp = Math.ceil(health.health);
      const t10 = Math.floor(elapsed * 10);
      const prog100 = Math.floor(sun.getProgress() * 100);
      if (
        hp !== reported.health || t10 !== reported.time || health.inSun !== reported.inSun ||
        prog100 !== reported.prog || pickupId !== reported.pickup
      ) {
        reported.health = hp;
        reported.time = t10;
        reported.inSun = health.inSun;
        reported.prog = prog100;
        reported.pickup = pickupId;
        onStats({
          health: health.health,
          inSun: health.inSun,
          exposure: health.exposure,
          time: elapsed,
          sunProgress: sun.getProgress(),
          sunscreen: health.sunscreen,
          level: levelIndex,
          levelName: levelDef.name,
          pickup: pickupLabel,
          pickupId,
          hasUmbrella: player.hasUmbrella,
          umbrellaOpen: player.umbrellaOpen,
          sheltered: player.umbrellaOpen && lastRawInSun,
          sliding: player.sliding,
          onZipline: player.onZipline,
          cooling: lastCooling,
          hasHat: player.hasHat,
          hatStability: player.hatStability,
          hasSunglasses: player.hasSunglasses,
          sunglassesOn: player.sunglassesOn,
          sprinting: player.isSprinting,
          walking: player.isWalking,
          stamina: player.stamina,
          hydration: health.hydration,
          dehydrated: health.dehydrated,
          heat: health.inSun ? health.exposure : 0,
          windStrength: wind.strength,
          coolMult,
          coolStreak,
        });
      }
    };

    // One simulation tick. Extracted so the rAF loop and the (optional) debug
    // harness drive identical logic.
    const step = (dt) => {
      sun.update(dt, player.getPosition());
      traffic.update(dt);
      zip.update(dt, player); // may set player.onZipline before player.update
      wind.update(dt);
      player.windVec.copy(wind.vec);
      player.windStrength = wind.strength;
      player.heatDrift = health.inSun ? health.exposure : 0; // heatstroke wobble while baking
      player.update(dt, level.colliders, camera);

      const pp = player.getPosition();
      const rawInSun = shade.isInSun(pp, sun.toSun);
      lastRawInSun = rawInSun;
      // An open umbrella is mobile shade.
      const inSun = rawInSun && !player.umbrellaOpen;
      // Gear softens the sun: sunglasses (when worn) and a hat stack with sunscreen.
      const gearMult =
        (player.hasSunglasses && player.sunglassesOn ? SUNGLASSES_DAMAGE_MULT : 1) *
        (player.hasHat ? HAT_DAMAGE_MULT : 1);
      health.update(dt, inSun, gearMult);

      // Cooling zones (misters / fountains) recover health fast, even in sun.
      let cooling = false;
      for (let i = 0; i < coolZones.length; i++) {
        const cz = coolZones[i];
        const dx = pp.x - cz.x;
        const dz = pp.z - cz.z;
        if (dx * dx + dz * dz < cz.r * cz.r) { cooling = true; break; }
      }
      if (cooling && !health.dead) {
        health.health = Math.min(MAX_HEALTH, health.health + COOL_RECOVERY_RATE * dt);
        health.hydrate(COOL_HYDRATE_RATE * dt);
      }
      lastCooling = cooling;

      const picked = items.update(dt, pp);
      for (const type of picked) {
        if (type === 'umbrella') player.giveUmbrella();
        else if (type === 'hat') player.giveHat();
        else if (type === 'sunglasses') player.giveSunglasses();
        else health.applyPickup(type);
        pickupLabel = ITEM_LABEL[type] || type;
        pickupId++;
      }
      sweat.update(dt, player, health);

      // Cool-streak scoring: stay out of the sun to build a multiplier; burning resets it.
      if (health.inSun) coolStreak = 0;
      else coolStreak += dt;
      if (coolStreak > bestStreak) bestStreak = coolStreak;
      coolMult = Math.min(STREAK_MAX_MULT, 1 + Math.floor(coolStreak / STREAK_PER_MULT));
      score += coolMult * dt;

      elapsed += dt;

      if (level.finishBox.containsPoint(player.getPosition())) {
        finished = true;
        document.exitPointerLock();
        onWin({ time: elapsed, health: health.health, score: Math.floor(score), streak: Math.floor(bestStreak) });
      } else if (health.dead) {
        finished = true;
        document.exitPointerLock();
        onDeath({ time: elapsed, score: Math.floor(score), streak: Math.floor(bestStreak) });
      }
      report();
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (running && !finished) {
        step(dt);
      } else {
        // keep the sun disc / camera coherent without advancing game state
        sun.update(0, player.getPosition());
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    // ---- optional QA harness (only with ?debug in the URL) ----
    // Lets the simulation be driven deterministically without relying on rAF
    // (which the browser suspends for hidden/background tabs). Ships harmlessly
    // — it does nothing unless ?debug is present.
    let debugHandle = null;
    if (new URLSearchParams(window.location.search).has('debug')) {
      debugHandle = {
        step,
        setRunning,
        press: (code) => { player.keys[code] = true; },
        release: (code) => { player.keys[code] = false; },
        clearKeys: () => { player.keys = Object.create(null); },
        faceForward: () => { player.yaw = 0; },
        teleport: (x, y, z) => player.mesh.position.set(x, y, z),
        setHealth: (v) => { health.health = v; health.dead = false; },
        jump: () => { player.keys.Space = true; },
        giveUmbrella: () => player.giveUmbrella(),
        toggleUmbrella: () => player._toggleUmbrella(),
        giveHat: () => player.giveHat(),
        giveSunglasses: () => player.giveSunglasses(),
        toggleSunglasses: () => player._toggleSunglasses(),
        setCrouch: (v) => { player.crouching = v; },
        slide: () => player._startSlide(),
        state: () => ({
          pos: player.getPosition().toArray().map((n) => +n.toFixed(2)),
          health: +health.health.toFixed(1),
          inSun: health.inSun,
          onGround: player.onGround,
          sunscreen: +health.sunscreen.toFixed(1),
          umbrella: player.hasUmbrella,
          umbrellaOpen: player.umbrellaOpen,
          sliding: player.sliding,
          onZipline: player.onZipline,
          cooling: lastCooling,
          hasHat: player.hasHat,
          hatStability: +player.hatStability.toFixed(2),
          sunglassesOn: player.sunglassesOn,
          sprinting: player.isSprinting,
          walking: player.isWalking,
          stamina: +player.stamina.toFixed(2),
          hydration: +health.hydration.toFixed(1),
          dehydrated: health.dehydrated,
          windStrength: +wind.strength.toFixed(2),
          heatDrift: +player.heatDrift.toFixed(2),
          coolMult,
          bestStreak: +bestStreak.toFixed(1),
          vehiclesZ: traffic.vehicles.map((v) => +v.mesh.position.z.toFixed(1)),
          elapsed: +elapsed.toFixed(2),
          sunProgress: +sun.getProgress().toFixed(3),
          sunElevation: +sun.getElevationDeg().toFixed(1),
          items: items.items.map((i) => ({ type: i.type, taken: i.taken })),
          legSwing: player.legL ? +player.legL.rotation.x.toFixed(3) : 0,
          lean: player.rig ? +player.rig.rotation.x.toFixed(3) : 0,
          sweatActive: sweat.activeCount(),
          finished,
        }),
        // Advance `seconds` of sim at a fixed 60Hz step. Stops early on win/death.
        sim: (seconds, opts = {}) => {
          const dt = 1 / 60;
          let t = 0;
          while (t < seconds && !finished) {
            if (opts.god) health.health = 100;
            step(dt);
            t += dt;
          }
          return debugHandle.state();
        },
        finishBox: { min: level.finishBox.min.toArray(), max: level.finishBox.max.toArray() },
      };
      window.__shade = debugHandle;
    }

    // ---- cleanup ----
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onEscKey);
      document.removeEventListener('pointerlockchange', onLockChange);
      el.removeEventListener('click', onCanvasClick);
      player.disable();
      if (document.pointerLockElement === el) document.exitPointerLock();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      // dispose() frees GL resources but not the context itself; force it so a
      // restart (which mounts a fresh renderer) can't exhaust the browser's
      // limited pool of WebGL contexts.
      renderer.forceContextLoss();
      if (el.parentNode) el.parentNode.removeChild(el);
      if (debugHandle && window.__shade === debugHandle) delete window.__shade;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="game-root">
      <div ref={mountRef} />
      {paused && (
        <div className="overlay pause">
          <div className="headline">Paused</div>
          <p className="sub">The mouse is free. Click below to recapture it and keep running.</p>
          <button className="btn" onClick={() => startRef.current && startRef.current()}>
            Resume
          </button>
          <div className="hint">WASD move · Mouse look · Space jump · Shift sprint · C crouch/slide · E umbrella · G shades · Esc pause</div>
        </div>
      )}
    </div>
  );
}
