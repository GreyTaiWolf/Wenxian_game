import { buildEquipmentDisplayName } from "./equipmentNameRules";
import { itemGradeLabels, itemGradeMetas, itemGradeNamePrefixes, itemGradeOrder, normalizeQuality, qualityGrades } from "./qualityGrades";
import type { EquipmentSlotId, ItemAffix, ItemConfig, ItemGrade, ItemTierId, MajorRealmId, RealmPhaseId } from "../types";

export { itemGradeLabels, itemGradeMetas, itemGradeNamePrefixes, itemGradeOrder, qualityGrades };

export const itemTierLabels: Record<ItemTierId, string> = {
  mortal: "凡阶",
  qi: "炼气阶",
  foundation: "筑基阶",
  core: "结丹阶",
  nascent: "元婴阶",
  deity: "化神阶",
  void: "炼虚阶",
  integration: "合体阶",
  mahayana: "大乘阶",
  tribulation: "渡劫阶",
};

export interface ItemGradeAffix {
  id: string;
  name: string;
  description: string;
}

export const itemGradeAffixLibrary: Record<ItemGrade, ItemGradeAffix[]> = {
  fan: [{ id: "plain_temper", name: "凡息淬成", description: "纯过渡品级，保持基础属性与药力。" }],
  liang: [{ id: "spirit_flow", name: "灵气润体", description: "常规升级品级，属性略高并更适合当前阶段使用。" }],
  jing: [{ id: "streaming_light", name: "流光蕴灵", description: "精英与副本常见目标，开始出现更稳定的副词条空间。" }],
  ling: [{ id: "rare_runes", name: "灵纹共鸣", description: "小阶段毕业档，紫色品级开始偏向用途词条。" }],
  xuan: [{ id: "spirit_flame", name: "灵焰独照", description: "大阶段核心装备，可能携带稀有独特词条。" }],
  di: [{ id: "earth_vein", name: "地脉赤辉", description: "后期 Boss 掉落定位，强调强独特词条和构筑价值。" }],
  tian: [{ id: "heaven_flare", name: "天光神铸", description: "章节巅峰掉落定位，保留专属或唯一特性。" }],
  xian: [{ id: "immortal_aura", name: "仙辉垂曜", description: "极稀有掉落定位，至少携带 1 条专属词条并强化构筑上限。" }],
  shen: [{ id: "divine_legacy", name: "神纹传承", description: "传承级唯一定位，携带 1-2 条唯一词条并提供终局构筑方向。" }],
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
    requiredMajorRealm?: MajorRealmId;
    requiredPhase?: RealmPhaseId;
  };
}

const gradePreviewEquipmentItems: BaseItemConfig[] = itemGradeOrder.map((grade, index) => ({
  id: `grade_preview_sword_${grade}`,
  name:
    {
      fan: "铁剑",
      liang: "青竹剑",
      jing: "寒霜剑",
      ling: "玄火剑",
      xuan: "赤霄剑",
      di: "镇岳剑",
      tian: "太清剑",
      xian: "太乙玄金剑",
      shen: "问仙古剑",
    }[grade] ?? "试剑",
  category: "equipment",
  tier: index <= 1 ? "mortal" : "qi",
  grade,
  description: `用于测试${itemGradeLabels[grade]}装备边框、动效、品级标签和详情特效。`,
  basePrice: 1,
  equipment: {
    slot: "weapon",
    requiredMajorRealm: "mortal",
  },
}));

