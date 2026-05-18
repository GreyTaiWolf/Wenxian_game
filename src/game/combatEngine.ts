import { getEnemyGroup, getEnemyTemplate } from "../data/enemies";
import { formatItemName, getItem, normalizeItemId } from "../data/items";
import { getSkill } from "../data/skills";
import type { CombatActor, CombatState, GameState, SkillConfig, TargetType } from "../types";
import { chooseAiAction } from "./ai";
import { getEffectiveStats } from "./equipment";
import { addItems, addRewards, appendLog } from "./state";

function toPlayerActor(game: GameState): CombatActor {
  const stats = getEffectiveStats(game);
  return {
    id: "ally_player",
    name: game.player.name,
    side: "ally",
    kind: "player",
    ...stats,
    hp: stats.maxHp,
    spirit: stats.maxSpirit,
    skillIds: game.player.skillIds,
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
    .sort((a, b) => b.speed - a.speed)
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

function actorAttack(actor: CombatActor): number {
  return actor.attack * (actor.attackDownTurns && actor.attackDownTurns > 0 ? 0.85 : 1);
}

function computeDamage(actor: CombatActor, target: CombatActor, skill: SkillConfig): number {
  const defenseFactor = skill.id === "basic_strike" || skill.id === "bite" ? 0.45 : 0.35;
  let damage = Math.max(1, Math.floor(actorAttack(actor) * skill.power - target.defense * defenseFactor));
  if (Math.random() <= actor.crit) {
    damage = Math.floor(damage * 1.5);
  }
  if (target.defending) {
    damage = Math.floor(damage * 0.5);
  }
  if (target.guardedTurns && target.guardedTurns > 0) {
    damage = Math.floor(damage * 0.65);
  }
  return Math.max(1, damage);
}

function dodgeChance(actor: CombatActor): number {
  return Math.max(0, Math.min(0.75, actor.dodge ?? 0));
}

function applySkill(combat: CombatState, actorId: string, skillId: string, targetId?: string): CombatState {
  const actor = findActor(combat, actorId);
  const skill = getSkill(skillId);
  if (!actor || actor.hp <= 0) {
    return combat;
  }
  if (actor.spirit < skill.spiritCost) {
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
    spirit: Math.max(0, current.spirit - skill.spiritCost),
  }));
  const logLines: string[] = [];

  targets.forEach((target) => {
    if (skill.effectType === "damage") {
      const currentTarget = findActor(nextCombat, target.id);
      const currentActor = findActor(nextCombat, actor.id);
      if (!currentTarget || !currentActor) {
        return;
      }
      if (Math.random() < dodgeChance(currentTarget)) {
        logLines.push(`${target.name} 身形一闪，避开了 ${actor.name} 的 ${skill.name}。`);
        return;
      }
      const damage = computeDamage(currentActor, currentTarget, skill);
      nextCombat = mapActor(nextCombat, currentTarget.id, (victim) => ({
        ...victim,
        hp: Math.max(0, victim.hp - damage),
        defending: false,
        guardedTurns: Math.max(0, (victim.guardedTurns ?? 0) - 1),
        attackDownTurns: skill.id === "beast_roar" && Math.random() < 0.35 ? 1 : victim.attackDownTurns,
      }));
      logLines.push(`${actor.name} 施展 ${skill.name}，对 ${target.name} 造成 ${damage} 伤害。`);
    }
    if (skill.effectType === "heal") {
      const heal = Math.max(12, Math.floor(28 + actor.divineSense * 0.6));
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
      const restore = Math.max(5, Math.floor(10 + actor.divineSense * 0.3));
      nextCombat = mapActor(nextCombat, target.id, (ally) => ({
        ...ally,
        spirit: Math.min(ally.maxSpirit, ally.spirit + restore),
      }));
      logLines.push(`${actor.name} 施展 ${skill.name}，为 ${target.name} 回复 ${restore} 灵力。`);
    }
  });

  return {
    ...nextCombat,
    logs: [...logLines, ...nextCombat.logs].slice(0, 16),
  };
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
    }));
  }
  return nextCombat;
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
  const actor = getCurrentActor(combat);
  if (!actor || actor.hp <= 0) {
    return advanceTurn(combat);
  }
  const choice = chooseAiAction(actor, combat);
  return advanceTurn(applySkill(combat, actor.id, choice.skillId, choice.targetId));
}

