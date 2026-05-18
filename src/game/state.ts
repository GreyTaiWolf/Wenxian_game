import { formatItemName, getItem, normalizeItemId } from "../data/items";
import { getNextRealm, getRealm } from "../data/progression";
import type { ActorKind, CaveState, CombatLoadout, Cost, GameState, ItemAmount, PlayerState, Stats, TeamMember, UnlockKey } from "../types";

export const starterStats: Stats = {
  maxHp: 220,
  maxSpirit: 42,
  attack: 34,
  defense: 18,
  divineSense: 15,
  speed: 18,
  dodge: 0.05,
  crit: 0.06,
};

export function getDefaultDodge(kind: ActorKind = "player"): number {
  if (kind === "pet") {
    return 0.08;
  }
  if (kind === "beast") {
    return 0.04;
  }
  if (kind === "enemyCultivator") {
    return 0.05;
  }
  if (kind === "companion") {
    return 0.05;
  }
  return 0.05;
}

export function normalizeStats(stats: Partial<Stats> | undefined, fallback: Partial<Stats> = starterStats): Stats {
  return {
    maxHp: stats?.maxHp ?? fallback.maxHp ?? starterStats.maxHp,
    maxSpirit: stats?.maxSpirit ?? fallback.maxSpirit ?? starterStats.maxSpirit,
    attack: stats?.attack ?? fallback.attack ?? starterStats.attack,
    defense: stats?.defense ?? fallback.defense ?? starterStats.defense,
    divineSense: stats?.divineSense ?? fallback.divineSense ?? starterStats.divineSense,
    speed: stats?.speed ?? fallback.speed ?? starterStats.speed,
    dodge: stats?.dodge ?? fallback.dodge ?? starterStats.dodge,
    crit: stats?.crit ?? fallback.crit ?? starterStats.crit,
  };
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

export function createNewGame(name: string): GameState {
  return {
    player: {
      name,
      realmId: "qi_early",
      cultivation: 0,
      power: 96,
      lifespanCurrent: 18,
      lifespanMax: 120,
      mood: "稳定",
      spiritStones: 120,
      stats: starterStats,
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
        weapon: "rough_iron_sword",
        robe: "cloth_robe",
        crown: null,
        shoes: "cloth_shoes",
        accessory: null,
        treasure: null,
      },
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
  items.forEach((item) => {
    const itemId = normalizeItemId(item.itemId);
    nextItems[itemId] = (nextItems[itemId] ?? 0) + item.amount;
  });
  return {
    ...game,
    inventory: {
      ...game.inventory,
      items: nextItems,
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
  const success = Math.random() <= nextRealm.successRate;
  if (!success) {
    return appendLog(
      {
        ...paidGame,
        player: {
          ...paidGame.player,
          mood: "略有波动",
          cultivation: Math.floor(currentRealm.requiredCultivation * 0.82),
        },
      },
      "灵气逆冲，经脉震荡，突破失败。",
    );
  }

  const mergedUnlocks = Array.from(new Set<UnlockKey>([...paidGame.player.unlocks, ...nextRealm.unlocks]));
  const nextStats = {
    ...paidGame.player.stats,
    maxHp: paidGame.player.stats.maxHp + 56,
    maxSpirit: paidGame.player.stats.maxSpirit + 16,
    attack: paidGame.player.stats.attack + 9,
    defense: paidGame.player.stats.defense + 5,
    divineSense: paidGame.player.stats.divineSense + 4,
    speed: paidGame.player.stats.speed + 2,
    dodge: paidGame.player.stats.dodge + 0.01,
  };

  return appendLog(
    {
      ...paidGame,
      player: {
        ...paidGame.player,
        realmId: nextRealm.id,
        cultivation: 0,
        unlocks: mergedUnlocks,
        power: paidGame.player.power + 180,
        mood: "稳定",
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
    stats: { maxHp: 150, maxSpirit: 34, attack: 24, defense: 13, divineSense: 8, speed: 24, dodge: 0.09, crit: 0.08 },
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
    stats: { maxHp: 190, maxSpirit: 52, attack: 29, defense: 16, divineSense: 21, speed: 20, dodge: 0.05, crit: 0.06 },
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
