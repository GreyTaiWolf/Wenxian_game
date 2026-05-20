import { affixCategoryWeights, baseAffixStatRanges, getAffixRangeRealm, getAffixWeightRealm } from "../data/affixGenerateRules";
import { affixPools, canAffixAppear, qualityRank, realmRank, type EquipmentAffixConfig } from "../data/affixPools";
import { buildEquipmentDisplayName } from "../data/equipmentNameRules";
import { qualityGrades } from "../data/qualityGrades";
import { slotMainStatRules } from "../data/slotMainStatRules";
import { getWeaponAttackRange } from "../data/weaponAttackRanges";
import { applyBalanceLimits, isSpiritSenseEnabled, qualityCanUseSpecialAffixes } from "./equipmentBalanceLimits";
import type { AffixCategory, EquipmentBonus, EquipmentInstance, EquipmentSlotId, ItemAffix, ItemGrade, MajorRealmId, RealmPhaseId, Stats } from "../types";

export interface GenerateEquipmentParams {
  itemId: string;
  realmTier: MajorRealmId;
  realmPhase?: RealmPhaseId;
  quality: ItemGrade;
  slot: EquipmentSlotId;
  baseName: string;
  id?: string;
  createdAt?: string;
  rng?: () => number;
}

export function generateEquipment(params: GenerateEquipmentParams): EquipmentInstance {
  const rng = params.rng ?? Math.random;
  const realmPhase = params.realmPhase ?? "middle";
  const mainStats = generateMainStats(params.realmTier, realmPhase, params.quality, params.slot, rng);
  const affixes = rollAffixes(params.realmTier, params.quality, params.slot, rng);
  const affixBonuses = calculateAffixBonuses(affixes);
  const bonuses = mergeBonuses(mainStats, affixBonuses);
  const displayName = buildEquipmentDisplayName({ name: params.baseName, quality: params.quality });
  const instance: EquipmentInstance = {
    id: params.id ?? createEquipmentId(params.realmTier, params.quality, params.slot),
    itemId: params.itemId,
    name: params.baseName,
    displayName,
    realmTier: params.realmTier,
    realmPhase,
    quality: params.quality,
    slot: params.slot,
    mainStats,
    bonuses,
    powerBonus: calculateEquipmentPowerBonus(bonuses),
    affixes,
    createdAt: params.createdAt ?? new Date().toISOString(),
  };
  return applyBalanceLimits(instance);
}

export function generateMainStats(
  realmTier: MajorRealmId,
  realmPhase: RealmPhaseId,
  quality: ItemGrade,
  slot: EquipmentSlotId,
  rng: () => number = Math.random,
): EquipmentBonus {
  const weaponRange = getWeaponAttackRange(realmTier, quality, realmPhase);
  const rule = slotMainStatRules[slot];
  const stats: EquipmentBonus = {};
  Object.entries(rule).forEach(([key, rawRule]) => {
    if (key === "specialAffix" || key === "enabledRealm") {
      return;
    }
    if (rule.enabledRealm === "nascent" && !isSpiritSenseEnabled(realmTier)) {
      return;
    }
    const statKey = key as keyof Stats;
    if (Array.isArray(rawRule)) {
      const min = weaponRange[0] * rawRule[0];
      const max = weaponRange[1] * rawRule[1];
      stats[statKey] = rollStatValue(statKey, [min, max], rng);
      return;
    }
    if (rawRule === "useSpeedTable") {
      stats.speed = rollStatValue("speed", deriveSpecialMainRange("speed", realmTier, quality, 1, rng), rng);
    }
    if (rawRule === "useDodgeRateTable") {
      const slotScale = slot === "boots" ? 1 : 0.72;
      stats.dodgeRate = rollStatValue("dodgeRate", deriveSpecialMainRange("dodgeRate", realmTier, quality, slotScale, rng), rng);
    }
    if (rawRule === "useCritRateTable") {
      stats.critRate = rollStatValue("critRate", deriveSpecialMainRange("critRate", realmTier, quality, 1, rng), rng);
    }
    if (rawRule === "useSpiritSenseTable" && isSpiritSenseEnabled(realmTier)) {
      const range: [number, number] = deriveSpecialMainRange("spiritSense", realmTier, quality, 0.9, rng);
      stats.spiritSense = rollStatValue("spiritSense", range, rng);
    }
  });
  return stats;
}

