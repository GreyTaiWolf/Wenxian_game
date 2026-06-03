import { getEnemyGroup, getEnemyTemplate } from "../data/enemies";
import { getDefaultGridCoord, getGridMapData, getLocalGridMapId, getLocalSceneGridCoord, WORLD_GRID_MAP_ID } from "../data/gridMaps";
import { formatItemName, getItem, normalizeItemId } from "../data/items";
import { getSkill } from "../data/skills";
import { getLocation, getLocationEntryScene } from "../data/world";
import type {
  CombatActor,
  CombatEquipmentSeal,
  CombatReturnContext,
  CombatState,
  CombatTimeoutResult,
  CombatType,
  EquipmentSlotId,
  GameState,
  ItemAffix,
  SkillConfig,
  Stats,
  TargetType,
  WorldState,
} from "../types";
import { chooseAiAction } from "./ai";
import { equipmentSlots, getActiveEquipmentAffixes, getEffectiveStats } from "./equipment";
import { addItems, addRewards, appendLog } from "./state";

const combatMaxRounds = 35;
const combatLogLimit = 24;
const defaultEquipmentSealRounds = 2;

interface AttackContext {
  isMainBasicAttack: boolean;
  isComboAttack?: boolean;
  isGroupAttack?: boolean;
  comboUsed?: boolean;
  elementProcMultiplier?: number;
  damageMultiplier?: number;
}

interface CombatOutcome {
  result: "victory" | "defeat" | "timeoutEscape" | "timeoutDefeat" | "timeoutVictory";
}

function toPlayerActor(game: GameState, disabledSlots: EquipmentSlotId[] = []): CombatActor {
  const stats = getEffectiveStats(game, disabledSlots);
  const affixes = getActiveEquipmentAffixes(game, disabledSlots);
  return {
    id: "ally_player",
    name: game.player.name,
    side: "ally",
    kind: "player",
    ...stats,
    baseStats: stats,
    hp: Math.max(1, Math.min(game.player.hp, stats.maxHp)),
    spirit: Math.max(0, Math.min(game.player.spirit, stats.maxSpirit)),
    skillIds: game.player.skillIds,
    combatAffixes: affixes,
    equipmentAffixes: affixes,
    equipmentSeals: [],
  };
}

function toTeamActor(member: GameState["player"]["team"][number], index: number): CombatActor {
  return {
    id: `ally_${member.id}_${index}`,
    name: member.name,
    side: "ally",
    kind: member.kind,
    ...member.stats,
    baseStats: member.stats,
    hp: member.stats.maxHp,
    spirit: member.stats.maxSpirit,
    skillIds: member.skillIds,
    combatAffixes: [],
    equipmentAffixes: [],
    equipmentSeals: [],
  };
}

function toEnemyActor(templateId: string, count: number, index: number): CombatActor {
  const template = getEnemyTemplate(templateId);
  return {
    id: `enemy_${template.id}_${index + 1}_${Math.random().toString(36).slice(2, 7)}`,
    name: count > 1 ? `${template.name}${index + 1}` : template.name,
    side: "enemy",
    kind: template.kind,
    ...template.stats,
    baseStats: template.stats,
    hp: template.stats.maxHp,
    spirit: template.stats.maxSpirit,
    skillIds: template.skillIds,
    combatAffixes: template.affixes ?? [],
    equipmentAffixes: template.affixes ?? [],
    equipmentSeals: [],
  };
}

function combatTimeoutFor(type: CombatType, configured?: CombatTimeoutResult): CombatTimeoutResult {
  if (configured) {
    return configured;
  }
  if (type === "survival") {
    return "victory";
  }
  return type === "normal" ? "escape" : "defeat";
}

function buildTurnOrder(combat: Pick<CombatState, "allies" | "enemies">): string[] {
  const tieRolls = new Map<string, number>();
  return [...combat.allies, ...combat.enemies]
    .filter((actor) => actor.hp > 0)
    .map((actor) => {
      tieRolls.set(actor.id, Math.random());
      return actor;
    })
    .sort((a, b) => {
      const speedDelta = effectiveSpeed(b) - effectiveSpeed(a);
      if (speedDelta !== 0) {
        return speedDelta;
      }
      if (a.kind === "player" && b.kind !== "player") {
        return -1;
      }
      if (b.kind === "player" && a.kind !== "player") {
        return 1;
      }
      const gradeDelta = (b.initiativeGradeRank ?? 0) - (a.initiativeGradeRank ?? 0);
      if (gradeDelta !== 0) {
        return gradeDelta;
      }
      return (tieRolls.get(b.id) ?? 0) - (tieRolls.get(a.id) ?? 0);
    })
    .map((actor) => actor.id);
}

function findActor(combat: CombatState, actorId: string): CombatActor | undefined {
  return [...combat.allies, ...combat.enemies].find((actor) => actor.id === actorId);
}

function mapActor(combat: CombatState, actorId: string, mapper: (actor: CombatActor) => CombatActor): CombatState {
  return {
    ...combat,
    allies: combat.allies.map((actor) => (actor.id === actorId ? mapper(actor) : actor)),
    enemies: combat.enemies.map((actor) => (actor.id === actorId ? mapper(actor) : actor)),
  };
}

function mapActors(combat: CombatState, mapper: (actor: CombatActor) => CombatActor): CombatState {
  return {
    ...combat,
    allies: combat.allies.map(mapper),
    enemies: combat.enemies.map(mapper),
  };
}

function getCurrentActor(combat: CombatState): CombatActor | undefined {
  return findActor(combat, combat.turnOrder[combat.turnIndex]);
}

function aliveAllies(combat: CombatState): CombatActor[] {
  return combat.allies.filter((actor) => actor.hp > 0);
}

function aliveEnemies(combat: CombatState): CombatActor[] {
  return combat.enemies.filter((actor) => actor.hp > 0);
}

function targetsFor(combat: CombatState, actor: CombatActor, targetType: TargetType, targetId?: string): CombatActor[] {
  const allies = actor.side === "ally" ? aliveAllies(combat) : aliveEnemies(combat);
  const enemies = actor.side === "ally" ? aliveEnemies(combat) : aliveAllies(combat);

  if (targetType === "self") {
    return [actor];
  }
  if (targetType === "enemyAll") {
    return enemies;
  }
  if (targetType === "allyAll") {
    return allies;
  }
  if (targetType === "enemySingle") {
    return enemies.filter((target) => target.id === targetId).slice(0, 1);
  }
  if (targetType === "allySingle") {
    return allies.filter((target) => target.id === targetId).slice(0, 1);
  }
  return [];
}

function randomEnemyTargetId(combat: CombatState, actor: CombatActor): string | undefined {
  const enemies = actor.side === "ally" ? aliveEnemies(combat) : aliveAllies(combat);
  if (!enemies.length) {
    return undefined;
  }
  return enemies[Math.floor(Math.random() * enemies.length)].id;
}

