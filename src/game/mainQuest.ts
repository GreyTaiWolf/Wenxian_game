import {
  mainQuestStageOrder,
  mainQuestStages,
  type MainQuestStageDefinition,
  type MainQuestStageId,
} from "../data/mainQuest";
import { getRealm, isRealmAtLeast, realms } from "../data/progression";
import type { GameState } from "../types";

export interface MainQuestProgress {
  current: number;
  target: number;
  percent: number;
  label: string;
}

export interface MainQuestView extends MainQuestStageDefinition {
  stageNumber: number;
  stageCount: number;
  status: "active" | "chapterComplete";
  progress: MainQuestProgress;
  nextUnlock: string;
}

const southRidgeTaskIds = [
  "collect_miasma_flower",
  "purge_baicao_vines",
  "patrol_beast_mountain",
  "investigate_tide_cave",
];

export function getMainQuest(game: GameState): MainQuestView {
  const stageCount = mainQuestStageOrder.length;
  const activeIndex = mainQuestStageOrder.findIndex((stageId) => !isMainQuestStageComplete(game, stageId));

  if (activeIndex < 0) {
    const definition = mainQuestStages.current_version_complete;
    return {
      ...definition,
      stageNumber: stageCount,
      stageCount,
      status: "chapterComplete",
      progress: createProgress(1, 1, "当前版本主线已完成"),
      nextUnlock: getUpcomingUnlockHint(game),
    };
  }

  const stageId = mainQuestStageOrder[activeIndex];
  return {
    ...mainQuestStages[stageId],
    stageNumber: activeIndex + 1,
    stageCount,
    status: "active",
    progress: getMainQuestStageProgress(game, stageId),
    nextUnlock: getUpcomingUnlockHint(game),
  };
}

export function isMainQuestStageComplete(game: GameState, stageId: MainQuestStageId): boolean {
  const reachedQiMiddle = isRealmAtLeast(game.player.realmId, "qi_middle");
  const reachedFoundation = isRealmAtLeast(game.player.realmId, "foundation_early");

  switch (stageId) {
    case "awaken_and_cultivate":
      return game.player.cultivation > 0 || reachedQiMiddle;
    case "accept_herb_commission":
      return getTaskStatus(game, "collect_qi_grass") !== "available" || reachedQiMiddle;
    case "gather_qi_grass":
      return getTaskStatus(game, "collect_qi_grass") === "completed" || (game.inventory.items.qi_grass ?? 0) >= 2 || reachedQiMiddle;
    case "turn_in_herb_commission":
      return getTaskStatus(game, "collect_qi_grass") === "completed" || reachedQiMiddle;
    case "accept_black_wind_commission":
      return getTaskStatus(game, "hunt_black_wind") !== "available" || reachedQiMiddle;
    case "hunt_black_wind":
      return getTaskStatus(game, "hunt_black_wind") === "completed" || (game.inventory.items.beast_bone ?? 0) >= 1 || reachedQiMiddle;
    case "turn_in_black_wind_commission":
      return getTaskStatus(game, "hunt_black_wind") === "completed" || reachedQiMiddle;
    case "breakthrough_qi_middle":
      return reachedQiMiddle;
    case "explore_ancient_cave":
      return reachedFoundation || (game.inventory.items.foundation_pill ?? 0) >= 1;
    case "join_qingyun_sect":
      return game.world.sectJoined;
    case "reach_foundation":
      return reachedFoundation;
    case "enter_south_ridge":
      return game.world.regionId === "south_ridge" || getCompletedSouthRidgeTaskCount(game) > 0;
    case "establish_south_ridge":
      return isRealmAtLeast(game.player.realmId, "foundation_middle") || getCompletedSouthRidgeTaskCount(game) >= 2;
    case "current_version_complete":
      return isRealmAtLeast(game.player.realmId, "foundation_middle") || getCompletedSouthRidgeTaskCount(game) >= 2;
    default:
      return false;
  }
}

