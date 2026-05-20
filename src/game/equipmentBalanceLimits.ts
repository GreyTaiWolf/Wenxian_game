import { affixPools, qualityRank, realmRank } from "../data/affixPools";
import { weaponAttackRanges } from "../data/weaponAttackRanges";
import type { EquipmentInstance, ItemAffix, ItemGrade, MajorRealmId, Stats } from "../types";

export const finalDodgeRateSoftCap = 0.3;
export const finalDodgeRateHardCap = 0.35;
export const critRateSoftCap = 0.35;
export const critRateHardCap = 0.5;
export const defaultCritDamage = 1.5;
export const critDamageSoftCap = 2.2;
export const critDamageHardCap = 2.5;

export function isSpiritSenseEnabled(realmTier: MajorRealmId): boolean {
  return realmRank[realmTier] >= realmRank.nascent;
}

export function applyBalanceLimits(item: EquipmentInstance): EquipmentInstance {
  const withoutInvalidSpirit = removeInvalidSpiritSenseAffixes(item);
  const speedLimited = limitSpeedAffixes(withoutInvalidSpirit);
  const dodgeLimited = limitDodgeAffixes(speedLimited);
  const critLimited = limitCritAffixes(dodgeLimited);
  const specialLimited = limitSpecialAffixes(critLimited);
  return limitLowRealmHighQuality(specialLimited);
}

function removeInvalidSpiritSenseAffixes(item: EquipmentInstance): EquipmentInstance {
  if (isSpiritSenseEnabled(item.realmTier)) {
    return item;
  }
  return {
    ...item,
    mainStats: removeStats(item.mainStats, ["spiritSense"]),
    bonuses: removeStats(item.bonuses, ["spiritSense"]),
    affixes: item.affixes.filter((affix) => affix.category !== "spiritSense" && affix.stat !== "spiritSense" && affix.stat !== "spiritSensePct"),
  };
}

function limitSpeedAffixes(item: EquipmentInstance): EquipmentInstance {
  const speedAffixes = item.affixes.filter((affix) => affix.stat === "speed" || affix.category === "speed" || affix.effect === "initiative_bonus");
  if (speedAffixes.length <= 1 || item.quality === "shen") {
    return item;
  }
  return removeAffixesAfterLimit(item, speedAffixes, 1);
}

function limitDodgeAffixes(item: EquipmentInstance): EquipmentInstance {
  const dodgeAffixes = item.affixes.filter((affix) => affix.stat === "dodgeRate" || affix.category === "dodge" || affix.effect === "perfect_dodge_proc");
  const speedAffixes = item.affixes.filter((affix) => affix.stat === "speed" || affix.category === "speed" || affix.effect === "initiative_bonus");
  const limit = item.quality === "shen" ? 3 : speedAffixes.length ? 1 : 2;
  return dodgeAffixes.length > limit ? removeAffixesAfterLimit(item, dodgeAffixes, limit) : item;
}

function limitCritAffixes(item: EquipmentInstance): EquipmentInstance {
  const critDamageLimit = item.quality === "xian" || item.quality === "shen" ? critDamageHardCap - defaultCritDamage : critDamageSoftCap - defaultCritDamage;
  return {
    ...item,
    bonuses: {
      ...item.bonuses,
      critRate: Math.min(item.bonuses.critRate ?? 0, critRateHardCap),
      critDamage: Math.min(item.bonuses.critDamage ?? 0, critDamageLimit),
    },
  };
}

function limitSpecialAffixes(item: EquipmentInstance): EquipmentInstance {
  if (item.quality === "shen") {
    return item;
  }
  const activeCountLimited = keepOneEffect(item.affixes, "active_skill");
  const domainLimited = keepOneMatching(activeCountLimited, (affix) => affix.effect === "domain_guard" || affix.effect === "domain_skill");
  const reviveLimited = keepOneEffect(domainLimited, "revive_once");
  return { ...item, affixes: reviveLimited };
}

function limitLowRealmHighQuality(item: EquipmentInstance): EquipmentInstance {
  const nextRealm = nextMajorRealm(item.realmTier);
  if (!nextRealm || !["tian", "xian", "shen"].includes(item.quality) || item.slot !== "weapon") {
    return item;
  }
  const comparisonQuality: ItemGrade = item.quality === "tian" ? "liang" : item.quality === "xian" ? "jing" : "ling";
  const cap = weaponAttackRanges[nextRealm][comparisonQuality][1];
  if ((item.bonuses.attack ?? 0) <= cap) {
    return item;
  }
  return {
    ...item,
    mainStats: { ...item.mainStats, attack: cap },
    bonuses: { ...item.bonuses, attack: cap },
  };
}

function removeStats(stats: Partial<Stats>, keys: Array<keyof Stats>): Partial<Stats> {
  const next = { ...stats };
  keys.forEach((key) => delete next[key]);
  return next;
}

function removeAffixesAfterLimit(item: EquipmentInstance, matchedAffixes: ItemAffix[], limit: number): EquipmentInstance {
  const removeIds = new Set(matchedAffixes.slice(limit).map((affix) => affix.id));
  const nextAffixes = item.affixes.filter((affix) => !removeIds.has(affix.id));
  const removedStatTotals = matchedAffixes.slice(limit).reduce<Partial<Stats>>((totals, affix) => {
    if (isStatsKey(affix.stat) && typeof affix.value === "number") {
      totals[affix.stat] = (totals[affix.stat] ?? 0) + affix.value;
    }
    return totals;
  }, {});
  return {
    ...item,
    affixes: nextAffixes,
    bonuses: subtractStats(item.bonuses, removedStatTotals),
  };
}

function subtractStats(stats: Partial<Stats>, removed: Partial<Stats>): Partial<Stats> {
  const next = { ...stats };
  Object.entries(removed).forEach(([key, value]) => {
    const statKey = key as keyof Stats;
    next[statKey] = Math.max(0, (next[statKey] ?? 0) - (value ?? 0));
  });
  return next;
}

function keepOneEffect(affixes: ItemAffix[], effect: string): ItemAffix[] {
  return keepOneMatching(affixes, (affix) => affix.effect === effect);
}

function keepOneMatching(affixes: ItemAffix[], predicate: (affix: ItemAffix) => boolean): ItemAffix[] {
  let seen = false;
  return affixes.filter((affix) => {
    if (!predicate(affix)) {
      return true;
    }
    if (seen) {
      return false;
    }
    seen = true;
    return true;
  });
}

function isStatsKey(stat: ItemAffix["stat"]): stat is keyof Stats {
  return Boolean(stat && ["maxHp", "maxSpirit", "attack", "defense", "spiritSense", "speed", "dodgeRate", "critRate", "critDamage"].includes(stat));
}

function nextMajorRealm(realmTier: MajorRealmId): MajorRealmId | null {
  const nextRank = realmRank[realmTier] + 1;
  return (Object.entries(realmRank).find(([, rank]) => rank === nextRank)?.[0] as MajorRealmId | undefined) ?? null;
}

export function capFinalStats(stats: Stats): Stats {
  return {
    ...stats,
    dodgeRate: Math.min(finalDodgeRateHardCap, Math.max(0, stats.dodgeRate)),
    critRate: Math.min(critRateHardCap, Math.max(0, stats.critRate)),
    critDamage: Math.min(critDamageHardCap, Math.max(defaultCritDamage, stats.critDamage)),
  };
}

export function qualityCanUseSpecialAffixes(quality: ItemGrade): boolean {
  return qualityRank[quality] >= qualityRank.ling;
}

export function getAffixConfig(affixId: string) {
  return affixPools.find((affix) => affix.id === affixId) ?? null;
}
