import buildLevel1 from './Level1.js';
import buildLevel2 from './Level2.js';
import buildLevel3 from './Level3.js';
import buildLevel4 from './Level4.js';
import buildLevel5 from './Level5.js';
import buildLevel6 from './Level6.js';

/**
 * Ordered list of levels. Each entry exposes a `build()` that returns the
 * level definition (geometry, colliders, occluders, items, start/finish, and
 * an optional per-level `sun` override). `name`/`subtitle` are duplicated here
 * so the menu can show them without building the whole level.
 */
export const LEVELS = [
  { id: 0, name: 'The Canyon', subtitle: 'A straight shot through the shade. Learn the heat.', build: buildLevel1, medals: [40, 60, 90] },
  { id: 1, name: 'The Interchange', subtitle: 'High road or low road — sun and speed, or shade and patience.', build: buildLevel2, medals: [24, 36, 55] },
  { id: 2, name: 'The Long Mile', subtitle: 'Everything at once, twice as far. Survive the whole crosstown run.', build: buildLevel3, medals: [60, 85, 120] },
  { id: 3, name: 'Last Light', subtitle: 'Dusk run — the sun sets as you go, in long raking shadows.', build: buildLevel4, medals: [45, 65, 95] },
  { id: 4, name: 'The Furnace', subtitle: 'Desert. Shade is rare, sand is slow, the sun merciless.', build: buildLevel5, medals: [42, 60, 90] },
  { id: 5, name: 'The Long Run', subtitle: 'Endless — procedurally generated. How far can you get?', endless: true, build: buildLevel6, medals: [600, 350, 150], medalByDistance: true },
];

/** Medal earned for a result. time-based levels: lower is better; endless: higher distance. */
export function medalFor(levelIndex, { time, distance }) {
  const lv = LEVELS[levelIndex];
  if (!lv || !lv.medals) return null;
  const [g, s, b] = lv.medals;
  if (lv.medalByDistance) {
    if (distance >= g) return 'gold';
    if (distance >= s) return 'silver';
    if (distance >= b) return 'bronze';
    return null;
  }
  if (time <= g) return 'gold';
  if (time <= s) return 'silver';
  if (time <= b) return 'bronze';
  return null;
}

export const MEDAL_RANK = { gold: 3, silver: 2, bronze: 1 };

export const LEVEL_COUNT = LEVELS.length;
