import { getWorldEvent, worldEvents, type WorldEventChoiceConfig, type WorldEventConfig } from "../data/events";
import { isRealmAtLeast } from "../data/progression";
import { createWeatherSnapshot } from "../data/weather";
import type { GameState, GridCoord, WeatherId } from "../types";
import { beginCombat } from "./combatEngine";
import { addRewards, appendLog } from "./state";
import { normalizeWorldEventState } from "./time";

export interface MapEventContext {
  mapId: string;
  coord: GridCoord;
  locationId?: string;
}

export function maybeTriggerMapEvent(game: GameState, context: MapEventContext): GameState {
  if (game.combat || game.world.events.activeEventId) {
    return game;
  }
  const events = normalizeWorldEventState(game.world.events);
  const candidates = worldEvents.filter((event) => canTriggerEvent(game, events, event, context));
  if (candidates.length === 0) {
    return { ...game, world: { ...game.world, events } };
  }
  const picked = pickEvent(candidates);
  if (!picked) {
    return { ...game, world: { ...game.world, events } };
  }
  const dayIndex = game.world.calendar.dayIndex;
  return appendLog(
    {
      ...game,
      world: {
        ...game.world,
        events: {
          ...events,
          activeEventId: picked.id,
          lastEventDayIndex: dayIndex,
          triggeredCounts: {
            ...events.triggeredCounts,
            [picked.id]: (events.triggeredCounts[picked.id] ?? 0) + 1,
          },
          cooldowns: {
            ...events.cooldowns,
            [picked.id]: dayIndex + picked.cooldownDays,
          },
        },
      },
    },
    `你在行路途中遇到玄幻事件：${picked.title}。`,
  );
}

export function getActiveWorldEvent(game: GameState): WorldEventConfig | null {
  const activeEventId = game.world.events.activeEventId;
  return activeEventId ? getWorldEvent(activeEventId) ?? null : null;
}

export function resolveWorldEventChoice(game: GameState, choiceId: string): GameState {
  const event = getActiveWorldEvent(game);
  const choice = event?.choices.find((item) => item.id === choiceId);
  if (!event || !choice) {
    return clearActiveEvent(game);
  }

  const withFlags = applyChoiceFlags(clearActiveEvent(game), choice);
  const withRewards = choice.rewards ? addRewards(withFlags, choice.rewards) : withFlags;
  const withWeather = choice.weatherId ? applyWeatherChoice(withRewards, choice.weatherId) : withRewards;
  const withLog = appendLog(withWeather, choice.text);

  if (choice.kind === "combat" && choice.targetId) {
    return beginCombat(withLog, choice.targetId);
  }
  return withLog;
}

export function dismissActiveWorldEvent(game: GameState): GameState {
  const event = getActiveWorldEvent(game);
  return appendLog(clearActiveEvent(game), event ? `你暂且离开${event.title}。` : "你继续赶路。");
}

function canTriggerEvent(game: GameState, events: ReturnType<typeof normalizeWorldEventState>, event: WorldEventConfig, context: MapEventContext): boolean {
  if (event.mapIds && !event.mapIds.includes(context.mapId)) {
    return false;
  }
  if (event.regionIds && !event.regionIds.includes(game.world.regionId)) {
    return false;
  }
  if (event.locationIds?.length && (!context.locationId || !event.locationIds.includes(context.locationId))) {
    return false;
  }
  if (event.minRealmId && !isRealmAtLeast(game.player.realmId, event.minRealmId)) {
    return false;
  }
  if (event.maxTriggers && (events.triggeredCounts[event.id] ?? 0) >= event.maxTriggers) {
    return false;
  }
  if ((events.cooldowns[event.id] ?? 0) > game.world.calendar.dayIndex) {
    return false;
  }
  if (event.requiredWeatherIds?.length) {
    const globalWeather = game.world.weather.global.weatherId;
    const regionWeather = game.world.weather.regions[game.world.regionId]?.weatherId;
    if (!event.requiredWeatherIds.includes(globalWeather) && (!regionWeather || !event.requiredWeatherIds.includes(regionWeather))) {
      return false;
    }
  }
  return Math.random() < event.chance;
}

function pickEvent(events: WorldEventConfig[]): WorldEventConfig | null {
  if (!events.length) {
    return null;
  }
  return [...events].sort((left, right) => getEventPriority(right) - getEventPriority(left))[0];
}

function getEventPriority(event: WorldEventConfig): number {
  if (event.type === "combat") {
    return 4;
  }
  if (event.type === "weather") {
    return 3;
  }
  if (event.type === "field") {
    return 2;
  }
  return 1;
}

function clearActiveEvent(game: GameState): GameState {
  return {
    ...game,
    world: {
      ...game.world,
      events: {
        ...normalizeWorldEventState(game.world.events),
        activeEventId: null,
      },
    },
  };
}

function applyChoiceFlags(game: GameState, choice: WorldEventChoiceConfig): GameState {
  if (!choice.setFlags?.length) {
    return game;
  }
  const events = normalizeWorldEventState(game.world.events);
  return {
    ...game,
    world: {
      ...game.world,
      events: {
        ...events,
        flags: {
          ...events.flags,
          ...Object.fromEntries(choice.setFlags.map((flag) => [flag, true])),
        },
      },
    },
  };
}

function applyWeatherChoice(game: GameState, weatherId: WeatherId): GameState {
  const dayIndex = game.world.calendar.dayIndex;
  const snapshot = createWeatherSnapshot(weatherId, dayIndex, weatherId === "starfall" ? 3 : 5);
  return {
    ...game,
    world: {
      ...game.world,
      weather: {
        ...game.world.weather,
        global: snapshot,
        regions: {
          ...game.world.weather.regions,
          [game.world.regionId]: snapshot,
        },
      },
    },
  };
}
