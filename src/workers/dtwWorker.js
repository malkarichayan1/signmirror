import { matchSequence } from '../lib/sequenceMatcher.js';

self.onmessage = function (e) {
  const { userFrames, refFrames, bandRatio, threshold } = e.data;
  const result = matchSequence(userFrames, refFrames, { bandRatio, threshold });
  self.postMessage(result);
};
