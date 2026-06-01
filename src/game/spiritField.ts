import { getSpiritArrayConfig } from "../data/cave";
import { formatItemName, itemGradeMetas } from "../data/items";
import { CALENDAR_DAYS_PER_YEAR } from "../data/time";
import {
  createDefaultSpiritFieldRegionState,
  createDefaultSpiritFieldState,
  getNextSpiritFieldLevelConfig,
  getSpiritFieldLevelConfig,
  getSpiritFieldRegionConfig,
  getSpiritPlant,
  getSpiritPlantBySeed,
  spiritFieldRegionConfigs,
  spiritPlants,
} from "../data/spiritPlants";
import { getWeatherConfig } from "../data/weather";
import type { GameState, ItemAmount, SpiritFieldRegionState, SpiritFieldState, SpiritPlantInstance } from "../types";
import { addItems, appendLog, canAffordCost, describeCost, removeItems, spendCost } from "./state";

export function normalizeSpiritFieldState(field: Partial<SpiritFieldState> | undefined): SpiritFieldState {
  const defaults = createDefaultSpiritFieldState();
  const raw = field as (Partial<SpiritFieldState> & { level?: number; plots?: SpiritFieldRegionState["plots"] }) | undefined;

  if (Array.isArray(raw?.plots)) {
    const legacyRegion = normalizeRegionState("home_cave", { level: raw.level, unlocked: true, plots: raw.plots });
    return {
      ...defaults,
      activeRegionId: "home_cave",
      totalHarvests: normalizeNonNegativeInteger(raw?.totalHarvests),
      regions: {
        ...defaults.regions,
        home_cave: legacyRegion,
      },
    };
  }

  const regions = Object.fromEntries(
    spiritFieldRegionConfigs.map((config) => {
      const normalized = normalizeRegionState(config.regionId, field?.regions?.[config.regionId]);
      return [config.regionId, normalized];
    }),
  );
  const activeRegionId =
    typeof field?.activeRegionId === "string" && regions[field.activeRegionId]?.unlocked ? field.activeRegionId : spiritFieldRegionConfigs[0].regionId;

  return {
    activeRegionId,
    regions,
    totalHarvests: normalizeNonNegativeInteger(field?.totalHarvests),
  };
}

export function setActiveSpiritFieldRegion(game: GameState, regionId: string): GameState {
  const field = normalizeSpiritFieldState(game.cave.spiritField);
  const region = field.regions[regionId];
  if (!region) {
    return appendLog(game, "这片灵田尚未登记在洞府阵图中。");
  }
  if (!region.unlocked) {
    const config = getSpiritFieldRegionConfig(regionId);
    return appendLog(game, `${config.name}尚未开辟，需先扩展灵田。`);
  }
  return {
    ...game,
    cave: {
      ...game.cave,
      spiritField: {
        ...field,
        activeRegionId: regionId,
      },
    },
  };
}

export function unlockSpiritFieldRegion(game: GameState, regionId: string): GameState {
  const field = normalizeSpiritFieldState(game.cave.spiritField);
  const region = field.regions[regionId];
  const config = getSpiritFieldRegionConfig(regionId);
  if (!region) {
    return appendLog(game, "这片灵田尚未登记在洞府阵图中。");
  }
  if (region.unlocked) {
    return appendLog(game, `${config.name}已经开辟。`);
  }
  if (!config.unlockCost) {
    return appendLog(game, `${config.name}暂不可扩展。`);
  }
  if (!canAffordCost(game, config.unlockCost)) {
    return appendLog(game, `开辟${config.name}所需资源不足：${describeCost(config.unlockCost)}。`);
  }
  const paidGame = spendCost(game, config.unlockCost);
  const openedRegion = normalizeRegionState(regionId, { ...region, unlocked: true });
  return appendLog(
    {
      ...paidGame,
      cave: {
        ...paidGame.cave,
        spiritField: {
          ...field,
          activeRegionId: regionId,
          regions: {
            ...field.regions,
            [regionId]: openedRegion,
          },
        },
      },
    },
    `你以阵旗牵引地脉，开辟了${config.name}。`,
  );
}

