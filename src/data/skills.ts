import type { SkillConfig } from "../types";

export const cultivatorSkills: SkillConfig[] = [
  {
    id: "basic_strike",
    name: "普攻",
    category: "cultivator",
    allowedUsers: ["player", "companion", "enemyCultivator"],
    targetType: "enemySingle",
    hitType: "fullDodge",
    spiritCost: 0,
    power: 1,
    effectType: "damage",
    weight: 40,
    unlockRealm: "qi_early",
    description: "以灵力催动兵刃，造成普通伤害。",
  },
  {
    id: "qi_slash",
    name: "引气斩",
    category: "cultivator",
    allowedUsers: ["player", "companion", "enemyCultivator"],
    targetType: "enemySingle",
    hitType: "fullDodge",
    spiritCost: 6,
    power: 1.3,
    effectType: "damage",
    weight: 30,
    unlockRealm: "qi_early",
    description: "凝气为刃，攻击单个敌人。",
  },
  {
    id: "rejuvenation",
    name: "回春诀",
    category: "cultivator",
    allowedUsers: ["player", "companion"],
    targetType: "allySingle",
    hitType: "noDodge",
    spiritCost: 10,
    power: 1,
    effectType: "heal",
    weight: 18,
    unlockRealm: "qi_early",
    description: "以木行灵气回复一名队友气血。",
  },
  {
    id: "leaf_spell",
    name: "飞叶术",
    category: "cultivator",
    allowedUsers: ["companion", "enemyCultivator"],
    targetType: "enemySingle",
    hitType: "halfDodge",
    spiritCost: 7,
    power: 1.15,
    effectType: "damage",
    weight: 28,
    unlockRealm: "qi_early",
    description: "散修常用术法，伤害稳定。",
  },
];

export const beastSkills: SkillConfig[] = [
  {
    id: "bite",
    name: "撕咬",
    category: "beast",
    allowedUsers: ["pet", "beast"],
    targetType: "enemySingle",
    hitType: "fullDodge",
    spiritCost: 0,
    power: 0.9,
    effectType: "damage",
    weight: 45,
    unlockRealm: "qi_early",
    description: "灵宠和妖兽的基础攻击。",
  },
  {
    id: "pounce",
    name: "扑击",
    category: "beast",
    allowedUsers: ["pet", "beast"],
    targetType: "enemySingle",
    hitType: "fullDodge",
    spiritCost: 5,
    power: 1.2,
    effectType: "damage",
    weight: 28,
    unlockRealm: "qi_early",
    description: "蓄势跃起，攻击单个敌人。",
  },
  {
    id: "guard_master",
    name: "护主",
    category: "beast",
    allowedUsers: ["pet"],
    targetType: "allySingle",
    hitType: "noDodge",
    spiritCost: 8,
    power: 1,
    effectType: "reduceDamage",
    weight: 16,
    unlockRealm: "qi_early",
    description: "守护一名队友，使其下回合受到伤害降低。",
  },
  {
    id: "beast_roar",
    name: "兽吼",
    category: "beast",
    allowedUsers: ["beast"],
    targetType: "enemyAll",
    hitType: "noDodge",
    spiritCost: 8,
    power: 0.55,
    effectType: "damage",
    weight: 14,
    unlockRealm: "qi_early",
    description: "妖兽怒吼，攻击敌方全体并扰乱气息。",
  },
];

export const allSkills = [...cultivatorSkills, ...beastSkills];

export function getSkill(skillId: string): SkillConfig {
  return allSkills.find((skill) => skill.id === skillId) ?? cultivatorSkills[0];
}

export function getSkillsForUser(kind: SkillConfig["allowedUsers"][number], skillIds: string[]): SkillConfig[] {
  return skillIds.map(getSkill).filter((skill) => skill.allowedUsers.includes(kind));
}
