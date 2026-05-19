import type { GridCell, GridCoord, GridMapData, GridNavigationState } from "../types";

export const WORLD_GRID_MAP_ID = "world";
export const SOUTH_RIDGE_GRID_MAP_ID = "region:south_ridge";
export const GRID_MAP_WIDTH = 24;
export const GRID_MAP_HEIGHT = 16;
export const GRID_CELL_SIZE = 64;

export const defaultWorldCoord: GridCoord = { x: 11, y: 6 };
export const defaultSouthRidgeCoord: GridCoord = { x: 12, y: 4 };

export const worldProvincePortals: Record<string, GridCoord> = {
  central: defaultWorldCoord,
  south_ridge: { x: 11, y: 11 },
};

export const southRidgeLocationCoords: Record<string, GridCoord> = {
  wuyao_alliance: defaultSouthRidgeCoord,
  wood_spirit_sect: { x: 5, y: 3 },
  baicao_valley: { x: 9, y: 7 },
  ten_thousand_beast_mountain: { x: 7, y: 5 },
  miasma_marsh: { x: 4, y: 10 },
  thousand_falls_cliff: { x: 14, y: 7 },
  tide_market: { x: 19, y: 7 },
  returning_tide_reef: { x: 17, y: 12 },
};

export const gridMaps: GridMapData[] = [
  createGridMap({
    mapId: WORLD_GRID_MAP_ID,
    defaultRegionId: "world",
    blockedRects: [
      { x: 0, y: 0, width: 24, height: 1 },
      { x: 0, y: 15, width: 24, height: 1 },
      { x: 0, y: 0, width: 2, height: 16 },
      { x: 22, y: 0, width: 2, height: 16 },
      { x: 17, y: 1, width: 4, height: 3 },
      { x: 2, y: 11, width: 4, height: 3 },
      { x: 13, y: 8, width: 4, height: 2 },
    ],
    highCostRects: [
      { x: 7, y: 9, width: 5, height: 3, movementCost: 2 },
      { x: 9, y: 3, width: 4, height: 2, movementCost: 2 },
    ],
    portals: [
      { coord: worldProvincePortals.central, regionId: "central" },
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
    mapId: SOUTH_RIDGE_GRID_MAP_ID,
    defaultRegionId: "south_ridge",
    blockedRects: [
      { x: 0, y: 0, width: 24, height: 1 },
      { x: 0, y: 15, width: 24, height: 1 },
      { x: 0, y: 0, width: 1, height: 16 },
      { x: 23, y: 0, width: 1, height: 16 },
      { x: 1, y: 1, width: 3, height: 3 },
      { x: 20, y: 1, width: 3, height: 4 },
      { x: 11, y: 8, width: 3, height: 3 },
      { x: 5, y: 12, width: 4, height: 2 },
      { x: 15, y: 3, width: 2, height: 3 },
    ],
    highCostRects: [
      { x: 3, y: 8, width: 4, height: 4, movementCost: 3 },
      { x: 16, y: 11, width: 4, height: 3, movementCost: 2 },
      { x: 8, y: 5, width: 4, height: 3, movementCost: 2 },
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
  if (regionId === "south_ridge") {
    return SOUTH_RIDGE_GRID_MAP_ID;
  }
  return undefined;
}

export function getWorldProvincePortalCoord(provinceId: string): GridCoord | undefined {
  return worldProvincePortals[provinceId];
}

export function getRegionLocationGridCoord(regionId: string, locationId: string): GridCoord | undefined {
  if (regionId !== "south_ridge") {
    return undefined;
  }
  return southRidgeLocationCoords[locationId];
}

export function getDefaultGridCoord(mapId: string): GridCoord {
  if (mapId === SOUTH_RIDGE_GRID_MAP_ID) {
    return defaultSouthRidgeCoord;
  }
  return defaultWorldCoord;
}

export function createDefaultGridNavigationState(activeMapId = WORLD_GRID_MAP_ID): GridNavigationState {
  return {
    activeMapId,
    positions: {
      [WORLD_GRID_MAP_ID]: defaultWorldCoord,
      [SOUTH_RIDGE_GRID_MAP_ID]: defaultSouthRidgeCoord,
    },
  };
}

export function normalizeGridNavigationState(raw: Partial<GridNavigationState> | undefined): GridNavigationState {
  const defaults = createDefaultGridNavigationState(raw?.activeMapId ?? WORLD_GRID_MAP_ID);
  const positions = { ...defaults.positions };

  Object.entries(raw?.positions ?? {}).forEach(([mapId, coord]) => {
    const map = getGridMapData(mapId);
    if (!map || typeof coord?.x !== "number" || typeof coord?.y !== "number") {
      return;
    }
    positions[mapId] = {
      x: Math.min(map.width - 1, Math.max(0, Math.floor(coord.x))),
      y: Math.min(map.height - 1, Math.max(0, Math.floor(coord.y))),
    };
  });

  return {
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
