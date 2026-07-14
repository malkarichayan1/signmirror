import { useEffect, useRef } from 'react';
import './SkeletonReplay.css';

// Palm outline: wrist -> thumb CMC -> across the four MCP knuckles -> back to wrist.
const PALM_OUTLINE = [0, 1, 5, 9, 13, 17];

// Each finger's bones (excluding the wrist-to-base segment, which the palm
// polygon already covers), with per-segment widths (normalized units,
// widest nearest the palm) so fingers read as tapered, fleshed-out shapes
// rather than uniform wire lines.
const FINGERS = [
  { pts: [1, 2, 3, 4],     widths: [0.30, 0.23, 0.16] }, // thumb
  { pts: [5, 6, 7, 8],     widths: [0.26, 0.20, 0.14] }, // index
  { pts: [9, 10, 11, 12],  widths: [0.27, 0.21, 0.15] }, // middle
  { pts: [13, 14, 15, 16], widths: [0.25, 0.19, 0.13] }, // ring
  { pts: [17, 18, 19, 20], widths: [0.22, 0.17, 0.12] }, // pinky
];

const SKIN_FILL    = '#e3a97e';
const SKIN_OUTLINE = '#a9754f';

function pathPalm(ctx, pts) {
  ctx.beginPath();
  PALM_OUTLINE.forEach((i, idx) => {
    const p = pts[i];
    if (idx === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
}

function strokeFinger(ctx, pts, fingerPts, widths, scale, color, outlinePad) {
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  for (let i = 0; i < fingerPts.length - 1; i++) {
    const a = pts[fingerPts[i]];
    const b = pts[fingerPts[i + 1]];
    ctx.lineWidth = widths[i] * scale + outlinePad;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

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

    function drawFrame(lms) {
      ctx.clearRect(0, 0, size, size);
      const pts = lms.map(toCanvas);

      // Outline pass first (wider, underneath) to give the silhouette a
      // defined edge; fill pass on top in the base skin tone.
      pathPalm(ctx, pts);
      ctx.fillStyle = SKIN_OUTLINE;
      ctx.fill();
      for (const finger of FINGERS) {
        strokeFinger(ctx, pts, finger.pts, finger.widths, scale, SKIN_OUTLINE, 3);
      }

      pathPalm(ctx, pts);
      ctx.fillStyle = SKIN_FILL;
      ctx.fill();
      for (const finger of FINGERS) {
        strokeFinger(ctx, pts, finger.pts, finger.widths, scale, SKIN_FILL, 0);
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
      aria-label="Reference hand shape"
    />
  );
}
