import { useMemo } from 'react';
import './TabScreens.css';

const COLORS = ['#4f46e5', '#22c55e', '#06b6d4', '#f59e0b', '#f43f5e'];
const PIECE_COUNT = 60;

// Celebratory confetti burst. Purely decorative; respects reduced motion
// via the global media query (animations collapse to instant).
export default function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        background: COLORS[i % COLORS.length],
        animationDuration: `${2.2 + Math.random() * 1.8}s`,
        animationDelay: `${Math.random() * 0.6}s`,
        transform: `rotate(${Math.random() * 360}deg)`,
      })),
    []
  );

  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map(({ id, ...style }) => (
        <span key={id} className="confetti-piece" style={style} />
      ))}
    </div>
  );
}
