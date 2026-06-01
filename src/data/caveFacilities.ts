import type {
  AlchemyState,
  BeastStableState,
  CavePetInstance,
  CaveRefineryState,
  Cost,
  GridTerrain,
  MountInstance,
  MountYardState,
  Stats,
  TeamMember,
} from "../types";

export interface AlchemyRecipeConfig {
  id: string;
  label: string;
  recipeItemId: string;
  resultItemId: string;
  outputAmount: number;
  description: string;
  cost: Cost;
  baseSuccessRate: number;
  requiredFurnaceLevel: number;
}

export interface AlchemyFurnaceLevelConfig {
  level: number;
  successBonus: number;
  extraOutputChance: number;
  failureReturnRate: number;
  upgradeCost: Cost | null;
}

export interface CaveRefineryLevelConfig {
  level: number;
  spiritStoneDiscount: number;
  upgradeCost: Cost | null;
}

export interface BeastStableLevelConfig {
  level: number;
  slotCount: number;
  maxPetLevel: number;
  upgradeCost: Cost | null;
}

export interface PetConfig {
  id: string;
  name: string;
  description: string;
  baseStats: Stats;
  skillIds: string[];
  feedItemId: string;
}

export interface MountYardLevelConfig {
  level: number;
  maxMountLevel: number;
  upgradeCost: Cost | null;
}

export interface MountConfig {
  id: string;
  name: string;
  description: string;
  baseTravelReduction: number;
  travelReductionPerLevel: number;
  maxTravelReduction: number;
  terrainBonus: Partial<Record<GridTerrain, number>>;
  blockedTerrains: GridTerrain[];
  feedItemId: string;
}

export const alchemyRecipes: AlchemyRecipeConfig[] = [
  {
    id: "make_healing_powder",
    label: "炼制回春散",
    recipeItemId: "healing_powder_recipe",
    resultItemId: "healing_powder",
    outputAmount: 2,
    description: "以灵草为主药，炼成战斗中可快速止血回气的散剂。",
    cost: {
      spiritStones: 12,
      items: [{ itemId: "spirit_herb", amount: 2 }],
    },
    baseSuccessRate: 0.98,
    requiredFurnaceLevel: 0,
  },
  {
    id: "make_qi_pill",
    label: "炼制聚气丹",
    recipeItemId: "qi_pill_recipe",
    resultItemId: "qi_pill",
    outputAmount: 1,
    description: "凝气草引灵，灵草稳火，成丹后可辅助炼气修行。",
    cost: {
      spiritStones: 48,
      items: [
        { itemId: "qi_grass", amount: 2 },
        { itemId: "spirit_herb", amount: 1 },
      ],
    },
    baseSuccessRate: 0.85,
    requiredFurnaceLevel: 0,
  },
  {
    id: "make_foundation_pill",
    label: "炼制筑基丹",
    recipeItemId: "foundation_pill_recipe",
    resultItemId: "foundation_pill",
    outputAmount: 1,
    description: "以凝气草打底、青木灵液护炉，炼成冲击筑基的关键丹药。",
    cost: {
      spiritStones: 420,
      items: [
        { itemId: "qi_grass", amount: 3 },
        { itemId: "greenwood_essence", amount: 1 },
      ],
    },
    baseSuccessRate: 0.72,
    requiredFurnaceLevel: 1,
  },
];

export const alchemyFurnaceLevels: AlchemyFurnaceLevelConfig[] = [
  { level: 0, successBonus: 0, extraOutputChance: 0, failureReturnRate: 0.35, upgradeCost: null },
  {
    level: 1,
    successBonus: 0.08,
    extraOutputChance: 0.1,
    failureReturnRate: 0.45,
    upgradeCost: { spiritStones: 500, items: [{ itemId: "spirit_spring_water", amount: 1 }] },
  },
  {
    level: 2,
    successBonus: 0.15,
    extraOutputChance: 0.18,
    failureReturnRate: 0.55,
    upgradeCost: {
      spiritStones: 1200,
      items: [
        { itemId: "greenwood_essence", amount: 2 },
        { itemId: "qi_grass", amount: 3 },
      ],
    },
  },
  {
    level: 3,
    successBonus: 0.22,
    extraOutputChance: 0.25,
    failureReturnRate: 0.65,
    upgradeCost: {
      spiritStones: 2600,
      items: [
        { itemId: "greenwood_essence", amount: 3 },
        { itemId: "demon_core_shard", amount: 2 },
      ],
    },
  },
];

export const caveRefineryLevels: CaveRefineryLevelConfig[] = [
  { level: 0, spiritStoneDiscount: 0, upgradeCost: null },
  { level: 1, spiritStoneDiscount: 0.05, upgradeCost: { spiritStones: 500, items: [{ itemId: "beast_bone", amount: 2 }] } },
  {
    level: 2,
    spiritStoneDiscount: 0.1,
    upgradeCost: {
      spiritStones: 1200,
      items: [
        { itemId: "beast_bone", amount: 6 },
        { itemId: "qi_grass", amount: 2 },
      ],
    },
  },
  {
    level: 3,
    spiritStoneDiscount: 0.15,
    upgradeCost: {
      spiritStones: 2800,
      items: [
        { itemId: "demon_core_shard", amount: 2 },
        { itemId: "greenwood_essence", amount: 2 },
      ],
    },
  },
];

