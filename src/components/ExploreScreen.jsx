import { isLessonUnlocked } from '../lib/progress.js';
import './TabScreens.css';

const CATEGORIES = [
  {
    id: 'basics',
    title: 'Everyday Basics',
    desc: 'Greetings and essentials',
    emoji: '👋',
    grad: 'grad-indigo',
    match: id => id === 'getting-started',
  },
  {
    id: 'alphabet',
    title: 'Alphabet',
    desc: 'Fingerspell A through Z',
    emoji: '🔤',
    grad: 'grad-sunset',
    match: id => id.startsWith('alphabet'),
  },
  {
    id: 'numbers',
    title: 'Numbers',
    desc: 'Count from 1 to 10',
    emoji: '🔢',
    grad: 'grad-emerald',
    match: id => id.startsWith('numbers'),
  },
  {
    id: 'colors',
    title: 'Colors',
    desc: 'Sign your favorite colors',
    emoji: '🎨',
    grad: 'grad-rose',
    match: id => id === 'colors',
  },
  {
    id: 'family',
    title: 'Family',
    desc: 'Sign your family members',
    emoji: '👪',
    grad: 'grad-amber',
    match: id => id === 'family',
  },
  {
    id: 'animals',
    title: 'Animals',
    desc: 'Sign common animals',
    emoji: '🐾',
    grad: 'grad-teal',
    match: id => id === 'animals',
  },
  {
    id: 'feelings',
    title: 'Feelings',
    desc: 'Express how you feel',
    emoji: '😊',
    grad: 'grad-violet',
    match: id => id === 'feelings',
  },
];

export default function ExploreScreen({ lessons, progress, onStartLesson }) {
  return (
    <div className="screen">
      <h2 className="tab-title">Explore</h2>
      <p className="tab-sub">Browse every lesson by category.</p>

      {CATEGORIES.map(cat => {
        const catLessons = lessons.filter(l => cat.match(l.id));
        if (catLessons.length === 0) return null;
        const doneCount = catLessons.filter(l => progress[l.id]?.completed).length;

        return (
          <section key={cat.id} aria-label={cat.title}>
            <div className={`cat-header ${cat.grad}`}>
              <h3>{cat.title}</h3>
              <p>
                {cat.desc} · {doneCount}/{catLessons.length} complete
              </p>
              <span className="cat-emoji" aria-hidden="true">
                {cat.emoji}
              </span>
            </div>
            <div className="lesson-grid">
              {catLessons.map(lesson => {
                const unlocked = isLessonUnlocked(lesson, progress);
                const isComplete = Boolean(progress[lesson.id]?.completed);
                const done = lesson.signs.filter(
                  s => progress[lesson.id]?.signs?.[s.id]?.passed
                ).length;
                return (
                  <button
                    key={lesson.id}
                    className={`lesson-tile ${isComplete ? 'done' : ''}`}
                    disabled={!unlocked}
                    onClick={() => unlocked && onStartLesson(lesson)}
                    aria-label={
                      !unlocked
                        ? `${lesson.title} — locked`
                        : isComplete
                          ? `${lesson.title} — completed`
                          : lesson.title
                    }
                  >
                    <span className="lesson-tile-head">
                      <b>{lesson.title}</b>
                      {!unlocked && (
                        <span className="lesson-tile-badge" aria-hidden="true">
                          🔒
                        </span>
                      )}
                      {isComplete && (
                        <span className="lesson-tile-badge check" aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </span>
                    <span className="lesson-tile-meta">
                      {!unlocked
                        ? 'Finish the previous lesson to unlock'
                        : `${done}/${lesson.signs.length} signs`}
                    </span>
                    {unlocked && (
                      <span className="lesson-tile-track">
                        <i style={{ width: `${(done / lesson.signs.length) * 100}%` }} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
