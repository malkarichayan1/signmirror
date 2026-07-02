import { loadProgress } from '../lib/progress.js';
import './LessonList.css';

export default function LessonList({ lessons, onSelect }) {
  const progress = loadProgress();

  return (
    <section className="lesson-list">
      <h2 className="lesson-list-heading">Lessons</h2>
      <div className="lesson-grid">
        {lessons.map((lesson) => {
          const done = lesson.signs.filter(
            (s) => progress[lesson.id]?.[s.id]
          ).length;
          return (
            <button
              key={lesson.id}
              className="lesson-card"
              onClick={() => onSelect(lesson)}
            >
              <span className="lesson-card-title">{lesson.title}</span>
              <span className="lesson-card-meta">
                {lesson.signs.length} signs &middot; {done}/{lesson.signs.length} done
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
