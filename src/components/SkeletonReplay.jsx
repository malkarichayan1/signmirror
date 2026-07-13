import { useEffect, useRef } from 'react';
import './SkeletonReplay.css';

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

function computeBounds(frames) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const frame of frames) {
    for (const lm of frame) {
      if (lm.x < minX) minX = lm.x;
      if (lm.x > maxX) maxX = lm.x;
      if (lm.y < minY) minY = lm.y;
      if (lm.y > maxY) maxY = lm.y;
    }
  }
  const padX = (maxX - minX) * 0.15 || 0.2;
  const padY = (maxY - minY) * 0.15 || 0.2;
  return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
}

export default function SkeletonReplay({ frames, fps = 15, size = 200 }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    if (!frames?.length) return;

    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const bounds = computeBounds(frames);
    const rangeX = bounds.maxX - bounds.minX;
    const rangeY = bounds.maxY - bounds.minY;

    const scale = Math.min(size / rangeX, size / rangeY);
    const offX  = (size - rangeX * scale) / 2;
    const offY  = (size - rangeY * scale) / 2;

    const toCanvas = (lm) => ({
      x: offX + (lm.x - bounds.minX) * scale,
      y: offY + (lm.y - bounds.minY) * scale,
    });

    const interval = 1000 / fps;
    let frameIdx = 0;
    let lastTime = 0;

    // Read theme tokens so the replay matches light/dark mode.
    const styles = getComputedStyle(canvas);
    const boneColor  = styles.getPropertyValue('--skeleton-bone').trim() || '#4f46e5';
    const jointColor = styles.getPropertyValue('--skeleton-joint').trim() || '#22c55e';

    function drawFrame(lms) {
      ctx.clearRect(0, 0, size, size);
      const pts = lms.map(toCanvas);

      ctx.strokeStyle = boneColor;
      ctx.lineWidth   = 2.5;
      for (const [a, b] of CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(pts[a].x, pts[a].y);
        ctx.lineTo(pts[b].x, pts[b].y);
        ctx.stroke();
      }
      ctx.fillStyle = jointColor;
      for (const pt of pts) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function tick(now) {
      if (now - lastTime >= interval) {
        drawFrame(frames[frameIdx]);
        frameIdx = (frameIdx + 1) % frames.length;
        lastTime = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [frames, fps, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="skeleton-replay"
      aria-label="Animated reference skeleton"
    />
  );
}