function getMainQuestStageProgress(game: GameState, stageId: MainQuestStageId): MainQuestProgress {
  switch (stageId) {
    case "awaken_and_cultivate":
      return createProgress(game.player.cultivation > 0 ? 1 : 0, 1, game.player.cultivation > 0 ? "已完成首次聚气" : "完成一次聚气");
    case "accept_herb_commission":
      return createTaskStateProgress(game, "collect_qi_grass", "等待接取采药委托");
    case "gather_qi_grass": {
      const amount = Math.min(2, game.inventory.items.qi_grass ?? 0);
      return createProgress(amount, 2, `凝气草 ${amount}/2`);
    }
    case "turn_in_herb_commission":
      return createProgress(getTaskStatus(game, "collect_qi_grass") === "completed" ? 1 : 0, 1, "返回任务榜交付凝气草");
    case "accept_black_wind_commission":
      return createTaskStateProgress(game, "hunt_black_wind", "等待接取黑风山委托");
    case "hunt_black_wind": {
      const amount = Math.min(1, game.inventory.items.beast_bone ?? 0);
      return createProgress(amount, 1, `妖兽骨 ${amount}/1`);
    }
    case "turn_in_black_wind_commission":
      return createProgress(getTaskStatus(game, "hunt_black_wind") === "completed" ? 1 : 0, 1, "返回任务榜交付妖兽骨");
    case "breakthrough_qi_middle": {
      const realm = getRealm(game.player.realmId);
      return createProgress(
        Math.min(realm.requiredCultivation, game.player.cultivation),
        realm.requiredCultivation,
        `修为 ${game.player.cultivation}/${realm.requiredCultivation} · 灵石 ${game.player.spiritStones}/80`,
      );
    }
    case "explore_ancient_cave": {
      const amount = Math.min(1, game.inventory.items.foundation_pill ?? 0);
      return createProgress(amount, 1, `筑基丹 ${amount}/1`);
    }
    case "join_qingyun_sect":
      return createProgress(game.world.sectJoined ? 1 : 0, 1, game.world.sectJoined ? "已加入青云宗" : "尚未建立宗门身份");
    case "reach_foundation":
      return getRealmJourneyProgress(game, "qi_middle", "foundation_early");
    case "enter_south_ridge":
      return createProgress(game.world.regionId === "south_ridge" ? 1 : 0, 1, game.world.regionId === "south_ridge" ? "已抵达南疆" : "尚在中州");
    case "establish_south_ridge": {
      const completed = Math.min(2, getCompletedSouthRidgeTaskCount(game));
      return createProgress(completed, 2, `南疆悬赏 ${completed}/2`);
    }
    case "current_version_complete":
      return createProgress(1, 1, "当前版本主线已完成");
    default:
      return createProgress(0, 1, "继续推进主线");
  }
}

function createTaskStateProgress(game: GameState, taskId: string, availableLabel: string): MainQuestProgress {
  const status = getTaskStatus(game, taskId);
  if (status === "completed") {
    return createProgress(1, 1, "任务已完成");
  }
  if (status === "accepted") {
    return createProgress(1, 1, "任务已接取");
  }
  return createProgress(0, 1, availableLabel);
}

function createProgress(current: number, target: number, label: string): MainQuestProgress {
  const safeTarget = Math.max(1, target);
  const safeCurrent = Math.min(safeTarget, Math.max(0, current));
  return {
    current: safeCurrent,
    target: safeTarget,
    percent: Math.round((safeCurrent / safeTarget) * 100),
    label,
  };
}

function getTaskStatus(game: GameState, taskId: string): "available" | "accepted" | "completed" {
  return game.world.tasks[taskId]?.status ?? "available";
}

function getCompletedSouthRidgeTaskCount(game: GameState): number {
  return southRidgeTaskIds.filter((taskId) => getTaskStatus(game, taskId) === "completed").length;
}

function getRealmJourneyProgress(game: GameState, startRealmId: string, targetRealmId: string): MainQuestProgress {
  const startIndex = realms.findIndex((realm) => realm.id === startRealmId);
  const currentIndex = realms.findIndex((realm) => realm.id === game.player.realmId);
  const targetIndex = realms.findIndex((realm) => realm.id === targetRealmId);

  if (startIndex < 0 || currentIndex < 0 || targetIndex <= startIndex) {
    return createProgress(0, 1, getRealm(game.player.realmId).name);
  }

  const total = realms.slice(startIndex, targetIndex).reduce((sum, realm) => sum + realm.requiredCultivation, 0);
  if (currentIndex >= targetIndex) {
    return createProgress(total, total, `已达到 ${getRealm(targetRealmId).name}`);
  }

  const completedRealmCultivation = realms
    .slice(startIndex, Math.max(startIndex, currentIndex))
    .reduce((sum, realm) => sum + realm.requiredCultivation, 0);
  const current = completedRealmCultivation + (currentIndex >= startIndex ? game.player.cultivation : 0);
  return createProgress(current, total, `${getRealm(game.player.realmId).name} · 修行路程 ${current}/${total}`);
}

function getUpcomingUnlockHint(game: GameState): string {
  if (!game.world.sectJoined) {
    return "下一解锁：加入青云宗后开放宗门页与宗门修炼加成";
  }
  if (!game.player.unlocks.includes("pet")) {
    return "下一解锁：炼气圆满开放灵宠系统";
  }
  if (!game.player.unlocks.includes("cave")) {
    return "下一解锁：筑基初期开放洞府与闭关";
  }
  if (!game.player.unlocks.includes("companion")) {
    return "下一解锁：筑基中期开放同伴编队";
  }
  return "后续方向：结丹境、炼丹、灵田与跨州主线";
}
