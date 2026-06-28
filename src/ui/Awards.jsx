const MEDAL = { gold: '🥇 Gold', silver: '🥈 Silver', bronze: '🥉 Bronze' };
const RIBBON = { noBurn: '🌑 No Burn', pale: '🧴 Pale Finish', noDeaths: '💀 Deathless' };

/** Medal badge + earned challenge-ribbon chips, shown on end screens. */
export default function Awards({ medal, ribbons }) {
  const ribs = ribbons ? Object.keys(ribbons).filter((k) => ribbons[k] && RIBBON[k]) : [];
  if (!medal && !ribs.length) return null;
  return (
    <div className="awards">
      {medal && <div className={`medal ${medal}`}>{MEDAL[medal]}</div>}
      {ribs.length > 0 && (
        <div className="ribbons">
          {ribs.map((r) => <span key={r} className="ribbon">{RIBBON[r]}</span>)}
        </div>
      )}
    </div>
  );
}
