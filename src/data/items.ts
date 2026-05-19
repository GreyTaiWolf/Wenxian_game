import type { EquipmentBonus, EquipmentSlotId, ItemConfig, ItemGrade } from "../types";

export const itemGradeOrder: ItemGrade[] = ["common", "fine", "rare", "mystic", "earth", "heaven"];

export const itemGradeLabels: Record<ItemGrade, string> = {
  common: "凡品",
  fine: "良品",
  rare: "珍品",
  mystic: "玄品",
  earth: "地品",
  heaven: "天品",
};

export const itemGradeMetas: Record<
  ItemGrade,
  {
    label: string;
    priceMultiplier: number;
    effectMultiplier: number;
    tier: number;
    tone: string;
  }
> = {
  common: { label: "凡品", priceMultiplier: 1, effectMultiplier: 1, tier: 1, tone: "暗银边框" },
  fine: { label: "良品", priceMultiplier: 10, effectMultiplier: 2, tier: 2, tone: "青绿灵光" },
  rare: { label: "珍品", priceMultiplier: 100, effectMultiplier: 4, tier: 3, tone: "蓝色流光" },
  mystic: { label: "玄品", priceMultiplier: 1000, effectMultiplier: 8, tier: 4, tone: "紫色符纹光环" },
  earth: { label: "地品", priceMultiplier: 10000, effectMultiplier: 16, tier: 5, tone: "金色扫光" },
  heaven: { label: "天品", priceMultiplier: 100000, effectMultiplier: 32, tier: 6, tone: "赤金神光" },
};

export interface ItemGradeAffix {
  id: string;
  name: string;
  description: string;
}

export const itemGradeAffixLibrary: Record<ItemGrade, ItemGradeAffix[]> = {
  common: [{ id: "plain_temper", name: "凡息淬成", description: "保持基础属性与药力，稳定但无额外灵性。" }],
  fine: [{ id: "spirit_flow", name: "灵气润体", description: "装备属性与丹药药力提升至 2 倍，价值跃升一阶。" }],
  rare: [{ id: "streaming_light", name: "流光蕴灵", description: "装备属性与丹药药力提升至 4 倍，名称加粗并启用流光表现。" }],
  mystic: [{ id: "mystic_runes", name: "玄纹共鸣", description: "装备属性与丹药药力提升至 8 倍，卡面带符纹呼吸光。" }],
  earth: [{ id: "earth_vein", name: "地脉金辉", description: "装备属性与丹药药力提升至 16 倍，触发金色扫光。" }],
  heaven: [{ id: "heaven_flare", name: "天光神铸", description: "装备属性与丹药药力提升至 32 倍，触发赤金神光。" }],
};

interface BaseItemConfig {
  id: string;
  name: string;
  category: ItemConfig["category"];
  grade: ItemGrade;
  description: string;
  basePrice?: number;
  baseCombatHeal?: number;
  equipment?: {
    slot: EquipmentSlotId;
    baseBonuses: EquipmentBonus;
    basePowerBonus: number;
  };
}

const baseItems: BaseItemConfig[] = [
  {
    id: "rough_iron_sword",
    name: "粗铁剑",
    category: "equipment",
    grade: "common",
    description: "凡铁打成的旧剑，锋刃粗钝，但足够防身。",
    basePrice: 40,
    equipment: {
      slot: "weapon",
      baseBonuses: { attack: 4 },
      basePowerBonus: 18,
    },
  },
  {
    id: "cloth_robe",
    name: "布衣",
    category: "equipment",
    grade: "common",
    description: "寻常布衣，胜在轻便，不碍行气。",
    basePrice: 28,
    equipment: {
      slot: "robe",
      baseBonuses: { maxHp: 18, defense: 2 },
      basePowerBonus: 10,
    },
  },
  {
    id: "cloth_shoes",
    name: "布履",
    category: "equipment",
    grade: "common",
    description: "粗布缝成的鞋履，适合长途跋涉。",
    basePrice: 18,
    equipment: {
      slot: "shoes",
      baseBonuses: { speed: 1, dodge: 0.01 },
      basePowerBonus: 5,
    },
  },
  {
    id: "qi_grass",
    name: "凝气草",
    category: "material",
    grade: "fine",
    description: "灵药谷常见灵草，可用于宗门任务与突破。",
    basePrice: 30,
  },
  {
    id: "spirit_herb",
    name: "灵草",
    category: "material",
    grade: "common",
    description: "带有微弱灵气的药材。",
    basePrice: 18,
  },
  {
    id: "beast_bone",
    name: "妖兽骨",
    category: "material",
    grade: "fine",
    description: "低阶妖兽残骨，可炼器也可交付任务。",
    basePrice: 40,
  },
  {
    id: "greenwood_essence",
    name: "青木灵液",
    category: "material",
    grade: "mystic",
    description: "木行灵物，适合筑基后的养成。",
    basePrice: 160,
  },
  {
    id: "miasma_flower",
    name: "瘴毒花",
    category: "material",
    grade: "rare",
    description: "瘴雾沼泽中特有的毒花，可入药，也常被巫修用于炼蛊。",
    basePrice: 90,
  },
  {
    id: "tide_shell",
    name: "潮生贝",
    category: "material",
    grade: "rare",
    description: "潮汐海域出产的灵贝，壳纹会随月潮微微发光。",
    basePrice: 100,
  },
  {
    id: "demon_core_shard",
    name: "妖丹碎片",
    category: "material",
    grade: "rare",
    description: "低阶妖物体内凝出的残碎妖丹，是南疆悬赏常见凭证。",
    basePrice: 150,
  },
  {
    id: "foundation_pill",
    name: "筑基丹",
    category: "pill",
    grade: "mystic",
    description: "冲击筑基时常用的丹药。",
    basePrice: 480,
  },
  {
    id: "healing_powder",
    name: "回春散",
    category: "pill",
    grade: "common",
    description: "战斗中回复气血。品级越高，药力越霸道。",
    basePrice: 55,
    baseCombatHeal: 70,
  },
  {
    id: "qi_pill",
    name: "聚气丹",
    category: "pill",
    grade: "fine",
    description: "辅助修炼的低阶丹药。",
    basePrice: 80,
  },
  {
    id: "qingyun_token",
    name: "青云令牌",
    category: "quest",
    grade: "rare",
    description: "加入青云宗的引荐信物。",
  },
  {
    id: "low_sword",
    name: "低阶法剑",
    category: "equipment",
    grade: "fine",
    description: "坊市常见法剑，适合炼气修士。",
    basePrice: 220,
    equipment: {
      slot: "weapon",
      baseBonuses: { attack: 12, divineSense: 1 },
      basePowerBonus: 42,
    },
  },
];

