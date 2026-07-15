// Mastery Test generation — builds a randomized question set from every
// lesson the learner has completed. Kept separate from scoring and
// persistence so each concern can change independently.

import {
  MASTERY_QUESTION_COUNT,
  MASTERY_QUESTION_TYPE_WEIGHTS,
  MASTERY_MAX_PERFORM_QUESTIONS,
  MASTERY_MIN_POOL_FOR_CHOICES,
} from '../config.js';

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pickDistractors(pool, excludeId, count) {
  return shuffle(pool.filter(s => s.id !== excludeId)).slice(0, count);
}

// Multiple-choice questions need at least one correct + N-1 wrong answers.
// Shrinks below 4 choices if the completed-lesson pool is too small, rather
// than failing to generate a question at all. Each choice carries the full
// sign object (not just id/label) so "meaning-to-sign" questions can render
// a hand preview per choice, not just text.
function buildChoices(correctSign, pool) {
  const numChoices = Math.min(4, pool.length);
  const distractors = pickDistractors(pool, correctSign.id, numChoices - 1);
  return shuffle([...distractors, correctSign]).map(s => ({ id: s.id, label: s.name, sign: s }));
}

// Registry of question-type builders. Add a new entry here (plus a renderer
// in MasteryQuestion.jsx) to introduce a new question type without touching
// the selection/generation logic below.
const QUESTION_BUILDERS = {
  'sign-to-meaning': (sign, pool) => ({
    choices: buildChoices(sign, pool),
    correctChoiceId: sign.id,
  }),
  'meaning-to-sign': (sign, pool) => ({
    choices: buildChoices(sign, pool),
    correctChoiceId: sign.id,
  }),
  perform: () => ({}),
};

function pickQuestionType(pool, performBudget) {
  if (pool.length < MASTERY_MIN_POOL_FOR_CHOICES) return 'perform';

  const r = Math.random();
  if (performBudget.remaining > 0 && r < MASTERY_QUESTION_TYPE_WEIGHTS.perform) {
    performBudget.remaining -= 1;
    return 'perform';
  }
  const signToMeaningCutoff = MASTERY_QUESTION_TYPE_WEIGHTS.perform + MASTERY_QUESTION_TYPE_WEIGHTS.signToMeaning;
  return r < signToMeaningCutoff ? 'sign-to-meaning' : 'meaning-to-sign';
}

// Interleaves each completed lesson's (shuffled) signs round-robin style so
// no single lesson dominates the question order — signs repeat only once
// every lesson's pool has been exhausted at least once.
function interleaveByLesson(lessons, count) {
  const perLesson = lessons
    .filter(l => l.signs.length > 0)
    .map(l => shuffle(l.signs.map(s => ({ ...s, lessonId: l.id, lessonTitle: l.title }))));
  if (perLesson.length === 0) return [];

  const selected = [];
  let round = 0;
  while (selected.length < count) {
    const before = selected.length;
    for (const signs of perLesson) {
      if (selected.length >= count) break;
      selected.push(signs[round % signs.length]);
    }
    if (selected.length === before) break; // safety: no lesson had any signs
    round += 1;
  }
  return selected;
}

// completedLessons: [{ id, title, signs: SignObject[] }] — already resolved
// full sign objects (see data/signLoader.js), matching what App.jsx builds.
export function generateMasteryTest(completedLessons, { questionCount = MASTERY_QUESTION_COUNT } = {}) {
  const pool = completedLessons.flatMap(l =>
    l.signs.map(s => ({ ...s, lessonId: l.id, lessonTitle: l.title }))
  );
  if (pool.length === 0) return [];

  const selectedSigns = interleaveByLesson(completedLessons, questionCount);
  const performBudget = { remaining: Math.min(MASTERY_MAX_PERFORM_QUESTIONS, selectedSigns.length) };

  return selectedSigns.map((sign, i) => {
    const type = pickQuestionType(pool, performBudget);
    const builder = QUESTION_BUILDERS[type] ?? QUESTION_BUILDERS.perform;
    return {
      id: `q${i}-${sign.id}`,
      type,
      signId: sign.id,
      lessonId: sign.lessonId,
      lessonTitle: sign.lessonTitle,
      sign,
      ...builder(sign, pool),
    };
  });
}
