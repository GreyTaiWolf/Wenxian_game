import { formatItemName, getItem, normalizeItemId } from "../data/items";
import { getNextRealm, getRealm } from "../data/progression";
import { createDefaultGridNavigationState } from "../data/gridMaps";
import { createEquipmentInstance } from "./equipment";
import type { ActorKind, CaveState, CombatLoadout, Cost, GameState, ItemAmount, PlayerState, Stats, TeamMember, UnlockKey } from "../types";

export const starterStats: Stats = {
  maxHp: 220,
  maxSpirit: 48,
  attack: 34,
  defense: 18,
  spiritSense: 0,
  speed: 18,
  dodgeRate: 0.02,
  critRate: 0.05,
  critDamage: 1.5,
};

export function getDefaultDodge(_kind: ActorKind = "player"): number {
  return 0.02;
}

export function normalizeStats(stats: Partial<Stats> | undefined, fallback: Partial<Stats> = starterStats): Stats {
  const safeStatNumber = (value: number | undefined, fallbackValue: number | undefined, starterValue: number): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof fallbackValue === "number" && Number.isFinite(fallbackValue)) {
      return fallbackValue;
    }
    return starterValue;
  };

  const clampRate = (value: number): number => Math.min(1, Math.max(0, value));

  return {
    maxHp: safeStatNumber(stats?.maxHp, fallback.maxHp, starterStats.maxHp),
    maxSpirit: safeStatNumber(stats?.maxSpirit, fallback.maxSpirit, starterStats.maxSpirit),
    attack: safeStatNumber(stats?.attack, fallback.attack, starterStats.attack),
    defense: safeStatNumber(stats?.defense, fallback.defense, starterStats.defense),
    spiritSense: safeStatNumber(stats?.spiritSense ?? legacyStat(stats, "divineSense"), fallback.spiritSense, starterStats.spiritSense),
    speed: safeStatNumber(stats?.speed, fallback.speed, starterStats.speed),
    dodgeRate: clampRate(safeStatNumber(stats?.dodgeRate ?? legacyStat(stats, "dodge"), fallback.dodgeRate, starterStats.dodgeRate)),
    critRate: clampRate(safeStatNumber(stats?.critRate ?? legacyStat(stats, "crit"), fallback.critRate, starterStats.critRate)),
    critDamage: Math.max(1, safeStatNumber(stats?.critDamage, fallback.critDamage, starterStats.critDamage)),
  };
}

function legacyStat(stats: Partial<Stats> | undefined, key: string): number | undefined {
  return (stats as Record<string, number | undefined> | undefined)?.[key];
}

export const defaultCombatLoadout: CombatLoadout = {
  skillIds: ["qi_slash", "rejuvenation"],
  divineSkillId: null,
  pillItemId: "healing_powder",
};

export function createDefaultCaveState(): CaveState {
  return {
    meditationStartedAt: null,
    spiritArrayLevel: 0,
    totalMeditationMinutes: 0,
  };
}

export function normalizeCombatLoadout(player: Partial<PlayerState> | undefined): CombatLoadout {
  const learnedSkills = new Set(player?.skillIds ?? []);
  const rawLoadout = player?.combatLoadout;
  const rawSkillIds = rawLoadout?.skillIds ?? defaultCombatLoadout.skillIds;
  const skillIds = rawSkillIds
    .slice(0, 2)
    .map((skillId) => (skillId && skillId !== "basic_strike" && learnedSkills.has(skillId) ? skillId : null));

  while (skillIds.length < 2) {
    skillIds.push(null);
  }

  const divineSkillId =
    rawLoadout?.divineSkillId && rawLoadout.divineSkillId !== "basic_strike" && learnedSkills.has(rawLoadout.divineSkillId)
      ? rawLoadout.divineSkillId
      : null;

  return {
    skillIds: [skillIds[0], skillIds[1]],
    divineSkillId,
    pillItemId: rawLoadout?.pillItemId ? normalizeItemId(rawLoadout.pillItemId) : "healing_powder",
  };
}

