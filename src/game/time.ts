import { CALENDAR_DAYS_PER_MONTH, CALENDAR_MONTHS_PER_YEAR } from "../data/time";
import type { GameState } from "../types";
import { appendLog } from "./state";
const HOURS_PER_DAY = 24;
const INITIAL_WORLD_HOUR = 8;
const HOURS_PER_YEAR = HOURS_PER_DAY * CALENDAR_DAYS_PER_MONTH * CALENDAR_MONTHS_PER_YEAR;
const NPC_STATE_SEED_BASE = 17;
const NPC_STATE_SEED_PERIOD_HOURS = 3;
const NPC_STATE_SEED_MODULUS = 997;
const SAVE_TIME_VERSION = 1;
const SOLAR_TERMS = ["立春", "惊蛰", "清明", "立夏", "芒种", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "小寒"];
const WEATHER_POOL = ["晴朗", "多云", "雨天"];

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

type WorldTimeState = GameState["world"]["time"];
type PassiveState = GameState["world"]["passive"];

export function normalizeCalendarDate(input: Partial<CalendarDate> | undefined): CalendarDate {
  const year = Math.max(1, Math.floor(input?.year ?? 1));
  const month = clamp(Math.floor(input?.month ?? 1), 1, CALENDAR_MONTHS_PER_YEAR);
  const day = clamp(Math.floor(input?.day ?? 1), 1, CALENDAR_DAYS_PER_MONTH);
  return { year, month, day };
}

export function normalizeWorldTimeState(input: Partial<WorldTimeState> | null | undefined): WorldTimeState {
  const defaultTime = createDefaultWorldTime();
  const rawTick = readInteger(input?.tick, 0);
  const rawDay = readInteger(input?.day, 1);
  const rawHour = readInteger(input?.hour, 0, HOURS_PER_DAY - 1);
  let tick: number;

  if (rawTick !== null && rawDay !== null && rawHour !== null) {
    const clockTick = (rawDay - 1) * HOURS_PER_DAY + rawHour;
    tick = rawTick === clockTick ? rawTick : clockTick;
  } else if (rawTick !== null) {
    tick = rawTick;
  } else if (rawDay !== null || rawHour !== null) {
    tick = ((rawDay ?? defaultTime.day) - 1) * HOURS_PER_DAY + (rawHour ?? defaultTime.hour);
  } else {
    tick = defaultTime.tick;
  }

  const day = Math.floor(tick / HOURS_PER_DAY) + 1;
  const hour = tick % HOURS_PER_DAY;
  const solarTerm = typeof input?.solarTerm === "string" && SOLAR_TERMS.includes(input.solarTerm) ? input.solarTerm : defaultTime.solarTerm;
  const weather = typeof input?.weather === "string" && WEATHER_POOL.includes(input.weather) ? input.weather : defaultTime.weather;
  return {
    version: SAVE_TIME_VERSION,
    tick,
    day,
    hour,
    solarTerm,
    weather,
  };
}

export function normalizePassiveState(input: Partial<PassiveState> | null | undefined, currentTick = INITIAL_WORLD_HOUR): PassiveState {
  const defaultPassive = createDefaultPassiveState();
  const safeTick = readInteger(currentTick, 0) ?? INITIAL_WORLD_HOUR;
  return {
    spiritFieldGrowth: readNumberInRange(input?.spiritFieldGrowth, 0, 100) ?? defaultPassive.spiritFieldGrowth,
    shopRefreshTick: readInteger(input?.shopRefreshTick, 0) ?? defaultPassive.shopRefreshTick,
    npcStateSeed: getNpcStateSeed(safeTick),
    eventCooldowns: normalizeNonNegativeRecord(input?.eventCooldowns),
    questDeadlines: normalizeNonNegativeRecord(input?.questDeadlines),
  };
}

