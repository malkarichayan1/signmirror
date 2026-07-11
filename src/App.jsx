import { useState, useMemo } from 'react';
import LessonList from './components/LessonList.jsx';
import LessonRunner from './components/LessonRunner.jsx';
import { loadProgress, isLessonUnlocked, exportProgress, importProgress } from './lib/progress.js';
import { getSigns } from './data/signLoader.js';
import LESSONS_MANIFEST from './data/lessons.json';
import './App.css';

// Resolve sign ID strings in the manifest to full sign data objects.
const LESSONS = LESSONS_MANIFEST.map(lesson => ({
  ...lesson,
  signs: getSigns(lesson.signs),
}));

export default function App() {
  const [screen, setScreen] = useState('list');
  const [currentLesson, setCurrentLesson] = useState(null);
  const [progressKey, setProgressKey] = useState(0);

  const progress = useMemo(() => loadProgress(), [progressKey]);

  function handleSelectLesson(lesson) {
    if (!isLessonUnlocked(lesson, progress)) return;
    setCurrentLesson(lesson);
    setScreen('runner');
  }

  function handleLessonComplete() {
    setProgressKey(k => k + 1);
    setScreen('list');
    setCurrentLesson(null);
  }

  function handleBack() {
    setScreen('list');
    setCurrentLesson(null);
  }

  function handleExport() {
    const json = exportProgress();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signmirror-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        if (importProgress(ev.target.result)) {
          setProgressKey(k => k + 1);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  if (screen === 'runner' && currentLesson) {
    return (
      <div className="app">
        <header className="app-header">
          <button className="back-btn" onClick={handleBack}>&#8592; Back</button>
          <span className="app-title">{currentLesson.title}</span>
        </header>
        <LessonRunner lesson={currentLesson} onComplete={handleLessonComplete} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">SignMirror</span>
        <span className="app-subtitle">Learn ASL with live feedback</span>
        <div className="progress-controls">
          <button className="btn-small" onClick={handleExport}>Export</button>
          <button className="btn-small" onClick={handleImport}>Import</button>
        </div>
      </header>
      <LessonList lessons={LESSONS} progress={progress} onSelect={handleSelectLesson} />
    </div>
  );
}
