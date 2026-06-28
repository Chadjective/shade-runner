import { DIFFICULTIES } from '../utils/constants.js';

function bestTime(i) {
  try {
    const b = parseFloat(localStorage.getItem(`sr.best.${i}`));
    if (Number.isNaN(b)) return null;
    const m = Math.floor(b / 60);
    const s = Math.floor(b % 60);
    const cs = Math.floor((b * 100) % 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

/**
 * Start screen. "Start Run" begins at level 1; the level cards let you jump
 * straight to any level (and show your best time). Settings (difficulty,
 * sensitivity, minimap, sound, reduce-flashing) are persisted in App.
 */
export default function MainMenu({
  levels, onStart, reduceFlashing, onToggleReduceFlashing, difficulty, onSetDifficulty,
  muted, onToggleMuted, sensitivity = 1, onSetSensitivity, minimap = true, onToggleMinimap,
}) {
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
        {levels.map((lv, i) => {
          const best = bestTime(i);
          return (
            <button key={lv.id} className="level-card" onClick={() => onStart(i)}>
              <span className="level-card-num">{i + 1}</span>
              <span className="level-card-body">
                <span className="level-card-name">{lv.name}</span>
                <span className="level-card-sub">{lv.subtitle}</span>
              </span>
              {best && <span className="level-card-best">🏁 {best}</span>}
            </button>
          );
        })}
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
        <div className="key"><span className="keycap">R</span>Sleeves</div>
        <div className="key"><span className="keycap">Esc</span>Pause</div>
      </div>
      <div className="hint">Tip: sprint to outrun the heat (but your hat may blow off), walk to keep it on, and pop the umbrella to glide down from the high road.</div>

      <div className="sens-row">
        <label htmlFor="sens">Mouse sensitivity</label>
        <input
          id="sens"
          type="range"
          min="0.3"
          max="2.5"
          step="0.1"
          value={sensitivity}
          onChange={(e) => onSetSensitivity(parseFloat(e.target.value))}
        />
        <span className="sens-val">{sensitivity.toFixed(1)}×</span>
      </div>

      <div className="toggle-row">
        <button className={`menu-toggle ${reduceFlashing ? 'on' : ''}`} onClick={onToggleReduceFlashing} aria-pressed={reduceFlashing}>
          {reduceFlashing ? '☑' : '☐'} Reduce flashing &amp; motion
        </button>
        <button className={`menu-toggle ${!muted ? 'on' : ''}`} onClick={onToggleMuted} aria-pressed={!muted}>
          {muted ? '🔇 Sound off' : '🔊 Sound on'}
        </button>
        <button className={`menu-toggle ${minimap ? 'on' : ''}`} onClick={onToggleMinimap} aria-pressed={minimap}>
          {minimap ? '🗺️ Map on' : '🗺️ Map off'}
        </button>
      </div>
    </div>
  );
}