export function advanceTime(game: GameState, hours: number, reason?: string): GameState {
  const safeHours = readInteger(hours, 0) ?? 0;
  if (safeHours <= 0) {
    return game;
  }
  const currentTime = normalizeWorldTimeState(game.world.time);
  const currentPassive = normalizePassiveState(game.world.passive, currentTime.tick);
  const currentTick = currentTime.tick;
  const nextTick = currentTick + safeHours;
  const nextDay = Math.floor(nextTick / HOURS_PER_DAY) + 1;
  const nextHour = nextTick % HOURS_PER_DAY;
  const advancedDays = Math.floor(nextTick / HOURS_PER_DAY) - Math.floor(currentTick / HOURS_PER_DAY);
  const ageAtInitialTick = game.player.age - Math.max(0, currentTick - INITIAL_WORLD_HOUR) / HOURS_PER_YEAR;
  const nextAge = ageAtInitialTick + Math.max(0, nextTick - INITIAL_WORLD_HOUR) / HOURS_PER_YEAR;
  const nextDate = addDays(game.world.calendar, advancedDays);
  const nextSolarTerm = SOLAR_TERMS[Math.floor((nextDate.month - 1) % SOLAR_TERMS.length)];
  const nextPassive = resolvePassiveSystems(currentPassive, currentTick, nextTick);
  const weatherSeed = Math.floor(nextTick / 6) + nextPassive.npcStateSeed;
  const nextWeather = WEATHER_POOL[Math.abs(weatherSeed) % WEATHER_POOL.length];
  const nextGame: GameState = {
    ...game,
    player: {
      ...game.player,
      age: nextAge,
    },
    world: {
      ...game.world,
      calendar: nextDate,
      time: {
        ...currentTime,
        version: SAVE_TIME_VERSION,
        tick: nextTick,
        day: nextDay,
        hour: nextHour,
        solarTerm: nextSolarTerm,
        weather: nextWeather,
      },
      passive: nextPassive,
    },
  };
  return reason ? appendLog(nextGame, reason) : nextGame;
}

export function getTimeLabel(game: GameState): string {
  const hour = normalizeWorldTimeState(game.world.time).hour;
  if (hour >= 23 || hour < 3) return "子时";
  if (hour < 7) return "黎明";
  if (hour < 17) return "白昼";
  if (hour < 20) return "黄昏";
  return "夜色";
}

export function createDefaultWorldTime() {
  return { version: SAVE_TIME_VERSION, tick: INITIAL_WORLD_HOUR, day: 1, hour: INITIAL_WORLD_HOUR, solarTerm: "立春", weather: "晴朗" };
}

export function createDefaultPassiveState() {
  return { spiritFieldGrowth: 0, shopRefreshTick: 24, npcStateSeed: NPC_STATE_SEED_BASE, eventCooldowns: {}, questDeadlines: {} };
}

function resolvePassiveSystems(passive: PassiveState, currentTick: number, nextTick: number): PassiveState {
  const delta = Math.max(0, nextTick - currentTick);
  const spiritFieldGrowth = Math.min(100, passive.spiritFieldGrowth + delta);
  const shopRefreshTick = nextTick >= passive.shopRefreshTick ? nextTick + 24 : passive.shopRefreshTick;
  const eventCooldowns = Object.fromEntries(Object.entries(passive.eventCooldowns).map(([key, value]) => [key, Math.max(0, value - delta)]));
  const questDeadlines = { ...passive.questDeadlines };
  return {
    ...passive,
    spiritFieldGrowth,
    shopRefreshTick,
    npcStateSeed: getNpcStateSeed(nextTick),
    eventCooldowns,
    questDeadlines,
  };
}

function getNpcStateSeed(tick: number): number {
  const elapsedHours = Math.max(0, tick - INITIAL_WORLD_HOUR);
  return (NPC_STATE_SEED_BASE + Math.floor(elapsedHours / NPC_STATE_SEED_PERIOD_HOURS)) % NPC_STATE_SEED_MODULUS;
}

function normalizeNonNegativeRecord(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key, value]) => key.length > 0 && typeof value === "number" && Number.isFinite(value))
      .map(([key, value]) => [key, Math.max(0, value as number)]),
  );
}

function readInteger(value: unknown, min: number, max = Number.POSITIVE_INFINITY): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const integer = Math.floor(value);
  return integer >= min && integer <= max ? integer : null;
}

function readNumberInRange(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    return null;
  }
  return value;
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
