import type { GridCell, GridCellDistanceUnit, GridCoord, GridMapData, GridMapLayer, GridNavigationState, GridRoadSegment, GridTerrain } from "../types";
import { regions, type LocationNode } from "./world";
import { getLocalMapIdForLocation, worldPois } from "./worldPois";

export const WORLD_GRID_MAP_ID = "world";
export const GRID_NAVIGATION_VERSION = 3;

export const WORLD_GRID_MAP_WIDTH = 320;
export const WORLD_GRID_MAP_HEIGHT = 200;
export const WORLD_GRID_CELL_SIZE = 8;
export const LOCAL_GRID_CELL_SIZE = 24;

export const defaultWorldCoord: GridCoord = { x: 142, y: 92 };

const localSceneCoords: Record<string, Record<string, GridCoord>> = {};
const localMapDefaults: Record<string, GridCoord> = {};
const localMapLocationIds: Record<string, string> = {};

export const worldRoadPairs: Array<[string, string]> = [
  ["qingyun_city", "qingyun_sect"],
  ["qingyun_city", "black_wind_mountain"],
  ["qingyun_city", "tian_xuan_gate"],
  ["qingyun_city", "herb_valley"],
  ["qingyun_city", "luoxia_town"],
  ["tian_xuan_gate", "ancient_cave"],
  ["tian_xuan_gate", "central_spirit_mine"],
  ["central_spirit_mine", "herb_valley"],
  ["luoxia_town", "west_desert_forbidden"],
  ["herb_valley", "baicao_valley"],
  ["wuyao_alliance", "wood_spirit_sect"],
  ["wuyao_alliance", "baicao_valley"],
  ["wuyao_alliance", "southern_herb_spring"],
  ["southern_herb_spring", "baicao_valley"],
  ["baicao_valley", "ten_thousand_beast_mountain"],
  ["baicao_valley", "miasma_marsh"],
  ["wuyao_alliance", "tide_market"],
  ["tide_market", "east_sea_route"],
  ["tide_market", "returning_tide_reef"],
  ["baicao_valley", "thousand_falls_cliff"],
  ["ancient_cave", "north_border_snowfield"],
  ["north_border_snowfield", "qingyun_sect"],
];

const worldRoadSegments = createWorldRoadSegments(worldRoadPairs);
const worldRoadKeys = createRoadKeySet(worldRoadSegments, 1, WORLD_GRID_MAP_WIDTH, WORLD_GRID_MAP_HEIGHT);

export const gridMaps: GridMapData[] = [createWorldGridMap(), ...createLocalGridMaps()];

export function getGridMapData(mapId: string): GridMapData | undefined {
  return gridMaps.find((map) => map.mapId === mapId);
}

export function getLocalGridMapId(locationId: string): string | undefined {
  return getLocalMapIdForLocation(locationId);
}

export function getLocationIdFromLocalGridMapId(mapId: string): string | undefined {
  return localMapLocationIds[mapId];
}

export function getWorldPoiGridCoord(poiId: string): GridCoord | undefined {
  return worldPois.find((poi) => poi.id === poiId)?.coord;
}

export function getLocalSceneGridCoord(locationId: string, sceneId: string): GridCoord | undefined {
  return localSceneCoords[locationId]?.[sceneId];
}

export function getDefaultGridCoord(mapId: string): GridCoord {
  if (mapId === WORLD_GRID_MAP_ID) {
    return defaultWorldCoord;
  }
  return localMapDefaults[mapId] ?? defaultWorldCoord;
}

export function createDefaultGridNavigationState(activeMapId = WORLD_GRID_MAP_ID): GridNavigationState {
  return {
    mapVersion: GRID_NAVIGATION_VERSION,
    activeMapId: getGridMapData(activeMapId) ? activeMapId : WORLD_GRID_MAP_ID,
    positions: Object.fromEntries(gridMaps.map((map) => [map.mapId, getDefaultGridCoord(map.mapId)])),
  };
}

