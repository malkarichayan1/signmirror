// Mastery Test scoring engine — pure functions, no persistence. Turns a
// question set + the learner's answers into a results summary.

import { MASTERY_BADGES } from '../config.js';

// Human-facing label for each question type, used for the secondary
// "by skill" breakdown on the results screen.
export const QUESTION_TYPE_LABELS = {
  'meaning-to-sign': 'Vocabulary',
  'sign-to-meaning': 'Recognition',
  perform: 'Speed',
};

// answer shape depends on question.type:
//   choice types -> { choiceId }
//   perform      -> { passed }
export function scoreQuestion(question, answer) {
  if (question.type === 'perform') {
    return { correct: Boolean(answer?.passed) };
  }
  return { correct: answer?.choiceId === question.correctChoiceId };
}

function tallyBy(questions, answers, keyOf, labelOf) {
  const byKey = new Map();
  for (const q of questions) {
    const key = keyOf(q);
    const entry = byKey.get(key) ?? { key, label: labelOf(q), correct: 0, total: 0 };
    entry.total += 1;
    if (scoreQuestion(q, answers[q.id]).correct) entry.correct += 1;
    byKey.set(key, entry);
  }
  return [...byKey.values()].map(e => ({ ...e, pct: e.total > 0 ? Math.round((e.correct / e.total) * 100) : 0 }));
}

// questions: Question[] from generateMasteryTest
// answers:   { [questionId]: answer }
// elapsedMs: total time taken for the attempt
export function computeResults(questions, answers, elapsedMs) {
  const correctCount = questions.filter(q => scoreQuestion(q, answers[q.id]).correct).length;
  const total = questions.length;
  const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const lessonBreakdown = tallyBy(questions, answers, q => q.lessonId, q => q.lessonTitle);
  const typeBreakdown = tallyBy(
    questions,
    answers,
    q => q.type,
    q => QUESTION_TYPE_LABELS[q.type] ?? q.type
  );

  const reviewRecommendations = lessonBreakdown
    .map(l => ({ ...l, incorrect: l.total - l.correct }))
    .filter(l => l.incorrect > 0)
    .sort((a, b) => b.incorrect - a.incorrect);

  return { scorePct, correctCount, total, elapsedMs, lessonBreakdown, typeBreakdown, reviewRecommendations };
}

// MASTERY_BADGES is ordered highest-threshold-first; returns null if the
// score doesn't clear even the lowest tier.
export function badgeForScore(scorePct) {
  return MASTERY_BADGES.find(b => scorePct >= b.min) ?? null;
}
