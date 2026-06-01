import {
  getBeastStableLevel,
  getNextBeastStableLevel,
  getPetConfig,
  normalizeBeastStableState,
} from "../data/caveFacilities";
import { formatItemName } from "../data/items";
import type { CavePetInstance, Cost, GameState, Stats, TeamMember } from "../types";
import { appendLog, canAffordCost, describeCost, spendCost } from "./state";

export function syncActivePetToTeam(game: GameState): GameState {
  const stable = normalizeBeastStableState(game.cave.beastStable, game.player.team);
  const activePet = stable.pets.find((pet) => pet.petId === stable.activePetId) ?? null;
  const nonPetTeam = game.player.team.filter((member) => member.kind !== "pet");
  const activeMember = activePet ? createPetTeamMember(activePet) : null;
  const nextTeam = activeMember ? [activeMember, ...nonPetTeam].slice(0, 2) : nonPetTeam.slice(0, 2);
  return {
    ...game,
    player: {
      ...game.player,
      unlocks: stable.pets.length ? Array.from(new Set([...game.player.unlocks, "pet"])) : game.player.unlocks,
      team: nextTeam,
    },
    cave: {
      ...game.cave,
      beastStable: stable,
    },
  };
}

export function setActivePet(game: GameState, petId: string): GameState {
  const stable = normalizeBeastStableState(game.cave.beastStable, game.player.team);
  if (!stable.pets.some((pet) => pet.petId === petId)) {
    return appendLog(game, "灵兽栏中没有这只灵宠。");
  }
  const config = getPetConfig(petId);
  const nextGame = syncActivePetToTeam({
    ...game,
    cave: {
      ...game.cave,
      beastStable: {
        ...stable,
        activePetId: petId,
      },
    },
  });
  return appendLog(nextGame, `${config?.name ?? "灵宠"}已随你出战。`);
}

export function feedPet(game: GameState, petId: string): GameState {
  const stable = normalizeBeastStableState(game.cave.beastStable, game.player.team);
  const pet = stable.pets.find((item) => item.petId === petId);
  const config = getPetConfig(petId);
  if (!pet || !config) {
    return appendLog(game, "灵兽栏中没有这只灵宠。");
  }
  const levelConfig = getBeastStableLevel(stable.level);
  const cost = getPetFeedCost(pet);
  if (!canAffordCost(game, cost)) {
    return appendLog(game, `喂养${config.name}所需不足：${describeCost(cost)}。`);
  }
  const paidGame = spendCost(game, cost);
  const nextPet: CavePetInstance = {
    ...pet,
    level: Math.min(levelConfig.maxPetLevel, pet.level + 1),
    intimacy: Math.min(100, pet.intimacy + 8),
  };
  const nextGame = syncActivePetToTeam({
    ...paidGame,
    cave: {
      ...paidGame.cave,
      beastStable: {
        ...stable,
        pets: stable.pets.map((item) => (item.petId === petId ? nextPet : item)),
      },
    },
  });
  return appendLog(nextGame, `${config.name}吞下灵食，等级 ${pet.level} -> ${nextPet.level}，亲密 +8。`);
}

export function breakthroughPet(game: GameState, petId: string): GameState {
  const stable = normalizeBeastStableState(game.cave.beastStable, game.player.team);
  const pet = stable.pets.find((item) => item.petId === petId);
  const config = getPetConfig(petId);
  if (!pet || !config) {
    return appendLog(game, "灵兽栏中没有这只灵宠。");
  }
  const requiredLevel = Math.max(5, (pet.breakthrough + 1) * 5);
  if (pet.level < requiredLevel) {
    return appendLog(game, `${config.name}至少需要 ${requiredLevel} 级才能进阶。`);
  }
  const cost: Cost = {
    spiritStones: 240 + pet.breakthrough * 180,
    items: [{ itemId: "demon_core_shard", amount: 1 + pet.breakthrough }],
  };
  if (!canAffordCost(game, cost)) {
    return appendLog(game, `灵宠进阶所需不足：${describeCost(cost)}。`);
  }
  const paidGame = spendCost(game, cost);
  const nextPet: CavePetInstance = {
    ...pet,
    breakthrough: pet.breakthrough + 1,
    intimacy: Math.min(100, pet.intimacy + 15),
  };
  const nextGame = syncActivePetToTeam({
    ...paidGame,
    cave: {
      ...paidGame.cave,
      beastStable: {
        ...stable,
        pets: stable.pets.map((item) => (item.petId === petId ? nextPet : item)),
      },
    },
  });
  return appendLog(nextGame, `${config.name}妖丹灵纹一亮，完成第 ${nextPet.breakthrough} 次进阶。`);
}

export function upgradeBeastStable(game: GameState): GameState {
  const stable = normalizeBeastStableState(game.cave.beastStable, game.player.team);
  const nextLevel = getNextBeastStableLevel(stable.level);
  if (!nextLevel?.upgradeCost) {
    return appendLog(game, "灵兽栏已升至当前版本上限。");
  }
  if (!canAffordCost(game, nextLevel.upgradeCost)) {
    return appendLog(game, `升级灵兽栏所需资源不足：${describeCost(nextLevel.upgradeCost)}。`);
  }
  const paidGame = spendCost(game, nextLevel.upgradeCost);
  return appendLog(
    {
      ...paidGame,
      cave: {
        ...paidGame.cave,
        beastStable: {
          ...stable,
          level: nextLevel.level,
        },
      },
    },
    `灵兽栏升至 ${nextLevel.level} 级，可容纳更多灵宠并提高养成等级上限。`,
  );
}

export function getPetFeedCost(pet: CavePetInstance): Cost {
  const config = getPetConfig(pet.petId);
  return {
    spiritStones: 40 + pet.level * 20,
    items: [{ itemId: config?.feedItemId ?? "beast_bone", amount: 1 + Math.floor(pet.level / 5) }],
  };
}

export function getPetPowerMultiplier(pet: CavePetInstance): number {
  return 1 + pet.level * 0.04 + pet.breakthrough * 0.12 + pet.intimacy / 1000;
}

export function createPetTeamMember(pet: CavePetInstance): TeamMember | null {
  const config = getPetConfig(pet.petId);
  if (!config) {
    return null;
  }
  return {
    id: config.id,
    name: config.name,
    kind: "pet",
    stats: scalePetStats(config.baseStats, getPetPowerMultiplier(pet)),
    skillIds: config.skillIds,
  };
}

function scalePetStats(stats: Stats, multiplier: number): Stats {
  return {
    maxHp: Math.round(stats.maxHp * multiplier),
    maxSpirit: Math.round(stats.maxSpirit * multiplier),
    attack: Math.round(stats.attack * multiplier),
    defense: Math.round(stats.defense * multiplier),
    spiritSense: Math.round(stats.spiritSense * multiplier),
    speed: Math.round(stats.speed * (1 + (multiplier - 1) * 0.5)),
    dodgeRate: Math.min(0.65, stats.dodgeRate * (1 + (multiplier - 1) * 0.35)),
    critRate: Math.min(0.75, stats.critRate * (1 + (multiplier - 1) * 0.35)),
    critDamage: stats.critDamage,
  };
}

export function formatPetFeedCost(pet: CavePetInstance): string {
  const cost = getPetFeedCost(pet);
  const parts: string[] = [];
  if (cost.spiritStones) {
    parts.push(`灵石 ${cost.spiritStones}`);
  }
  cost.items?.forEach((item) => parts.push(`${formatItemName(item.itemId)} x${item.amount}`));
  return parts.join("，");
}
