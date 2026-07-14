import { MATCH_THRESHOLD } from '../config.js';

function meanDistance(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i++) {
    const dx = a[i].x - b[i].x;
    const dy = a[i].y - b[i].y;
    const dz = a[i].z - b[i].z;
    total += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  return total / a.length;
}

// Reference datasets aren't consistently one-handed, and a signer's dominant
// hand produces a landmark set mirrored across x relative to the opposite
// hand's. Comparing against both orientations makes matching work regardless
// of which hand the user signs with or which hand the reference was captured from.
function mirrorX(landmarks) {
  return landmarks.map((lm) => ({ x: -lm.x, y: lm.y, z: lm.z }));
}

// Compares two arrays of 21 normalised {x,y,z} landmarks.
// Returns the mean Euclidean distance across all joints and a pass/fail flag.
export function matchPose(normalized, reference) {
  if (!normalized || !reference) return { distance: Infinity, pass: false };
  if (normalized.length !== reference.length) return { distance: Infinity, pass: false };

  const direct    = meanDistance(normalized, reference);
  const mirrored  = meanDistance(normalized, mirrorX(reference));
  const distance  = Math.min(direct, mirrored);

  return { distance, pass: distance < MATCH_THRESHOLD };
}