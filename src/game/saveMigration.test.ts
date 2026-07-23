import { beforeEach, describe, expect, it } from "vitest";
import { CENTRAL_GRID_MAP_ID, getGridMapData } from "../data/gridMaps";
import { getGridPathTravelHours, getPathMovementSteps, findPathAStar } from "./gridNavigation";
import { getEffectiveStats } from "./equipment";
import { createNewGame } from "./state";
import { SAVE_KEY, loadRootSave } from "./save";

function installFakeWindow(initialValue: string) {
  const storage = new Map<string, string>([[SAVE_KEY, initialValue]]);
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
      location: { search: "", href: "http://localhost/" },
      history: { replaceState: () => undefined },
    },
  });
}

function legacyRoot(slots: unknown[]) {
  return JSON.stringify({
    version: 3,
    recentSlotId: "slot_1",
    settings: { textSize: "normal", motion: true, autoSave: true },
    slots,
  });
}

describe("V4 存档迁移", () => {
  beforeEach(() => {
    installFakeWindow(legacyRoot([]));
  });

  it("旧档自动补齐路途、首杀与结算字段", () => {
    const game = JSON.parse(JSON.stringify(createNewGame("旧档修士"))) as {
      world: {
        activeTravel?: unknown;
        pendingTravelEvent?: unknown;
        travelEventHistory?: unknown;
        eventFlags?: unknown;
        encounterWins?: unknown;
      };
    };
    delete game.world.activeTravel;
    delete game.world.pendingTravelEvent;
    delete game.world.travelEventHistory;
    delete game.world.eventFlags;
    delete game.world.encounterWins;
    installFakeWindow(
      legacyRoot([
        {
          id: "slot_1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          game,
        },
        null,
        null,
      ]),
    );

    const loaded = loadRootSave();
    const migrated = loaded.slots[0]?.game;
    expect(loaded.version).toBe(4);
    expect(migrated?.world.activeTravel).toBeNull();
    expect(migrated?.world.pendingTravelEvent).toBeNull();
    expect(migrated?.world.travelEventHistory).toEqual([]);
    expect(migrated?.world.eventFlags).toEqual({});
    expect(migrated?.world.encounterWins).toEqual({});
  });

  it("单个损坏槽位不会清空其他存档", () => {
    const validGame = createNewGame("幸存修士");
    installFakeWindow(
      legacyRoot([
        { id: "slot_1", createdAt: "", updatedAt: "", game: null },
        {
          id: "slot_2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          game: validGame,
        },
        null,
      ]),
    );

    const loaded = loadRootSave();
    expect(loaded.slots[0]).toBeNull();
    expect(loaded.slots[1]?.game.player.name).toBe("幸存修士");
    expect(loaded.recentSlotId).toBe("slot_2");
  });

  it("读档后保留有效的进行中格子旅程", () => {
    const game = createNewGame("远行修士");
    const map = getGridMapData(CENTRAL_GRID_MAP_ID);
    expect(map).toBeDefined();
    if (!map) {
      return;
    }
    const current = game.world.navigation.positions[CENTRAL_GRID_MAP_ID];
    const path = getPathMovementSteps(findPathAStar(map, current, { x: current.x + 3, y: current.y }));
    const target = path[path.length - 1];
    expect(path.length).toBeGreaterThan(0);
    if (!target) {
      return;
    }
    game.world.navigation.activeMapId = CENTRAL_GRID_MAP_ID;
    game.world.activeTravel = {
      mapId: CENTRAL_GRID_MAP_ID,
      target,
      path,
      totalSteps: path.length,
      totalHours: getGridPathTravelHours(map, path),
      originLocationId: game.world.locationId,
      intent: { kind: "locationPreview", regionId: "central", locationId: "tian_xuan_gate" },
      adjusted: false,
    };
    installFakeWindow(
      legacyRoot([
        {
          id: "slot_1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          game,
        },
        null,
        null,
      ]),
    );

    const loadedTravel = loadRootSave().slots[0]?.game.world.activeTravel;
    expect(loadedTravel?.mapId).toBe(CENTRAL_GRID_MAP_ID);
    expect(loadedTravel?.path).toEqual(path);
    expect(loadedTravel?.intent).toEqual({ kind: "locationPreview", regionId: "central", locationId: "tian_xuan_gate" });
  });

  it("装备提高的气血与灵力上限不会在重载时按基础上限截断", () => {
    const game = createNewGame("养器修士");
    const robe = game.inventory.equipmentItems.find((instance) => instance.id === game.inventory.equipment.robe);
    expect(robe).toBeDefined();
    if (!robe) {
      return;
    }
    robe.mainStats = { ...robe.mainStats, maxHp: 80, maxSpirit: 20 };
    robe.bonuses = { ...robe.bonuses, maxHp: 80, maxSpirit: 20 };
    const effectiveStats = getEffectiveStats(game);
    game.player.hp = effectiveStats.maxHp;
    game.player.spirit = effectiveStats.maxSpirit;
    installFakeWindow(
      legacyRoot([
        {
          id: "slot_1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          game,
        },
        null,
        null,
      ]),
    );

    const loaded = loadRootSave().slots[0]?.game;
    expect(loaded?.player.hp).toBe(effectiveStats.maxHp);
    expect(loaded?.player.spirit).toBe(effectiveStats.maxSpirit);
  });

  it("非法冷却表会在读档时恢复为空表", () => {
    const game = createNewGame("稳档修士");
    game.world.passive.eventCooldowns = null as unknown as Record<string, number>;
    game.world.passive.questDeadlines = null as unknown as Record<string, number>;
    installFakeWindow(
      legacyRoot([
        {
          id: "slot_1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          game,
        },
        null,
        null,
      ]),
    );

    const loaded = loadRootSave().slots[0]?.game.world.passive;
    expect(loaded?.eventCooldowns).toEqual({});
    expect(loaded?.questDeadlines).toEqual({});
  });
});
