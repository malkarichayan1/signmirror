import RevealGroup from '../motion/RevealGroup.jsx';

const FEATURES = [
  {
    icon: '👻',
    title: 'Ghost-outline live guide',
    desc: 'A translucent target hand overlays your webcam feed in real time, so you can align to it as you sign.',
    span: true,
  },
  { icon: '🔤', title: 'Fingerspelling trainer', desc: 'Spell real words letter by letter with the same hold-to-match engine.' },
  { icon: '📖', title: 'Searchable dictionary', desc: 'Browse and look up every sign you’ve learned so far.' },
  { icon: '🏆', title: 'Mastery tests', desc: 'Receptive and expressive quizzes that check what you’ve actually retained.' },
  {
    icon: '📈',
    title: 'Streaks & progress tracking',
    desc: 'Daily goals, XP, levels, and a streak calendar keep you coming back — all stored on your device.',
    span: true,
  },
  { icon: '🌊', title: 'Motion-sign matching', desc: 'Dynamic time warping scores moving signs, not just static hand shapes.' },
];

export default function FeatureBento() {
  return (
    <section className="landing-section" id="features">
      <div className="landing-container">
        <div className="landing-section-head">
          <span className="landing-eyebrow">Features</span>
          <h2 className="landing-h2">Everything you need to actually learn ASL.</h2>
        </div>
        <RevealGroup className="bento-grid" as="div" stagger={0.05}>
          {FEATURES.map(f => (
            <RevealGroup.Item
              key={f.title}
              as="div"
              className={`bento-card ${f.span ? 'span-2' : ''}`}
            >
              <span className="bento-icon" aria-hidden="true">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </RevealGroup.Item>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