export function normalizeGridNavigationState(raw: Partial<GridNavigationState> | undefined): GridNavigationState {
  const defaults = createDefaultGridNavigationState(raw?.activeMapId ?? WORLD_GRID_MAP_ID);
  const positions = { ...defaults.positions };
  const rawMapVersion = raw?.mapVersion;

  Object.entries(raw?.positions ?? {}).forEach(([mapId, coord]) => {
    const map = getGridMapData(mapId);
    if (!map || typeof coord?.x !== "number" || typeof coord?.y !== "number") {
      return;
    }
    positions[mapId] = normalizeGridCoordForVersion(map, coord, rawMapVersion);
  });

  return {
    mapVersion: GRID_NAVIGATION_VERSION,
    activeMapId: getGridMapData(raw?.activeMapId ?? "") ? raw?.activeMapId ?? WORLD_GRID_MAP_ID : WORLD_GRID_MAP_ID,
    positions,
  };
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CellMeta {
  terrain: GridTerrain;
  movementCost: number;
  dangerLevel: number;
  spiritLevel: number;
  regionId: string;
  regionTag: string;
  climateTag: string;
  walkable: boolean;
  poiId?: string;
}

interface TerrainRect extends Rect {
  terrain: GridTerrain;
  movementCost?: number;
  dangerLevel?: number;
  spiritLevel?: number;
  regionId?: string;
  regionTag?: string;
  climateTag?: string;
  walkable?: boolean;
}

interface GridMapConfig {
  mapId: string;
  layer: GridMapLayer;
  name: string;
  width: number;
  height: number;
  cellSize: number;
  cellDistance: number;
  cellDistanceUnit: GridCellDistanceUnit;
  defaultCell: (coord: GridCoord) => CellMeta;
  terrainRects?: TerrainRect[];
  blockedRects?: Rect[];
  roadKeys?: Set<string>;
  roadSegments?: GridRoadSegment[];
  poiCells?: Array<{ coord: GridCoord; poiId: string; terrain?: GridTerrain; dangerLevel?: number; spiritLevel?: number; regionId?: string; regionTag?: string; climateTag?: string }>;
}

function createWorldGridMap(): GridMapData {
  const poiCells = worldPois.map((poi) => ({
    coord: poi.coord,
    poiId: poi.id,
    terrain: poi.terrain,
    dangerLevel: poi.dangerLevel,
    spiritLevel: poi.spiritLevel,
    regionId: poi.regionId,
    regionTag: poi.regionTag,
    climateTag: poi.climateTag,
  }));

  return createGridMap({
    mapId: WORLD_GRID_MAP_ID,
    layer: "world",
    name: "问仙大世界",
    width: WORLD_GRID_MAP_WIDTH,
    height: WORLD_GRID_MAP_HEIGHT,
    cellSize: WORLD_GRID_CELL_SIZE,
    cellDistance: 100,
    cellDistanceUnit: "li",
    defaultCell: getWorldDefaultCell,
    blockedRects: [
      { x: 0, y: 0, width: WORLD_GRID_MAP_WIDTH, height: 3 },
      { x: 0, y: WORLD_GRID_MAP_HEIGHT - 3, width: WORLD_GRID_MAP_WIDTH, height: 3 },
      { x: 0, y: 0, width: 3, height: WORLD_GRID_MAP_HEIGHT },
      { x: WORLD_GRID_MAP_WIDTH - 3, y: 0, width: 3, height: WORLD_GRID_MAP_HEIGHT },
    ],
    terrainRects: [
      { x: 0, y: 0, width: 320, height: 58, terrain: "snow", movementCost: 2, dangerLevel: 5, spiritLevel: 4, regionId: "north_border", regionTag: "北境", climateTag: "玄冰寒潮" },
      { x: 0, y: 58, width: 88, height: 96, terrain: "desert", movementCost: 2, dangerLevel: 4, spiritLevel: 3, regionId: "west_desert", regionTag: "西漠", climateTag: "沙暴干热" },
      { x: 236, y: 54, width: 84, height: 90, terrain: "water", movementCost: 3, dangerLevel: 4, spiritLevel: 5, regionId: "east_sea", regionTag: "东海", climateTag: "海雾灵潮" },
      { x: 90, y: 128, width: 156, height: 72, terrain: "forest", movementCost: 2, dangerLevel: 3, spiritLevel: 6, regionId: "south_ridge", regionTag: "南疆", climateTag: "湿热灵雨" },
      { x: 104, y: 64, width: 122, height: 74, terrain: "plain", movementCost: 1, dangerLevel: 1, spiritLevel: 4, regionId: "central", regionTag: "中州", climateTag: "温润灵脉" },
      { x: 98, y: 78, width: 34, height: 36, terrain: "mountain", movementCost: 2, dangerLevel: 3, spiritLevel: 3, regionId: "central", regionTag: "中州", climateTag: "山风阴冷" },
      { x: 194, y: 48, width: 34, height: 28, terrain: "mountain", movementCost: 2, dangerLevel: 4, spiritLevel: 5, regionId: "central", regionTag: "中州", climateTag: "残阵寒气" },
      { x: 92, y: 166, width: 24, height: 28, terrain: "marsh", movementCost: 3, dangerLevel: 6, spiritLevel: 5, regionId: "south_ridge", regionTag: "南疆", climateTag: "瘴雨" },
      { x: 186, y: 150, width: 26, height: 28, terrain: "secret", movementCost: 2, dangerLevel: 6, spiritLevel: 8, regionId: "south_ridge", regionTag: "南疆", climateTag: "灵瀑水雾" },
      { x: 52, y: 108, width: 18, height: 20, terrain: "forbidden", movementCost: 4, dangerLevel: 7, spiritLevel: 4, regionId: "west_desert", regionTag: "西漠", climateTag: "沙暴干热" },
    ],
    roadKeys: worldRoadKeys,
    roadSegments: worldRoadSegments,
    poiCells,
  });
}

function createLocalGridMaps(): GridMapData[] {
  const maps: GridMapData[] = [];
  regions.forEach((region) => {
    region.locations.forEach((location) => {
      const mapId = getLocalMapIdForLocation(location.id);
      if (!mapId) {
        return;
      }
      const profile = getLocalMapProfile(location);
      const sceneCoords = createLocalSceneCoords(location, profile.width, profile.height);
      const roadKeys = createLocalRoadKeySet(sceneCoords);
      const defaultCoord = sceneCoords[location.scenes[0]?.id] ?? { x: Math.floor(profile.width / 2), y: Math.floor(profile.height / 2) };
      localSceneCoords[location.id] = sceneCoords;
      localMapDefaults[mapId] = defaultCoord;
      localMapLocationIds[mapId] = location.id;

      maps.push(
        createGridMap({
          mapId,
          layer: "local",
          name: `${location.name} local map`,
          width: profile.width,
          height: profile.height,
          cellSize: LOCAL_GRID_CELL_SIZE,
          cellDistance: profile.cellDistance,
          cellDistanceUnit: profile.cellDistanceUnit,
          defaultCell: () => ({
            terrain: profile.defaultTerrain,
            movementCost: profile.defaultMovementCost,
            dangerLevel: profile.dangerLevel,
            spiritLevel: profile.spiritLevel,
            regionId: region.id,
            regionTag: region.name,
            climateTag: profile.climateTag,
            walkable: true,
          }),
          blockedRects: [
            { x: 0, y: 0, width: profile.width, height: 1 },
            { x: 0, y: profile.height - 1, width: profile.width, height: 1 },
            { x: 0, y: 0, width: 1, height: profile.height },
            { x: profile.width - 1, y: 0, width: 1, height: profile.height },
            ...profile.blockedRects,
          ],
          terrainRects: profile.terrainRects,
          roadKeys,
          poiCells: Object.entries(sceneCoords).map(([sceneId, coord]) => ({
            coord,
            poiId: `${location.id}:${sceneId}`,
            terrain: getSceneTerrain(location, sceneId),
            dangerLevel: profile.dangerLevel,
            spiritLevel: profile.spiritLevel,
            regionId: region.id,
            regionTag: region.name,
            climateTag: profile.climateTag,
          })),
        }),
      );
    });
  });
  return maps;
}

function createGridMap(config: GridMapConfig): GridMapData {
  const blockedRects = config.blockedRects ?? [];
  const terrainRects = config.terrainRects ?? [];
  const roadKeys = config.roadKeys ?? new Set<string>();
  const roadSegments = config.roadSegments ?? [];
  const poiByKey = new Map((config.poiCells ?? []).map((poi) => [gridCoordKey(poi.coord), poi]));
  const cells: GridCell[] = [];

  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      const coord = { x, y };
      const base = config.defaultCell(coord);
      const terrainRect = terrainRects.find((rect) => isCoordInRect(coord, rect));
      const poi = poiByKey.get(gridCoordKey(coord));
      const isRoad = roadKeys.has(gridCoordKey(coord));
      const isBlocked = blockedRects.some((rect) => isCoordInRect(coord, rect));
      const terrain = poi?.terrain ?? (isRoad ? "road" : terrainRect?.terrain) ?? base.terrain;

      cells.push({
        x,
        y,
        walkable: Boolean(poi) || (!isBlocked && (terrainRect?.walkable ?? base.walkable)),
        movementCost: poi ? 1 : isRoad ? 1 : terrainRect?.movementCost ?? base.movementCost,
        regionId: poi?.regionId ?? terrainRect?.regionId ?? base.regionId,
        terrain,
        dangerLevel: poi?.dangerLevel ?? terrainRect?.dangerLevel ?? base.dangerLevel,
        spiritLevel: poi?.spiritLevel ?? terrainRect?.spiritLevel ?? base.spiritLevel,
        regionTag: poi?.regionTag ?? terrainRect?.regionTag ?? base.regionTag,
        climateTag: poi?.climateTag ?? terrainRect?.climateTag ?? base.climateTag,
        poiId: poi?.poiId,
      });
    }
  }

  return {
    mapId: config.mapId,
    layer: config.layer,
    name: config.name,
    width: config.width,
    height: config.height,
    cellSize: config.cellSize,
    cellDistance: config.cellDistance,
    cellDistanceUnit: config.cellDistanceUnit,
    origin: { x: 0, y: 0 },
    cells,
    roadSegments,
  };
}

