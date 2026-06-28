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
import WeatherSystem from './systems/WeatherSystem.js';
import ZoneSystem from './systems/ZoneSystem.js';
import DynamicShadeSystem from './systems/DynamicShadeSystem.js';
import WindTellSystem from './systems/WindTellSystem.js';
import CrowdSystem from './systems/CrowdSystem.js';
import DebrisSystem from './systems/DebrisSystem.js';
import AudioSystem from './systems/AudioSystem.js';
import GhostSystem from './systems/GhostSystem.js';
import TouchControls from './ui/TouchControls.jsx';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LEVELS, medalFor, MEDAL_RANK } from './level/index.js';
import {
  AMBIENT_SKY_COLOR,
  AMBIENT_GROUND_COLOR,
  SKY_DAWN,
  MAX_HEALTH,
  MAX_HYDRATION,
  COOL_RECOVERY_RATE,
  COOL_HYDRATE_RATE,
  SUNGLASSES_DAMAGE_MULT,
  HAT_DAMAGE_MULT,
  STREAK_PER_MULT,
  STREAK_MAX_MULT,
  RAIN_DAMAGE_MULT,
  RAIN_HYDRATE_RATE,
  RAIN_TRACTION,
  FLARE_DAMAGE_MULT,
  DUST_HYDRATION_DRAIN,
  DUST_WIND_PUSH,
  UPDRAFT_POWER,
  ECLIPSE_DAMAGE_MULT,
  DIFFICULTIES,
  TOWEL_DAMAGE_MULT,
  TOWEL_DRY_RATE,
  SLEEVES_DAMAGE_MULT,
  SLEEVES_HYDRATION_MULT,
  SNEAKERS_MIN_TRACTION,
} from './utils/constants.js';

const ITEM_LABEL = { water: '+35 Water', sunscreen: 'Sunscreen!', umbrella: 'Umbrella!', hat: 'Hat!', sunglasses: 'Sunglasses!', ice: '🧊 Ice Drink', towel: '🧣 Wet Towel', sleeves: '🧥 Long Sleeves (R)', sneakers: '👟 Sneakers' };

/**
 * Game owns the imperative Three.js world and the per-frame game loop. React
 * only handles the surrounding UI; this component bridges the two by reporting
 * lightweight stats up through onStats and firing onDeath / onWin once.
 *
 * Pointer lock drives a simple pause: lose the lock (Esc) and the world freezes
 * with a "click to resume" overlay; regaining it resumes.
 */
