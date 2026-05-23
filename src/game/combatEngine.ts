import { getEnemyGroup, getEnemyTemplate } from "../data/enemies";
import { formatItemName, getItem, normalizeItemId } from "../data/items";
import { getSkill } from "../data/skills";
import type { CombatActor, CombatState, GameState, ItemAffix, SkillConfig, TargetType } from "../types";
import { chooseAiAction } from "./ai";
import { getActiveEquipmentAffixes, getEffectiveStats } from "./equipment";
import { addItems, addRewards, appendLog } from "./state";
import { advanceTime } from "./time";

function toPlayerActor(game: GameState): CombatActor {
  const stats = getEffectiveStats(game);
  return {
    id: "ally_player",
    name: game.player.name,
    side: "ally",
    kind: "player",
    ...stats,
    hp: Math.max(1, Math.min(game.player.hp, stats.maxHp)),
    spirit: Math.max(0, Math.min(game.player.spirit, stats.maxSpirit)),
    skillIds: game.player.skillIds,
    equipmentAffixes: getActiveEquipmentAffixes(game),
  };
}

function toTeamActor(member: GameState["player"]["team"][number], index: number): CombatActor {
  return {
    id: `ally_${member.id}_${index}`,
    name: member.name,
    side: "ally",
    kind: member.kind,
    ...member.stats,
    hp: member.stats.maxHp,
    spirit: member.stats.maxSpirit,
    skillIds: member.skillIds,
  };
}