function getActorAffixes(actor: Pick<CombatActor, "combatAffixes" | "equipmentAffixes"> | undefined): ItemAffix[] {
  return actor?.combatAffixes ?? actor?.equipmentAffixes ?? [];
}

function effectiveSpeed(actor: CombatActor): number {
  return actor.speed + (actor.speedUpTurns && actor.speedUpTurns > 0 ? actor.speedUpAmount ?? 0 : 0);
}

function affixEffectValue(actor: Pick<CombatActor, "combatAffixes" | "equipmentAffixes"> | undefined, effect: NonNullable<ItemAffix["effect"]>): number {
  return getActorAffixes(actor).reduce((sum, affix) => sum + (affix.effect === effect && typeof affix.value === "number" ? affix.value : 0), 0);
}

function affixStatValue(actor: CombatActor, stat: NonNullable<ItemAffix["stat"]>): number {
  return getActorAffixes(actor).reduce((sum, affix) => sum + (affix.stat === stat && typeof affix.value === "number" ? affix.value : 0), 0);
}

function affixIdValue(actor: CombatActor, affixId: string): number {
  return getActorAffixes(actor).reduce((sum, affix) => sum + (affix.id === affixId && typeof affix.value === "number" ? affix.value : 0), 0);
}

function targetSpecificDamageBonus(actor: CombatActor, target: CombatActor): number {
  if (target.kind === "beast") {
    return affixIdValue(actor, "beast_damage_pct");
  }
  if (target.kind === "enemyCultivator") {
    return affixIdValue(actor, "cultivator_damage_pct");
  }
  return 0;
}

function targetSpecificCritBonus(actor: CombatActor, target: CombatActor): number {
  if (target.kind === "beast") {
    return affixIdValue(actor, "crit_vs_beast");
  }
  if (target.kind === "enemyCultivator") {
    return affixIdValue(actor, "crit_vs_cultivator");
  }
  return 0;
}

function getEffectiveDodgeRate(actor: CombatActor, target: CombatActor, skill: SkillConfig): number {
  if (skill.hitType === "noDodge" || target.soulLockedTurns) {
    return 0;
  }
  let dodge = target.dodgeRate + (target.dodgeUpTurns && target.dodgeUpTurns > 0 ? target.dodgeUpAmount ?? 0 : 0);
  if (actor.spiritSense > target.spiritSense) {
    dodge *= Math.max(0.3, 1 - affixEffectValue(actor, "spirit_suppress"));
  }
  dodge = Math.max(0, dodge - affixEffectValue(actor, "ignore_dodge_pct") - affixEffectValue(actor, "spell_hit_bonus"));
  return skill.hitType === "halfDodge" ? dodge * 0.5 : dodge;
}

function actorAttack(actor: CombatActor): number {
  return actor.attack * (actor.attackDownTurns && actor.attackDownTurns > 0 ? 0.85 : 1);
}

export function getSkillSpiritCost(actor: Pick<CombatActor, "combatAffixes" | "equipmentAffixes"> | undefined, skill: SkillConfig): number {
  const reduction = Math.min(0.6, affixEffectValue(actor, "mp_cost_reduce"));
  return Math.max(0, Math.floor(skill.spiritCost * (1 - reduction)));
}

function isBasicSkill(skillId: string): boolean {
  return skillId === "basic_strike" || skillId === "bite";
}

function getFallbackBasicSkillId(actor: CombatActor): string {
  return actor.kind === "beast" || actor.kind === "pet" ? "bite" : "basic_strike";
}

export function canUseBasicAttack(actor: CombatActor | undefined): boolean {
  return Boolean(actor && (actor.basicAttackDisabledActions ?? 0) <= 0);
}

export function canUseCombatSkill(actor: CombatActor | undefined, skill: SkillConfig | null): boolean {
  if (!actor || !skill) {
    return false;
  }
  if (isBasicSkill(skill.id)) {
    return canUseBasicAttack(actor);
  }
  return (actor.skillDisabledActions ?? 0) <= 0 && actor.spirit >= getSkillSpiritCost(actor, skill);
}

export function canUsePillAction(actor: CombatActor | undefined): boolean {
  return Boolean(actor && (actor.pillDisabledActions ?? 0) <= 0);
}

function canUseArtifactActorAction(actor: CombatActor | undefined): boolean {
  return Boolean(
    actor &&
      (actor.artifactDisabledActions ?? 0) <= 0 &&
      (affixEffectValue(actor, "active_skill") || affixEffectValue(actor, "domain_skill") || affixEffectValue(actor, "unique_law")),
  );
}

function combatWarmupDamageBonus(round: number): number {
  if (round < 15) {
    return 0;
  }
  return Math.min(0.4, 0.05 + Math.floor((round - 15) / 3) * 0.05);
}

function computeDamage(actor: CombatActor, target: CombatActor, skill: SkillConfig, combat: CombatState, context: AttackContext): { damage: number; critical: boolean } {
  const defenseFactor = isBasicSkill(skill.id) ? 0.45 : 0.35;
  const armorBreak = affixEffectValue(actor, "armor_break_pct") + (affixEffectValue(actor, "crit_ignore_def") > 0 ? 0 : 0);
  const targetDefense = target.defense * Math.max(0.15, 1 - armorBreak);
  let damage = Math.max(1, Math.floor(actorAttack(actor) * skill.power - targetDefense * defenseFactor));
  const basicBonus = context.isMainBasicAttack ? affixEffectValue(actor, "basic_attack_damage_pct") : 0;
  damage = Math.floor(damage * (1 + basicBonus + affixStatValue(actor, "skillDamagePct") + targetSpecificDamageBonus(actor, target)));
  const critical = Math.random() <= Math.min(0.95, actor.critRate + targetSpecificCritBonus(actor, target));
  if (critical) {
    damage = Math.floor(damage * actor.critDamage);
    damage = Math.floor(damage * (1 + affixEffectValue(actor, "crit_ignore_def")));
  }
  if (target.hp / target.maxHp <= 0.3) {
    damage = Math.floor(damage * (1 + affixEffectValue(actor, "execute_low_hp")));
  }
  if (target.defending) {
    damage = Math.floor(damage * 0.5);
  }
  if (target.guardedTurns && target.guardedTurns > 0) {
    damage = Math.floor(damage * 0.65);
  }
  damage = Math.floor(damage * (1 + combatWarmupDamageBonus(combat.round)));
  damage = Math.floor(damage * (context.damageMultiplier ?? 1));
  const reduce = Math.min(0.75, (target.damageReducePct ?? 0) + affixEffectValue(target, "damage_reduce_pct") + (target.hp / target.maxHp <= 0.3 ? affixEffectValue(target, "low_hp_guard") : 0));
  return { damage: Math.max(1, Math.floor(damage * (1 - reduce))), critical };
}

