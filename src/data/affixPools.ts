import type { AffixCategory, AffixValueType, EquipmentSlotId, EquipmentSpecialEffect, ItemGrade, MajorRealmId, Stats } from "../types";

export interface EquipmentAffixConfig {
  id: string;
  name: string;
  category: AffixCategory;
  stat?: keyof Stats | "attackPct" | "defensePct" | "maxHpPct" | "maxSpiritPct" | "spiritSensePct" | "speedPct" | "skillDamagePct";
  type: AffixValueType;
  minRealm: MajorRealmId;
  minQuality: ItemGrade;
  allowedSlots: EquipmentSlotId[];
  effect?: EquipmentSpecialEffect;
  valueRange?: [number, number];
  description: string;
  special?: boolean;
  exclusive?: boolean;
  unique?: boolean;
}

export const realmRank: Record<MajorRealmId, number> = {
  mortal: 0,
  qi: 1,
  foundation: 2,
  core: 3,
  nascent: 4,
  deity: 5,
  void: 6,
  integration: 7,
  mahayana: 8,
  tribulation: 9,
};

export const qualityRank: Record<ItemGrade, number> = {
  fan: 0,
  liang: 1,
  jing: 2,
  ling: 3,
  xuan: 4,
  di: 5,
  tian: 6,
  xian: 7,
  shen: 8,
};

const weaponSlots: EquipmentSlotId[] = ["weapon", "ring", "wrist", "artifact"];
const armorSlots: EquipmentSlotId[] = ["robe", "helmet", "wrist", "amulet", "artifact"];
const resourceSlots: EquipmentSlotId[] = ["amulet", "ring", "artifact"];
const spiritSlots: EquipmentSlotId[] = ["artifact", "amulet"];

