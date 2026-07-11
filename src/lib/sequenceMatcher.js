// DTW-based sequence matching for motion signs.
// Exported functions are used by dtwWorker.js (web worker).
//
// Does NOT import from config.js — constants arrive as parameters so the
// worker can import this file directly without Vite's module graph.

// Mean Euclidean distance between two normalized 21-landmark frames.
function frameDist(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const dx = a[i].x - b[i].x;
    const dy = a[i].y - b[i].y;
    const dz = a[i].z - b[i].z;
    sum += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  return sum / a.length;
}

// Dynamic Time Warping with a Sakoe-Chiba band.
// Returns the path-normalized cost (total accumulated cost / path length).
// seq1, seq2 – arrays of normalized 21-landmark frames
// band       – max allowed index offset (Sakoe-Chiba constraint)
export function dtw(seq1, seq2, band) {
  const n = seq1.length;
  const m = seq2.length;
  const INF = Infinity;

  // Flat cost and path-length tables (avoids 2-D array allocation overhead).
  const cost = new Float64Array(n * m).fill(INF);
  const plen = new Uint32Array(n * m).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (Math.abs(i - j) > band) continue;

      const d = frameDist(seq1[i], seq2[j]);

      // Cheapest predecessor among diagonal, up, left.
      let minPrev = INF;
      let minLen  = 0;
      const tryPrev = (pi, pj) => {
        if (pi < 0 || pj < 0) return;
        const v = cost[pi * m + pj];
        if (v < minPrev) { minPrev = v; minLen = plen[pi * m + pj]; }
      };
      tryPrev(i - 1, j - 1);
      tryPrev(i - 1, j);
      tryPrev(i,     j - 1);

      cost[i * m + j] = d + (minPrev === INF ? 0 : minPrev);
      plen[i * m + j] = minLen + 1;
    }
  }

  const totalCost = cost[(n - 1) * m + (m - 1)];
  const pathLen   = plen[(n - 1) * m + (m - 1)];
  return pathLen > 0 ? totalCost / pathLen : INF;
}

// Trim leading/trailing near-stationary frames.
// epsilon – mean per-landmark movement threshold (normalized units)
export function trimStationaryFrames(frames, epsilon) {
  if (frames.length < 2) return frames;

  function movement(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const dx = a[i].x - b[i].x;
      const dy = a[i].y - b[i].y;
      const dz = a[i].z - b[i].z;
      sum += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    return sum / a.length;
  }

  let start = 0;
  while (start < frames.length - 1 && movement(frames[start], frames[start + 1]) < epsilon) {
    start++;
  }

  let end = frames.length - 1;
  while (end > start + 1 && movement(frames[end - 1], frames[end]) < epsilon) {
    end--;
  }

  return frames.slice(start, end + 1);
}

// Top-level matcher — runs DTW and returns { cost, pass }.
// bandRatio and threshold match the config.js constants; callers pass them in.
export function matchSequence(userFrames, refFrames, { bandRatio = 0.2, threshold = 0.40 } = {}) {
  if (!userFrames?.length || !refFrames?.length) {
    return { cost: Infinity, pass: false };
  }
  const band = Math.ceil(Math.max(userFrames.length, refFrames.length) * bandRatio);
  const cost = dtw(userFrames, refFrames, band);
  return { cost, pass: cost < threshold };
}