function applyDamageToActor(combat: CombatState, targetId: string, damage: number): { combat: CombatState; absorbed: number; hpDamage: number } {
  let absorbed = 0;
  let hpDamage = 0;
  const nextCombat = mapActor(combat, targetId, (victim) => {
    const shield = victim.shield ?? 0;
    absorbed = Math.min(shield, damage);
    hpDamage = Math.max(0, damage - absorbed);
    return {
      ...victim,
      hp: Math.max(0, victim.hp - hpDamage),
      shield: Math.max(0, shield - absorbed),
      defending: false,
      guardedTurns: Math.max(0, (victim.guardedTurns ?? 0) - 1),
    };
  });
  return { combat: nextCombat, absorbed, hpDamage };
}

function durationFromAffixValue(value: number, fallback = 1): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return Math.max(1, Math.floor(value));
  }
  return Math.random() < value ? fallback : 0;
}

function applyDisableOnHit(combat: CombatState, actor: CombatActor, target: CombatActor): { combat: CombatState; logs: string[] } {
  let nextCombat = combat;
  const logs: string[] = [];
  const disableBasic = durationFromAffixValue(affixEffectValue(actor, "disable_basic_attack"));
  const disableSkill = durationFromAffixValue(affixEffectValue(actor, "disable_skill"));
  if (disableBasic > 0 || disableSkill > 0) {
    nextCombat = mapActor(nextCombat, target.id, (victim) => ({
      ...victim,
      basicAttackDisabledActions: Math.max(victim.basicAttackDisabledActions ?? 0, disableBasic),
      skillDisabledActions: Math.max(victim.skillDisabledActions ?? 0, disableSkill),
    }));
    if (disableBasic > 0) {
      logs.push(`${target.name} 被压制，禁普攻 ${disableBasic} 次行动。`);
    }
    if (disableSkill > 0) {
      logs.push(`${target.name} 灵机受阻，禁技能 ${disableSkill} 次行动。`);
    }
  }
  return { combat: nextCombat, logs };
}

function applyReviveIfNeeded(combat: CombatState): { combat: CombatState; logs: string[] } {
  const logs: string[] = [];
  const reviveActor = (actor: CombatActor): CombatActor => {
    if (actor.hp > 0 || !actor.reviveReady || (actor.reviveDisabledActions ?? 0) > 0 || Math.random() > affixEffectValue(actor, "revive_once")) {
      return actor;
    }
    logs.push(`${actor.name} 命灯亮起，气血回到 ${Math.max(1, Math.floor(actor.maxHp * 0.18))}。`);
    return {
      ...actor,
      hp: Math.max(1, Math.floor(actor.maxHp * 0.18)),
      reviveReady: false,
    };
  };
  return {
    combat: {
      ...combat,
      allies: combat.allies.map(reviveActor),
      enemies: combat.enemies.map(reviveActor),
    },
    logs,
  };
}

function resolveAttack(combat: CombatState, actor: CombatActor, target: CombatActor, skill: SkillConfig, context: AttackContext): { combat: CombatState; logs: string[]; comboUsed: boolean } {
  const currentTarget = findActor(combat, target.id);
  const currentActor = findActor(combat, actor.id);
  if (!currentTarget || !currentActor || currentActor.hp <= 0 || currentTarget.hp <= 0) {
    return { combat, logs: [], comboUsed: Boolean(context.comboUsed) };
  }

  const dodgeChance = getEffectiveDodgeRate(currentActor, currentTarget, skill);
  const perfectDodge = Math.random() < affixEffectValue(currentTarget, "perfect_dodge_proc");
  if (perfectDodge || Math.random() <= dodgeChance) {
    const dodgedCombat = mapActor(combat, currentTarget.id, (victim) => ({
      ...victim,
      speedUpTurns: affixEffectValue(victim, "after_dodge_speed") ? 1 : victim.speedUpTurns,
      speedUpAmount: Math.max(victim.speedUpAmount ?? 0, affixEffectValue(victim, "after_dodge_speed")),
    }));
    return { combat: dodgedCombat, logs: [`${currentTarget.name} 身形一晃，避开了 ${skill.name}。`], comboUsed: Boolean(context.comboUsed) };
  }

  const { damage, critical } = computeDamage(currentActor, currentTarget, skill, combat, context);
  let damageResult = applyDamageToActor(combat, currentTarget.id, damage);
  let nextCombat = damageResult.combat;
  const logs: string[] = [
    `${currentActor.name} ${context.isComboAttack ? "连击" : context.isGroupAttack ? "横扫" : "施展"} ${skill.name}，对 ${currentTarget.name} 造成 ${damage} 伤害${critical ? "，触发会心" : ""}。`,
  ];
  if (damageResult.absorbed > 0) {
    logs.push(`${currentTarget.name} 护盾吸收 ${damageResult.absorbed} 伤害，剩余护盾 ${findActor(nextCombat, currentTarget.id)?.shield ?? 0}。`);
  }

  const elementMultiplier = context.elementProcMultiplier ?? 1;
  const actorAfterHit = findActor(nextCombat, currentActor.id) ?? currentActor;
  const targetAfterHit = findActor(nextCombat, currentTarget.id) ?? currentTarget;
  if (Math.random() < affixEffectValue(actorAfterHit, "on_hit_fire") * elementMultiplier) {
    nextCombat = mapActor(nextCombat, targetAfterHit.id, (victim) => ({
      ...victim,
      burnTurns: 2,
      burnDamage: Math.max(victim.burnDamage ?? 0, Math.floor(actorAfterHit.attack * 0.18)),
    }));
    logs.push(`${targetAfterHit.name} 被灼烧缠身。`);
  }
  if (Math.random() < affixEffectValue(actorAfterHit, "on_hit_thunder") * elementMultiplier) {
    const thunderDamage = Math.max(1, Math.floor(actorAfterHit.attack * 0.35 * (1 + combatWarmupDamageBonus(combat.round))));
    damageResult = applyDamageToActor(nextCombat, targetAfterHit.id, thunderDamage);
    nextCombat = damageResult.combat;
    logs.push(`雷光炸开，追加 ${thunderDamage} 伤害。`);
  }

  const disabled = applyDisableOnHit(nextCombat, actorAfterHit, targetAfterHit);
  nextCombat = disabled.combat;
  logs.push(...disabled.logs);

  const groupChance = context.isMainBasicAttack && !context.isComboAttack && !context.isGroupAttack ? affixEffectValue(actorAfterHit, "group_attack") : 0;
  if (groupChance > 0 && Math.random() < groupChance) {
    const enemies = actorAfterHit.side === "ally" ? aliveEnemies(nextCombat) : aliveAllies(nextCombat);
    const groupTargets = enemies.filter((candidate) => candidate.id !== targetAfterHit.id);
    if (groupTargets.length > 0) {
      logs.push(`${actorAfterHit.name} 触发群攻，灵势扫向其余目标。`);
      groupTargets.forEach((groupTarget) => {
        const resolved = resolveAttack(nextCombat, actorAfterHit, groupTarget, skill, {
          isMainBasicAttack: false,
          isGroupAttack: true,
          comboUsed: true,
          elementProcMultiplier: 0.5,
          damageMultiplier: 0.55,
        });
        nextCombat = resolved.combat;
        logs.push(...resolved.logs);
      });
    }
  }

  let comboUsed = Boolean(context.comboUsed);
  const refreshedActor = findActor(nextCombat, actorAfterHit.id) ?? actorAfterHit;
  const refreshedTarget = findActor(nextCombat, targetAfterHit.id);
  const comboChance = context.isMainBasicAttack && !context.isComboAttack && !context.isGroupAttack ? Math.max(affixEffectValue(refreshedActor, "double_strike"), critical ? affixEffectValue(refreshedActor, "crit_extra_hit") : 0) : 0;
  if (!comboUsed && comboChance > 0 && refreshedTarget && refreshedTarget.hp > 0 && Math.random() < comboChance) {
    logs.push(`${refreshedActor.name} 触发连击，追加一式。`);
    const resolved = resolveAttack(nextCombat, refreshedActor, refreshedTarget, skill, {
      isMainBasicAttack: false,
      isComboAttack: true,
      comboUsed: true,
      elementProcMultiplier: 1,
      damageMultiplier: 0.55,
    });
    nextCombat = resolved.combat;
    logs.push(...resolved.logs);
    comboUsed = true;
  }

  const executeActor = findActor(nextCombat, currentActor.id) ?? currentActor;
  const executeTarget = findActor(nextCombat, currentTarget.id);
  const executeValue = affixEffectValue(executeActor, "execute_low_hp");
  if (executeTarget && executeTarget.hp > 0 && executeTarget.hp / executeTarget.maxHp <= 0.18 && executeValue > 0) {
    const executeDamage = Math.max(1, Math.floor(executeActor.attack * executeValue));
    damageResult = applyDamageToActor(nextCombat, executeTarget.id, executeDamage);
    nextCombat = damageResult.combat;
    logs.push(`${executeActor.name} 斩杀词条触发，追加 ${executeDamage} 伤害。`);
  }

  const revived = applyReviveIfNeeded(nextCombat);
  nextCombat = revived.combat;
  logs.push(...revived.logs);
  return { combat: nextCombat, logs, comboUsed };
}