export const beastStableLevels: BeastStableLevelConfig[] = [
  { level: 0, slotCount: 1, maxPetLevel: 5, upgradeCost: null },
  { level: 1, slotCount: 2, maxPetLevel: 10, upgradeCost: { spiritStones: 600, items: [{ itemId: "beast_bone", amount: 2 }] } },
  {
    level: 2,
    slotCount: 3,
    maxPetLevel: 20,
    upgradeCost: {
      spiritStones: 1800,
      items: [
        { itemId: "beast_bone", amount: 6 },
        { itemId: "demon_core_shard", amount: 1 },
      ],
    },
  },
  {
    level: 3,
    slotCount: 4,
    maxPetLevel: 30,
    upgradeCost: {
      spiritStones: 4200,
      items: [
        { itemId: "demon_core_shard", amount: 3 },
        { itemId: "greenwood_essence", amount: 2 },
      ],
    },
  },
];

export const petConfigs: PetConfig[] = [
  {
    id: "pet_green_fox",
    name: "青羽狐",
    description: "灵性极高的山狐，擅长护主与敏捷突袭。",
    baseStats: { maxHp: 150, maxSpirit: 34, attack: 24, defense: 13, spiritSense: 0, speed: 24, dodgeRate: 0.04, critRate: 0.08, critDamage: 1.5 },
    skillIds: ["bite", "pounce", "guard_master"],
    feedItemId: "beast_bone",
  },
];

export const mountYardLevels: MountYardLevelConfig[] = [
  { level: 0, maxMountLevel: 5, upgradeCost: null },
  { level: 1, maxMountLevel: 10, upgradeCost: { spiritStones: 500, items: [{ itemId: "spirit_grass_seed", amount: 1 }] } },
  {
    level: 2,
    maxMountLevel: 20,
    upgradeCost: {
      spiritStones: 1600,
      items: [
        { itemId: "qi_grass_seed", amount: 2 },
        { itemId: "spirit_spring_water", amount: 1 },
      ],
    },
  },
  {
    level: 3,
    maxMountLevel: 30,
    upgradeCost: {
      spiritStones: 3600,
      items: [
        { itemId: "greenwood_essence", amount: 2 },
        { itemId: "five_color_spirit_soil", amount: 1 },
      ],
    },
  },
];

export const mountConfigs: MountConfig[] = [
  {
    id: "green_mane_spirit_deer",
    name: "青鬃灵鹿",
    description: "温顺而脚程轻快的低阶灵兽，适合穿行林谷。",
    baseTravelReduction: 0.1,
    travelReductionPerLevel: 0.01,
    maxTravelReduction: 0.45,
    terrainBonus: {
      forest: 0.05,
      valley: 0.05,
    },
    blockedTerrains: ["water", "forbidden"],
    feedItemId: "spirit_herb",
  },
];

export function getAlchemyRecipe(recipeId: string | null | undefined): AlchemyRecipeConfig | null {
  return alchemyRecipes.find((recipe) => recipe.id === recipeId) ?? null;
}

export function getAlchemyRecipeByItem(recipeItemId: string | null | undefined): AlchemyRecipeConfig | null {
  return alchemyRecipes.find((recipe) => recipe.recipeItemId === recipeItemId) ?? null;
}

export function getAlchemyFurnaceLevel(level: number): AlchemyFurnaceLevelConfig {
  return alchemyFurnaceLevels.find((config) => config.level === level) ?? alchemyFurnaceLevels[0];
}

export function getNextAlchemyFurnaceLevel(level: number): AlchemyFurnaceLevelConfig | null {
  return alchemyFurnaceLevels.find((config) => config.level === level + 1) ?? null;
}

export function getCaveRefineryLevel(level: number): CaveRefineryLevelConfig {
  return caveRefineryLevels.find((config) => config.level === level) ?? caveRefineryLevels[0];
}

export function getNextCaveRefineryLevel(level: number): CaveRefineryLevelConfig | null {
  return caveRefineryLevels.find((config) => config.level === level + 1) ?? null;
}

export function getBeastStableLevel(level: number): BeastStableLevelConfig {
  return beastStableLevels.find((config) => config.level === level) ?? beastStableLevels[0];
}

export function getNextBeastStableLevel(level: number): BeastStableLevelConfig | null {
  return beastStableLevels.find((config) => config.level === level + 1) ?? null;
}

export function getPetConfig(petId: string | null | undefined): PetConfig | null {
  return petConfigs.find((pet) => pet.id === petId) ?? null;
}

