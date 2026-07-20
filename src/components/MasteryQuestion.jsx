import { useState, useRef, useEffect, useCallback } from 'react';
import ExpandableHandPreview from './ExpandableHandPreview.jsx';
import WebcamView from './WebcamView.jsx';
import { matchPose } from '../lib/matcher.js';
import { trimStationaryFrames } from '../lib/sequenceMatcher.js';
import {
  HOLD_DURATION_MS,
  DTW_BAND_RATIO,
  DTW_THRESHOLD,
  TRIM_EPSILON,
  MOTION_FPS,
  MOTION_MAX_DURATION_MS,
} from '../config.js';
import './MasteryTest.css';

const FEEDBACK_DELAY_MS = 900;       // how long the correct/incorrect flash shows before advancing
const HOLD_GRACE_MS = 500;           // tolerate brief landmark jitter without resetting a static hold
const MIN_CAPTURE_DURATION_MS = 1800;
const PERFORM_STATIC_WINDOW_MS = 4000; // max time to achieve a static hold before auto-failing

function framesFor(sign) {
  return sign.type === 'motion' ? sign.frames : [sign.landmarks];
}

// ── Choice question: sign-to-meaning / meaning-to-sign ──────────────────────

function ChoiceQuestion({ question, onAnswer }) {
  const [selectedId, setSelectedId] = useState(null);
  const isSignToMeaning = question.type === 'sign-to-meaning';

  function handleSelect(choiceId) {
    if (selectedId) return;
    setSelectedId(choiceId);
    setTimeout(() => onAnswer({ choiceId }), FEEDBACK_DELAY_MS);
  }

  return (
    <div className="mastery-question">
      {isSignToMeaning ? (
        <div className="mastery-prompt mastery-prompt-sign">
          <ExpandableHandPreview
            frames={framesFor(question.sign)}
            fps={question.sign.fps ?? MOTION_FPS}
            label={question.sign.name}
          />
          <p className="mastery-prompt-label">What does this sign mean?</p>
        </div>
      ) : (
        <div className="mastery-prompt mastery-prompt-word">
          <p className="mastery-prompt-label">Which sign means:</p>
          <h2 className="mastery-prompt-word-text">{question.sign.name}</h2>
        </div>
      )}

      <div className={`mastery-choices ${isSignToMeaning ? 'text' : 'visual'}`}>
        {question.choices.map(choice => {
          const revealed = selectedId !== null;
          const isCorrectChoice = choice.id === question.correctChoiceId;
          const stateClass = revealed ? (isCorrectChoice ? 'correct' : choice.id === selectedId ? 'incorrect' : '') : '';

          if (isSignToMeaning) {
            return (
              <button
                key={choice.id}
                type="button"
                className={`mastery-choice text ${stateClass}`}
                onClick={() => handleSelect(choice.id)}
                disabled={revealed}
              >
                {choice.label}
              </button>
            );
          }

          return (
            <div key={choice.id} className={`mastery-choice-card ${stateClass}`}>
              <ExpandableHandPreview
                frames={framesFor(choice.sign)}
                fps={choice.sign.fps ?? MOTION_FPS}
                label={choice.label}
              />
              <button
                type="button"
                className="mastery-choice-select"
                onClick={() => handleSelect(choice.id)}
                disabled={revealed}
              >
                {choice.label}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Perform question: sign it on camera ──────────────────────────────────────

function PerformQuestion({ question, onAnswer }) {
  const [phase, setPhase] = useState('ready'); // ready | countdown | active | done
  const [countdownVal, setCountdownVal] = useState(null);
  const [resultPassed, setResultPassed] = useState(null);

  const sign = question.sign;
  const isMotion = sign.type === 'motion';

  const finishedRef          = useRef(false);
  const holdStartRef         = useRef(null);
  const holdFailStartRef     = useRef(null);
  const recordingFramesRef   = useRef([]);
  const lastFrameCaptureRef  = useRef(0);
  const handLostRef          = useRef(false);
  const workerRef            = useRef(null);
  const staticTimeoutRef     = useRef(null);
  const countdownIntervalRef = useRef(null);
  const recordingTimerRef    = useRef(null);

  useEffect(() => {
    if (!isMotion) return;
    const worker = new Worker(new URL('../workers/dtwWorker.js', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    return () => worker.terminate();
  }, [isMotion]);

  useEffect(() => () => {
    clearInterval(countdownIntervalRef.current);
    clearTimeout(recordingTimerRef.current);
    clearTimeout(staticTimeoutRef.current);
  }, []);

  const finish = useCallback((didPass) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setResultPassed(didPass);
    setPhase('done');
    setTimeout(() => onAnswer({ passed: didPass }), FEEDBACK_DELAY_MS);
  }, [onAnswer]);

  function scoreMotion() {
    const trimmed = trimStationaryFrames(recordingFramesRef.current, TRIM_EPSILON);
    if (trimmed.length < 3) { finish(false); return; }
    const worker = workerRef.current;
    if (!worker) { finish(false); return; }
    worker.onmessage = (e) => finish(Boolean(e.data.pass));
    worker.postMessage({ userFrames: trimmed, refFrames: sign.frames, bandRatio: DTW_BAND_RATIO, threshold: DTW_THRESHOLD });
  }

  function startActive() {
    setPhase('active');
    if (isMotion) {
      recordingFramesRef.current = [];
      handLostRef.current = false;
      lastFrameCaptureRef.current = 0;
      const refDurationMs = (sign.frames.length / (sign.fps ?? MOTION_FPS)) * 1000;
      const captureDurationMs = Math.min(Math.max(refDurationMs * 1.5, MIN_CAPTURE_DURATION_MS), MOTION_MAX_DURATION_MS);
      recordingTimerRef.current = setTimeout(scoreMotion, captureDurationMs);
    } else {
      holdStartRef.current = null;
      holdFailStartRef.current = null;
      staticTimeoutRef.current = setTimeout(() => finish(false), PERFORM_STATIC_WINDOW_MS);
    }
  }

  function startCountdown() {
    setPhase('countdown');
    let n = 3;
    setCountdownVal(n);
    countdownIntervalRef.current = setInterval(() => {
      n -= 1;
      if (n > 0) {
        setCountdownVal(n);
      } else {
        clearInterval(countdownIntervalRef.current);
        setCountdownVal(null);
        startActive();
      }
    }, 1000);
  }

  const handleLandmarks = useCallback((normalized) => {
    if (phase !== 'active' || finishedRef.current) return;

    if (isMotion) {
      if (!normalized) {
        handLostRef.current = true;
        clearTimeout(recordingTimerRef.current);
        finish(false);
        return;
      }
      const now = performance.now();
      if (now - lastFrameCaptureRef.current < 1000 / MOTION_FPS) return;
      lastFrameCaptureRef.current = now;
      recordingFramesRef.current.push(normalized);
      return;
    }

    // Static: same grace-period hold logic as LessonRunner, condensed to a
    // single pass/fail outcome instead of a visible progress ring.
    if (!normalized) {
      holdStartRef.current = null;
      return;
    }
    const result = matchPose(normalized, sign.landmarks);
    if (result.pass) {
      holdFailStartRef.current = null;
      if (holdStartRef.current === null) holdStartRef.current = performance.now();
      if (performance.now() - holdStartRef.current >= HOLD_DURATION_MS) {
        clearTimeout(staticTimeoutRef.current);
        finish(true);
      }
    } else if (holdStartRef.current !== null) {
      if (holdFailStartRef.current === null) holdFailStartRef.current = performance.now();
      if (performance.now() - holdFailStartRef.current > HOLD_GRACE_MS) {
        holdStartRef.current = null;
        holdFailStartRef.current = null;
      }
    }
  }, [phase, isMotion, sign, finish]);

  return (
    <div className="mastery-question mastery-question-perform">
      <div className="mastery-prompt mastery-prompt-word">
        <p className="mastery-prompt-label">Perform this sign:</p>
        <h2 className="mastery-prompt-word-text">{sign.name}</h2>
      </div>

      {phase === 'ready' && (
        <button type="button" className="btn btn-primary" onClick={startCountdown}>
          Ready
        </button>
      )}

      {phase === 'countdown' && countdownVal !== null && (
        <div className="mastery-countdown" aria-live="assertive">{countdownVal}</div>
      )}

      {(phase === 'active' || phase === 'countdown') && (
        <div className="mastery-webcam-wrap">
          <WebcamView
            onLandmarks={handleLandmarks}
            referenceLandmarks={!isMotion ? sign.landmarks : null}
          />
        </div>
      )}

      {phase === 'active' && (
        <p className="mastery-status" aria-live="polite">
          {isMotion ? 'Recording…' : 'Hold the sign steady…'}
        </p>
      )}

      {phase === 'done' && (
        <div className={`mastery-perform-result ${resultPassed ? 'correct' : 'incorrect'}`}>
          {resultPassed ? '✓ Nice!' : '✕ Not quite'}
        </div>
      )}
    </div>
  );
}

// Registry mapping question type -> renderer. Add an entry here (and a
// builder in lib/masteryTest.js) to introduce a new question type.
const RENDERERS = {
  'sign-to-meaning': ChoiceQuestion,
  'meaning-to-sign': ChoiceQuestion,
  perform: PerformQuestion,
};

export default function MasteryQuestion({ question, onAnswer }) {
  const Renderer = RENDERERS[question.type] ?? ChoiceQuestion;
  return <Renderer question={question} onAnswer={onAnswer} />;
}
