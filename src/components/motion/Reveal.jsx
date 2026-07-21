import { motion, useReducedMotion } from 'framer-motion';

// Wraps children so they fade/slide in the first time they scroll into view.
// Respects prefers-reduced-motion by dropping to an opacity-only transition.
export default function Reveal({ children, className, as = 'div', delay = 0 }) {
  const prefersReducedMotion = useReducedMotion();
  const MotionTag = motion[as];

  const initial = prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 40 };
  const whileInView = prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <MotionTag
      className={className}
      initial={initial}
      whileInView={whileInView}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </MotionTag>
  );
}