function applySkill(combat: CombatState, actorId: string, skillId: string, targetId?: string): CombatState {
  const actor = findActor(combat, actorId);
  const skill = getSkill(skillId);
  if (!actor || actor.hp <= 0) {
    return combat;
  }
  if (isBasicSkill(skill.id) && !canUseBasicAttack(actor)) {
    return applyDefendAction(combat, actor.id, `${actor.name} 被禁普攻压制，转入防御。`);
  }
  if (!isBasicSkill(skill.id) && (actor.skillDisabledActions ?? 0) > 0) {
    return canUseBasicAttack(actor) ? applySkill(combat, actor.id, getFallbackBasicSkillId(actor), targetId) : applyDefendAction(combat, actor.id, `${actor.name} 技能被禁，只能稳住气息。`);
  }
  const spiritCost = getSkillSpiritCost(actor, skill);
  if (actor.spirit < spiritCost) {
    return canUseBasicAttack(actor) ? applySkill(combat, actor.id, getFallbackBasicSkillId(actor), targetId) : applyDefendAction(combat, actor.id, `${actor.name} 灵力不足且普攻受禁，转入防御。`);
  }
  const resolvedTargetId = skill.targetType === "enemySingle" ? targetId ?? randomEnemyTargetId(combat, actor) : targetId;
  const targets = targetsFor(combat, actor, skill.targetType, resolvedTargetId);
  if (!targets.length) {
    return appendCombatLogs(combat, [`${actor.name} 的 ${skill.name} 未找到目标。`]);
  }

  let nextCombat = mapActor(combat, actor.id, (current) => ({
    ...current,
    spirit: Math.max(0, current.spirit - spiritCost),
  }));
  const logLines: string[] = [];
  let comboUsed = false;

  targets.forEach((target) => {
    const currentActor = findActor(nextCombat, actor.id);
    if (!currentActor || currentActor.hp <= 0) {
      return;
    }
    if (skill.effectType === "damage") {
      const resolved = resolveAttack(nextCombat, currentActor, target, skill, {
        isMainBasicAttack: isBasicSkill(skill.id),
        comboUsed,
        elementProcMultiplier: 1,
      });
      nextCombat = resolved.combat;
      comboUsed = comboUsed || resolved.comboUsed;
      logLines.push(...resolved.logs);
      return;
    }
    if (skill.effectType === "heal") {
      const heal = Math.max(12, Math.floor(28 + currentActor.spiritSense * 0.6));
      nextCombat = mapActor(nextCombat, target.id, (ally) => ({
        ...ally,
        hp: Math.min(ally.maxHp, ally.hp + heal),
      }));
      logLines.push(`${currentActor.name} 施展 ${skill.name}，为 ${target.name} 回复 ${heal} 气血。`);
      return;
    }
    if (skill.effectType === "reduceDamage") {
      nextCombat = mapActor(nextCombat, target.id, (ally) => ({
        ...ally,
        guardedTurns: 1,
      }));
      logLines.push(`${currentActor.name} 施展 ${skill.name}，守护 ${target.name}。`);
      return;
    }
    if (skill.effectType === "restoreSpirit") {
      const restore = Math.max(5, Math.floor(10 + currentActor.spiritSense * 0.3));
      nextCombat = mapActor(nextCombat, target.id, (ally) => ({
        ...ally,
        spirit: Math.min(ally.maxSpirit, ally.spirit + restore),
      }));
      logLines.push(`${currentActor.name} 施展 ${skill.name}，为 ${target.name} 回复 ${restore} 灵力。`);
    }
  });

  return appendCombatLogs(nextCombat, logLines);
}

function applyDefendAction(combat: CombatState, actorId: string, logLine: string): CombatState {
  const actor = findActor(combat, actorId);
  if (!actor) {
    return combat;
  }
  const guarded = mapActor(combat, actor.id, (current) => ({ ...current, defending: true }));
  return appendCombatLogs(guarded, [logLine]);
}

function appendCombatLogs(combat: CombatState, logs: string[]): CombatState {
  return logs.length ? { ...combat, logs: [...logs, ...combat.logs].slice(0, combatLogLimit) } : combat;
}

function ensureRoundStarted(combat: CombatState): CombatState {
  if (combat.round <= 0 || combat.lastRoundStarted === combat.round) {
    return combat;
  }
  const warmup = combatWarmupDamageBonus(combat.round);
  const logs = [`第 ${combat.round} / ${combat.maxRounds} 回合开始。`];
  if (warmup > 0) {
    logs.push(`战意升温，双方造成伤害 +${Math.round(warmup * 100)}%。`);
  }
  return appendCombatLogs({ ...combat, lastRoundStarted: combat.round }, logs);
}