export default function Game({ levelIndex = 0, difficulty = 'normal', muted = false, sensitivity = 1, minimap = true, bloom = true, reduceFlashing = false, tips = true, onStats, onDeath, onWin }) {
  const mountRef = useRef(null);
  const [paused, setPaused] = useState(true);
  const startRef = useRef(null); // function to (re)start the run + grab the mouse
  const ctrlRef = useRef(null); // touch control fns, set in the effect
  const [isTouch] = useState(
    () => typeof window !== 'undefined' &&
      (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0)
  );

  useEffect(() => {
    const mount = mountRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // ---- renderer / scene / camera ----
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.5 : 2)); // lighter on mobile
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

    // ---- post-processing: subtle bloom on the bright sun / emissive glows ----
    // OutputPass does tone-mapping + sRGB, so RenderPass stays linear (no double).
    let composer = null;
    if (bloom) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloomStrength = reduceFlashing ? 0.22 : 0.4;
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), bloomStrength, 0.5, 0.85));
      composer.addPass(new OutputPass());
    }

    // ---- systems ----
    const levelDef = LEVELS[levelIndex] || LEVELS[0];
    const level = levelDef.build();
    scene.add(level.group);
    const sun = new SunSystem(scene, level.sun);
    // Difficulty: stretch/shrink the day and scale sun damage.
    const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    sun.cycle *= diff.cycle;
    const traffic = new TrafficSystem(scene, level.traffic || []);
    // Vehicles block the player and cast moving shade.
    level.colliders.push(...traffic.colliders);
    // Drifting clouds / blimp / retracting awnings — moving + partial overhead shade.
    const dynamicShade = new DynamicShadeSystem(scene, level.dynamicShade || {});
    // Living world: pedestrians (slim moving colliders; parasols are mobile shade)
    // and wind-blown tumbleweeds that shove you.
    const crowd = new CrowdSystem(scene, level.crowd || []);
    level.colliders.push(...crowd.colliders);
    const debris = new DebrisSystem(scene, level.debris || null);
    const shade = new ShadeDetector([...level.occluders, ...traffic.occluders, ...dynamicShade.occluders, ...crowd.occluders]);
    const health = new HealthSystem();
    const items = new ItemSystem(scene, level.items || []);
    const sweat = new SweatSystem(scene);
    const zip = new ZiplineSystem(scene, level.ziplines || []);
    const wind = new WindSystem(level.wind);
    const windTells = new WindTellSystem(scene, level.windTells || []);
    const weather = new WeatherSystem(level.weather || {});
    const audio = new AudioSystem();
    audio.setMuted(muted);
    // Surface zones: explicit level.zones + legacy coolZones promoted to cool zones.
    const zones = new ZoneSystem(scene, [
      ...(level.zones || []),
      ...((level.coolZones || []).map((c) => ({ type: 'cool', x: c.x, z: c.z, r: c.r }))),
    ]);
    const updrafts = level.updrafts || [];

    // Checkpoints: glowing markers you light up by passing; respawn point on death.
    const checkpoints = (level.checkpoints || []).map((c) => ({ x: c.x, z: c.z }));
    const cpMarkers = checkpoints.map((c) => {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0x35ff7a, emissive: 0x1a7a3a, emissiveIntensity: 0.4, transparent: true, opacity: 0.5 })
      );
      m.position.set(c.x, 3, c.z);
      scene.add(m);
      return m;
    });
    const player = new PlayerController(scene, renderer.domElement);
    player.reset(level.startPos, level.startYaw);
    player.sensitivity = sensitivity;
    player.enable();
    player.snapCamera(camera);

    // Ghost replay: load this level's best-run path (if any) to race against.
    let savedSamples = null;
    let prevBest = null;
    try {
      const raw = localStorage.getItem(`sr.ghost.${levelIndex}`);
      if (raw) savedSamples = JSON.parse(raw);
      const b = parseFloat(localStorage.getItem(`sr.best.${levelIndex}`));
      if (!Number.isNaN(b)) prevBest = b;
    } catch { /* ignore */ }
    const ghost = new GhostSystem(scene, savedSamples);

    // Top-down minimap camera (a real shade map — it sees the ground shadows).
    const miniCam = new THREE.OrthographicCamera(-22, 22, 22, -22, 1, 200);
    miniCam.up.set(0, 0, -1); // course direction (-Z) points up on the map

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
      audio.resume(); // create/resume the AudioContext from this user gesture
    };
    startRef.current = startRun;

    // Touch control surface → imperative player.
    ctrlRef.current = {
      move: (f, r) => player.setMoveAxis(f, r),
      look: (dx, dy) => player.lookDelta(dx, dy),
      jump: (down) => { player.keys.Space = down; },
      sprint: (down) => { player.keys.ShiftLeft = down; },
      crouch: (down) => {
        if (down) {
          player.crouching = true;
          player._timeSinceRollKey = 0;
          if (player.onGround && Math.hypot(player.velocity.x, player.velocity.z) > 5) player._startSlide();
        } else {
          player.crouching = false;
        }
      },
      umbrella: () => { if (player.hasUmbrella) player._toggleUmbrella(); },
      shades: () => { if (player.hasSunglasses) player._toggleSunglasses(); },
      dive: () => player._startDive(),
      pause: () => setRunning(false),
    };

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
      if (composer) composer.setSize(w, h);
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
    let lastHazard = false;
    let lastRawInSun = false;
    let lastExposure01 = 1;
    let coolStreak = 0;
    let bestStreak = 0;
    let score = 0;
    let coolMult = 1;
    let cpIndex = -1;
    let lastCheckpoint = null;
    let deaths = 0;
    let lastFootstepId = 0;
    let didBurn = false; // for the "no-burn" challenge ribbon
    let minZ = 0; // furthest the player has reached (for endless distance)
    let lastTip = '';
    const tutorial = tips ? (level.tutorial || []) : [];

    // Lifetime stats accumulator (runs / total distance / deaths).
    const recordRun = (distance, died) => {
      try {
        const g = (k) => parseFloat(localStorage.getItem(k)) || 0;
        localStorage.setItem('sr.stat.runs', String(g('sr.stat.runs') + 1));
        localStorage.setItem('sr.stat.dist', String(Math.round(g('sr.stat.dist') + distance)));
        if (died) localStorage.setItem('sr.stat.deaths', String(g('sr.stat.deaths') + 1));
      } catch { /* ignore */ }
    };
    let lastFlareWarn = false;
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
          hasTowel: player.hasTowel,
          towelWet: player.towelWet,
          hasSleeves: player.hasSleeves,
          hasSneakers: player.hasSneakers,
          sprinting: player.isSprinting,
          walking: player.isWalking,
          stamina: player.stamina,
          diving: player.diving,
          rolling: player.rolling,
          stumbling: player.stumbling,
          hydration: health.hydration,
          dehydrated: health.dehydrated,
          heat: health.inSun ? health.exposure : 0,
          windStrength: wind.strength,
          coolMult,
          coolStreak,
          raining: weather.is('rain'),
          flaring: weather.is('flare'),
          dusting: weather.is('dust'),
          eclipsing: weather.is('eclipse'),
          flareWarn: weather.warningFor('flare'),
          weatherIntensity: weather.intensity,
          onHazard: lastHazard,
          exposure01: lastExposure01,
          coolReserve: health.coolReserve,
          tip: lastTip,
          deaths,
        });
      }
    };

    // One simulation tick. Extracted so the rAF loop and the (optional) debug
    // harness drive identical logic.
    const step = (dt) => {
      sun.update(dt, player.getPosition());
      traffic.update(dt);
      dynamicShade.update(dt, sun.toSun); // drift clouds/blimp, retract awnings
      zip.update(dt, player); // may set player.onZipline before player.update
      wind.update(dt);
      weather.update(dt);
      crowd.update(dt);
      debris.update(dt, wind, player); // shoves the player; do it before player.update integrates
      const raining = weather.is('rain');
      const flaring = weather.is('flare');
      const dusting = weather.is('dust');
      const eclipsing = weather.is('eclipse');
      if (eclipsing) {
        // The sun all but vanishes — darken the scene.
        sun.light.intensity *= 1 - 0.8 * weather.intensity;
        if (scene.background) scene.background.multiplyScalar(1 - 0.55 * weather.intensity);
      }

      // Wind (+ a dust storm's extra shove); wet ground gets skiddy.
      const dustPush = dusting ? DUST_WIND_PUSH * weather.intensity : 0;
      player.windStrength = wind.strength + dustPush;
      player.windVec.copy(wind.dir).multiplyScalar(player.windStrength);
      windTells.update(dt, wind.dir, player.windStrength);
      player.heatDrift = health.inSun ? health.exposure : 0; // heatstroke wobble while baking

      // Surface zones (mud/mist/puddle/hazard/cool): query once on this frame's
      // start position; movement effects apply now, damage/recovery after update.
      const ppPre = player.getPosition();
      const zf = zones.query(ppPre);
      player.zoneSpeedMult = zf.speedMult;
      player.traction = Math.max(
        Math.min(raining ? RAIN_TRACTION : 1, zf.wet ? zf.traction : 1),
        player.hasSneakers ? SNEAKERS_MIN_TRACTION : 0
      ); // sneakers give grip on wet ground

      // Updraft vents launch you up the column (set before update so it carries).
      for (let i = 0; i < updrafts.length; i++) {
        const u = updrafts[i];
        const dx = ppPre.x - u.x;
        const dz = ppPre.z - u.z;
        if (dx * dx + dz * dz < u.r * u.r && ppPre.y < (u.top ?? 6)) {
          if (player.velocity.y < UPDRAFT_POWER) player.velocity.y = UPDRAFT_POWER;
        }
      }
      player.update(dt, level.colliders, camera);

      // --- audio: ambience + movement one-shots ---
      audio.ambience(health.exposure, player.windStrength);
      if (player.footstepId !== lastFootstepId) { lastFootstepId = player.footstepId; audio.footstep(); }
      if (player.jumpedThisFrame) audio.jump();
      const fw = weather.warningFor('flare');
      if (fw && !lastFlareWarn) audio.flareWarn();
      lastFlareWarn = fw;

      const pp = player.getPosition();
      if (pp.z < minZ) minZ = pp.z;
      if (tutorial.length) { let t = ''; for (const s of tutorial) if (s.z >= pp.z) t = s.text; lastTip = t; }
      // Partial shade (e.g. tinted skybridges) scales 0..1 instead of on/off.
      const exposure01 = shade.sunExposure(pp, sun.toSun);
      lastRawInSun = exposure01 > 0.05;
      lastExposure01 = exposure01;
      // An open umbrella is mobile shade.
      const inSun = lastRawInSun && !player.umbrellaOpen;
      // Gear softens the sun: sunglasses (when worn) and a hat stack with sunscreen.
      const gearMult =
        (player.hasSunglasses && player.sunglassesOn ? SUNGLASSES_DAMAGE_MULT : 1) *
        (player.hasHat ? HAT_DAMAGE_MULT : 1) *
        (player.hasTowel && player.towelWet > 0 ? TOWEL_DAMAGE_MULT : 1) *
        (player.hasSleeves ? SLEEVES_DAMAGE_MULT : 1);
      // Weather scales the sun: rain/eclipse cool it down, a flare spikes it.
      let envMult = 1;
      if (eclipsing) envMult = ECLIPSE_DAMAGE_MULT;
      else if (raining) envMult = RAIN_DAMAGE_MULT;
      else if (flaring) envMult = FLARE_DAMAGE_MULT;
      const hydrationMult = player.hasSleeves ? SLEEVES_HYDRATION_MULT : 1; // sleeves make you sweat
      if (inSun) didBurn = true; // any sun exposure forfeits the no-burn ribbon
      health.update(dt, inSun, gearMult * envMult * diff.damage * (inSun ? exposure01 : 1), hydrationMult);
      // Wet towel dries out over time (faster in the sun); re-wet at fountains below.
      if (player.hasTowel) {
        player.towelWet = Math.max(0, player.towelWet - TOWEL_DRY_RATE * (inSun ? 2 : 1) * dt);
        if (player.towelMat) player.towelMat.color.setHex(player.towelWet > 0.05 ? 0x2a9aad : 0xa8c4c8);
      }
      if (raining) health.hydrate(RAIN_HYDRATE_RATE * dt);
      if (dusting) health.hydration = Math.max(0, health.hydration - DUST_HYDRATION_DRAIN * dt);

      // Surface-zone effects (cool / puddle hydration / hot-ground contact damage).
      if (zf.cool && !health.dead) {
        health.health = Math.min(MAX_HEALTH, health.health + COOL_RECOVERY_RATE * dt);
        health.hydrate(COOL_HYDRATE_RATE * dt);
        if (player.hasTowel) player.towelWet = 1; // fountains re-wet the towel
      }
      if (zf.hydrate > 0) health.hydrate(zf.hydrate * dt);
      const hazardDps = zf.hazardFlat + zf.hazardSun * sun.getProgress();
      if (hazardDps > 0 && !health.dead) {
        health.health -= hazardDps * dt;
        if (health.health <= 0) { health.health = 0; health.dead = true; }
      }
      lastCooling = zf.cool;
      lastHazard = hazardDps > 0;

      const picked = items.update(dt, pp);
      for (const type of picked) {
        if (type === 'umbrella') player.giveUmbrella();
        else if (type === 'hat') player.giveHat();
        else if (type === 'sunglasses') player.giveSunglasses();
        else if (type === 'towel') player.giveTowel();
        else if (type === 'sleeves') player.giveSleeves();
        else if (type === 'sneakers') player.giveSneakers();
        else health.applyPickup(type);
        pickupLabel = ITEM_LABEL[type] || type;
        pickupId++;
        audio.pickup();
      }
      sweat.update(dt, player, health, raining); // rain washes the sweat away

      // Cool-streak scoring: stay out of the sun to build a multiplier; burning
      // resets it — but rain counts as cool, so it doesn't break your streak.
      const burning = health.inSun && !raining && !eclipsing;
      if (burning) coolStreak = 0;
      else coolStreak += dt;
      if (coolStreak > bestStreak) bestStreak = coolStreak;
      coolMult = Math.min(STREAK_MAX_MULT, 1 + Math.floor(coolStreak / STREAK_PER_MULT));
      score += coolMult * dt;

      elapsed += dt;

      // Ghost replay: record this run, and move the best-run ghost alongside.
      ghost.record(elapsed, pp);
      ghost.update(elapsed);

      // Checkpoints: light the furthest one passed; it becomes the respawn point.
      let furthest = -1;
      for (let i = 0; i < checkpoints.length; i++) {
        if (pp.z <= checkpoints[i].z) furthest = i;
      }
      if (furthest > cpIndex) {
        cpIndex = furthest;
        lastCheckpoint = checkpoints[furthest];
        cpMarkers[furthest].material.emissiveIntensity = 2;
        cpMarkers[furthest].material.opacity = 0.9;
        pickupLabel = '🚩 Checkpoint';
        pickupId++;
        audio.checkpoint();
      }

      if (level.finishBox.containsPoint(pp)) {
        finished = true;
        document.exitPointerLock();
        audio.win();
        const isBest = prevBest === null || elapsed < prevBest;
        if (isBest) {
          try {
            localStorage.setItem(`sr.best.${levelIndex}`, String(elapsed));
            localStorage.setItem(`sr.ghost.${levelIndex}`, JSON.stringify(ghost.getRecording()));
          } catch { /* ignore */ }
        }
        // Medal + challenge ribbons.
        const distance = Math.floor(-minZ);
        const medal = medalFor(levelIndex, { time: elapsed, distance });
        const ribbons = { noBurn: !didBurn, pale: health.health >= 80, noDeaths: deaths === 0 };
        try {
          const prevM = localStorage.getItem(`sr.medal.${levelIndex}`);
          if (medal && (!prevM || MEDAL_RANK[medal] > (MEDAL_RANK[prevM] || 0))) {
            localStorage.setItem(`sr.medal.${levelIndex}`, medal);
          }
          for (const r of Object.keys(ribbons)) if (ribbons[r]) localStorage.setItem(`sr.ribbon.${levelIndex}.${r}`, '1');
        } catch { /* ignore */ }
        recordRun(distance, false);
        onWin({ time: elapsed, health: health.health, score: Math.floor(score), streak: Math.floor(bestStreak), deaths, best: isBest ? elapsed : prevBest, newBest: isBest, medal, ribbons, distance });
      } else if (health.dead) {
        if (lastCheckpoint) {
          // Respawn at the last checkpoint rather than restarting the whole level.
          deaths++;
          player.respawn(new THREE.Vector3(lastCheckpoint.x, 0.9, lastCheckpoint.z));
          health.health = MAX_HEALTH;
          health.dead = false;
          health.hydration = MAX_HYDRATION;
          health.exposure = 0;
          health.coolReserve = 0;
          coolStreak = 0;
          pickupLabel = '↻ Respawned';
          pickupId++;
          audio.respawn();
        } else {
          finished = true;
          document.exitPointerLock();
          audio.death();
          const dist = Math.floor(-minZ);
          let bestDist = dist;
          let medal = null;
          if (level.endless) {
            try {
              const pd = parseFloat(localStorage.getItem(`sr.dist.${levelIndex}`));
              bestDist = !Number.isNaN(pd) ? Math.max(pd, dist) : dist;
              localStorage.setItem(`sr.dist.${levelIndex}`, String(bestDist));
              medal = medalFor(levelIndex, { distance: dist, time: elapsed });
              const prevM = localStorage.getItem(`sr.medal.${levelIndex}`);
              if (medal && (!prevM || MEDAL_RANK[medal] > (MEDAL_RANK[prevM] || 0))) localStorage.setItem(`sr.medal.${levelIndex}`, medal);
            } catch { /* ignore */ }
          }
          recordRun(dist, true);
          onDeath({ time: elapsed, score: Math.floor(score), streak: Math.floor(bestStreak), deaths, distance: dist, bestDistance: bestDist, endless: !!level.endless, medal });
        }
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

      if (composer) {
        try { composer.render(); }
        catch (_) { composer.dispose(); composer = null; renderer.render(scene, camera); }
      } else {
        renderer.render(scene, camera);
      }

      // Minimap: re-render the scene top-down into a corner viewport. The ground
      // shadows come along for free, so it doubles as a live shade map.
      if (minimap) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const ms = Math.min(170, Math.floor(w * 0.24));
        const pad = 14;
        const pp = player.getPosition();
        miniCam.position.set(pp.x, 90, pp.z);
        miniCam.lookAt(pp.x, 0, pp.z);
        renderer.setScissorTest(true);
        renderer.setViewport(w - ms - pad, pad, ms, ms); // bottom-right
        renderer.setScissor(w - ms - pad, pad, ms, ms);
        renderer.render(scene, miniCam);
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, w, h);
      }
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
        giveTowel: () => player.giveTowel(),
        giveSleeves: () => player.giveSleeves(),
        toggleSleeves: () => player._toggleSleeves(),
        giveSneakers: () => player.giveSneakers(),
        setCrouch: (v) => { player.crouching = v; },
        slide: () => player._startSlide(),
        dive: () => player._startDive(),
        rollKey: () => { player._timeSinceRollKey = 0; }, // arm a landing roll (like tapping C)
        pickup: (type) => health.applyPickup(type), // water / sunscreen / ice
        kill: () => { health.health = 0; health.dead = true; }, // force death (test respawn)
        resumeAudio: () => audio.resume(),
        moveAxis: (f, r) => player.setMoveAxis(f, r),
        lookDelta: (dx, dy) => player.lookDelta(dx, dy),
        yaw: () => +player.yaw.toFixed(3),
        state: () => ({
          pos: player.getPosition().toArray().map((n) => +n.toFixed(2)),
          health: +health.health.toFixed(1),
          inSun: health.inSun,
          onGround: player.onGround,
          sunscreen: +health.sunscreen.toFixed(1),
          umbrella: player.hasUmbrella,
          umbrellaOpen: player.umbrellaOpen,
          towel: player.hasTowel,
          towelWet: +player.towelWet.toFixed(2),
          sleeves: player.hasSleeves,
          sneakers: player.hasSneakers,
          sliding: player.sliding,
          onZipline: player.onZipline,
          hanging: player.hanging,
          wallRunning: player.wallRunning,
          cooling: lastCooling,
          hasHat: player.hasHat,
          hatStability: +player.hatStability.toFixed(2),
          sunglassesOn: player.sunglassesOn,
          sprinting: player.isSprinting,
          walking: player.isWalking,
          stamina: +player.stamina.toFixed(2),
          diving: player.diving,
          rolling: player.rolling,
          stumbling: player.stumbling,
          hydration: +health.hydration.toFixed(1),
          dehydrated: health.dehydrated,
          coolReserve: +health.coolReserve.toFixed(1),
          deaths,
          checkpoint: cpIndex,
          audioState: audio.ctx ? audio.ctx.state : 'none',
          audioMuted: audio.muted,
          tip: lastTip,
          ghostSamples: ghost.samples ? ghost.samples.length : 0,
          recordingLen: ghost.recording.length,
          ghostX: ghost.ghost ? +ghost.ghost.position.x.toFixed(1) : null,
          minimap,
          sensitivity: player.sensitivity,
          prevBest,
          crowdPeds: crowd.peds.length,
          crowdParasols: crowd.occluders.length,
          crowdPed0: crowd.peds[0] ? [+crowd.peds[0].group.position.x.toFixed(1), +crowd.peds[0].group.position.z.toFixed(1)] : null,
          debrisCount: debris.pieces.length,
          debris0: debris.pieces[0] ? [+debris.pieces[0].x.toFixed(1), +debris.pieces[0].z.toFixed(1)] : null,
          windStrength: +wind.strength.toFixed(2),
          heatDrift: +player.heatDrift.toFixed(2),
          traction: player.traction,
          zoneSpeed: +player.zoneSpeedMult.toFixed(2),
          onHazard: lastHazard,
          sunExposure: +shade.sunExposure(player.getPosition(), sun.toSun).toFixed(2),
          dynOccluders: dynamicShade.occluders.length,
          dynBlimpX: dynamicShade.blimp ? +dynamicShade.blimp.group.position.x.toFixed(1) : null,
          dynShadows: [
            ...dynamicShade.clouds.map((c) => ['cloud', +c.decal.position.x.toFixed(1), +c.decal.position.z.toFixed(1)]),
            ...(dynamicShade.blimp ? [['blimp', +dynamicShade.blimp.decal.position.x.toFixed(1), +dynamicShade.blimp.decal.position.z.toFixed(1)]] : []),
          ],
          weather: weather.current || (weather.warningFor('flare') ? 'flare(warn)' : 'calm'),
          weatherActive: weather.state === 'active',
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
      audio.dispose();
      if (document.pointerLockElement === el) document.exitPointerLock();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
      });
      if (composer) composer.dispose();
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
      {minimap && <div className="minimap-frame"><span>MAP</span></div>}
      {paused && (
        <div className="overlay pause">
          <div className="headline">Paused</div>
          <p className="sub">The mouse is free. Click below to recapture it and keep running.</p>
          <button className="btn" onClick={() => startRef.current && startRef.current()}>
            Resume
          </button>
          <div className="hint">WASD move · Mouse look · Space jump · Shift sprint · C crouch/slide/roll · F dive · E umbrella · G shades · R sleeves · Esc pause</div>
        </div>
      )}
      {isTouch && !paused && <TouchControls ctrl={ctrlRef} />}
    </div>
  );
}
