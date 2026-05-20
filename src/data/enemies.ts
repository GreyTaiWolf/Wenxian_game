import type { CombatReward, Stats } from "../types";

export interface EnemyTemplate {
  id: string;
  name: string;
  kind: "beast" | "enemyCultivator";
  stats: Stats;
  skillIds: string[];
}

export interface EnemyGroup {
  id: string;
  title: string;
  enemies: Array<{ templateId: string; count: number }>;
  rewards: CombatReward;
}

export const enemyTemplates: EnemyTemplate[] = [
  {
    id: "mountain_wolf",
    name: "山狼",
    kind: "beast",
    stats: { maxHp: 80, maxSpirit: 16, attack: 15, defense: 7, spiritSense: 0, speed: 16, dodgeRate: 0.03, critRate: 0.05, critDamage: 1.5 },
    skillIds: ["bite", "pounce"],
  },
  {
    id: "grass_guard",
    name: "守草妖兽",
    kind: "beast",
    stats: { maxHp: 110, maxSpirit: 24, attack: 18, defense: 10, spiritSense: 0, speed: 12, dodgeRate: 0.02, critRate: 0.04, critDamage: 1.5 },
    skillIds: ["bite", "pounce", "beast_roar"],
  },
  {
    id: "black_wind_cultivator",
    name: "黑风妖修",
    kind: "enemyCultivator",
    stats: { maxHp: 130, maxSpirit: 30, attack: 22, defense: 11, spiritSense: 0, speed: 14, dodgeRate: 0.02, critRate: 0.06, critDamage: 1.5 },
    skillIds: ["basic_strike", "qi_slash", "leaf_spell"],
  },
  {
    id: "cave_guardian",
    name: "洞府石卫",
    kind: "beast",
    stats: { maxHp: 180, maxSpirit: 34, attack: 26, defense: 18, spiritSense: 0, speed: 9, dodgeRate: 0.01, critRate: 0.03, critDamage: 1.5 },
    skillIds: ["bite", "pounce", "beast_roar"],
  },
  {
    id: "venom_vine",
    name: "妖藤",
    kind: "beast",
    stats: { maxHp: 150, maxSpirit: 24, attack: 24, defense: 12, spiritSense: 0, speed: 10, dodgeRate: 0.015, critRate: 0.04, critDamage: 1.5 },
    skillIds: ["bite", "pounce", "beast_roar"],
  },
  {
    id: "miasma_gu",
    name: "瘴蛊虫",
    kind: "beast",
    stats: { maxHp: 125, maxSpirit: 28, attack: 26, defense: 9, spiritSense: 0, speed: 22, dodgeRate: 0.04, critRate: 0.08, critDamage: 1.5 },
    skillIds: ["bite", "pounce", "beast_roar"],
  },
  {
    id: "mountain_yao",
    name: "山魈",
    kind: "beast",
    stats: { maxHp: 190, maxSpirit: 34, attack: 31, defense: 16, spiritSense: 0, speed: 18, dodgeRate: 0.03, critRate: 0.07, critDamage: 1.5 },
    skillIds: ["bite", "pounce", "beast_roar"],
  },
  {
    id: "tide_guard",
    name: "潮汐守卫",
    kind: "enemyCultivator",
    stats: { maxHp: 210, maxSpirit: 38, attack: 32, defense: 18, spiritSense: 0, speed: 13, dodgeRate: 0.02, critRate: 0.05, critDamage: 1.5 },
    skillIds: ["basic_strike", "qi_slash", "leaf_spell"],
  },
  {
    id: "nanjiang_cultivator",
    name: "南疆妖修",
    kind: "enemyCultivator",
    stats: { maxHp: 170, maxSpirit: 40, attack: 27, defense: 15, spiritSense: 0, speed: 16, dodgeRate: 0.025, critRate: 0.06, critDamage: 1.5 },
    skillIds: ["basic_strike", "qi_slash", "leaf_spell"],
  },
  {
    id: "wood_puppet",
    name: "木傀",
    kind: "beast",
    stats: { maxHp: 220, maxSpirit: 26, attack: 30, defense: 22, spiritSense: 0, speed: 8, dodgeRate: 0.01, critRate: 0.03, critDamage: 1.5 },
    skillIds: ["bite", "pounce", "beast_roar"],
  },
];