function applyTurnStart(combat: CombatState, actorId: string): CombatState {
  const actor = findActor(combat, actorId);
  if (!actor || actor.hp <= 0) {
    return combat;
  }
  let nextCombat = combat;
  const logs: string[] = [];
  if (actor.burnTurns && actor.burnTurns > 0 && actor.burnDamage && actor.burnDamage > 0) {
    nextCombat = mapActor(nextCombat, actor.id, (current) => ({
      ...current,
      hp: Math.max(0, current.hp - (current.burnDamage ?? 0)),
      burnTurns: Math.max(0, (current.burnTurns ?? 0) - 1),
    }));
    logs.push(`${actor.name} 受灼烧侵蚀，气血 -${actor.burnDamage}。`);
  }
  if (actor.poisonTurns && actor.poisonTurns > 0 && actor.poisonDamage && actor.poisonDamage > 0) {
    nextCombat = mapActor(nextCombat, actor.id, (current) => ({
      ...current,
      hp: Math.max(0, current.hp - (current.poisonDamage ?? 0)),
      poisonTurns: Math.max(0, (current.poisonTurns ?? 0) - 1),
    }));
    logs.push(`${actor.name} 毒性发作，气血 -${actor.poisonDamage}。`);
  }
  const currentActor = findActor(nextCombat, actor.id) ?? actor;
  const mpRecover = affixEffectValue(currentActor, "mp_recover_turn");
  if (mpRecover > 0) {
    nextCombat = mapActor(nextCombat, actor.id, (current) => ({
      ...current,
      spirit: Math.min(current.maxSpirit, current.spirit + mpRecover),
    }));
    logs.push(`${actor.name} 回灵词条触发，灵力 +${mpRecover}。`);
  }
  return appendCombatLogs(nextCombat, logs);
}

function decrementActionCounters(actor: CombatActor): CombatActor {
  return {
    ...actor,
    defending: false,
    basicAttackDisabledActions: Math.max(0, (actor.basicAttackDisabledActions ?? 0) - 1),
    skillDisabledActions: Math.max(0, (actor.skillDisabledActions ?? 0) - 1),
    artifactDisabledActions: Math.max(0, (actor.artifactDisabledActions ?? 0) - 1),
    pillDisabledActions: Math.max(0, (actor.pillDisabledActions ?? 0) - 1),
    reviveDisabledActions: Math.max(0, (actor.reviveDisabledActions ?? 0) - 1),
    attackDownTurns: Math.max(0, (actor.attackDownTurns ?? 0) - 1),
    speedUpTurns: Math.max(0, (actor.speedUpTurns ?? 0) - 1),
    dodgeUpTurns: Math.max(0, (actor.dodgeUpTurns ?? 0) - 1),
    soulLockedTurns: Math.max(0, (actor.soulLockedTurns ?? 0) - 1),
  };
}

function getDisabledSlots(actor: CombatActor): EquipmentSlotId[] {
  return (actor.equipmentSeals ?? []).filter((seal) => seal.remainingRounds > 0).map((seal) => seal.slotId);
}

function recalculatePlayerActorFromEquipment(game: GameState, actor: CombatActor): CombatActor {
  if (actor.kind !== "player") {
    return actor;
  }
  const disabledSlots = getDisabledSlots(actor);
  const stats = getEffectiveStats(game, disabledSlots);
  const affixes = getActiveEquipmentAffixes(game, disabledSlots);
  return {
    ...actor,
    ...stats,
    baseStats: stats,
    hp: Math.min(actor.hp, stats.maxHp),
    spirit: Math.min(actor.spirit, stats.maxSpirit),
    combatAffixes: affixes,
    equipmentAffixes: affixes,
  };
}

function finishRound(game: GameState, combat: CombatState): CombatState {
  const logs: string[] = [];
  const decremented = mapActors(combat, (actor) => {
    if (!actor.equipmentSeals?.length) {
      return actor;
    }
    const nextSeals = actor.equipmentSeals
      .map((seal) => ({ ...seal, remainingRounds: Math.max(0, seal.remainingRounds - 1) }))
      .filter((seal) => seal.remainingRounds > 0);
    const expired = actor.equipmentSeals.filter((seal) => seal.remainingRounds > 0 && !nextSeals.some((nextSeal) => nextSeal.slotId === seal.slotId));
    expired.forEach((seal) => logs.push(`${actor.name} 的封器状态结束：${seal.label}恢复。`));
    return {
      ...actor,
      equipmentSeals: nextSeals,
    };
  });
  const recalculated = mapActors(decremented, (actor) => recalculatePlayerActorFromEquipment(game, actor));
  return appendCombatLogs(recalculated, logs);
}

function advanceTurn(game: GameState, combat: CombatState, actedActorId?: string): CombatState {
  let nextCombat = actedActorId ? mapActor(combat, actedActorId, decrementActionCounters) : combat;
  let nextIndex = nextCombat.turnIndex + 1;
  let nextRound = nextCombat.round;
  let nextOrder = nextCombat.turnOrder;

  if (nextIndex >= nextOrder.length) {
    nextCombat = finishRound(game, nextCombat);
    nextRound += 1;
    nextOrder = buildTurnOrder(nextCombat);
    nextIndex = 0;
  }

  return {
    ...nextCombat,
    turnIndex: nextIndex,
    turnOrder: nextOrder,
    round: nextRound,
  };
}

function battleOutcome(combat: CombatState): CombatOutcome | null {
  if (aliveEnemies(combat).length === 0) {
    return { result: "victory" };
  }
  if (aliveAllies(combat).length === 0) {
    return { result: "defeat" };
  }
  if (combat.round > combat.maxRounds) {
    if (combat.timeoutResult === "victory") {
      return { result: "timeoutVictory" };
    }
    if (combat.timeoutResult === "defeat") {
      return { result: "timeoutDefeat" };
    }
    return { result: "timeoutEscape" };
  }
  return null;
}

function runAiTurn(game: GameState, combat: CombatState): CombatState {
  const prepared = applyTurnStart(combat, combat.turnOrder[combat.turnIndex]);
  const actor = getCurrentActor(prepared);
  if (!actor || actor.hp <= 0) {
    return advanceTurn(game, prepared);
  }
  const choice = chooseAiAction(actor, prepared);
  const acted = applySkill(prepared, actor.id, choice.skillId, choice.targetId);
  return advanceTurn(game, acted, actor.id);
}

function getValidSceneId(regionId: string, locationId: string, sceneId: string): string {
  const location = getLocation(regionId, locationId);
  return location.scenes.some((scene) => scene.id === sceneId) ? sceneId : getLocationEntryScene(location).id;
}

