/**
 * Unlockable cosmetics. `unlock` (if set) is checked against saved progress —
 * earn a gold medal, a no-burn ribbon, or rack up total distance.
 */
export const BODY_COLORS = [
  { id: 'azure', hex: 0x3d8bff, name: 'Azure' },
  { id: 'crimson', hex: 0xe0584a, name: 'Crimson' },
  { id: 'emerald', hex: 0x3fae6a, name: 'Emerald' },
  { id: 'violet', hex: 0x8a6aff, name: 'Violet' },
  { id: 'gold', hex: 0xe8c24a, name: 'Gold', unlock: 'gold' },
  { id: 'noir', hex: 0x2a2f3a, name: 'Noir', unlock: 'dist2000' },
];

export const TRAIL_COLORS = [
  { id: 'cyan', hex: 0xbfe6ff, name: 'Cyan' },
  { id: 'amber', hex: 0xffc24a, name: 'Amber' },
  { id: 'pink', hex: 0xff8ad0, name: 'Pink' },
  { id: 'lime', hex: 0xaaff6a, name: 'Lime', unlock: 'noburn' },
];

export function isUnlocked(item) {
  if (!item.unlock) return true;
  try {
    if (item.unlock === 'gold') {
      for (let i = 0; i < 8; i++) if (localStorage.getItem(`sr.medal.${i}`) === 'gold') return true;
      return false;
    }
    if (item.unlock === 'noburn') {
      for (let i = 0; i < 8; i++) if (localStorage.getItem(`sr.ribbon.${i}.noBurn`) === '1') return true;
      return false;
    }
    if (item.unlock === 'dist2000') {
      return (parseFloat(localStorage.getItem('sr.stat.dist')) || 0) >= 2000;
    }
  } catch { return false; }
  return false;
}

export const UNLOCK_HINT = {
  gold: 'Earn any 🥇 gold medal',
  noburn: 'Earn a 🌑 No-Burn ribbon',
  dist2000: 'Run 2000m total',
};

export function hexOf(list, id) {
  const item = list.find((x) => x.id === id);
  return item ? item.hex : list[0].hex;
}