export function normalizePlayerState(player: Partial<PlayerState> | undefined): PlayerState {
  const realm = getRealm(player?.realmId ?? "qi_early");
  const stats = normalizeStats(player?.stats, realm.baseStats);
  const skillIds = player?.skillIds ?? ["basic_strike", "qi_slash", "rejuvenation"];
  const age = safeNumber(player?.age, safeNumber(player?.lifespanCurrent, 18));
  const lifespan = safeNumber(player?.lifespan, safeNumber(player?.lifespanMax, realm.lifespan));
  return {
    name: player?.name || "无名散修",
    realmId: realm.id,
    cultivation: Math.max(0, Math.min(realm.requiredCultivation, Math.floor(safeNumber(player?.cultivation, 0)))),
    hp: clampNumber(safeNumber(player?.hp, stats.maxHp), 1, stats.maxHp),
    spirit: clampNumber(safeNumber(player?.spirit, stats.maxSpirit), 0, stats.maxSpirit),
    age: Math.max(1, Math.floor(age)),
    lifespan: Math.max(1, Math.floor(lifespan)),
    mindValue: clampNumber(safeNumber(player?.mindValue, moodToMindValue(player?.mood)), 0, 100),
    comprehension: Math.max(0, safeNumber(player?.comprehension, 10)),
    injuryStacks: Math.max(0, Math.floor(safeNumber(player?.injuryStacks, 0))),
    instabilityStacks: Math.max(0, Math.floor(safeNumber(player?.instabilityStacks, 0))),
    spiritStones: Math.max(0, Math.floor(safeNumber(player?.spiritStones, 120))),
    stats,
    skillIds,
    combatLoadout: normalizeCombatLoadout({ ...player, skillIds }),
    team: (player?.team ?? []).map((member) => ({
      ...member,
      stats: normalizeStats(member.stats, { ...starterStats, dodgeRate: getDefaultDodge(member.kind) }),
    })),
    unlocks: player?.unlocks ?? realm.unlocks,
    dailyCultivationCount: Math.max(0, Math.floor(safeNumber(player?.dailyCultivationCount, 0))),
  };
}

export function calculateBreakthroughRatePct(game: GameState, nextRealm = getNextRealm(game.player.realmId)): number {
  if (!nextRealm) {
    return 0;
  }
  const player = game.player;
  const agePenalty = Math.max(0, player.age / Math.max(1, player.lifespan) - 0.8) * 25;
  return clampNumber(
    nextRealm.successRate * 100 +
      (player.mindValue - 50) * 0.35 +
      (player.comprehension - 10) * 1.2 -
      player.injuryStacks * 3 -
      player.instabilityStacks * 4 -
      agePenalty,
    5,
    95,
  );
}

