import Reveal from '../motion/Reveal.jsx';

const THEM = [
  'Static photos of hand shapes',
  'No idea if you got it right',
  'Motion signs shown as a single frame',
  'Progress is just "marked complete"',
];

const US = [
  'A live ghost guide anchored to your own hand',
  'Real-time match scoring while you sign',
  'Motion signs matched with dynamic time warping',
  'XP, streaks, mastery tests and a mistake queue',
];

export default function ComparisonStrip() {
  return (
    <section className="landing-section">
      <div className="landing-container">
        <div className="landing-section-head">
          <span className="landing-eyebrow">Why SignMirror</span>
          <h2 className="landing-h2">Flashcards can’t tell you if you’re right.</h2>
        </div>
        <Reveal className="comparison-strip" as="div">
          <div className="comparison-col them">
            <h3>Typical ASL apps</h3>
            <ul>
              {THEM.map(item => (
                <li key={item}>
                  <span aria-hidden="true">–</span> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="comparison-col us">
            <h3>SignMirror</h3>
            <ul>
              {US.map(item => (
                <li key={item}>
                  <span aria-hidden="true">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
