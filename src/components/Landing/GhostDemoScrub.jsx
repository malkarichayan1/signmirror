import { useRef, useState } from 'react';
import { useScroll, useReducedMotion, useMotionValueEvent } from 'framer-motion';
import { HAND_CONNECTIONS } from '../../lib/handSkeleton.js';

// A relaxed open-palm pose, hand-picked to look natural in the 0-1 x/0-1 y
// space normalize.js already uses for real sign landmarks. Purely
// decorative for the marketing demo — not tied to any real ASL sign data.
const DEMO_LANDMARKS = [
  { x: 0.50, y: 0.92 }, { x: 0.40, y: 0.82 }, { x: 0.33, y: 0.70 }, { x: 0.28, y: 0.60 }, { x: 0.24, y: 0.52 },
  { x: 0.42, y: 0.55 }, { x: 0.40, y: 0.38 }, { x: 0.39, y: 0.26 }, { x: 0.38, y: 0.16 },
  { x: 0.50, y: 0.52 }, { x: 0.50, y: 0.32 }, { x: 0.50, y: 0.18 }, { x: 0.50, y: 0.07 },
  { x: 0.58, y: 0.54 }, { x: 0.60, y: 0.36 }, { x: 0.61, y: 0.24 }, { x: 0.62, y: 0.14 },
  { x: 0.66, y: 0.58 }, { x: 0.70, y: 0.44 }, { x: 0.73, y: 0.34 }, { x: 0.75, y: 0.26 },
];

// Plain linear interpolation across piecewise breakpoints — deliberately NOT
// framer-motion's useTransform here. useTransform chained onto motion.*
// `style` props turned into native Web Animations keyframes that play out
// once on a time-based duration and then freeze, completely divorced from
// real scroll position (reproduced via getAnimations() during manual
// verification). Plain JS math tied to the single confirmed-correct
// scrollYProgress reading below sidesteps that entirely.
function pieceLerp(value, inputs, outputs) {
  if (value <= inputs[0]) return outputs[0];
  if (value >= inputs[inputs.length - 1]) return outputs[outputs.length - 1];
  for (let i = 0; i < inputs.length - 1; i++) {
    if (value >= inputs[i] && value <= inputs[i + 1]) {
      const t = (value - inputs[i]) / (inputs[i + 1] - inputs[i]);
      return outputs[i] + (outputs[i + 1] - outputs[i]) * t;
    }
  }
  return outputs[outputs.length - 1];
}

function HandSvg({ landmarks, strokeWidth = 3, dashed = false }) {
  return (
    <g>
      {HAND_CONNECTIONS.map(([a, b], i) => (
        <line
          key={i}
          x1={landmarks[a].x * 100}
          y1={landmarks[a].y * 100}
          x2={landmarks[b].x * 100}
          y2={landmarks[b].y * 100}
          strokeWidth={strokeWidth}
          strokeDasharray={dashed ? '4 4' : undefined}
        />
      ))}
      {landmarks.map((lm, i) => (
        <circle key={i} cx={lm.x * 100} cy={lm.y * 100} r={dashed ? 1.6 : 2.2} />
      ))}
    </g>
  );
}

function ScrubCaption({ opacity, children }) {
  return (
    <p className="ghost-scrub-caption" style={{ opacity, position: 'absolute', top: 0, left: 0, right: 0 }}>
      {children}
    </p>
  );
}

export default function GhostDemoScrub() {
  const containerRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const [progress, setProgress] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', setProgress);

  const liveX = pieceLerp(progress, [0, 0.7], [22, 0]);
  const liveY = pieceLerp(progress, [0, 0.7], [-16, 0]);
  const liveRotate = pieceLerp(progress, [0, 0.7], [-14, 0]);
  const ghostOpacity = pieceLerp(progress, [0, 0.15], [0, 1]);
  const lockGlow = pieceLerp(progress, [0.72, 0.88], [0, 1]);

  const caption1 = pieceLerp(progress, [0, 0.05, 0.28, 0.36], [1, 1, 1, 0]);
  const caption2 = pieceLerp(progress, [0.3, 0.38, 0.6, 0.68], [0, 1, 1, 0]);
  const caption3 = pieceLerp(progress, [0.64, 0.74, 1], [0, 1, 1]);

  if (prefersReducedMotion) {
    return (
      <section className="landing-section" aria-label="Ghost guide demo">
        <div className="landing-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div className="ghost-scrub-frame">
            <svg viewBox="0 0 100 100" width="100%" height="100%">
              <g stroke="var(--lp-emerald)" fill="var(--lp-emerald)">
                <HandSvg landmarks={DEMO_LANDMARKS} />
              </g>
            </svg>
          </div>
          <p className="ghost-scrub-caption">
            <b>Locked in.</b> The ghost guide turns solid the moment your hand matches the target shape.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="ghost-scrub" ref={containerRef} aria-label="Ghost guide demo">
      <div className="ghost-scrub-sticky">
        <div className="ghost-scrub-frame">
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            <g stroke="var(--lp-emerald)" fill="var(--lp-emerald)" style={{ opacity: ghostOpacity }}>
              <HandSvg landmarks={DEMO_LANDMARKS} dashed strokeWidth={2} />
            </g>
            <g
              stroke="var(--lp-indigo)"
              fill="var(--lp-indigo)"
              style={{ transform: `translate(${liveX}px, ${liveY}px) rotate(${liveRotate}deg)`, transformOrigin: '50px 50px' }}
            >
              <HandSvg landmarks={DEMO_LANDMARKS} />
            </g>
            <rect
              x="2" y="2" width="96" height="96" rx="18"
              fill="none"
              stroke="var(--lp-emerald)"
              strokeWidth="2"
              style={{ opacity: lockGlow }}
            />
          </svg>
        </div>
        <div style={{ position: 'relative', minHeight: '2.6em', display: 'flex', justifyContent: 'center' }}>
          <ScrubCaption opacity={caption1}>Show your hand to the camera.</ScrubCaption>
          <ScrubCaption opacity={caption2}>
            Follow the <b>ghost outline</b> to line up your shape.
          </ScrubCaption>
          <ScrubCaption opacity={caption3}>
            <b>Locked in.</b> That's the whole loop — sign by sign.
          </ScrubCaption>
        </div>
      </div>
    </section>
  );
}