function getValidActiveMapId(locationId: string, activeMapId: string): string {
  if (getGridMapData(activeMapId)) {
    return activeMapId;
  }
  return getLocalGridMapId(locationId) ?? WORLD_GRID_MAP_ID;
}

function createCombatReturnContext(game: GameState): CombatReturnContext {
  const location = getLocation(game.world.regionId, game.world.locationId);
  const sceneId = getValidSceneId(game.world.regionId, location.id, game.world.sceneId);
  const activeMapId = getValidActiveMapId(location.id, game.world.navigation.activeMapId);
  const position = game.world.navigation.positions[activeMapId] ?? getDefaultGridCoord(activeMapId);
  return {
    regionId: game.world.regionId,
    locationId: location.id,
    sceneId,
    activeMapId,
    position: { ...position },
  };
}

function restoreCombatReturnContext(game: GameState, combat: CombatState): GameState {
  const context = combat.returnContext;
  if (!context) {
    return game;
  }
  const location = getLocation(context.regionId, context.locationId);
  const sceneId = getValidSceneId(context.regionId, location.id, context.sceneId);
  const activeMapId = getValidActiveMapId(location.id, context.activeMapId);
  const position = context.position ?? game.world.navigation.positions[activeMapId] ?? getDefaultGridCoord(activeMapId);
  return {
    ...game,
    world: {
      ...game.world,
      regionId: context.regionId,
      locationId: location.id,
      sceneId,
      navigation: {
        ...game.world.navigation,
        activeMapId,
        positions: {
          ...game.world.navigation.positions,
          [activeMapId]: { ...position },
        },
      },
    },
  };
}

function getDefeatReturnWorld(world: WorldState): WorldState {
  const town = getLocation(world.regionId, world.lastTownId);
  const entryScene = getLocationEntryScene(town);
  const activeMapId = getLocalGridMapId(town.id) ?? WORLD_GRID_MAP_ID;
  const position = getLocalSceneGridCoord(town.id, entryScene.id) ?? getDefaultGridCoord(activeMapId);
  return {
    ...world,
    locationId: town.id,
    sceneId: entryScene.id,
    navigation: {
      ...world.navigation,
      activeMapId,
      positions: {
        ...world.navigation.positions,
        [activeMapId]: { ...position },
      },
    },
  };
}

function settleCombat(game: GameState, combat: CombatState): GameState {
  const outcome = battleOutcome(combat);
  if (!outcome) {
    return { ...game, combat };
  }
  if (outcome.result === "victory" || outcome.result === "timeoutVictory") {
    const returned = restoreCombatReturnContext(game, combat);
    const rewarded = addRewards({ ...returned, combat: undefined }, combat.rewards);
    const recovered = applyBattleEndRecover(rewarded, combat);
    const message =
      outcome.result === "timeoutVictory"
        ? `坚持到 ${combat.maxRounds} 回合，生存挑战完成：修为 +${combat.rewards.cultivation}，灵石 +${combat.rewards.spiritStones}。`
        : `战斗胜利：修为 +${combat.rewards.cultivation}，灵石 +${combat.rewards.spiritStones}。`;
    return appendLog({ ...recovered, combat: undefined }, message);
  }
  if (outcome.result === "timeoutEscape") {
    const returned = restoreCombatReturnContext(game, combat);
    return appendLog({ ...returned, combat: undefined }, `战至 ${combat.maxRounds} 回合仍未分胜负，你寻隙脱战。本场无奖励。`);
  }
  return appendLog(
    {
      ...game,
      combat: undefined,
      world: getDefeatReturnWorld(game.world),
    },
    outcome.result === "timeoutDefeat" ? `超过 ${combat.maxRounds} 回合仍未取胜，挑战失败。本场奖励未获得。` : "队伍气血耗尽，你退回最近城镇调息。本场奖励未获得。",
  );
}

function applyBattleEndRecover(game: GameState, combat: CombatState): GameState {
  const playerActor = combat.allies.find((actor) => actor.kind === "player");
  const recoverPct = playerActor ? affixEffectValue(playerActor, "battle_end_recover") : 0;
  if (!playerActor || recoverPct <= 0) {
    return game;
  }
  return {
    ...game,
    player: {
      ...game.player,
      hp: Math.min(playerActor.maxHp, Math.max(game.player.hp, playerActor.hp) + Math.floor(playerActor.maxHp * recoverPct)),
      spirit: Math.min(playerActor.maxSpirit, Math.max(game.player.spirit, playerActor.spirit) + Math.floor(playerActor.maxSpirit * recoverPct)),
    },
  };
}

function advanceUntilPlayer(game: GameState, combat: CombatState): GameState {
  let nextCombat = combat.turnOrder.length ? combat : { ...combat, turnOrder: buildTurnOrder(combat), turnIndex: 0 };
  for (let guard = 0; guard < 160; guard += 1) {
    nextCombat = ensureRoundStarted(nextCombat);
    const outcome = battleOutcome(nextCombat);
    if (outcome) {
      return settleCombat(game, nextCombat);
    }
    const actor = getCurrentActor(nextCombat);
    if (actor?.kind === "player" && actor.hp > 0) {
      return { ...game, combat: nextCombat };
    }
    nextCombat = runAiTurn(game, nextCombat);
  }
  return { ...game, combat: nextCombat };
}

function opposingActors(combat: CombatState, actor: CombatActor): CombatActor[] {
  return actor.side === "ally" ? combat.enemies : combat.allies;
}

function applyOpeningDisables(combat: CombatState): { combat: CombatState; logs: string[] } {
  let nextCombat = combat;
  const logs: string[] = [];
  [...combat.allies, ...combat.enemies].forEach((actor) => {
    const basicTurns = durationFromAffixValue(affixEffectValue(actor, "disable_basic_attack"));
    const skillTurns = durationFromAffixValue(affixEffectValue(actor, "disable_skill"));
    const artifactTurns = durationFromAffixValue(affixEffectValue(actor, "disable_artifact"));
    const pillTurns = durationFromAffixValue(affixEffectValue(actor, "disable_pill"));
    const reviveTurns = durationFromAffixValue(affixEffectValue(actor, "disable_revive"));
    if (!basicTurns && !skillTurns && !artifactTurns && !pillTurns && !reviveTurns) {
      return;
    }
    opposingActors(nextCombat, actor).forEach((target) => {
      nextCombat = mapActor(nextCombat, target.id, (victim) => ({
        ...victim,
        basicAttackDisabledActions: Math.max(victim.basicAttackDisabledActions ?? 0, basicTurns),
        skillDisabledActions: Math.max(victim.skillDisabledActions ?? 0, skillTurns),
        artifactDisabledActions: Math.max(victim.artifactDisabledActions ?? 0, artifactTurns),
        pillDisabledActions: Math.max(victim.pillDisabledActions ?? 0, pillTurns),
        reviveDisabledActions: Math.max(victim.reviveDisabledActions ?? 0, reviveTurns),
      }));
      if (basicTurns > 0) {
        logs.push(`${actor.name} 的禁止词条触发，${target.name} 禁普攻 ${basicTurns} 次行动。`);
      }
    });
  });
  return { combat: nextCombat, logs };
}