export const enemyGroups: EnemyGroup[] = [
  {
    id: "wolf_pack",
    title: "黑风山狼群",
    enemies: [{ templateId: "mountain_wolf", count: 3 }],
    rewards: {
      cultivation: 36,
      spiritStones: 34,
      items: [{ itemId: "beast_bone", amount: 1 }],
    },
  },
  {
    id: "black_wind_duo",
    title: "黑风妖修",
    enemies: [
      { templateId: "black_wind_cultivator", count: 1 },
      { templateId: "mountain_wolf", count: 2 },
    ],
    rewards: {
      cultivation: 72,
      spiritStones: 86,
      items: [
        { itemId: "beast_bone", amount: 2 },
        { itemId: "spirit_herb", amount: 1 },
      ],
    },
  },
  {
    id: "herb_guard",
    title: "灵药谷守草妖兽",
    enemies: [{ templateId: "grass_guard", count: 2 }],
    rewards: {
      cultivation: 44,
      spiritStones: 26,
      items: [
        { itemId: "qi_grass", amount: 1 },
        { itemId: "spirit_herb", amount: 2 },
      ],
    },
  },
  {
    id: "ancient_cave",
    title: "古修洞府守卫",
    enemies: [
      { templateId: "cave_guardian", count: 1 },
      { templateId: "grass_guard", count: 1 },
    ],
    rewards: {
      cultivation: 120,
      spiritStones: 140,
      items: [
        { itemId: "foundation_pill", amount: 1 },
        { itemId: "greenwood_essence", amount: 1 },
      ],
    },
  },
  {
    id: "baicao_vines",
    title: "百草谷藤妖",
    enemies: [{ templateId: "venom_vine", count: 2 }],
    rewards: {
      cultivation: 96,
      spiritStones: 80,
      items: [
        { itemId: "spirit_herb", amount: 2 },
        { itemId: "demon_core_shard", amount: 1 },
      ],
    },
  },
  {
    id: "miasma_gu_swarm",
    title: "瘴雾蛊群",
    enemies: [{ templateId: "miasma_gu", count: 3 }],
    rewards: {
      cultivation: 130,
      spiritStones: 90,
      items: [
        { itemId: "miasma_flower", amount: 2 },
        { itemId: "demon_core_shard", amount: 1 },
      ],
    },
  },
  {
    id: "beast_mountain_patrol",
    title: "万妖山巡山兽",
    enemies: [
      { templateId: "mountain_yao", count: 1 },
      { templateId: "mountain_wolf", count: 2 },
    ],
    rewards: {
      cultivation: 150,
      spiritStones: 120,
      items: [
        { itemId: "beast_bone", amount: 2 },
        { itemId: "demon_core_shard", amount: 1 },
      ],
    },
  },
  {
    id: "waterfall_guard",
    title: "灵瀑守卫",
    enemies: [
      { templateId: "wood_puppet", count: 1 },
      { templateId: "venom_vine", count: 1 },
    ],
    rewards: {
      cultivation: 180,
      spiritStones: 160,
      items: [
        { itemId: "greenwood_essence", amount: 1 },
        { itemId: "spirit_herb", amount: 2 },
      ],
    },
  },
  {
    id: "tide_cave_guard",
    title: "潮音秘洞守卫",
    enemies: [{ templateId: "tide_guard", count: 2 }],
    rewards: {
      cultivation: 210,
      spiritStones: 180,
      items: [{ itemId: "tide_shell", amount: 2 }],
    },
  },
  {
    id: "wood_spirit_trial",
    title: "木灵宗试炼木阵",
    enemies: [
      { templateId: "wood_puppet", count: 1 },
      { templateId: "venom_vine", count: 1 },
    ],
    rewards: {
      cultivation: 160,
      spiritStones: 120,
      items: [{ itemId: "greenwood_essence", amount: 1 }],
    },
  },
];

export function getEnemyTemplate(templateId: string): EnemyTemplate {
  const template = enemyTemplates.find((enemy) => enemy.id === templateId);
  if (!template) {
    throw new Error(`Unknown enemy template: ${templateId}`);
  }
  return template;
}

export function getEnemyGroup(groupId: string): EnemyGroup {
  const group = enemyGroups.find((enemyGroup) => enemyGroup.id === groupId);
  if (!group) {
    throw new Error(`Unknown enemy group: ${groupId}`);
  }
  return group;
}
