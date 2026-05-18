import type { RealmConfig } from "../types";

export const realms: RealmConfig[] = [
  {
    id: "qi_early",
    name: "炼气初期",
    requiredCultivation: 120,
    breakthroughCost: {},
    successRate: 1,
    unlocks: ["cultivation", "inventory", "explore"],
  },
  {
    id: "qi_middle",
    name: "炼气中期",
    requiredCultivation: 320,
    breakthroughCost: { spiritStones: 80 },
    successRate: 1,
    unlocks: ["cultivation", "inventory", "explore"],
  },
  {
    id: "qi_late",
    name: "炼气后期",
    requiredCultivation: 850,
    breakthroughCost: {
      spiritStones: 180,
      items: [{ itemId: "qi_grass", amount: 2 }],
    },
    successRate: 0.95,
    unlocks: ["cultivation", "inventory", "explore", "foundationSkills"],
  },
  {
    id: "qi_peak",
    name: "炼气圆满",
    requiredCultivation: 1800,
    breakthroughCost: {
      spiritStones: 360,
      items: [{ itemId: "foundation_pill", amount: 1 }],
    },
    successRate: 0.8,
    unlocks: ["cultivation", "inventory", "explore", "foundationSkills", "pet"],
  },
  {
    id: "foundation_early",
    name: "筑基初期",
    requiredCultivation: 4200,
    breakthroughCost: {},
    successRate: 1,
    unlocks: ["cultivation", "inventory", "explore", "foundationSkills", "pet", "cave"],
  },
  {
    id: "foundation_middle",
    name: "筑基中期",
    requiredCultivation: 9600,
    breakthroughCost: {
      spiritStones: 900,
      items: [{ itemId: "beast_bone", amount: 4 }],
    },
    successRate: 0.85,
    unlocks: ["cultivation", "inventory", "explore", "foundationSkills", "pet", "cave", "companion"],
  },
  {
    id: "foundation_late",
    name: "筑基后期",
    requiredCultivation: 22000,
    breakthroughCost: {
      spiritStones: 1800,
      items: [{ itemId: "greenwood_essence", amount: 2 }],
    },
    successRate: 0.75,
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
  return realms.findIndex((realm) => realm.id === currentRealmId) >= realms.findIndex((realm) => realm.id === requiredRealmId);
}
