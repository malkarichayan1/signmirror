export default function LandingNav({ onEnter }) {
  return (
    <nav className="landing-nav" aria-label="Landing navigation">
      <span className="landing-logo">
        <span aria-hidden="true">🤟</span> SignMirror
      </span>
      <div className="landing-nav-links">
        <a href="#how-it-works">How it works</a>
        <a href="#features">Features</a>
        <a href="#privacy">Privacy</a>
      </div>
      <button type="button" className="landing-btn primary" onClick={onEnter}>
        Start learning
      </button>
    </nav>
  );
}