export const items: ItemConfig[] = baseItems.map(createItem);

const itemsById = new Map(items.map((item) => [item.id, item]));

const generatedItemIdMap = Object.fromEntries(
  baseItems.flatMap((item) => itemGradeOrder.map((grade) => [`${item.id}_${grade}`, { itemId: item.id, grade }])),
) as Record<string, { itemId: string; grade: ItemGrade }>;

export const legacyItemIdMap: Record<string, string> = Object.fromEntries(
  Object.entries(generatedItemIdMap).map(([generatedId, value]) => [generatedId, value.itemId]),
);

export function normalizeItemId(itemId: string): string {
  return legacyItemIdMap[itemId] ?? itemId;
}

export function normalizeInventoryItemId(itemId: string): string | null {
  const generated = generatedItemIdMap[itemId];
  if (!generated) {
    return normalizeItemId(itemId);
  }

  const configuredItem = itemsById.get(generated.itemId);
  return configuredItem?.grade === generated.grade ? generated.itemId : null;
}

export function isGeneratedGradeItemId(itemId: string): boolean {
  return Object.prototype.hasOwnProperty.call(generatedItemIdMap, itemId);
}

export function getItem(itemId: string): ItemConfig {
  const normalizedId = normalizeItemId(itemId);
  return (
    itemsById.get(normalizedId) ?? {
      id: normalizedId,
      name: normalizedId,
      category: "material",
      grade: "common",
      description: "未登记物品。",
    }
  );
}

export function formatItemName(itemOrId: ItemConfig | string): string {
  const item = typeof itemOrId === "string" ? getItem(itemOrId) : itemOrId;
  return item.name;
}

export function shouldEmphasizeItemGrade(grade: ItemGrade): boolean {
  return itemGradeMetas[grade].tier >= itemGradeMetas.rare.tier;
}

export function getItemGradeAffixes(grade: ItemGrade): ItemGradeAffix[] {
  return itemGradeAffixLibrary[grade];
}

function createItem(config: BaseItemConfig): ItemConfig {
  const meta = itemGradeMetas[config.grade];
  return {
    id: config.id,
    name: config.name,
    category: config.category,
    grade: config.grade,
    description: config.description,
    price: typeof config.basePrice === "number" ? Math.round(config.basePrice * meta.priceMultiplier) : undefined,
    combatHeal: config.baseCombatHeal ? roundToFive(config.baseCombatHeal * meta.effectMultiplier) : undefined,
    equipment: config.equipment
      ? {
          slot: config.equipment.slot,
          bonuses: scaleBonuses(config.equipment.baseBonuses, meta.effectMultiplier),
          powerBonus: Math.max(1, Math.round(config.equipment.basePowerBonus * meta.effectMultiplier)),
        }
      : undefined,
  };
}

function scaleBonuses(bonuses: EquipmentBonus, multiplier: number): EquipmentBonus {
  return Object.fromEntries(
    Object.entries(bonuses).map(([key, value]) => {
      const safeValue = value ?? 0;
      const scaled = key === "dodge" || key === "crit" ? roundRate(safeValue * multiplier) : Math.max(1, Math.round(safeValue * multiplier));
      return [key, scaled];
    }),
  ) as EquipmentBonus;
}

function roundRate(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundToFive(value: number): number {
  return Math.max(5, Math.round(value / 5) * 5);
}