function randomEquippedSlot(game: GameState, actor: CombatActor): CombatEquipmentSeal | null {
  const sealed = new Set(getDisabledSlots(actor));
  const candidates = equipmentSlots.filter((slot) => game.inventory.equipment[slot.id] && !sealed.has(slot.id));
  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  return picked ? { slotId: picked.id, label: picked.label, remainingRounds: defaultEquipmentSealRounds } : null;
}

function applyOpeningEquipmentSeals(game: GameState, combat: CombatState): { combat: CombatState; logs: string[] } {
  let nextCombat = combat;
  const logs: string[] = [];
  [...combat.allies, ...combat.enemies].forEach((actor) => {
    const sealValue = affixEffectValue(actor, "seal_random_equipment");
    if (sealValue <= 0) {
      return;
    }
    opposingActors(nextCombat, actor)
      .filter((target) => target.kind === "player")
      .forEach((target) => {
        const seal = randomEquippedSlot(game, target);
        if (!seal) {
          return;
        }
        nextCombat = mapActor(nextCombat, target.id, (victim) =>
          recalculatePlayerActorFromEquipment(game, {
            ...victim,
            equipmentSeals: [...(victim.equipmentSeals ?? []), seal],
          }),
        );
        logs.push(`${actor.name} 的破坏词条触发，封器：${seal.label} ${seal.remainingRounds} 回合。`);
      });
  });
  return { combat: nextCombat, logs };
}

function applyOpeningAffixes(combat: CombatState): { combat: CombatState; logs: string[] } {
  let nextCombat = combat;
  const logs: string[] = [];
  [...combat.allies, ...combat.enemies].forEach((actor) => {
    const currentActor = findActor(nextCombat, actor.id);
    if (!currentActor || !getActorAffixes(currentActor).length) {
      return;
    }
    const shieldPct = affixEffectValue(currentActor, "start_shield");
    if (shieldPct > 0) {
      nextCombat = mapActor(nextCombat, currentActor.id, (target) => ({
        ...target,
        shield: Math.max(target.shield ?? 0, Math.floor(target.maxHp * shieldPct)),
      }));
      logs.push(`${currentActor.name} 开场护盾词条触发，护盾 ${Math.floor(currentActor.maxHp * shieldPct)}。`);
    }
    if (affixEffectValue(currentActor, "revive_once") > 0 && (currentActor.reviveDisabledActions ?? 0) <= 0) {
      nextCombat = mapActor(nextCombat, currentActor.id, (target) => ({ ...target, reviveReady: true }));
      logs.push(`${currentActor.name} 命灯已点亮，复活词条待触发。`);
    }
    const protectReduce = Math.max(affixEffectValue(currentActor, "domain_guard"), affixEffectValue(currentActor, "domain_skill"), affixEffectValue(currentActor, "unique_law"));
    if (protectReduce > 0) {
      const side = currentActor.side;
      nextCombat = {
        ...nextCombat,
        allies: nextCombat.allies.map((ally) => (ally.side === side ? { ...ally, damageReducePct: Math.max(ally.damageReducePct ?? 0, protectReduce) } : ally)),
        enemies: nextCombat.enemies.map((enemy) => (enemy.side === side ? { ...enemy, damageReducePct: Math.max(enemy.damageReducePct ?? 0, protectReduce) } : enemy)),
      };
      logs.push(`${currentActor.name} 的开场守护词条触发，队伍减伤提高。`);
    }
    const initiative = affixEffectValue(currentActor, "initiative_bonus");
    if (initiative > 0) {
      nextCombat = mapActor(nextCombat, currentActor.id, (target) => ({
        ...target,
        speedUpTurns: 1,
        speedUpAmount: Math.max(target.speedUpAmount ?? 0, initiative),
      }));
      logs.push(`${currentActor.name} 先手词条触发，第 1 回合速度 +${initiative}。`);
    }
  });
  return { combat: nextCombat, logs };
}

function prepareCombat(game: GameState, combat: CombatState): CombatState {
  if (combat.preparationComplete) {
    return combat;
  }
  const logs = ["Round 0 准备回合开始。", "双方基础属性、装备、法宝槽、同伴与敌人模板词条加载完成。"];
  let nextCombat = appendCombatLogs(combat, logs);
  const disabled = applyOpeningDisables(nextCombat);
  nextCombat = appendCombatLogs(disabled.combat, disabled.logs.length ? disabled.logs : ["禁止类词条结算完成。"]);
  const seals = applyOpeningEquipmentSeals(game, nextCombat);
  nextCombat = appendCombatLogs(seals.combat, seals.logs.length ? seals.logs : ["装备封禁校验完成，未触发封器。"]);
  nextCombat = appendCombatLogs(mapActors(nextCombat, (actor) => recalculatePlayerActorFromEquipment(game, actor)), ["封器后最终属性重新计算完成。"]);
  const opening = applyOpeningAffixes(nextCombat);
  nextCombat = appendCombatLogs(opening.combat, opening.logs.length ? opening.logs : ["开场词条校验完成。"]);
  nextCombat = {
    ...nextCombat,
    round: 1,
    turnIndex: 0,
    turnOrder: buildTurnOrder(nextCombat),
    preparationComplete: true,
    lastRoundStarted: undefined,
  };
  return appendCombatLogs(nextCombat, [`第 1 回合速度顺序已生成：${nextCombat.turnOrder.map((actorId) => findActor(nextCombat, actorId)?.name).filter(Boolean).join("、")}。`]);
}

export function beginCombat(game: GameState, groupId: string): GameState {
  const group = getEnemyGroup(groupId);
  const combatType = group.combatType ?? "normal";
  const allies = [toPlayerActor(game), ...game.player.team.slice(0, 2).map(toTeamActor)];
  const enemies = group.enemies.flatMap((entry) => Array.from({ length: entry.count }, (_, index) => toEnemyActor(entry.templateId, entry.count, index)));
  const combat: CombatState = {
    id: `combat_${Date.now()}`,
    groupId,
    title: group.title,
    combatType,
    timeoutResult: combatTimeoutFor(combatType, group.timeoutResult),
    maxRounds: combatMaxRounds,
    preparationComplete: false,
    allies,
    enemies,
    turnOrder: [],
    turnIndex: 0,
    round: 0,
    logs: [`遭遇 ${group.title}，战斗开始。`],
    rewards: group.rewards,
    returnContext: createCombatReturnContext(game),
  };
  return advanceUntilPlayer(game, prepareCombat(game, combat));
}

