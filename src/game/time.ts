import {
  CALENDAR_DAYS_PER_MONTH,
  CALENDAR_DAYS_PER_YEAR,
  CALENDAR_ERA_ID,
  CALENDAR_ERA_NAME,
  CALENDAR_MONTHS_PER_YEAR,
  CALENDAR_NAME,
  calendarMonthNames,
  solarTerms,
} from "../data/time";
import { createWeatherSnapshot, defaultWeatherId, getWeatherConfig, pickWeather, regionWeatherPools } from "../data/weather";
import type { CalendarState, GameState, SeasonId, WeatherState, WorldEventState } from "../types";
import { advanceSpiritFieldByDays } from "./spiritField";
import { appendLog } from "./state";

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export function normalizeCalendarDate(input: Partial<CalendarState> | Partial<CalendarDate> | undefined): CalendarState {
  const year = Math.max(1, Math.floor(input?.year ?? 1));
  const month = clamp(Math.floor(input?.month ?? 1), 1, CALENDAR_MONTHS_PER_YEAR);
  const day = clamp(Math.floor(input?.day ?? 1), 1, CALENDAR_DAYS_PER_MONTH);
  return enrichCalendarDate({ year, month, day });
}

export function advanceTime(game: GameState, days: number, reason?: string): GameState {
  const safeDays = Math.max(0, Math.floor(days));
  if (safeDays <= 0) {
    return game;
  }
  const nextAge = game.player.age + safeDays / (CALENDAR_DAYS_PER_MONTH * CALENDAR_MONTHS_PER_YEAR);
  const nextDate = addDays(game.world.calendar, safeDays);
  const nextGame: GameState = advanceSpiritFieldByDays({
    ...game,
    player: {
      ...game.player,
      age: Number(nextAge.toFixed(2)),
    },
    world: {
      ...game.world,
      calendar: nextDate,
      weather: advanceWeatherState(game.world.weather, nextDate.dayIndex),
      events: tickWorldEventState(game.world.events, nextDate.dayIndex),
    },
  }, safeDays);
  return reason ? appendLog(nextGame, reason) : nextGame;
}

export function addDays(date: CalendarState | CalendarDate, days: number): CalendarState {
  const totalDays = Math.max(0, toDayIndex(date) + Math.floor(days));
  return fromDayIndex(totalDays);
}

export function formatCalendar(date: CalendarState | CalendarDate): string {
  const normalized = normalizeCalendarDate(date);
  const monthName = calendarMonthNames[normalized.month - 1] ?? `${normalized.month}月`;
  return `${normalized.eraName} 第${normalized.year}年 ${monthName} ${formatDayName(normalized.day)} · ${normalized.solarTerm}`;
}

export function formatRegionWeather(weather: WeatherState | undefined, regionId: string): string {
  const normalized = normalizeWeatherState(weather, 0);
  const regionWeather = normalized.regions[regionId] ?? normalized.global;
  return `${regionWeather.name}`;
}

export function createDefaultWeatherState(dayIndex: number): WeatherState {
  return normalizeWeatherState(undefined, dayIndex);
}

export function normalizeWeatherState(input: Partial<WeatherState> | undefined, dayIndex: number): WeatherState {
  const safeDayIndex = Math.max(0, Math.floor(dayIndex));
  const global = input?.global?.weatherId ? input.global : createWeatherSnapshot(defaultWeatherId, safeDayIndex, 12);
  const regions = Object.keys(regionWeatherPools).reduce<Record<string, WeatherState["global"]>>((acc, regionId) => {
    const current = input?.regions?.[regionId];
    acc[regionId] = current?.weatherId ? current : createWeatherSnapshot(regionId === "south_ridge" ? "spirit_rain" : defaultWeatherId, safeDayIndex, 10);
    return acc;
  }, {});
  return {
    global,
    regions,
    updatedDayIndex: Math.max(0, Math.floor(input?.updatedDayIndex ?? safeDayIndex)),
  };
}

