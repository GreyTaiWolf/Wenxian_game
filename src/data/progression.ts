import type { MajorRealmId, RealmConfig, RealmPhaseId } from "../types";

export const majorRealmOrder: MajorRealmId[] = [
  "mortal",
  "qi",
  "foundation",
  "core",
  "nascent",
  "deity",
  "void",
  "integration",
  "mahayana",
  "tribulation",
];

export const realmPhaseOrder: RealmPhaseId[] = ["early", "middle", "late", "peak"];

export const majorRealmLabels: Record<MajorRealmId, string> = {
  mortal: "凡人",
  qi: "炼气",
  foundation: "筑基",
  core: "结丹",
  nascent: "元婴",
  deity: "化神",
  void: "炼虚",
  integration: "合体",
  mahayana: "大乘",
  tribulation: "渡劫",
};

export const realmPhaseLabels: Record<RealmPhaseId, string> = {
  early: "初期",
  middle: "中期",
  late: "后期",
  peak: "圆满",
};

export const realms: RealmConfig[] = [
  {
    id: "qi_early",
    name: "炼气初期",
    majorRealmId: "qi",
    phaseId: "early",
    requiredCultivation: 120,
    baseStats: { maxHp: 220, maxSpirit: 48, attack: 34, defense: 18, spiritSense: 0, speed: 18, dodgeRate: 0.02, critRate: 0.05, critDamage: 1.5 },
    lifespan: 200,
    breakthroughCost: {},
    successRate: 1,
    unlocks: ["cultivation", "inventory", "explore", "cave"],
  },
  {
    id: "qi_middle",
    name: "炼气中期",
    majorRealmId: "qi",
    phaseId: "middle",
    requiredCultivation: 320,
    baseStats: { maxHp: 310, maxSpirit: 72, attack: 47, defense: 25, spiritSense: 0, speed: 21, dodgeRate: 0.022, critRate: 0.055, critDamage: 1.5 },
    lifespan: 400,
    breakthroughCost: { spiritStones: 80 },
    successRate: 0.92,
    unlocks: ["cultivation", "inventory", "explore", "cave"],
  },
  {
    id: "qi_late",
    name: "炼气后期",
    majorRealmId: "qi",
    phaseId: "late",
    requiredCultivation: 850,
    baseStats: { maxHp: 420, maxSpirit: 105, attack: 62, defense: 33, spiritSense: 0, speed: 24, dodgeRate: 0.024, critRate: 0.06, critDamage: 1.5 },
    lifespan: 600,
    breakthroughCost: {
      spiritStones: 180,
      items: [{ itemId: "qi_grass", amount: 2 }],
    },
    successRate: 0.88,
    unlocks: ["cultivation", "inventory", "explore", "cave", "foundationSkills"],
  },
  {
    id: "qi_peak",
    name: "炼气圆满",
    majorRealmId: "qi",
    phaseId: "peak",
    requiredCultivation: 1800,
    baseStats: { maxHp: 560, maxSpirit: 150, attack: 80, defense: 42, spiritSense: 0, speed: 28, dodgeRate: 0.026, critRate: 0.065, critDamage: 1.5 },
    lifespan: 800,
    breakthroughCost: {
      spiritStones: 360,
      items: [{ itemId: "foundation_pill", amount: 1 }],
    },
    successRate: 0.82,
    unlocks: ["cultivation", "inventory", "explore", "cave", "foundationSkills", "pet"],
  },
  {
    id: "foundation_early",
    name: "筑基初期",
    majorRealmId: "foundation",
    phaseId: "early",
    requiredCultivation: 4200,
    baseStats: { maxHp: 820, maxSpirit: 250, attack: 116, defense: 60, spiritSense: 0, speed: 33, dodgeRate: 0.028, critRate: 0.07, critDamage: 1.5 },
    lifespan: 2200,
    breakthroughCost: {},
    successRate: 0.38,
    unlocks: ["cultivation", "inventory", "explore", "foundationSkills", "pet", "cave"],
  },
  {
    id: "foundation_middle",
    name: "筑基中期",
    majorRealmId: "foundation",
    phaseId: "middle",
    requiredCultivation: 9600,
    baseStats: { maxHp: 1120, maxSpirit: 360, attack: 154, defense: 79, spiritSense: 0, speed: 38, dodgeRate: 0.03, critRate: 0.075, critDamage: 1.5 },
    lifespan: 2400,
    breakthroughCost: {
      spiritStones: 900,
      items: [{ itemId: "beast_bone", amount: 4 }],
    },
    successRate: 0.78,
    unlocks: ["cultivation", "inventory", "explore", "foundationSkills", "pet", "cave", "companion"],
  },
  {
    id: "foundation_late",
    name: "筑基后期",
    majorRealmId: "foundation",
    phaseId: "late",
    requiredCultivation: 22000,
    baseStats: { maxHp: 1480, maxSpirit: 500, attack: 198, defense: 99, spiritSense: 0, speed: 43, dodgeRate: 0.032, critRate: 0.08, critDamage: 1.5 },
    lifespan: 2700,
    breakthroughCost: {
      spiritStones: 1800,
      items: [{ itemId: "greenwood_essence", amount: 2 }],
    },
    successRate: 0.72,
    unlocks: ["cultivation", "inventory", "explore", "foundationSkills", "pet", "cave", "companion"],
  },
  {
    id: "foundation_peak",
    name: "筑基圆满",
    majorRealmId: "foundation",
    phaseId: "peak",
    requiredCultivation: 50000,
    baseStats: { maxHp: 1900, maxSpirit: 680, attack: 248, defense: 124, spiritSense: 0, speed: 49, dodgeRate: 0.034, critRate: 0.085, critDamage: 1.5 },
    lifespan: 3000,
    breakthroughCost: {
      spiritStones: 3600,
      items: [
        { itemId: "greenwood_essence", amount: 4 },
        { itemId: "demon_core_shard", amount: 3 },
      ],
    },
    successRate: 0.66,
    unlocks: ["cultivation", "inventory", "explore", "foundationSkills", "pet", "cave", "companion"],
  },
];

