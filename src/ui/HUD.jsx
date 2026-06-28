import { useEffect, useState } from 'react';
import { MAX_HEALTH, MAX_HYDRATION, SUNSCREEN_DURATION, ICE_RESERVE } from '../utils/constants.js';

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
 * Heads-up display: level, vitality + stamina + hydration, exposure state, a
 * cool-streak multiplier, the run timer + day clock, active gear, a pickup
 * toast, a gust indicator, and the screen tints — warm sun glare, cool shade,
 * sunglasses dim, dehydration blur, and a heat-haze shimmer.
 */
export default function HUD({ stats, reduceFlashing }) {
  const {
    health, inSun, exposure, time, sunProgress, sunscreen = 0, levelName, pickup, pickupId,
    hasUmbrella, umbrellaOpen, sheltered, cooling, onZipline,
    hasHat, hatStability = 1, hasSunglasses, sunglassesOn, sprinting, stamina = 1,
    hydration = MAX_HYDRATION, dehydrated, heat = 0, windStrength = 0, coolMult = 1, coolStreak = 0,
    raining, flaring, dusting, eclipsing, flareWarn, weatherIntensity = 0, onHazard, exposure01 = 1,
    coolReserve = 0, hasTowel, towelWet = 0, hasSleeves, hasSneakers,
  } = stats;
  const pct = Math.max(0, (health / MAX_HEALTH) * 100);
  const hydraPct = Math.max(0, (hydration / MAX_HYDRATION) * 100);
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
  if (onHazard) { expClass = 'sun'; expText = '🔥 Scorching Ground!'; }
  else if (cooling) expText = '💧 Cooling Off';
  else if (onZipline) expText = '🛼 Ziplining';
  else if (sheltered) expText = '☂️ Sheltered';
  else if (inSun) {
    if (exposure01 < 0.8 && !protectedNow) {
      expText = '⛅ Partial Shade'; // clouds / awning / tinted glass — reduced burn
    } else {
      expClass = 'sun';
      expText = protectedNow ? '🧴 Sun — Shielded' : '☀️ In Sun — Burning';
    }
  }

  const burning = (inSun && !sheltered && !cooling) || onHazard;
  const sunTint = burning ? (protectedNow || sunglassesOn ? 0.12 : 0.35 + exposure * 0.5) : 0;
  let haze = heat * (sunglassesOn ? 0.35 : 1); // glasses cut the shimmer
  // Reduce-flashing caps the bright/animated overlays (CSS kills the motion).
  let flareOpacity = flaring ? weatherIntensity * 0.8 : 0;
  let dustOpacity = dusting ? weatherIntensity : 0;
  if (reduceFlashing) {
    haze = Math.min(haze, 0.2);
    flareOpacity = flaring ? 0.16 : 0;
    dustOpacity = Math.min(dustOpacity, 0.4);
  }

  return (
    <>
      <div className="tint sun" style={{ opacity: sunTint }} />
      <div className="tint shade" style={{ opacity: (cooling || raining || (!inSun && health < MAX_HEALTH)) ? 0.18 : 0 }} />
      <div className="tint haze" style={{ opacity: Math.min(0.9, haze) }} />
      <div className="tint blur" style={{ opacity: dehydrated ? 1 : 0 }} />
      <div className="tint glasses" style={{ opacity: sunglassesOn ? 1 : 0 }} />
      <div className="tint rain" style={{ opacity: raining ? weatherIntensity : 0 }} />
      <div className="tint dust" style={{ opacity: dustOpacity }} />
      <div className="tint flare" style={{ opacity: flareOpacity }} />
      <div className="tint eclipse" style={{ opacity: eclipsing ? weatherIntensity * 0.7 : 0 }} />

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

          <div className="buff">
            <span style={{ color: dehydrated ? '#ff8a5a' : undefined }}>{dehydrated ? '🥵 Thirsty' : '💧 Hydration'}</span>
            <div className="buff-track">
              <div className="buff-fill hydra" style={{ width: `${hydraPct}%` }} />
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
          {coolReserve > 0 && (
            <div className="buff">
              <span>🧊 Cool Reserve</span>
              <div className="buff-track">
                <div className="buff-fill ice" style={{ width: `${(coolReserve / ICE_RESERVE) * 100}%` }} />
              </div>
            </div>
          )}
          {hasUmbrella && <div className="buff"><span>☂️ Umbrella · {umbrellaOpen ? 'Open' : 'Closed'} (E)</span></div>}
          {hasSunglasses && <div className="buff"><span>🕶️ Shades · {sunglassesOn ? 'On' : 'Off'} (G)</span></div>}
          {hasTowel && (
            <div className="buff">
              <span>🧣 Towel</span>
              <div className="buff-track"><div className="buff-fill hydra" style={{ width: `${towelWet * 100}%` }} /></div>
            </div>
          )}
          {hasSleeves && <div className="buff"><span>🧥 Sleeves · {'On (R)'}</span></div>}
          {hasSneakers && <div className="buff"><span>👟 Sneakers</span></div>}
        </div>

        <div className={`exposure ${expClass}`}>{expText}</div>
        {coolMult > 1 && (
          <div className="cool-streak">❄ COOL ×{coolMult} <span>{Math.floor(coolStreak)}s</span></div>
        )}

        {flareWarn && <div className="weather-banner warn">⚠️ Solar Flare Incoming</div>}
        {flaring && <div className="weather-banner flare">🔆 Solar Flare — get to shade!</div>}
        {raining && !flaring && <div className="weather-banner rain">🌧️ Rain — cool, but slippery</div>}
        {dusting && <div className="weather-banner dust">🌫️ Dust Storm</div>}
        {eclipsing && <div className="weather-banner eclipse">🌑 Eclipse — total shade</div>}

        <div className="timer">
          <div className="timer-label">Time</div>
          <div className="timer-value">{formatTime(time)}</div>
          {windStrength > 0.4 && <div className="wind-gust">🌬️ Gust</div>}
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
