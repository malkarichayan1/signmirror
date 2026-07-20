import './TabScreens.css';

export default function PracticeScreen({
  continueLesson,
  completedLessons,
  mistakeCount,
  onStartLesson,
  onPracticeMistakes,
  onOpenFingerspelling,
}) {
  return (
    <div className="screen">
      <h2 className="tab-title">Practice</h2>
      <p className="tab-sub">Sign in front of your camera and get live feedback.</p>

      <section className="practice-hero">
        <span className="eyebrow">Camera practice</span>
        <h3>{continueLesson ? continueLesson.title : 'Review any lesson'}</h3>
        <p>
          Your camera tracks 21 points on your hand and tells you the moment your
          sign matches.
        </p>
        {continueLesson && (
          <button className="btn" onClick={() => onStartLesson(continueLesson)}>
            Start practicing →
          </button>
        )}
      </section>

      {mistakeCount > 0 && (
        <button className="mistakes-btn" onClick={onPracticeMistakes}>
          <span className="mistakes-icon" aria-hidden="true">
            ↻
          </span>
          <span className="mistakes-text">
            <b>Practice your mistakes</b>
            <span>
              {mistakeCount} sign{mistakeCount !== 1 ? 's' : ''} you skipped or missed
            </span>
          </span>
        </button>
      )}

      <button className="practice-row" onClick={onOpenFingerspelling}>
        <span className="practice-row-icon" aria-hidden="true">🔤</span>
        <span>
          <b>Fingerspelling Trainer</b>
          <span>Spell random words letter by letter on camera</span>
        </span>
      </button>

      {completedLessons.length > 0 && (
        <>
          <div className="section-head">
            <h3>Review a finished lesson</h3>
          </div>
          <div className="practice-list">
            {completedLessons.map(lesson => (
              <button
                key={lesson.id}
                className="practice-row"
                onClick={() => onStartLesson(lesson)}
              >
                <span className="practice-row-icon" aria-hidden="true">
                  ✓
                </span>
                <span>
                  <b>{lesson.title}</b>
                  <span>{lesson.signs.length} signs · completed</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
