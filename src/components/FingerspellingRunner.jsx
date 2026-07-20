import { useState, useMemo, useCallback, useEffect } from 'react';
import WebcamView from './WebcamView.jsx';
import FeedbackPanel from './FeedbackPanel.jsx';
import ExpandableHandPreview from './ExpandableHandPreview.jsx';
import { HoldRing } from './LessonRunner.jsx';
import { useHoldToPass } from '../lib/useHoldToPass.js';
import { getSign } from '../data/signLoader.js';
import { pickRandomWord } from '../data/fingerspellingWords.js';
import { recordSignResult, awardBonusXp } from '../lib/stats.js';
import { FINGERSPELLING_WORD_BONUS_XP } from '../config.js';
import './LessonRunner.css';
import './FingerspellingRunner.css';

export default function FingerspellingRunner({ onExit }) {
  const [word, setWord] = useState(() => pickRandomWord());
  const [letterIdx, setLetterIdx] = useState(0);
  const [phase, setPhase] = useState('spelling'); // spelling | wordComplete
  const [wordsCompleted, setWordsCompleted] = useState(0);

  const letters = useMemo(() => word.split(''), [word]);
  const currentLetter = letters[letterIdx] ?? null;
  const currentSign = useMemo(
    () => (currentLetter ? getSign(currentLetter) : null),
    [currentLetter],
  );

  const handlePassLetter = useCallback(() => {
    recordSignResult({ passed: true, signName: currentSign.name });
    setLetterIdx((i) => i + 1);
  }, [currentSign]);

  const { holdPct, matchResult, handleLandmarks } = useHoldToPass(
    currentSign?.landmarks ?? null,
    handlePassLetter,
  );

  useEffect(() => {
    if (letterIdx > 0 && letterIdx >= letters.length) {
      awardBonusXp(FINGERSPELLING_WORD_BONUS_XP);
      setWordsCompleted((c) => c + 1);
      setPhase('wordComplete');
    }
  }, [letterIdx, letters.length]);

  function nextWord() {
    setWord(pickRandomWord(word));
    setLetterIdx(0);
    setPhase('spelling');
  }

  function skipLetter() {
    setLetterIdx((i) => i + 1);
  }

  if (phase === 'wordComplete') {
    return (
      <div className="lesson-runner-wrap">
        <div className="fs-complete">
          <div className="fs-complete-badge" aria-hidden="true">✋</div>
          <h2 className="complete-title">Nice spelling!</h2>
          <p className="complete-subtitle">
            You fingerspelled <b>{word.toUpperCase()}</b>
          </p>
          <p className="fs-session-count">{wordsCompleted} word{wordsCompleted !== 1 ? 's' : ''} this session</p>
          <div className="complete-actions">
            <button className="btn-secondary" onClick={onExit}>Done</button>
            <button className="btn-primary" onClick={nextWord}>Next Word →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-runner-wrap">
      <div className="fs-word-row" aria-label={`Spelling ${word}`}>
        {letters.map((ch, i) => (
          <span
            key={i}
            className={`fs-letter-tile ${i < letterIdx ? 'done' : i === letterIdx ? 'current' : 'pending'}`}
          >
            {ch.toUpperCase()}
          </span>
        ))}
      </div>

      <div className="lesson-runner">
        <WebcamView
          onLandmarks={handleLandmarks}
          referenceLandmarks={currentSign?.landmarks ?? null}
        />

        <div className="runner-sidebar">
          <div className="sign-counter">
            Letter {Math.min(letterIdx + 1, letters.length)} of {letters.length}
          </div>

          {currentSign && (
            <ExpandableHandPreview
              frames={[currentSign.landmarks]}
              label={currentSign.name}
            />
          )}

          <div className={`hold-wrap ${holdPct > 0 ? 'active' : ''}`}>
            <HoldRing pct={holdPct} />
            {holdPct > 0 && <span className="hold-label">{Math.round(holdPct * 100)}%</span>}
          </div>

          <FeedbackPanel distance={matchResult.distance} pass={matchResult.pass} />

          <button className="btn-ghost fs-skip-btn" onClick={skipLetter}>
            Skip letter
          </button>
        </div>
      </div>
    </div>
  );
}