function getWorldDefaultCell(coord: GridCoord): CellMeta {
  if (coord.y < 60) {
    return {
      terrain: "snow",
      movementCost: 2,
      dangerLevel: 4,
      spiritLevel: 4,
      regionId: "north_border",
      regionTag: "北境",
      climateTag: "玄冰寒潮",
      walkable: true,
    };
  }
  if (coord.x < 92) {
    return {
      terrain: "desert",
      movementCost: 2,
      dangerLevel: 4,
      spiritLevel: 3,
      regionId: "west_desert",
      regionTag: "西漠",
      climateTag: "沙暴干热",
      walkable: true,
    };
  }
  if (coord.x > 232 && coord.y < 144) {
    return {
      terrain: "water",
      movementCost: 3,
      dangerLevel: 4,
      spiritLevel: 5,
      regionId: "east_sea",
      regionTag: "东海",
      climateTag: "海雾灵潮",
      walkable: true,
    };
  }
  if (coord.y > 132) {
    return {
      terrain: "forest",
      movementCost: 2,
      dangerLevel: 3,
      spiritLevel: 6,
      regionId: "south_ridge",
      regionTag: "南疆",
      climateTag: "湿热灵雨",
      walkable: true,
    };
  }
  return {
    terrain: "plain",
    movementCost: 1,
    dangerLevel: 1,
    spiritLevel: 4,
    regionId: "central",
    regionTag: "中州",
    climateTag: "温润灵脉",
    walkable: true,
  };
}

