import { useState } from 'react';
import './TabScreens.css';

const GOALS = [
  { xp: 10, emoji: '🌱', title: 'Casual', desc: '10 XP · one sign a day' },
  { xp: 30, emoji: '🚀', title: 'Regular', desc: '30 XP · a few signs a day' },
  { xp: 50, emoji: '🔥', title: 'Serious', desc: '50 XP · half a lesson a day' },
];

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState(30);

  function finish() {
    onDone({ name: name.trim(), dailyGoalXp: goal });
  }

  return (
    <div className="onboarding">
      <div className="ob-dots" aria-hidden="true">
        {[0, 1, 2].map(i => (
          <i key={i} className={i === step ? 'on' : ''} />
        ))}
      </div>

      {step === 0 && (
        <>
          <div className="ob-art" aria-hidden="true">
            🤟
          </div>
          <h1>Learn ASL with your camera</h1>
          <p>
            Your webcam watches your hands and gives instant feedback until every
            sign feels natural.
          </p>
          <button className="btn btn-primary btn-block" onClick={() => setStep(1)}>
            Get started
          </button>
        </>
      )}

      {step === 1 && (
        <>
          <div className="ob-art" aria-hidden="true">
            👋
          </div>
          <h1>What should we call you?</h1>
          <p>Your name shows up on your dashboard.</p>
          <input
            className="ob-input"
            value={name}
            maxLength={20}
            placeholder="Your name (optional)"
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setStep(2)}
          />
          <button className="btn btn-primary btn-block" onClick={() => setStep(2)}>
            Next
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="ob-art" aria-hidden="true">
            🎯
          </div>
          <h1>Pick a daily goal</h1>
          <p>You can change this anytime in your profile.</p>
          <div className="ob-goals">
            {GOALS.map(g => (
              <button
                key={g.xp}
                type="button"
                className={`ob-goal ${goal === g.xp ? 'on' : ''}`}
                aria-pressed={goal === g.xp}
                onClick={() => setGoal(g.xp)}
              >
                <span className="ob-goal-emoji" aria-hidden="true">
                  {g.emoji}
                </span>
                <span>
                  <b>{g.title}</b>
                  <span>{g.desc}</span>
                </span>
              </button>
            ))}
          </div>
          <button className="btn btn-success btn-block" onClick={finish}>
            Start learning 🤟
          </button>
        </>
      )}
    </div>
  );
}
