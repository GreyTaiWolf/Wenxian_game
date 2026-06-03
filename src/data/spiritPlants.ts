import type { Cost, ItemAmount, ItemGrade, ItemTierId, SpiritFieldRegionState, SpiritFieldState } from "../types";
import { itemGradeOrder, normalizeQuality } from "./qualityGrades";

export interface SpiritPlantConfig {
  speciesId: string;
  name: string;
  tier: ItemTierId;
  grade: ItemGrade;
  seedItemId: string;
  matureYears: number;
  description: string;
  baseRewards: ItemAmount[];
  effectText: string;
}

export interface SpiritFieldLevelConfig {
  level: number;
  plotCount: number;
  growthMultiplier: number;
  mutationChance: number;
  upgradeCost: Cost | null;
}

export interface SpiritFieldRegionConfig {
  regionId: string;
  name: string;
  description: string;
  defaultUnlocked: boolean;
  growthMultiplier: number;
  unlockCost: Cost | null;
}

export interface SpiritFieldPlotGradeConfig {
  grade: ItemGrade;
  growthMultiplier: number;
  upgradeCost: Cost | null;
}

export const spiritPlantYearCaps: Record<ItemGrade, number> = {
  fan: 100,
  liang: 300,
  jing: 1000,
  ling: 3000,
  xuan: 10000,
  di: 30000,
  tian: 100000,
  xian: 300000,
  shen: 1000000,
};

export const spiritFieldPlotGradeConfigs: SpiritFieldPlotGradeConfig[] = [
  {
    grade: "fan",
    growthMultiplier: 1,
    upgradeCost: null,
  },
  {
    grade: "liang",
    growthMultiplier: 1.15,
    upgradeCost: {
      spiritStones: 500,
      items: [{ itemId: "spirit_spring_water", amount: 1 }],
    },
  },
  {
    grade: "jing",
    growthMultiplier: 1.35,
    upgradeCost: {
      spiritStones: 1200,
      items: [
        { itemId: "spirit_spring_water", amount: 2 },
        { itemId: "greenwood_essence", amount: 1 },
      ],
    },
  },
  {
    grade: "ling",
    growthMultiplier: 1.6,
    upgradeCost: {
      spiritStones: 2600,
      items: [
        { itemId: "five_color_spirit_soil", amount: 1 },
        { itemId: "greenwood_essence", amount: 2 },
      ],
    },
  },
  {
    grade: "xuan",
    growthMultiplier: 1.9,
    upgradeCost: {
      spiritStones: 6000,
      items: [
        { itemId: "five_color_spirit_soil", amount: 2 },
        { itemId: "greenwood_essence", amount: 4 },
        { itemId: "tide_shell", amount: 1 },
      ],
    },
  },
  {
    grade: "di",
    growthMultiplier: 2.2,
    upgradeCost: {
      spiritStones: 14000,
      items: [
        { itemId: "five_color_spirit_soil", amount: 4 },
        { itemId: "tide_shell", amount: 2 },
        { itemId: "demon_core_shard", amount: 2 },
      ],
    },
  },
  {
    grade: "tian",
    growthMultiplier: 2.5,
    upgradeCost: {
      spiritStones: 32000,
      items: [
        { itemId: "five_color_spirit_soil", amount: 6 },
        { itemId: "spirit_spring_water", amount: 8 },
        { itemId: "demon_core_shard", amount: 4 },
      ],
    },
  },
  {
    grade: "xian",
    growthMultiplier: 2.75,
    upgradeCost: {
      spiritStones: 80000,
      items: [
        { itemId: "five_color_spirit_soil", amount: 10 },
        { itemId: "greenwood_essence", amount: 10 },
        { itemId: "tide_shell", amount: 6 },
        { itemId: "demon_core_shard", amount: 6 },
      ],
    },
  },
  {
    grade: "shen",
    growthMultiplier: 3,
    upgradeCost: {
      spiritStones: 180000,
      items: [
        { itemId: "five_color_spirit_soil", amount: 16 },
        { itemId: "spirit_spring_water", amount: 20 },
        { itemId: "greenwood_essence", amount: 18 },
        { itemId: "demon_core_shard", amount: 10 },
      ],
    },
  },
];

