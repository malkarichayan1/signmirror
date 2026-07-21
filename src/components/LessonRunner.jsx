import { useState, useCallback, useRef, useEffect } from 'react';
import WebcamView from './WebcamView.jsx';
import SignPrompt from './SignPrompt.jsx';
import FeedbackPanel from './FeedbackPanel.jsx';
import ExpandableHandPreview from './ExpandableHandPreview.jsx';
import { matchPose } from '../lib/matcher.js';
import { trimStationaryFrames } from '../lib/sequenceMatcher.js';
import Confetti from './Confetti.jsx';
import { recordAttempt, markLessonComplete } from '../lib/progress.js';
import {
  recordSignResult,
  awardBonusXp,
  XP_PER_SIGN,
  LESSON_BONUS_XP,
} from '../lib/stats.js';
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
const MIN_CAPTURE_DURATION_MS = 1800; // floor so short reference clips still give the user time to sign
const HOLD_GRACE_MS = 500; // tolerate brief landmark jitter without resetting hold progress

// ── Static sign: hold-progress ring ────────────────────────────────────────

export function HoldRing({ pct }) {
  const size = 88;
  const sw   = 8;
  const r    = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const cx   = size / 2;
  const cy   = size / 2;
  return (
    <svg width={size} height={size} className="hold-ring" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--card-2)" strokeWidth={sw} />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke="var(--emerald)" strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </svg>
  );
}

// ── Lesson complete screen ──────────────────────────────────────────────────

