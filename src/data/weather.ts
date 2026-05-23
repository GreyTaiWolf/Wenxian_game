import type { WeatherId, WeatherSnapshot } from "../types";

export interface WeatherConfig {
  id: WeatherId;
  name: string;
  description: string;
  minDurationDays: number;
  maxDurationDays: number;
  plantGrowthMultiplier: number;
  eventWeight: number;
}

export const weatherConfigs: Record<WeatherId, WeatherConfig> = {
  clear: {
    id: "clear",
    name: "晴",
    description: "天光澄净，灵气流转平稳。",
    minDurationDays: 5,
    maxDurationDays: 15,
    plantGrowthMultiplier: 1,
    eventWeight: 45,
  },
  cloudy: {
    id: "cloudy",
    name: "阴",
    description: "云气压低，适合草木缓慢吐纳。",
    minDurationDays: 3,
    maxDurationDays: 9,
    plantGrowthMultiplier: 1.03,
    eventWeight: 18,
  },
  spirit_rain: {
    id: "spirit_rain",
    name: "灵雨",
    description: "细雨含灵，灵田年份增长略快。",
    minDurationDays: 2,
    maxDurationDays: 6,
    plantGrowthMultiplier: 1.18,
    eventWeight: 12,
  },
  thunder_cloud: {
    id: "thunder_cloud",
    name: "雷云",
    description: "雷气游走，易引动妖兽和雷系机缘。",
    minDurationDays: 1,
    maxDurationDays: 4,
    plantGrowthMultiplier: 1.08,
    eventWeight: 7,
  },
  miasma_rain: {
    id: "miasma_rain",
    name: "瘴雨",
    description: "雨幕夹杂瘴气，南疆灵植吸纳异性生机。",
    minDurationDays: 2,
    maxDurationDays: 7,
    plantGrowthMultiplier: 1.12,
    eventWeight: 10,
  },
  snowstorm: {
    id: "snowstorm",
    name: "雪暴",
    description: "寒意封路，冰寒灵植更易沉淀年份。",
    minDurationDays: 2,
    maxDurationDays: 8,
    plantGrowthMultiplier: 0.9,
    eventWeight: 8,
  },
  sandstorm: {
    id: "sandstorm",
    name: "沙暴",
    description: "黄沙遮天，外出风险提高。",
    minDurationDays: 2,
    maxDurationDays: 7,
    plantGrowthMultiplier: 0.92,
    eventWeight: 8,
  },
  tide_fog: {
    id: "tide_fog",
    name: "潮雾",
    description: "潮雾漫卷，水行灵材更易凝露。",
    minDurationDays: 2,
    maxDurationDays: 8,
    plantGrowthMultiplier: 1.1,
    eventWeight: 8,
  },
  starfall: {
    id: "starfall",
    name: "星陨",
    description: "夜中有星屑落入山泽，常伴随罕见机缘。",
    minDurationDays: 1,
    maxDurationDays: 3,
    plantGrowthMultiplier: 1.25,
    eventWeight: 2,
  },
  spirit_tide: {
    id: "spirit_tide",
    name: "灵潮",
    description: "天地灵机涨落，洞府与灵田皆受滋养。",
    minDurationDays: 1,
    maxDurationDays: 5,
    plantGrowthMultiplier: 1.35,
    eventWeight: 3,
  },
};

export const defaultWeatherId: WeatherId = "clear";

export const regionWeatherPools: Record<string, WeatherId[]> = {
  central: ["clear", "cloudy", "spirit_rain", "thunder_cloud", "starfall", "spirit_tide"],
  south_ridge: ["clear", "cloudy", "spirit_rain", "miasma_rain", "thunder_cloud", "spirit_tide"],
  east_sea: ["clear", "cloudy", "spirit_rain", "tide_fog", "thunder_cloud", "spirit_tide"],
  west_desert: ["clear", "cloudy", "sandstorm", "starfall", "spirit_tide"],
  north_border: ["clear", "cloudy", "snowstorm", "thunder_cloud", "starfall"],
};

export function getWeatherConfig(weatherId: WeatherId): WeatherConfig {
  return weatherConfigs[weatherId] ?? weatherConfigs[defaultWeatherId];
}

export function createWeatherSnapshot(weatherId: WeatherId, startedDayIndex: number, durationDays?: number): WeatherSnapshot {
  const config = getWeatherConfig(weatherId);
  const duration =
    typeof durationDays === "number"
      ? Math.max(1, Math.floor(durationDays))
      : randomInt(config.minDurationDays, config.maxDurationDays);
  return {
    weatherId: config.id,
    name: config.name,
    description: config.description,
    startedDayIndex,
    untilDayIndex: startedDayIndex + duration,
  };
}

export function pickWeather(regionId: string): WeatherId {
  const pool = regionWeatherPools[regionId] ?? ["clear", "cloudy", "spirit_rain", "thunder_cloud"];
  const weighted = pool.flatMap((weatherId) => Array.from({ length: Math.max(1, getWeatherConfig(weatherId).eventWeight) }, () => weatherId));
  return weighted[Math.floor(Math.random() * weighted.length)] ?? defaultWeatherId;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
