import { memo, type ReactNode } from "react";
import { GameIcon, type GameIconName } from "../GameIcon";
import { GradeBadge } from "./GradeBadge";
import type { ItemGrade } from "../../types";

export type ItemSlotState = "empty" | "filled" | "selected" | "disabled";

export const ItemSlot = memo(function ItemSlot({
  state,
  grade,
  amount,
  icon,
  iconName = "item",
  name,
  description,
  onClick,
  className = "",
  disabled = false,
}: {
  state: ItemSlotState;
  grade?: ItemGrade;
  amount?: number;
  icon?: ReactNode;
  iconName?: GameIconName;
  name?: string;
  description?: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const isDisabled = disabled || state === "disabled";
  const isInteractive = Boolean(onClick) && !isDisabled;
  const content = (
    <>
      <span className="item-slot-icon">{icon ?? <GameIcon name={iconName} size={20} />}</span>
      <span className="item-slot-copy">
        <span className="item-slot-name">{name ?? "空"}</span>
        {description ? <small>{description}</small> : null}
      </span>
      {amount && amount > 1 ? <span className="item-slot-amount">x{amount}</span> : null}
      {grade ? <GradeBadge grade={grade} compact /> : null}
    </>
  );
  const classes = `item-slot item-slot-${state} ${grade ? `grade-card grade-${grade}` : ""} ${className}`.trim();

  if (isInteractive) {
    return (
      <button className={classes} onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
});
