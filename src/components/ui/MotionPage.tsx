import { motion } from "motion/react";
import type { ReactNode } from "react";
import { pageMotionTransition } from "../../utils/motion";

export function MotionPage({
  children,
  className = "",
  motionEnabled = true,
}: {
  children: ReactNode;
  className?: string;
  motionEnabled?: boolean;
}) {
  if (!motionEnabled) {
    return <div className={`motion-page ${className}`.trim()}>{children}</div>;
  }

  return (
    <motion.div
      className={`motion-page ${className}`.trim()}
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.99 }}
      transition={pageMotionTransition}
    >
      {children}
    </motion.div>
  );
}
