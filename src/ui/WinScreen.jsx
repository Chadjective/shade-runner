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

/** Shown when the player reaches the covered pavilion alive. */
export default function WinScreen({ result, onRestart }) {
  return (
    <div className="overlay win">
      <h1 className="headline won">YOU MADE IT</h1>
      <p className="sub">Cool shade, solid roof, still breathing. The sun loses this round.</p>
      <div className="stat-row">
        <div className="stat">
          <div className="stat-num">{formatTime(result.time)}</div>
          <div className="stat-cap">Finish Time</div>
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
      <button className="btn cool" onClick={onRestart}>↻ Run Again</button>
      <div className="hint">Chase a faster time — or a cleaner, higher-vitality run.</div>
    </div>
  );
}
