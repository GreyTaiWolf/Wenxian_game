import type { GridCell, GridCoord, GridMapData, GridNavigationState } from "../types";

export const WORLD_GRID_MAP_ID = "world";
export const CENTRAL_GRID_MAP_ID = "region:central";
export const SOUTH_RIDGE_GRID_MAP_ID = "region:south_ridge";
export const GRID_NAVIGATION_VERSION = 2;
export const GRID_MAP_WIDTH = 48;
export const GRID_MAP_HEIGHT = 32;
export const GRID_CELL_SIZE = 32;

export const defaultWorldCoord: GridCoord = { x: 23, y: 13 };
export const defaultCentralCoord: GridCoord = { x: 24, y: 15 };
export const defaultSouthRidgeCoord: GridCoord = { x: 25, y: 9 };

export const worldProvincePortals: Record<string, GridCoord> = {
  central: defaultWorldCoord,
  south_ridge: { x: 23, y: 23 },
};

export const centralLocationCoords: Record<string, GridCoord> = {
  qingyun_city: defaultCentralCoord,
  tian_xuan_gate: { x: 28, y: 16 },
  black_wind_mountain: { x: 6, y: 12 },
  herb_valley: { x: 21, y: 25 },
  ancient_cave: { x: 34, y: 5 },
  luoxia_town: { x: 8, y: 24 },
};

export const southRidgeLocationCoords: Record<string, GridCoord> = {
  wuyao_alliance: defaultSouthRidgeCoord,
  wood_spirit_sect: { x: 11, y: 7 },
  baicao_valley: { x: 19, y: 15 },
  ten_thousand_beast_mountain: { x: 15, y: 11 },
  miasma_marsh: { x: 9, y: 21 },
  thousand_falls_cliff: { x: 29, y: 15 },
  tide_market: { x: 39, y: 15 },
  returning_tide_reef: { x: 35, y: 25 },
};

export const gridMaps: GridMapData[] = [
  createGridMap({
    mapId: WORLD_GRID_MAP_ID,
    defaultRegionId: "world",
    blockedRects: [
      { x: 0, y: 0, width: 48, height: 2 },
      { x: 0, y: 30, width: 48, height: 2 },
      { x: 0, y: 0, width: 4, height: 32 },
      { x: 44, y: 0, width: 4, height: 32 },
      { x: 34, y: 2, width: 8, height: 6 },
      { x: 4, y: 22, width: 8, height: 6 },
      { x: 26, y: 16, width: 8, height: 4 },
    ],
    highCostRects: [
      { x: 14, y: 18, width: 10, height: 6, movementCost: 2 },
      { x: 18, y: 6, width: 8, height: 4, movementCost: 2 },
    ],
    portals: [
      {
        coord: worldProvincePortals.central,
        regionId: "central",
        portalTargetMapId: CENTRAL_GRID_MAP_ID,
        portalTargetX: defaultCentralCoord.x,
        portalTargetY: defaultCentralCoord.y,
      },
      {
        coord: worldProvincePortals.south_ridge,
        regionId: "south_ridge",
        portalTargetMapId: SOUTH_RIDGE_GRID_MAP_ID,
        portalTargetX: defaultSouthRidgeCoord.x,
        portalTargetY: defaultSouthRidgeCoord.y,
      },
    ],
  }),
  createGridMap({
    mapId: CENTRAL_GRID_MAP_ID,
    defaultRegionId: "central",
    blockedRects: [
      { x: 0, y: 0, width: 48, height: 2 },
      { x: 0, y: 30, width: 48, height: 2 },
      { x: 0, y: 0, width: 2, height: 32 },
      { x: 46, y: 0, width: 2, height: 32 },
      { x: 2, y: 4, width: 8, height: 5 },
      { x: 15, y: 2, width: 8, height: 4 },
      { x: 36, y: 2, width: 8, height: 5 },
      { x: 37, y: 22, width: 7, height: 6 },
      { x: 3, y: 24, width: 4, height: 4 },
    ],
    highCostRects: [
      { x: 13, y: 10, width: 10, height: 5, movementCost: 2 },
      { x: 26, y: 16, width: 8, height: 6, movementCost: 2 },
      { x: 18, y: 22, width: 8, height: 6, movementCost: 2 },
    ],
    portals: Object.entries(centralLocationCoords).map(([locationId, coord]) => ({
      coord,
      regionId: `location:${locationId}`,
    })),
  }),
  createGridMap({
    mapId: SOUTH_RIDGE_GRID_MAP_ID,
    defaultRegionId: "south_ridge",
    blockedRects: [
      { x: 0, y: 0, width: 48, height: 2 },
      { x: 0, y: 30, width: 48, height: 2 },
      { x: 0, y: 0, width: 2, height: 32 },
      { x: 46, y: 0, width: 2, height: 32 },
      { x: 2, y: 2, width: 6, height: 6 },
      { x: 40, y: 2, width: 6, height: 8 },
      { x: 22, y: 16, width: 6, height: 6 },
      { x: 10, y: 24, width: 8, height: 4 },
      { x: 30, y: 6, width: 4, height: 6 },
    ],
    highCostRects: [
      { x: 6, y: 16, width: 8, height: 8, movementCost: 3 },
      { x: 32, y: 22, width: 8, height: 6, movementCost: 2 },
      { x: 16, y: 10, width: 8, height: 6, movementCost: 2 },
    ],
    portals: Object.entries(southRidgeLocationCoords).map(([locationId, coord]) => ({
      coord,
      regionId: `location:${locationId}`,
    })),
  }),
];

