import { motion, useReducedMotion } from 'framer-motion';

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const itemVariantsReduced = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

// Staggers its direct motion children in on scroll. Pair with RevealGroup.Item
// for each staggered child, or apply the exported `revealItemVariants` to a
// custom motion element. `stagger` overrides the per-child delay (default
// 0.08s) — pass a smaller value for large grids (e.g. a 28-cell calendar)
// so the whole group doesn't take seconds to finish revealing.
export default function RevealGroup({ children, className, as = 'div', stagger = 0.08, ...rest }) {
  const MotionTag = motion[as];
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger } },
  };
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

RevealGroup.Item = function RevealGroupItem({ children, className, as = 'div', ...rest }) {
  const prefersReducedMotion = useReducedMotion();
  const MotionTag = motion[as];
  return (
    <MotionTag className={className} variants={prefersReducedMotion ? itemVariantsReduced : itemVariants} {...rest}>
      {children}
    </MotionTag>
  );
};
