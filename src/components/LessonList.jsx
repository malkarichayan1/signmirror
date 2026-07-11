import { isLessonUnlocked } from '../lib/progress.js';
import './LessonList.css';

export default function LessonList({ lessons, progress, onSelect }) {
  return (
    <section className="lesson-list">
      <h2 className="lesson-list-heading">Lessons</h2>
      <div className="lesson-grid">
        {lessons.map(lesson => {
          const unlocked = isLessonUnlocked(lesson, progress);
          const lessonProg = progress[lesson.id];
          const isComplete = Boolean(lessonProg?.completed);
          const done = lesson.signs.filter(
            s => lessonProg?.signs?.[s.id]?.passed
          ).length;

          let statusClass = '';
          if (!unlocked) statusClass = 'locked';
          else if (isComplete) statusClass = 'completed';

          return (
            <button
              key={lesson.id}
              className={`lesson-card ${statusClass}`}
              onClick={() => unlocked && onSelect(lesson)}
              disabled={!unlocked}
              aria-label={
                !unlocked
                  ? `${lesson.title} — locked`
                  : isComplete
                  ? `${lesson.title} — completed`
                  : lesson.title
              }
            >
              <div className="lesson-card-header">
                <span className="lesson-card-title">{lesson.title}</span>
                {!unlocked && <span className="lesson-badge lock">🔒</span>}
                {isComplete && <span className="lesson-badge check">✓</span>}
              </div>
              <span className="lesson-card-meta">
                {!unlocked
                  ? `Complete "${lesson.unlockedBy}" to unlock`
                  : `${lesson.signs.length} signs · ${done}/${lesson.signs.length} done`}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