export function advanceSpiritFieldByDays(game: GameState, days: number): GameState {
  const safeDays = Math.max(0, Math.floor(days));
  if (safeDays <= 0) {
    return game;
  }
  const field = normalizeSpiritFieldState(game.cave.spiritField);
  if (!Object.values(field.regions).some((region) => region.unlocked && region.plots.some((plot) => plot.plant))) {
    return { ...game, cave: { ...game.cave, spiritField: field } };
  }

  const nextRegions = Object.fromEntries(
    Object.entries(field.regions).map(([regionId, region]) => {
      if (!region.unlocked) {
        return [regionId, region];
      }
      const multiplier = getSpiritFieldGrowthMultiplier(game, regionId);
      const levelConfig = getSpiritFieldLevelConfig(region.level);
      const growthDays = safeDays * multiplier;
      return [
        regionId,
        {
          ...region,
          plots: region.plots.map((plot) => {
            if (!plot.plant) {
              return plot;
            }
            const species = getSpiritPlant(plot.plant.speciesId);
            const maxYears = Math.min(species.maxMeaningfulYears, levelConfig.maxPlantYears);
            const totalProgress = plot.plant.growthProgressDays + growthDays;
            const gainedYears = Math.floor(totalProgress / CALENDAR_DAYS_PER_YEAR);
            return {
              ...plot,
              plant: {
                ...plot.plant,
                years: Math.min(maxYears, plot.plant.years + gainedYears),
                growthProgressDays: gainedYears > 0 ? totalProgress % CALENDAR_DAYS_PER_YEAR : totalProgress,
              },
            };
          }),
        },
      ];
    }),
  );

  return {
    ...game,
    cave: {
      ...game.cave,
      spiritField: {
        ...field,
        regions: nextRegions,
      },
    },
  };
}

