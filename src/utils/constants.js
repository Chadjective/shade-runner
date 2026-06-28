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

// --- Umbrella (carryable mobile shade) -------------------------------------
export const UMBRELLA_SPEED_MULT = 0.62; // you move slower while it's open
// (an open umbrella counts as full shade — the slowdown is the trade-off)
export const UMBRELLA_GLIDE_GRAVITY_MULT = 0.32; // open in mid-air = slow descent
export const UMBRELLA_GLIDE_MAX_FALL = 3.2; // terminal fall speed while gliding

// --- Sunglasses (gear: cut the sun, but dim your view) ---------------------
export const SUNGLASSES_DAMAGE_MULT = 0.55; // sun damage multiplier while worn

// --- Hat (gear: shade, but it shakes loose if you run too fast) ------------
export const HAT_DAMAGE_MULT = 0.7; // sun damage multiplier while worn
export const HAT_SHAKE_SPEED = 9; // moving faster than this works it loose
export const HAT_DRAIN_RATE = 0.7; // stability/sec lost while moving too fast
export const HAT_RECOVER_RATE = 0.5; // stability/sec regained when slow enough

// --- Sprint / walk (burst speed vs. careful pace) --------------------------
export const SPRINT_SPEED_MULT = 1.45;
export const WALK_SPEED_MULT = 0.45;
export const SPRINT_STAMINA_DRAIN = 0.5; // per sec (≈2s of sprint from full)
export const SPRINT_STAMINA_RECOVER = 0.35; // per sec

// --- Slide -----------------------------------------------------------------
export const SLIDE_DURATION = 0.55; // seconds a slide lasts
export const SLIDE_SPEED_MULT = 1.55; // speed boost during the slide
export const SLIDE_COOLDOWN = 0.9; // seconds before you can slide again
export const SLIDE_HEIGHT_MULT = 0.5; // collision height while sliding (duck under cover)

// --- Zipline ---------------------------------------------------------------
export const ZIPLINE_SPEED = 15; // units/sec travelled along a cable
export const ZIPLINE_GRAB_RADIUS = 2.4; // how close to a cable end to auto-grab

// --- Cooling zones (misters / fountains) -----------------------------------
export const COOL_RECOVERY_RATE = 20; // HP/sec recovered inside a cooling zone

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

// --- Wind (gusts that shove you and grab your gear) ------------------------
export const WIND_DIR = [1, 0, 0.25]; // blows mostly across +X
export const WIND_BASE = 0.12; // constant breeze (strength 0..1)
export const WIND_GUST_MAX = 1.0; // peak gust strength
export const WIND_GUST_PERIOD = 9; // seconds between gust peaks
export const WIND_PUSH = 6; // sideways accel at full gust
export const UMBRELLA_WIND_CATCH = 2.4; // open umbrella catches the wind (more push)
export const UMBRELLA_FLIP_STRENGTH = 0.82; // a gust this strong flips it shut
export const HAT_WIND_THRESHOLD = 0.5; // gusts above this work the hat loose
export const HAT_WIND_DRAIN = 1.2; // hat stability/sec lost per unit of gust over threshold

// --- Hydration (sweat costs water; thirst makes the sun worse) --------------
export const MAX_HYDRATION = 100;
export const HYDRATION_DRAIN = 6; // per sec while in the sun
export const HYDRATION_LOW = 30; // below this you're dehydrated
export const DEHYDRATION_DMG_MULT = 1.6; // sun damage multiplier when dehydrated
export const WATER_HYDRATE = 50; // hydration restored by a water bottle
export const COOL_HYDRATE_RATE = 14; // hydration/sec regained in a cooling zone

// --- Heatstroke (vision shimmer + control drift when baking) ---------------
export const HEAT_DRIFT = 1.4; // sideways drift accel at full heat, in the sun

// --- Cool-streak scoring ---------------------------------------------------
export const STREAK_PER_MULT = 5; // seconds of staying cool per +1x
export const STREAK_MAX_MULT = 8;

// --- Eclipse (rare full-shade window) --------------------------------------
export const ECLIPSE_DAMAGE_MULT = 0.05; // the sun all but vanishes

// --- Ice drink (cool-reserve buffer that melts over time) -------------------
export const ICE_RESERVE = 40; // buffer that soaks sun damage before health
export const ICE_MELT_RATE = 4; // reserve lost per second

