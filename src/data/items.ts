import type { EquipmentBonus, EquipmentSlotId, ItemAffix, ItemConfig, ItemGrade, ItemTierId, MajorRealmId, RealmPhaseId } from "../types";

export const itemGradeOrder: ItemGrade[] = ["common", "fine", "superior", "rare", "spirit", "earth", "heaven", "immortal", "divine"];

export const itemGradeLabels: Record<ItemGrade, string> = {
  common: "凡品",
  fine: "良品",
  superior: "精品",
  rare: "珍品",
  spirit: "灵品",
  earth: "地品",
  heaven: "天品",
  immortal: "仙品",
  divine: "神品",
};

export const itemTierLabels: Record<ItemTierId, string> = {
  mortal: "凡阶",
  qi_refining: "炼气阶",
  foundation: "筑基阶",
  core_formation: "结丹阶",
  nascent_soul: "元婴阶",
  spirit_transformation: "化神阶",
  void_refining: "炼虚阶",
  body_integration: "合体阶",
  mahayana: "大乘阶",
  post_ascension: "飞升后",
};

export const itemGradeMetas: Record<
  ItemGrade,
  {
    label: string;
    hex: string;
    priceMultiplier: number;
    effectMultiplier: number;
    affixCount: string;
    specialEffect: string;
    tier: number;
    tone: string;
  }
> = {
  common: { label: "凡品", hex: "#C8CDD6", priceMultiplier: 1, effectMultiplier: 1, affixCount: "0-1", specialEffect: "无", tier: 1, tone: "白色朴素边框" },
  fine: { label: "良品", hex: "#45C46B", priceMultiplier: 1.8, effectMultiplier: 1.1, affixCount: "1-2", specialEffect: "无", tier: 2, tone: "绿色灵光" },
  superior: {
    label: "精品",
    hex: "#4E8DFF",
    priceMultiplier: 3.2,
    effectMultiplier: 1.22,
    affixCount: "2-3",
    specialEffect: "低概率套装词条",
    tier: 3,
    tone: "蓝色流光",
  },
  rare: { label: "珍品", hex: "#A56DFF", priceMultiplier: 5.5, effectMultiplier: 1.38, affixCount: "3-4", specialEffect: "小型特效词条", tier: 4, tone: "紫色符纹" },
  spirit: { label: "灵品", hex: "#FF9A3D", priceMultiplier: 9, effectMultiplier: 1.58, affixCount: "4-5", specialEffect: "稀有独特词条", tier: 5, tone: "橙色灵焰" },
  earth: { label: "地品", hex: "#FFD86B", priceMultiplier: 15, effectMultiplier: 1.82, affixCount: "5-6", specialEffect: "至少 1 条强独特词条", tier: 6, tone: "厚重金辉" },
  heaven: { label: "天品", hex: "#FF6B6B", priceMultiplier: 24, effectMultiplier: 2.1, affixCount: "6 + 1", specialEffect: "至少 1 条强词条", tier: 7, tone: "赤焰灵压" },
  immortal: { label: "仙品", hex: "#EAF7FF", priceMultiplier: 38, effectMultiplier: 2.38, affixCount: "6-7", specialEffect: "至少 1 条专属词条", tier: 8, tone: "白金圣辉" },
  divine: { label: "神品", hex: "#FFC857", priceMultiplier: 60, effectMultiplier: 2.72, affixCount: "7-8", specialEffect: "至少 1-2 条唯一词条", tier: 9, tone: "赤金虹光" },
};

export interface ItemGradeAffix {
  id: string;
  name: string;
  description: string;
}