export function plantSpiritSeed(game: GameState, regionId: string, plotId: string, seedItemId: string): GameState {
  const species = getSpiritPlantBySeed(seedItemId);
  if (!species) {
    return appendLog(game, "这枚种子暂未登记灵植谱，不能种入灵田。");
  }
  if ((game.inventory.items[seedItemId] ?? 0) <= 0) {
    return appendLog(game, "背包中没有对应灵种。");
  }

  const field = normalizeSpiritFieldState(game.cave.spiritField);
  const region = field.regions[regionId];
  const regionConfig = getSpiritFieldRegionConfig(regionId);
  if (!region?.unlocked) {
    return appendLog(game, `${regionConfig.name}尚未开辟。`);
  }
  const plot = region.plots.find((item) => item.id === plotId);
  if (!plot?.unlocked) {
    return appendLog(game, "这块灵田尚未开垦。");
  }
  if (plot.plant) {
    return appendLog(game, "这块灵田已经种有灵植。");
  }

  const levelConfig = getSpiritFieldLevelConfig(region.level);
  if (itemGradeMetas[species.grade].tier > itemGradeMetas[levelConfig.maxGrade].tier) {
    return appendLog(game, `当前灵田最高只能承载${levelConfig.maxGrade}品级灵植，需先升级灵田。`);
  }

  const planted: SpiritPlantInstance = {
    id: `plant_${species.speciesId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    speciesId: species.speciesId,
    grade: species.grade,
    plantedAt: game.world.calendar,
    years: 0,
    plotId,
    growthBonusSnapshot: getSpiritFieldGrowthMultiplier(game, regionId),
    growthProgressDays: 0,
  };
  const paidGame = removeItems(game, [{ itemId: seedItemId, amount: 1 }]);
  const nextRegion = {
    ...region,
    plots: region.plots.map((item) => (item.id === plotId ? { ...item, plant: planted } : item)),
  };
  return appendLog(
    {
      ...paidGame,
      cave: {
        ...paidGame.cave,
        spiritField: {
          ...field,
          activeRegionId: regionId,
          regions: {
            ...field.regions,
            [regionId]: nextRegion,
          },
        },
      },
    },
    `你将${species.name}种入${regionConfig.name}${formatPlotName(plotId)}，以阵旗护住初生灵机。`,
  );
}

export function harvestSpiritPlant(game: GameState, regionId: string, plotId: string): GameState {
  const field = normalizeSpiritFieldState(game.cave.spiritField);
  const region = field.regions[regionId];
  const plot = region?.plots.find((item) => item.id === plotId);
  if (!plot?.plant) {
    return appendLog(game, "这块灵田尚无可收获的灵植。");
  }
  const species = getSpiritPlant(plot.plant.speciesId);
  if (plot.plant.years < species.matureYears) {
    return appendLog(game, `${species.name}尚未成熟，至少需要 ${species.matureYears} 年。`);
  }

  const rewards = scalePlantRewards(species.baseRewards, plot.plant.years, species.matureYears);
  const rewardedGame = addItems(game, rewards);
  const nextRegion = {
    ...region,
    plots: region.plots.map((item) => (item.id === plotId ? { ...item, plant: null } : item)),
  };
  return appendLog(
    {
      ...rewardedGame,
      cave: {
        ...rewardedGame.cave,
        spiritField: {
          ...field,
          totalHarvests: field.totalHarvests + 1,
          regions: {
            ...field.regions,
            [regionId]: nextRegion,
          },
        },
      },
    },
    `你采收${formatPlantYears(plot.plant.years)}${species.name}，获得${formatRewards(rewards)}。`,
  );
}

export function uprootSpiritPlant(game: GameState, regionId: string, plotId: string): GameState {
  const field = normalizeSpiritFieldState(game.cave.spiritField);
  const region = field.regions[regionId];
  const plot = region?.plots.find((item) => item.id === plotId);
  if (!plot?.plant) {
    return appendLog(game, "这块灵田本就空着。");
  }
  const species = getSpiritPlant(plot.plant.speciesId);
  const nextRegion = {
    ...region,
    plots: region.plots.map((item) => (item.id === plotId ? { ...item, plant: null } : item)),
  };
  return appendLog(
    {
      ...game,
      cave: {
        ...game.cave,
        spiritField: {
          ...field,
          regions: {
            ...field.regions,
            [regionId]: nextRegion,
          },
        },
      },
    },
    `你拔除了${species.name}，这块灵田重新空出。`,
  );
}

export function upgradeSpiritField(game: GameState, regionId: string): GameState {
  const field = normalizeSpiritFieldState(game.cave.spiritField);
  const region = field.regions[regionId];
  const regionConfig = getSpiritFieldRegionConfig(regionId);
  if (!region?.unlocked) {
    return appendLog(game, `${regionConfig.name}尚未开辟。`);
  }
  const nextLevel = getNextSpiritFieldLevelConfig(region.level);
  if (!nextLevel || !nextLevel.upgradeCost) {
    return appendLog(game, "灵田已升至当前版本上限。");
  }
  if (!canAffordCost(game, nextLevel.upgradeCost)) {
    return appendLog(game, `升级灵田所需资源不足：${describeCost(nextLevel.upgradeCost)}。`);
  }
  const paidGame = spendCost(game, nextLevel.upgradeCost);
  const nextRegion = {
    ...region,
    level: nextLevel.level,
    plots: region.plots.map((plot, index) => ({ ...plot, unlocked: index < nextLevel.plotCount || plot.unlocked })),
  };
  return appendLog(
    {
      ...paidGame,
      cave: {
        ...paidGame.cave,
        spiritField: {
          ...field,
          activeRegionId: regionId,
          regions: {
            ...field.regions,
            [regionId]: nextRegion,
          },
        },
      },
    },
    `${regionConfig.name}升至 ${nextLevel.level} 级，可承载更高年份与更高品级灵植。`,
  );
}

export function getAvailableSpiritSeeds(game: GameState): Array<{ itemId: string; amount: number; plantName: string }> {
  return spiritPlants
    .map((plant) => ({ itemId: plant.seedItemId, amount: game.inventory.items[plant.seedItemId] ?? 0, plantName: plant.name }))
    .filter((seed) => seed.amount > 0);
}

export function getPlantMaturityLabel(plant: SpiritPlantInstance): string {
  const species = getSpiritPlant(plant.speciesId);
  return plant.years >= species.matureYears ? "可收获" : `未成熟，还需 ${species.matureYears - plant.years} 年`;
}

export function getSpiritFieldGrowthMultiplier(game: GameState, regionId = normalizeSpiritFieldState(game.cave.spiritField).activeRegionId): number {
  const field = normalizeSpiritFieldState(game.cave.spiritField);
  const region = field.regions[regionId] ?? field.regions.home_cave;
  const fieldConfig = getSpiritFieldLevelConfig(region.level);
  const regionConfig = getSpiritFieldRegionConfig(region.regionId);
  const arrayConfig = getSpiritArrayConfig(game.cave.spiritArrayLevel);
  const regionWeather = game.world.weather.regions[game.world.regionId] ?? game.world.weather.global;
  const weatherBonus = Math.max(getWeatherConfig(game.world.weather.global.weatherId).plantGrowthMultiplier, getWeatherConfig(regionWeather.weatherId).plantGrowthMultiplier);
  return roundMultiplier(fieldConfig.growthMultiplier * regionConfig.growthMultiplier * (1 + (arrayConfig.multiplier - 1) * 0.5) * weatherBonus);
}

export function formatPlantYears(years: number): string {
  if (years >= 1000000) {
    const value = Math.floor(years / 1000000);
    return value === 1 ? "百万年" : `${value}百万年`;
  }
  if (years >= 100000) {
    const value = Math.floor(years / 100000);
    return value === 1 ? "十万年" : `${value}十万年`;
  }
  if (years >= 10000) {
    const value = Math.floor(years / 10000);
    return value === 1 ? "万年" : `${value}万年`;
  }
  if (years >= 1000) {
    const value = Math.floor(years / 1000);
    return value === 1 ? "千年" : `${value}千年`;
  }
  if (years >= 100) {
    const value = Math.floor(years / 100);
    return value === 1 ? "百年" : `${value}百年`;
  }
  if (years >= 10) {
    const value = Math.floor(years / 10);
    return value === 1 ? "十年" : `${value}十年`;
  }
  return `${years}年`;
}

function normalizeRegionState(regionId: string, region: Partial<SpiritFieldRegionState> | undefined): SpiritFieldRegionState {
  const defaults = createDefaultSpiritFieldRegionState(regionId);
  const level = normalizeLevel(region?.level);
  const levelConfig = getSpiritFieldLevelConfig(level);
  const unlocked = regionId === "home_cave" || Boolean(region?.unlocked ?? defaults.unlocked);
  const plots = defaults.plots.map((defaultPlot, index) => {
    const rawPlot = region?.plots?.[index];
    return {
      id: typeof rawPlot?.id === "string" ? rawPlot.id : defaultPlot.id,
      unlocked: unlocked && (index < levelConfig.plotCount || Boolean(rawPlot?.unlocked)),
      plant: normalizePlant(rawPlot?.plant, defaultPlot.id),
    };
  });
  return {
    regionId,
    level,
    unlocked,
    plots,
  };
}

function normalizePlant(plant: Partial<SpiritPlantInstance> | null | undefined, fallbackPlotId: string): SpiritPlantInstance | null {
  if (!plant?.speciesId) {
    return null;
  }
  const species = getSpiritPlant(plant.speciesId);
  return {
    id: typeof plant.id === "string" ? plant.id : `plant_${species.speciesId}_${fallbackPlotId}`,
    speciesId: species.speciesId,
    grade: plant.grade ?? species.grade,
    plantedAt: plant.plantedAt as SpiritPlantInstance["plantedAt"],
    years: normalizeNonNegativeInteger(plant.years),
    plotId: typeof plant.plotId === "string" ? plant.plotId : fallbackPlotId,
    growthBonusSnapshot: typeof plant.growthBonusSnapshot === "number" && Number.isFinite(plant.growthBonusSnapshot) ? plant.growthBonusSnapshot : 1,
    growthProgressDays: normalizeNonNegativeNumber(plant.growthProgressDays),
  };
}

function normalizeLevel(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(4, Math.floor(value ?? 0)));
}

function normalizeNonNegativeInteger(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value ?? 0));
}

function normalizeNonNegativeNumber(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value ?? 0);
}

function scalePlantRewards(rewards: ItemAmount[], years: number, matureYears: number): ItemAmount[] {
  const multiplier = getYearRewardMultiplier(years, matureYears);
  return rewards.map((reward) => ({ ...reward, amount: Math.max(1, Math.floor(reward.amount * multiplier)) }));
}

function getYearRewardMultiplier(years: number, matureYears: number): number {
  if (years >= 1000000) {
    return 12;
  }
  if (years >= 100000) {
    return 9;
  }
  if (years >= 10000) {
    return 6;
  }
  if (years >= 1000) {
    return 4;
  }
  if (years >= 100) {
    return 3;
  }
  if (years >= 10) {
    return 2;
  }
  return years >= matureYears ? 1 : 0;
}

function formatRewards(rewards: ItemAmount[]): string {
  return rewards.map((reward) => `${formatItemName(reward.itemId)} x${reward.amount}`).join("，");
}

function formatPlotName(plotId: string): string {
  return `第${plotId.replace(/\D/g, "") || "一"}块`;
}

function roundMultiplier(value: number): number {
  return Math.round(value * 100) / 100;
}
