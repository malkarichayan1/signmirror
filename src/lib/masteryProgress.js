// Mastery Test persistence + lesson mastery evaluation. Stored separately
// from lesson-completion progress (progress.js) and XP/streaks (stats.js),
// matching this app's one-concern-per-file convention.

import {
  MASTERY_PASS_THRESHOLD,
  MASTERY_LESSON_POOR_THRESHOLD,
  MASTERY_HISTORY_LIMIT,
} from '../config.js';

const STORAGE_KEY = 'signmirror_mastery';

const DEFAULT_DATA = {
  bestScore: null,
  lastAttemptAt: null,
  lastBadge: null,
  attempts: 0,
  lessonMastery: {}, // lessonId -> 'mastered' | 'needs-review'
  history: [],
};

export function loadMasteryData() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_DATA };
    return {
      ...DEFAULT_DATA,
      ...raw,
      lessonMastery: raw.lessonMastery && typeof raw.lessonMastery === 'object' ? raw.lessonMastery : {},
      history: Array.isArray(raw.history) ? raw.history : [],
    };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

function saveMasteryData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// A lesson's most recent prior per-lesson score from history, or null if
// this is the first attempt covering that lesson.
function priorLessonPct(history, lessonId) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i].lessonBreakdown?.find(l => l.key === lessonId);
    if (entry) return entry.pct;
  }
  return null;
}

// Applies one completed attempt: updates best score/badge/attempt count,
// appends history, and evaluates per-lesson mastery. A lesson is promoted
// to Mastered when the overall attempt passes AND that lesson individually
// scored at/above threshold. A previously Mastered lesson is only
// downgraded to Needs Review after two consecutive poor showings, so a
// single bad question doesn't erase mastery.
export function recordMasteryAttempt(results, badge) {
  const data = loadMasteryData();
  const priorHistory = data.history;

  data.attempts += 1;
  data.lastAttemptAt = Date.now();
  data.lastBadge = badge?.id ?? null;
  if (data.bestScore === null || results.scorePct > data.bestScore) {
    data.bestScore = results.scorePct;
  }

  const passedOverall = results.scorePct >= MASTERY_PASS_THRESHOLD;

  for (const lesson of results.lessonBreakdown) {
    const wasMastered = data.lessonMastery[lesson.key] === 'mastered';

    if (passedOverall && lesson.pct >= MASTERY_PASS_THRESHOLD) {
      data.lessonMastery[lesson.key] = 'mastered';
      continue;
    }

    if (wasMastered && lesson.pct < MASTERY_LESSON_POOR_THRESHOLD) {
      const prior = priorLessonPct(priorHistory, lesson.key);
      if (prior !== null && prior < MASTERY_LESSON_POOR_THRESHOLD) {
        data.lessonMastery[lesson.key] = 'needs-review';
      }
    }
  }

  data.history = [
    ...priorHistory,
    {
      date: Date.now(),
      score: results.scorePct,
      correct: results.correctCount,
      total: results.total,
      timeMs: results.elapsedMs,
      badge: badge?.id ?? null,
      lessonBreakdown: results.lessonBreakdown,
    },
  ].slice(-MASTERY_HISTORY_LIMIT);

  saveMasteryData(data);
  return data;
}

// Three-state (plus not-started) lesson display state used by lesson cards.
export function getLessonDisplayState(lessonId, progress, masteryData) {
  const masteryState = masteryData.lessonMastery[lessonId];
  if (masteryState === 'needs-review') return 'needs-review';
  if (masteryState === 'mastered') return 'mastered';
  if (progress[lessonId]?.completed) return 'completed';
  return 'in-progress';
}
