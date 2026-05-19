import type { GridCell, GridCoord, GridDestinationZone, GridMapData, Vector2 } from "../types";

const cardinalDirections: GridCoord[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export interface GridNavigationSelfTestResult {
  ok: boolean;
  summary: string;
  checks: Array<{ name: string; ok: boolean; detail: string }>;
}

export function gridCoordKey(coord: GridCoord): string {
  return `${coord.x},${coord.y}`;
}

export function isSameGridCoord(left: GridCoord | null | undefined, right: GridCoord | null | undefined): boolean {
  return Boolean(left && right && left.x === right.x && left.y === right.y);
}

export function isGridCoordInsideMap(map: GridMapData, coord: GridCoord): boolean {
  return coord.x >= 0 && coord.x < map.width && coord.y >= 0 && coord.y < map.height;
}

export function clampGridCoord(map: GridMapData, coord: GridCoord): GridCoord {
  return {
    x: Math.min(map.width - 1, Math.max(0, Math.floor(coord.x))),
    y: Math.min(map.height - 1, Math.max(0, Math.floor(coord.y))),
  };
}

export function getGridCell(map: GridMapData, coord: GridCoord): GridCell | undefined {
  if (!isGridCoordInsideMap(map, coord)) {
    return undefined;
  }
  return map.cells[coord.y * map.width + coord.x];
}

export function isGridCellWalkable(map: GridMapData, coord: GridCoord): boolean {
  return getGridCell(map, coord)?.walkable ?? false;
}

export function worldPositionToGridCoord(map: GridMapData, position: Vector2): GridCoord {
  return clampGridCoord(map, {
    x: Math.floor((position.x - map.origin.x) / map.cellSize),
    y: Math.floor((position.y - map.origin.y) / map.cellSize),
  });
}

export function gridCoordToWorldPosition(map: GridMapData, coord: GridCoord): Vector2 {
  const safeCoord = clampGridCoord(map, coord);
  return {
    x: map.origin.x + (safeCoord.x + 0.5) * map.cellSize,
    y: map.origin.y + (safeCoord.y + 0.5) * map.cellSize,
  };
}

export function findNearestWalkableCell(map: GridMapData, target: GridCoord): GridCoord | null {
  const start = clampGridCoord(map, target);
  if (isGridCellWalkable(map, start)) {
    return start;
  }

  const visited = new Set<string>([gridCoordKey(start)]);
  const queue: GridCoord[] = [start];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    for (const direction of cardinalDirections) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      if (!isGridCoordInsideMap(map, next)) {
        continue;
      }

      const key = gridCoordKey(next);
      if (visited.has(key)) {
        continue;
      }

      if (isGridCellWalkable(map, next)) {
        return next;
      }

      visited.add(key);
      queue.push(next);
    }
  }

  return null;
}

export function findPathAStar(map: GridMapData, startCoord: GridCoord, targetCoord: GridCoord): GridCoord[] {
  const start = findNearestWalkableCell(map, startCoord);
  const target = findNearestWalkableCell(map, targetCoord);

  if (!start || !target) {
    return [];
  }

  if (isSameGridCoord(start, target)) {
    return [start];
  }

  const open: GridCoord[] = [start];
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([[gridCoordKey(start), 0]]);
  const fScore = new Map<string, number>([[gridCoordKey(start), heuristic(start, target)]]);

  while (open.length > 0) {
    open.sort((left, right) => {
      const scoreDelta = (fScore.get(gridCoordKey(left)) ?? Number.POSITIVE_INFINITY) - (fScore.get(gridCoordKey(right)) ?? Number.POSITIVE_INFINITY);
      return scoreDelta || left.y - right.y || left.x - right.x;
    });

    const current = open.shift();
    if (!current) {
      break;
    }

    if (isSameGridCoord(current, target)) {
      return reconstructPath(cameFrom, current);
    }

    for (const direction of cardinalDirections) {
      const neighbor = { x: current.x + direction.x, y: current.y + direction.y };
      const neighborCell = getGridCell(map, neighbor);
      if (!neighborCell?.walkable) {
        continue;
      }

      const currentKey = gridCoordKey(current);
      const neighborKey = gridCoordKey(neighbor);
      const tentativeGScore = (gScore.get(currentKey) ?? Number.POSITIVE_INFINITY) + Math.max(1, neighborCell.movementCost);

      if (tentativeGScore >= (gScore.get(neighborKey) ?? Number.POSITIVE_INFINITY)) {
        continue;
      }

      cameFrom.set(neighborKey, currentKey);
      gScore.set(neighborKey, tentativeGScore);
      fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, target));

      if (!open.some((coord) => isSameGridCoord(coord, neighbor))) {
        open.push(neighbor);
      }
    }
  }

  return [];
}

export function getPathMovementSteps(path: GridCoord[]): GridCoord[] {
  return path.slice(1);
}

