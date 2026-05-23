import { motion } from "motion/react";
import { GameIcon } from "../GameIcon";
import type { ItemGrade } from "../../types";

export function RewardToast({
  title,
  detail,
  grade,
  motionEnabled = true,
}: {
  title: string;
  detail?: string;
  grade?: ItemGrade;
  motionEnabled?: boolean;
}) {
  const className = `reward-toast ${grade ? `grade-card grade-${grade}` : ""}`.trim();
  const content = (
    <>
      <GameIcon name="item" size={18} />
      <span>
        <strong>{title}</strong>
        {detail ? <small>{detail}</small> : null}
      </span>
    </>
  );

  if (!motionEnabled) {
    return <div className={className}>{content}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {content}
    </motion.div>
  );
}
