import { useState, useRef } from 'react';
import MasteryQuestion from './MasteryQuestion.jsx';
import MasteryResults from './MasteryResults.jsx';
import { generateMasteryTest } from '../lib/masteryTest.js';
import { computeResults, badgeForScore } from '../lib/masteryScoring.js';
import { recordMasteryAttempt, loadMasteryData } from '../lib/masteryProgress.js';
import { MASTERY_QUESTION_COUNT } from '../config.js';
import './MasteryTest.css';

const LOADING_MIN_MS = 500; // brief, deliberate loading state even though generation itself is instant

export default function MasteryScreen({ lessons, progress, onAttemptRecorded, onDone }) {
  const [phase, setPhase] = useState('intro'); // intro | loading | running | results
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [questionIdx, setQuestionIdx] = useState(0);
  const [finalResults, setFinalResults] = useState(null);
  const [finalBadge, setFinalBadge] = useState(null);

  const startTimeRef = useRef(null);

  const completedLessons = lessons.filter(l => progress[l.id]?.completed);
  const masteryData = loadMasteryData();

  function beginTest() {
    setPhase('loading');
    setTimeout(() => {
      const generated = generateMasteryTest(completedLessons, { questionCount: MASTERY_QUESTION_COUNT });
      setQuestions(generated);
      setAnswers({});
      setQuestionIdx(0);
      startTimeRef.current = performance.now();
      setPhase('running');
    }, LOADING_MIN_MS);
  }

  function handleAnswer(answer) {
    const current = questions[questionIdx];
    const nextAnswers = { ...answers, [current.id]: answer };
    setAnswers(nextAnswers);

    if (questionIdx + 1 < questions.length) {
      setQuestionIdx(questionIdx + 1);
      return;
    }

    const elapsedMs = performance.now() - startTimeRef.current;
    const results = computeResults(questions, nextAnswers, elapsedMs);
    const badge = badgeForScore(results.scorePct);
    recordMasteryAttempt(results, badge);
    setFinalResults(results);
    setFinalBadge(badge);
    setPhase('results');
    onAttemptRecorded?.();
  }

  if (phase === 'results' && finalResults) {
    return (
      <div className="screen mastery-screen">
        <MasteryResults results={finalResults} badge={finalBadge} onRetake={beginTest} onDone={onDone} />
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="screen mastery-screen">
        <div className="mastery-loading">
          <div className="mastery-loading-spinner" aria-hidden="true" />
          <p>Building your Mastery Test…</p>
        </div>
      </div>
    );
  }

  if (phase === 'running' && questions.length > 0) {
    const current = questions[questionIdx];
    return (
      <div className="screen mastery-screen mastery-running">
        <div className="mastery-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={questionIdx + 1}>
          <i style={{ width: `${((questionIdx + 1) / questions.length) * 100}%` }} />
        </div>
        <p className="mastery-question-counter">Question {questionIdx + 1} of {questions.length}</p>
        <MasteryQuestion key={current.id} question={current} onAnswer={handleAnswer} />
      </div>
    );
  }

  // ── Intro ──────────────────────────────────────────────────────────────
  return (
    <div className="screen mastery-screen">
      <div className="mastery-intro">
        <div className="mastery-intro-badge" aria-hidden="true">🎓</div>
        <h2 className="tab-title">Mastery Test</h2>
        <p className="tab-sub">
          A certification-style assessment covering everything you've completed so far.
          Questions are randomized every attempt, so no two tests are the same.
        </p>

        <ul className="mastery-intro-list">
          <li>{MASTERY_QUESTION_COUNT} questions mixed from every completed lesson</li>
          <li>See a sign and pick its meaning, or pick the right sign for a word</li>
          <li>Score 90%+ to mark a lesson as Mastered</li>
        </ul>

        {masteryData.attempts > 0 && (
          <div className="mastery-intro-history">
            <span>Best score: <b>{masteryData.bestScore}%</b></span>
            <span>Attempts: <b>{masteryData.attempts}</b></span>
          </div>
        )}

        {completedLessons.length === 0 ? (
          <p className="mastery-intro-locked">Complete at least one lesson to unlock the Mastery Test.</p>
        ) : (
          <button type="button" className="btn btn-primary btn-block" onClick={beginTest}>
            Start Mastery Test
          </button>
        )}
      </div>
    </div>
  );
}
