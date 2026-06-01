import {
  getMountConfig,
  getMountYardLevel,
  getNextMountYardLevel,
  normalizeMountYardState,
} from "../data/caveFacilities";
import type { Cost, GameState, GridCell, GridMapData, MountInstance } from "../types";
import { appendLog, canAffordCost, describeCost, spendCost } from "./state";
import { getGridMoveHours } from "../data/time";

export function setActiveMount(game: GameState, mountId: string): GameState {
  const yard = normalizeMountYardState(game.cave.mountYard);
  if (!yard.mounts.some((mount) => mount.mountId === mountId)) {
    return appendLog(game, "坐骑苑中没有这只坐骑。");
  }
  const config = getMountConfig(mountId);
  return appendLog(
    {
      ...game,
      cave: {
        ...game.cave,
        mountYard: {
          ...yard,
          activeMountId: mountId,
        },
      },
    },
    `${config?.name ?? "坐骑"}已随行，长途行路耗时降低。`,
  );
}

export function trainMount(game: GameState, mountId: string): GameState {
  const yard = normalizeMountYardState(game.cave.mountYard);
  const mount = yard.mounts.find((item) => item.mountId === mountId);
  const config = getMountConfig(mountId);
  if (!mount || !config) {
    return appendLog(game, "坐骑苑中没有这只坐骑。");
  }
  const levelConfig = getMountYardLevel(yard.level);
  const cost = getMountTrainCost(mount);
  if (!canAffordCost(game, cost)) {
    return appendLog(game, `驯养${config.name}所需不足：${describeCost(cost)}。`);
  }
  const paidGame = spendCost(game, cost);
  const nextMount: MountInstance = {
    ...mount,
    level: Math.min(levelConfig.maxMountLevel, mount.level + 1),
    intimacy: Math.min(100, mount.intimacy + 6),
  };
  return appendLog(
    {
      ...paidGame,
      cave: {
        ...paidGame.cave,
        mountYard: {
          ...yard,
          mounts: yard.mounts.map((item) => (item.mountId === mountId ? nextMount : item)),
        },
      },
    },
    `${config.name}绕苑奔行一周，等级 ${mount.level} -> ${nextMount.level}，默契 +6。`,
  );
}

export function upgradeMountYard(game: GameState): GameState {
  const yard = normalizeMountYardState(game.cave.mountYard);
  const nextLevel = getNextMountYardLevel(yard.level);
  if (!nextLevel?.upgradeCost) {
    return appendLog(game, "坐骑苑已升至当前版本上限。");
  }
  if (!canAffordCost(game, nextLevel.upgradeCost)) {
    return appendLog(game, `升级坐骑苑所需资源不足：${describeCost(nextLevel.upgradeCost)}。`);
  }
  const paidGame = spendCost(game, nextLevel.upgradeCost);
  return appendLog(
    {
      ...paidGame,
      cave: {
        ...paidGame.cave,
        mountYard: {
          ...yard,
          level: nextLevel.level,
        },
      },
    },
    `坐骑苑升至 ${nextLevel.level} 级，坐骑训练上限提高。`,
  );
}

export function getMountedGridMoveHours(game: GameState, map: Pick<GridMapData, "cellDistance" | "cellDistanceUnit">, cell?: Pick<GridCell, "movementCost" | "terrain">): number {
  const baseHours = getGridMoveHours(map, cell);
  const reduction = getActiveMountTravelReduction(game, cell?.terrain);
  return Math.max(0, Math.ceil(baseHours * (1 - reduction)));
}

export function getActiveMountTravelReduction(game: GameState, terrain?: GridCell["terrain"]): number {
  const yard = normalizeMountYardState(game.cave.mountYard);
  const activeMount = yard.mounts.find((mount) => mount.mountId === yard.activeMountId);
  if (!activeMount) {
    return 0;
  }
  const config = getMountConfig(activeMount.mountId);
  if (!config) {
    return 0;
  }
  if (terrain && config.blockedTerrains.includes(terrain)) {
    return 0;
  }
  const base = config.baseTravelReduction + activeMount.level * config.travelReductionPerLevel;
  const terrainBonus = terrain ? config.terrainBonus[terrain] ?? 0 : 0;
  return Math.min(config.maxTravelReduction, Math.max(0, base + terrainBonus));
}

export function getActiveMountLabel(game: GameState): string | null {
  const yard = normalizeMountYardState(game.cave.mountYard);
  const mount = yard.mounts.find((item) => item.mountId === yard.activeMountId);
  const config = mount ? getMountConfig(mount.mountId) : null;
  return config && mount ? `${config.name} Lv.${mount.level}` : null;
}

export function getMountTrainCost(mount: MountInstance): Cost {
  const config = getMountConfig(mount.mountId);
  return {
    spiritStones: 35 + mount.level * 15,
    items: [{ itemId: config?.feedItemId ?? "spirit_herb", amount: 1 + Math.floor(mount.level / 8) }],
  };
}
