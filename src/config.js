// All tunable constants live here. Edit this file when calibrating the matcher.

// Mean Euclidean distance (in normalized units) below which a sign is accepted.
// Lower = stricter. Real-time webcam landmarks are noisier than the static
// dataset photos references were extracted from, so this is looser than the
// original 0.08 starting point. Raised again after user testing reported the
// matcher as "very sensitive" — tighten only if this starts accepting clearly
// wrong hand shapes.
export const MATCH_THRESHOLD = 0.2;

// Milliseconds the pose must be held continuously to count as a pass.
export const HOLD_DURATION_MS = 1000;

// Reserved for a future consecutive-frame debounce (not used in Phase 1).
export const PASS_HOLD_FRAMES = 15;

// MediaPipe WASM is fetched from CDN at runtime rather than bundled, which
// avoids Vite/WASM pre-bundling incompatibilities.
export const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

export const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// ── Motion / DTW constants ─────────────────────────────────────────────────

// Sakoe-Chiba band width = ceil(maxSeqLen * DTW_BAND_RATIO).
// Wider band = more flexible tempo matching but slower.
export const DTW_BAND_RATIO = 0.2;

// Normalized DTW cost below which a motion attempt counts as a pass.
// Lower = stricter. Start at 0.40 and adjust after calibration.
export const DTW_THRESHOLD = 0.40;

// Frame-to-frame mean landmark movement below this = stationary.
// Used to trim leading/trailing stillness from recordings.
export const TRIM_EPSILON = 0.03;

// Target frame rate for motion sign recording and reference capture.
export const MOTION_FPS = 15;

// Maximum capture duration for a motion attempt (milliseconds).
export const MOTION_MAX_DURATION_MS = 5000;