export const itemGradeAffixLibrary: Record<ItemGrade, ItemGradeAffix[]> = {
  common: [{ id: "plain_temper", name: "凡息淬成", description: "纯过渡品级，保持基础属性与药力。" }],
  fine: [{ id: "spirit_flow", name: "灵气润体", description: "常规升级品级，属性略高并更适合当前阶段使用。" }],
  superior: [{ id: "streaming_light", name: "流光蕴灵", description: "精英与副本常见目标，开始出现更稳定的副词条空间。" }],
  rare: [{ id: "rare_runes", name: "珍纹共鸣", description: "小阶段毕业档，紫色品级开始偏向用途词条。" }],
  spirit: [{ id: "spirit_flame", name: "灵焰独照", description: "大阶段核心装备，可能携带稀有独特词条。" }],
  earth: [{ id: "earth_vein", name: "地脉赤辉", description: "后期 Boss 掉落定位，强调强独特词条和构筑价值。" }],
  heaven: [{ id: "heaven_flare", name: "天光神铸", description: "章节巅峰掉落定位，保留专属或唯一特性。" }],
  immortal: [{ id: "immortal_aura", name: "仙辉垂曜", description: "极稀有掉落定位，至少携带 1 条专属词条并强化构筑上限。" }],
  divine: [{ id: "divine_legacy", name: "神纹传承", description: "传承级唯一定位，携带 1-2 条唯一词条并提供终局构筑方向。" }],
};

interface BaseItemConfig {
  id: string;
  name: string;
  category: ItemConfig["category"];
  tier: ItemTierId;
  grade: ItemGrade;
  description: string;
  basePrice?: number;
  baseCombatHeal?: number;
  affixes?: ItemAffix[];
  equipment?: {
    slot: EquipmentSlotId;
    baseBonuses: EquipmentBonus;
    basePowerBonus: number;
    requiredMajorRealm?: MajorRealmId;
    requiredPhase?: RealmPhaseId;
  };
}

const baseItems: BaseItemConfig[] = [
  {
    id: "rough_iron_sword",
    name: "粗铁剑",
    category: "equipment",
    tier: "mortal",
    grade: "common",
    description: "凡铁打成的旧剑，锋刃粗钝，但足够防身。",
    basePrice: 40,
    equipment: {
      slot: "weapon",
      baseBonuses: { attack: 4 },
      basePowerBonus: 18,
      requiredMajorRealm: "mortal",
    },
  },
  {
    id: "cloth_robe",
    name: "布衣",
    category: "equipment",
    tier: "mortal",
    grade: "common",
    description: "寻常布衣，胜在轻便，不碍行气。",
    basePrice: 28,
    equipment: {
      slot: "robe",
      baseBonuses: { maxHp: 18, defense: 2 },
      basePowerBonus: 10,
      requiredMajorRealm: "mortal",
    },
  },
  {
    id: "cloth_shoes",
    name: "布履",
    category: "equipment",
    tier: "mortal",
    grade: "common",
    description: "粗布缝成的鞋履，适合长途跋涉。",
    basePrice: 18,
    equipment: {
      slot: "shoes",
      baseBonuses: { speed: 1 },
      basePowerBonus: 5,
      requiredMajorRealm: "mortal",
    },
  },
  {
    id: "qi_grass",
    name: "凝气草",
    category: "material",
    tier: "qi_refining",
    grade: "fine",
    description: "灵药谷常见灵草，可用于宗门任务与突破。",
    basePrice: 30,
  },
  {
    id: "spirit_herb",
    name: "灵草",
    category: "material",
    tier: "qi_refining",
    grade: "common",
    description: "带有微弱灵气的药材。",
    basePrice: 18,
  },
  {
    id: "beast_bone",
    name: "妖兽骨",
    category: "material",
    tier: "qi_refining",
    grade: "fine",
    description: "低阶妖兽残骨，可炼器也可交付任务。",
    basePrice: 40,
  },
  {
    id: "greenwood_essence",
    name: "青木灵液",
    category: "material",
    tier: "foundation",
    grade: "rare",
    description: "木行灵物，适合筑基后的养成。",
    basePrice: 160,
  },
  {
    id: "miasma_flower",
    name: "瘴毒花",
    category: "material",
    tier: "foundation",
    grade: "superior",
    description: "瘴雾沼泽中特有的毒花，可入药，也常被巫修用于炼蛊。",
    basePrice: 90,
  },
  {
    id: "tide_shell",
    name: "潮生贝",
    category: "material",
    tier: "foundation",
    grade: "superior",
    description: "潮汐海域出产的灵贝，壳纹会随月潮微微发光。",
    basePrice: 100,
  },
  {
    id: "demon_core_shard",
    name: "妖丹碎片",
    category: "material",
    tier: "foundation",
    grade: "superior",
    description: "低阶妖物体内凝出的残碎妖丹，是南疆悬赏常见凭证。",
    basePrice: 150,
  },
  {
    id: "foundation_pill",
    name: "筑基丹",
    category: "pill",
    tier: "foundation",
    grade: "rare",
    description: "冲击筑基时常用的丹药。",
    basePrice: 480,
  },
  {
    id: "healing_powder",
    name: "回春散",
    category: "pill",
    tier: "qi_refining",
    grade: "common",
    description: "战斗中回复气血。品级越高，药力越霸道。",
    basePrice: 55,
    baseCombatHeal: 70,
  },
  {
    id: "qi_pill",
    name: "聚气丹",
    category: "pill",
    tier: "qi_refining",
    grade: "fine",
    description: "辅助修炼的低阶丹药。",
    basePrice: 80,
  },
  {
    id: "qingyun_token",
    name: "青云令牌",
    category: "quest",
    tier: "qi_refining",
    grade: "superior",
    description: "加入青云宗的引荐信物。",
  },
  {
    id: "low_sword",
    name: "低阶法剑",
    category: "equipment",
    tier: "qi_refining",
    grade: "fine",
    description: "坊市常见法剑，适合炼气修士。",
    basePrice: 220,
    equipment: {
      slot: "weapon",
      baseBonuses: { attack: 12, divineSense: 1 },
      basePowerBonus: 42,
      requiredMajorRealm: "qi_refining",
    },
  },
];

