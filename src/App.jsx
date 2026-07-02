import { useState, useCallback } from 'react';
import WebcamView from './components/WebcamView.jsx';
import SignPrompt from './components/SignPrompt.jsx';
import FeedbackPanel from './components/FeedbackPanel.jsx';
import LessonList from './components/LessonList.jsx';
import { matchPose } from './lib/matcher.js';
import { LESSONS } from './data/lessons.js';
import { markSignComplete } from './lib/progress.js';
import './App.css';

export default function App() {
  const [screen, setScreen] = useState('list');
  const [currentLesson, setCurrentLesson] = useState(null);
  const [signIndex, setSignIndex] = useState(0);
  const [matchResult, setMatchResult] = useState({ distance: null, pass: false });

  const handleLandmarks = useCallback(
    (normalized) => {
      if (!currentLesson || !normalized) {
        setMatchResult({ distance: null, pass: false });
        return;
      }
      const sign = currentLesson.signs[signIndex];
      const result = matchPose(normalized, sign.landmarks);
      setMatchResult(result);

      if (result.pass) markSignComplete(currentLesson.id, sign.id);
    },
    [currentLesson, signIndex]
  );

  function startLesson(lesson) {
    setCurrentLesson(lesson);
    setSignIndex(0);
    setMatchResult({ distance: null, pass: false });
    setScreen('lesson');
  }

  function handleNext() {
    const next = signIndex + 1;
    if (next >= currentLesson.signs.length) {
      setScreen('list');
      setCurrentLesson(null);
    } else {
      setSignIndex(next);
      setMatchResult({ distance: null, pass: false });
    }
  }

  if (screen === 'list') {
    return (
      <div className="app">
        <header className="app-header">
          <span className="app-title">SignMirror</span>
          <span className="app-subtitle">Learn ASL with live feedback</span>
        </header>
        <LessonList lessons={LESSONS} onSelect={startLesson} />
      </div>
    );
  }

  const sign = currentLesson.signs[signIndex];
  const isLast = signIndex + 1 >= currentLesson.signs.length;

  return (
    <div className="app">
      <header className="app-header">
        <button className="back-btn" onClick={() => setScreen('list')}>
          ← Back
        </button>
        <span className="app-title">{currentLesson.title}</span>
        <span className="sign-counter">
          {signIndex + 1} / {currentLesson.signs.length}
        </span>
      </header>
      <div className="lesson-view">
        <WebcamView onLandmarks={handleLandmarks} />
        <div className="lesson-sidebar">
          <SignPrompt sign={sign} />
          <FeedbackPanel
            distance={matchResult.distance}
            pass={matchResult.pass}
          />
          <button className="next-btn" onClick={handleNext}>
            {isLast ? 'Finish Lesson' : 'Next Sign →'}
          </button>
        </div>
      </div>
    </div>
  );
}
