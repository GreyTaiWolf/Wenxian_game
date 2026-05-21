import { memo } from "react";
import { itemGradeLabels } from "../../data/items";
import type { ItemGrade } from "../../types";

export const GradeBadge = memo(function GradeBadge({
  grade,
  label,
  compact = false,
  className = "",
}: {
  grade: ItemGrade;
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={`grade-badge grade-chip grade-${grade} ${compact ? "grade-badge-compact" : ""} ${className}`.trim()}>
      {label ?? itemGradeLabels[grade]}
    </span>
  );
});
