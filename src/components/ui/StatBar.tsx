import { memo } from "react";

export type StatBarTone = "hp" | "spirit" | "cultivation" | "gold" | "neutral";

export const StatBar = memo(function StatBar({
  label,
  value,
  max,
  tone = "neutral",
  detail,
}: {
  label: string;
  value: number;
  max: number;
  tone?: StatBarTone;
  detail?: string;
}) {
  const safeMax = Math.max(1, max);
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div className={`stat-bar stat-bar-${tone}`}>
      <div className="stat-bar-top">
        <span>{label}</span>
        <small>{detail ?? `${Math.floor(value)} / ${Math.floor(safeMax)}`}</small>
      </div>
      <div className="stat-bar-track">
        <span className="stat-bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
});
