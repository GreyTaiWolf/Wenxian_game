import { getRealm, isRealmStageAtLeast, majorRealmOrder } from "../data/progression";
import { travelEvents, type EventMapLayer, type EventTimeWindow, type TravelEventConfig, type EventWeatherTag } from "../data/events";
import { getWorldProvince } from "../data/worldMap";
import { appendLog, addRewards } from "./state";
import type { GameState } from "../types";

interface TravelContext {
  mapLayer: EventMapLayer;
  regionId: string;
  locationId?: string;
}

export function rollTravelEvent(game: GameState, context: TravelContext): GameState {
  const weather = getWeatherTag(game);
  const timeWindow = getTimeWindow(game);
  const candidates = travelEvents.filter((event) => isEventMatched(game, event, context, timeWindow, weather));
  if (candidates.length === 0) {
    return game;
  }

  const pickedEvent = weightedPick(candidates, (item) => item.baseWeight);
  if (!pickedEvent) {
    return game;
  }

  const pickedResult = weightedPick(pickedEvent.results, (item) => item.weight);
  if (!pickedResult) {
    return game;
  }

  let next = game;
  if (pickedResult.penalties?.spiritStones) {
    next = {
      ...next,
      player: { ...next.player, spiritStones: Math.max(0, next.player.spiritStones - pickedResult.penalties.spiritStones) },
    };
  }
  if (pickedResult.rewards) {
    next = addRewards(next, pickedResult.rewards);
  }
  if (pickedResult.setFlags?.length) {
    const flagSet = new Set(next.world.eventFlags ?? []);
    pickedResult.setFlags.forEach((flag) => flagSet.add(flag));
    next = { ...next, world: { ...next.world, eventFlags: [...flagSet] } };
  }

  return appendLog(next, pickedResult.text);
}

function isEventMatched(
  game: GameState,
  event: TravelEventConfig,
  context: TravelContext,
  timeWindow: EventTimeWindow,
  weather: EventWeatherTag,
): boolean {
  if (event.mapLayer !== context.mapLayer) return false;
  if (event.regionIds?.length && !event.regionIds.includes(context.regionId)) return false;
  if (event.locationIds?.length && (!context.locationId || !event.locationIds.includes(context.locationId))) return false;
  if (event.timeWindow !== "all" && event.timeWindow !== timeWindow) return false;
  if (event.weatherTags?.length && !event.weatherTags.includes(weather)) return false;

  const flags = new Set(game.world.eventFlags ?? []);
  if (event.requiredFlags?.some((flag) => !flags.has(flag))) return false;
  if (event.blockedUntilFlags?.some((flag) => !flags.has(flag))) return true;

  if (event.minRealm && !isRealmStageAtLeast(game.player.realmId, event.minRealm.majorRealmId, event.minRealm.phaseId ?? "early")) {
    return false;
  }

  const currentRealm = getRealm(game.player.realmId);
  const realmGap = majorRealmOrder.indexOf(currentRealm.majorRealmId) - majorRealmOrder.indexOf("qi");
  return realmGap >= -1;
}

function getTimeWindow(game: GameState): EventTimeWindow {
  return game.world.calendar.day % 2 === 0 ? "night" : "day";
}

function getWeatherTag(game: GameState): EventWeatherTag {
  if (game.player.injuryStacks >= 2 || game.player.instabilityStacks >= 2) return "mist";
  const province = getWorldProvince(game.world.regionId);
  if (province.id === "south_ridge") return "rain";
  return "clear";
}

function weightedPick<T>(list: T[], getWeight: (item: T) => number): T | null {
  const total = list.reduce((sum, item) => sum + Math.max(0, getWeight(item)), 0);
  if (total <= 0) return null;
  let cursor = Math.random() * total;
  for (const item of list) {
    cursor -= Math.max(0, getWeight(item));
    if (cursor <= 0) return item;
  }
  return list[list.length - 1] ?? null;
}