// --- Difficulty presets (sun damage × / sun cycle ×) -----------------------
export const DIFFICULTIES = {
  mellow: { label: 'Mellow', damage: 0.6, cycle: 1.5 },
  normal: { label: 'Normal', damage: 1.0, cycle: 1.0 },
  scorching: { label: 'Scorching', damage: 1.45, cycle: 0.7 },
};

// --- Weather events (rain / solar flare / dust storm) ----------------------
export const WEATHER_CALM = 14; // seconds of calm between events
export const WEATHER_DURATION = 7; // how long an event lasts
export const FLARE_WARN = 1.8; // telegraph lead before a flare hits
export const RAIN_DAMAGE_MULT = 0.1; // sun damage while it's raining (cooled off)
export const RAIN_HYDRATE_RATE = 10; // hydration/sec regained in the rain
export const RAIN_TRACTION = 0.4; // grip on wet ground (lower = more skid)
export const FLARE_DAMAGE_MULT = 3; // sun damage spike during a solar flare
export const DUST_HYDRATION_DRAIN = 8; // extra hydration/sec lost in a dust storm
export const DUST_WIND_PUSH = 0.85; // extra wind strength during a dust storm

// --- Updraft vents ---------------------------------------------------------
export const UPDRAFT_POWER = 9; // upward velocity while standing in the column

// --- Traversal verbs (Phase C: dive / landing roll) ------------------------
export const DIVE_SPEED = 14; // forward lunge speed
export const DIVE_UP = 2.5; // small hop as you dive
export const DIVE_DURATION = 0.5; // committed-lunge time
export const HARD_LAND_SPEED = 11; // impact speed that needs a roll or you stumble
export const ROLL_DURATION = 0.45;
export const ROLL_SPEED_MULT = 1.2; // a clean roll keeps (a bit of) momentum
export const ROLL_WINDOW = 0.2; // grace around landing to press crouch and roll
export const STUMBLE_DURATION = 0.5;
export const STUMBLE_SPEED_MULT = 0.35; // botched landing: you lurch and slow

// --- Ledge grab + wall-run (deferred traversal) ----------------------------
export const LEDGE_GRAB_REACH = 0.4; // how close to a wall face you grab a ledge
export const LEDGE_MIN_HEIGHT = 1.2; // ledge top must be this far above your feet
export const LEDGE_GRAB_COOLDOWN = 0.5; // after climb/drop, before you can re-grab
export const WALLRUN_DURATION = 0.95; // max seconds clinging to a wall
export const WALLRUN_GRAVITY_MULT = 0.16; // near-weightless while wall-running
export const WALLRUN_MIN_SPEED = 5; // need this much horizontal speed to start
export const WALLRUN_JUMP = 8.5; // push off the wall on a wall-jump
export const WALLRUN_COOLDOWN = 0.5;

// --- Surface zones (Phase A) -----------------------------------------------
export const HOT_ZONE_DPS = 14; // contact damage/sec on hot grates/coals/asphalt
export const MUD_SPEED_MULT = 0.5; // movement speed in sand/mud
export const MIST_TRACTION = 0.45; // grip on slick mist patches (skid)
export const PUDDLE_HYDRATE_RATE = 16; // hydration/sec from standing in a puddle
export const SKYBRIDGE_SHADE = 0.5; // tinted glass blocks half the sun

// --- Living world (Phase D) ------------------------------------------------
export const DEBRIS_KNOCK = 5; // shove the player gets from a rolling tumbleweed

// --- Gear & consumables (Phase E) ------------------------------------------
export const TOWEL_DAMAGE_MULT = 0.6; // sun damage while the wet towel is damp
export const TOWEL_DRY_RATE = 0.05; // wetness/sec lost (doubled while in the sun)
export const SLEEVES_DAMAGE_MULT = 0.4; // long sleeves: strong sun protection...
export const SLEEVES_HYDRATION_MULT = 2; // ...but you sweat (dehydrate) faster
export const SNEAKERS_SPEED_MULT = 1.12; // a touch faster on foot
export const SNEAKERS_MIN_TRACTION = 0.65; // and better grip on wet ground

// --- World palette (warm sun / cool shade) ---------------------------------
export const SUN_LIGHT_COLOR = 0xfff1d6; // warm sunlight
export const AMBIENT_SKY_COLOR = 0x9fc6ff; // cool sky fill
export const AMBIENT_GROUND_COLOR = 0x2a2f55; // cool ground bounce
export const SKY_DAWN = 0xffb27a; // horizon-ish dawn tone
export const SKY_NOON = 0xbfe3ff; // bright midday sky
