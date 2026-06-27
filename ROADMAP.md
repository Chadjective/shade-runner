# Shade Runner — Build Roadmap

A plan for the remaining brainstormed elements plus new additions worth building.
Organized into phases by theme and dependency, each item tagged with effort and
the systems it touches. Philosophy throughout: **every element should hook into
2+ existing systems, carry a real trade-off, and read at a glance.**

Effort key: **S** = a zone/tweak (hours) · **M** = a system + integration · **L** = a
substantial subsystem or collision-heavy work.

---

## ✅ Already shipped

- **Core:** dynamic sun + real-time shadows, shade raycast, health (drain/recover), 3rd-person camera, collision, jumping.
- **Movement:** animated runner, sprint (stamina) / walk, slide, zipline, umbrella glide.
- **Gear/items:** water, sunscreen, umbrella (mobile shade), hat (shakes off sprinting), sunglasses (cut sun / dim view).
- **Survival depth:** sweat trail, hydration, heatstroke (haze + drift), cool-streak scoring.
- **World:** rolling traffic shadows, cooling fountains, multi-path levels, updraft vents.
- **Weather:** rain showers, solar flares, dust storms (timed `WeatherSystem`).
- **Shell:** 3 levels, level select, progression, win/lose/level-complete screens, `?debug` QA harness.

---

> **Shipped since this roadmap:** the `ZoneSystem` + partial-shade infra, all of
> **Phase A** (hot asphalt, grates, mist, mud, puddles, tinted skybridges),
> all of **Phase B** (drifting clouds, chasing blimp megashadow, retracting
> awnings — via `DynamicShadeSystem`), the **accessibility reduce-flashing
> toggle** (+ `prefers-reduced-motion`), and a live **GitHub Pages deploy**
> (auto-deploys on push). Remaining: AudioSystem, Phases C–G.

## 🔧 Cross-cutting infrastructure (build these first — they unblock many items)

These refactors make the rest of the phases small instead of medium.
**Status: `ZoneSystem` ✅ and partial-shade ✅ shipped. `AudioSystem` + `MovingShadow` still to do.**

- **`ZoneSystem`** (M) — ✅ **DONE** — unify all "stand-in-an-area → effect" logic. A level lists
  `zones: [{ shape, type, ...params }]` where type ∈ `cool | hazard | speed | skid | partial-shade | wet`. Replaces the ad-hoc cooling-zone check and powers hot asphalt, mud, mist, puddles, skybridges in one place. Each zone optionally builds a prop.
- **Partial shade in `ShadeDetector`** (S–M) — ✅ **DONE** — return a 0..1 occlusion factor (e.g. tinted glass = 0.5) instead of a hard boolean, so Game can scale damage. Enables skybridges and cloud cover cleanly.
- **`AudioSystem`** (M) — WebAudio bus with: sun sizzle (louder with exposure), cool ambient in shade, wind, footsteps, pickup blips, flare warning sting. The original scope deferred audio; it's the single biggest "feel" upgrade left.
- **`MovingShadow` helper** (S) — generalize `TrafficSystem`'s "occluder + per-frame matrix + Box3" so blimps, clouds, NPCs, and debris reuse it.

---

## Phase A — Surfaces & hazards ✅ SHIPPED

All six built via `ZoneSystem` + partial shade and placed across L1–L3 (verified with the `?debug` harness). Detail kept below for reference.

- **🔥 Hot asphalt / reflective glass** (M) — zones that deal contact damage which **scales with sun height**, and whose hot-spots **move** as the sun climbs (reflections sweep). Synergy: sun arc, health, sunglasses (glare).
- **🪟 Tinted skybridges** (S, needs partial-shade) — overhead glass = **half-damage** middle ground between sun and shade. Synergy: shade raycast, verticality.
- **🔥 Hot grates & coals** (S) — tiles that burn on contact regardless of sun; **jump or slide across**. Synergy: jump, slide.
- **🧊 Slick mist patches** (S) — cool you **but** drop traction (skid). Synergy: cooling + the `traction` field rain already uses.
- **🏜️ Deep sand / mud** (S) — speed-sap zones; **sprint to power through** (burns stamina). Synergy: sprint/stamina.
- **💦 Puddles + wet footprints** (S–M) — splash to shed heat + rehydrate a little, and leave a fading **wet trail** (the cool inverse of the sweat trail — a `SweatSystem` variant). Synergy: hydration, sweat, cooling.

## Phase B — Dynamic cover & sun rhythm (M each)

- **☁️ Drifting clouds** (M, needs partial-shade) — periodic **global shade windows** (a `WeatherSystem` `cloud` event lowering sun damage) + a big soft shadow crossing the ground. Rhythm: wait for the cloud or risk the dash.
- **🎈 Chasing megashadow** (M, needs `MovingShadow`) — a blimp / giant cloud casts a slow map-wide shadow you **ride** like a truck's, scaled up.
- **🏪 Retracting awnings** (M) — mechanical cover that **opens/closes on a timer**; animated occluder. Timing puzzles.
- **🎚️ Deployable cover** (M) — run-through triggers / levers that **drop an awning or pop a parasol**. Light interaction layer.

## Phase C — Traversal verbs (movement depth)

