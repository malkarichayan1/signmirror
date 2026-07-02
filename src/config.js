// All tunable constants live here. Edit this file when calibrating the matcher.

// Mean Euclidean distance (in normalized units) below which a sign is accepted.
// Lower = stricter. Start at 0.08 and decrease as reference data improves.
export const MATCH_THRESHOLD = 0.08;

// Reserved for a future consecutive-frame debounce (not used in Phase 1).
export const PASS_HOLD_FRAMES = 15;

// MediaPipe WASM is fetched from CDN at runtime rather than bundled, which
// avoids Vite/WASM pre-bundling incompatibilities.
export const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

export const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';