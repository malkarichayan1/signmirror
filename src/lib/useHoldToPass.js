// Reusable "hold a static sign steady to pass" detector. Mirrors the
// static-sign hold logic in LessonRunner, extracted so new static-sign
// flows (e.g. the fingerspelling trainer) don't need a full lesson queue.
import { useState, useRef, useCallback, useEffect } from 'react';
import { matchPose } from './matcher.js';
import { HOLD_DURATION_MS } from '../config.js';

const HOLD_GRACE_MS = 500; // tolerate brief landmark jitter without resetting hold progress

// referenceLandmarks: the target sign's normalized 21-point pose, or null.
// onPass: called once when the hold completes for the current reference.
export function useHoldToPass(referenceLandmarks, onPass) {
  const [holdPct, setHoldPct] = useState(0);
  const [matchResult, setMatchResult] = useState({ distance: null, pass: false });

  const holdStartRef = useRef(null);
  const holdFailStartRef = useRef(null);
  const passedRef = useRef(false);

  // Reset hold progress whenever the target changes.
  useEffect(() => {
    holdStartRef.current = null;
    holdFailStartRef.current = null;
    passedRef.current = false;
    setHoldPct(0);
    setMatchResult({ distance: null, pass: false });
  }, [referenceLandmarks]);

  const handleLandmarks = useCallback((normalized) => {
    if (passedRef.current || !referenceLandmarks) return;

    if (!normalized) {
      holdStartRef.current = null;
      holdFailStartRef.current = null;
      setHoldPct(0);
      setMatchResult({ distance: null, pass: false });
      return;
    }

    const result = matchPose(normalized, referenceLandmarks);
    setMatchResult(result);

    if (result.pass) {
      holdFailStartRef.current = null;
      if (holdStartRef.current === null) holdStartRef.current = performance.now();
      const elapsed = performance.now() - holdStartRef.current;
      const pct = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setHoldPct(pct);
      if (pct >= 1) {
        passedRef.current = true;
        onPass();
      }
    } else if (holdStartRef.current !== null) {
      if (holdFailStartRef.current === null) holdFailStartRef.current = performance.now();
      if (performance.now() - holdFailStartRef.current > HOLD_GRACE_MS) {
        holdStartRef.current = null;
        holdFailStartRef.current = null;
        setHoldPct(0);
      }
    }
  }, [referenceLandmarks, onPass]);

  return { holdPct, matchResult, handleLandmarks };
}
