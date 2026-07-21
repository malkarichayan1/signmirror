import { useEffect } from 'react';
import LandingNav from './LandingNav.jsx';
import Hero from './Hero.jsx';
import GhostDemoScrub from './GhostDemoScrub.jsx';
import HowItWorks from './HowItWorks.jsx';
import PrivacyStrip from './PrivacyStrip.jsx';
import FeatureBento from './FeatureBento.jsx';
import ComparisonStrip from './ComparisonStrip.jsx';
import FinalCTA from './FinalCTA.jsx';
import Footer from './Footer.jsx';
import './Landing.css';

const LANDING_THEME_COLOR = '#0a0a0b';

export default function Landing({ onEnter }) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const previous = meta?.getAttribute('content');
    meta?.setAttribute('content', LANDING_THEME_COLOR);
    return () => {
      if (previous !== undefined) meta?.setAttribute('content', previous);
    };
  }, []);

  return (
    <div className="landing-page">
      <LandingNav onEnter={onEnter} />
      <Hero onEnter={onEnter} />
      <GhostDemoScrub />
      <HowItWorks />
      <PrivacyStrip />
      <FeatureBento />
      <ComparisonStrip />
      <FinalCTA onEnter={onEnter} />
      <Footer />
    </div>
  );
}
