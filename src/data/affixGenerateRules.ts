import type { AffixCategory, MajorRealmId, Stats } from "../types";

export const affixCategoryWeights: Record<"qi" | "foundation" | "core" | "nascent", Record<AffixCategory, number>> = {
  qi: {
    attack: 30,
    defense: 25,
    resource: 20,
    speed: 12,
    dodge: 8,
    crit: 5,
    spiritSense: 0,
    special: 0,
  },
  foundation: {
    attack: 28,
    defense: 23,
    resource: 20,
    speed: 12,
    dodge: 10,
    crit: 7,
    spiritSense: 0,
    special: 2,
  },
  core: {
    attack: 24,
    defense: 20,
    resource: 18,
    speed: 10,
    dodge: 10,
    crit: 10,
    spiritSense: 0,
    special: 8,
  },
  nascent: {
    attack: 20,
    defense: 18,
    resource: 16,
    speed: 8,
    dodge: 8,
    crit: 10,
    spiritSense: 18,
    special: 14,
  },
};

export const baseAffixStatRanges: Record<
  MajorRealmId,
  Partial<Record<keyof Stats | "attackPct" | "defensePct" | "maxHpPct" | "maxSpiritPct" | "spiritSensePct" | "speedPct" | "skillDamagePct", [number, number]>>
> = {
  mortal: {
    attack: [1, 2],
    defense: [1, 1],
    maxHp: [5, 15],
    maxSpirit: [3, 10],
    speed: [0, 1],
    critRate: [0.001, 0.004],
    critDamage: [0.01, 0.03],
    dodgeRate: [0.001, 0.003],
  },
  qi: {
    attack: [1, 3],
    defense: [1, 2],
    maxHp: [8, 25],
    maxSpirit: [5, 15],
    speed: [0, 1],
    critRate: [0.002, 0.008],
    critDamage: [0.02, 0.05],
    dodgeRate: [0.002, 0.006],
    attackPct: [0.01, 0.03],
    defensePct: [0.01, 0.025],
    maxHpPct: [0.01, 0.03],
    maxSpiritPct: [0.01, 0.03],
    skillDamagePct: [0.01, 0.03],
  },
  foundation: {
    attack: [3, 8],
    defense: [2, 5],
    maxHp: [30, 90],
    maxSpirit: [20, 60],
    speed: [1, 2],
    critRate: [0.004, 0.012],
    critDamage: [0.03, 0.08],
    dodgeRate: [0.004, 0.01],
    attackPct: [0.025, 0.06],
    defensePct: [0.02, 0.05],
    maxHpPct: [0.025, 0.06],
    maxSpiritPct: [0.025, 0.06],
    skillDamagePct: [0.03, 0.08],
  },
  core: {
    attack: [10, 28],
    defense: [6, 18],
    maxHp: [120, 350],
    maxSpirit: [80, 220],
    speed: [2, 4],
    critRate: [0.008, 0.02],
    critDamage: [0.05, 0.12],
    dodgeRate: [0.008, 0.018],
    attackPct: [0.04, 0.09],
    defensePct: [0.035, 0.08],
    maxHpPct: [0.04, 0.09],
    maxSpiritPct: [0.04, 0.09],
    skillDamagePct: [0.05, 0.12],
  },
  nascent: {
    attack: [35, 95],
    defense: [20, 60],
    maxHp: [400, 1200],
    maxSpirit: [250, 750],
    speed: [3, 8],
    critRate: [0.012, 0.03],
    critDamage: [0.08, 0.18],
    dodgeRate: [0.012, 0.026],
    spiritSense: [15, 50],
    attackPct: [0.06, 0.12],
    defensePct: [0.05, 0.1],
    maxHpPct: [0.06, 0.12],
    maxSpiritPct: [0.06, 0.12],
    spiritSensePct: [0.06, 0.12],
    skillDamagePct: [0.08, 0.15],
  },
  deity: {
    attack: [120, 320],
    defense: [70, 200],
    maxHp: [1500, 4200],
    maxSpirit: [900, 2600],
    speed: [6, 14],
    critRate: [0.02, 0.045],
    critDamage: [0.12, 0.25],
    dodgeRate: [0.02, 0.04],
    spiritSense: [60, 180],
    attackPct: [0.08, 0.16],
    defensePct: [0.07, 0.14],
    maxHpPct: [0.08, 0.16],
    maxSpiritPct: [0.08, 0.16],
    spiritSensePct: [0.08, 0.16],
    skillDamagePct: [0.1, 0.18],
  },
  void: {},
  integration: {},
  mahayana: {},
  tribulation: {},
};

export function getAffixWeightRealm(realmTier: MajorRealmId): keyof typeof affixCategoryWeights {
  if (realmTier === "mortal" || realmTier === "qi") {
    return "qi";
  }
  if (realmTier === "foundation") {
    return "foundation";
  }
  if (realmTier === "core") {
    return "core";
  }
  return "nascent";
}

export function getAffixRangeRealm(realmTier: MajorRealmId): MajorRealmId {
  if (Object.keys(baseAffixStatRanges[realmTier]).length) {
    return realmTier;
  }
  return "deity";
}
