import { describe, expect, it } from "vitest";
import {
  advanceTime,
  createDefaultPassiveState,
  createDefaultWorldTime,
  normalizePassiveState,
  normalizeWorldTimeState,
} from "./time";
import { createNewGame } from "./state";

const HOURS_PER_GAME_YEAR = 24 * 30 * 12;

describe("世界时间推进", () => {
  it("初始八点与 tick 使用同一基准，首次推进一小时到九点", () => {
    const initialTime = createDefaultWorldTime();
    const game = createNewGame("守时者");

    expect(initialTime.tick).toBe(8);
    expect(initialTime.hour).toBe(8);
    const advanced = advanceTime(game, 1);
    expect(advanced.world.time.tick).toBe(9);
    expect(advanced.world.time.hour).toBe(9);
    expect(advanced.world.time.day).toBe(1);
    expect(advanced.world.calendar).toEqual(game.world.calendar);
  });

  it("兼容旧档 tick 与八点时钟不一致的初始状态", () => {
    const game = createNewGame("旧历者");
    const legacyGame = {
      ...game,
      world: {
        ...game.world,
        time: {
          ...game.world.time,
          tick: 0,
          day: 1,
          hour: 8,
        },
      },
    };

    const advanced = advanceTime(legacyGame, 1);
    expect(advanced.world.time.tick).toBe(9);
    expect(advanced.world.time.hour).toBe(9);
  });

  it("逐小时推进一整年不会因小数舍入停止衰老", () => {
    const initial = createNewGame("历岁者");
    let segmented = initial;
    for (let hour = 0; hour < HOURS_PER_GAME_YEAR; hour += 1) {
      segmented = advanceTime(segmented, 1);
    }
    const singleStep = advanceTime(initial, HOURS_PER_GAME_YEAR);

    expect(segmented.player.age).toBeCloseTo(19, 10);
    expect(segmented.player.age).toBeCloseTo(singleStep.player.age, 12);
    expect(segmented.world.calendar).toEqual({ year: 2, month: 1, day: 1 });
  });

  it("NPC 状态种子只由总 tick 决定，不受推进分段影响", () => {
    const initial = createNewGame("观世者");
    const singleStep = advanceTime(initial, 9);
    const segmented = [1, 1, 1, 1, 1, 1, 1, 1, 1].reduce((game, hours) => advanceTime(game, hours), initial);

    expect(segmented.world.time.tick).toBe(singleStep.world.time.tick);
    expect(segmented.world.passive.npcStateSeed).toBe(singleStep.world.passive.npcStateSeed);
    expect(segmented.world.passive.npcStateSeed).toBe(20);
  });

  it("时间与被动状态归一化可处理 null、NaN、负数和非法冷却表", () => {
    expect(normalizeWorldTimeState(null)).toEqual(createDefaultWorldTime());
    expect(
      normalizeWorldTimeState({
        tick: Number.NaN,
        day: -3,
        hour: 99,
        solarTerm: "不存在的节气",
        weather: "灵气风暴",
      }),
    ).toEqual(createDefaultWorldTime());

    expect(normalizePassiveState(null)).toEqual(createDefaultPassiveState());
    const normalizedPassive = normalizePassiveState(
      {
        spiritFieldGrowth: Number.NaN,
        shopRefreshTick: -4,
        npcStateSeed: Number.NaN,
        eventCooldowns: {
          valid: 5,
          negative: -2,
          invalid: Number.NaN,
        },
        questDeadlines: null as unknown as Record<string, number>,
      },
      17,
    );
    expect(normalizedPassive.spiritFieldGrowth).toBe(0);
    expect(normalizedPassive.shopRefreshTick).toBe(24);
    expect(normalizedPassive.npcStateSeed).toBe(20);
    expect(normalizedPassive.eventCooldowns).toEqual({ valid: 5, negative: 0 });
    expect(normalizedPassive.questDeadlines).toEqual({});
  });

  it("advanceTime 会先归一化非法冷却表，不会在 Object.entries 处崩溃", () => {
    const game = createNewGame("稳态者");
    const malformed = {
      ...game,
      world: {
        ...game.world,
        passive: {
          ...game.world.passive,
          eventCooldowns: null,
          questDeadlines: null,
        },
      },
    } as unknown as typeof game;

    expect(() => advanceTime(malformed, 1)).not.toThrow();
    const advanced = advanceTime(malformed, 1);
    expect(advanced.world.passive.eventCooldowns).toEqual({});
    expect(advanced.world.passive.questDeadlines).toEqual({});
    expect(advanced.world.time.hour).toBe(9);
    expect(advanceTime(game, Number.NaN)).toBe(game);
    expect(advanceTime(game, -1)).toBe(game);
  });
});
