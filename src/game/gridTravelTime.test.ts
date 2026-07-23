import { describe, expect, it } from "vitest";
import { CENTRAL_GRID_MAP_ID, WORLD_GRID_MAP_ID, getGridMapData } from "../data/gridMaps";
import { getGridPathTravelHours, getGridStepTravelHours } from "./gridNavigation";

describe("格子旅行耗时", () => {
  it("州域普通格与高耗格按同一权重结算", () => {
    const map = getGridMapData(CENTRAL_GRID_MAP_ID);
    expect(map).toBeDefined();
    if (!map) {
      return;
    }
    const normal = map.cells.find((cell) => cell.walkable && cell.movementCost === 1);
    const difficult = map.cells.find((cell) => cell.walkable && cell.movementCost === 2);
    expect(normal).toBeDefined();
    expect(difficult).toBeDefined();
    if (!normal || !difficult) {
      return;
    }

    expect(getGridStepTravelHours(map, normal)).toBe(1);
    expect(getGridStepTravelHours(map, difficult)).toBe(2);
    expect(getGridPathTravelHours(map, [normal, difficult])).toBe(3);
  });

  it("大世界每格基础耗时为七小时", () => {
    const map = getGridMapData(WORLD_GRID_MAP_ID);
    const normal = map?.cells.find((cell) => cell.walkable && cell.movementCost === 1);
    expect(map && normal ? getGridStepTravelHours(map, normal) : 0).toBe(7);
  });
});