export const spiritPlants: SpiritPlantConfig[] = [
  {
    speciesId: "spirit_grass",
    name: "灵草",
    tier: "qi",
    grade: "fan",
    seedItemId: "spirit_grass_seed",
    matureYears: 1,
    description: "最常见的低阶灵植，一年即可采收，年份高时药性更稳。",
    baseRewards: [{ itemId: "spirit_herb", amount: 2 }],
    effectText: "年份提高会增加灵草产量。",
  },
  {
    speciesId: "qi_grass",
    name: "凝气草",
    tier: "qi",
    grade: "liang",
    seedItemId: "qi_grass_seed",
    matureYears: 2,
    description: "炼气修士常用灵草，两年以上方能凝出可用药力。",
    baseRewards: [{ itemId: "qi_grass", amount: 1 }],
    effectText: "十年以上的凝气草会额外产出灵草。",
  },
  {
    speciesId: "greenwood_vine",
    name: "青木灵藤",
    tier: "foundation",
    grade: "ling",
    seedItemId: "greenwood_vine_seed",
    matureYears: 10,
    description: "筑基后常见洞府灵植，藤液可凝成青木灵液。",
    baseRewards: [{ itemId: "greenwood_essence", amount: 1 }],
    effectText: "百年以上的灵藤会提高青木灵液产量。",
  },
  {
    speciesId: "foundation_lotus",
    name: "筑基莲",
    tier: "foundation",
    grade: "xuan",
    seedItemId: "foundation_lotus_seed",
    matureYears: 30,
    description: "莲心可稳固道基，是炼丹与突破辅助的珍贵灵植。",
    baseRewards: [
      { itemId: "foundation_pill", amount: 1 },
      { itemId: "greenwood_essence", amount: 1 },
    ],
    effectText: "千年以上的筑基莲可显著提高稀有收获。",
  },
  {
    speciesId: "earth_vein_vermilion_fruit",
    name: "地脉朱果",
    tier: "core",
    grade: "di",
    seedItemId: "earth_vein_vermilion_seed",
    matureYears: 100,
    description: "扎根地火与灵脉交界处，万年朱果足以引来大修士争夺。",
    baseRewards: [{ itemId: "earth_vein_vermilion_fruit", amount: 1 }],
    effectText: "万年时会进入当前版本的顶级成熟档。",
  },
  {
    speciesId: "innate_spirit_fruit",
    name: "先天灵果",
    tier: "nascent",
    grade: "xian",
    seedItemId: "innate_spirit_fruit_seed",
    matureYears: 1000,
    description: "古籍中记载的先天灵根果实，十万年份才算真正大成。",
    baseRewards: [{ itemId: "innate_spirit_fruit", amount: 1 }],
    effectText: "万年以上开始产生大境界机缘价值。",
  },
  {
    speciesId: "primordial_dao_seed",
    name: "鸿蒙道种",
    tier: "tribulation",
    grade: "shen",
    seedItemId: "primordial_dao_seed_item",
    matureYears: 10000,
    description: "传说中的终局神品灵植，百万年份才显出道种真形。",
    baseRewards: [{ itemId: "primordial_dao_fruit", amount: 1 }],
    effectText: "百万年为当前规划最高年份档，仅由大型事件链推动。",
  },
];

export const spiritFieldLevels: SpiritFieldLevelConfig[] = [
  {
    level: 0,
    plotCount: 1,
    growthMultiplier: 1,
    mutationChance: 0,
    upgradeCost: null,
  },
  {
    level: 1,
    plotCount: 2,
    growthMultiplier: 1.2,
    mutationChance: 0.01,
    upgradeCost: {
      spiritStones: 600,
      items: [
        { itemId: "spirit_spring_water", amount: 1 },
        { itemId: "spirit_grass_seed", amount: 1 },
      ],
    },
  },
  {
    level: 2,
    plotCount: 3,
    growthMultiplier: 1.6,
    mutationChance: 0.025,
    upgradeCost: {
      spiritStones: 1600,
      items: [
        { itemId: "five_color_spirit_soil", amount: 1 },
        { itemId: "greenwood_essence", amount: 2 },
      ],
    },
  },
  {
    level: 3,
    plotCount: 4,
    growthMultiplier: 2.2,
    mutationChance: 0.05,
    upgradeCost: {
      spiritStones: 4200,
      items: [
        { itemId: "five_color_spirit_soil", amount: 2 },
        { itemId: "greenwood_essence", amount: 4 },
        { itemId: "tide_shell", amount: 2 },
      ],
    },
  },
  {
    level: 4,
    plotCount: 5,
    growthMultiplier: 3,
    mutationChance: 0.08,
    upgradeCost: {
      spiritStones: 12000,
      items: [
        { itemId: "five_color_spirit_soil", amount: 4 },
        { itemId: "spirit_spring_water", amount: 6 },
        { itemId: "demon_core_shard", amount: 4 },
      ],
    },
  },
];