export function getMountYardLevel(level: number): MountYardLevelConfig {
  return mountYardLevels.find((config) => config.level === level) ?? mountYardLevels[0];
}

export function getNextMountYardLevel(level: number): MountYardLevelConfig | null {
  return mountYardLevels.find((config) => config.level === level + 1) ?? null;
}

export function getMountConfig(mountId: string | null | undefined): MountConfig | null {
  return mountConfigs.find((mount) => mount.id === mountId) ?? null;
}

export function createDefaultAlchemyState(): AlchemyState {
  return {
    furnaceLevel: 0,
    learnedRecipes: {},
    totalCrafts: 0,
    totalFailures: 0,
  };
}

export function createDefaultCaveRefineryState(): CaveRefineryState {
  return {
    level: 0,
    totalCrafts: 0,
    totalReforges: 0,
  };
}

export function createDefaultBeastStableState(): BeastStableState {
  return {
    level: 0,
    pets: [],
    activePetId: null,
  };
}

export function createDefaultMountYardState(): MountYardState {
  const starterMount = mountConfigs[0];
  return {
    level: 0,
    mounts: starterMount ? [{ mountId: starterMount.id, level: 1, intimacy: 10 }] : [],
    activeMountId: starterMount?.id ?? null,
  };
}

export function normalizeAlchemyState(input: Partial<AlchemyState> | undefined): AlchemyState {
  return {
    furnaceLevel: clampLevel(input?.furnaceLevel, alchemyFurnaceLevels.length - 1),
    learnedRecipes: normalizeBooleanRecord(input?.learnedRecipes),
    totalCrafts: normalizeNonNegativeInteger(input?.totalCrafts),
    totalFailures: normalizeNonNegativeInteger(input?.totalFailures),
  };
}

export function normalizeCaveRefineryState(input: Partial<CaveRefineryState> | undefined): CaveRefineryState {
  return {
    level: clampLevel(input?.level, caveRefineryLevels.length - 1),
    totalCrafts: normalizeNonNegativeInteger(input?.totalCrafts),
    totalReforges: normalizeNonNegativeInteger(input?.totalReforges),
  };
}

export function normalizeBeastStableState(input: Partial<BeastStableState> | undefined, legacyTeam: TeamMember[] = []): BeastStableState {
  const pets = (input?.pets ?? [])
    .map(normalizePetInstance)
    .filter((pet): pet is CavePetInstance => Boolean(pet && getPetConfig(pet.petId)));
  legacyTeam
    .filter((member) => member.kind === "pet" && getPetConfig(member.id))
    .forEach((member) => {
      if (!pets.some((pet) => pet.petId === member.id)) {
        pets.push({ petId: member.id, level: 1, intimacy: 20, breakthrough: 0 });
      }
    });
  const activePetId = typeof input?.activePetId === "string" && pets.some((pet) => pet.petId === input.activePetId) ? input.activePetId : pets[0]?.petId ?? null;
  return {
    level: clampLevel(input?.level, beastStableLevels.length - 1),
    pets,
    activePetId,
  };
}

export function normalizeMountYardState(input: Partial<MountYardState> | undefined): MountYardState {
  const defaults = createDefaultMountYardState();
  const mounts = (input?.mounts?.length ? input.mounts : defaults.mounts)
    .map(normalizeMountInstance)
    .filter((mount): mount is MountInstance => Boolean(mount && getMountConfig(mount.mountId)));
  const activeMountId = typeof input?.activeMountId === "string" && mounts.some((mount) => mount.mountId === input.activeMountId) ? input.activeMountId : mounts[0]?.mountId ?? null;
  return {
    level: clampLevel(input?.level, mountYardLevels.length - 1),
    mounts,
    activeMountId,
  };
}

function normalizePetInstance(input: Partial<CavePetInstance> | undefined): CavePetInstance | null {
  if (!input?.petId) {
    return null;
  }
  return {
    petId: input.petId,
    level: Math.max(1, normalizeNonNegativeInteger(input.level || 1)),
    intimacy: clampNumber(input.intimacy, 0, 100),
    breakthrough: clampNumber(input.breakthrough, 0, 9),
  };
}

function normalizeMountInstance(input: Partial<MountInstance> | undefined): MountInstance | null {
  if (!input?.mountId) {
    return null;
  }
  return {
    mountId: input.mountId,
    level: Math.max(1, normalizeNonNegativeInteger(input.level || 1)),
    intimacy: clampNumber(input.intimacy, 0, 100),
  };
}

function normalizeBooleanRecord(input: Record<string, boolean> | undefined): Record<string, boolean> {
  return Object.fromEntries(Object.entries(input ?? {}).filter(([, learned]) => learned === true).map(([id]) => [id, true]));
}

function normalizeNonNegativeInteger(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value ?? 0));
}

function clampLevel(value: number | undefined, max: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(max, Math.floor(value ?? 0)));
}

function clampNumber(value: number | undefined, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value ?? min));
}
