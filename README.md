# Shade Runner

**Stay cool. Stay alive.** A third-person 3D runner where the sun is your enemy.

Direct sunlight drains your vitality; shade keeps you alive. The sun climbs across
the sky as you run, so the long, forgiving shadows of dawn shrink to nothing by
midday — a safe path one moment becomes a death zone the next. Sprint the sunlit
gaps, hug the shade, climb for cover, and reach the covered pavilion before you cook.

Inspiration: *Mirror's Edge* meets climate anxiety.

## Controls

| Input | Action |
|-------|--------|
| **W A S D** | Move (relative to the camera) |
| **Mouse** | Look / rotate camera |
| **Space** | Jump |
| **Esc** | Pause |

Click the canvas to capture the mouse. If your browser declines pointer lock the
game still plays — the mouse just isn't recentered.

## Run it locally

```bash
npm install
npm run dev      # dev server (Vite)
npm run build    # production build -> dist/
npm run preview  # serve the production build locally
```

Requires Node 18+.

## Deploy (GitHub Pages)

This folder is set up to deploy itself. Push it to a GitHub repo as the repo root,
then in **Settings → Pages → Build and deployment**, set **Source = "GitHub Actions"**.
The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds
and publishes `dist/` on every push to `main`.

`vite.config.js` uses `base: './'` (relative asset paths), so it works at any
sub-path such as `https://<user>.github.io/<repo>/` without further config.

## Tech

- **Three.js** — rendering, real-time shadow maps (the moving sun is a
  `DirectionalLight`), shade raycasting.
- **React** — menu / HUD / end screens. The 3D world is imperative Three.js inside
  a single `useEffect` (`src/Game.jsx`); React only owns the UI around it.
- **Vite** — dev server and static build.

## Project layout

```
src/
  Game.jsx              game loop + Three.js scene
  systems/
    SunSystem.js        moving sun, shadow config, toSun vector
    HealthSystem.js     sun drain / shade recovery
    ShadeDetector.js    raycast toward the sun -> in sun or shade?
    PlayerController.js  movement, jump, collision, third-person camera
  level/Level1.js       all level geometry, colliders, occluders
  ui/                   HUD, MainMenu, GameOver, WinScreen
  utils/constants.js    all tuning values (speed, damage, sun cycle, ...)
```

### Tuning

Everything that controls *feel* lives in [`src/utils/constants.js`](src/utils/constants.js)
— run speed, jump force, sun damage / shade recovery rates, and the sun cycle
(`SUN_CYCLE_DURATION`, start/end elevation). The sun cycle is the main difficulty
dial: lower = the sun climbs faster = harder.

### QA harness

Append `?debug` to the URL to expose a `window.__shade` test handle (step the
simulation, teleport, read state) used to drive automated playtests. It does
nothing without the flag.
