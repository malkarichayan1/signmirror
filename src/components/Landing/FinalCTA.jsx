import Reveal from '../motion/Reveal.jsx';

export default function FinalCTA({ onEnter }) {
  return (
    <section className="landing-section final-cta">
      <div className="landing-container">
        <Reveal>
          <h2 className="landing-h2">Ready to sign?</h2>
          <p className="landing-lede" style={{ margin: '0 auto' }}>
            Turn on your camera and start your first lesson — free, no account required.
          </p>
          <div className="landing-cta-row">
            <button type="button" className="landing-btn primary" onClick={onEnter}>
              Start learning →
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
