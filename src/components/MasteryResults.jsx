import Confetti from './Confetti.jsx';
import './MasteryTest.css';

function formatTime(ms) {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export default function MasteryResults({ results, badge, onRetake, onDone }) {
  const { scorePct, correctCount, total, elapsedMs, lessonBreakdown, typeBreakdown, reviewRecommendations } = results;

  return (
    <div className="mastery-results">
      {badge?.id === 'perfect' && <Confetti />}

      <div className="mastery-badge-block">
        <div className={`mastery-badge-emoji ${badge ? badge.id : 'none'}`} aria-hidden="true">
          {badge ? badge.emoji : '📋'}
        </div>
        <h2 className="mastery-score-num">{scorePct}%</h2>
        <p className="mastery-badge-label">
          {badge ? `${badge.label} Mastery` : 'Keep practicing to earn a badge'}
        </p>
      </div>

      <div className="mastery-stats-row">
        <div className="mastery-stat">
          <b>{correctCount}/{total}</b>
          <span>Correct</span>
        </div>
        <div className="mastery-stat">
          <b>{formatTime(elapsedMs)}</b>
          <span>Time taken</span>
        </div>
        <div className="mastery-stat">
          <b>{scorePct}%</b>
          <span>Overall score</span>
        </div>
      </div>

      {typeBreakdown.length > 0 && (
        <>
          <h3 className="mastery-section-title">By skill</h3>
          <div className="mastery-breakdown-list">
            {typeBreakdown.map(t => (
              <div key={t.key} className="mastery-breakdown-row">
                <span className="mastery-breakdown-label">{t.label}</span>
                <div className="mastery-breakdown-track">
                  <i style={{ width: `${t.pct}%` }} />
                </div>
                <span className="mastery-breakdown-pct">{t.pct}%</span>
              </div>
            ))}
          </div>
        </>
      )}

      {lessonBreakdown.length > 0 && (
        <>
          <h3 className="mastery-section-title">By lesson</h3>
          <div className="mastery-breakdown-list">
            {lessonBreakdown.map(l => (
              <div key={l.key} className="mastery-breakdown-row">
                <span className="mastery-breakdown-label">{l.label}</span>
                <div className="mastery-breakdown-track">
                  <i style={{ width: `${l.pct}%` }} />
                </div>
                <span className="mastery-breakdown-pct">{l.pct}%</span>
              </div>
            ))}
          </div>
        </>
      )}

      {reviewRecommendations.length > 0 && (
        <div className="mastery-review-card">
          <h3 className="mastery-section-title">Recommended Review</h3>
          <ul className="mastery-review-list">
            {reviewRecommendations.map(r => (
              <li key={r.key}>
                <b>{r.label}</b> — {r.incorrect} incorrect
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mastery-results-actions">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Back to lessons
        </button>
        <button type="button" className="btn btn-primary" onClick={onRetake}>
          Retake Test
        </button>
      </div>
    </div>
  );
}
