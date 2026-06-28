import { useRef } from 'react';

/**
 * On-screen controls for touch devices: an analog joystick (move), a full-screen
 * drag area (look), action buttons, and a pause button. Calls into the imperative
 * player via `ctrl` (a ref of control fns set by Game). Multi-touch works because
 * the joystick / buttons are separate layered elements above the look surface, so
 * each finger hits the topmost element it's over.
 */
export default function TouchControls({ ctrl }) {
  const joyRef = useRef(null);
  const knobRef = useRef(null);
  const joy = useRef({ id: null, cx: 0, cy: 0 });
  const look = useRef({ id: null, x: 0, y: 0 });

  const R = 52; // joystick radius (px)

  const joyStart = (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const rect = joyRef.current.getBoundingClientRect();
    joy.current = { id: t.identifier, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
    joyMove(e);
  };
  const joyMove = (e) => {
    const j = joy.current;
    if (j.id === null) return;
    const t = Array.from(e.touches).find((x) => x.identifier === j.id);
    if (!t) return;
    let dx = t.clientX - j.cx;
    let dy = t.clientY - j.cy;
    const len = Math.hypot(dx, dy);
    if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    ctrl.current?.move(-dy / R, dx / R); // forward = up (−dy), right = +dx
  };
  const joyEnd = (e) => {
    if (!Array.from(e.changedTouches).some((t) => t.identifier === joy.current.id)) return;
    joy.current = { id: null, cx: 0, cy: 0 };
    if (knobRef.current) knobRef.current.style.transform = 'translate(0,0)';
    ctrl.current?.move(0, 0);
  };

  const lookStart = (e) => {
    if (look.current.id !== null) return;
    const t = e.changedTouches[0];
    look.current = { id: t.identifier, x: t.clientX, y: t.clientY };
  };
  const lookMove = (e) => {
    const l = look.current;
    if (l.id === null) return;
    const t = Array.from(e.touches).find((x) => x.identifier === l.id);
    if (!t) return;
    ctrl.current?.look(t.clientX - l.x, t.clientY - l.y);
    l.x = t.clientX;
    l.y = t.clientY;
  };
  const lookEnd = (e) => {
    if (Array.from(e.changedTouches).some((t) => t.identifier === look.current.id)) look.current = { id: null, x: 0, y: 0 };
  };

  const hold = (key) => ({
    onTouchStart: (e) => { e.preventDefault(); e.stopPropagation(); ctrl.current?.[key]?.(true); },
    onTouchEnd: (e) => { e.preventDefault(); e.stopPropagation(); ctrl.current?.[key]?.(false); },
    onTouchCancel: (e) => { ctrl.current?.[key]?.(false); },
  });
  const tap = (key) => ({
    onTouchStart: (e) => { e.preventDefault(); e.stopPropagation(); ctrl.current?.[key]?.(); },
  });

  return (
    <div className="touch-ui">
      <div className="look-pad" onTouchStart={lookStart} onTouchMove={lookMove} onTouchEnd={lookEnd} onTouchCancel={lookEnd} />

      <div className="joystick" ref={joyRef} onTouchStart={joyStart} onTouchMove={joyMove} onTouchEnd={joyEnd} onTouchCancel={joyEnd}>
        <div className="joystick-knob" ref={knobRef} />
      </div>

      <div className="touch-buttons">
        <button className="tbtn umbrella" {...tap('umbrella')}>☂️</button>
        <button className="tbtn shades" {...tap('shades')}>🕶️</button>
        <button className="tbtn dive" {...tap('dive')}>🏊</button>
        <button className="tbtn crouch" {...hold('crouch')}>⤓</button>
        <button className="tbtn sprint" {...hold('sprint')}>⚡</button>
        <button className="tbtn jump" {...hold('jump')}>⤒</button>
      </div>

      <button className="tbtn pause-btn" {...tap('pause')}>⏸</button>
    </div>
  );
}