function deriveSpecialMainRange(stat: keyof Stats, realmTier: MajorRealmId, quality: ItemGrade, slotScale: number, _rng: () => number): [number, number] {
  const rangeRealm = getAffixRangeRealm(realmTier);
  const baseRange = baseAffixStatRanges[rangeRealm][stat] ?? [0, 0];
  const coeff = qualityGrades[quality].affixCoeff;
  return [baseRange[0] * coeff * slotScale, baseRange[1] * coeff * slotScale];
}

function rollAffixes(realmTier: MajorRealmId, quality: ItemGrade, slot: EquipmentSlotId, rng: () => number): ItemAffix[] {
  const qualityConfig = qualityGrades[quality];
  const affixCount = randomInt(qualityConfig.affixCount[0], qualityConfig.affixCount[1], rng);
  if (affixCount <= 0) {
    return [];
  }
  const availableAffixes = affixPools.filter((affix) => {
    if (!canAffixAppear(affix, realmTier, quality, slot)) {
      return false;
    }
    if (affix.category === "spiritSense" && !isSpiritSenseEnabled(realmTier)) {
      return false;
    }
    if (affix.special && !qualityCanUseSpecialAffixes(quality) && quality !== "jing") {
      return false;
    }
    if (affix.exclusive && qualityRank[quality] < qualityRank.xian) {
      return false;
    }
    if (affix.unique && qualityRank[quality] < qualityRank.shen) {
      return false;
    }
    return true;
  });
  const picked: EquipmentAffixConfig[] = [];
  for (let index = 0; index < affixCount && picked.length < availableAffixes.length; index += 1) {
    const remaining = availableAffixes.filter((affix) => !picked.some((item) => item.id === affix.id));
    const category = pickAffixCategory(realmTier, remaining, rng);
    const categoryPool = remaining.filter((affix) => affix.category === category);
    picked.push(randomChoice(categoryPool.length ? categoryPool : remaining, rng));
  }
  const requiredSpecialCount = quality === "di" || quality === "tian" || quality === "xian" ? 1 : quality === "shen" ? 2 : 0;
  while (picked.filter((affix) => affix.special || affix.exclusive || affix.unique).length < requiredSpecialCount) {
    const candidates = availableAffixes.filter((affix) => (affix.special || affix.exclusive || affix.unique) && !picked.some((item) => item.id === affix.id));
    if (!candidates.length) {
      break;
    }
    if (picked.length >= affixCount) {
      picked.pop();
    }
    picked.push(randomChoice(candidates, rng));
  }
  return picked.map((affix) => instantiateAffix(affix, realmTier, quality, rng));
}

function pickAffixCategory(realmTier: MajorRealmId, availableAffixes: EquipmentAffixConfig[], rng: () => number): AffixCategory {
  const weights = affixCategoryWeights[getAffixWeightRealm(realmTier)];
  const categories = Object.entries(weights)
    .filter(([category, weight]) => weight > 0 && availableAffixes.some((affix) => affix.category === category))
    .map(([category, weight]) => ({ category: category as AffixCategory, weight }));
  if (!categories.length) {
    return availableAffixes[0]?.category ?? "attack";
  }
  const total = categories.reduce((sum, item) => sum + item.weight, 0);
  let cursor = rng() * total;
  for (const item of categories) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.category;
    }
  }
  return categories[0].category;
}

function instantiateAffix(config: EquipmentAffixConfig, realmTier: MajorRealmId, quality: ItemGrade, rng: () => number): ItemAffix {
  const value = rollAffixValue(config, realmTier, quality, rng);
  return {
    id: config.id,
    name: config.name,
    category: config.category,
    stat: config.stat,
    type: config.type,
    value,
    effect: config.effect,
    special: config.special,
    exclusive: config.exclusive,
    unique: config.unique,
    description: describeAffix(config, value),
  };
}