export const spiritFieldRegionConfigs: SpiritFieldRegionConfig[] = [
  {
    regionId: "home_cave",
    name: "本府灵田",
    description: "洞府内最稳定的一片灵土，适合承载早期灵草与长期年份养成。",
    defaultUnlocked: true,
    growthMultiplier: 1,
    unlockCost: null,
  },
  {
    regionId: "herb_valley_plot",
    name: "药谷外田",
    description: "借百草谷余脉开出的外田，灵草类作物年份增长更稳。",
    defaultUnlocked: false,
    growthMultiplier: 1.08,
    unlockCost: {
      spiritStones: 900,
      items: [
        { itemId: "qi_grass_seed", amount: 1 },
        { itemId: "spirit_spring_water", amount: 1 },
      ],
    },
  },
  {
    regionId: "spirit_spring_plot",
    name: "灵泉湿田",
    description: "以灵泉水脉养出的湿田，适合高年份灵植沉淀药性。",
    defaultUnlocked: false,
    growthMultiplier: 1.18,
    unlockCost: {
      spiritStones: 1600,
      items: [
        { itemId: "spirit_spring_water", amount: 2 },
        { itemId: "greenwood_essence", amount: 1 },
      ],
    },
  },
  {
    regionId: "earth_fire_plot",
    name: "地火暖田",
    description: "贴近地火的高阶灵田，适合后续地脉朱果和火性灵材。",
    defaultUnlocked: false,
    growthMultiplier: 1.3,
    unlockCost: {
      spiritStones: 3200,
      items: [
        { itemId: "five_color_spirit_soil", amount: 1 },
        { itemId: "demon_core_shard", amount: 2 },
      ],
    },
  },
];

export function getSpiritPlant(speciesId: string): SpiritPlantConfig {
  return spiritPlants.find((plant) => plant.speciesId === speciesId) ?? spiritPlants[0];
}

export function getSpiritPlantBySeed(seedItemId: string): SpiritPlantConfig | null {
  return spiritPlants.find((plant) => plant.seedItemId === seedItemId) ?? null;
}

export function getSpiritPlantYearCap(grade: ItemGrade): number {
  return spiritPlantYearCaps[grade] ?? spiritPlantYearCaps.fan;
}

export function getSpiritFieldPlotGradeConfig(grade: ItemGrade | string | null | undefined): SpiritFieldPlotGradeConfig {
  const normalized = typeof grade === "string" ? normalizeQuality(grade) : "fan";
  return spiritFieldPlotGradeConfigs.find((config) => config.grade === normalized) ?? spiritFieldPlotGradeConfigs[0];
}

export function getNextSpiritFieldPlotGradeConfig(grade: ItemGrade | string | null | undefined): SpiritFieldPlotGradeConfig | null {
  const currentGrade = getSpiritFieldPlotGradeConfig(grade).grade;
  const nextGrade = itemGradeOrder[itemGradeOrder.indexOf(currentGrade) + 1];
  return nextGrade ? getSpiritFieldPlotGradeConfig(nextGrade) : null;
}

export function getSpiritFieldLevelConfig(level: number): SpiritFieldLevelConfig {
  return spiritFieldLevels.find((config) => config.level === level) ?? spiritFieldLevels[0];
}

export function getNextSpiritFieldLevelConfig(level: number): SpiritFieldLevelConfig | null {
  return spiritFieldLevels.find((config) => config.level === level + 1) ?? null;
}

export function getSpiritFieldRegionConfig(regionId: string | null | undefined): SpiritFieldRegionConfig {
  return spiritFieldRegionConfigs.find((config) => config.regionId === regionId) ?? spiritFieldRegionConfigs[0];
}

export function createDefaultSpiritFieldState(): SpiritFieldState {
  const regions = Object.fromEntries(spiritFieldRegionConfigs.map((config) => [config.regionId, createDefaultSpiritFieldRegionState(config.regionId)]));
  return {
    activeRegionId: spiritFieldRegionConfigs[0].regionId,
    regions,
    totalHarvests: 0,
  };
}

export function createDefaultSpiritFieldRegionState(regionId: string): SpiritFieldRegionState {
  const region = getSpiritFieldRegionConfig(regionId);
  const levelConfig = spiritFieldLevels[0];
  return {
    regionId: region.regionId,
    level: 0,
    unlocked: region.defaultUnlocked,
    plots: Array.from({ length: 9 }, (_, index) => ({
      id: `${region.regionId}_plot_${index + 1}`,
      unlocked: region.defaultUnlocked && index < levelConfig.plotCount,
      soilGrade: "fan",
      plant: null,
    })),
  };
}
