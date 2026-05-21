import { CALENDAR_DAYS_PER_MONTH, CALENDAR_MONTHS_PER_YEAR } from "../data/time";
import type { GameState } from "../types";
import { appendLog } from "./state";

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export function normalizeCalendarDate(input: Partial<CalendarDate> | undefined): CalendarDate {
  const year = Math.max(1, Math.floor(input?.year ?? 1));
  const month = clamp(Math.floor(input?.month ?? 1), 1, CALENDAR_MONTHS_PER_YEAR);
  const day = clamp(Math.floor(input?.day ?? 1), 1, CALENDAR_DAYS_PER_MONTH);
  return { year, month, day };
}

export function advanceTime(game: GameState, days: number, reason?: string): GameState {
  const safeDays = Math.max(0, Math.floor(days));
  if (safeDays <= 0) {
    return game;
  }
  const nextAge = game.player.age + safeDays / (CALENDAR_DAYS_PER_MONTH * CALENDAR_MONTHS_PER_YEAR);
  const nextDate = addDays(game.world.calendar, safeDays);
  const nextGame: GameState = {
    ...game,
    player: {
      ...game.player,
      age: Number(nextAge.toFixed(2)),
    },
    world: {
      ...game.world,
      calendar: nextDate,
    },
  };
  return reason ? appendLog(nextGame, reason) : nextGame;
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const totalDays = Math.max(0, toDayIndex(date) + Math.floor(days));
  return fromDayIndex(totalDays);
}

export function formatCalendar(date: CalendarDate): string {
  return `第${date.year}年 ${date.month}月 ${date.day}日`;
}

function toDayIndex(date: CalendarDate): number {
  const yearOffset = (date.year - 1) * CALENDAR_MONTHS_PER_YEAR * CALENDAR_DAYS_PER_MONTH;
  const monthOffset = (date.month - 1) * CALENDAR_DAYS_PER_MONTH;
  return yearOffset + monthOffset + (date.day - 1);
}

function fromDayIndex(index: number): CalendarDate {
  const daysPerYear = CALENDAR_MONTHS_PER_YEAR * CALENDAR_DAYS_PER_MONTH;
  const year = Math.floor(index / daysPerYear) + 1;
  const remainYear = index % daysPerYear;
  const month = Math.floor(remainYear / CALENDAR_DAYS_PER_MONTH) + 1;
  const day = (remainYear % CALENDAR_DAYS_PER_MONTH) + 1;
  return { year, month, day };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