function rollAffixValue(config: EquipmentAffixConfig, realmTier: MajorRealmId, quality: ItemGrade, rng: () => number): number {
  const configuredRange = config.valueRange;
  const rangeRealm = getAffixRangeRealm(realmTier);
  const statRange = getBaseAffixStatRange(rangeRealm, config.stat);
  const range = configuredRange ?? statRange ?? [1, 1];
  const coeff = configuredRange ? 1 : qualityGrades[quality].affixCoeff;
  const raw = range[0] * coeff + (range[1] * coeff - range[0] * coeff) * rng();
  if (config.type === "percent") {
    return roundRate(raw);
  }
  if (config.type === "special") {
    return roundSpecial(raw);
  }
  return Math.max(1, Math.round(raw));
}

function calculateAffixBonuses(affixes: ItemAffix[]): EquipmentBonus {
  return affixes.reduce<EquipmentBonus>((bonuses, affix) => {
    if (!isDirectStat(affix.stat) || typeof affix.value !== "number") {
      return bonuses;
    }
    bonuses[affix.stat] = (bonuses[affix.stat] ?? 0) + affix.value;
    return bonuses;
  }, {});
}

function mergeBonuses(...sources: EquipmentBonus[]): EquipmentBonus {
  return sources.reduce<EquipmentBonus>((total, source) => {
    Object.entries(source).forEach(([key, value]) => {
      const statKey = key as keyof Stats;
      total[statKey] = (total[statKey] ?? 0) + (value ?? 0);
    });
    return total;
  }, {});
}

function calculateEquipmentPowerBonus(bonuses: EquipmentBonus): number {
  return Math.max(
    1,
    Math.round(
      (bonuses.maxHp ?? 0) * 0.08 +
        (bonuses.maxSpirit ?? 0) * 0.12 +
        (bonuses.attack ?? 0) * 1.7 +
        (bonuses.defense ?? 0) * 1.4 +
        (bonuses.speed ?? 0) * 1.1 +
        (bonuses.spiritSense ?? 0) * 1.1 +
        (bonuses.critRate ?? 0) * 80 +
        (bonuses.dodgeRate ?? 0) * 100 +
        (bonuses.critDamage ?? 0) * 60,
    ),
  );
}

function describeAffix(config: EquipmentAffixConfig, value: number): string {
  if (config.effect && config.type === "special") {
    return `${config.description}${formatAffixValue(config, value)}`;
  }
  return `${config.description}${formatAffixValue(config, value)}`;
}

function formatAffixValue(config: EquipmentAffixConfig, value: number): string {
  if (config.type === "percent" || (config.type === "special" && value < 1)) {
    return ` +${Math.round(value * 1000) / 10}%`;
  }
  if (config.stat === "critDamage") {
    return ` +${Math.round(value * 100)}%`;
  }
  return ` +${Math.round(value)}`;
}

function rollStatValue(stat: keyof Stats, range: [number, number], rng: () => number): number {
  const value = range[0] + (range[1] - range[0]) * rng();
  if (stat === "critRate" || stat === "dodgeRate" || stat === "critDamage") {
    return roundRate(value);
  }
  return Math.max(1, Math.round(value));
}

function roundRate(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function roundSpecial(value: number): number {
  return value < 1 ? roundRate(value) : Math.max(1, Math.round(value));
}

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(min + rng() * (max - min + 1));
}

function randomChoice<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)] ?? items[0];
}

function isDirectStat(stat: ItemAffix["stat"]): stat is keyof Stats {
  return Boolean(stat && ["maxHp", "maxSpirit", "attack", "defense", "spiritSense", "speed", "dodgeRate", "critRate", "critDamage"].includes(stat));
}

function getBaseAffixStatRange(rangeRealm: ReturnType<typeof getAffixRangeRealm>, stat: ItemAffix["stat"]): [number, number] | undefined {
  return isDirectStat(stat) || stat === "skillDamagePct" ? baseAffixStatRanges[rangeRealm][stat] : undefined;
}

export function createEquipmentId(realmTier: MajorRealmId, quality: ItemGrade, slot: EquipmentSlotId): string {
  const randomId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return `eq_${realmTier}_${quality}_${slot}_${randomId}`;
}

export function getRealmRequirementMultiplier(playerRealmRank: number, itemRealmRank: number): number {
  return itemRealmRank > playerRealmRank ? 0.6 : 1;
}

export function getMajorRealmRank(realmTier: MajorRealmId): number {
  return realmRank[realmTier];
}
