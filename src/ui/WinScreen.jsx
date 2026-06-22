function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec * 100) % 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function rank(health) {
  if (health >= 80) return 'SUN-PROOF';
  if (health >= 50) return 'WELL SHADED';
  if (health >= 20) return 'SINGED';
  return 'BARELY MADE IT';
}

/** Final victory — shown after the last level. */
export default function WinScreen({ result, onReplay, onMenu }) {
  return (
    <div className="overlay win">
      <div className="tagline">Stay cool. Stay alive.</div>
      <h1 className="headline won">YOU BEAT SHADE RUNNER</h1>
      <p className="sub">Every shadow counted. The sun never laid a finger on the finish line.</p>
      <div className="stat-row">
        <div className="stat">
          <div className="stat-num">{formatTime(result.time)}</div>
          <div className="stat-cap">Final Time</div>
        </div>
        <div className="stat">
          <div className="stat-num">{Math.ceil(result.health)}%</div>
          <div className="stat-cap">Vitality Left</div>
        </div>
        <div className="stat">
          <div className="stat-num">{rank(result.health)}</div>
          <div className="stat-cap">Rank</div>
        </div>
      </div>
      <button className="btn cool" onClick={onReplay}>↻ Run It Again</button>
      <button className="btn-ghost" onClick={onMenu}>Main Menu</button>
    </div>
  );
}
