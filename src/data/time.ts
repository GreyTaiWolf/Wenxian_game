export const CALENDAR_MONTHS_PER_YEAR = 12;
export const CALENDAR_DAYS_PER_MONTH = 30;
export const CALENDAR_DAYS_PER_WEEK = 7;
export const CALENDAR_DAYS_PER_YEAR = CALENDAR_MONTHS_PER_YEAR * CALENDAR_DAYS_PER_MONTH;

export const CALENDAR_ERA_ID = "xuan_yuan";
export const CALENDAR_ERA_NAME = "玄元纪";
export const CALENDAR_NAME = "天衍历";

export const WORLD_TILE_MOVE_DAYS = 7;
export const REGION_TILE_MOVE_DAYS = 1;

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
