import { CALENDAR_DAYS_PER_MONTH, CALENDAR_MONTHS_PER_YEAR, calendarMonthNames } from "../data/time";
import { formatItemName, getItem } from "../data/items";
import { getShopConfig, type ShopConfig, type ShopItem } from "../data/world";
import type { CalendarState, GameState, ShopRuntimeState } from "../types";
import { addItems, appendLog } from "./state";

export interface ShopRefreshInfo {
  cycleKey: string;
  label: string;
  nextRefreshDayIndex: number | null;
  remainingDays: number | null;
}

export interface ShopDisplayItem {
  item: ReturnType<typeof getItem>;
  shopItem: ShopItem;
  bought: number;
  remaining: number | null;
  soldOut: boolean;
}

export function normalizeShopStates(input: unknown): Record<string, ShopRuntimeState> {
  if (!input || typeof input !== "object") {
    return {};
  }
  return Object.entries(input as Record<string, Partial<ShopRuntimeState>>).reduce<Record<string, ShopRuntimeState>>((acc, [shopId, state]) => {
    if (!state || typeof state !== "object") {
      return acc;
    }
    const purchases =
      state.purchases && typeof state.purchases === "object"
        ? Object.entries(state.purchases).reduce<Record<string, number>>((purchaseAcc, [itemId, value]) => {
            const amount = Math.max(0, Math.floor(Number(value) || 0));
            if (amount > 0) {
              purchaseAcc[itemId] = amount;
            }
            return purchaseAcc;
          }, {})
        : {};
    acc[shopId] = {
      cycleKey: typeof state.cycleKey === "string" ? state.cycleKey : "legacy",
      purchases,
    };
    return acc;
  }, {});
}

export function getShopRefreshInfo(config: ShopConfig, calendar: CalendarState): ShopRefreshInfo {
  if (config.refreshInterval === "none") {
    return {
      cycleKey: "permanent",
      label: "不刷新",
      nextRefreshDayIndex: null,
      remainingDays: null,
    };
  }

  if (config.refreshInterval === "seasonal") {
    const seasonIndex = Math.floor((calendar.month - 1) / 3);
    const nextSeasonMonth = seasonIndex >= 3 ? 1 : seasonIndex * 3 + 4;
    const nextYear = seasonIndex >= 3 ? calendar.year + 1 : calendar.year;
    const nextRefreshDayIndex = toDayIndex(nextYear, nextSeasonMonth, 1);
    const monthName = calendarMonthNames[nextSeasonMonth - 1] ?? `${nextSeasonMonth}月`;
    return {
      cycleKey: `${calendar.year}-s${seasonIndex + 1}`,
      label: `每季刷新 · 下次 ${monthName}初一`,
      nextRefreshDayIndex,
      remainingDays: Math.max(0, nextRefreshDayIndex - calendar.dayIndex),
    };
  }

  const nextMonth = calendar.month >= CALENDAR_MONTHS_PER_YEAR ? 1 : calendar.month + 1;
  const nextYear = calendar.month >= CALENDAR_MONTHS_PER_YEAR ? calendar.year + 1 : calendar.year;
  const nextRefreshDayIndex = toDayIndex(nextYear, nextMonth, 1);
  const monthName = calendarMonthNames[nextMonth - 1] ?? `${nextMonth}月`;
  return {
    cycleKey: `${calendar.year}-m${calendar.month}`,
    label: `每月刷新 · 下次 ${monthName}初一`,
    nextRefreshDayIndex,
    remainingDays: Math.max(0, nextRefreshDayIndex - calendar.dayIndex),
  };
}

export function getShopDisplayItems(game: GameState, config: ShopConfig): ShopDisplayItem[] {
  const refresh = getShopRefreshInfo(config, game.world.calendar);
  const runtime = getCurrentShopRuntime(game, config, refresh.cycleKey);
  return config.items
    .filter((shopItem) => !shopItem.regionId || shopItem.regionId === game.world.regionId)
    .map((shopItem) => {
      const item = getItem(shopItem.itemId);
      const bought = runtime.purchases[shopItem.itemId] ?? 0;
      const remaining = typeof shopItem.stock === "number" ? Math.max(0, shopItem.stock - bought) : null;
      return {
        item,
        shopItem,
        bought,
        remaining,
        soldOut: remaining !== null && remaining <= 0,
      };
    });
}

export function buyShopItem(game: GameState, shopId: string, itemId: string): GameState {
  const config = getShopConfig(shopId, game.world.regionId);
  const shopItem = config.items.find((item) => item.itemId === itemId && (!item.regionId || item.regionId === game.world.regionId));
  if (!shopItem) {
    return appendLog(game, "此处暂时没有这件货物。");
  }
  const item = getItem(shopItem.itemId);
  const refresh = getShopRefreshInfo(config, game.world.calendar);
  const runtime = getCurrentShopRuntime(game, config, refresh.cycleKey);
  const bought = runtime.purchases[shopItem.itemId] ?? 0;
  const remaining = typeof shopItem.stock === "number" ? Math.max(0, shopItem.stock - bought) : null;

  if (remaining !== null && remaining <= 0) {
    return appendLog(game, `${config.name}的${formatItemName(item)}已经售罄，等下次补货再来。`);
  }
  if (game.player.spiritStones < shopItem.price) {
    return appendLog(game, "灵石不足，摊主只是笑而不语。");
  }

  const nextWorld = {
    ...game.world,
    shops: {
      ...game.world.shops,
      [config.id]: {
        cycleKey: refresh.cycleKey,
        purchases: {
          ...runtime.purchases,
          [shopItem.itemId]: bought + 1,
        },
      },
    },
  };
  const paid: GameState = {
    ...game,
    player: {
      ...game.player,
      spiritStones: game.player.spiritStones - shopItem.price,
    },
    world: nextWorld,
  };
  const boughtGame = addItems(paid, [{ itemId: item.id, amount: 1 }]);
  return appendLog(boughtGame, `购得 ${formatItemName(item)} x1。`);
}

function getCurrentShopRuntime(game: GameState, config: ShopConfig, cycleKey: string): ShopRuntimeState {
  const runtime = game.world.shops[config.id];
  if (!runtime || runtime.cycleKey !== cycleKey) {
    return { cycleKey, purchases: {} };
  }
  return runtime;
}

function toDayIndex(year: number, month: number, day: number): number {
  return (year - 1) * CALENDAR_MONTHS_PER_YEAR * CALENDAR_DAYS_PER_MONTH + (month - 1) * CALENDAR_DAYS_PER_MONTH + (day - 1);
}