export function getRealm(realmId: string): RealmConfig {
  return realms.find((realm) => realm.id === realmId) ?? realms[0];
}

export function getNextRealm(realmId: string): RealmConfig | null {
  const index = realms.findIndex((realm) => realm.id === realmId);
  return index >= 0 ? realms[index + 1] ?? null : null;
}

export function isRealmAtLeast(currentRealmId: string, requiredRealmId: string): boolean {
  const currentIndex = realms.findIndex((realm) => realm.id === currentRealmId);
  const requiredIndex = realms.findIndex((realm) => realm.id === requiredRealmId);
  return currentIndex >= 0 && requiredIndex >= 0 && currentIndex >= requiredIndex;
}

export function getRealmStage(realmId: string): { majorRealmId: MajorRealmId; phaseId: RealmPhaseId; label: string } {
  const realm = getRealm(realmId);
  return {
    majorRealmId: realm.majorRealmId,
    phaseId: realm.phaseId,
    label: `${majorRealmLabels[realm.majorRealmId]}${realmPhaseLabels[realm.phaseId]}`,
  };
}

export function isRealmStageAtLeast(currentRealmId: string, requiredMajorRealmId: MajorRealmId, requiredPhaseId: RealmPhaseId = "early"): boolean {
  const currentRealm = getRealm(currentRealmId);
  const currentMajorIndex = majorRealmOrder.indexOf(currentRealm.majorRealmId);
  const requiredMajorIndex = majorRealmOrder.indexOf(requiredMajorRealmId);
  if (currentMajorIndex !== requiredMajorIndex) {
    return currentMajorIndex > requiredMajorIndex;
  }
  return realmPhaseOrder.indexOf(currentRealm.phaseId) >= realmPhaseOrder.indexOf(requiredPhaseId);
}
