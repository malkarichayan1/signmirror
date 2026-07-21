import Reveal from '../motion/Reveal.jsx';

export default function PrivacyStrip() {
  return (
    <section className="privacy-strip" id="privacy">
      <Reveal className="landing-container" as="div">
        <span className="privacy-icon" aria-hidden="true">🔒</span>
        <div>
          <h3>Your camera feed never leaves your device.</h3>
          <p>
            Hand tracking runs fully on-device with MediaPipe. Only your lesson progress —
            not video — is optionally synced if you choose to sign in.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