function getLocalMapProfile(location: LocationNode): {
  width: number;
  height: number;
  cellDistance: number;
  cellDistanceUnit: GridCellDistanceUnit;
  defaultTerrain: GridTerrain;
  defaultMovementCost: number;
  dangerLevel: number;
  spiritLevel: number;
  climateTag: string;
  terrainRects: TerrainRect[];
  blockedRects: Rect[];
} {
  if (location.type === "city") {
    return {
      width: 36,
      height: 24,
      cellDistance: 35,
      cellDistanceUnit: "meter",
      defaultTerrain: "city",
      defaultMovementCost: 1,
      dangerLevel: 1,
      spiritLevel: 5,
      climateTag: "城镇灵脉",
      terrainRects: [
        { x: 5, y: 4, width: 26, height: 2, terrain: "road", movementCost: 1 },
        { x: 17, y: 3, width: 2, height: 17, terrain: "road", movementCost: 1 },
      ],
      blockedRects: [
        { x: 4, y: 18, width: 6, height: 3 },
        { x: 28, y: 7, width: 4, height: 4 },
      ],
    };
  }
  if (location.type === "town") {
    return {
      width: 32,
      height: 22,
      cellDistance: 50,
      cellDistanceUnit: "meter",
      defaultTerrain: "city",
      defaultMovementCost: 1,
      dangerLevel: 1,
      spiritLevel: 4,
      climateTag: "商路烟火",
      terrainRects: [
        { x: 4, y: 10, width: 24, height: 2, terrain: "road", movementCost: 1 },
        { x: 15, y: 4, width: 2, height: 14, terrain: "road", movementCost: 1 },
      ],
      blockedRects: [{ x: 25, y: 15, width: 4, height: 3 }],
    };
  }
  if (location.type === "secret") {
    return {
      width: 34,
      height: 24,
      cellDistance: 1,
      cellDistanceUnit: "li",
      defaultTerrain: "secret",
      defaultMovementCost: 2,
      dangerLevel: 5,
      spiritLevel: 7,
      climateTag: "秘境灵压",
      terrainRects: [
        { x: 4, y: 4, width: 10, height: 7, terrain: "cave", movementCost: 2, dangerLevel: 5 },
        { x: 20, y: 11, width: 9, height: 8, terrain: "forbidden", movementCost: 3, dangerLevel: 7, spiritLevel: 8 },
      ],
      blockedRects: [
        { x: 11, y: 2, width: 4, height: 5 },
        { x: 2, y: 17, width: 5, height: 4 },
      ],
    };
  }
  return {
    width: 40,
    height: 26,
    cellDistance: 2,
    cellDistanceUnit: "li",
    defaultTerrain: "forest",
    defaultMovementCost: 2,
    dangerLevel: 3,
    spiritLevel: 5,
    climateTag: "山野灵雾",
    terrainRects: [
      { x: 4, y: 4, width: 10, height: 8, terrain: "mountain", movementCost: 3, dangerLevel: 4 },
      { x: 24, y: 14, width: 10, height: 7, terrain: "valley", movementCost: 2, spiritLevel: 6 },
      { x: 17, y: 6, width: 3, height: 15, terrain: "road", movementCost: 1 },
    ],
    blockedRects: [
      { x: 2, y: 19, width: 5, height: 4 },
      { x: 32, y: 3, width: 5, height: 5 },
    ],
  };
}

