import type { Cost } from "../types";

export interface SpiritArrayLevelConfig {
  level: number;
  multiplier: number;
  maxMeditationMinutes: number;
  upgradeCost: Cost | null;
}

export const caveBaseCultivationPerMinute = 12;

export const spiritArrayLevels: SpiritArrayLevelConfig[] = [
  {
    level: 0,
    multiplier: 1,
    maxMeditationMinutes: 8 * 60,
    upgradeCost: null,
  },
  {
    level: 1,
    multiplier: 1.1,
    maxMeditationMinutes: 10 * 60,
    upgradeCost: {
      spiritStones: 500,
      items: [{ itemId: "greenwood_essence", amount: 1 }],
    },
  },
  {
    level: 2,
    multiplier: 1.22,
    maxMeditationMinutes: 12 * 60,
    upgradeCost: {
      spiritStones: 1000,
      items: [
        { itemId: "greenwood_essence", amount: 2 },
        { itemId: "demon_core_shard", amount: 2 },
      ],
    },
  },
  {
    level: 3,
    multiplier: 1.35,
    maxMeditationMinutes: 14 * 60,
    upgradeCost: {
      spiritStones: 1800,
      items: [
        { itemId: "greenwood_essence", amount: 4 },
        { itemId: "tide_shell", amount: 2 },
      ],
    },
  },
];

export function getSpiritArrayConfig(level: number): SpiritArrayLevelConfig {
  return spiritArrayLevels.find((config) => config.level === level) ?? spiritArrayLevels[0];
}

export function getNextSpiritArrayConfig(level: number): SpiritArrayLevelConfig | null {
  return spiritArrayLevels.find((config) => config.level === level + 1) ?? null;
}
