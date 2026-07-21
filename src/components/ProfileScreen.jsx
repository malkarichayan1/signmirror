import { motion } from 'framer-motion';
import { getStreak, getLevel } from '../lib/stats.js';
import './TabScreens.css';

const GOAL_OPTIONS = [10, 30, 50];

export default function ProfileScreen({
  settings,
  stats,
  user,
  onUpdateSettings,
  onExport,
  onImport,
  onReset,
  onSignOut,
}) {
  const streak = getStreak(stats);
  const { level, intoLevel, span } = getLevel(stats.totalXp);
  const isDark = settings.theme === 'dark';
  const displayName = settings.name || 'Signer';

  return (
    <div className="screen">
      <div className="profile-head">
        <div className="avatar-big">
          {displayName.charAt(0).toUpperCase()}
          <span className="avatar-lvl num">LVL {level}</span>
        </div>
        <h2>{displayName}</h2>
        <p className="num">
          ⚡ {stats.totalXp} XP · 🔥 {streak} day streak
        </p>
        <div className="xp-next">
          <div className="xp-next-label num">
            <span>Level {level}</span>
            <span>
              {span - intoLevel} XP to level {level + 1}
            </span>
          </div>
          <div className="xp-next-track">
            <i style={{ width: `${(intoLevel / span) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="settings-list">
        {user ? (
          <div className="settings-row" style={{ cursor: 'default' }}>
            <span className="settings-row-icon" aria-hidden="true">☁️</span>
            <span className="grow">
              <b>Signed in</b>
              <span>{user.email} · progress synced</span>
            </span>
            <button type="button" className="btn-secondary" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        ) : (
          <div className="settings-row" style={{ cursor: 'default' }}>
            <span className="settings-row-icon" aria-hidden="true">👤</span>
            <span className="grow">
              <b>Not signed in</b>
              <span>Progress is only saved on this device</span>
            </span>
          </div>
        )}

        <div className="settings-row" style={{ cursor: 'default' }}>
          <span className="settings-row-icon" aria-hidden="true">
            🌙
          </span>
          <span className="grow">
            <b>Dark mode</b>
            <span>Easier on the eyes at night</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label="Toggle dark mode"
            className={`toggle ${isDark ? 'on' : ''}`}
            style={{ border: 0, cursor: 'pointer' }}
            onClick={() =>
              onUpdateSettings({ ...settings, theme: isDark ? 'light' : 'dark' })
            }
          />
        </div>

        <div className="settings-row" style={{ cursor: 'default' }}>
          <span className="settings-row-icon" aria-hidden="true">
            🎯
          </span>
          <span className="grow">
            <b>Daily goal</b>
            <span>XP to earn each day</span>
          </span>
          <span className="goal-chips">
            {GOAL_OPTIONS.map(goal => (
              <button
                key={goal}
                type="button"
                className={`goal-chip num ${settings.dailyGoalXp === goal ? 'on' : ''}`}
                aria-pressed={settings.dailyGoalXp === goal}
                onClick={() => onUpdateSettings({ ...settings, dailyGoalXp: goal })}
              >
                {goal}
              </button>
            ))}
          </span>
        </div>

        <label className="settings-row" style={{ cursor: 'text' }}>
          <span className="settings-row-icon" aria-hidden="true">
            ✏️
          </span>
          <span className="grow">
            <b>Display name</b>
            <span>Shown on your dashboard</span>
          </span>
          <input
            className="ob-input"
            style={{ width: 130, margin: 0, padding: '8px 12px', fontSize: 14 }}
            value={settings.name}
            placeholder="Your name"
            maxLength={20}
            onChange={e => onUpdateSettings({ ...settings, name: e.target.value })}
          />
        </label>
      </div>

      <div className="settings-list">
        <motion.button whileTap={{ scale: 0.98 }} className="settings-row" onClick={onExport}>
          <span className="settings-row-icon" aria-hidden="true">
            ⬇️
          </span>
          <span className="grow">
            <b>Export progress</b>
            <span>Download a backup file</span>
          </span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.98 }} className="settings-row" onClick={onImport}>
          <span className="settings-row-icon" aria-hidden="true">
            ⬆️
          </span>
          <span className="grow">
            <b>Import progress</b>
            <span>Restore from a backup</span>
          </span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.98 }} className="settings-row" onClick={onReset}>
          <span
            className="settings-row-icon"
            style={{ background: 'var(--rose-soft)' }}
            aria-hidden="true"
          >
            🗑️
          </span>
          <span className="grow">
            <b style={{ color: 'var(--rose)' }}>Reset everything</b>
            <span>Erase progress, XP and streaks</span>
          </span>
        </motion.button>
      </div>
    </div>
  );
}
