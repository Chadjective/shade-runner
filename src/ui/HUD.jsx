import { useEffect, useState } from 'react';
import { MAX_HEALTH, SUNSCREEN_DURATION } from '../utils/constants.js';

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec * 100) % 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function healthColor(pct) {
  if (pct > 60) return '#4be07a';
  if (pct > 30) return '#ffc24b';
  return '#ff5a3c';
}

/**
 * The heads-up display: level name, health bar, exposure state (sun / shade /
 * sheltered / cooling / ziplining), run timer, day clock, active-sunscreen and
 * umbrella indicators, a pickup toast, and the edge tint that warms in the sun.
 */
export default function HUD({ stats }) {
  const {
    health, inSun, exposure, time, sunProgress, sunscreen = 0, levelName, pickup, pickupId,
    hasUmbrella, umbrellaOpen, sheltered, cooling, onZipline,
  } = stats;
  const pct = Math.max(0, (health / MAX_HEALTH) * 100);
  const protectedNow = sunscreen > 0;

  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!pickupId) return;
    setToast(pickup);
    const t = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(t);
  }, [pickupId, pickup]);

  let expClass = 'shade';
  let expText = '🌿 In Shade — Cooling';
  if (cooling) expText = '💧 Cooling Off';
  else if (onZipline) expText = '🛼 Ziplining';
  else if (sheltered) expText = '☂️ Sheltered';
  else if (inSun) {
    expClass = 'sun';
    expText = protectedNow ? '🧴 Sun — Shielded' : '☀️ In Sun — Burning';
  }

  const burning = inSun && !sheltered && !cooling;

  return (
    <>
      <div className="tint sun" style={{ opacity: burning ? (protectedNow ? 0.12 : 0.35 + exposure * 0.5) : 0 }} />
      <div className="tint shade" style={{ opacity: (cooling || (!inSun && health < MAX_HEALTH)) ? 0.18 : 0 }} />

      <div className="hud">
        <div className="health-wrap">
          {levelName && <div className="level-name">{levelName}</div>}
          <div className="health-label">
            <span>{inSun && !sheltered ? '☀️' : '🌑'}</span>
            <span>Vitality</span>
          </div>
          <div className="health-track">
            <div className="health-fill" style={{ width: `${pct}%`, backgroundColor: healthColor(pct) }} />
            <div className="health-num">{Math.ceil(health)}%</div>
          </div>
          {protectedNow && (
            <div className="buff">
              <span>🧴 Sunscreen</span>
              <div className="buff-track">
                <div className="buff-fill" style={{ width: `${(sunscreen / SUNSCREEN_DURATION) * 100}%` }} />
              </div>
            </div>
          )}
          {hasUmbrella && (
            <div className="buff">
              <span>☂️ Umbrella · {umbrellaOpen ? 'Open' : 'Closed'} (E)</span>
            </div>
          )}
        </div>

        <div className={`exposure ${expClass}`}>{expText}</div>

        <div className="timer">
          <div className="timer-label">Time</div>
          <div className="timer-value">{formatTime(time)}</div>
        </div>

        <div className="sun-clock">
          <span>Dawn</span>
          <div className="sun-clock-track">
            <div className="sun-clock-fill" style={{ width: `${sunProgress * 100}%` }} />
          </div>
          <span>High Noon</span>
        </div>

        {toast && <div className="pickup-toast">{toast}</div>}
      </div>
    </>
  );
}