export const affixPools: EquipmentAffixConfig[] = [
  { id: "atk_flat", name: "锋锐", category: "attack", stat: "attack", type: "flat", minRealm: "qi", minQuality: "liang", allowedSlots: ["weapon", "ring", "wrist"], description: "攻击提高。" },
  { id: "atk_pct", name: "破军", category: "attack", stat: "attackPct", type: "percent", minRealm: "foundation", minQuality: "jing", allowedSlots: ["weapon", "artifact"], description: "攻击按比例提高。" },
  { id: "skill_damage_pct", name: "法术增伤", category: "attack", stat: "skillDamagePct", type: "percent", minRealm: "foundation", minQuality: "ling", allowedSlots: ["weapon", "artifact", "ring"], description: "技能伤害提高。" },
  { id: "beast_damage_pct", name: "诛妖", category: "attack", type: "percent", minRealm: "qi", minQuality: "liang", allowedSlots: ["weapon", "ring"], valueRange: [0.04, 0.12], description: "对妖兽造成的伤害提高。" },
  { id: "cultivator_damage_pct", name: "斩修", category: "attack", type: "percent", minRealm: "foundation", minQuality: "jing", allowedSlots: ["weapon", "artifact"], valueRange: [0.04, 0.12], description: "对修士造成的伤害提高。" },
  { id: "armor_break_pct", name: "破甲", category: "attack", type: "percent", minRealm: "core", minQuality: "ling", allowedSlots: ["weapon"], effect: "armor_break_pct", valueRange: [0.06, 0.16], description: "攻击时无视部分防御。", special: true },
  { id: "on_hit_fire", name: "灼烧", category: "special", type: "special", minRealm: "foundation", minQuality: "xuan", allowedSlots: ["weapon", "artifact"], effect: "on_hit_fire", valueRange: [0.12, 0.22], description: "命中后概率附加灼烧。", special: true },
  { id: "on_hit_thunder", name: "雷击", category: "special", type: "special", minRealm: "core", minQuality: "di", allowedSlots: ["weapon", "artifact"], effect: "on_hit_thunder", valueRange: [0.1, 0.18], description: "命中后概率追加雷击伤害。", special: true },
  { id: "double_strike", name: "连击", category: "special", type: "special", minRealm: "core", minQuality: "di", allowedSlots: ["weapon"], effect: "double_strike", valueRange: [0.08, 0.16], description: "普攻概率追加一次攻击。", special: true },
  { id: "execute_low_hp", name: "斩灭", category: "special", type: "special", minRealm: "nascent", minQuality: "tian", allowedSlots: ["weapon", "artifact"], effect: "execute_low_hp", valueRange: [0.12, 0.28], description: "目标低血量时伤害提高。", special: true },

  { id: "def_flat", name: "坚甲", category: "defense", stat: "defense", type: "flat", minRealm: "qi", minQuality: "liang", allowedSlots: ["robe", "helmet", "wrist"], description: "防御提高。" },
  { id: "def_pct", name: "磐石", category: "defense", stat: "defensePct", type: "percent", minRealm: "foundation", minQuality: "jing", allowedSlots: ["robe", "helmet"], description: "防御按比例提高。" },
  { id: "hp_flat", name: "厚血", category: "defense", stat: "maxHp", type: "flat", minRealm: "qi", minQuality: "liang", allowedSlots: ["robe", "helmet", "amulet"], description: "气血提高。" },
  { id: "hp_pct", name: "壮体", category: "defense", stat: "maxHpPct", type: "percent", minRealm: "foundation", minQuality: "jing", allowedSlots: ["robe", "helmet"], description: "气血按比例提高。" },
  { id: "damage_reduce_pct", name: "护体", category: "defense", type: "percent", minRealm: "foundation", minQuality: "ling", allowedSlots: ["robe", "artifact"], effect: "damage_reduce_pct", valueRange: [0.03, 0.1], description: "受到伤害降低。", special: true },
  { id: "start_shield", name: "灵盾", category: "special", type: "special", minRealm: "foundation", minQuality: "xuan", allowedSlots: ["robe", "amulet"], effect: "start_shield", valueRange: [0.08, 0.18], description: "战斗开始获得护盾。", special: true },
  { id: "low_hp_guard", name: "残血护体", category: "special", type: "special", minRealm: "core", minQuality: "di", allowedSlots: ["robe", "amulet"], effect: "low_hp_guard", valueRange: [0.1, 0.25], description: "气血较低时获得减伤。", special: true },
  { id: "counter_chance", name: "反震", category: "special", type: "special", minRealm: "core", minQuality: "di", allowedSlots: ["robe", "artifact"], effect: "counter_chance", valueRange: [0.08, 0.16], description: "受击时概率反击。", special: true },
  { id: "element_resist_all", name: "五行抗性", category: "defense", stat: "defensePct", type: "percent", minRealm: "core", minQuality: "ling", allowedSlots: ["robe", "amulet"], description: "五行伤害减免提高。" },
  { id: "domain_guard", name: "领域守护", category: "special", type: "special", minRealm: "nascent", minQuality: "xian", allowedSlots: ["artifact"], effect: "domain_guard", valueRange: [0.12, 0.22], description: "进入战斗后展开减伤领域。", special: true, exclusive: true },

  { id: "mp_flat", name: "聚灵", category: "resource", stat: "maxSpirit", type: "flat", minRealm: "qi", minQuality: "liang", allowedSlots: resourceSlots, description: "灵力提高。" },
  { id: "mp_pct", name: "灵海", category: "resource", stat: "maxSpiritPct", type: "percent", minRealm: "foundation", minQuality: "jing", allowedSlots: ["amulet", "artifact"], description: "灵力按比例提高。" },
  { id: "mp_recover_turn", name: "回灵", category: "resource", type: "flat", minRealm: "foundation", minQuality: "ling", allowedSlots: ["amulet", "artifact"], effect: "mp_recover_turn", valueRange: [3, 12], description: "每回合恢复灵力。", special: true },
  { id: "mp_cost_reduce", name: "节灵", category: "resource", type: "percent", minRealm: "foundation", minQuality: "xuan", allowedSlots: ["amulet", "artifact"], effect: "mp_cost_reduce", valueRange: [0.04, 0.14], description: "技能灵力消耗降低。", special: true },
  { id: "battle_end_recover", name: "战后回气", category: "resource", type: "special", minRealm: "qi", minQuality: "jing", allowedSlots: ["amulet"], effect: "battle_end_recover", valueRange: [0.06, 0.16], description: "战斗胜利后恢复气血与灵力。", special: true },
  { id: "cultivation_rate", name: "聚气", category: "resource", type: "percent", minRealm: "qi", minQuality: "ling", allowedSlots: ["amulet", "artifact"], valueRange: [0.03, 0.12], description: "修炼收益提高。" },
  { id: "breakthrough_bonus", name: "稳境", category: "resource", type: "percent", minRealm: "foundation", minQuality: "xuan", allowedSlots: ["amulet"], valueRange: [0.02, 0.08], description: "突破成功率提高。" },
  { id: "mind_value_bonus", name: "定心", category: "resource", type: "flat", minRealm: "qi", minQuality: "liang", allowedSlots: ["amulet"], valueRange: [3, 20], description: "心境值提高。" },

  { id: "speed_flat", name: "疾行", category: "speed", stat: "speed", type: "flat", minRealm: "qi", minQuality: "liang", allowedSlots: ["boots", "wrist"], description: "速度提高。" },
  { id: "speed_pct", name: "迅影", category: "speed", stat: "speedPct", type: "percent", minRealm: "foundation", minQuality: "jing", allowedSlots: ["boots"], valueRange: [0.03, 0.12], description: "速度按比例提高。" },
  { id: "dodge_rate", name: "轻身", category: "dodge", stat: "dodgeRate", type: "percent", minRealm: "qi", minQuality: "jing", allowedSlots: ["boots", "amulet"], description: "闪避率提高。" },
  { id: "initiative_bonus", name: "先机", category: "special", type: "special", minRealm: "foundation", minQuality: "ling", allowedSlots: ["boots"], effect: "initiative_bonus", valueRange: [2, 8], description: "第一回合速度提高。", special: true },
  { id: "escape_rate", name: "遁走", category: "speed", type: "special", minRealm: "qi", minQuality: "liang", allowedSlots: ["boots", "amulet"], effect: "escape_rate", valueRange: [0.05, 0.18], description: "逃跑成功率提高。", special: true },
  { id: "after_dodge_speed", name: "借势", category: "special", type: "special", minRealm: "foundation", minQuality: "xuan", allowedSlots: ["boots"], effect: "after_dodge_speed", valueRange: [2, 8], description: "闪避后速度提高 1 回合。", special: true },
  { id: "after_hit_dodge", name: "影遁", category: "special", type: "special", minRealm: "core", minQuality: "di", allowedSlots: ["boots", "artifact"], effect: "after_hit_dodge", valueRange: [0.03, 0.1], description: "受击后下一回合闪避提高。", special: true },
  { id: "perfect_dodge_proc", name: "化影", category: "special", type: "special", minRealm: "nascent", minQuality: "tian", allowedSlots: ["boots", "artifact"], effect: "perfect_dodge_proc", valueRange: [0.03, 0.08], description: "低概率完全闪避一次伤害。", special: true },

  { id: "crit_rate", name: "锐眼", category: "crit", stat: "critRate", type: "percent", minRealm: "qi", minQuality: "liang", allowedSlots: ["weapon", "ring"], description: "暴击率提高。" },
  { id: "crit_damage", name: "会心", category: "crit", stat: "critDamage", type: "percent", minRealm: "qi", minQuality: "jing", allowedSlots: ["weapon", "ring"], description: "暴击伤害提高。" },
  { id: "crit_vs_beast", name: "猎妖会心", category: "crit", type: "percent", minRealm: "qi", minQuality: "ling", allowedSlots: ["weapon", "ring"], valueRange: [0.01, 0.04], description: "对妖兽暴击率提高。" },
  { id: "crit_vs_cultivator", name: "破法会心", category: "crit", type: "percent", minRealm: "foundation", minQuality: "ling", allowedSlots: ["weapon", "ring"], valueRange: [0.01, 0.04], description: "对修士暴击率提高。" },
  { id: "crit_restore_mp", name: "会心回灵", category: "special", type: "special", minRealm: "foundation", minQuality: "xuan", allowedSlots: ["ring", "artifact"], effect: "crit_restore_mp", valueRange: [4, 16], description: "暴击后恢复灵力。", special: true },
  { id: "crit_extra_hit", name: "会心追击", category: "special", type: "special", minRealm: "core", minQuality: "di", allowedSlots: ["weapon"], effect: "crit_extra_hit", valueRange: [0.08, 0.16], description: "暴击后概率追加一次攻击。", special: true },
  { id: "crit_ignore_def", name: "会心破防", category: "special", type: "special", minRealm: "core", minQuality: "tian", allowedSlots: ["weapon", "artifact"], effect: "crit_ignore_def", valueRange: [0.1, 0.25], description: "暴击时无视部分防御。", special: true },

  { id: "spirit_sense_flat", name: "灵觉", category: "spiritSense", stat: "spiritSense", type: "flat", minRealm: "nascent", minQuality: "liang", allowedSlots: spiritSlots, description: "神识提高。" },
  { id: "spirit_sense_pct", name: "神念", category: "spiritSense", stat: "spiritSensePct", type: "percent", minRealm: "nascent", minQuality: "jing", allowedSlots: ["artifact"], description: "神识按比例提高。" },
  { id: "spell_hit_bonus", name: "神念锁定", category: "spiritSense", type: "special", minRealm: "nascent", minQuality: "ling", allowedSlots: ["artifact"], effect: "spell_hit_bonus", valueRange: [0.05, 0.15], description: "法术命中率提高。", special: true },
  { id: "ignore_dodge_pct", name: "破影", category: "spiritSense", type: "special", minRealm: "nascent", minQuality: "xuan", allowedSlots: ["artifact", "weapon"], effect: "ignore_dodge_pct", valueRange: [0.06, 0.16], description: "无视目标部分闪避率。", special: true },
  { id: "detect_hidden", name: "探灵", category: "spiritSense", stat: "spiritSense", type: "flat", minRealm: "nascent", minQuality: "ling", allowedSlots: ["amulet"], description: "探索发现隐藏事件概率提高。" },
  { id: "spirit_damage", name: "神识冲击", category: "spiritSense", stat: "skillDamagePct", type: "percent", minRealm: "nascent", minQuality: "di", allowedSlots: ["artifact"], description: "神识技能伤害提高。" },
  { id: "spirit_suppress", name: "神识压制", category: "special", type: "special", minRealm: "nascent", minQuality: "tian", allowedSlots: ["artifact"], effect: "spirit_suppress", valueRange: [0.08, 0.18], description: "神识高于目标时降低其速度和闪避。", special: true },
  { id: "soul_lock", name: "锁魂", category: "special", type: "special", minRealm: "deity", minQuality: "xian", allowedSlots: ["artifact"], effect: "soul_lock", valueRange: [0.08, 0.18], description: "命中后短时间禁止目标闪避。", special: true, exclusive: true },
  { id: "domain_sense", name: "神域感知", category: "special", type: "special", minRealm: "deity", minQuality: "shen", allowedSlots: ["artifact"], effect: "domain_skill", valueRange: [0.14, 0.28], description: "战斗开始展开神识领域。", special: true, unique: true },

  { id: "active_skill", name: "法宝共鸣", category: "special", type: "special", minRealm: "foundation", minQuality: "xuan", allowedSlots: ["artifact"], effect: "active_skill", valueRange: [0.12, 0.22], description: "装备附带一个主动法宝效果。", special: true },
  { id: "set_bonus", name: "套装共鸣", category: "special", type: "special", minRealm: "foundation", minQuality: "ling", allowedSlots: armorSlots, description: "集齐套装触发额外效果。", special: true },
  { id: "bond_pet_bonus", name: "灵宠共鸣", category: "special", type: "special", minRealm: "foundation", minQuality: "di", allowedSlots: weaponSlots, description: "灵宠属性提高。", special: true },
  { id: "companion_bonus", name: "同伴共鸣", category: "special", type: "special", minRealm: "foundation", minQuality: "di", allowedSlots: armorSlots, description: "同伴战斗属性提高。", special: true },
  { id: "sect_bonus", name: "宗门加成", category: "special", type: "special", minRealm: "qi", minQuality: "jing", allowedSlots: resourceSlots, description: "宗门任务收益提高。", special: true },
  { id: "humanity_bonus", name: "人道加成", category: "special", type: "special", minRealm: "foundation", minQuality: "ling", allowedSlots: resourceSlots, description: "人道值收益提高。", special: true },
  { id: "life_burn_power", name: "燃寿增幅", category: "special", type: "special", minRealm: "core", minQuality: "di", allowedSlots: ["weapon", "artifact"], description: "消耗寿元短时间提高伤害。", special: true },
  { id: "revive_once", name: "命灯", category: "special", type: "special", minRealm: "nascent", minQuality: "xian", allowedSlots: ["amulet", "artifact"], effect: "revive_once", valueRange: [0.2, 0.35], description: "战斗中低概率免死一次。", special: true, exclusive: true },
  { id: "domain_skill", name: "领域", category: "special", type: "special", minRealm: "nascent", minQuality: "shen", allowedSlots: ["artifact"], effect: "domain_skill", valueRange: [0.12, 0.28], description: "战斗开始展开领域效果。", special: true, unique: true },
  { id: "unique_law", name: "法则", category: "special", type: "special", minRealm: "deity", minQuality: "shen", allowedSlots: ["artifact"], effect: "unique_law", valueRange: [0.16, 0.32], description: "装备拥有唯一法则能力。", special: true, unique: true },
];

export function canAffixAppear(affix: EquipmentAffixConfig, realmTier: MajorRealmId, quality: ItemGrade, slot: EquipmentSlotId): boolean {
  return realmRank[realmTier] >= realmRank[affix.minRealm] && qualityRank[quality] >= qualityRank[affix.minQuality] && affix.allowedSlots.includes(slot);
}