function createLocalSceneCoords(location: LocationNode, width: number, height: number): Record<string, GridCoord> {
  const coords: Record<string, GridCoord> = {};
  const scenes = location.scenes;
  const columns = Math.min(3, Math.max(1, scenes.length));
  const rows = Math.max(1, Math.ceil(scenes.length / columns));
  const minX = 5;
  const maxX = width - 6;
  const minY = 4;
  const maxY = height - 5;

  scenes.forEach((scene, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    coords[scene.id] = {
      x: Math.round(minX + ((column + 1) / (columns + 1)) * (maxX - minX)),
      y: Math.round(minY + ((row + 1) / (rows + 1)) * (maxY - minY)),
    };
  });

  return coords;
}

function createWorldRoadSegments(pairs: Array<[string, string]>): GridRoadSegment[] {
  const coordByPoiId = new Map(worldPois.map((poi) => [poi.id, poi.coord]));
  const segments: GridRoadSegment[] = [];
  pairs.forEach(([fromId, toId], index) => {
    const from = coordByPoiId.get(fromId);
    const to = coordByPoiId.get(toId);
    if (!from || !to) {
      return;
    }
    segments.push({
      id: `world_road_${index + 1}_${fromId}_${toId}`,
      fromId,
      toId,
      kind: "road",
      points: createLineCoords(from, to),
    });
  });
  return segments;
}

