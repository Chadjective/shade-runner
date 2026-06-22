import { useCallback, useRef, useState } from 'react';
import Game from './Game.jsx';
import HUD from './ui/HUD.jsx';
import MainMenu from './ui/MainMenu.jsx';
import GameOver from './ui/GameOver.jsx';
import WinScreen from './ui/WinScreen.jsx';
import { MAX_HEALTH } from './utils/constants.js';

const EMPTY_STATS = { health: MAX_HEALTH, inSun: false, exposure: 0, time: 0, sunProgress: 0 };

/**
 * Top-level state machine: menu → playing → (win | gameover) → menu/playing.
 *
 * Game is keyed on runId so every fresh run remounts a clean Three.js world
 * instead of trying to reset one in place.
 */
export default function App() {
  const [phase, setPhase] = useState('menu'); // menu | playing | win | gameover
  const [runId, setRunId] = useState(0);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [result, setResult] = useState({ time: 0, health: 0 });

  // Avoid re-rendering all of App on every stats tick — stash via state only;
  // HUD is cheap and the throttling happens upstream in Game.
  const onStats = useCallback((s) => setStats(s), []);

  const startRun = useCallback(() => {
    setStats(EMPTY_STATS);
    setRunId((id) => id + 1);
    setPhase('playing');
  }, []);

  const onDeath = useCallback((r) => {
    setResult(r);
    setPhase('gameover');
  }, []);

  const onWin = useCallback((r) => {
    setResult(r);
    setPhase('win');
  }, []);

  return (
    <>
      {phase === 'playing' && (
        <>
          <Game key={runId} onStats={onStats} onDeath={onDeath} onWin={onWin} />
          <HUD stats={stats} />
        </>
      )}

      {phase === 'menu' && <MainMenu onStart={startRun} />}
      {phase === 'gameover' && <GameOver result={result} onRestart={startRun} />}
      {phase === 'win' && <WinScreen result={result} onRestart={startRun} />}
    </>
  );
}
