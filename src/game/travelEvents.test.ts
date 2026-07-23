import { describe, expect, it } from "vitest";
import { getTravelEventDefinition } from "../data/travelEvents";
import { createNewGame } from "./state";
import { maybeQueueTravelEvent, resolveTravelEventChoice } from "./travelEvents";

const journey = {
  mapId: "region:central",
  regionId: "central",
  destinationLabel: "落霞镇",
  stepCount: 8,
  originLocationId: "black_wind_mountain",
  destinationLocationId: "luoxia_town",
};

describe("格子行程异闻", () => {
  it("首段符合条件的命名地点行程保证出现事件", () => {
    const queued = maybeQueueTravelEvent(createNewGame("行路人"), journey, () => 0.99);

    expect(queued.world.pendingTravelEvent).not.toBeNull();
    expect(queued.world.pendingTravelEvent?.stepCount).toBe(8);
    expect(queued.world.pendingTravelEvent?.destinationLabel).toBe("落霞镇");
  });

  it("资源不足不能绕过，且每个事件存在免费退路", () => {
    const queued = maybeQueueTravelEvent(createNewGame("行路人"), journey, () => 0);
    const event = getTravelEventDefinition(queued.world.pendingTravelEvent?.eventId ?? "");
    expect(event).toBeDefined();
    expect(event?.choices.some((choice) => choice.isFallback && Object.keys(choice.cost).length === 0)).toBe(true);
    if (!event) {
      return;
    }

    const costlyChoice = event.choices.find((choice) => !choice.isFallback);
    const emptied = {
      ...queued,
      player: { ...queued.player, spiritStones: 0 },
      inventory: { ...queued.inventory, items: {} },
    };
    const blocked = resolveTravelEventChoice(emptied, costlyChoice?.id ?? "");

    expect(blocked.world.pendingTravelEvent?.eventId).toBe(event.id);
    expect(blocked.world.travelEventHistory).toHaveLength(0);

    const fallback = event.choices.find((choice) => choice.isFallback);
    const resolved = resolveTravelEventChoice(blocked, fallback?.id ?? "");
    expect(resolved.world.pendingTravelEvent).toBeNull();
    expect(resolved.world.travelEventHistory).toHaveLength(1);
  });

  it("救助负伤客会进入续章，且两段选择都只结算一次", () => {
    const queued = maybeQueueTravelEvent(createNewGame("行路人"), journey, () => 0);
    expect(queued.world.pendingTravelEvent?.eventId).toBe("central_wounded_guest");
    const medicineBefore = queued.inventory.items.healing_powder;
    const continued = resolveTravelEventChoice(queued, "use_medicine");

    expect(continued.inventory.items.healing_powder).toBe(medicineBefore - 1);
    expect(continued.world.pendingTravelEvent?.eventId).toBe("central_wounded_guest_old_kiln");
    expect(continued.world.eventFlags.helped_wounded_guest).toBe(1);

    const finished = resolveTravelEventChoice(continued, "ask_only_the_safe_road");
    expect(finished.world.pendingTravelEvent).toBeNull();
    expect(finished.world.travelEventHistory).toHaveLength(2);

    const repeated = resolveTravelEventChoice(finished, "ask_only_the_safe_road");
    expect(repeated).toBe(finished);
  });
});
