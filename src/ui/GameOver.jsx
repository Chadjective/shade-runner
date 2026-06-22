function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Shown when vitality hits zero. */
export default function GameOver({ result, onRestart }) {
  return (
    <div className="overlay gameover">
      <h1 className="headline dead">BURNT OUT</h1>
      <p className="sub">The sun caught you in the open. The pavement did the rest.</p>
      <div className="stat-row">
        <div className="stat">
          <div className="stat-num">{formatTime(result.time)}</div>
          <div className="stat-cap">Survived</div>
        </div>
      </div>
      <button className="btn" onClick={onRestart}>↻ Try Again</button>
      <div className="hint">Stay under cover longer — recovery beats a reckless sprint.</div>
    </div>
  );
}
