import { motion } from 'framer-motion';
import {
  getStreak,
  getAccuracy,
  getLevel,
  getRecentDays,
  dayKey,
} from '../lib/stats.js';
import RevealGroup from './motion/RevealGroup.jsx';
import './TabScreens.css';

function countSignsLearned(progress) {
  let count = 0;
  for (const lessonProg of Object.values(progress)) {
    for (const sign of Object.values(lessonProg.signs ?? {})) {
      if (sign.passed) count += 1;
    }
  }
  return count;
}

function buildBadges({ signsLearned, streak, totalXp, lessons, progress }) {
  const completed = lessons.filter(l => progress[l.id]?.completed);
  const alphabetLessons = lessons.filter(l => l.id.startsWith('alphabet'));
  const alphabetDone =
    alphabetLessons.length > 0 &&
    alphabetLessons.every(l => progress[l.id]?.completed);

  return [
    { id: 'first-sign', emoji: '🤟', title: 'First sign', desc: 'Pass 1 sign', earned: signsLearned >= 1 },
    { id: 'ten-signs', emoji: '⭐', title: 'Sign collector', desc: 'Pass 10 signs', earned: signsLearned >= 10 },
    { id: 'first-lesson', emoji: '🎓', title: 'First lesson', desc: 'Finish a lesson', earned: completed.length >= 1 },
    { id: 'streak-3', emoji: '🔥', title: 'On fire', desc: '3-day streak', earned: streak >= 3 },
    { id: 'streak-7', emoji: '🏆', title: 'Unstoppable', desc: '7-day streak', earned: streak >= 7 },
    { id: 'xp-100', emoji: '⚡', title: 'Powered up', desc: 'Earn 100 XP', earned: totalXp >= 100 },
    { id: 'alphabet', emoji: '🔤', title: 'A to Z', desc: 'Finish the alphabet', earned: alphabetDone },
    { id: 'all', emoji: '💯', title: 'Completionist', desc: 'Finish every lesson', earned: completed.length === lessons.length },
  ];
}

export default function ProgressScreen({ lessons, progress, stats }) {
  const streak = getStreak(stats);
  const accuracy = getAccuracy(stats);
  const { level, intoLevel, span } = getLevel(stats.totalXp);
  const signsLearned = countSignsLearned(progress);
  const week = getRecentDays(stats, 7);
  const weekMax = Math.max(...week.map(d => d.xp), 1);
  const month = getRecentDays(stats, 28);
  const todayKey = dayKey();
  const badges = buildBadges({ signsLearned, streak, totalXp: stats.totalXp, lessons, progress });
  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <div className="screen">
      <h2 className="tab-title">Progress</h2>
      <p className="tab-sub">Everything you&rsquo;ve earned so far.</p>

      <RevealGroup className="stat-grid">
        <RevealGroup.Item as="div" className="card stat-tile">
          <b className="num">{stats.totalXp}</b>
          <span>Total XP</span>
        </RevealGroup.Item>
        <RevealGroup.Item as="div" className="card stat-tile">
          <b className="num">{level}</b>
          <span>Level</span>
        </RevealGroup.Item>
        <RevealGroup.Item as="div" className="card stat-tile">
          <b className="num">{signsLearned}</b>
          <span>Signs learned</span>
        </RevealGroup.Item>
        <RevealGroup.Item as="div" className="card stat-tile">
          <b className="num">{accuracy === null ? '—' : `${Math.round(accuracy * 100)}%`}</b>
          <span>Accuracy</span>
        </RevealGroup.Item>
      </RevealGroup>

      <div className="card">
        <span className="eyebrow">Level {level}</span>
        <div className="xp-next" style={{ marginTop: 8 }}>
          <div className="xp-next-label num">
            <span>{intoLevel} XP</span>
            <span>{span} XP to level {level + 1}</span>
          </div>
          <div className="xp-next-track">
            <motion.i
              initial={{ width: 0 }}
              animate={{ width: `${(intoLevel / span) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      </div>

      <div className="section-head">
        <h3>XP this week</h3>
      </div>
      <div className="card">
        <div className="xp-bars" role="img" aria-label="XP earned per day this week">
          {week.map((d, i) => (
            <motion.i
              key={d.key}
              className={d.xp > 0 ? 'lit' : ''}
              style={{ height: `${Math.max((d.xp / weekMax) * 100, 5)}%`, transformOrigin: 'bottom' }}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              title={`${d.xp} XP`}
            />
          ))}
        </div>
        <div className="xp-days" aria-hidden="true">
          {week.map(d => (
            <span key={d.key}>{d.label}</span>
          ))}
        </div>
      </div>

      <div className="section-head">
        <h3>Streak calendar</h3>
        <span className="pill pill-amber num">🔥 {streak} days</span>
      </div>
      <div className="card">
        <RevealGroup
          className="cal-grid"
          stagger={0.015}
          as="div"
          role="img"
          aria-label="Practice days over the last four weeks"
        >
          {month.map(d => {
            const lit = d.xp > 0;
            const isToday = d.key === todayKey;
            return (
              <RevealGroup.Item
                key={d.key}
                as="i"
                className={`cal-day ${lit ? 'lit' : ''} ${isToday ? 'today' : ''}`}
              >
                {lit ? '🔥' : ''}
              </RevealGroup.Item>
            );
          })}
        </RevealGroup>
      </div>

      <div className="section-head">
        <h3>Achievements</h3>
        <span className="pill pill-indigo num">
          {earnedCount}/{badges.length}
        </span>
      </div>
      <RevealGroup className="badge-grid" stagger={0.04} as="div">
        {badges.map(badge => (
          <RevealGroup.Item key={badge.id} as="div" className={`badge ${badge.earned ? '' : 'locked'}`}>
            <span className="badge-medal" aria-hidden="true">
              {badge.emoji}
            </span>
            <b>{badge.title}</b>
            <span>{badge.desc}</span>
          </RevealGroup.Item>
        ))}
      </RevealGroup>
    </div>
  );
}
