import type { MajorRealmId, RealmConfig, RealmPhaseId, Stats } from "../types";

const realmPowerCoef: Record<MajorRealmId, number> = {
  mortal: 1,
  qi_refining: 1.05,
  foundation: 1.25,
  core_formation: 1.55,
  nascent_soul: 1.95,
  spirit_transformation: 2.45,
  void_refining: 3.05,
  body_integration: 3.75,
  mahayana: 4.6,
  post_ascension: 5.6,
};

const phasePowerCoef: Record<RealmPhaseId, number> = {
  early: 1,
  middle: 1.06,
  late: 1.14,
  peak: 1.24,
};

export function calculatePower(stats: Stats, majorRealmId: MajorRealmId, phaseId: RealmPhaseId): number {
  const rawStatScore =
    stats.maxHp * 0.1 +
    stats.maxSpirit * 0.15 +
    stats.attack * 1.8 +
    stats.defense * 1.6 +
    stats.speed * 1.2 +
    90 * stats.crit * stats.critDamage +
    120 * stats.dodge +
    1.2 * stats.divineSense;

  const stageCoef = majorRealmId === "mortal" ? 1 : phasePowerCoef[phaseId];
  return Math.round(rawStatScore * realmPowerCoef[majorRealmId] * stageCoef);
}

export function calculateRealmPower(stats: Stats, realm: RealmConfig): number {
  return calculatePower(stats, realm.majorRealmId, realm.phaseId);
}
