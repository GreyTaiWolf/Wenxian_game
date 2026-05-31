import type { GridCoord, GridDestinationKind, GridDestinationZone, GridMapData } from "../types";
import { getGridMapData, getLocalGridMapId, getLocalSceneGridCoord, WORLD_GRID_MAP_ID } from "./gridMaps";
import { regions } from "./world";
import { worldPois, type WorldPoiConfig } from "./worldPois";

interface ZoneShape {
  width: number;
  height: number;
}

const localSceneZoneShape: ZoneShape = { width: 3, height: 3 };

export const gridDestinationZones: GridDestinationZone[] = [
  ...worldPois.map(createWorldPoiZone),
  ...regions.flatMap((region) =>
    region.locations.flatMap((location) => {
      const mapId = getLocalGridMapId(location.id);
      if (!mapId) {
        return [];
      }
      const map = getGridMapData(mapId);
      if (!map) {
        return [];
      }
      const zones: GridDestinationZone[] = [];
      location.scenes.forEach((scene) => {
        const anchor = getLocalSceneGridCoord(location.id, scene.id);
        if (!anchor) {
          return;
        }
        zones.push({
          mapId,
          zoneId: `${location.id}:scene:${scene.id}`,
          kind: "scene",
          targetId: scene.id,
          anchor,
          cells: createZoneCells(anchor, localSceneZoneShape, map),
          eventIds: [],
        });
      });
      return zones;
    }),
  ),
];

export function getGridDestinationZones(mapId: string): GridDestinationZone[] {
  return gridDestinationZones.filter((zone) => zone.mapId === mapId);
}

export function getGridDestinationZone(mapId: string, kind: GridDestinationKind, targetId: string): GridDestinationZone | undefined {
  return gridDestinationZones.find((zone) => zone.mapId === mapId && zone.kind === kind && zone.targetId === targetId);
}

export function findGridDestinationZone(mapId: string, coord: GridCoord): GridDestinationZone | null {
  const hits = getGridDestinationZones(mapId).filter((zone) => isGridCoordInZone(zone, coord));
  if (hits.length === 0) {
    return null;
  }

  return [...hits].sort((left, right) => {
    const distanceDelta = getManhattanDistance(coord, left.anchor) - getManhattanDistance(coord, right.anchor);
    const sizeDelta = left.cells.length - right.cells.length;
    return distanceDelta || sizeDelta || left.zoneId.localeCompare(right.zoneId);
  })[0];
}

export function isGridCoordInZone(zone: GridDestinationZone, coord: GridCoord): boolean {
  return zone.cells.some((cell) => cell.x === coord.x && cell.y === coord.y);
}

function createWorldPoiZone(poi: WorldPoiConfig): GridDestinationZone {
  const map = getGridMapData(WORLD_GRID_MAP_ID);
  return {
    mapId: WORLD_GRID_MAP_ID,
    zoneId: `world:poi:${poi.id}`,
    kind: "poi",
    targetId: poi.id,
    anchor: poi.coord,
    cells: map ? createZoneCells(poi.coord, poi.zoneSize, map) : [poi.coord],
  };
}

function createZoneCells(anchor: GridCoord, shape: ZoneShape, map: GridMapData): GridCoord[] {
  const left = clamp(anchor.x - Math.floor(shape.width / 2), 0, map.width - shape.width);
  const top = clamp(anchor.y - Math.floor(shape.height / 2), 0, map.height - shape.height);
  const cells: GridCoord[] = [];

  for (let y = top; y < top + shape.height; y += 1) {
    for (let x = left; x < left + shape.width; x += 1) {
      cells.push({ x, y });
    }
  }

  return cells;
}

function getManhattanDistance(left: GridCoord, right: GridCoord): number {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