export const items: ItemConfig[] = baseItems.map(createItem);

const itemsById = new Map(items.map((item) => [item.id, item]));

const generatedGradeSuffixes: Array<{ suffix: string; compatibleGrades: ItemGrade[] }> = [
  { suffix: "common", compatibleGrades: ["common"] },
  { suffix: "fine", compatibleGrades: ["fine"] },
  { suffix: "rare", compatibleGrades: ["superior", "rare"] },
  { suffix: "mystic", compatibleGrades: ["rare"] },
  { suffix: "superior", compatibleGrades: ["superior"] },
  { suffix: "spirit", compatibleGrades: ["spirit"] },
  { suffix: "earth", compatibleGrades: ["earth"] },
  { suffix: "heaven", compatibleGrades: ["heaven"] },
];

const generatedItemIdMap = Object.fromEntries(
  baseItems.flatMap((item) => generatedGradeSuffixes.map(({ suffix, compatibleGrades }) => [`${item.id}_${suffix}`, { itemId: item.id, compatibleGrades }])),
) as Record<string, { itemId: string; compatibleGrades: ItemGrade[] }>;

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
  return configuredItem && generated.compatibleGrades.includes(configuredItem.grade) ? generated.itemId : null;
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
      tier: "mortal",
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
    tier: config.tier,
    grade: config.grade,
    description: config.description,
    price: typeof config.basePrice === "number" ? Math.round(config.basePrice * meta.priceMultiplier) : undefined,
    combatHeal: config.baseCombatHeal ? roundToFive(config.baseCombatHeal * meta.effectMultiplier) : undefined,
    affixes: config.affixes,
    equipment: config.equipment
      ? {
          slot: config.equipment.slot,
          bonuses: scaleBonuses(config.equipment.baseBonuses, meta.effectMultiplier),
          powerBonus: Math.max(1, Math.round(config.equipment.basePowerBonus * meta.effectMultiplier)),
          requiredMajorRealm: config.equipment.requiredMajorRealm,
          requiredPhase: config.equipment.requiredPhase,
        }
      : undefined,
  };
}

function scaleBonuses(bonuses: EquipmentBonus, multiplier: number): EquipmentBonus {
  return Object.fromEntries(
    Object.entries(bonuses).map(([key, value]) => {
      if (key === "dodge") {
        return [key, 0];
      }
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
