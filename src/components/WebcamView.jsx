import { useEffect, useRef, useCallback } from 'react';
import { initHandTracking, startDetectionLoop, stopDetectionLoop } from '../lib/handTracking.js';
import { normalizeLandmarks } from '../lib/normalize.js';
import './WebcamView.css';

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

function drawHand(ctx, landmarkSets, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (!landmarkSets || landmarkSets.length === 0) return;
  const lms = landmarkSets[0];
  ctx.strokeStyle = '#00e676';
  ctx.lineWidth = 2;
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

// Display is mirrored via CSS (scaleX(-1) on the container).
// onLandmarks receives RAW (unmirrored) coordinates -- see README.
export default function WebcamView({ onLandmarks }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  // Ref-forwarding keeps the rAF loop stable across parent re-renders
  // so the loop never needs to be torn down and restarted mid-lesson.
  const onLandmarksRef = useRef(onLandmarks);
  useEffect(() => { onLandmarksRef.current = onLandmarks; }, [onLandmarks]);

  const handleResults = useCallback((results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    drawHand(canvas.getContext('2d'), results.landmarks, w, h);
    const normalized = results.landmarks.length > 0
      ? normalizeLandmarks(results.landmarks[0])
      : null;
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
