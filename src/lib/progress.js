const STORAGE_KEY = 'signmirror_progress';

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

export function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function markSignComplete(lessonId, signId) {
  const progress = loadProgress();
  if (!progress[lessonId]) progress[lessonId] = {};
  progress[lessonId][signId] = true;
  saveProgress(progress);
}

export function isSignComplete(lessonId, signId) {
  return Boolean(loadProgress()[lessonId]?.[signId]);
}