function createRoadKeySet(segments: GridRoadSegment[], radius: number, width: number, height: number): Set<string> {
  const keys = new Set<string>();
  segments.forEach((segment) => addWideLineKeys(keys, segment.points, radius, width, height));
  return keys;
}

function createLocalRoadKeySet(sceneCoords: Record<string, GridCoord>): Set<string> {
  const coords = Object.values(sceneCoords);
  const keys = new Set<string>();
  if (coords.length < 2) {
    return keys;
  }
  const hub = coords[0];
  coords.slice(1).forEach((coord) => addWideLineKeys(keys, createLineCoords(hub, coord), 0, 999, 999));
  return keys;
}

function addWideLineKeys(keys: Set<string>, points: GridCoord[], radius: number, width: number, height: number) {
  for (const coord of points) {
    for (let y = coord.y - radius; y <= coord.y + radius; y += 1) {
      for (let x = coord.x - radius; x <= coord.x + radius; x += 1) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          keys.add(`${x},${y}`);
        }
      }
    }
  }
}

function createLineCoords(from: GridCoord, to: GridCoord): GridCoord[] {
  const coords: GridCoord[] = [];
  let x0 = from.x;
  let y0 = from.y;
  const x1 = to.x;
  const y1 = to.y;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;

  while (true) {
    coords.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) {
      break;
    }
    const nextError = 2 * error;
    if (nextError >= dy) {
      error += dy;
      x0 += sx;
    }
    if (nextError <= dx) {
      error += dx;
      y0 += sy;
    }
  }

  return coords;
}

function getSceneTerrain(location: LocationNode, sceneId: string): GridTerrain {
  const scene = location.scenes.find((item) => item.id === sceneId);
  if (!scene) {
    return location.type === "secret" ? "secret" : "city";
  }
  if (scene.type.includes("战斗")) {
    return location.type === "secret" ? "forbidden" : "mountain";
  }
  if (scene.type.includes("采集")) {
    return "valley";
  }
  if (scene.type.includes("交易") || scene.type.includes("任务") || scene.type.includes("NPC")) {
    return "city";
  }
  if (scene.type.includes("秘境") || scene.type.includes("机缘")) {
    return "secret";
  }
  return location.type === "wild" ? "forest" : location.type === "secret" ? "secret" : "city";
}

function isCoordInRect(coord: GridCoord, rect: Rect): boolean {
  return coord.x >= rect.x && coord.x < rect.x + rect.width && coord.y >= rect.y && coord.y < rect.y + rect.height;
}

function normalizeGridCoordForVersion(map: GridMapData, coord: GridCoord, rawMapVersion: number | undefined): GridCoord {
  const nextCoord = rawMapVersion === GRID_NAVIGATION_VERSION ? coord : migrateLegacyGridCoord(map, coord, rawMapVersion);
  return {
    x: Math.min(map.width - 1, Math.max(0, Math.floor(nextCoord.x))),
    y: Math.min(map.height - 1, Math.max(0, Math.floor(nextCoord.y))),
  };
}

function migrateLegacyGridCoord(map: GridMapData, coord: GridCoord, rawMapVersion: number | undefined): GridCoord {
  if (map.mapId !== WORLD_GRID_MAP_ID) {
    return coord;
  }
  const legacyWidth = rawMapVersion === 2 ? 48 : 24;
  const legacyHeight = rawMapVersion === 2 ? 32 : 16;
  return {
    x: Math.round((coord.x / legacyWidth) * WORLD_GRID_MAP_WIDTH),
    y: Math.round((coord.y / legacyHeight) * WORLD_GRID_MAP_HEIGHT),
  };
}

function gridCoordKey(coord: GridCoord): string {
  return `${coord.x},${coord.y}`;
}
