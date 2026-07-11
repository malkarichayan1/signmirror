import { useState, useCallback, useRef, useEffect } from 'react';
import WebcamView from './WebcamView.jsx';
import SignPrompt from './SignPrompt.jsx';
import FeedbackPanel from './FeedbackPanel.jsx';
import SkeletonReplay from './SkeletonReplay.jsx';
import { matchPose } from '../lib/matcher.js';
import { trimStationaryFrames } from '../lib/sequenceMatcher.js';
import { recordAttempt, markLessonComplete } from '../lib/progress.js';
import {
  HOLD_DURATION_MS,
  DTW_BAND_RATIO,
  DTW_THRESHOLD,
  TRIM_EPSILON,
  MOTION_FPS,
  MOTION_MAX_DURATION_MS,
} from '../config.js';
import './LessonRunner.css';

const FAIL_PCT_THRESHOLD = 0.15;
const MOTION_FAIL_LIMIT  = 3;

// ── Static sign: hold-progress ring ────────────────────────────────────────

function HoldRing({ pct }) {
  const size = 88;
  const sw   = 8;
  const r    = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const cx   = size / 2;
  const cy   = size / 2;
  return (
    <svg width={size} height={size} className="hold-ring" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#333" strokeWidth={sw} />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke="#00e676" strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </svg>
  );
}

// ── Lesson complete screen ──────────────────────────────────────────────────