export function validateGridPath(map: GridMapData, path: GridCoord[]): boolean {
  return path.every((coord, index) => {
    if (!isGridCellWalkable(map, coord)) {
      return false;
    }
    if (index === 0) {
      return true;
    }
    const previous = path[index - 1];
    return Math.abs(previous.x - coord.x) + Math.abs(previous.y - coord.y) === 1;
  });
}

export function getNearestWalkableZoneCoord(map: GridMapData, zone: GridDestinationZone, fromCoord: GridCoord = zone.anchor): GridCoord | null {
  if (zone.mapId !== map.mapId) {
    return null;
  }

  const walkableCells = zone.cells.filter((coord) => isGridCellWalkable(map, coord));
  if (walkableCells.length > 0) {
    return [...walkableCells].sort((left, right) => {
      const distanceDelta = heuristic(left, fromCoord) - heuristic(right, fromCoord);
      const anchorDelta = heuristic(left, zone.anchor) - heuristic(right, zone.anchor);
      return distanceDelta || anchorDelta || left.y - right.y || left.x - right.x;
    })[0];
  }

  return findNearestWalkableCell(map, zone.anchor);
}

export function runGridNavigationSelfTest(maps: GridMapData[], zones: GridDestinationZone[] = []): GridNavigationSelfTestResult {
  const checks: GridNavigationSelfTestResult["checks"] = [];

  maps.forEach((map) => {
    const sampleCoord = findNearestWalkableCell(map, { x: Math.floor(map.width / 2), y: Math.floor(map.height / 2) });
    const converted = sampleCoord ? worldPositionToGridCoord(map, gridCoordToWorldPosition(map, sampleCoord)) : null;
    checks.push({
      name: `${map.mapId} 坐标互转`,
      ok: Boolean(sampleCoord && converted && isSameGridCoord(sampleCoord, converted)),
      detail: sampleCoord && converted ? `${gridCoordKey(sampleCoord)} -> ${gridCoordKey(converted)}` : "未找到可走样本格",
    });

    const blockedCell = map.cells.find((cell) => !cell.walkable);
    const nearest = blockedCell ? findNearestWalkableCell(map, blockedCell) : null;
    checks.push({
      name: `${map.mapId} 最近可走格`,
      ok: Boolean(blockedCell && nearest && isGridCellWalkable(map, nearest)),
      detail: blockedCell && nearest ? `${gridCoordKey(blockedCell)} -> ${gridCoordKey(nearest)}` : "未配置不可走格",
    });

    const portals = map.cells.filter((cell) => cell.walkable && cell.portalTargetMapId);
    const routeTarget = portals[0] ?? map.cells.find((cell) => cell.walkable && Boolean(sampleCoord) && !isSameGridCoord(cell, sampleCoord));
    const path = sampleCoord && routeTarget ? findPathAStar(map, sampleCoord, routeTarget) : [];
    checks.push({
      name: `${map.mapId} A* 路径`,
      ok: path.length > 0 && validateGridPath(map, path),
      detail: path.length > 0 ? `${path.length} 格` : "未找到有效路径",
    });

    if (portals.length > 0) {
      checks.push({
        name: `${map.mapId} portal 配置`,
        ok: portals.every((cell) => typeof cell.portalTargetX === "number" && typeof cell.portalTargetY === "number"),
        detail: `${portals.length} 个入口格`,
      });
    }
  });

  zones.forEach((zone) => {
    const map = maps.find((item) => item.mapId === zone.mapId);
    const cellsInsideMap = map ? zone.cells.every((coord) => isGridCoordInsideMap(map, coord)) : false;
    const walkableZoneCells = map ? zone.cells.filter((coord) => isGridCellWalkable(map, coord)) : [];
    const zoneTarget = map ? getNearestWalkableZoneCoord(map, zone) : null;

    checks.push({
      name: `${zone.zoneId} 区域配置`,
      ok: Boolean(map && zone.cells.length > 0 && cellsInsideMap && walkableZoneCells.length > 0 && zoneTarget),
      detail: map
        ? `${zone.cells.length} 格，${walkableZoneCells.length} 格可走，目标 ${zoneTarget ? gridCoordKey(zoneTarget) : "-"}`
        : "找不到地图",
    });
  });

  const ok = checks.every((check) => check.ok);
  return {
    ok,
    summary: ok ? `网格导航自检通过：${checks.length} 项` : `网格导航自检失败：${checks.filter((check) => !check.ok).length} 项`,
    checks,
  };
}

function heuristic(left: GridCoord, right: GridCoord): number {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

function reconstructPath(cameFrom: Map<string, string>, current: GridCoord): GridCoord[] {
  const path = [current];
  let currentKey = gridCoordKey(current);

  while (cameFrom.has(currentKey)) {
    const previousKey = cameFrom.get(currentKey);
    if (!previousKey) {
      break;
    }
    const [x, y] = previousKey.split(",").map(Number);
    path.unshift({ x, y });
    currentKey = previousKey;
  }

  return path;
}
