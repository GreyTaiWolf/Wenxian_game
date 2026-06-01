import { getNextCaveRefineryLevel, normalizeCaveRefineryState } from "../data/caveFacilities";
import type { GameState } from "../types";
import { appendLog, canAffordCost, describeCost, spendCost } from "./state";

export const caveRefineryWorkshopId = "cave_refinery_workshop";

export function upgradeCaveRefinery(game: GameState): GameState {
  const refinery = normalizeCaveRefineryState(game.cave.refinery);
  const nextLevel = getNextCaveRefineryLevel(refinery.level);
  if (!nextLevel?.upgradeCost) {
    return appendLog(game, "炼器室已升至当前版本上限。");
  }
  if (!canAffordCost(game, nextLevel.upgradeCost)) {
    return appendLog(game, `升级炼器室所需资源不足：${describeCost(nextLevel.upgradeCost)}。`);
  }
  const paidGame = spendCost(game, nextLevel.upgradeCost);
  return appendLog(
    {
      ...paidGame,
      cave: {
        ...paidGame.cave,
        refinery: {
          ...refinery,
          level: nextLevel.level,
        },
      },
    },
    `洞府炼器室升至 ${nextLevel.level} 级，炉火更稳，后续打造更省灵石。`,
  );
}