function buildTurnOrder(combat: Pick<CombatState, "allies" | "enemies">): string[] {
  return [...combat.allies, ...combat.enemies]
    .filter((actor) => actor.hp > 0)
    .sort((a, b) => effectiveSpeed(b) - effectiveSpeed(a))
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

function effectiveSpeed(actor: CombatActor): number {
  return actor.speed + (actor.speedUpTurns && actor.speedUpTurns > 0 ? actor.speedUpAmount ?? 0 : 0);
}

function affixEffectValue(actor: Pick<CombatActor, "equipmentAffixes"> | undefined, effect: NonNullable<ItemAffix["effect"]>): number {
  return (actor?.equipmentAffixes ?? []).reduce((sum, affix) => sum + (affix.effect === effect && typeof affix.value === "number" ? affix.value : 0), 0);
}

function affixStatValue(actor: CombatActor, stat: NonNullable<ItemAffix["stat"]>): number {
  return (actor.equipmentAffixes ?? []).reduce((sum, affix) => sum + (affix.stat === stat && typeof affix.value === "number" ? affix.value : 0), 0);
}

function affixIdValue(actor: CombatActor, affixId: string): number {
  return (actor.equipmentAffixes ?? []).reduce((sum, affix) => sum + (affix.id === affixId && typeof affix.value === "number" ? affix.value : 0), 0);
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

export function getSkillSpiritCost(actor: Pick<CombatActor, "equipmentAffixes"> | undefined, skill: SkillConfig): number {
  const reduction = Math.min(0.6, affixEffectValue(actor, "mp_cost_reduce"));
  return Math.max(0, Math.floor(skill.spiritCost * (1 - reduction)));
}

function computeDamage(actor: CombatActor, target: CombatActor, skill: SkillConfig): { damage: number; critical: boolean } {
  const defenseFactor = skill.id === "basic_strike" || skill.id === "bite" ? 0.45 : 0.35;
  const armorBreak = affixEffectValue(actor, "armor_break_pct") + (affixEffectValue(actor, "crit_ignore_def") > 0 ? 0 : 0);
  const targetDefense = target.defense * Math.max(0.15, 1 - armorBreak);
  let damage = Math.max(1, Math.floor(actorAttack(actor) * skill.power - targetDefense * defenseFactor));
  damage = Math.floor(damage * (1 + affixStatValue(actor, "skillDamagePct") + targetSpecificDamageBonus(actor, target)));
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
  const reduce = Math.min(0.75, (target.damageReducePct ?? 0) + affixEffectValue(target, "damage_reduce_pct") + (target.hp / target.maxHp <= 0.3 ? affixEffectValue(target, "low_hp_guard") : 0));
  return { damage: Math.max(1, Math.floor(damage * (1 - reduce))), critical };
}

function applySkill(combat: CombatState, actorId: string, skillId: string, targetId?: string): CombatState {
  const actor = findActor(combat, actorId);
  const skill = getSkill(skillId);
  if (!actor || actor.hp <= 0) {
    return combat;
  }
  const spiritCost = getSkillSpiritCost(actor, skill);
  if (actor.spirit < spiritCost) {
    return applySkill(combat, actorId, actor.kind === "beast" || actor.kind === "pet" ? "bite" : "basic_strike", targetId);
  }
  const resolvedTargetId = skill.targetType === "enemySingle" ? targetId ?? randomEnemyTargetId(combat, actor) : targetId;
  const targets = targetsFor(combat, actor, skill.targetType, resolvedTargetId);
  if (!targets.length) {
    return {
      ...combat,
      logs: [`${actor.name} 的 ${skill.name} 未找到目标。`, ...combat.logs].slice(0, 16),
    };
  }

  let nextCombat = mapActor(combat, actor.id, (current) => ({
    ...current,
    spirit: Math.max(0, current.spirit - spiritCost),
  }));
  const logLines: string[] = [];

  targets.forEach((target) => {
    if (skill.effectType === "damage") {
      const currentTarget = findActor(nextCombat, target.id);
      const currentActor = findActor(nextCombat, actor.id);
      if (!currentTarget || !currentActor) {
        return;
      }
      const dodgeChance = getEffectiveDodgeRate(currentActor, currentTarget, skill);
      const perfectDodge = Math.random() < affixEffectValue(currentTarget, "perfect_dodge_proc");
      if (perfectDodge || Math.random() <= dodgeChance) {
        nextCombat = mapActor(nextCombat, currentTarget.id, (victim) => ({
          ...victim,
          speedUpTurns: affixEffectValue(victim, "after_dodge_speed") ? 1 : victim.speedUpTurns,
          speedUpAmount: Math.max(victim.speedUpAmount ?? 0, affixEffectValue(victim, "after_dodge_speed")),
        }));
        logLines.push(`${target.name} 身形一晃，避开了 ${skill.name}。`);
        return;
      }
      const { damage, critical } = computeDamage(currentActor, currentTarget, skill);
      const thunderDamage = Math.random() < affixEffectValue(currentActor, "on_hit_thunder") ? Math.max(1, Math.floor(currentActor.attack * 0.35)) : 0;
      const totalDamage = damage + thunderDamage;
      nextCombat = mapActor(nextCombat, currentTarget.id, (victim) => {
        const shield = victim.shield ?? 0;
        const absorbed = Math.min(shield, totalDamage);
        const nextHp = Math.max(0, victim.hp - (totalDamage - absorbed));
        return {
          ...victim,
          hp: nextHp,
          shield: Math.max(0, shield - absorbed),
          defending: false,
          guardedTurns: Math.max(0, (victim.guardedTurns ?? 0) - 1),
          attackDownTurns: skill.id === "beast_roar" && Math.random() < 0.35 ? 1 : victim.attackDownTurns,
          burnTurns: Math.random() < affixEffectValue(currentActor, "on_hit_fire") ? 2 : victim.burnTurns,
          burnDamage: Math.max(victim.burnDamage ?? 0, Math.floor(currentActor.attack * 0.18)),
          dodgeUpTurns: affixEffectValue(victim, "after_hit_dodge") ? 1 : victim.dodgeUpTurns,
          dodgeUpAmount: Math.max(victim.dodgeUpAmount ?? 0, affixEffectValue(victim, "after_hit_dodge")),
          soulLockedTurns: Math.random() < affixEffectValue(currentActor, "soul_lock") ? 1 : victim.soulLockedTurns,
        };
      });
      if (critical && affixEffectValue(currentActor, "crit_restore_mp")) {
        nextCombat = mapActor(nextCombat, currentActor.id, (source) => ({
          ...source,
          spirit: Math.min(source.maxSpirit, source.spirit + affixEffectValue(source, "crit_restore_mp")),
        }));
      }
      logLines.push(`${actor.name} 施展 ${skill.name}，对 ${target.name} 造成 ${totalDamage} 伤害${critical ? "，触发会心" : ""}。`);
      if (thunderDamage > 0) {
        logLines.push(`雷光炸开，追加 ${thunderDamage} 伤害。`);
      }
      if ((skill.id === "basic_strike" && Math.random() < affixEffectValue(currentActor, "double_strike")) || (critical && Math.random() < affixEffectValue(currentActor, "crit_extra_hit"))) {
        const extra = Math.max(1, Math.floor(currentActor.attack * 0.55));
        nextCombat = mapActor(nextCombat, currentTarget.id, (victim) => ({ ...victim, hp: Math.max(0, victim.hp - extra) }));
        logLines.push(`${actor.name} 趁势追击，追加 ${extra} 伤害。`);
      }
      if (Math.random() < affixEffectValue(currentTarget, "counter_chance")) {
        const counter = Math.max(1, Math.floor(currentTarget.attack * 0.4));
        nextCombat = mapActor(nextCombat, currentActor.id, (source) => ({ ...source, hp: Math.max(0, source.hp - counter) }));
        logLines.push(`${target.name} 反震回击，造成 ${counter} 伤害。`);
      }
    }
    if (skill.effectType === "heal") {
      const heal = Math.max(12, Math.floor(28 + actor.spiritSense * 0.6));
      nextCombat = mapActor(nextCombat, target.id, (ally) => ({
        ...ally,
        hp: Math.min(ally.maxHp, ally.hp + heal),
      }));
      logLines.push(`${actor.name} 施展 ${skill.name}，为 ${target.name} 回复 ${heal} 气血。`);
    }
    if (skill.effectType === "reduceDamage") {
      nextCombat = mapActor(nextCombat, target.id, (ally) => ({
        ...ally,
        guardedTurns: 1,
      }));
      logLines.push(`${actor.name} 施展 ${skill.name}，守护 ${target.name}。`);
    }
    if (skill.effectType === "restoreSpirit") {
      const restore = Math.max(5, Math.floor(10 + actor.spiritSense * 0.3));
      nextCombat = mapActor(nextCombat, target.id, (ally) => ({
        ...ally,
        spirit: Math.min(ally.maxSpirit, ally.spirit + restore),
      }));
      logLines.push(`${actor.name} 施展 ${skill.name}，为 ${target.name} 回复 ${restore} 灵力。`);
    }
  });

  return applyReviveIfNeeded({
    ...nextCombat,
    logs: [...logLines, ...nextCombat.logs].slice(0, 16),
  });
}

function advanceTurn(combat: CombatState): CombatState {
  let nextIndex = combat.turnIndex + 1;
  let nextRound = combat.round;
  let nextOrder = combat.turnOrder;

  if (nextIndex >= nextOrder.length) {
    nextRound += 1;
    nextOrder = buildTurnOrder(combat);
    nextIndex = 0;
  }

  let nextCombat = {
    ...combat,
    turnIndex: nextIndex,
    turnOrder: nextOrder,
    round: nextRound,
  };

  const actor = getCurrentActor(nextCombat);
  if (actor) {
    nextCombat = mapActor(nextCombat, actor.id, (current) => ({
      ...current,
      defending: false,
      attackDownTurns: Math.max(0, (current.attackDownTurns ?? 0) - 1),
      speedUpTurns: Math.max(0, (current.speedUpTurns ?? 0) - 1),
      dodgeUpTurns: Math.max(0, (current.dodgeUpTurns ?? 0) - 1),
      soulLockedTurns: Math.max(0, (current.soulLockedTurns ?? 0) - 1),
    }));
  }
  return nextCombat;
}

function applyCombatStartAffixes(combat: CombatState): CombatState {
  const nextCombat = combat.allies.reduce((currentCombat, actor) => {
    if (!actor.equipmentAffixes?.length) {
      return currentCombat;
    }
    const shieldPct = affixEffectValue(actor, "start_shield");
    const domainReduce = Math.max(affixEffectValue(actor, "domain_guard"), affixEffectValue(actor, "domain_skill"), affixEffectValue(actor, "unique_law"));
    return {
      ...currentCombat,
      allies: currentCombat.allies.map((ally) => ({
        ...ally,
        shield: ally.id === actor.id && shieldPct ? Math.max(ally.shield ?? 0, Math.floor(ally.maxHp * shieldPct)) : ally.shield,
        reviveReady: ally.id === actor.id && affixEffectValue(actor, "revive_once") > 0 ? true : ally.reviveReady,
        damageReducePct: Math.max(ally.damageReducePct ?? 0, domainReduce),
        speedUpTurns: ally.id === actor.id && affixEffectValue(actor, "initiative_bonus") ? 1 : ally.speedUpTurns,
        speedUpAmount: ally.id === actor.id ? Math.max(ally.speedUpAmount ?? 0, affixEffectValue(actor, "initiative_bonus")) : ally.speedUpAmount,
      })),
      logs: domainReduce ? [`${actor.name} 展开领域，队伍周身灵压流转。`, ...currentCombat.logs].slice(0, 16) : currentCombat.logs,
    };
  }, combat);
  return { ...nextCombat, turnOrder: buildTurnOrder(nextCombat) };
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
  const mpRecover = affixEffectValue(actor, "mp_recover_turn");
  if (mpRecover > 0) {
    nextCombat = mapActor(nextCombat, actor.id, (current) => ({
      ...current,
      spirit: Math.min(current.maxSpirit, current.spirit + mpRecover),
    }));
    logs.push(`${actor.name} 法器回灵，灵力 +${mpRecover}。`);
  }
  return logs.length ? { ...nextCombat, logs: [...logs, ...nextCombat.logs].slice(0, 16) } : nextCombat;
}

function applyReviveIfNeeded(combat: CombatState): CombatState {
  return {
    ...combat,
    allies: combat.allies.map((actor) => {
      if (actor.hp > 0 || !actor.reviveReady || Math.random() > affixEffectValue(actor, "revive_once")) {
        return actor;
      }
      return {
        ...actor,
        hp: Math.max(1, Math.floor(actor.maxHp * 0.18)),
        reviveReady: false,
      };
    }),
  };
}

function battleEnded(combat: CombatState): "victory" | "defeat" | null {
  if (aliveEnemies(combat).length === 0) {
    return "victory";
  }
  if (aliveAllies(combat).length === 0) {
    return "defeat";
  }
  return null;
}

function runAiTurn(combat: CombatState): CombatState {
  const prepared = applyTurnStart(combat, combat.turnOrder[combat.turnIndex]);
  const actor = getCurrentActor(prepared);
  if (!actor || actor.hp <= 0) {
    return advanceTurn(prepared);
  }
  const choice = chooseAiAction(actor, prepared);
  return advanceTurn(applySkill(prepared, actor.id, choice.skillId, choice.targetId));
}

function settleCombat(game: GameState, combat: CombatState): GameState {
  const result = battleEnded(combat);
  if (!result) {
    return { ...game, combat };
  }
  if (result === "victory") {
    const rewarded = addRewards({ ...game, combat: undefined }, combat.rewards);
    const recovered = applyBattleEndRecover(rewarded, combat);
    return appendLog(
      {
        ...recovered,
        combat: undefined,
      },
      `战斗胜利：修为 +${combat.rewards.cultivation}，灵石 +${combat.rewards.spiritStones}。`,
    );
  }
  return appendLog(
    {
      ...game,
      combat: undefined,
      world: {
        ...game.world,
        locationId: game.world.lastTownId,
        sceneId: "gate",
      },
    },
    "队伍气血耗尽，你退回最近城镇调息。本场奖励未获得。",
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
  let nextCombat = combat;
  for (let guard = 0; guard < 40; guard += 1) {
    const result = battleEnded(nextCombat);
    if (result) {
      return settleCombat(game, nextCombat);
    }
    const actor = getCurrentActor(nextCombat);
    if (actor?.kind === "player" && actor.hp > 0) {
      return { ...game, combat: nextCombat };
    }
    nextCombat = runAiTurn(nextCombat);
  }
  return { ...game, combat: nextCombat };
}

export function beginCombat(game: GameState, groupId: string): GameState {
  const group = getEnemyGroup(groupId);
  const allies = [toPlayerActor(game), ...game.player.team.slice(0, 2).map(toTeamActor)];
  const enemies = group.enemies.flatMap((entry) => {
    const template = getEnemyTemplate(entry.templateId);
    return Array.from({ length: entry.count }, (_, index) => ({
      id: `enemy_${template.id}_${index + 1}_${Math.random().toString(36).slice(2, 7)}`,
      name: entry.count > 1 ? `${template.name}${index + 1}` : template.name,
      side: "enemy" as const,
      kind: template.kind,
      ...template.stats,
      hp: template.stats.maxHp,
      spirit: template.stats.maxSpirit,
      skillIds: template.skillIds,
    }));
  });
  const combat: CombatState = {
    id: `combat_${Date.now()}`,
    groupId,
    title: group.title,
    allies,
    enemies,
    turnOrder: buildTurnOrder({ allies, enemies }),
    turnIndex: 0,
    round: 1,
    logs: [`遭遇 ${group.title}，战斗开始。`],
    rewards: group.rewards,
  };
  return advanceTime(advanceUntilPlayer(game, applyCombatStartAffixes(combat)), 1);
}

export function performPlayerSkill(game: GameState, skillId: string, targetId?: string): GameState {
  if (!game.combat) {
    return game;
  }
  const preparedCombat = applyTurnStart(game.combat, game.combat.turnOrder[game.combat.turnIndex]);
  const actor = getCurrentActor(preparedCombat);
  if (actor?.kind !== "player") {
    return { ...game, combat: preparedCombat };
  }
  const combat = advanceTurn(applySkill(preparedCombat, actor.id, skillId, targetId));
  return advanceTime(advanceUntilPlayer(game, combat), 1);
}

export function performPlayerBasic(game: GameState): GameState {
  if (!game.combat) {
    return game;
  }
  const preparedCombat = applyTurnStart(game.combat, game.combat.turnOrder[game.combat.turnIndex]);
  const actor = getCurrentActor(preparedCombat);
  if (actor?.kind !== "player") {
    return { ...game, combat: preparedCombat };
  }
  const combat = advanceTurn(applySkill(preparedCombat, actor.id, "basic_strike"));
  return advanceTime(advanceUntilPlayer(game, combat), 1);
}

export function performDefend(game: GameState): GameState {
  if (!game.combat) {
    return game;
  }
  const preparedCombat = applyTurnStart(game.combat, game.combat.turnOrder[game.combat.turnIndex]);
  const actor = getCurrentActor(preparedCombat);
  if (actor?.kind !== "player") {
    return { ...game, combat: preparedCombat };
  }
  const guarded = mapActor(preparedCombat, actor.id, (current) => ({ ...current, defending: true }));
  const combat = advanceTurn({
    ...guarded,
    logs: [`${actor.name} 稳住气息，进入防御。`, ...guarded.logs].slice(0, 16),
  });
  return advanceTime(advanceUntilPlayer(game, combat), 1);
}

export function performEscape(game: GameState): GameState {
  if (!game.combat) {
    return game;
  }
  const preparedCombat = applyTurnStart(game.combat, game.combat.turnOrder[game.combat.turnIndex]);
  const actor = getCurrentActor(preparedCombat);
  if (actor?.kind !== "player") {
    return { ...game, combat: preparedCombat };
  }
  const escaped = Math.random() < Math.min(0.95, 0.72 + affixEffectValue(actor, "escape_rate"));
  if (escaped) {
    return advanceTime(appendLog({ ...game, combat: undefined }, "你寻得空隙，带队脱离战斗。"), 1);
  }
  const combat = advanceTurn({
    ...game.combat,
    ...preparedCombat,
    logs: ["逃离失败，敌人步步紧逼。", ...preparedCombat.logs].slice(0, 16),
  });
  return advanceTime(advanceUntilPlayer(game, combat), 1);
}

export function performUseItem(game: GameState, itemId: string): GameState {
  if (!game.combat) {
    return game;
  }
  const preparedCombat = applyTurnStart(game.combat, game.combat.turnOrder[game.combat.turnIndex]);
  const actor = getCurrentActor(preparedCombat);
  const normalizedItemId = normalizeItemId(itemId);
  const item = getItem(normalizedItemId);
  if (actor?.kind !== "player" || !item.combatHeal || (game.inventory.items[normalizedItemId] ?? 0) <= 0) {
    return game;
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
  const combat = advanceTurn({
    ...healed,
    logs: [`${actor.name} 服下 ${formatItemName(item)}，气血 +${item.combatHeal}。`, ...healed.logs].slice(0, 16),
  });
  return advanceTime(advanceUntilPlayer({ ...withItemSpent, combat }, combat), 1);
}

export function performArtifactAction(game: GameState): GameState {
  if (!game.combat) {
    return game;
  }
  const preparedCombat = applyTurnStart(game.combat, game.combat.turnOrder[game.combat.turnIndex]);
  const actor = getCurrentActor(preparedCombat);
  if (actor?.kind !== "player" || (!affixEffectValue(actor, "active_skill") && !affixEffectValue(actor, "domain_skill") && !affixEffectValue(actor, "unique_law"))) {
    return { ...game, combat: preparedCombat };
  }
  const target = aliveEnemies(preparedCombat)[0];
  if (!target) {
    return { ...game, combat: preparedCombat };
  }
  const power = Math.max(affixEffectValue(actor, "active_skill"), affixEffectValue(actor, "domain_skill"), affixEffectValue(actor, "unique_law"));
  const damage = Math.max(1, Math.floor(actor.attack * (0.75 + power)));
  const struck = mapActor(preparedCombat, target.id, (enemy) => ({ ...enemy, hp: Math.max(0, enemy.hp - damage), soulLockedTurns: 1 }));
  const combat = advanceTurn({
    ...struck,
    logs: [`${actor.name} 催动法宝共鸣，对 ${target.name} 造成 ${damage} 伤害，并短暂锁魂。`, ...struck.logs].slice(0, 16),
  });
  return advanceTime(advanceUntilPlayer(game, combat), 1);
}

export function canUseArtifactAction(game: GameState): boolean {
  const player = game.combat?.allies.find((actor) => actor.kind === "player");
  return Boolean(player && (affixEffectValue(player, "active_skill") || affixEffectValue(player, "domain_skill") || affixEffectValue(player, "unique_law")));
}

export function grantTreasure(game: GameState): GameState {
  const foundPill = Math.random() < 0.45;
  const rewards = foundPill
    ? { spiritStones: 60, items: [{ itemId: "foundation_pill", amount: 1 }] }
    : { spiritStones: 120, items: [{ itemId: "greenwood_essence", amount: 1 }] };
  const rewarded = addRewards(game, rewards);
  return advanceTime(appendLog(rewarded, foundPill ? "你在玉瓶中找到一枚筑基丹。" : "丹室药气散尽，只余青木灵液与灵石。"), 2);
}

export function grantGatherReward(game: GameState): GameState {
  const rewarded = addItems(game, [
    { itemId: "qi_grass", amount: 1 },
    { itemId: "spirit_herb", amount: Math.random() < 0.45 ? 1 : 0 },
  ].filter((item) => item.amount > 0));
  return advanceTime(appendLog(rewarded, "你采得凝气草，草叶上的灵雾缓缓散开。"), 2);
}
