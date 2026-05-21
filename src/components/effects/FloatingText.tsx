import { motion } from "motion/react";

export type FloatingTextTone = "damage" | "heal" | "crit" | "dodge" | "shield" | "spirit";

export function FloatingText({
  text,
  tone = "damage",
  motionEnabled = true,
}: {
  text: string;
  tone?: FloatingTextTone;
  motionEnabled?: boolean;
}) {
  if (!motionEnabled) {
    return <span className={`floating-text floating-text-${tone}`}>{text}</span>;
  }

  return (
    <motion.span
      className={`floating-text floating-text-${tone}`}
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: -18, scale: tone === "crit" ? 1.08 : 1 }}
      exit={{ opacity: 0, y: -28 }}
      transition={{ duration: 0.52, ease: "easeOut" }}
    >
      {text}
    </motion.span>
  );
}