const baseItems: BaseItemConfig[] = [
  {
    id: "rough_iron_sword",
    name: "粗铁剑",
    category: "equipment",
    tier: "mortal",
    grade: "fan",
    description: "凡铁打成的旧剑，锋刃粗钝，但足够防身。",
    basePrice: 40,
    equipment: {
      slot: "weapon",
      requiredMajorRealm: "mortal",
    },
  },
  {
    id: "cloth_robe",
    name: "布衣",
    category: "equipment",
    tier: "mortal",
    grade: "fan",
    description: "寻常布衣，胜在轻便，不碍行气。",
    basePrice: 28,
    equipment: {
      slot: "robe",
      requiredMajorRealm: "mortal",
    },
  },
  {
    id: "cloth_boots",
    name: "布履",
    category: "equipment",
    tier: "mortal",
    grade: "fan",
    description: "粗布缝成的鞋履，适合长途跋涉。",
    basePrice: 18,
    equipment: {
      slot: "boots",
      requiredMajorRealm: "mortal",
    },
  },
  {
    id: "qi_grass",
    name: "凝气草",
    category: "material",
    tier: "qi",
    grade: "liang",
    description: "灵药谷常见灵草，可用于宗门任务与突破。",
    basePrice: 30,
  },
  {
    id: "spirit_herb",
    name: "灵草",
    category: "material",
    tier: "qi",
    grade: "fan",
    description: "带有微弱灵气的药材。",
    basePrice: 18,
  },
  {
    id: "spirit_grass_seed",
    name: "灵草种",
    category: "material",
    tier: "qi",
    grade: "fan",
    description: "可种入洞府灵田的低阶灵种，一年成熟。",
    basePrice: 20,
  },
  {
    id: "qi_grass_seed",
    name: "凝气草种",
    category: "material",
    tier: "qi",
    grade: "liang",
    description: "凝气草灵种，两年后才凝出稳定药力。",
    basePrice: 45,
  },
  {
    id: "greenwood_vine_seed",
    name: "青木灵藤种",
    category: "material",
    tier: "foundation",
    grade: "ling",
    description: "筑基阶灵藤种，成熟后可凝出青木灵液。",
    basePrice: 520,
  },
  {
    id: "foundation_lotus_seed",
    name: "筑基莲子",
    category: "material",
    tier: "foundation",
    grade: "xuan",
    description: "需要多年蕴养的洞府莲种，可辅助道基相关丹药。",
    basePrice: 960,
  },
  {
    id: "earth_vein_vermilion_seed",
    name: "地脉朱果核",
    category: "material",
    tier: "core",
    grade: "di",
    description: "深埋地脉的朱果残核，百年后才可结果。",
    basePrice: 3200,
  },
  {
    id: "innate_spirit_fruit_seed",
    name: "先天灵果古种",
    category: "material",
    tier: "nascent",
    grade: "xian",
    description: "自古地封存下来的灵果古种，年份越高越接近传说。",
    basePrice: 18000,
  },
  {
    id: "primordial_dao_seed_item",
    name: "鸿蒙道种",
    category: "material",
    tier: "tribulation",
    grade: "shen",
    description: "终局神品灵植之种，百万年份方显道果真形。",
    basePrice: 120000,
  },
  {
    id: "spirit_spring_water",
    name: "灵泉水",
    category: "material",
    tier: "qi",
    grade: "jing",
    description: "可用于灵田升级和灵植照料的清冽灵泉。",
    basePrice: 120,
  },
  {
    id: "five_color_spirit_soil",
    name: "五色息壤",
    category: "material",
    tier: "foundation",
    grade: "xuan",
    description: "含五行生机的灵土，是扩建高阶灵田的关键材料。",
    basePrice: 700,
  },
  {
    id: "beast_bone",
    name: "妖兽骨",
    category: "material",
    tier: "qi",
    grade: "liang",
    description: "低阶妖兽残骨，可炼器也可交付任务。",
    basePrice: 40,
  },
  {
    id: "greenwood_essence",
    name: "青木灵液",
    category: "material",
    tier: "foundation",
    grade: "ling",
    description: "木行灵物，适合筑基后的养成。",
    basePrice: 160,
  },
  {
    id: "miasma_flower",
    name: "瘴毒花",
    category: "material",
    tier: "foundation",
    grade: "jing",
    description: "瘴雾沼泽中特有的毒花，可入药，也常被巫修用于炼蛊。",
    basePrice: 90,
  },
  {
    id: "tide_shell",
    name: "潮生贝",
    category: "material",
    tier: "foundation",
    grade: "jing",
    description: "潮汐海域出产的灵贝，壳纹会随月潮微微发光。",
    basePrice: 100,
  },
  {
    id: "demon_core_shard",
    name: "妖丹碎片",
    category: "material",
    tier: "foundation",
    grade: "jing",
    description: "低阶妖物体内凝出的残碎妖丹，是南疆悬赏常见凭证。",
    basePrice: 150,
  },
  {
    id: "foundation_pill",
    name: "筑基丹",
    category: "pill",
    tier: "foundation",
    grade: "ling",
    description: "冲击筑基时常用的丹药。",
    basePrice: 480,
  },
  {
    id: "earth_vein_vermilion_fruit",
    name: "地脉朱果",
    category: "pill",
    tier: "core",
    grade: "di",
    description: "百年起步的地脉灵果，年份越高药力越霸道。",
    basePrice: 5200,
  },
  {
    id: "innate_spirit_fruit",
    name: "先天灵果",
    category: "pill",
    tier: "nascent",
    grade: "xian",
    description: "万年以上开始显露真正价值的先天灵果。",
    basePrice: 36000,
  },
  {
    id: "primordial_dao_fruit",
    name: "鸿蒙道果",
    category: "pill",
    tier: "tribulation",
    grade: "shen",
    description: "百万年份鸿蒙道种凝出的道果，当前作为终局规划物品。",
    basePrice: 240000,
  },
  {
    id: "healing_powder",
    name: "回春散",
    category: "pill",
    tier: "qi",
    grade: "fan",
    description: "战斗中回复气血。品级越高，药力越霸道。",
    basePrice: 55,
    baseCombatHeal: 70,
  },
  {
    id: "qi_pill",
    name: "聚气丹",
    category: "pill",
    tier: "qi",
    grade: "liang",
    description: "辅助修炼的低阶丹药。",
    basePrice: 80,
  },
  {
    id: "qingyun_token",
    name: "青云令牌",
    category: "quest",
    tier: "qi",
    grade: "jing",
    description: "加入青云宗的引荐信物。",
  },
  {
    id: "low_sword",
    name: "低阶法剑",
    category: "equipment",
    tier: "qi",
    grade: "liang",
    description: "坊市常见法剑，适合炼气修士。",
    basePrice: 220,
    equipment: {
      slot: "weapon",
      requiredMajorRealm: "qi",
    },
  },
  ...gradePreviewEquipmentItems,
];

