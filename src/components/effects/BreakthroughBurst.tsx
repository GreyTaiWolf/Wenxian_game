import { useEffect, useState } from "react";
import { motion } from "motion/react";

export function BreakthroughBurst({
  triggerKey,
  motionEnabled = true,
}: {
  triggerKey: number;
  motionEnabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!triggerKey) {
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), motionEnabled ? 820 : 260);
    return () => window.clearTimeout(timer);
  }, [motionEnabled, triggerKey]);

  if (!visible) {
    return null;
  }

  if (!motionEnabled) {
    return <span className="breakthrough-burst breakthrough-burst-static" aria-hidden="true" />;
  }

  return (
    <motion.span
      aria-hidden="true"
      className="breakthrough-burst"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1.12, 1.32] }}
      transition={{ duration: 0.82, ease: "easeOut" }}
    />
  );
}