function CompleteScreen({ lesson, signResults, onBack, onRetry }) {
  const passedCount = lesson.signs.filter(s => signResults[s.id]?.passed).length;
  const xpEarned = passedCount * XP_PER_SIGN + LESSON_BONUS_XP;
  return (
    <div className="complete-screen">
      <Confetti />
      <div className="complete-badge">🎉</div>
      <h2 className="complete-title">Lesson complete!</h2>
      <p className="complete-subtitle">{lesson.title}</p>
      <div className="complete-stats">
        <div className="complete-stat">
          <b className="num">+{xpEarned}</b>
          <span>XP earned</span>
        </div>
        <div className="complete-stat">
          <b className="num">{passedCount}/{lesson.signs.length}</b>
          <span>Signs passed</span>
        </div>
      </div>
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
  const [motionDiag,    setMotionDiag]    = useState(null); // TEMP on-screen diagnostic

  // ── Refs (rAF-safe, avoid stale closure issues) ───────────────────────────
  const holdStartRef        = useRef(null);
  const holdFailStartRef    = useRef(null); // when the current grace-period dip began, or null
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
  const lastFrameCaptureRef = useRef(0);     // throttles pushes to MOTION_FPS, matching reference data

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
    holdFailStartRef.current = null;
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
      if (!lesson.isPractice) markLessonComplete(lesson.id);
      awardBonusXp(LESSON_BONUS_XP);
      setMode('complete');
    } else {
      setMode('attempting');
    }
    setQueue(next);
    // Reset static-sign hold state.
    setHoldPct(0);
    setMatchResult({ distance: null, pass: false });
    holdStartRef.current     = null;
    holdFailStartRef.current = null;
    failedHoldsRef.current   = 0;
  }

  function passCurrentSign() {
    if (passedRef.current) return;
    passedRef.current = true;
    const signId = currentSign.id;
    recordAttempt(lesson.id, signId, { passed: true });
    recordSignResult({ passed: true, signName: currentSign.name });
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
    recordSignResult({ passed: false, signName: currentSign.name });
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
    holdFailStartRef.current = null;
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
    holdFailStartRef.current   = null;
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

    // ── TEMP DIAGNOSTIC (remove once motion matching is fixed) ──────────────
    // Set BEFORE the too-short guard so we always see it, even when a
    // recording is being trimmed away to nothing. Compares the numeric shape
    // of the user recording vs the reference to locate why real attempts
    // score far higher than a wrong sign (~0.54).
    {
      const ref = refFramesRef.current ?? [];
      const scale = (lms) => {
        const w = lms[0], m = lms[9];
        return Math.hypot(m.x - w.x, m.y - w.y, (m.z ?? 0) - (w.z ?? 0));
      };
      const axisMean = (frames) => {
        let x = 0, y = 0, z = 0, c = 0;
        for (const f of frames) for (const lm of f) { x += Math.abs(lm.x); y += Math.abs(lm.y); z += Math.abs(lm.z ?? 0); c++; }
        return c ? { x: +(x / c).toFixed(2), y: +(y / c).toFixed(2), z: +(z / c).toFixed(2) } : { x: 0, y: 0, z: 0 };
      };
      const meanScale = (frames) => frames.length ? +(frames.reduce((s, f) => s + scale(f), 0) / frames.length).toFixed(2) : 0;
      const src = trimmed.length ? trimmed : rawFrames;
      const um = axisMean(src), rm = axisMean(ref);
      setMotionDiag(
        `raw ${rawFrames.length}f → trimmed ${trimmed.length}f · ` +
        `user scale ${meanScale(src)} |x${um.x} y${um.y} z${um.z}| · ` +
        `ref ${ref.length}f scale ${meanScale(ref)} |x${rm.x} y${rm.y} z${rm.z}|`
      );
    }

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
    lastFrameCaptureRef.current = 0;
    refFramesRef.current       = currentSign.frames;
    setMode('recording');
    setMotionStatus('Recording…');

    const refDurationMs     = (currentSign.frames.length / (currentSign.fps ?? MOTION_FPS)) * 1000;
    const captureDurationMs = Math.min(
      Math.max(refDurationMs * 1.5, MIN_CAPTURE_DURATION_MS),
      MOTION_MAX_DURATION_MS,
    );

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
      const now = performance.now();
      if (now - lastFrameCaptureRef.current < 1000 / MOTION_FPS) return;
      lastFrameCaptureRef.current = now;
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
      holdFailStartRef.current = null;
      if (holdStartRef.current === null) holdStartRef.current = performance.now();
      const elapsed = performance.now() - holdStartRef.current;
      const pct     = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setHoldPct(pct);
      if (pct >= 1) passCurrentSign();
    } else if (holdStartRef.current !== null) {
      // A single noisy frame shouldn't wipe out an otherwise-steady hold —
      // only reset once the dip has persisted past a short grace window.
      if (holdFailStartRef.current === null) holdFailStartRef.current = performance.now();
      if (performance.now() - holdFailStartRef.current > HOLD_GRACE_MS) {
        const pct = (performance.now() - holdStartRef.current) / HOLD_DURATION_MS;
        if (pct > FAIL_PCT_THRESHOLD) {
          failedHoldsRef.current += 1;
          if (failedHoldsRef.current >= 3) setMode('hint');
        }
        holdStartRef.current     = null;
        holdFailStartRef.current = null;
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
    <div className="lesson-runner-wrap">
      <div
        className="runner-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalSigns}
        aria-valuenow={doneCount}
        aria-label="Lesson progress"
      >
        <i style={{ width: `${(doneCount / totalSigns) * 100}%` }} />
      </div>
      <div className="lesson-runner">
        <WebcamView
          onLandmarks={handleLandmarks}
          referenceLandmarks={!isMotionSign ? currentSign.landmarks : null}
        />

      <div className="runner-sidebar">
        <div className="sign-counter">
          Sign {doneCount + 1} of {totalSigns}
          {isRetry && <span className="retry-badge"> (retry)</span>}
        </div>

        {isMotionSign ? (
          // ── Motion sign sidebar ─────────────────────────────────────────
          <>
            <div className="motion-reference">
              <ExpandableHandPreview frames={currentSign.frames} fps={currentSign.fps ?? MOTION_FPS} label={currentSign.name} />
              <p className="motion-sign-name">{currentSign.name}</p>
              {currentSign.description && (
                <p className="motion-sign-desc">{currentSign.description}</p>
              )}
            </div>

            {/* TEMP DIAGNOSTIC — always visible in every motion state */}
            {motionDiag && (
              <p className="motion-cost" style={{ fontSize: 11, opacity: 0.85, wordBreak: 'break-word', border: '1px solid var(--rose)', borderRadius: 8, padding: 8 }}>
                DIAG: {motionDiag}
              </p>
            )}

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
    </div>
  );
}
