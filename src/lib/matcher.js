import { MATCH_THRESHOLD } from '../config.js';

// Compares two arrays of 21 normalised {x,y,z} landmarks.
// Returns the mean Euclidean distance across all joints and a pass/fail flag.
export function matchPose(normalized, reference) {
  if (!normalized || !reference) return { distance: Infinity, pass: false };
  if (normalized.length !== reference.length) return { distance: Infinity, pass: false };

  let total = 0;
  for (let i = 0; i < normalized.length; i++) {
    const dx = normalized[i].x - reference[i].x;
    const dy = normalized[i].y - reference[i].y;
    const dz = normalized[i].z - reference[i].z;
    total += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  const distance = total / normalized.length;
  return { distance, pass: distance < MATCH_THRESHOLD };
}