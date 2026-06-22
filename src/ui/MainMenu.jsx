/**
 * Start screen. The Start button is the user gesture that boots the run; the
 * actual pointer-lock grab happens on the first click inside the game.
 */
export default function MainMenu({ onStart }) {
  return (
    <div className="overlay menu">
      <div className="tagline">Stay cool. Stay alive.</div>
      <h1 className="title">SHADE<br />RUNNER</h1>
      <p className="sub">
        The sun is hunting you. Direct light burns your vitality away — only the
        shade keeps you alive. But the sun climbs as you run, and the shadows
        that shelter you now will shrink to nothing. Reach the covered pavilion
        before you cook.
      </p>

      <button className="btn" onClick={onStart}>▶ Start Run</button>

      <div className="controls">
        <div className="key"><span className="keycap">W A S D</span>Move</div>
        <div className="key"><span className="keycap">Mouse</span>Look</div>
        <div className="key"><span className="keycap">Space</span>Jump</div>
        <div className="key"><span className="keycap">Esc</span>Pause</div>
      </div>
      <div className="hint">Tip: hug the shadows, sprint the sunlit gaps, and climb for cover.</div>
    </div>
  );
}
