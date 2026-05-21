import { motion } from "motion/react";
import { GameIcon } from "../GameIcon";

export function RewardToast({
  title,
  detail,
  motionEnabled = true,
}: {
  title: string;
  detail?: string;
  motionEnabled?: boolean;
}) {
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
    return <div className="reward-toast">{content}</div>;
  }

  return (
    <motion.div
      className="reward-toast"
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {content}
    </motion.div>
  );
}