export function performPlayerSkill(game: GameState, skillId: string, targetId?: string): GameState {
  if (!game.combat) {
    return game;
  }
  const preparedCombat = applyTurnStart(ensureRoundStarted(game.combat), game.combat.turnOrder[game.combat.turnIndex]);
  const actor = getCurrentActor(preparedCombat);
  if (actor?.kind !== "player") {
    return { ...game, combat: preparedCombat };
  }
  const acted = applySkill(preparedCombat, actor.id, skillId, targetId);
  const combat = advanceTurn(game, acted, actor.id);
  return advanceUntilPlayer(game, combat);
}

export function performPlayerBasic(game: GameState): GameState {
  if (!game.combat) {
    return game;
  }
  const preparedCombat = applyTurnStart(ensureRoundStarted(game.combat), game.combat.turnOrder[game.combat.turnIndex]);
  const actor = getCurrentActor(preparedCombat);
  if (actor?.kind !== "player") {
    return { ...game, combat: preparedCombat };
  }
  const acted = canUseBasicAttack(actor) ? applySkill(preparedCombat, actor.id, "basic_strike") : applyDefendAction(preparedCombat, actor.id, `${actor.name} 被禁普攻压制，改为防御。`);
  const combat = advanceTurn(game, acted, actor.id);
  return advanceUntilPlayer(game, combat);
}

export function performDefend(game: GameState): GameState {
  if (!game.combat) {
    return game;
  }
  const preparedCombat = applyTurnStart(ensureRoundStarted(game.combat), game.combat.turnOrder[game.combat.turnIndex]);
  const actor = getCurrentActor(preparedCombat);
  if (actor?.kind !== "player") {
    return { ...game, combat: preparedCombat };
  }
  const guarded = applyDefendAction(preparedCombat, actor.id, `${actor.name} 稳住气息，进入防御。`);
  const combat = advanceTurn(game, guarded, actor.id);
  return advanceUntilPlayer(game, combat);
}

export function performEscape(game: GameState): GameState {
  if (!game.combat) {
    return game;
  }
  const preparedCombat = applyTurnStart(ensureRoundStarted(game.combat), game.combat.turnOrder[game.combat.turnIndex]);
  const actor = getCurrentActor(preparedCombat);
  if (actor?.kind !== "player") {
    return { ...game, combat: preparedCombat };
  }
  const escaped = Math.random() < Math.min(0.95, 0.72 + affixEffectValue(actor, "escape_rate"));
  if (escaped) {
    const returned = restoreCombatReturnContext(game, preparedCombat);
    return appendLog({ ...returned, combat: undefined }, "你寻得空隙，带队脱离战斗。");
  }
  const combat = advanceTurn(
    game,
    appendCombatLogs(preparedCombat, ["逃离失败，敌人步步紧逼。"]),
    actor.id,
  );
  return advanceUntilPlayer(game, combat);
}

export function performUseItem(game: GameState, itemId: string): GameState {
  if (!game.combat) {
    return game;
  }
  const preparedCombat = applyTurnStart(ensureRoundStarted(game.combat), game.combat.turnOrder[game.combat.turnIndex]);
  const actor = getCurrentActor(preparedCombat);
  const normalizedItemId = normalizeItemId(itemId);
  const item = getItem(normalizedItemId);
  if (actor?.kind !== "player" || !item.combatHeal || (game.inventory.items[normalizedItemId] ?? 0) <= 0 || !canUsePillAction(actor)) {
    return { ...game, combat: appendCombatLogs(preparedCombat, actor?.pillDisabledActions ? [`${actor.name} 丹药被禁，无法服用。`] : []) };
  }
  const currentAmount = game.inventory.items[normalizedItemId] ?? 0;
  const nextAmount = currentAmount - 1;
  const nextItems = { ...game.inventory.items };
  if (nextAmount > 0) {
    nextItems[normalizedItemId] = nextAmount;
  } else {
    delete nextItems[normalizedItemId];
  }
  const withItemSpent = {
    ...game,
    inventory: {
      ...game.inventory,
      items: nextItems,
    },
  };
  const healed = mapActor(preparedCombat, actor.id, (current) => ({
    ...current,
    hp: Math.min(current.maxHp, current.hp + item.combatHeal!),
  }));
  const acted = appendCombatLogs(healed, [`${actor.name} 服下 ${formatItemName(item)}，气血 +${item.combatHeal}。`]);
  const combat = advanceTurn(withItemSpent, acted, actor.id);
  return advanceUntilPlayer({ ...withItemSpent, combat }, combat);
}

export function performArtifactAction(game: GameState): GameState {
  if (!game.combat) {
    return game;
  }
  const preparedCombat = applyTurnStart(ensureRoundStarted(game.combat), game.combat.turnOrder[game.combat.turnIndex]);
  const actor = getCurrentActor(preparedCombat);
  if (actor?.kind !== "player" || !canUseArtifactActorAction(actor)) {
    return { ...game, combat: appendCombatLogs(preparedCombat, actor?.artifactDisabledActions ? [`${actor.name} 法宝槽被禁，无法催动。`] : []) };
  }
  const target = aliveEnemies(preparedCombat)[0];
  if (!target) {
    return { ...game, combat: preparedCombat };
  }
  const power = Math.max(affixEffectValue(actor, "active_skill"), affixEffectValue(actor, "domain_skill"), affixEffectValue(actor, "unique_law"));
  const damage = Math.max(1, Math.floor(actor.attack * (0.75 + power) * (1 + combatWarmupDamageBonus(preparedCombat.round))));
  const struck = applyDamageToActor(preparedCombat, target.id, damage).combat;
  const acted = appendCombatLogs(
    mapActor(struck, target.id, (enemy) => ({ ...enemy, soulLockedTurns: 1 })),
    [`${actor.name} 催动法宝共鸣，对 ${target.name} 造成 ${damage} 伤害，并短暂锁魂。`],
  );
  const combat = advanceTurn(game, acted, actor.id);
  return advanceUntilPlayer(game, combat);
}

export function canUseArtifactAction(game: GameState): boolean {
  const player = game.combat?.allies.find((actor) => actor.kind === "player");
  return canUseArtifactActorAction(player);
}

export function grantTreasure(game: GameState): GameState {
  const foundPill = Math.random() < 0.45;
  const rewards = foundPill
    ? { spiritStones: 60, items: [{ itemId: "foundation_pill", amount: 1 }] }
    : { spiritStones: 120, items: [{ itemId: "greenwood_essence", amount: 1 }] };
  const rewarded = addRewards(game, rewards);
  return appendLog(rewarded, foundPill ? "你在玉瓶中找到一枚筑基丹。" : "丹室药气散尽，只余青木灵液与灵石。");
}

export function grantGatherReward(game: GameState): GameState {
  const rewarded = addItems(
    game,
    [
      { itemId: "qi_grass", amount: 1 },
      { itemId: "spirit_herb", amount: Math.random() < 0.45 ? 1 : 0 },
    ].filter((item) => item.amount > 0),
  );
  return appendLog(rewarded, "你采得凝气草，草叶上的灵雾缓缓散开。");
}
