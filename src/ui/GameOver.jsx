function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Shown when vitality hits zero. Retries the same level. */
export default function GameOver({ result, levelName, onRestart }) {
  return (
    <div className="overlay gameover">
      {levelName && <div className="tagline">{levelName}</div>}
      <h1 className="headline dead">BURNT OUT</h1>
      <p className="sub">The sun caught you in the open. The pavement did the rest.</p>
      <div className="stat-row">
        <div className="stat">
          <div className="stat-num">{formatTime(result.time)}</div>
          <div className="stat-cap">Survived</div>
        </div>
        <div className="stat">
          <div className="stat-num">{result.streak ?? 0}s</div>
          <div className="stat-cap">Best Cool Streak</div>
        </div>
      </div>
      <button className="btn" onClick={onRestart}>↻ Try Again</button>
      <div className="hint">Grab the sunscreen, duck under cover, and don't sprint blind.</div>
    </div>
  );
}
