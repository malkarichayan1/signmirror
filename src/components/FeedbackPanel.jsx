import { MATCH_THRESHOLD } from '../config.js';
import './FeedbackPanel.css';

export default function FeedbackPanel({ distance, pass }) {
  const hasData = distance !== null && isFinite(distance);

  // Bar fills 100% at distance=0 (perfect), hits 0% at distance = 2*threshold.
  const barPct = hasData
    ? Math.max(0, Math.min(100, (1 - distance / (MATCH_THRESHOLD * 2)) * 100))
    : 0;

  return (
    <div className={`feedback-panel ${!hasData ? 'waiting' : pass ? 'pass' : 'fail'}`}>
      {!hasData ? (
        <p className="feedback-hint">Show your hand to the camera</p>
      ) : (
        <>
          <div className="feedback-row">
            <span className="feedback-label">Distance</span>
            <span className="feedback-value">{distance.toFixed(4)}</span>
            <span className="feedback-threshold">/ {MATCH_THRESHOLD}</span>
          </div>
          <div className="score-bar-track">
            <div className="score-bar-fill" style={{ width: `${barPct}%` }} />
          </div>
          <div className="feedback-status">
            {pass ? '✓ Match!' : 'Keep adjusting…'}
          </div>
        </>
      )}
    </div>
  );
}
