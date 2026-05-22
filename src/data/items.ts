import { buildEquipmentDisplayName } from "./equipmentNameRules";
import { itemGradeLabels, itemGradeMetas, itemGradeNamePrefixes, itemGradeOrder, normalizeQuality, qualityGrades } from "./qualityGrades";
import type { EquipmentBonus, EquipmentSlotId, ItemAffix, ItemConfig, ItemGrade, ItemTierId, MajorRealmId, RealmPhaseId } from "../types";

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
    baseBonuses: EquipmentBonus;
    basePowerBonus: number;
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
  affixes: itemGradeAffixLibrary[grade],
  equipment: {
    slot: "weapon",
    baseBonuses: { attack: 6 + index * 2 },
    basePowerBonus: 12 + index * 4,
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
    grade: "fan",
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
    id: "cloth_boots",
    name: "布履",
    category: "equipment",
    tier: "mortal",
    grade: "fan",
    description: "粗布缝成的鞋履，适合长途跋涉。",
    basePrice: 18,
    equipment: {
      slot: "boots",
      baseBonuses: { speed: 1 },
      basePowerBonus: 5,
      requiredMajorRealm: "mortal",
    },
  },
  {
    id: "azure_pattern_robe",
    name: "青纹法袍",
    category: "equipment",
    tier: "qi",
    grade: "liang",
    description: "绣有引气纹路的基础法袍。",
    basePrice: 120,
    equipment: { slot: "robe", baseBonuses: { maxHp: 42, defense: 5 }, basePowerBonus: 30, requiredMajorRealm: "qi" },
  },
  {
    id: "spirit_spring_robe",
    name: "灵泉法袍",
    category: "equipment",
    tier: "qi",
    grade: "jing",
    description: "衣料浸润灵泉，适合长时修炼。",
    basePrice: 200,
    equipment: { slot: "robe", baseBonuses: { maxHp: 52, defense: 7, maxSpirit: 10 }, basePowerBonus: 42, requiredMajorRealm: "qi" },
  },
  {
    id: "mystic_fire_robe",
    name: "玄火法袍",
    category: "equipment",
    tier: "foundation",
    grade: "ling",
    description: "火纹法袍，护体灵压更强。",
    basePrice: 480,
    equipment: { slot: "robe", baseBonuses: { maxHp: 88, defense: 12 }, basePowerBonus: 68, requiredMajorRealm: "foundation" },
  },
  {
    id: "flowing_cloud_robe",
    name: "流云道袍",
    category: "equipment",
    tier: "foundation",
    grade: "ling",
    description: "云纹轻袍，进退从容。",
    basePrice: 500,
    equipment: { slot: "robe", baseBonuses: { maxHp: 84, defense: 11, speed: 1 }, basePowerBonus: 68, requiredMajorRealm: "foundation" },
  },
  {
    id: "greenwood_robe",
    name: "青木法袍",
    category: "equipment",
    tier: "foundation",
    grade: "ling",
    description: "木灵加护，恢复绵长。",
    basePrice: 500,
    equipment: { slot: "robe", baseBonuses: { maxHp: 92, defense: 11 }, basePowerBonus: 70, requiredMajorRealm: "foundation" },
  },
  {
    id: "jadewater_garb",
    name: "碧水灵衣",
    category: "equipment",
    tier: "core",
    grade: "xuan",
    description: "水灵凝成的轻甲灵衣。",
    basePrice: 920,
    equipment: { slot: "robe", baseBonuses: { maxHp: 140, defense: 16, maxSpirit: 18 }, basePowerBonus: 110, requiredMajorRealm: "core" },
  },
  {
    id: "frost_robe",
    name: "寒霜法袍",
    category: "equipment",
    tier: "core",
    grade: "xuan",
    description: "寒意护体，守势扎实。",
    basePrice: 940,
    equipment: { slot: "robe", baseBonuses: { maxHp: 148, defense: 18 }, basePowerBonus: 114, requiredMajorRealm: "core" },
  },
  {
    id: "mountain_guard_robe",
    name: "镇岳法袍",
    category: "equipment",
    tier: "core",
    grade: "xuan",
    description: "山岳厚重之意，重在防护。",
    basePrice: 980,
    equipment: { slot: "robe", baseBonuses: { maxHp: 156, defense: 20 }, basePowerBonus: 118, requiredMajorRealm: "core" },
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
      baseBonuses: { attack: 12 },
      basePowerBonus: 42,
      requiredMajorRealm: "qi",
    },
  },
  {
    id: "old_wood_sword",
    name: "旧木剑",
    category: "equipment",
    tier: "mortal",
    grade: "fan",
    description: "木质旧剑，轻巧易用，适合初学者练手。",
    basePrice: 24,
    equipment: { slot: "weapon", baseBonuses: { attack: 3 }, basePowerBonus: 14, requiredMajorRealm: "mortal" },
  },
  {
    id: "green_bamboo_sword",
    name: "青竹剑",
    category: "equipment",
    tier: "mortal",
    grade: "liang",
    description: "以青竹节骨削制，出剑灵动。",
    basePrice: 60,
    equipment: { slot: "weapon", baseBonuses: { attack: 6, speed: 1 }, basePowerBonus: 24, requiredMajorRealm: "mortal" },
  },
  {
    id: "ironbone_blade",
    name: "铁骨刀",
    category: "equipment",
    tier: "mortal",
    grade: "liang",
    description: "刀身厚重，适合以力破势。",
    basePrice: 68,
    equipment: { slot: "weapon", baseBonuses: { attack: 7 }, basePowerBonus: 26, requiredMajorRealm: "mortal" },
  },
  {
    id: "short_azure_blade",
    name: "短青刃",
    category: "equipment",
    tier: "qi",
    grade: "liang",
    description: "短刃贴身，便于连击与周旋。",
    basePrice: 140,
    equipment: { slot: "weapon", baseBonuses: { attack: 9, speed: 1 }, basePowerBonus: 34, requiredMajorRealm: "qi" },
  },
  {
    id: "cloudbreaker_spear",
    name: "破云枪",
    category: "equipment",
    tier: "qi",
    grade: "jing",
    description: "枪锋破空，擅长先手压制。",
    basePrice: 240,
    equipment: { slot: "weapon", baseBonuses: { attack: 12, speed: 1 }, basePowerBonus: 44, requiredMajorRealm: "qi" },
  },
  {
    id: "spiritfocus_staff",
    name: "聚灵杖",
    category: "equipment",
    tier: "qi",
    grade: "jing",
    description: "杖端灵晶可聚拢周遭灵气。",
    basePrice: 250,
    equipment: { slot: "weapon", baseBonuses: { attack: 11, spiritSense: 2 }, basePowerBonus: 46, requiredMajorRealm: "qi" },
  },
  {
    id: "frost_sword",
    name: "寒霜剑",
    category: "equipment",
    tier: "foundation",
    grade: "jing",
    description: "剑脊覆霜，出鞘自带寒意。",
    basePrice: 420,
    equipment: { slot: "weapon", baseBonuses: { attack: 16, defense: 2 }, basePowerBonus: 70, requiredMajorRealm: "foundation" },
  },
  {
    id: "mystic_fire_sword",
    name: "玄火剑",
    category: "equipment",
    tier: "foundation",
    grade: "ling",
    description: "火纹内敛，剑势炽烈。",
    basePrice: 520,
    equipment: { slot: "weapon", baseBonuses: { attack: 18, critRate: 0.02 }, basePowerBonus: 82, requiredMajorRealm: "foundation" },
  },
  {
    id: "flowing_cloud_sword",
    name: "流云剑",
    category: "equipment",
    tier: "foundation",
    grade: "ling",
    description: "云纹轻灵，讲究身法与连携。",
    basePrice: 520,
    equipment: { slot: "weapon", baseBonuses: { attack: 17, speed: 2 }, basePowerBonus: 80, requiredMajorRealm: "foundation" },
  },
  {
    id: "crimson_flame_blade",
    name: "赤炎刀",
    category: "equipment",
    tier: "foundation",
    grade: "ling",
    description: "刀锋灼热，重斩威力突出。",
    basePrice: 540,
    equipment: { slot: "weapon", baseBonuses: { attack: 19 }, basePowerBonus: 84, requiredMajorRealm: "foundation" },
  },
  {
    id: "blackwind_blade",
    name: "黑风刀",
    category: "equipment",
    tier: "foundation",
    grade: "ling",
    description: "刀路诡疾，如黑风卷叶。",
    basePrice: 560,
    equipment: { slot: "weapon", baseBonuses: { attack: 18, speed: 2 }, basePowerBonus: 86, requiredMajorRealm: "foundation" },
  },
  {
    id: "azure_void_sword",
    name: "青冥剑",
    category: "equipment",
    tier: "core",
    grade: "xuan",
    description: "剑意深邃，攻守均衡。",
    basePrice: 980,
    equipment: { slot: "weapon", baseBonuses: { attack: 25, defense: 4 }, basePowerBonus: 126, requiredMajorRealm: "core" },
  },
  {
    id: "jadewater_sword",
    name: "碧水剑",
    category: "equipment",
    tier: "core",
    grade: "xuan",
    description: "水意绵长，擅稳战续航。",
    basePrice: 980,
    equipment: { slot: "weapon", baseBonuses: { attack: 24, maxSpirit: 18 }, basePowerBonus: 124, requiredMajorRealm: "core" },
  },
  {
    id: "greenwood_sword",
    name: "青木剑",
    category: "equipment",
    tier: "core",
    grade: "xuan",
    description: "木灵缠锋，生生不息。",
    basePrice: 990,
    equipment: { slot: "weapon", baseBonuses: { attack: 24, maxHp: 32 }, basePowerBonus: 126, requiredMajorRealm: "core" },
  },
  {
    id: "goldpattern_sword",
    name: "金纹剑",
    category: "equipment",
    tier: "core",
    grade: "xuan",
    description: "金纹铭刻，剑势凌厉。",
    basePrice: 1020,
    equipment: { slot: "weapon", baseBonuses: { attack: 27 }, basePowerBonus: 132, requiredMajorRealm: "core" },
  },
  {
    id: "thunderpattern_spear",
    name: "雷纹枪",
    category: "equipment",
    tier: "core",
    grade: "xuan",
    description: "枪身雷纹闪烁，突刺迅猛。",
    basePrice: 1030,
    equipment: { slot: "weapon", baseBonuses: { attack: 26, speed: 2 }, basePowerBonus: 132, requiredMajorRealm: "core" },
  },
  {
    id: "coldmoon_blade",
    name: "寒月刃",
    category: "equipment",
    tier: "core",
    grade: "xuan",
    description: "薄刃映月，善破敌隙。",
    basePrice: 1020,
    equipment: { slot: "weapon", baseBonuses: { attack: 26, critRate: 0.03 }, basePowerBonus: 134, requiredMajorRealm: "core" },
  },
  {
    id: "violet_thunder_sword", name: "紫电剑", category: "equipment", tier: "core", grade: "xuan", description: "雷意贯刃，爆发迅疾。", basePrice: 1080,
    equipment: { slot: "weapon", baseBonuses: { attack: 28, critRate: 0.03 }, basePowerBonus: 138, requiredMajorRealm: "core" },
  },
  { id: "mountainward_sword", name: "镇岳剑", category: "equipment", tier: "core", grade: "di", description: "重剑如岳，攻防兼备。", basePrice: 1280, equipment: { slot: "weapon", baseBonuses: { attack: 32, defense: 6 }, basePowerBonus: 160, requiredMajorRealm: "core" } },
  { id: "bamboo_crown", name: "竹冠", category: "equipment", tier: "mortal", grade: "fan", description: "简易竹冠，凝神静气。", basePrice: 16, equipment: { slot: "helmet", baseBonuses: { maxSpirit: 6 }, basePowerBonus: 6, requiredMajorRealm: "mortal" } },
  { id: "jade_crown", name: "青玉冠", category: "equipment", tier: "qi", grade: "liang", description: "青玉镶边，可稳心神。", basePrice: 96, equipment: { slot: "helmet", baseBonuses: { maxSpirit: 16, defense: 2 }, basePowerBonus: 24, requiredMajorRealm: "qi" } },
  { id: "mystic_pattern_crown", name: "玄纹冠", category: "equipment", tier: "qi", grade: "jing", description: "玄纹冠饰，提升神识。", basePrice: 180, equipment: { slot: "helmet", baseBonuses: { maxSpirit: 24, spiritSense: 1 }, basePowerBonus: 36, requiredMajorRealm: "qi" } },
  { id: "frost_crown", name: "寒霜冠", category: "equipment", tier: "foundation", grade: "ling", description: "寒意沁神，稳固灵台。", basePrice: 360, equipment: { slot: "helmet", baseBonuses: { maxSpirit: 40, defense: 5 }, basePowerBonus: 54, requiredMajorRealm: "foundation" } },
  { id: "flowing_cloud_crown", name: "流云冠", category: "equipment", tier: "foundation", grade: "ling", description: "轻灵云冠，兼顾神识与身法。", basePrice: 390, equipment: { slot: "helmet", baseBonuses: { maxSpirit: 42, speed: 1, spiritSense: 1 }, basePowerBonus: 58, requiredMajorRealm: "foundation" } },
  { id: "coarse_cloth_wrist", name: "粗布护腕", category: "equipment", tier: "mortal", grade: "fan", description: "粗布缠绕，略作防护。", basePrice: 14, equipment: { slot: "wrist", baseBonuses: { defense: 1, maxHp: 10 }, basePowerBonus: 5, requiredMajorRealm: "mortal" } },
  { id: "azure_pattern_wrist", name: "青纹护腕", category: "equipment", tier: "qi", grade: "liang", description: "青纹护腕，出手更稳。", basePrice: 88, equipment: { slot: "wrist", baseBonuses: { attack: 3, defense: 2 }, basePowerBonus: 22, requiredMajorRealm: "qi" } },
  { id: "mystic_fire_wrist", name: "玄火护腕", category: "equipment", tier: "foundation", grade: "ling", description: "火纹护腕，劲力更足。", basePrice: 320, equipment: { slot: "wrist", baseBonuses: { attack: 6, defense: 4 }, basePowerBonus: 48, requiredMajorRealm: "foundation" } },
  { id: "flowing_cloud_wrist", name: "流云护腕", category: "equipment", tier: "foundation", grade: "ling", description: "云纹护腕，攻守协调。", basePrice: 330, equipment: { slot: "wrist", baseBonuses: { attack: 5, speed: 1, defense: 4 }, basePowerBonus: 50, requiredMajorRealm: "foundation" } },
  { id: "straw_sandals", name: "草履", category: "equipment", tier: "mortal", grade: "fan", description: "乡野常见草履。", basePrice: 10, equipment: { slot: "boots", baseBonuses: { speed: 1 }, basePowerBonus: 4, requiredMajorRealm: "mortal" } },
  { id: "breeze_shoes", name: "清风履", category: "equipment", tier: "qi", grade: "liang", description: "步履生风，轻便耐走。", basePrice: 72, equipment: { slot: "boots", baseBonuses: { speed: 2 }, basePowerBonus: 18, requiredMajorRealm: "qi" } },
  { id: "cloudstride_boots", name: "踏云靴", category: "equipment", tier: "foundation", grade: "jing", description: "踏云而行，擅长抢先。", basePrice: 260, equipment: { slot: "boots", baseBonuses: { speed: 3, dodgeRate: 0.01 }, basePowerBonus: 42, requiredMajorRealm: "foundation" } },
  { id: "windchase_boots", name: "逐风靴", category: "equipment", tier: "foundation", grade: "ling", description: "轻灵迅捷，便于游斗。", basePrice: 320, equipment: { slot: "boots", baseBonuses: { speed: 3, dodgeRate: 0.02 }, basePowerBonus: 50, requiredMajorRealm: "foundation" } },
  { id: "flowing_cloud_shoes", name: "流云履", category: "equipment", tier: "core", grade: "xuan", description: "云意流转，步法玄妙。", basePrice: 620, equipment: { slot: "boots", baseBonuses: { speed: 4, dodgeRate: 0.03 }, basePowerBonus: 76, requiredMajorRealm: "core" } },
  { id: "copper_ring", name: "铜戒", category: "equipment", tier: "mortal", grade: "fan", description: "朴素铜戒，略增气感。", basePrice: 20, equipment: { slot: "ring", baseBonuses: { spiritSense: 1 }, basePowerBonus: 8, requiredMajorRealm: "mortal" } },
  { id: "jade_ring", name: "青玉戒", category: "equipment", tier: "qi", grade: "liang", description: "青玉暖润，灵力更顺。", basePrice: 100, equipment: { slot: "ring", baseBonuses: { spiritSense: 2, maxSpirit: 10 }, basePowerBonus: 24, requiredMajorRealm: "qi" } },
  { id: "crimson_fire_ring", name: "赤火戒", category: "equipment", tier: "foundation", grade: "ling", description: "火行戒指，进攻性更强。", basePrice: 360, equipment: { slot: "ring", baseBonuses: { attack: 7, critRate: 0.02 }, basePowerBonus: 54, requiredMajorRealm: "foundation" } },
  { id: "azure_frost_ring", name: "青霜戒", category: "equipment", tier: "foundation", grade: "ling", description: "霜气缠戒，稳定护身。", basePrice: 360, equipment: { slot: "ring", baseBonuses: { defense: 6, maxSpirit: 20 }, basePowerBonus: 54, requiredMajorRealm: "foundation" } },
  { id: "flowing_cloud_ring", name: "流云戒", category: "equipment", tier: "core", grade: "xuan", description: "流云灵戒，攻守兼备。", basePrice: 680, equipment: { slot: "ring", baseBonuses: { attack: 8, spiritSense: 3, maxSpirit: 24 }, basePowerBonus: 84, requiredMajorRealm: "core" } },
  { id: "clarity_talisman", name: "清心符", category: "equipment", tier: "qi", grade: "liang", description: "平复心神的灵符。", basePrice: 130, equipment: { slot: "amulet", baseBonuses: { maxSpirit: 18 }, basePowerBonus: 28, requiredMajorRealm: "qi" } },
  { id: "spirit_gather_pendant", name: "聚灵玉佩", category: "equipment", tier: "qi", grade: "jing", description: "缓慢聚拢天地灵气。", basePrice: 220, equipment: { slot: "amulet", baseBonuses: { maxSpirit: 26, spiritSense: 2 }, basePowerBonus: 40, requiredMajorRealm: "qi" } },
  { id: "mind_ward_pendant", name: "镇心玉佩", category: "equipment", tier: "foundation", grade: "ling", description: "镇压杂念，稳固灵台。", basePrice: 390, equipment: { slot: "amulet", baseBonuses: { maxSpirit: 38, defense: 5 }, basePowerBonus: 56, requiredMajorRealm: "foundation" } },
  { id: "brightmind_talisman", name: "明心灵符", category: "equipment", tier: "foundation", grade: "ling", description: "明心见性，神识更清明。", basePrice: 420, equipment: { slot: "amulet", baseBonuses: { spiritSense: 3, maxSpirit: 34 }, basePowerBonus: 58, requiredMajorRealm: "foundation" } },
  { id: "spirit_gourd", name: "聚灵葫", category: "equipment", tier: "foundation", grade: "ling", description: "可储纳灵息的法葫。", basePrice: 450, equipment: { slot: "artifact", baseBonuses: { maxSpirit: 46, spiritSense: 2 }, basePowerBonus: 62, requiredMajorRealm: "foundation" } },
  { id: "mountain_seal", name: "镇岳印", category: "equipment", tier: "core", grade: "xuan", description: "镇岳之势，护体强横。", basePrice: 820, equipment: { slot: "artifact", baseBonuses: { defense: 10, maxHp: 80 }, basePowerBonus: 96, requiredMajorRealm: "core" } },
  { id: "clarity_bell", name: "清心铃", category: "equipment", tier: "foundation", grade: "ling", description: "铃音澄澈，可安魂定魄。", basePrice: 460, equipment: { slot: "artifact", baseBonuses: { maxSpirit: 40, defense: 4 }, basePowerBonus: 60, requiredMajorRealm: "foundation" } },
  { id: "spirit_spring_orb", name: "灵泉珠", category: "equipment", tier: "foundation", grade: "ling", description: "珠内灵泉流转，滋养经脉。", basePrice: 470, equipment: { slot: "artifact", baseBonuses: { maxHp: 60, maxSpirit: 24 }, basePowerBonus: 64, requiredMajorRealm: "foundation" } },
  { id: "violet_thunder_orb", name: "紫电珠", category: "equipment", tier: "core", grade: "xuan", description: "蕴含雷息，强化攻势。", basePrice: 860, equipment: { slot: "artifact", baseBonuses: { attack: 10, critRate: 0.03 }, basePowerBonus: 102, requiredMajorRealm: "core" } },
  { id: "blackwind_banner", name: "黑风幡", category: "equipment", tier: "core", grade: "xuan", description: "幡影黑风，压迫感极强。", basePrice: 880, equipment: { slot: "artifact", baseBonuses: { attack: 9, speed: 2, spiritSense: 2 }, basePowerBonus: 104, requiredMajorRealm: "core" } },
  { id: "demon_reveal_mirror", name: "照妖镜", category: "equipment", tier: "core", grade: "di", description: "镜光照妖，破妄显形。", basePrice: 980, equipment: { slot: "artifact", baseBonuses: { spiritSense: 4, critRate: 0.03, attack: 8 }, basePowerBonus: 116, requiredMajorRealm: "core" } },
  {
    id: "lingxiao_sword",
    name: "凌霄剑",
    category: "equipment",
    tier: "nascent",
    grade: "di",
    description: "剑意凌霄，直破罡风。",
    basePrice: 2200,
    equipment: { slot: "weapon", baseBonuses: { attack: 40, speed: 3 }, basePowerBonus: 208, requiredMajorRealm: "nascent" },
  },
  { id: "taiqing_sword", name: "太清剑", category: "equipment", tier: "nascent", grade: "di", description: "太清真意凝于锋刃。", basePrice: 2260, equipment: { slot: "weapon", baseBonuses: { attack: 42, spiritSense: 3 }, basePowerBonus: 214, requiredMajorRealm: "nascent" } },
  { id: "ziwei_sword", name: "紫微剑", category: "equipment", tier: "nascent", grade: "tian", description: "紫微星辉加持，威势惊人。", basePrice: 2480, equipment: { slot: "weapon", baseBonuses: { attack: 45, critRate: 0.04 }, basePowerBonus: 228, requiredMajorRealm: "nascent" } },
  { id: "heaven_punishment_sword", name: "天罚剑", category: "equipment", tier: "deity", grade: "tian", description: "传言可引天雷一击。", basePrice: 2880, equipment: { slot: "weapon", baseBonuses: { attack: 50, critRate: 0.05 }, basePowerBonus: 252, requiredMajorRealm: "deity" } },
  { id: "big_dipper_sevenstar_sword", name: "北斗七星剑", category: "equipment", tier: "deity", grade: "tian", description: "七星并耀，连斩如潮。", basePrice: 2960, equipment: { slot: "weapon", baseBonuses: { attack: 51, speed: 4 }, basePowerBonus: 256, requiredMajorRealm: "deity" } },
  { id: "zhenwu_demoncleave_sword", name: "真武荡魔剑", category: "equipment", tier: "deity", grade: "xian", description: "真武道统所传伏魔重器。", basePrice: 3320, equipment: { slot: "weapon", baseBonuses: { attack: 56, defense: 8 }, basePowerBonus: 282, requiredMajorRealm: "deity" } },
  { id: "taiyi_splitlight_sword", name: "太乙分光剑", category: "equipment", tier: "void", grade: "xian", description: "分光化影，剑路难测。", basePrice: 3880, equipment: { slot: "weapon", baseBonuses: { attack: 62, speed: 5 }, basePowerBonus: 312, requiredMajorRealm: "void" } },
  { id: "sanqing_cleandust_sword", name: "三清斩尘剑", category: "equipment", tier: "void", grade: "xian", description: "斩尽尘妄，剑心通明。", basePrice: 3940, equipment: { slot: "weapon", baseBonuses: { attack: 63, spiritSense: 5 }, basePowerBonus: 316, requiredMajorRealm: "void" } },
  { id: "lingbao_qingxuan_sword", name: "灵宝青玄剑", category: "equipment", tier: "integration", grade: "shen", description: "灵宝级青玄名剑。", basePrice: 4680, equipment: { slot: "weapon", baseBonuses: { attack: 72, critRate: 0.06, spiritSense: 6 }, basePowerBonus: 362, requiredMajorRealm: "integration" } },
  { id: "yuanshi_jadeedge_sword", name: "元始玉锋剑", category: "equipment", tier: "integration", grade: "shen", description: "玉锋如雪，神威内敛。", basePrice: 4760, equipment: { slot: "weapon", baseBonuses: { attack: 74, defense: 10, critRate: 0.05 }, basePowerBonus: 368, requiredMajorRealm: "integration" } },
  { id: "haotian_sword", name: "昊天剑", category: "equipment", tier: "mahayana", grade: "shen", description: "帝威浩荡，镇压群邪。", basePrice: 5400, equipment: { slot: "weapon", baseBonuses: { attack: 82, defense: 12, critRate: 0.06 }, basePowerBonus: 410, requiredMajorRealm: "mahayana" } },
  { id: "ziwei_robe", name: "紫微法袍", category: "equipment", tier: "nascent", grade: "di", description: "星辉法袍，护体有灵。", basePrice: 2140, equipment: { slot: "robe", baseBonuses: { maxHp: 240, defense: 28, maxSpirit: 40 }, basePowerBonus: 196, requiredMajorRealm: "nascent" } },
  { id: "taiqing_robe", name: "太清法袍", category: "equipment", tier: "nascent", grade: "tian", description: "太清道韵，攻守平衡。", basePrice: 2360, equipment: { slot: "robe", baseBonuses: { maxHp: 256, defense: 30, maxSpirit: 44 }, basePowerBonus: 206, requiredMajorRealm: "nascent" } },
  { id: "wuji_tao_robe", name: "无极道袍", category: "equipment", tier: "deity", grade: "tian", description: "无极流转，护周身经脉。", basePrice: 2720, equipment: { slot: "robe", baseBonuses: { maxHp: 286, defense: 34, maxSpirit: 52 }, basePowerBonus: 226, requiredMajorRealm: "deity" } },
  { id: "lingxiao_robe", name: "凌霄法袍", category: "equipment", tier: "deity", grade: "xian", description: "凌霄宝殿旧制法袍。", basePrice: 3080, equipment: { slot: "robe", baseBonuses: { maxHp: 314, defense: 38, maxSpirit: 58 }, basePowerBonus: 246, requiredMajorRealm: "deity" } },
  { id: "star_lord_robe", name: "星君法袍", category: "equipment", tier: "void", grade: "xian", description: "披星戴月，灵息不绝。", basePrice: 3440, equipment: { slot: "robe", baseBonuses: { maxHp: 340, defense: 41, maxSpirit: 64 }, basePowerBonus: 268, requiredMajorRealm: "void" } },
  { id: "yaochi_fairy_garb", name: "瑶池仙衣", category: "equipment", tier: "void", grade: "xian", description: "瑶池仙衣，轻灵如水。", basePrice: 3520, equipment: { slot: "robe", baseBonuses: { maxHp: 334, defense: 40, speed: 4, maxSpirit: 68 }, basePowerBonus: 270, requiredMajorRealm: "void" } },
  { id: "ziwei_star_garb", name: "紫微星衣", category: "equipment", tier: "integration", grade: "shen", description: "星河流转，紫气东来。", basePrice: 4220, equipment: { slot: "robe", baseBonuses: { maxHp: 380, defense: 46, maxSpirit: 74 }, basePowerBonus: 312, requiredMajorRealm: "integration" } },
  { id: "zhenwu_mystic_armor", name: "真武玄甲", category: "equipment", tier: "integration", grade: "shen", description: "玄武真意铸成，防御绝伦。", basePrice: 4300, equipment: { slot: "robe", baseBonuses: { maxHp: 412, defense: 52 }, basePowerBonus: 320, requiredMajorRealm: "integration" } },
  { id: "taishang_bagua_robe", name: "太上八卦袍", category: "equipment", tier: "mahayana", grade: "shen", description: "八卦道纹护体，万法不侵。", basePrice: 4980, equipment: { slot: "robe", baseBonuses: { maxHp: 438, defense: 56, maxSpirit: 82 }, basePowerBonus: 362, requiredMajorRealm: "mahayana" } },
  { id: "haotian_emperor_robe", name: "昊天帝袍", category: "equipment", tier: "mahayana", grade: "shen", description: "帝袍加身，威压四方。", basePrice: 5200, equipment: { slot: "robe", baseBonuses: { maxHp: 460, defense: 58, maxSpirit: 88 }, basePowerBonus: 378, requiredMajorRealm: "mahayana" } },
  { id: "doufu_crown", name: "斗府法冠", category: "equipment", tier: "nascent", grade: "di", description: "斗府制式法冠，稳神凝意。", basePrice: 1980, equipment: { slot: "helmet", baseBonuses: { maxSpirit: 96, spiritSense: 4 }, basePowerBonus: 174, requiredMajorRealm: "nascent" } },
  { id: "star_official_crown", name: "星官冠", category: "equipment", tier: "nascent", grade: "tian", description: "星官法冠，可引星辉。", basePrice: 2160, equipment: { slot: "helmet", baseBonuses: { maxSpirit: 104, spiritSense: 5 }, basePowerBonus: 184, requiredMajorRealm: "nascent" } },
  { id: "thunder_pattern_divine_crown", name: "雷纹神冠", category: "equipment", tier: "deity", grade: "tian", description: "雷纹缠绕，威压不凡。", basePrice: 2440, equipment: { slot: "helmet", baseBonuses: { maxSpirit: 116, spiritSense: 5, defense: 8 }, basePowerBonus: 198, requiredMajorRealm: "deity" } },
  { id: "ziwei_star_crown", name: "紫微星冠", category: "equipment", tier: "deity", grade: "xian", description: "星冠耀目，神识大增。", basePrice: 2780, equipment: { slot: "helmet", baseBonuses: { maxSpirit: 132, spiritSense: 7 }, basePowerBonus: 220, requiredMajorRealm: "deity" } },
  { id: "zhenwu_mystic_crown", name: "真武玄冠", category: "equipment", tier: "void", grade: "xian", description: "玄冠镇念，意守如山。", basePrice: 3120, equipment: { slot: "helmet", baseBonuses: { maxSpirit: 144, spiritSense: 7, defense: 10 }, basePowerBonus: 238, requiredMajorRealm: "void" } },
  { id: "sanqing_tao_crown", name: "三清道冠", category: "equipment", tier: "integration", grade: "shen", description: "三清道统象征。", basePrice: 3720, equipment: { slot: "helmet", baseBonuses: { maxSpirit: 162, spiritSense: 9 }, basePowerBonus: 274, requiredMajorRealm: "integration" } },
  { id: "jade_emperor_crown", name: "玉皇冠", category: "equipment", tier: "mahayana", grade: "shen", description: "玉皇御制冠冕。", basePrice: 4300, equipment: { slot: "helmet", baseBonuses: { maxSpirit: 178, spiritSense: 10, defense: 12 }, basePowerBonus: 308, requiredMajorRealm: "mahayana" } },
  { id: "big_dipper_life_talisman", name: "北斗护命符", category: "equipment", tier: "nascent", grade: "di", description: "北斗护命，延绵生机。", basePrice: 2080, equipment: { slot: "amulet", baseBonuses: { maxHp: 180, maxSpirit: 76 }, basePowerBonus: 182, requiredMajorRealm: "nascent" } },
  { id: "taiyi_guard_talisman", name: "太乙护身符", category: "equipment", tier: "nascent", grade: "tian", description: "太乙道符，护体强韧。", basePrice: 2280, equipment: { slot: "amulet", baseBonuses: { maxHp: 194, defense: 16, maxSpirit: 80 }, basePowerBonus: 194, requiredMajorRealm: "nascent" } },
  { id: "zhenwu_evilward_talisman", name: "真武镇邪符", category: "equipment", tier: "deity", grade: "tian", description: "镇邪辟秽，稳固道心。", basePrice: 2580, equipment: { slot: "amulet", baseBonuses: { maxHp: 208, defense: 18, spiritSense: 6 }, basePowerBonus: 208, requiredMajorRealm: "deity" } },
  { id: "nine_heavens_thunder_talisman", name: "九霄雷符", category: "equipment", tier: "deity", grade: "xian", description: "雷符加持，攻势凌厉。", basePrice: 2920, equipment: { slot: "amulet", baseBonuses: { attack: 14, critRate: 0.04, maxSpirit: 86 }, basePowerBonus: 232, requiredMajorRealm: "deity" } },
  { id: "ziwei_star_talisman", name: "紫微星符", category: "equipment", tier: "void", grade: "xian", description: "星符流光，心神澄明。", basePrice: 3260, equipment: { slot: "amulet", baseBonuses: { spiritSense: 8, maxSpirit: 94 }, basePowerBonus: 248, requiredMajorRealm: "void" } },
  { id: "yuanshi_jade_talisman", name: "元始玉符", category: "equipment", tier: "integration", grade: "shen", description: "玉符蕴道，玄妙无穷。", basePrice: 3880, equipment: { slot: "amulet", baseBonuses: { maxHp: 236, maxSpirit: 108, spiritSense: 9 }, basePowerBonus: 286, requiredMajorRealm: "integration" } },
  { id: "taishang_serenity_talisman", name: "太上清静符", category: "equipment", tier: "mahayana", grade: "shen", description: "太上清静，万念归一。", basePrice: 4460, equipment: { slot: "amulet", baseBonuses: { maxHp: 248, maxSpirit: 118, spiritSense: 10 }, basePowerBonus: 318, requiredMajorRealm: "mahayana" } },
  { id: "soul_stabilize_mirror", name: "镇魂镜", category: "equipment", tier: "deity", grade: "tian", description: "镜光定魂，抑制心魔。", basePrice: 2660, equipment: { slot: "artifact", baseBonuses: { defense: 16, maxSpirit: 92 }, basePowerBonus: 214, requiredMajorRealm: "deity" } },
  { id: "doufu_mystic_mirror", name: "斗府玄镜", category: "equipment", tier: "void", grade: "xian", description: "照彻虚实，洞见先机。", basePrice: 3360, equipment: { slot: "artifact", baseBonuses: { spiritSense: 9, maxSpirit: 98 }, basePowerBonus: 254, requiredMajorRealm: "void" } },
  { id: "thunder_lord_hammer", name: "雷公锤", category: "equipment", tier: "deity", grade: "xian", description: "雷公神锤，破甲碎岳。", basePrice: 3200, equipment: { slot: "artifact", baseBonuses: { attack: 18, critDamage: 0.2 }, basePowerBonus: 246, requiredMajorRealm: "deity" } },
  { id: "heavenly_net", name: "天罗网", category: "equipment", tier: "void", grade: "xian", description: "天罗一出，万物难遁。", basePrice: 3440, equipment: { slot: "artifact", baseBonuses: { defense: 18, speed: 3 }, basePowerBonus: 258, requiredMajorRealm: "void" } },
  { id: "wind_fire_wheels", name: "风火轮", category: "equipment", tier: "void", grade: "xian", description: "风火相济，身法极快。", basePrice: 3480, equipment: { slot: "artifact", baseBonuses: { speed: 6, attack: 12 }, basePowerBonus: 262, requiredMajorRealm: "void" } },
  { id: "dou_shu_heavenly_book", name: "斗数天书", category: "equipment", tier: "integration", grade: "shen", description: "记载天机斗数之秘。", basePrice: 4040, equipment: { slot: "artifact", baseBonuses: { spiritSense: 11, maxSpirit: 116 }, basePowerBonus: 292, requiredMajorRealm: "integration" } },
  { id: "doushu_alchemy_furnace", name: "兜率丹炉", category: "equipment", tier: "integration", grade: "shen", description: "兜率宫遗炉，丹火不熄。", basePrice: 4120, equipment: { slot: "artifact", baseBonuses: { maxHp: 252, defense: 20, maxSpirit: 104 }, basePowerBonus: 298, requiredMajorRealm: "integration" } },
  { id: "peach_spirit_branch", name: "蟠桃灵枝", category: "equipment", tier: "mahayana", grade: "shen", description: "蟠桃灵枝，生机旺盛。", basePrice: 4620, equipment: { slot: "artifact", baseBonuses: { maxHp: 286, maxSpirit: 112 }, basePowerBonus: 326, requiredMajorRealm: "mahayana" } },
  { id: "lingxiao_jade_seal", name: "凌霄玉印", category: "equipment", tier: "mahayana", grade: "shen", description: "凌霄权印，威仪赫赫。", basePrice: 4680, equipment: { slot: "artifact", baseBonuses: { defense: 22, attack: 14 }, basePowerBonus: 330, requiredMajorRealm: "mahayana" } },
  { id: "broken_fengshen_register", name: "封神残榜", category: "equipment", tier: "mahayana", grade: "shen", description: "残榜仍含封神余威。", basePrice: 4740, equipment: { slot: "artifact", baseBonuses: { spiritSense: 12, critRate: 0.05 }, basePowerBonus: 334, requiredMajorRealm: "mahayana" } },
  { id: "haotian_mirror", name: "昊天镜", category: "equipment", tier: "tribulation", grade: "shen", description: "昊天神镜，照彻三界。", basePrice: 5400, equipment: { slot: "artifact", baseBonuses: { spiritSense: 13, attack: 16, critRate: 0.06 }, basePowerBonus: 378, requiredMajorRealm: "tribulation" } },
  { id: "taiji_mystic_diagram", name: "太极玄图", category: "equipment", tier: "tribulation", grade: "shen", description: "阴阳流转，攻守合一。", basePrice: 5480, equipment: { slot: "artifact", baseBonuses: { attack: 15, defense: 24, maxSpirit: 124 }, basePowerBonus: 384, requiredMajorRealm: "tribulation" } },
  { id: "qiankun_tao_seal", name: "乾坤道印", category: "equipment", tier: "tribulation", grade: "shen", description: "乾坤道韵，镇压八荒。", basePrice: 5560, equipment: { slot: "artifact", baseBonuses: { defense: 25, maxHp: 300 }, basePowerBonus: 390, requiredMajorRealm: "tribulation" } },
  { id: "big_dipper_star_chart", name: "北斗星盘", category: "equipment", tier: "tribulation", grade: "shen", description: "星盘转动，可窥天机。", basePrice: 5640, equipment: { slot: "artifact", baseBonuses: { speed: 6, spiritSense: 13, maxSpirit: 126 }, basePowerBonus: 394, requiredMajorRealm: "tribulation" } },
  { id: "three_treasures_ruyi", name: "三宝玉如意", category: "equipment", tier: "tribulation", grade: "shen", description: "三宝合一，万法随心。", basePrice: 5720, equipment: { slot: "artifact", baseBonuses: { attack: 16, defense: 22, spiritSense: 12 }, basePowerBonus: 398, requiredMajorRealm: "tribulation" } },
  { id: "hunyuan_gold_dipper", name: "混元金斗", category: "equipment", tier: "tribulation", grade: "shen", description: "先天至宝，压胜诸法。", basePrice: 6200, equipment: { slot: "artifact", baseBonuses: { attack: 18, defense: 26, maxHp: 320, maxSpirit: 136, spiritSense: 14 }, basePowerBonus: 430, requiredMajorRealm: "tribulation" } },
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
      const safeValue = value ?? 0;
      const scaled = key === "dodgeRate" || key === "critRate" || key === "critDamage" ? roundRate(safeValue * multiplier) : Math.max(1, Math.round(safeValue * multiplier));
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
