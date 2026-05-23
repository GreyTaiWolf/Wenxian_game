import { CALENDAR_DAYS_PER_MONTH, CALENDAR_MONTHS_PER_YEAR } from "../data/time";
import type { GameState } from "../types";
import { appendLog } from "./state";
const HOURS_PER_DAY = 24;
const SAVE_TIME_VERSION = 1;
const SOLAR_TERMS = ["立春", "惊蛰", "清明", "立夏", "芒种", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "小寒"];
const WEATHER_POOL = ["晴朗", "多云", "雨天"];

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
  const safeHours = Math.max(0, Math.floor(days));
  if (safeHours <= 0) {
    return game;
  }
  const currentTick = game.world.time.tick;
  const nextTick = currentTick + safeHours;
  const nextDay = Math.floor(nextTick / HOURS_PER_DAY) + 1;
  const nextHour = nextTick % HOURS_PER_DAY;
  const advancedDays = Math.floor(nextTick / HOURS_PER_DAY) - Math.floor(currentTick / HOURS_PER_DAY);
  const nextAge = game.player.age + advancedDays / (CALENDAR_DAYS_PER_MONTH * CALENDAR_MONTHS_PER_YEAR);
  const nextDate = addDays(game.world.calendar, advancedDays);
  const nextSolarTerm = SOLAR_TERMS[Math.floor((nextDate.month - 1) % SOLAR_TERMS.length)];
  const weatherSeed = Math.floor(nextTick / 6) + game.world.passive.npcStateSeed;
  const nextWeather = WEATHER_POOL[Math.abs(weatherSeed) % WEATHER_POOL.length];
  const nextGame: GameState = {
    ...game,
    player: {
      ...game.player,
      age: Number(nextAge.toFixed(2)),
    },
    world: {
      ...game.world,
      calendar: nextDate,
      time: {
        ...game.world.time,
        version: SAVE_TIME_VERSION,
        tick: nextTick,
        day: nextDay,
        hour: nextHour,
        solarTerm: nextSolarTerm,
        weather: nextWeather,
      },
      passive: resolvePassiveSystems(game, nextTick),
    },
  };
  return reason ? appendLog(nextGame, reason) : nextGame;
}

export function getTimeLabel(game: GameState): string {
  const hour = game.world.time.hour;
  if (hour >= 23 || hour < 3) return "子时";
  if (hour < 7) return "黎明";
  if (hour < 17) return "白昼";
  if (hour < 20) return "黄昏";
  return "夜色";
}

export function createDefaultWorldTime() {
  return { version: SAVE_TIME_VERSION, tick: 0, day: 1, hour: 8, solarTerm: "立春", weather: "晴朗" };
}

export function createDefaultPassiveState() {
  return { spiritFieldGrowth: 0, shopRefreshTick: 24, npcStateSeed: 17, eventCooldowns: {}, questDeadlines: {} };
}

function resolvePassiveSystems(game: GameState, nextTick: number): GameState["world"]["passive"] {
  const delta = Math.max(0, nextTick - game.world.time.tick);
  const spiritFieldGrowth = Math.min(100, game.world.passive.spiritFieldGrowth + delta);
  const shopRefreshTick = nextTick >= game.world.passive.shopRefreshTick ? nextTick + 24 : game.world.passive.shopRefreshTick;
  const eventCooldowns = Object.fromEntries(Object.entries(game.world.passive.eventCooldowns).map(([key, value]) => [key, Math.max(0, value - delta)]));
  const questDeadlines = { ...game.world.passive.questDeadlines };
  return {
    ...game.world.passive,
    spiritFieldGrowth,
    shopRefreshTick,
    npcStateSeed: (game.world.passive.npcStateSeed + Math.floor(delta / 3)) % 997,
    eventCooldowns,
    questDeadlines,
  };
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
