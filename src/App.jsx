import { useCallback, useState } from 'react';
import Game from './Game.jsx';
import HUD from './ui/HUD.jsx';
import MainMenu from './ui/MainMenu.jsx';
import GameOver from './ui/GameOver.jsx';
import LevelComplete from './ui/LevelComplete.jsx';
import WinScreen from './ui/WinScreen.jsx';
import { LEVELS, LEVEL_COUNT } from './level/index.js';
import { MAX_HEALTH } from './utils/constants.js';

const EMPTY_STATS = { health: MAX_HEALTH, inSun: false, exposure: 0, time: 0, sunProgress: 0, sunscreen: 0, levelName: '', pickup: '', pickupId: 0 };

/**
 * Top-level state machine:
 *   menu -> playing -> (gameover | levelclear | victory) -> ...
 *
 * Game is keyed on runId so every fresh run (new level OR retry) remounts a
 * clean Three.js world rather than resetting one in place. levelclear advances
 * to the next level; victory fires after the final level.
 */
export default function App() {
  const [phase, setPhase] = useState('menu'); // menu | playing | gameover | levelclear | victory
  const [level, setLevel] = useState(0);
  const [runId, setRunId] = useState(0);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [result, setResult] = useState({ time: 0, health: 0 });

  const onStats = useCallback((s) => setStats(s), []);

  const startLevel = useCallback((idx) => {
    setLevel(idx);
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
    setLevel((cur) => {
      setPhase(cur < LEVEL_COUNT - 1 ? 'levelclear' : 'victory');
      return cur;
    });
  }, []);

  return (
    <>
      {phase === 'playing' && (
        <>
          <Game key={runId} levelIndex={level} onStats={onStats} onDeath={onDeath} onWin={onWin} />
          <HUD stats={stats} />
        </>
      )}

      {phase === 'menu' && <MainMenu levels={LEVELS} onStart={startLevel} />}

      {phase === 'gameover' && (
        <GameOver result={result} levelName={LEVELS[level]?.name} onRestart={() => startLevel(level)} />
      )}

      {phase === 'levelclear' && (
        <LevelComplete
          result={result}
          levelName={LEVELS[level]?.name}
          nextName={LEVELS[level + 1]?.name}
          onNext={() => startLevel(level + 1)}
          onMenu={() => setPhase('menu')}
        />
      )}

      {phase === 'victory' && (
        <WinScreen result={result} onReplay={() => startLevel(0)} onMenu={() => setPhase('menu')} />
      )}
    </>
  );
}
