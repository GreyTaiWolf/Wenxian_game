import type { GridCoord, GridDestinationKind, GridDestinationZone } from "../types";
import {
  CENTRAL_GRID_MAP_ID,
  GRID_MAP_HEIGHT,
  GRID_MAP_WIDTH,
  SOUTH_RIDGE_GRID_MAP_ID,
  WORLD_GRID_MAP_ID,
  centralLocationCoords,
  southRidgeLocationCoords,
  worldProvincePortals,
} from "./gridMaps";
import { getRegion, type LocationNode } from "./world";
import { worldProvinces, type WorldProvince } from "./worldMap";

interface ZoneShape {
  width: number;
  height: number;
}

export const worldProvinceZoneShape: ZoneShape = { width: 3, height: 3 };

export const regionLocationZoneShapes: Record<LocationNode["type"], ZoneShape> = {
  city: { width: 1, height: 1 },
  town: { width: 1, height: 1 },
  wild: { width: 1, height: 1 },
  secret: { width: 1, height: 1 },
};

export const smallEntranceZoneShape: ZoneShape = { width: 1, height: 2 };

export const gridDestinationZones: GridDestinationZone[] = [
  ...worldProvinces.map(createWorldProvinceZone),
  ...getRegion("central").locations.map((location) => createRegionLocationZone(location, "central", CENTRAL_GRID_MAP_ID, centralLocationCoords)),
  ...getRegion("south_ridge").locations.map((location) => createRegionLocationZone(location, "south_ridge", SOUTH_RIDGE_GRID_MAP_ID, southRidgeLocationCoords)),
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

function createWorldProvinceZone(province: WorldProvince): GridDestinationZone {
  const anchor = getWorldProvinceAnchor(province);
  return {
    mapId: WORLD_GRID_MAP_ID,
    zoneId: `world:province:${province.id}`,
    kind: "province",
    targetId: province.id,
    anchor,
    cells: createZoneCells(anchor, worldProvinceZoneShape),
  };
}

function createRegionLocationZone(
  location: LocationNode,
  regionId: string,
  mapId: string,
  locationCoords: Record<string, GridCoord>,
): GridDestinationZone {
  const anchor = locationCoords[location.id];
  const shape = regionLocationZoneShapes[location.type];
  return {
    mapId,
    zoneId: `${regionId}:location:${location.id}`,
    kind: "location",
    targetId: location.id,
    anchor,
    cells: createZoneCells(anchor, shape),
    eventIds: [],
  };
}

function getWorldProvinceAnchor(province: WorldProvince): GridCoord {
  const portalAnchor = worldProvincePortals[province.regionId ?? province.id];
  if (portalAnchor) {
    return portalAnchor;
  }
  return {
    x: clamp(Math.floor((province.marker.x / 100) * GRID_MAP_WIDTH), 0, GRID_MAP_WIDTH - 1),
    y: clamp(Math.floor((province.marker.y / 100) * GRID_MAP_HEIGHT), 0, GRID_MAP_HEIGHT - 1),
  };
}

function createZoneCells(anchor: GridCoord, shape: ZoneShape): GridCoord[] {
  const left = clamp(anchor.x - Math.floor(shape.width / 2), 0, GRID_MAP_WIDTH - shape.width);
  const top = clamp(anchor.y - Math.floor(shape.height / 2), 0, GRID_MAP_HEIGHT - shape.height);
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
