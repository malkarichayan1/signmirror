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

// ── Mastery Test ─────────────────────────────────────────────────────────

// Questions per attempt. Generation clamps to however many are actually
// available if a learner hasn't completed enough lessons yet.
export const MASTERY_QUESTION_COUNT = 20;

// Share of questions that should be "perform the sign on camera" rather than
// multiple choice. Capped by MASTERY_MAX_PERFORM_QUESTIONS so a 20-question
// test doesn't turn into 20 camera reps.
export const MASTERY_QUESTION_TYPE_WEIGHTS = {
  perform: 0.15,
  signToMeaning: 0.45,
  // meaning-to-sign gets the remainder.
};
export const MASTERY_MAX_PERFORM_QUESTIONS = 3;

// Below this many signs across completed lessons, there isn't enough of a
// distractor pool for 4-choice questions, so every question falls back to
// the "perform" type instead.
export const MASTERY_MIN_POOL_FOR_CHOICES = 4;

// Overall score needed to mark a completed lesson's signs as Mastered.
export const MASTERY_PASS_THRESHOLD = 90;

// Per-lesson score below which a Mastery Test result counts as "poor" for
// that lesson. Two consecutive poor results on a Mastered lesson downgrade
// it back to Needs Review.
export const MASTERY_LESSON_POOR_THRESHOLD = 60;

// How many past attempts to keep for trend detection (lesson downgrades)
// and the optional history view.
export const MASTERY_HISTORY_LIMIT = 20;

// Badge thresholds, highest first. Configurable without touching scoring logic.
export const MASTERY_BADGES = [
  { id: 'perfect', label: 'Perfect', emoji: '💎', min: 100 },
  { id: 'gold',    label: 'Gold',    emoji: '🥇', min: 90 },
  { id: 'silver',  label: 'Silver',  emoji: '🥈', min: 80 },
  { id: 'bronze',  label: 'Bronze',  emoji: '🥉', min: 70 },
];

// ── Fingerspelling Trainer ──────────────────────────────────────────────────

// Flat XP bonus awarded on top of per-letter XP when a whole word is spelled.
export const FINGERSPELLING_WORD_BONUS_XP = 15;