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
 * Heads-up display: level, vitality + stamina, exposure state, run timer, day
 * clock, active gear (sunscreen / umbrella / hat / sunglasses), a pickup toast,
 * and the screen tints — warm sun glare, cool shade, and a dim when shades are
 * on (they cut the sun but it's harder to see).
 */
export default function HUD({ stats }) {
  const {
    health, inSun, exposure, time, sunProgress, sunscreen = 0, levelName, pickup, pickupId,
    hasUmbrella, umbrellaOpen, sheltered, cooling, onZipline,
    hasHat, hatStability = 1, hasSunglasses, sunglassesOn, sprinting, stamina = 1,
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
  // Glasses cut the glare, so soften the warm tint while they're on.
  const sunTint = burning ? (protectedNow || sunglassesOn ? 0.12 : 0.35 + exposure * 0.5) : 0;

  return (
    <>
      <div className="tint sun" style={{ opacity: sunTint }} />
      <div className="tint shade" style={{ opacity: (cooling || (!inSun && health < MAX_HEALTH)) ? 0.18 : 0 }} />
      <div className="tint glasses" style={{ opacity: sunglassesOn ? 1 : 0 }} />

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

          <div className="buff">
            <span>{sprinting ? '⚡ Sprint' : 'Stamina'}</span>
            <div className="buff-track">
              <div className="buff-fill stam" style={{ width: `${stamina * 100}%`, opacity: stamina < 0.15 ? 0.5 : 1 }} />
            </div>
          </div>

          {protectedNow && (
            <div className="buff">
              <span>🧴 Sunscreen</span>
              <div className="buff-track">
                <div className="buff-fill" style={{ width: `${(sunscreen / SUNSCREEN_DURATION) * 100}%` }} />
              </div>
            </div>
          )}
          {hasHat && (
            <div className="buff">
              <span>👒 Hat</span>
              <div className="buff-track">
                <div className="buff-fill hat" style={{ width: `${hatStability * 100}%` }} />
              </div>
            </div>
          )}
          {hasUmbrella && <div className="buff"><span>☂️ Umbrella · {umbrellaOpen ? 'Open' : 'Closed'} (E)</span></div>}
          {hasSunglasses && <div className="buff"><span>🕶️ Shades · {sunglassesOn ? 'On' : 'Off'} (G)</span></div>}
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
