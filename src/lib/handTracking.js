import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { WASM_CDN, MODEL_URL } from '../config.js';

// Module-level singleton so reinitialising on screen transitions is a no-op.
let handLandmarker = null;
let initPromise = null;
let animFrameId = null;

export async function initHandTracking() {
  if (handLandmarker) return;
  if (!initPromise) {
    initPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
      });
    })();
  }
  return initPromise;
}

// Runs detectForVideo on every new video frame via requestAnimationFrame.
// The loop must not block the UI thread; MediaPipe itself is synchronous but
// fast enough (~2-4 ms) to stay within a single 16 ms frame budget.
export function startDetectionLoop(videoEl, onResults) {
  if (!handLandmarker) throw new Error('Call initHandTracking() first');
  let lastVideoTime = -1;

  function detect() {
    if (videoEl.readyState >= 2 && videoEl.currentTime !== lastVideoTime) {
      lastVideoTime = videoEl.currentTime;
      const results = handLandmarker.detectForVideo(videoEl, performance.now());
      onResults(results);
    }
    animFrameId = requestAnimationFrame(detect);
  }

  animFrameId = requestAnimationFrame(detect);
}

export function stopDetectionLoop() {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}