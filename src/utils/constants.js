// ---------------------------------------------------------------------------
// Tuning values — the numbers that control how the game *feels*.
// These are meant to be played with. Each is referenced from exactly one
// system so a single edit here changes behaviour everywhere.
// ---------------------------------------------------------------------------

// --- Health / sun damage ---------------------------------------------------
export const MAX_HEALTH = 100;
export const SUN_DAMAGE_RATE = 10; // HP drained per second in direct sun
export const SHADE_RECOVERY_RATE = 3; // HP recovered per second in shade

// --- Items / pickups -------------------------------------------------------
export const WATER_HEAL = 35; // HP restored instantly by a water bottle
export const SUNSCREEN_DURATION = 9; // seconds of sun protection
export const SUNSCREEN_DAMAGE_MULT = 0.3; // sun damage multiplier while protected
export const ITEM_PICKUP_RADIUS = 1.5; // how close you must get to grab an item

// --- Movement --------------------------------------------------------------
export const PLAYER_SPEED = 8; // ground run speed, units/sec
export const PLAYER_ACCEL = 60; // how quickly we reach top speed (snappy)
export const JUMP_FORCE = 9; // initial upward velocity on jump (tuned up from
//                              the spec's 5 so scaffolding is reachable)
export const GRAVITY = 18; // downward acceleration, units/sec^2
export const PLAYER_RADIUS = 0.4;
export const PLAYER_HEIGHT = 1.8; // total capsule height
export const COYOTE_TIME = 0.12; // grace period to still jump after leaving a ledge

// --- Camera ----------------------------------------------------------------
export const CAM_DISTANCE = 7; // how far behind the player
export const CAM_HEIGHT = 3.2; // how high above the player's feet the camera sits
export const CAM_LOOK_HEIGHT = 1.4; // point on the player the camera aims at
export const MOUSE_SENSITIVITY = 0.0024;
export const CAM_PITCH_MIN = -0.35; // radians (look down)
export const CAM_PITCH_MAX = 0.95; // radians (look up / steeper top-down)

// --- Sun -------------------------------------------------------------------
// Tuned down from the spec's 180s: an optimal run is only ~26s, so a 180s day
// meant the sun never climbed enough to threaten a sprinter (the whole canyon
// stayed in dawn shadow). At ~55s the sun reaches dangerous heights by the
// mid/late course, so a careless run cooks and a clean run finishes singed.
export const SUN_CYCLE_DURATION = 55; // seconds for a full level "day"
export const SUN_START_ANGLE = 15; // degrees elevation at start (long shadows)
export const SUN_END_ANGLE = 85; // degrees elevation at end (short shadows)
export const SUN_AZIMUTH_START = -58; // degrees, sun rises in the "east"
export const SUN_AZIMUTH_END = 58; // degrees, sets in the "west"
export const SUN_DISTANCE = 60; // how far the light sits from its target

// --- World palette (warm sun / cool shade) ---------------------------------
export const SUN_LIGHT_COLOR = 0xfff1d6; // warm sunlight
export const AMBIENT_SKY_COLOR = 0x9fc6ff; // cool sky fill
export const AMBIENT_GROUND_COLOR = 0x2a2f55; // cool ground bounce
export const SKY_DAWN = 0xffb27a; // horizon-ish dawn tone
export const SKY_NOON = 0xbfe3ff; // bright midday sky
