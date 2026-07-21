import { motion } from 'framer-motion';
import { isLessonUnlocked } from '../lib/progress.js';
import { getStreak, getXpToday, getRecentDays } from '../lib/stats.js';
import RevealGroup from './motion/RevealGroup.jsx';
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
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className="goal-ring-fg"
        strokeWidth={sw}
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct) }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
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

      <RevealGroup>
        <RevealGroup.Item className="home-stats">
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
        </RevealGroup.Item>

        {continueLesson ? (
          <RevealGroup.Item as="section" className="continue-card">
            <div className="continue-glow" aria-hidden="true" />
            <span className="eyebrow">Continue learning</span>
            <h3>{continueLesson.title}</h3>
            <p>
              {doneInLesson} of {continueLesson.signs.length} signs done
            </p>
            <div className="continue-track">
              <i style={{ width: `${(doneInLesson / continueLesson.signs.length) * 100}%` }} />
            </div>
            <motion.button whileTap={{ scale: 0.98 }} className="btn continue-btn" onClick={() => onStartLesson(continueLesson)}>
              Continue lesson →
            </motion.button>
          </RevealGroup.Item>
        ) : (
          <RevealGroup.Item as="section" className="continue-card">
            <span className="eyebrow">All caught up</span>
            <h3>Every lesson complete! 🎉</h3>
            <p>Review a lesson from Explore to keep your signs sharp.</p>
            <motion.button whileTap={{ scale: 0.98 }} className="btn continue-btn" onClick={onExplore}>
              Browse lessons →
            </motion.button>
          </RevealGroup.Item>
        )}

        <RevealGroup.Item className="home-two-col">
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
        </RevealGroup.Item>

        {mistakeCount > 0 && (
          <RevealGroup.Item>
            <motion.button whileTap={{ scale: 0.98 }} className="mistakes-btn" onClick={onPracticeMistakes}>
              <span className="mistakes-icon" aria-hidden="true">
                ↻
              </span>
              <span className="mistakes-text">
                <b>Practice your mistakes</b>
                <span>
                  {mistakeCount} sign{mistakeCount !== 1 ? 's' : ''} to review
                </span>
              </span>
            </motion.button>
          </RevealGroup.Item>
        )}

        {upNext.length > 0 && (
          <RevealGroup.Item>
            <div className="section-head">
              <h3>Up next</h3>
              <button onClick={onExplore}>See all</button>
            </div>
            <div className="up-next-row">
              {upNext.map(lesson => {
                const unlocked = isLessonUnlocked(lesson, progress);
                return (
                  <motion.button
                    key={lesson.id}
                    whileTap={unlocked ? { scale: 0.98 } : undefined}
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
                  </motion.button>
                );
              })}
            </div>
          </RevealGroup.Item>
        )}

        {stats.recent.length > 0 && (
          <RevealGroup.Item>
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
          </RevealGroup.Item>
        )}
      </RevealGroup>
    </div>
  );
}
