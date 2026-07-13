import { isLessonUnlocked } from '../lib/progress.js';
import { getStreak, getXpToday, getRecentDays } from '../lib/stats.js';
import './HomeScreen.css';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Night owl mode';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function GoalRing({ pct, xpToday, goal }) {
  const size = 96;
  const sw = 9;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg
      width={size}
      height={size}
      role="img"
      aria-label={`Daily goal: ${xpToday} of ${goal} XP`}
    >
      <circle cx={size / 2} cy={size / 2} r={r} className="goal-ring-bg" strokeWidth={sw} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className="goal-ring-fg"
        strokeWidth={sw}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="47%" className="goal-ring-num num">
        {Math.round(pct * 100)}%
      </text>
      <text x="50%" y="63%" className="goal-ring-sub num">
        {xpToday}/{goal} XP
      </text>
    </svg>
  );
}

export default function HomeScreen({
  name,
  lessons,
  progress,
  stats,
  dailyGoalXp,
  mistakeCount,
  onStartLesson,
  onPracticeMistakes,
  onExplore,
}) {
  const streak = getStreak(stats);
  const xpToday = getXpToday(stats);
  const week = getRecentDays(stats, 7);
  const weekMax = Math.max(...week.map(d => d.xp), 1);
  const goalPct = Math.min(xpToday / dailyGoalXp, 1);

  const continueLesson = lessons.find(
    l => isLessonUnlocked(l, progress) && !progress[l.id]?.completed
  );
  const upNext = lessons
    .filter(l => !progress[l.id]?.completed && l.id !== continueLesson?.id)
    .slice(0, 4);

  const doneInLesson = continueLesson
    ? continueLesson.signs.filter(s => progress[continueLesson.id]?.signs?.[s.id]?.passed).length
    : 0;

  return (
    <div className="screen home">
      <header className="home-greet">
        <div>
          <h2>
            {getGreeting()}
            {name ? `, ${name}` : ''} <span aria-hidden="true">👋</span>
          </h2>
          <p>Ready for today&rsquo;s signs?</p>
        </div>
      </header>

      <div className="home-stats">
        <div className="card stat">
          <span className="stat-icon stat-icon-amber" aria-hidden="true">
            🔥
          </span>
          <div>
            <b className="num">{streak}</b>
            <span>day streak</span>
          </div>
        </div>
        <div className="card stat">
          <span className="stat-icon stat-icon-indigo" aria-hidden="true">
            ⚡
          </span>
          <div>
            <b className="num">{xpToday}</b>
            <span>XP today</span>
          </div>
        </div>
      </div>

      {continueLesson ? (
        <section className="continue-card">
          <div className="continue-glow" aria-hidden="true" />
          <span className="eyebrow">Continue learning</span>
          <h3>{continueLesson.title}</h3>
          <p>
            {doneInLesson} of {continueLesson.signs.length} signs done
          </p>
          <div className="continue-track">
            <i style={{ width: `${(doneInLesson / continueLesson.signs.length) * 100}%` }} />
          </div>
          <button className="btn continue-btn" onClick={() => onStartLesson(continueLesson)}>
            Continue lesson →
          </button>
        </section>
      ) : (
        <section className="continue-card">
          <span className="eyebrow">All caught up</span>
          <h3>Every lesson complete! 🎉</h3>
          <p>Review a lesson from Explore to keep your signs sharp.</p>
          <button className="btn continue-btn" onClick={onExplore}>
            Browse lessons →
          </button>
        </section>
      )}

      <div className="home-two-col">
        <div className="card goal-card">
          <GoalRing pct={goalPct} xpToday={xpToday} goal={dailyGoalXp} />
          <span className="mini-label">Daily goal</span>
        </div>
        <div className="card week-card">
          <div className="week-bars" role="img" aria-label="XP earned this week">
            {week.map(d => (
              <i
                key={d.key}
                className={d.xp > 0 ? 'lit' : ''}
                style={{ height: `${Math.max((d.xp / weekMax) * 100, 6)}%` }}
              />
            ))}
          </div>
          <div className="week-days" aria-hidden="true">
            {week.map(d => (
              <span key={d.key}>{d.label}</span>
            ))}
          </div>
          <span className="mini-label">This week</span>
        </div>
      </div>

      {mistakeCount > 0 && (
        <button className="mistakes-btn" onClick={onPracticeMistakes}>
          <span className="mistakes-icon" aria-hidden="true">
            ↻
          </span>
          <span className="mistakes-text">
            <b>Practice your mistakes</b>
            <span>
              {mistakeCount} sign{mistakeCount !== 1 ? 's' : ''} to review
            </span>
          </span>
        </button>
      )}

      {upNext.length > 0 && (
        <>
          <div className="section-head">
            <h3>Up next</h3>
            <button onClick={onExplore}>See all</button>
          </div>
          <div className="up-next-row">
            {upNext.map(lesson => {
              const unlocked = isLessonUnlocked(lesson, progress);
              return (
                <button
                  key={lesson.id}
                  className={`up-next-card ${unlocked ? '' : 'locked'}`}
                  onClick={() => unlocked && onStartLesson(lesson)}
                  disabled={!unlocked}
                  aria-label={unlocked ? lesson.title : `${lesson.title} — locked`}
                >
                  <span className="up-next-emoji" aria-hidden="true">
                    {unlocked ? '🤟' : '🔒'}
                  </span>
                  <b>{lesson.title}</b>
                  <span>{lesson.signs.length} signs</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {stats.recent.length > 0 && (
        <>
          <div className="section-head">
            <h3>Recently learned</h3>
          </div>
          <div className="recent-chips">
            {stats.recent.map(signName => (
              <span key={signName} className="recent-chip">
                <span className="recent-chip-dot" aria-hidden="true">
                  ✓
                </span>
                {signName}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
