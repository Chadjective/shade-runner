import { DIFFICULTIES } from '../utils/constants.js';

/**
 * Start screen. "Start Run" begins at level 1; the level cards let you jump
 * straight to any level. The actual pointer-lock grab happens on the first
 * click inside the game.
 */
export default function MainMenu({ levels, onStart, reduceFlashing, onToggleReduceFlashing, difficulty, onSetDifficulty }) {
  return (
    <div className="overlay menu">
      <div className="tagline">Stay cool. Stay alive.</div>
      <h1 className="title">SHADE<br />RUNNER</h1>
      <p className="sub">
        The sun is hunting you. Direct light burns your vitality away — only the
        shade keeps you alive, and it shrinks as the sun climbs. Grab water and
        sunscreen, pick your route, and reach the covered pavilion before you cook.
      </p>

      <div className="difficulty">
        <span className="difficulty-label">Difficulty</span>
        {Object.entries(DIFFICULTIES).map(([key, d]) => (
          <button
            key={key}
            className={`diff-btn ${difficulty === key ? 'on' : ''}`}
            onClick={() => onSetDifficulty(key)}
            aria-pressed={difficulty === key}
          >
            {d.label}
          </button>
        ))}
      </div>

      <button className="btn" onClick={() => onStart(0)}>▶ Start Run</button>

      <div className="level-cards">
        {levels.map((lv, i) => (
          <button key={lv.id} className="level-card" onClick={() => onStart(i)}>
            <span className="level-card-num">{i + 1}</span>
            <span className="level-card-body">
              <span className="level-card-name">{lv.name}</span>
              <span className="level-card-sub">{lv.subtitle}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="controls">
        <div className="key"><span className="keycap">W A S D</span>Move</div>
        <div className="key"><span className="keycap">Mouse</span>Look</div>
        <div className="key"><span className="keycap">Space</span>Jump</div>
        <div className="key"><span className="keycap">Shift</span>Sprint</div>
        <div className="key"><span className="keycap">C</span>Crouch / Slide / Roll</div>
        <div className="key"><span className="keycap">F</span>Dive</div>
        <div className="key"><span className="keycap">E</span>Umbrella</div>
        <div className="key"><span className="keycap">G</span>Shades</div>
        <div className="key"><span className="keycap">Esc</span>Pause</div>
      </div>
      <div className="hint">Tip: sprint to outrun the heat (but your hat may blow off), walk to keep it on, and pop the umbrella to glide down from the high road.</div>

      <button
        className={`menu-toggle ${reduceFlashing ? 'on' : ''}`}
        onClick={onToggleReduceFlashing}
        aria-pressed={reduceFlashing}
      >
        {reduceFlashing ? '☑' : '☐'} Reduce flashing &amp; motion
      </button>
    </div>
  );
}
