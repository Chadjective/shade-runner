import buildLevel1 from './Level1.js';
import buildLevel2 from './Level2.js';
import buildLevel3 from './Level3.js';
import buildLevel4 from './Level4.js';

/**
 * Ordered list of levels. Each entry exposes a `build()` that returns the
 * level definition (geometry, colliders, occluders, items, start/finish, and
 * an optional per-level `sun` override). `name`/`subtitle` are duplicated here
 * so the menu can show them without building the whole level.
 */
export const LEVELS = [
  { id: 0, name: 'The Canyon', subtitle: 'A straight shot through the shade. Learn the heat.', build: buildLevel1 },
  { id: 1, name: 'The Interchange', subtitle: 'High road or low road — sun and speed, or shade and patience.', build: buildLevel2 },
  { id: 2, name: 'The Long Mile', subtitle: 'Everything at once, twice as far. Survive the whole crosstown run.', build: buildLevel3 },
  { id: 3, name: 'Last Light', subtitle: 'Dusk run — the sun sets as you go, in long raking shadows.', build: buildLevel4 },
];

export const LEVEL_COUNT = LEVELS.length;
