import Reveal from '../motion/Reveal.jsx';

export default function Hero({ onEnter }) {
  return (
    <header className="landing-hero">
      <div className="landing-container">
        <Reveal>
          <span className="landing-eyebrow">
            <span aria-hidden="true">●</span> Runs entirely in your browser
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="landing-h1">Learn ASL with a guide that watches you sign back.</h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="landing-lede">
            SignMirror tracks your hands in real time and overlays a ghost guide right on
            top of your own camera feed — so you can see exactly how close you are to
            getting a sign right, sign by sign.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="landing-cta-row">
            <button type="button" className="landing-btn primary" onClick={onEnter}>
              Start learning →
            </button>
            <a className="landing-btn ghost" href="#how-it-works">
              See how it works
            </a>
          </div>
        </Reveal>
      </div>
    </header>
  );
}
