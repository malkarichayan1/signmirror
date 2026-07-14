const STORAGE_KEY = 'signmirror_progress';

// Migrates old schema { [lessonId]: { [signId]: true } } to new schema.
function migrate(raw) {
  const result = {};
  for (const [lessonId, lessonData] of Object.entries(raw)) {
    if (lessonData && typeof lessonData.completed !== 'undefined') {
      result[lessonId] = lessonData;
    } else if (lessonData && typeof lessonData === 'object') {
      // Old flat format: { signId: true, ... }
      const signs = {};
      for (const [signId, val] of Object.entries(lessonData)) {
        if (val === true) {
          signs[signId] = { attempts: 1, passed: true, skipped: false };
        }
      }
      result[lessonId] = { completed: false, completedAt: null, signs };
    }
  }
  return result;
}

export function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
    return migrate(raw);
  } catch {
    return {};
  }
}

export function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function ensureLesson(progress, lessonId) {
  if (!progress[lessonId]) {
    progress[lessonId] = { completed: false, completedAt: null, signs: {} };
  }
}

export function recordAttempt(lessonId, signId, { passed = false, skipped = false } = {}) {
  const progress = loadProgress();
  ensureLesson(progress, lessonId);
  const prev = progress[lessonId].signs[signId] ?? { attempts: 0, passed: false, skipped: false };
  progress[lessonId].signs[signId] = {
    attempts: prev.attempts + 1,
    passed: prev.passed || passed,
    skipped: prev.skipped || skipped,
  };
  saveProgress(progress);
}

export function markLessonComplete(lessonId) {
  const progress = loadProgress();
  ensureLesson(progress, lessonId);
  progress[lessonId].completed = true;
  progress[lessonId].completedAt = Date.now();
  saveProgress(progress);
}

// All lessons (getting started, alphabet, numbers) are beginner-level and
// independent of each other, so nothing is gated behind prior completion.
export function isLessonUnlocked() {
  return true;
}

// Signs the user attempted or skipped but never passed, across all lessons.
export function getMistakeSigns(lessons, progress) {
  const seen = new Set();
  const mistakes = [];
  for (const lesson of lessons) {
    const signsProg = progress[lesson.id]?.signs ?? {};
    for (const sign of lesson.signs) {
      const record = signsProg[sign.id];
      if (!record || record.passed || seen.has(sign.id)) continue;
      if (record.skipped || record.attempts > 0) {
        seen.add(sign.id);
        mistakes.push(sign);
      }
    }
  }
  return mistakes;
}

export function exportProgress() {
  return JSON.stringify(loadProgress(), null, 2);
}

export function importProgress(json) {
  try {
    const data = JSON.parse(json);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;
    saveProgress(data);
    return true;
  } catch {
    return false;
  }
}
