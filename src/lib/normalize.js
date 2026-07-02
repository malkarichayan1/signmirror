// Coordinate convention: ALL stored landmarks use RAW (unmirrored) camera
// coordinates exactly as MediaPipe outputs them. The display is mirrored via
// CSS, but every number fed to normalize() or matcher.js is raw.
//
//   x  increases left → right in the raw camera frame
//   y  increases top → bottom
//   z  depth relative to wrist; negative = closer to camera

const WRIST_IDX = 0;
const MIDDLE_MCP_IDX = 9; // middle-finger MCP joint

// Translates landmarks so the wrist is the origin, then scales so the
// wrist-to-middle-MCP distance equals 1. Makes matching invariant to hand
// size and distance from the camera.
//
// landmarks: array of 21 {x, y, z} objects from MediaPipe
// returns:   same shape normalised, or null if the hand is degenerate
export function normalizeLandmarks(landmarks) {
  if (!landmarks || landmarks.length !== 21) return null;

  const wrist = landmarks[WRIST_IDX];
  const middleMcp = landmarks[MIDDLE_MCP_IDX];

  const dx = middleMcp.x - wrist.x;
  const dy = middleMcp.y - wrist.y;
  const scale = Math.sqrt(dx * dx + dy * dy);

  if (scale < 1e-6) return null; // degenerate / too close together

  return landmarks.map((lm) => ({
    x: (lm.x - wrist.x) / scale,
    y: (lm.y - wrist.y) / scale,
    z: (lm.z - wrist.z) / scale,
  }));
}