export function getGridMapData(mapId: string): GridMapData | undefined {
  return gridMaps.find((map) => map.mapId === mapId);
}

export function getRegionGridMapId(regionId: string): string | undefined {
  if (regionId === "central") {
    return CENTRAL_GRID_MAP_ID;
  }
  if (regionId === "south_ridge") {
    return SOUTH_RIDGE_GRID_MAP_ID;
  }
  return undefined;
}

export function getWorldProvincePortalCoord(provinceId: string): GridCoord | undefined {
  return worldProvincePortals[provinceId];
}

export function getRegionLocationGridCoord(regionId: string, locationId: string): GridCoord | undefined {
  if (regionId === "central") {
    return centralLocationCoords[locationId];
  }
  if (regionId === "south_ridge") {
    return southRidgeLocationCoords[locationId];
  }
  return undefined;
}

export function getDefaultGridCoord(mapId: string): GridCoord {
  if (mapId === CENTRAL_GRID_MAP_ID) {
    return defaultCentralCoord;
  }
  if (mapId === SOUTH_RIDGE_GRID_MAP_ID) {
    return defaultSouthRidgeCoord;
  }
  return defaultWorldCoord;
}

export function createDefaultGridNavigationState(activeMapId = WORLD_GRID_MAP_ID): GridNavigationState {
  return {
    mapVersion: GRID_NAVIGATION_VERSION,
    activeMapId,
    positions: {
      [WORLD_GRID_MAP_ID]: defaultWorldCoord,
      [CENTRAL_GRID_MAP_ID]: defaultCentralCoord,
      [SOUTH_RIDGE_GRID_MAP_ID]: defaultSouthRidgeCoord,
    },
  };
}

export function normalizeGridNavigationState(raw: Partial<GridNavigationState> | undefined): GridNavigationState {
  const defaults = createDefaultGridNavigationState(raw?.activeMapId ?? WORLD_GRID_MAP_ID);
  const positions = { ...defaults.positions };
  const shouldMigrateLegacyCoords = raw?.mapVersion !== GRID_NAVIGATION_VERSION;

  Object.entries(raw?.positions ?? {}).forEach(([mapId, coord]) => {
    const map = getGridMapData(mapId);
    if (!map || typeof coord?.x !== "number" || typeof coord?.y !== "number") {
      return;
    }
    positions[mapId] = normalizeGridCoordForVersion(map, coord, shouldMigrateLegacyCoords);
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

interface HighCostRect extends Rect {
  movementCost: number;
}

interface PortalConfig {
  coord: GridCoord;
  regionId: string;
  portalTargetMapId?: string;
  portalTargetX?: number;
  portalTargetY?: number;
}

function createGridMap({
  mapId,
  defaultRegionId,
  blockedRects,
  highCostRects,
  portals,
}: {
  mapId: string;
  defaultRegionId: string;
  blockedRects: Rect[];
  highCostRects: HighCostRect[];
  portals: PortalConfig[];
}): GridMapData {
  const portalByKey = new Map(portals.map((portal) => [`${portal.coord.x},${portal.coord.y}`, portal]));
  const cells: GridCell[] = [];

  for (let y = 0; y < GRID_MAP_HEIGHT; y += 1) {
    for (let x = 0; x < GRID_MAP_WIDTH; x += 1) {
      const coord = { x, y };
      const portal = portalByKey.get(`${x},${y}`);
      const highCostRect = highCostRects.find((rect) => isCoordInRect(coord, rect));
      cells.push({
        x,
        y,
        walkable: Boolean(portal) || !blockedRects.some((rect) => isCoordInRect(coord, rect)),
        movementCost: highCostRect?.movementCost ?? 1,
        regionId: portal?.regionId ?? defaultRegionId,
        portalTargetMapId: portal?.portalTargetMapId,
        portalTargetX: portal?.portalTargetX,
        portalTargetY: portal?.portalTargetY,
      });
    }
  }

  return {
    mapId,
    width: GRID_MAP_WIDTH,
    height: GRID_MAP_HEIGHT,
    cellSize: GRID_CELL_SIZE,
    origin: { x: 0, y: 0 },
    cells,
  };
}

function isCoordInRect(coord: GridCoord, rect: Rect): boolean {
  return coord.x >= rect.x && coord.x < rect.x + rect.width && coord.y >= rect.y && coord.y < rect.y + rect.height;
}

function normalizeGridCoordForVersion(map: GridMapData, coord: GridCoord, shouldMigrateLegacyCoords: boolean): GridCoord {
  const nextCoord = shouldMigrateLegacyCoords ? migrateLegacyGridCoord(coord) : coord;
  return {
    x: Math.min(map.width - 1, Math.max(0, Math.floor(nextCoord.x))),
    y: Math.min(map.height - 1, Math.max(0, Math.floor(nextCoord.y))),
  };
}

function migrateLegacyGridCoord(coord: GridCoord): GridCoord {
  return {
    x: Math.floor(coord.x) * 2 + 1,
    y: Math.floor(coord.y) * 2 + 1,
  };
}
