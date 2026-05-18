import type { ItemConfig } from "../types";

export const items: ItemConfig[] = [
  {
    id: "rough_iron_sword",
    name: "粗铁剑",
    category: "equipment",
    description: "凡铁打成的旧剑，锋刃粗钝，但足够防身。",
    price: 40,
    equipment: {
      slot: "weapon",
      bonuses: { attack: 4 },
      powerBonus: 18,
    },
  },
  {
    id: "cloth_robe",
    name: "布衣",
    category: "equipment",
    description: "寻常布衣，胜在轻便，不碍行气。",
    price: 28,
    equipment: {
      slot: "robe",
      bonuses: { maxHp: 18, defense: 2 },
      powerBonus: 10,
    },
  },
  {
    id: "cloth_shoes",
    name: "布履",
    category: "equipment",
    description: "粗布缝成的鞋履，适合长途跋涉。",
    price: 18,
    equipment: {
      slot: "shoes",
      bonuses: { speed: 1, dodge: 0.01 },
      powerBonus: 5,
    },
  },
  {
    id: "qi_grass",
    name: "凝气草",
    category: "material",
    description: "灵药谷常见灵草，可用于宗门任务与突破。",
    price: 30,
  },
  {
    id: "spirit_herb",
    name: "灵草",
    category: "material",
    description: "带有微弱灵气的药材。",
    price: 18,
  },
  {
    id: "beast_bone",
    name: "妖兽骨",
    category: "material",
    description: "低阶妖兽残骨，可炼器也可交付任务。",
    price: 40,
  },
  {
    id: "greenwood_essence",
    name: "青木灵液",
    category: "material",
    description: "木行灵物，适合筑基后的养成。",
    price: 160,
  },
  {
    id: "miasma_flower",
    name: "瘴毒花",
    category: "material",
    description: "瘴雾沼泽中特有的毒花，可入药，也常被巫修用于炼蛊。",
    price: 90,
  },
  {
    id: "tide_shell",
    name: "潮生贝",
    category: "material",
    description: "潮汐海域出产的灵贝，壳纹会随月潮微微发光。",
    price: 100,
  },
  {
    id: "demon_core_shard",
    name: "妖丹碎片",
    category: "material",
    description: "低阶妖物体内凝出的残碎妖丹，是南疆悬赏常见凭证。",
    price: 150,
  },
  {
    id: "foundation_pill",
    name: "筑基丹",
    category: "pill",
    description: "冲击筑基时常用的丹药。",
    price: 480,
  },
  {
    id: "healing_powder",
    name: "回春散",
    category: "pill",
    description: "战斗中回复少量气血。",
    price: 55,
    combatHeal: 70,
  },
  {
    id: "qi_pill",
    name: "聚气丹",
    category: "pill",
    description: "辅助修炼的低阶丹药。",
    price: 80,
  },
  {
    id: "qingyun_token",
    name: "青云令牌",
    category: "quest",
    description: "加入青云宗的引荐信物。",
  },
  {
    id: "low_sword",
    name: "低阶法剑",
    category: "equipment",
    description: "坊市常见法剑，适合炼气修士。",
    price: 220,
    equipment: {
      slot: "weapon",
      bonuses: { attack: 12, divineSense: 1 },
      powerBonus: 42,
    },
  },
];

export function getItem(itemId: string): ItemConfig {
  return items.find((item) => item.id === itemId) ?? {
    id: itemId,
    name: itemId,
    category: "material",
    description: "未登记物品。",
  };
}
