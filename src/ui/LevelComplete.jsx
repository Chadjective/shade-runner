function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec * 100) % 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/** Shown after clearing a level when there's another one to go. */
export default function LevelComplete({ result, levelName, nextName, onNext, onMenu }) {
  return (
    <div className="overlay win">
      <div className="tagline">{levelName} — Cleared</div>
      <h1 className="headline won">LEVEL COMPLETE</h1>
      <div className="stat-row">
        <div className="stat">
          <div className="stat-num">{formatTime(result.time)}</div>
          <div className="stat-cap">Time</div>
        </div>
        <div className="stat">
          <div className="stat-num">{Math.ceil(result.health)}%</div>
          <div className="stat-cap">Vitality Left</div>
        </div>
        <div className="stat">
          <div className="stat-num">{formatTime(result.best ?? result.time)}</div>
          <div className="stat-cap">{result.newBest ? '🏁 New Best!' : 'Best'}</div>
        </div>
      </div>
      <p className="sub">Next up: <strong>{nextName}</strong></p>
      <button className="btn cool" onClick={onNext}>▶ Next Level</button>
      <button className="btn-ghost" onClick={onMenu}>Main Menu</button>
    </div>
  );
}