export function normalizeWorldEventState(input: Partial<WorldEventState> | undefined): WorldEventState {
  return {
    triggeredCounts: normalizeRecord(input?.triggeredCounts),
    cooldowns: normalizeRecord(input?.cooldowns),
    flags: normalizeBooleanRecord(input?.flags),
    activeEventId: typeof input?.activeEventId === "string" ? input.activeEventId : null,
    lastEventDayIndex: Math.max(0, Math.floor(input?.lastEventDayIndex ?? -1)),
  };
}

export function toDayIndex(date: CalendarState | CalendarDate): number {
  const yearOffset = (date.year - 1) * CALENDAR_MONTHS_PER_YEAR * CALENDAR_DAYS_PER_MONTH;
  const monthOffset = (date.month - 1) * CALENDAR_DAYS_PER_MONTH;
  return yearOffset + monthOffset + (date.day - 1);
}

export function fromDayIndex(index: number): CalendarState {
  const safeIndex = Math.max(0, Math.floor(index));
  const year = Math.floor(safeIndex / CALENDAR_DAYS_PER_YEAR) + 1;
  const remainYear = safeIndex % CALENDAR_DAYS_PER_YEAR;
  const month = Math.floor(remainYear / CALENDAR_DAYS_PER_MONTH) + 1;
  const day = (remainYear % CALENDAR_DAYS_PER_MONTH) + 1;
  return enrichCalendarDate({ year, month, day });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function enrichCalendarDate(date: CalendarDate): CalendarState {
  const dayIndex = toDayIndex(date);
  return {
    eraId: CALENDAR_ERA_ID,
    eraName: CALENDAR_ERA_NAME,
    calendarName: CALENDAR_NAME,
    ...date,
    dayIndex,
    season: getSeason(date.month),
    solarTerm: getSolarTerm(date.month, date.day),
  };
}

function getSeason(month: number): SeasonId {
  if (month >= 1 && month <= 3) {
    return "spring";
  }
  if (month >= 4 && month <= 6) {
    return "summer";
  }
  if (month >= 7 && month <= 9) {
    return "autumn";
  }
  return "winter";
}

function getSolarTerm(month: number, day: number): string {
  const index = (month - 1) * 2 + (day >= 16 ? 1 : 0);
  return solarTerms[index] ?? solarTerms[0];
}

function formatDayName(day: number): string {
  return day === 1 ? "初一" : `${day}日`;
}

function advanceWeatherState(input: WeatherState | undefined, dayIndex: number): WeatherState {
  const current = normalizeWeatherState(input, dayIndex);
  const global = current.global.untilDayIndex <= dayIndex ? createWeatherSnapshot(pickGlobalWeather(), dayIndex) : current.global;
  const regions = Object.fromEntries(
    Object.keys(regionWeatherPools).map((regionId) => {
      const weather = current.regions[regionId];
      return [regionId, weather.untilDayIndex <= dayIndex ? createWeatherSnapshot(pickWeather(regionId), dayIndex) : weather];
    }),
  );
  return {
    global,
    regions,
    updatedDayIndex: dayIndex,
  };
}

function pickGlobalWeather() {
  const roll = Math.random();
  if (roll < 0.04) {
    return "spirit_tide";
  }
  if (roll < 0.07) {
    return "starfall";
  }
  if (roll < 0.22) {
    return "spirit_rain";
  }
  if (roll < 0.38) {
    return "cloudy";
  }
  return getWeatherConfig(defaultWeatherId).id;
}

function tickWorldEventState(input: WorldEventState | undefined, dayIndex: number): WorldEventState {
  const events = normalizeWorldEventState(input);
  const cooldowns = Object.fromEntries(Object.entries(events.cooldowns).filter(([, untilDayIndex]) => untilDayIndex > dayIndex));
  return {
    ...events,
    cooldowns,
  };
}

function normalizeRecord(input: Record<string, number> | undefined): Record<string, number> {
  return Object.fromEntries(Object.entries(input ?? {}).map(([key, value]) => [key, Math.max(0, Math.floor(value))]));
}

function normalizeBooleanRecord(input: Record<string, boolean> | undefined): Record<string, boolean> {
  return Object.fromEntries(Object.entries(input ?? {}).map(([key, value]) => [key, Boolean(value)]));
}
