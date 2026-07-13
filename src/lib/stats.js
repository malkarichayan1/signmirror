// Gamification state: XP, daily activity, streaks, levels, and app settings.
// Stored in localStorage alongside (but separate from) lesson progress.

const STATS_KEY = 'signmirror_stats';
const SETTINGS_KEY = 'signmirror_settings';

export const XP_PER_SIGN = 10;
export const LESSON_BONUS_XP = 20;
export const LEVEL_SPAN_XP = 100;
export const RECENT_LIMIT = 8;

const EMPTY_STATS = { totalXp: 0, days: {}, recent: [] };
const DEFAULT_SETTINGS = { theme: null, name: '', dailyGoalXp: 30, onboarded: false };

// Local-timezone day key, e.g. '2026-07-13'.
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function loadStats() {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY));
    if (!raw || typeof raw !== 'object') return { ...EMPTY_STATS };
    return {
      totalXp: Number(raw.totalXp) || 0,
      days: raw.days && typeof raw.days === 'object' ? raw.days : {},
      recent: Array.isArray(raw.recent) ? raw.recent : [],
    };
  } catch {
    return { ...EMPTY_STATS };
  }
}

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function withDay(stats, key, updater) {
  const day = stats.days[key] ?? { xp: 0, passed: 0, attempts: 0 };
  return { ...stats, days: { ...stats.days, [key]: updater(day) } };
}

// Records one sign attempt. Awards XP when passed and tracks accuracy.
export function recordSignResult({ passed, signName }) {
  const key = dayKey();
  const gained = passed ? XP_PER_SIGN : 0;
  let next = withDay(loadStats(), key, day => ({
    xp: day.xp + gained,
    passed: day.passed + (passed ? 1 : 0),
    attempts: day.attempts + 1,
  }));
  next = { ...next, totalXp: next.totalXp + gained };
  if (passed && signName) {
    const recent = [signName, ...next.recent.filter(n => n !== signName)];
    next = { ...next, recent: recent.slice(0, RECENT_LIMIT) };
  }
  saveStats(next);
  return next;
}

// Flat XP bonus (e.g. completing a lesson).
export function awardBonusXp(amount) {
  const key = dayKey();
  let next = withDay(loadStats(), key, day => ({ ...day, xp: day.xp + amount }));
  next = { ...next, totalXp: next.totalXp + amount };
  saveStats(next);
  return next;
}

export function getXpToday(stats) {
  return stats.days[dayKey()]?.xp ?? 0;
}

// Consecutive active days ending today (or yesterday, so a streak
// isn't shown as broken before today's practice).
export function getStreak(stats) {
  let streak = 0;
  const cursor = new Date();
  if (!stats.days[dayKey(cursor)]?.xp) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (stats.days[dayKey(cursor)]?.xp > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getLevel(totalXp) {
  const level = Math.floor(totalXp / LEVEL_SPAN_XP) + 1;
  return { level, intoLevel: totalXp % LEVEL_SPAN_XP, span: LEVEL_SPAN_XP };
}

// Last `n` days, oldest first: [{ key, label, xp }]
export function getRecentDays(stats, n = 7) {
  const out = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - (n - 1));
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  for (let i = 0; i < n; i += 1) {
    const key = dayKey(cursor);
    out.push({ key, label: labels[cursor.getDay()], xp: stats.days[key]?.xp ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

// Overall accuracy in [0, 1], or null before any attempts.
export function getAccuracy(stats) {
  let passed = 0;
  let attempts = 0;
  for (const day of Object.values(stats.days)) {
    passed += day.passed ?? 0;
    attempts += day.attempts ?? 0;
  }
  return attempts > 0 ? passed / attempts : null;
}

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...raw };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}