function safeNumber(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function moodToMindValue(mood: string | undefined): number {
  return mood === "略有波动" ? 44 : 50;
}

export function createNewGame(name: string): GameState {
  const starterRealm = getRealm("qi_early");
  const initialStats = normalizeStats(starterRealm.baseStats);
  const starterWeapon = createEquipmentInstance("rough_iron_sword", { id: "starter_weapon" });
  const starterRobe = createEquipmentInstance("cloth_robe", { id: "starter_robe" });
  const starterBoots = createEquipmentInstance("cloth_boots", { id: "starter_boots" });
  const starterEquipmentItems = [starterWeapon, starterRobe, starterBoots].filter((item) => item !== null);

  return {
    player: {
      name,
      realmId: "qi_early",
      cultivation: 0,
      hp: initialStats.maxHp,
      spirit: initialStats.maxSpirit,
      age: 18,
      lifespan: starterRealm.lifespan,
      mindValue: 50,
      comprehension: 10,
      injuryStacks: 0,
      instabilityStacks: 0,
      spiritStones: 120,
      stats: initialStats,
      skillIds: ["basic_strike", "qi_slash", "rejuvenation"],
      combatLoadout: defaultCombatLoadout,
      team: [],
      unlocks: ["cultivation", "inventory", "explore"],
      dailyCultivationCount: 0,
    },
    inventory: {
      items: {
        healing_powder: 2,
        qi_grass: 0,
        beast_bone: 0,
      },
      equipment: {
        weapon: starterWeapon?.id ?? null,
        robe: starterRobe?.id ?? null,
        helmet: null,
        wrist: null,
        boots: starterBoots?.id ?? null,
        ring: null,
        amulet: null,
        artifact: null,
      },
      equipmentItems: starterEquipmentItems,
    },
    world: {
      regionId: "central",
      locationId: "qingyun_city",
      sceneId: "gate",
      lastTownId: "qingyun_city",
      sectJoined: false,
      sectContribution: 0,
      sectReputation: 0,
      tasks: {},
      logs: ["你在青云城外醒来，远处钟声如水，仙途由此开始。"],
      sceneMessage: "选择城中地点，或先去修炼聚气。",
      navigation: createDefaultGridNavigationState(),
    },
    cave: createDefaultCaveState(),
  };
}

export function appendLog(game: GameState, message: string): GameState {
  return {
    ...game,
    world: {
      ...game.world,
      logs: [message, ...game.world.logs].slice(0, 12),
      sceneMessage: message,
    },
  };
}

export function addItems(game: GameState, items: ItemAmount[] = []): GameState {
  const nextItems = { ...game.inventory.items };
  const nextEquipmentItems = [...game.inventory.equipmentItems];
  items.forEach((item) => {
    const amount = Math.floor(item.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    const itemId = normalizeItemId(item.itemId);
    const itemConfig = getItem(itemId);
    if (itemConfig.equipment) {
      Array.from({ length: amount }).forEach(() => {
        const instance = createEquipmentInstance(itemId);
        if (instance) {
          nextEquipmentItems.push(instance);
        }
      });
      return;
    }
    nextItems[itemId] = (nextItems[itemId] ?? 0) + amount;
  });
  return {
    ...game,
    inventory: {
      ...game.inventory,
      items: nextItems,
      equipmentItems: nextEquipmentItems,
    },
  };
}

export function removeItems(game: GameState, items: ItemAmount[] = []): GameState {
  const nextItems = { ...game.inventory.items };
  items.forEach((item) => {
    const itemId = normalizeItemId(item.itemId);
    nextItems[itemId] = Math.max(0, (nextItems[itemId] ?? 0) - item.amount);
  });
  return {
    ...game,
    inventory: {
      ...game.inventory,
      items: nextItems,
    },
  };
}

export function hasItems(game: GameState, items: ItemAmount[] = []): boolean {
  return items.every((item) => (game.inventory.items[normalizeItemId(item.itemId)] ?? 0) >= item.amount);
}

export function canAffordCost(game: GameState, cost: Cost): boolean {
  return (game.player.spiritStones >= (cost.spiritStones ?? 0)) && hasItems(game, cost.items);
}

export function spendCost(game: GameState, cost: Cost): GameState {
  const afterItems = removeItems(game, cost.items);
  return {
    ...afterItems,
    player: {
      ...afterItems.player,
      spiritStones: afterItems.player.spiritStones - (cost.spiritStones ?? 0),
    },
  };
}

export function addRewards(
  game: GameState,
  rewards: { cultivation?: number; spiritStones?: number; items?: ItemAmount[] },
): GameState {
  const withItems = addItems(game, rewards.items);
  const currentRealm = getRealm(withItems.player.realmId);
  return {
    ...withItems,
    player: {
      ...withItems.player,
      cultivation: Math.min(currentRealm.requiredCultivation, withItems.player.cultivation + (rewards.cultivation ?? 0)),
      spiritStones: withItems.player.spiritStones + (rewards.spiritStones ?? 0),
    },
  };
}

export function cultivate(game: GameState): GameState {
  const realm = getRealm(game.player.realmId);
  const multiplier = game.world.sectJoined ? 1.12 : 1;
  const gain = Math.max(1, Math.floor(1 * multiplier));
  const nextCultivation = Math.min(realm.requiredCultivation, game.player.cultivation + gain);
  const nextGame = {
    ...game,
    player: {
      ...game.player,
      cultivation: nextCultivation,
      dailyCultivationCount: game.player.dailyCultivationCount + 1,
    },
  };
  return appendLog(nextGame, `你运转周天，修为 +${gain}。`);
}

export function attemptBreakthrough(game: GameState): GameState {
  const currentRealm = getRealm(game.player.realmId);
  const nextRealm = getNextRealm(game.player.realmId);
  if (!nextRealm) {
    return appendLog(game, "你已抵达当前版本境界尽头，仍需静待机缘。");
  }
  if (game.player.cultivation < currentRealm.requiredCultivation) {
    return appendLog(game, `修为尚浅，距离突破还差 ${currentRealm.requiredCultivation - game.player.cultivation}。`);
  }
  if (!canAffordCost(game, nextRealm.breakthroughCost)) {
    return appendLog(game, `突破所需资源不足，先去历练或坊市筹备。`);
  }

  const paidGame = spendCost(game, nextRealm.breakthroughCost);
  const breakthroughRatePct = calculateBreakthroughRatePct(game, nextRealm);
  const success = Math.random() <= breakthroughRatePct / 100;
  if (!success) {
    const isMajorBreakthrough = currentRealm.majorRealmId !== nextRealm.majorRealmId;
    const cultivationRatio = isMajorBreakthrough ? 0.75 : 0.88;
    const vitalRatio = isMajorBreakthrough ? 0.3 : 0.6;
    const mindLoss = isMajorBreakthrough ? 12 : 6;
    const instabilityGain = isMajorBreakthrough ? 2 : 1;
    const injuryGain = isMajorBreakthrough ? 1 : 0;
    return appendLog(
      {
        ...paidGame,
        player: {
          ...paidGame.player,
          cultivation: Math.floor(currentRealm.requiredCultivation * cultivationRatio),
          hp: Math.max(1, Math.floor(paidGame.player.stats.maxHp * vitalRatio)),
          spirit: Math.floor(paidGame.player.stats.maxSpirit * vitalRatio),
          mindValue: clampNumber(paidGame.player.mindValue - mindLoss, 0, 100),
          instabilityStacks: paidGame.player.instabilityStacks + instabilityGain,
          injuryStacks: paidGame.player.injuryStacks + injuryGain,
        },
      },
      isMajorBreakthrough ? "道基反噬，经脉受创，冲击大境界失败。" : "灵气逆冲，经脉震荡，突破失败。",
    );
  }

  const mergedUnlocks = Array.from(new Set<UnlockKey>([...paidGame.player.unlocks, ...nextRealm.unlocks]));
  const nextStats = normalizeStats(nextRealm.baseStats);

  return appendLog(
    {
      ...paidGame,
      player: {
        ...paidGame.player,
        realmId: nextRealm.id,
        cultivation: 0,
        unlocks: mergedUnlocks,
        lifespan: nextRealm.lifespan,
        hp: nextStats.maxHp,
        spirit: nextStats.maxSpirit,
        mindValue: clampNumber(paidGame.player.mindValue + 5, 0, 100),
        instabilityStacks: 0,
        stats: nextStats,
      },
    },
    `金光入体，你突破至 ${nextRealm.name}。`,
  );
}

export function recruitPet(game: GameState): GameState {
  if (game.player.team.some((member) => member.kind === "pet")) {
    return appendLog(game, "青羽狐已在你身侧，无需重复安抚。");
  }
  const pet: TeamMember = {
    id: "pet_green_fox",
    name: "青羽狐",
    kind: "pet",
    stats: { maxHp: 150, maxSpirit: 34, attack: 24, defense: 13, spiritSense: 0, speed: 24, dodgeRate: 0.04, critRate: 0.08, critDamage: 1.5 },
    skillIds: ["bite", "pounce", "guard_master"],
  };
  return appendLog(
    {
      ...game,
      player: {
        ...game.player,
        unlocks: Array.from(new Set([...game.player.unlocks, "pet"])),
        team: [...game.player.team, pet].slice(0, 2),
      },
    },
    "青羽狐低鸣一声，愿随你同行。",
  );
}

export function recruitCompanion(game: GameState): GameState {
  if (game.player.team.some((member) => member.kind === "companion")) {
    return appendLog(game, "顾青萝已加入队伍。");
  }
  if (game.player.team.length >= 2) {
    return appendLog(game, "当前队伍已满，暂不能邀请更多同伴。");
  }
  const companion: TeamMember = {
    id: "companion_gu_qingluo",
    name: "顾青萝",
    kind: "companion",
    stats: { maxHp: 190, maxSpirit: 52, attack: 29, defense: 16, spiritSense: 0, speed: 20, dodgeRate: 0.025, critRate: 0.06, critDamage: 1.5 },
    skillIds: ["basic_strike", "leaf_spell", "rejuvenation"],
  };
  return appendLog(
    {
      ...game,
      player: {
        ...game.player,
        unlocks: Array.from(new Set([...game.player.unlocks, "companion"])),
        team: [...game.player.team, companion],
      },
    },
    "顾青萝饮尽清茶，点头与你结伴而行。",
  );
}

export function joinSect(game: GameState): GameState {
  if (game.world.sectJoined) {
    return appendLog(game, "你已是青云宗外门弟子。");
  }
  const tokenId = "qingyun_token";
  const hasToken = (game.inventory.items[tokenId] ?? 0) > 0;
  const gameWithToken = hasToken ? game : addItems(game, [{ itemId: tokenId, amount: 1 }]);
  return appendLog(
    {
      ...gameWithToken,
      player: {
        ...gameWithToken.player,
        unlocks: Array.from(new Set([...gameWithToken.player.unlocks, "sect"])),
      },
      world: {
        ...gameWithToken.world,
        sectJoined: true,
        sectContribution: gameWithToken.world.sectContribution + 20,
        sectReputation: gameWithToken.world.sectReputation + 5,
      },
    },
    hasToken ? "你递交青云令牌，正式成为青云宗外门弟子。" : "守城修士为你补录令牌，荐你入青云宗外门。",
  );
}

export function describeCost(cost: Cost): string {
  const parts: string[] = [];
  if (cost.spiritStones) {
    parts.push(`灵石 ${cost.spiritStones}`);
  }
  cost.items?.forEach((item) => parts.push(`${formatItemName(getItem(item.itemId))} x${item.amount}`));
  return parts.length ? parts.join("，") : "无";
}
