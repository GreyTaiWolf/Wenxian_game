import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { ItemGrade } from "../../types";

const glowingGrades: ItemGrade[] = ["xuan", "di", "tian", "xian", "shen"];

export function GradeGlow({
  grade,
  children,
  motionEnabled = true,
}: {
  grade: ItemGrade;
  children: ReactNode;
  motionEnabled?: boolean;
}) {
  if (!motionEnabled || !glowingGrades.includes(grade)) {
    return <span className={`grade-glow grade-glow-${grade}`}>{children}</span>;
  }

  return (
    <motion.span
      className={`grade-glow grade-glow-${grade}`}
      animate={{ opacity: [0.72, 1, 0.72] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.span>
  );
}
