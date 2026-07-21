import { useEffect, useRef, useCallback } from 'react';
import { initHandTracking, startDetectionLoop, stopDetectionLoop } from '../lib/handTracking.js';
import { normalizeLandmarks } from '../lib/normalize.js';
import { HAND_CONNECTIONS as CONNECTIONS } from '../lib/handSkeleton.js';
import './WebcamView.css';

function drawHand(ctx, landmarkSets, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (!landmarkSets || landmarkSets.length === 0) return;
  const lms = landmarkSets[0];
  ctx.strokeStyle = '#4f46e5';
  ctx.lineWidth = 2.5;
  for (const [a, b] of CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(lms[a].x * w, lms[a].y * h);
    ctx.lineTo(lms[b].x * w, lms[b].y * h);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  for (const lm of lms) {
    ctx.beginPath();
    ctx.arc(lm.x * w, lm.y * h, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

const WRIST_IDX = 0;
const MIDDLE_MCP_IDX = 9;
const GHOST_COLOR = 'rgba(34, 197, 94, 0.65)'; // emerald, semi-transparent

// Reference landmarks are stored wrist-origin + scale-normalized (see
// normalize.js). To overlay them as a "ghost" guide on the live feed, undo
// that normalization using the user's OWN current wrist position and hand
// scale, so the ghost shape appears sized and positioned right on top of
// where their hand actually is.
function ghostFromReference(reference, liveLandmarks) {
  const wrist = liveLandmarks[WRIST_IDX];
  const middleMcp = liveLandmarks[MIDDLE_MCP_IDX];
  const dx = middleMcp.x - wrist.x;
  const dy = middleMcp.y - wrist.y;
  const scale = Math.sqrt(dx * dx + dy * dy);
  if (scale < 1e-6) return null;
  return reference.map((lm) => ({
    x: wrist.x + lm.x * scale,
    y: wrist.y + lm.y * scale,
  }));
}

function drawGhost(ctx, reference, liveLandmarks, w, h) {
  if (!reference || !liveLandmarks) return;
  const ghost = ghostFromReference(reference, liveLandmarks);
  if (!ghost) return;

  ctx.save();
  ctx.strokeStyle = GHOST_COLOR;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 5]);
  for (const [a, b] of CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(ghost[a].x * w, ghost[a].y * h);
    ctx.lineTo(ghost[b].x * w, ghost[b].y * h);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = GHOST_COLOR;
  for (const lm of ghost) {
    ctx.beginPath();
    ctx.arc(lm.x * w, lm.y * h, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Display is mirrored via CSS (scaleX(-1) on the container).
// onLandmarks receives RAW (unmirrored) coordinates -- see README.
// referenceLandmarks (optional): a single static sign's normalized 21-point
// pose, drawn as a translucent "ghost" guide anchored to the user's live
// hand so they can align their shape to it in real time.
export default function WebcamView({ onLandmarks, referenceLandmarks }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  // Ref-forwarding keeps the rAF loop stable across parent re-renders
  // so the loop never needs to be torn down and restarted mid-lesson.
  const onLandmarksRef = useRef(onLandmarks);
  useEffect(() => { onLandmarksRef.current = onLandmarks; }, [onLandmarks]);
  const referenceRef = useRef(referenceLandmarks);
  useEffect(() => { referenceRef.current = referenceLandmarks; }, [referenceLandmarks]);

  const handleResults = useCallback((results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext('2d');
    drawHand(ctx, results.landmarks, w, h);
    const rawHand = results.landmarks.length > 0 ? results.landmarks[0] : null;
    if (rawHand) drawGhost(ctx, referenceRef.current, rawHand, w, h);
    const normalized = rawHand ? normalizeLandmarks(rawHand) : null;
    onLandmarksRef.current?.(normalized);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let mediaStream = null;
    async function start() {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) { mediaStream.getTracks().forEach((t) => t.stop()); return; }
        const video = videoRef.current;
        video.srcObject = mediaStream;
        await video.play();
        await initHandTracking();
        if (cancelled) return;
        startDetectionLoop(video, handleResults);
      } catch (err) {
        if (!cancelled) console.error('Camera / tracking error:', err);
      }
    }
    start();
    return () => {
      cancelled = true;
      stopDetectionLoop();
      mediaStream?.getTracks().forEach((t) => t.stop());
    };
  }, [handleResults]);

  return (
    <div className="webcam-wrap">
      <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
      <canvas ref={canvasRef} className="webcam-canvas" />
    </div>
  );
}