function settleCombat(game: GameState, combat: CombatState): GameState {
  const result = battleEnded(combat);
  if (!result) {
    return { ...game, combat };
  }
  if (result === "victory") {
    const rewarded = addRewards({ ...game, combat: undefined }, combat.rewards);
    return appendLog(
      {
        ...rewarded,
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
  return advanceUntilPlayer(game, combat);
}

export function performPlayerSkill(game: GameState, skillId: string, targetId?: string): GameState {
  if (!game.combat) {
    return game;
  }
  const actor = getCurrentActor(game.combat);
  if (actor?.kind !== "player") {
    return game;
  }
  const combat = advanceTurn(applySkill(game.combat, actor.id, skillId, targetId));
  return advanceUntilPlayer(game, combat);
}

export function performPlayerBasic(game: GameState): GameState {
  if (!game.combat) {
    return game;
  }
  const actor = getCurrentActor(game.combat);
  if (actor?.kind !== "player") {
    return game;
  }
  const combat = advanceTurn(applySkill(game.combat, actor.id, "basic_strike"));
  return advanceUntilPlayer(game, combat);
}

export function performDefend(game: GameState): GameState {
  if (!game.combat) {
    return game;
  }
  const actor = getCurrentActor(game.combat);
  if (actor?.kind !== "player") {
    return game;
  }
  const guarded = mapActor(game.combat, actor.id, (current) => ({ ...current, defending: true }));
  const combat = advanceTurn({
    ...guarded,
    logs: [`${actor.name} 稳住气息，进入防御。`, ...guarded.logs].slice(0, 16),
  });
  return advanceUntilPlayer(game, combat);
}

export function performEscape(game: GameState): GameState {
  if (!game.combat) {
    return game;
  }
  const actor = getCurrentActor(game.combat);
  if (actor?.kind !== "player") {
    return game;
  }
  const escaped = Math.random() < 0.72;
  if (escaped) {
    return appendLog({ ...game, combat: undefined }, "你寻得空隙，带队脱离战斗。");
  }
  const combat = advanceTurn({
    ...game.combat,
    logs: ["逃离失败，敌人步步紧逼。", ...game.combat.logs].slice(0, 16),
  });
  return advanceUntilPlayer(game, combat);
}

export function performUseItem(game: GameState, itemId: string): GameState {
  if (!game.combat) {
    return game;
  }
  const actor = getCurrentActor(game.combat);
  const normalizedItemId = normalizeItemId(itemId);
  const item = getItem(normalizedItemId);
  if (actor?.kind !== "player" || !item.combatHeal || (game.inventory.items[normalizedItemId] ?? 0) <= 0) {
    return game;
  }
  const withItemSpent = {
    ...game,
    inventory: {
      ...game.inventory,
      items: {
        ...game.inventory.items,
        [normalizedItemId]: game.inventory.items[normalizedItemId] - 1,
      },
    },
  };
  const healed = mapActor(game.combat, actor.id, (current) => ({
    ...current,
    hp: Math.min(current.maxHp, current.hp + item.combatHeal!),
  }));
  const combat = advanceTurn({
    ...healed,
    logs: [`${actor.name} 服下 ${formatItemName(item)}，气血 +${item.combatHeal}。`, ...healed.logs].slice(0, 16),
  });
  return advanceUntilPlayer({ ...withItemSpent, combat }, combat);
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
  const rewarded = addItems(game, [
    { itemId: "qi_grass", amount: 1 },
    { itemId: "spirit_herb", amount: Math.random() < 0.45 ? 1 : 0 },
  ].filter((item) => item.amount > 0));
  return appendLog(rewarded, "你采得凝气草，草叶上的灵雾缓缓散开。");
}