export const items: ItemConfig[] = baseItems.map(createItem);

const itemsById = new Map(items.map((item) => [item.id, item]));

const generatedGradeSuffixes: Array<{ suffix: string; compatibleGrades: ItemGrade[] }> = [
  { suffix: "common", compatibleGrades: ["fan"] },
  { suffix: "fine", compatibleGrades: ["liang"] },
  { suffix: "rare", compatibleGrades: ["jing", "ling"] },
  { suffix: "mystic", compatibleGrades: ["ling"] },
  { suffix: "superior", compatibleGrades: ["jing"] },
  { suffix: "spirit", compatibleGrades: ["xuan"] },
  { suffix: "earth", compatibleGrades: ["di"] },
  { suffix: "heaven", compatibleGrades: ["tian"] },
  { suffix: "immortal", compatibleGrades: ["xian"] },
  { suffix: "divine", compatibleGrades: ["shen"] },
];

const generatedItemIdMap = Object.fromEntries(
  baseItems.flatMap((item) => generatedGradeSuffixes.map(({ suffix, compatibleGrades }) => [`${item.id}_${suffix}`, { itemId: item.id, compatibleGrades }])),
) as Record<string, { itemId: string; compatibleGrades: ItemGrade[] }>;

export const legacyItemIdMap: Record<string, string> = Object.fromEntries(
  [
    ...Object.entries(generatedItemIdMap).map(([generatedId, value]) => [generatedId, value.itemId]),
    ["cloth_shoes", "cloth_boots"],
    ["cloth_shoes_common", "cloth_boots"],
  ],
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
      grade: "fan",
      description: "未登记物品。",
    }
  );
}

export function formatItemName(itemOrId: ItemConfig | string): string {
  const item = typeof itemOrId === "string" ? getItem(itemOrId) : itemOrId;
  if (item.equipment) {
    return buildEquipmentDisplayName({ name: item.name, quality: item.grade });
  }
  return item.name;
}

export function shouldEmphasizeItemGrade(grade: ItemGrade): boolean {
  return itemGradeMetas[grade].tier >= itemGradeMetas.ling.tier;
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
    affixes: config.category === "equipment" ? undefined : config.affixes,
    equipment: config.equipment
      ? {
          slot: config.equipment.slot,
          requiredMajorRealm: config.equipment.requiredMajorRealm,
          requiredPhase: config.equipment.requiredPhase,
        }
      : undefined,
  };
}

function roundToFive(value: number): number {
  return Math.max(5, Math.round(value / 5) * 5);
}
