import type { GridCell, GridMapData } from "../types";

export const CALENDAR_MONTHS_PER_YEAR = 12;
export const CALENDAR_DAYS_PER_MONTH = 30;
export const CALENDAR_DAYS_PER_WEEK = 7;
export const CALENDAR_HOURS_PER_DAY = 24;
export const CALENDAR_TICKS_PER_HOUR = 1;
export const CALENDAR_TICKS_PER_DAY = CALENDAR_HOURS_PER_DAY * CALENDAR_TICKS_PER_HOUR;
export const CALENDAR_DAYS_PER_YEAR = CALENDAR_MONTHS_PER_YEAR * CALENDAR_DAYS_PER_MONTH;

export const CALENDAR_ERA_ID = "xuan_yuan";
export const CALENDAR_ERA_NAME = "玄元纪";
export const CALENDAR_NAME = "天衍历";

export const COMBAT_ACTION_HOURS = 3;
export const GATHER_ACTION_HOURS = 2;
export const TREASURE_ACTION_HOURS = 2;

export function getGridMoveHours(map: Pick<GridMapData, "cellDistance" | "cellDistanceUnit">, cell?: Pick<GridCell, "movementCost">): number {
  const movementCost = Math.max(1, cell?.movementCost ?? 1);
  if (map.cellDistanceUnit === "meter") {
    return Math.max(0, Math.round((map.cellDistance / 1200) * movementCost));
  }
  return Math.max(1, Math.round((map.cellDistance / 8) * movementCost));
}

export const calendarMonthNames = ["正月", "杏月", "桃月", "槐月", "蒲月", "荷月", "兰月", "桂月", "菊月", "露月", "霜月", "腊月"] as const;

export const solarTerms = [
  "立春",
  "雨水",
  "惊蛰",
  "春分",
  "清明",
  "谷雨",
  "立夏",
  "小满",
  "芒种",
  "夏至",
  "小暑",
  "大暑",
  "立秋",
  "处暑",
  "白露",
  "秋分",
  "寒露",
  "霜降",
  "立冬",
  "小雪",
  "大雪",
  "冬至",
  "小寒",
  "大寒",
] as const;

export const seasonLabels = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
} as const;
