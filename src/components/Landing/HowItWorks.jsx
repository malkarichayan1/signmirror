import RevealGroup from '../motion/RevealGroup.jsx';

const STEPS = [
  {
    title: 'Turn on your camera',
    desc: 'Everything runs locally in your browser via MediaPipe — no video ever leaves your device.',
  },
  {
    title: 'Follow the ghost guide',
    desc: 'A translucent outline shows exactly where your hand should be, anchored right on your own feed.',
  },
  {
    title: 'Get instant feedback',
    desc: 'A live match score tells you how close you are, and locks in the moment you nail the shape.',
  },
];

export default function HowItWorks() {
  return (
    <section className="landing-section" id="how-it-works">
      <div className="landing-container">
        <div className="landing-section-head">
          <span className="landing-eyebrow">How it works</span>
          <h2 className="landing-h2">Three steps, no flashcards.</h2>
        </div>
        <RevealGroup className="how-grid" as="div">
          {STEPS.map((step, i) => (
            <RevealGroup.Item key={step.title} as="div" className="how-card">
              <span className="how-card-num">{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </RevealGroup.Item>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
