import {
  centralTravelEvents,
  getTravelEventDefinition,
  type TravelEventChoice,
  type TravelEventDefinition,
} from "../data/travelEvents";
import { addRewards, appendLog, canAffordCost, spendCost } from "./state";
import { advanceTime } from "./time";
import type { GameState, PendingTravelEvent } from "../types";

const MAX_TRIGGER_CHANCE = 0.72;
const MAX_TRAVEL_EVENT_HISTORY = 40;

export interface TravelEventContext {
  mapId: string;
  regionId: string;
  destinationLabel: string;
  stepCount: number;
  originLocationId?: string;
  destinationLocationId?: string;
  eventIds?: readonly string[];
  triggerChance?: number;
}

export type TravelEventRng = () => number;

export function maybeQueueTravelEvent(
  game: GameState,
  context: TravelEventContext,
  rng: TravelEventRng = Math.random,
): GameState {
  if (game.world.pendingTravelEvent || game.combat || context.regionId !== "central") {
    return game;
  }

  const stepCount = Math.max(0, Math.floor(context.stepCount));
  const originLocationId = context.originLocationId ?? game.world.locationId;
  const requestedEventIds = new Set(context.eventIds ?? []);
  const candidates = centralTravelEvents.filter((event) => {
    if (event.stageOnly || event.regionId !== context.regionId || !event.mapIds.includes(context.mapId)) {
      return false;
    }
    if (stepCount < event.minStepCount || (game.world.passive.eventCooldowns[event.cooldownKey] ?? 0) > 0) {
      return false;
    }
    if (requestedEventIds.size > 0 && !requestedEventIds.has(event.id)) {
      return false;
    }
    return event.locationIds.includes(originLocationId) || Boolean(context.destinationLocationId && event.locationIds.includes(context.destinationLocationId));
  });

  if (candidates.length === 0) {
    return game;
  }

  const firstRecordedJourney = game.world.travelEventHistory.length === 0;
  const triggerChance = firstRecordedJourney
    ? 1
    : clamp(context.triggerChance ?? 0.14 + Math.min(0.5, stepCount * 0.025), 0, MAX_TRIGGER_CHANCE);
  if (normalizeRoll(rng()) >= triggerChance) {
    return game;
  }

  const event = pickWeightedEvent(candidates, rng);
  const pendingTravelEvent: PendingTravelEvent = {
    eventId: event.id,
    mapId: context.mapId,
    destinationLabel: context.destinationLabel.trim() || "前方灵路",
    stepCount,
    triggeredAtTick: game.world.time.tick,
  };
  const queuedGame: GameState = {
    ...game,
    world: {
      ...game.world,
      pendingTravelEvent,
    },
  };
  return appendLog(queuedGame, `行至${event.locationName}，你遇见了「${event.title}」。`);
}

export function canAffordTravelEventChoice(game: GameState, choice: TravelEventChoice): boolean {
  return canAffordCost(game, choice.cost);
}

export function resolveTravelEventChoice(game: GameState, choiceId: string): GameState {
  const pending = game.world.pendingTravelEvent;
  if (!pending) {
    return game;
  }

  const event = getTravelEventDefinition(pending.eventId);
  if (!event) {
    return appendLog(clearPendingTravelEvent(game), "这桩行路异闻已不可追溯，你重新踏上前路。");
  }

  const choice = event.choices.find((candidate) => candidate.id === choiceId);
  if (!choice) {
    return appendLog(game, "这个抉择并不属于当前异闻。");
  }
  if (!canAffordTravelEventChoice(game, choice)) {
    return appendLog(game, `资源不足，无法选择「${choice.label}」。`);
  }

  let settledGame = spendCost(game, choice.cost);
  if (choice.outcome.rewards) {
    settledGame = addRewards(settledGame, choice.outcome.rewards);
  }
  if (choice.outcome.mindValueDelta) {
    settledGame = {
      ...settledGame,
      player: {
        ...settledGame.player,
        mindValue: clamp(settledGame.player.mindValue + choice.outcome.mindValueDelta, 0, 100),
      },
    };
  }
  if (choice.outcome.timeHours) {
    settledGame = advanceTime(settledGame, choice.outcome.timeHours);
  }

  const continuation = choice.outcome.nextEventId ? getTravelEventDefinition(choice.outcome.nextEventId) : undefined;
  const nextPending = continuation
    ? {
        ...pending,
        eventId: continuation.id,
        triggeredAtTick: settledGame.world.time.tick,
      }
    : null;
  const historyEntry = `${event.id}:${choice.id}@${settledGame.world.time.tick}`;
  const choiceFlag = `travel_choice_${event.id}_${choice.id}`;
  settledGame = {
    ...settledGame,
    world: {
      ...settledGame.world,
      pendingTravelEvent: nextPending,
      travelEventHistory: [historyEntry, ...settledGame.world.travelEventHistory].slice(0, MAX_TRAVEL_EVENT_HISTORY),
      eventFlags: {
        ...settledGame.world.eventFlags,
        ...choice.outcome.flags,
        [choiceFlag]: (settledGame.world.eventFlags[choiceFlag] ?? 0) + 1,
      },
      passive: {
        ...settledGame.world.passive,
        eventCooldowns: {
          ...settledGame.world.passive.eventCooldowns,
          [event.cooldownKey]: event.cooldownHours,
        },
      },
    },
  };

  settledGame = appendLog(settledGame, choice.outcome.resultText);
  if (continuation) {
    settledGame = appendLog(settledGame, `因果未了：${continuation.title}。`);
  }
  return settledGame;
}

function pickWeightedEvent(events: TravelEventDefinition[], rng: TravelEventRng): TravelEventDefinition {
  const totalWeight = events.reduce((sum, event) => sum + Math.max(0, event.weight), 0);
  if (totalWeight <= 0) {
    return events[0];
  }

  let cursor = normalizeRoll(rng()) * totalWeight;
  for (const event of events) {
    cursor -= Math.max(0, event.weight);
    if (cursor < 0) {
      return event;
    }
  }
  return events[events.length - 1];
}

function normalizeRoll(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }
  return clamp(value, 0, 1 - Number.EPSILON);
}

function clearPendingTravelEvent(game: GameState): GameState {
  return {
    ...game,
    world: {
      ...game.world,
      pendingTravelEvent: null,
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
