import { useState, useMemo, useEffect } from 'react';
import HomeScreen from './components/HomeScreen.jsx';
import ExploreScreen from './components/ExploreScreen.jsx';
import PracticeScreen from './components/PracticeScreen.jsx';
import ProgressScreen from './components/ProgressScreen.jsx';
import ProfileScreen from './components/ProfileScreen.jsx';
import MasteryScreen from './components/MasteryScreen.jsx';
import Onboarding from './components/Onboarding.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import LessonRunner from './components/LessonRunner.jsx';
import FingerspellingRunner from './components/FingerspellingRunner.jsx';
import DictionaryScreen from './components/DictionaryScreen.jsx';
import {
  loadProgress,
  isLessonUnlocked,
  exportProgress,
  importProgress,
  getMistakeSigns,
} from './lib/progress.js';
import { loadStats, loadSettings, saveSettings } from './lib/stats.js';
import { watchAuthState, signOutUser } from './lib/auth.js';
import { pushLocalData } from './lib/cloudSync.js';
import { isFirebaseConfigured } from './lib/firebase.js';
import { getSigns } from './data/signLoader.js';
import LESSONS_MANIFEST from './data/lessons.json';
import './App.css';

const AUTH_SKIPPED_KEY = 'signmirror_auth_skipped';

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
    id: 'mastery',
    label: 'Mastery',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2 15 8.5 22 9.5 17 14.3 18.2 21.3 12 18 5.8 21.3 7 14.3 2 9.5 9 8.5Z" />
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
  const [fingerspellingOpen, setFingerspellingOpen] = useState(false);
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [dataKey, setDataKey] = useState(0);
  const [settings, setSettings] = useState(() => loadSettings());

  // undefined = still checking; null = signed out; object = signed in.
  const [user, setUser] = useState(() => (isFirebaseConfigured ? undefined : null));
  const [authSkipped, setAuthSkipped] = useState(
    () => localStorage.getItem(AUTH_SKIPPED_KEY) === 'true'
  );

  const progress = useMemo(() => loadProgress(), [dataKey]);
  const stats = useMemo(() => loadStats(), [dataKey]);
  const mistakeSigns = useMemo(() => getMistakeSigns(LESSONS, progress), [progress]);

  useEffect(() => {
    if (settings.theme) {
      document.documentElement.dataset.theme = settings.theme;
    }
  }, [settings.theme]);

  useEffect(() => {
    const unsubscribe = watchAuthState(nextUser => {
      setUser(nextUser);
      if (nextUser) setDataKey(k => k + 1); // reload state after a cloud pull on sign-in
    });
    return unsubscribe;
  }, []);

  // Keep the cloud copy current while signed in — fires whenever local
  // progress/stats/mastery/settings change (dataKey bump) or settings save.
  useEffect(() => {
    if (user) pushLocalData(user.uid);
  }, [user, dataKey, settings]);

  function handleSignOut() {
    signOutUser();
    localStorage.removeItem(AUTH_SKIPPED_KEY);
    setAuthSkipped(false);
  }

  function handleSkipAuth() {
    localStorage.setItem(AUTH_SKIPPED_KEY, 'true');
    setAuthSkipped(true);
  }

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

  function exitFingerspelling() {
    setFingerspellingOpen(false);
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

  if (user === undefined) {
    return (
      <div className="shell auth-loading" role="status" aria-live="polite">
        <p>Loading…</p>
      </div>
    );
  }

  if (user === null && !authSkipped && isFirebaseConfigured) {
    return (
      <AuthScreen
        onAuthed={nextUser => { setUser(nextUser); setDataKey(k => k + 1); }}
        onSkip={handleSkipAuth}
      />
    );
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

  if (fingerspellingOpen) {
    return (
      <div className="shell">
        <div className="runner-bar">
          <button className="runner-close" onClick={exitFingerspelling} aria-label="Exit fingerspelling trainer">
            ✕
          </button>
          <span className="runner-bar-title">Fingerspelling Trainer</span>
        </div>
        <FingerspellingRunner onExit={exitFingerspelling} />
      </div>
    );
  }

  if (dictionaryOpen) {
    return (
      <div className="shell">
        <div className="runner-bar">
          <button className="runner-close" onClick={() => setDictionaryOpen(false)} aria-label="Close dictionary">
            ✕
          </button>
          <span className="runner-bar-title">Dictionary</span>
        </div>
        <DictionaryScreen />
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
          onOpenFingerspelling={() => setFingerspellingOpen(true)}
        />
      )}
      {tab === 'explore' && (
        <ExploreScreen
          lessons={LESSONS}
          progress={progress}
          onStartLesson={startLesson}
          onOpenDictionary={() => setDictionaryOpen(true)}
        />
      )}
      {tab === 'progress' && (
        <ProgressScreen lessons={LESSONS} progress={progress} stats={stats} />
      )}
      {tab === 'mastery' && (
        <MasteryScreen
          lessons={LESSONS}
          progress={progress}
          onAttemptRecorded={() => setDataKey(k => k + 1)}
          onDone={() => setTab('learn')}
        />
      )}
      {tab === 'profile' && (
        <ProfileScreen
          settings={settings}
          stats={stats}
          user={user}
          onUpdateSettings={updateSettings}
          onExport={handleExport}
          onImport={handleImport}
          onReset={handleReset}
          onSignOut={handleSignOut}
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
