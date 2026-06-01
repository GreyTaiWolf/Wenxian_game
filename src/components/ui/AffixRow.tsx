import { memo } from "react";
import { itemGradeLabels, itemGradeNamePrefixes } from "../../data/items";
import type { ItemAffix } from "../../types";

export const AffixRow = memo(function AffixRow({
  affix,
  description,
  actionLabel,
  locked = false,
  disabled = false,
  onClick,
  className = "",
}: {
  affix: ItemAffix;
  description?: string;
  actionLabel?: string;
  locked?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const gradePrefix = itemGradeNamePrefixes[affix.grade];
  const classes = [
    "affix-row",
    "grade-card",
    `grade-${affix.grade}`,
    locked ? "locked" : "",
    disabled ? "disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      <span className={`affix-row-grade grade-chip grade-${affix.grade}`} title={itemGradeLabels[affix.grade]}>
        {gradePrefix}
      </span>
      <span className="affix-row-copy">
        <strong className={`grade-name grade-${affix.grade}`}>{`${gradePrefix}·${affix.name}`}</strong>
        <small>{description ?? affix.description}</small>
      </span>
      {actionLabel ? <em className="affix-row-action">{actionLabel}</em> : null}
    </>
  );

  if (onClick) {
    return (
      <button className={classes} disabled={disabled} onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
});