function CompleteScreen({ lesson, signResults, onBack, onRetry }) {
  return (
    <div className="complete-screen">
      <div className="complete-badge">🎉</div>
      <h2 className="complete-title">Lesson Complete!</h2>
      <p className="complete-subtitle">{lesson.title}</p>
      <ul className="complete-results">
        {lesson.signs.map(sign => {
          const r = signResults[sign.id] ?? { attempts: 0, passed: false, skipped: false };
          return (
            <li key={sign.id} className={`result-row ${r.passed ? 'passed' : 'skipped'}`}>
              <span className="result-icon">{r.passed ? '✓' : '↻'}</span>
              <span className="result-name">{sign.name}</span>
              <span className="result-attempts">{r.attempts} attempt{r.attempts !== 1 ? 's' : ''}</span>
            </li>
          );
        })}
      </ul>
      <div className="complete-actions">
        <button className="btn-secondary" onClick={onRetry}>Retry Lesson</button>
        <button className="btn-primary"   onClick={onBack}>Back to Lessons</button>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function LessonRunner({ lesson, onComplete }) {
  const initialQueue = lesson.signs;

  // ── Shared state ──────────────────────────────────────────────────────────
  const [queue,       setQueue]       = useState(() => [...initialQueue]);
  const [mode,        setMode]        = useState('attempting');
  const [signResults, setSignResults] = useState({});

  // ── Static-sign state ─────────────────────────────────────────────────────
  const [holdPct,     setHoldPct]     = useState(0);
  const [matchResult, setMatchResult] = useState({ distance: null, pass: false });

  // ── Motion-sign state ─────────────────────────────────────────────────────
  const [countdownVal,  setCountdownVal]  = useState(null); // 3 | 2 | 1 | null
  const [motionStatus,  setMotionStatus]  = useState('');   // status label
  const [motionCost,    setMotionCost]    = useState(null);

  // ── Refs (rAF-safe, avoid stale closure issues) ───────────────────────────
  const holdStartRef        = useRef(null);
  const passedRef           = useRef(false);
  const failedHoldsRef      = useRef(0);
  const retriedRef          = useRef(new Set());
  const prevSignIdRef       = useRef(null);

  // Motion-specific refs
  const workerRef           = useRef(null);
  const recordingFramesRef  = useRef([]);
  const refFramesRef        = useRef(null);  // reference frames captured at recording start
  const countdownIntervalRef = useRef(null);
  const recordingTimerRef   = useRef(null);
  const handLostRef         = useRef(false);
  const motionFailCountRef  = useRef(0);

  const currentSign  = queue[0] ?? null;
  const isMotionSign = currentSign?.type === 'motion';
  const isRetry      = currentSign !== null && retriedRef.current.has(currentSign.id);
  const totalSigns   = initialQueue.length;
  const doneCount    = totalSigns - queue.length;

  // ── Worker lifecycle ───────────────────────────────────────────────────────
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/dtwWorker.js', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  // ── Reset on sign change ───────────────────────────────────────────────────
  useEffect(() => {
    const id = currentSign?.id ?? null;
    if (id === prevSignIdRef.current) return;
    prevSignIdRef.current = id;

    // Clear timers from previous sign.
    clearInterval(countdownIntervalRef.current);
    clearTimeout(recordingTimerRef.current);

    // Reset all per-sign refs.
    passedRef.current        = false;
    failedHoldsRef.current   = 0;
    holdStartRef.current     = null;
    motionFailCountRef.current = 0;
    recordingFramesRef.current = [];
    handLostRef.current      = false;

    setHoldPct(0);
    setMatchResult({ distance: null, pass: false });
    setCountdownVal(null);
    setMotionStatus('');
    setMotionCost(null);
    setMode(prev => (prev === 'complete' ? 'complete' : 'attempting'));
  }, [currentSign]);

  // Cleanup timers on unmount.
  useEffect(() => {
    return () => {
      clearInterval(countdownIntervalRef.current);
      clearTimeout(recordingTimerRef.current);
    };
  }, []);

  // ── Queue management ───────────────────────────────────────────────────────

  function advanceQueue(isSkip) {
    const [head, ...rest] = queue;
    let next;
    if (isSkip) {
      if (!retriedRef.current.has(head.id)) {
        retriedRef.current.add(head.id);
        next = rest.length > 0 ? [...rest, head] : [];
      } else {
        next = rest;
      }
    } else {
      next = rest;
    }
    if (next.length === 0) {
      markLessonComplete(lesson.id);
      setMode('complete');
    } else {
      setMode('attempting');
    }
    setQueue(next);
    // Reset static-sign hold state.
    setHoldPct(0);
    setMatchResult({ distance: null, pass: false });
    holdStartRef.current   = null;
    failedHoldsRef.current = 0;
  }

  function passCurrentSign() {
    if (passedRef.current) return;
    passedRef.current = true;
    const signId = currentSign.id;
    recordAttempt(lesson.id, signId, { passed: true });
    setSignResults(prev => ({
      ...prev,
      [signId]: {
        attempts: (prev[signId]?.attempts ?? 0) + 1,
        passed:   true,
        skipped:  false,
      },
    }));
    advanceQueue(false);
  }

  function handleSkip() {
    const signId = currentSign.id;
    recordAttempt(lesson.id, signId, { skipped: true });
    setSignResults(prev => ({
      ...prev,
      [signId]: {
        attempts: (prev[signId]?.attempts ?? 0) + 1,
        passed:   prev[signId]?.passed ?? false,
        skipped:  true,
      },
    }));
    advanceQueue(true);
  }

  function handleTryAgain() {
    // Resets both static and motion state for another attempt.
    clearInterval(countdownIntervalRef.current);
    clearTimeout(recordingTimerRef.current);
    passedRef.current        = false;
    failedHoldsRef.current   = 0;
    holdStartRef.current     = null;
    recordingFramesRef.current = [];
    handLostRef.current      = false;
    setHoldPct(0);
    setMatchResult({ distance: null, pass: false });
    setCountdownVal(null);
    setMotionStatus('');
    setMotionCost(null);
    setMode('attempting');
  }

  function handleRetry() {
    clearInterval(countdownIntervalRef.current);
    clearTimeout(recordingTimerRef.current);
    retriedRef.current         = new Set();
    holdStartRef.current       = null;
    passedRef.current          = false;
    failedHoldsRef.current     = 0;
    motionFailCountRef.current = 0;
    prevSignIdRef.current      = null;
    recordingFramesRef.current = [];
    handLostRef.current        = false;
    setQueue([...initialQueue]);
    setMode('attempting');
    setHoldPct(0);
    setMatchResult({ distance: null, pass: false });
    setCountdownVal(null);
    setMotionStatus('');
    setMotionCost(null);
    setSignResults({});
  }

  // ── Motion sign: recording flow ────────────────────────────────────────────

  function stopRecordingAndScore() {
    clearTimeout(recordingTimerRef.current);

    // Aborted mid-recording because hand left the frame — already handled in
    // handleLandmarks; don't double-process.
    if (handLostRef.current) return;

    const rawFrames = recordingFramesRef.current;
    const trimmed   = trimStationaryFrames(rawFrames, TRIM_EPSILON);

    if (trimmed.length < 3) {
      setMotionStatus('Recording too short — keep your hand visible');
      motionFailCountRef.current += 1;
      setMode(motionFailCountRef.current >= MOTION_FAIL_LIMIT ? 'hint' : 'attempting');
      return;
    }

    setMode('scoring');
    setMotionStatus('Analyzing…');

    const worker = workerRef.current;
    if (!worker) { setMode('attempting'); return; }

    worker.onmessage = (e) => {
      const { cost, pass } = e.data;
      setMotionCost(cost);
      if (pass) {
        passCurrentSign();
      } else {
        motionFailCountRef.current += 1;
        setMotionStatus(`Cost ${cost.toFixed(3)} — try again`);
        setMode(motionFailCountRef.current >= MOTION_FAIL_LIMIT ? 'hint' : 'attempting');
      }
    };

    worker.postMessage({
      userFrames: trimmed,
      refFrames:  refFramesRef.current,
      bandRatio:  DTW_BAND_RATIO,
      threshold:  DTW_THRESHOLD,
    });
  }

  function startRecording() {
    recordingFramesRef.current = [];
    handLostRef.current        = false;
    refFramesRef.current       = currentSign.frames;
    setMode('recording');
    setMotionStatus('Recording…');

    const refDurationMs     = (currentSign.frames.length / (currentSign.fps ?? MOTION_FPS)) * 1000;
    const captureDurationMs = Math.min(refDurationMs * 1.5, MOTION_MAX_DURATION_MS);

    recordingTimerRef.current = setTimeout(stopRecordingAndScore, captureDurationMs);
  }

  function startCountdown() {
    setMotionStatus('');
    setMotionCost(null);
    setMode('countdown');
    setCountdownVal(3);
    let n = 3;
    countdownIntervalRef.current = setInterval(() => {
      n -= 1;
      if (n > 0) {
        setCountdownVal(n);
      } else {
        clearInterval(countdownIntervalRef.current);
        setCountdownVal(null);
        startRecording();
      }
    }, 1000);
  }

  // ── Landmark callback (shared, dispatches by sign type + mode) ─────────────

  const handleLandmarks = useCallback((normalized) => {
    if (passedRef.current || !currentSign) return;

    if (isMotionSign) {
      if (mode !== 'recording') return;
      if (!normalized) {
        // Hand left the frame — abort immediately.
        handLostRef.current = true;
        clearTimeout(recordingTimerRef.current);
        setMotionStatus('Hand left the frame — try again');
        setMode('hint');
        return;
      }
      recordingFramesRef.current.push(normalized);
      return;
    }

    // ── Static sign path ─────────────────────────────────────────────────
    if (mode !== 'attempting') return;

    if (!normalized) {
      if (holdStartRef.current !== null) {
        const pct = (performance.now() - holdStartRef.current) / HOLD_DURATION_MS;
        if (pct > FAIL_PCT_THRESHOLD) {
          failedHoldsRef.current += 1;
          if (failedHoldsRef.current >= 3) setMode('hint');
        }
        holdStartRef.current = null;
        setHoldPct(0);
      }
      setMatchResult({ distance: null, pass: false });
      return;
    }

    const result = matchPose(normalized, currentSign.landmarks);
    setMatchResult(result);

    if (result.pass) {
      if (holdStartRef.current === null) holdStartRef.current = performance.now();
      const elapsed = performance.now() - holdStartRef.current;
      const pct     = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setHoldPct(pct);
      if (pct >= 1) passCurrentSign();
    } else {
      if (holdStartRef.current !== null) {
        const pct = (performance.now() - holdStartRef.current) / HOLD_DURATION_MS;
        if (pct > FAIL_PCT_THRESHOLD) {
          failedHoldsRef.current += 1;
          if (failedHoldsRef.current >= 3) setMode('hint');
        }
        holdStartRef.current = null;
        setHoldPct(0);
      }
    }
  }, [mode, currentSign, isMotionSign]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ─────────────────────────────────────────────────────────────────

  if (mode === 'complete') {
    return (
      <CompleteScreen
        lesson={lesson}
        signResults={signResults}
        onBack={onComplete}
        onRetry={handleRetry}
      />
    );
  }

  if (!currentSign) return null;

  return (
    <div className="lesson-runner">
      <WebcamView onLandmarks={handleLandmarks} />

      <div className="runner-sidebar">
        <div className="sign-counter">
          Sign {doneCount + 1} of {totalSigns}
          {isRetry && <span className="retry-badge"> (retry)</span>}
        </div>

        {isMotionSign ? (
          // ── Motion sign sidebar ─────────────────────────────────────────
          <>
            <div className="motion-reference">
              <SkeletonReplay frames={currentSign.frames} fps={currentSign.fps ?? MOTION_FPS} size={200} />
              <p className="motion-sign-name">{currentSign.name}</p>
              {currentSign.description && (
                <p className="motion-sign-desc">{currentSign.description}</p>
              )}
            </div>

            {mode === 'attempting' && (
              <div className="motion-ready-wrap">
                {motionStatus && <p className="motion-status">{motionStatus}</p>}
                {motionCost !== null && (
                  <p className="motion-cost">
                    Last cost: {motionCost.toFixed(3)} (threshold: {DTW_THRESHOLD})
                  </p>
                )}
                <button className="btn-primary motion-ready-btn" onClick={startCountdown}>
                  Ready
                </button>
              </div>
            )}

            {mode === 'countdown' && countdownVal !== null && (
              <div className="countdown-display" aria-live="assertive">
                {countdownVal}
              </div>
            )}

            {mode === 'recording' && (
              <div className="recording-indicator" aria-live="polite">
                <span className="recording-dot" aria-hidden="true" />
                Recording…
              </div>
            )}

            {mode === 'scoring' && (
              <div className="scoring-indicator" aria-live="polite">Analyzing…</div>
            )}

            {mode === 'hint' && (
              <div className="hint-panel">
                {motionStatus && <p className="hint-text">{motionStatus}</p>}
                <div className="hint-actions">
                  <button className="btn-primary" onClick={handleTryAgain}>Try Again</button>
                  {!isRetry && (
                    <button className="btn-ghost" onClick={handleSkip}>Skip for Now</button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          // ── Static sign sidebar ─────────────────────────────────────────
          <>
            <SignPrompt sign={currentSign} />
            <div className={`hold-wrap ${holdPct > 0 ? 'active' : ''}`}>
              <HoldRing pct={holdPct} />
              {holdPct > 0 && (
                <span className="hold-label">{Math.round(holdPct * 100)}%</span>
              )}
            </div>
            <FeedbackPanel distance={matchResult.distance} pass={matchResult.pass} />
            {mode === 'hint' && (
              <div className="hint-panel">
                <p className="hint-text">Hold the sign steady for 1.5 seconds.</p>
                <div className="hint-actions">
                  <button className="btn-primary" onClick={handleTryAgain}>Try Again</button>
                  {!isRetry && (
                    <button className="btn-ghost" onClick={handleSkip}>Skip for Now</button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
