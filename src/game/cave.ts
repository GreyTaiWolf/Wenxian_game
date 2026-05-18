import { caveBaseCultivationPerMinute, getNextSpiritArrayConfig, getSpiritArrayConfig } from "../data/cave";
import { getRealm } from "../data/progression";
import type { CaveState, GameState } from "../types";
import { appendLog, canAffordCost, createDefaultCaveState, describeCost, spendCost } from "./state";

export interface MeditationPreview {
  isActive: boolean;
  startedAt: string | null;
  elapsedMinutes: number;
  effectiveMinutes: number;
  maxMinutes: number;
  ratePerMinute: number;
  potentialCultivation: number;
  claimableCultivation: number;
  remainingCultivation: number;
  cappedByTime: boolean;
  cappedByRealm: boolean;
}

export function normalizeCaveState(cave: Partial<CaveState> | undefined): CaveState {
  const defaults = createDefaultCaveState();
  return {
    meditationStartedAt: typeof cave?.meditationStartedAt === "string" ? cave.meditationStartedAt : defaults.meditationStartedAt,
    spiritArrayLevel: normalizeSpiritArrayLevel(cave?.spiritArrayLevel),
    totalMeditationMinutes: normalizeNonNegativeInteger(cave?.totalMeditationMinutes),
  };
}

export function getMeditationPreview(game: GameState, now: Date = new Date()): MeditationPreview {
  const cave = normalizeCaveState(game.cave);
  const currentArray = getSpiritArrayConfig(cave.spiritArrayLevel);
  const realm = getRealm(game.player.realmId);
  const remainingCultivation = Math.max(0, realm.requiredCultivation - game.player.cultivation);
  const startedTime = cave.meditationStartedAt ? Date.parse(cave.meditationStartedAt) : Number.NaN;
  const nowTime = now.getTime();
  const elapsedMinutes = Number.isFinite(startedTime) ? Math.max(0, Math.floor((nowTime - startedTime) / 60000)) : 0;
  const effectiveMinutes = Math.min(elapsedMinutes, currentArray.maxMeditationMinutes);
  const ratePerMinute = caveBaseCultivationPerMinute * currentArray.multiplier;
  const potentialCultivation = Math.floor(effectiveMinutes * ratePerMinute);
  const claimableCultivation = Math.min(potentialCultivation, remainingCultivation);

  return {
    isActive: Boolean(cave.meditationStartedAt),
    startedAt: cave.meditationStartedAt,
    elapsedMinutes,
    effectiveMinutes,
    maxMinutes: currentArray.maxMeditationMinutes,
    ratePerMinute,
    potentialCultivation,
    claimableCultivation,
    remainingCultivation,
    cappedByTime: elapsedMinutes > currentArray.maxMeditationMinutes,
    cappedByRealm: potentialCultivation > claimableCultivation,
  };
}

export function startMeditation(game: GameState, now: Date = new Date()): GameState {
  const cave = normalizeCaveState(game.cave);
  const realm = getRealm(game.player.realmId);
  if (game.player.cultivation >= realm.requiredCultivation) {
    return appendLog(game, "当前境界修为已满，先完成突破再继续闭关。");
  }
  if (cave.meditationStartedAt) {
    return appendLog(game, "你已经在闭关中，静待灵气沉入经脉。");
  }
  return appendLog(
    {
      ...game,
      cave: {
        ...cave,
        meditationStartedAt: now.toISOString(),
      },
    },
    "你封闭洞府石门，开始闭关吐纳。",
  );
}

export function claimMeditation(game: GameState, now: Date = new Date()): GameState {
  const cave = normalizeCaveState(game.cave);
  if (!cave.meditationStartedAt) {
    return appendLog(game, "你尚未开始闭关。");
  }

  const preview = getMeditationPreview({ ...game, cave }, now);
  if (preview.remainingCultivation <= 0) {
    return appendLog(
      {
        ...game,
        cave: {
          ...cave,
          meditationStartedAt: null,
        },
      },
      "当前境界修为已满，洞府灵气暂难寸进，先尝试突破。",
    );
  }
  if (preview.claimableCultivation <= 0) {
    return appendLog(game, "闭关时间尚短，灵气还未凝成可领取的修为。");
  }

  const nextCultivation = game.player.cultivation + preview.claimableCultivation;
  return appendLog(
    {
      ...game,
      player: {
        ...game.player,
        cultivation: nextCultivation,
      },
      cave: {
        ...cave,
        meditationStartedAt: null,
        totalMeditationMinutes: cave.totalMeditationMinutes + preview.effectiveMinutes,
      },
    },
    `你出关调息，闭关 ${formatMeditationMinutes(preview.effectiveMinutes)}，修为 +${preview.claimableCultivation}。`,
  );
}

export function upgradeSpiritArray(game: GameState): GameState {
  const cave = normalizeCaveState(game.cave);
  const nextArray = getNextSpiritArrayConfig(cave.spiritArrayLevel);
  if (!nextArray || !nextArray.upgradeCost) {
    return appendLog(game, "聚灵阵已升至当前版本上限。");
  }
  if (!canAffordCost(game, nextArray.upgradeCost)) {
    return appendLog(game, `升级聚灵阵所需资源不足：${describeCost(nextArray.upgradeCost)}。`);
  }

  const paidGame = spendCost(game, nextArray.upgradeCost);
  return appendLog(
    {
      ...paidGame,
      cave: {
        ...cave,
        spiritArrayLevel: nextArray.level,
      },
    },
    `聚灵阵升至 ${nextArray.level} 级，闭关效率提升至 ${Math.round(nextArray.multiplier * 100)}%。`,
  );
}

function normalizeSpiritArrayLevel(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(3, Math.floor(value ?? 0)));
}

function normalizeNonNegativeInteger(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value ?? 0));
}

function formatMeditationMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes > 0 ? `${hours} 小时 ${restMinutes} 分钟` : `${hours} 小时`;
}