- **🤸 Landing roll** (S–M) — ✅ **SHIPPED**. Hard landing + crouch (C) = roll (keep momentum); mistime it = stumble (brief slow).
- **🎯 Dive** (S) — ✅ **SHIPPED**. F = a committed forward lunge into cover.
- **🧗 Ledge-hang / climb** (L) — *remaining*. Grab a shaded ledge to wait out a sun sweep, then climb up. Collision-heavy.
- **🏃 Wall-run / vault** (L) — *remaining*. Skip sunny stretches along a wall / vault low cover. Most complex; do last.

## Phase D — Living world (M–L)

- **☂️ Crowds with parasols** (M–L, needs `MovingShadow` + NPC paths) — pedestrians you weave through; **tuck behind a parasol** for portable moving shade. Soft obstacles + shade.
- **🍂 Wind-blown debris / tumbleweed** (M) — gusts roll obstacles across your path; dodge/jump/slide. Makes wind physical. Synergy: wind, collision.
- **🚩 Wind tells** (S) — flags, windsocks, swaying trees that **telegraph gust direction/strength** so wind is readable. Pure juice/readability.
- **🐦 Ambient life** (S) — pigeons that flush when you sprint, distant traffic. Atmosphere.

## Phase E — Gear & consumables (round out the loadout — mostly S)

- **🧊 Ice drink / cold reserve** (S) — overcharge a **cool buffer above 100%** that melts over time. Synergy: health, heat.
- **🧣 Wet towel** (S) — cooling buff that **dries out**, re-wet at fountains. Synergy: cooling, hydration.
- **🧥 Long-sleeves / reflective poncho** (S–M) — strong protection **but you overheat faster** (must shed in shade/tunnels). The classic trade-off gear. Synergy: hydration, heat.
- **👟 Footwear** (S) — sneakers (faster, keep the hat) vs sandals (slip) — speed/grip trade-offs. Synergy: traction, hat, sprint.

## Phase F — Time of day & new levels

- **🌆 Dusk level** (M) — sun **sets fast** (reverse arc): long forgiving shadows, but a **shrinking** safe window. New level + `sun` config.
- **🌑 Eclipse event** (S) — rare **full-shade window** mid-level; dramatic beat. A `WeatherSystem` event.
- **🏜️ Biome levels** (L each) — desert (minimal shade), beach boardwalk (palm/umbrella shade), alpine snow (UV glare — shade works differently). From the original V3 roadmap.
- **♾️ Endless / daily-seed mode** (M–L) — procedural street segments for replayability.

## Phase G — Meta, feel & polish

- **🔊 Audio** (M, needs `AudioSystem`) — the biggest feel jump; see infra.
- **🗺️ Shade minimap / radar** (M) — top-down mini-view of nearby shade + your route. Scope stretch goal.
- **👻 Ghost replay + leaderboard** (M–L) — record/playback your best run; local board; daily seed. Uses the existing timer + cool-streak score.
- **🎬 Visual polish** (M–L) — post-processing (bloom, a real heat-haze shader instead of the CSS fake), nicer character/buildings, color-grade pass.
- **♿ Accessibility** (S–M, **do before any public release**) — a "reduce motion / flashing" toggle that tames the flare flash, heat-haze shimmer, and dust (photosensitivity safety), colorblind-safe sun/shade palette, remappable keys, sensitivity slider.
- **⚙️ Settings + difficulty** (S–M) — audio/sensitivity/difficulty (sun speed, damage) sliders; a pause menu.
- **🧭 Tutorial / onboarding** (M) — Level 1's early alley teaches one mechanic at a time with prompts.
- **🧱 Checkpoints** (S) — mid-level respawn for the long courses so a Level-3 death isn't a full restart.
- **📱 Mobile / touch controls** (L) — virtual stick + buttons; perf pass. Big audience, big effort.
- **🚀 Performance pass** (M) — shadow-map tuning, instancing for repeated geometry, frame budget for mobile.

---

## 🔢 Recommended build sequence

Ordered for **maximum payoff per effort**, front-loading the shared infra:

1. **Infra:** `ZoneSystem` + partial-shade in `ShadeDetector`. *(Unblocks Phases A & B cheaply.)*
2. **Phase A** — surface hazards (hot asphalt, grates, mist, mud, puddles, skybridges). A whole texture layer, now mostly S each.
3. **Phase B** — drifting clouds + megashadow (sun-rhythm; clouds need partial-shade from step 1).
4. **`AudioSystem` + Phase G accessibility toggle.** *(Audio is the biggest feel upgrade; the a11y toggle should land alongside the screen-effects we already have.)*
5. **Phase C** — landing roll + dive (skip ledge-hang/wall-run until later).
6. **Phase E** — ice drink, wet towel, long-sleeves, footwear (cheap loadout depth).
7. **Phase F** — dusk level + eclipse event (fresh content reusing existing systems).
8. **Phase D** — crowds + debris + wind tells (living world).
9. **Phase G remainder** — minimap, ghost/leaderboard, settings, checkpoints, tutorial, polish.
10. **Stretch** — biomes, endless mode, mobile, post-processing, level editor.

## Notes for building

- **Tuning** lives in `src/utils/constants.js`; **per-level config** (sun, wind, weather, zones, traffic, ziplines, updrafts, items) in each `level/LevelN.js`.
- **Verify with the `?debug` harness** (`window.__shade`): drive the sim headlessly, teleport, read state. Add a debug field per new mechanic (as done for wind/hydration/weather).
- **Visuals** are judged in-browser (the preview screenshot tool is unreliable in this env); wire effects to real state and tune `styles.css` / materials by eye.
- Each phase is independently shippable; nothing below blocks playing what's built today.
