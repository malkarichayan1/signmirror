import { useState, useMemo, useEffect } from 'react';
import HomeScreen from './components/HomeScreen.jsx';
import ExploreScreen from './components/ExploreScreen.jsx';
import PracticeScreen from './components/PracticeScreen.jsx';
import ProgressScreen from './components/ProgressScreen.jsx';
import ProfileScreen from './components/ProfileScreen.jsx';
import Onboarding from './components/Onboarding.jsx';
import LessonRunner from './components/LessonRunner.jsx';
import {
  loadProgress,
  isLessonUnlocked,
  exportProgress,
  importProgress,
  getMistakeSigns,
} from './lib/progress.js';
import { loadStats, loadSettings, saveSettings } from './lib/stats.js';
import { getSigns } from './data/signLoader.js';
import LESSONS_MANIFEST from './data/lessons.json';
import './App.css';

// Resolve sign ID strings in the manifest to full sign data objects.
const LESSONS = LESSONS_MANIFEST.map(lesson => ({
  ...lesson,
  signs: getSigns(lesson.signs),
}));

const NAV_ITEMS = [
  {
    id: 'learn',
    label: 'Learn',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    id: 'practice',
    label: 'Practice',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2.5" y="6" width="14" height="12" rx="3" />
        <path d="m16.5 10.5 5-3v9l-5-3" />
      </svg>
    ),
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2 5-5 2 2-5z" />
      </svg>
    ),
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 20V10" />
        <path d="M10 20V4" />
        <path d="M16 20v-7" />
        <path d="M22 20H2" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
      </svg>
    ),
  },
];

export default function App() {
  const [tab, setTab] = useState('learn');
  const [runningLesson, setRunningLesson] = useState(null);
  const [dataKey, setDataKey] = useState(0);
  const [settings, setSettings] = useState(() => loadSettings());

  const progress = useMemo(() => loadProgress(), [dataKey]);
  const stats = useMemo(() => loadStats(), [dataKey]);
  const mistakeSigns = useMemo(() => getMistakeSigns(LESSONS, progress), [progress]);

  useEffect(() => {
    if (settings.theme) {
      document.documentElement.dataset.theme = settings.theme;
    }
  }, [settings.theme]);

  function updateSettings(next) {
    setSettings(saveSettings(next));
  }

  function startLesson(lesson) {
    if (!isLessonUnlocked(lesson, progress)) return;
    setRunningLesson(lesson);
  }

  function startMistakePractice() {
    if (mistakeSigns.length === 0) return;
    setRunningLesson({
      id: 'practice-mistakes',
      title: 'Practice mistakes',
      signs: mistakeSigns,
      isPractice: true,
    });
  }

  function exitLesson() {
    setRunningLesson(null);
    setDataKey(k => k + 1);
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
          setDataKey(k => k + 1);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function handleReset() {
    const confirmed = window.confirm(
      'Reset all progress, XP and streaks? This cannot be undone.'
    );
    if (!confirmed) return;
    localStorage.removeItem('signmirror_progress');
    localStorage.removeItem('signmirror_stats');
    setDataKey(k => k + 1);
  }

  if (!settings.onboarded) {
    return (
      <Onboarding
        onDone={({ name, dailyGoalXp }) =>
          updateSettings({ ...settings, name, dailyGoalXp, onboarded: true })
        }
      />
    );
  }

  if (runningLesson) {
    return (
      <div className="shell">
        <div className="runner-bar">
          <button className="runner-close" onClick={exitLesson} aria-label="Exit lesson">
            ✕
          </button>
          <span className="runner-bar-title">{runningLesson.title}</span>
        </div>
        <LessonRunner lesson={runningLesson} onComplete={exitLesson} />
      </div>
    );
  }

  const continueLesson = LESSONS.find(
    l => isLessonUnlocked(l, progress) && !progress[l.id]?.completed
  );
  const completedLessons = LESSONS.filter(l => progress[l.id]?.completed);

  return (
    <div className="shell">
      {tab === 'learn' && (
        <HomeScreen
          name={settings.name}
          lessons={LESSONS}
          progress={progress}
          stats={stats}
          dailyGoalXp={settings.dailyGoalXp}
          mistakeCount={mistakeSigns.length}
          onStartLesson={startLesson}
          onPracticeMistakes={startMistakePractice}
          onExplore={() => setTab('explore')}
        />
      )}
      {tab === 'practice' && (
        <PracticeScreen
          continueLesson={continueLesson}
          completedLessons={completedLessons}
          mistakeCount={mistakeSigns.length}
          onStartLesson={startLesson}
          onPracticeMistakes={startMistakePractice}
        />
      )}
      {tab === 'explore' && (
        <ExploreScreen lessons={LESSONS} progress={progress} onStartLesson={startLesson} />
      )}
      {tab === 'progress' && (
        <ProgressScreen lessons={LESSONS} progress={progress} stats={stats} />
      )}
      {tab === 'profile' && (
        <ProfileScreen
          settings={settings}
          stats={stats}
          onUpdateSettings={updateSettings}
          onExport={handleExport}
          onImport={handleImport}
          onReset={handleReset}
        />
      )}

      <nav className="bottom-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-item ${tab === item.id ? 'active' : ''}`}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => setTab(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
