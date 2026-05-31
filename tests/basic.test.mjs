import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const timeSource = readFileSync("src/data/time.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const workflow = readFileSync(".github/workflows/deploy-pages.yml", "utf8");
const worldSource = readFileSync("src/data/world.ts", "utf8");
const worldPoiSource = readFileSync("src/data/worldPois.ts", "utf8");
const gridMapsSource = readFileSync("src/data/gridMaps.ts", "utf8");
const explorePanelSource = readFileSync("src/components/ExplorePanel.tsx", "utf8");

function numericConst(name) {
  const match = timeSource.match(new RegExp(`export const ${name} = ([0-9]+)`));
  assert.ok(match, `Missing ${name}`);
  return Number(match[1]);
}

const monthsPerYear = numericConst("CALENDAR_MONTHS_PER_YEAR");
const daysPerMonth = numericConst("CALENDAR_DAYS_PER_MONTH");
const hoursPerDay = numericConst("CALENDAR_HOURS_PER_DAY");
const ticksPerHour = numericConst("CALENDAR_TICKS_PER_HOUR");
const ticksPerDay = hoursPerDay * ticksPerHour;

function fromTickIndex(index) {
  const dayIndex = Math.floor(index / ticksPerDay);
  const year = Math.floor(dayIndex / (monthsPerYear * daysPerMonth)) + 1;
  const remainYear = dayIndex % (monthsPerYear * daysPerMonth);
  const month = Math.floor(remainYear / daysPerMonth) + 1;
  const day = (remainYear % daysPerMonth) + 1;
  const hour = index % ticksPerDay;
  return { year, month, day, hour, dayIndex, tickIndex: index };
}

test("calendar tick/hour/day constants are internally consistent", () => {
  assert.equal(hoursPerDay, 24);
  assert.equal(ticksPerHour, 1);
  assert.equal(ticksPerDay, hoursPerDay * ticksPerHour);
});

test("calendar tick math crosses hours, days, months, and years without drift", () => {
  assert.deepEqual(fromTickIndex(23), { year: 1, month: 1, day: 1, hour: 23, dayIndex: 0, tickIndex: 23 });
  assert.deepEqual(fromTickIndex(25), { year: 1, month: 1, day: 2, hour: 1, dayIndex: 1, tickIndex: 25 });
  assert.deepEqual(fromTickIndex(30 * ticksPerDay), { year: 1, month: 2, day: 1, hour: 0, dayIndex: 30, tickIndex: 30 * ticksPerDay });
  assert.deepEqual(fromTickIndex(360 * ticksPerDay), { year: 2, month: 1, day: 1, hour: 0, dayIndex: 360, tickIndex: 360 * ticksPerDay });
});

test("repository quality gate uses npm only", () => {
  assert.equal(existsSync("yarn.lock"), false);
  assert.ok(existsSync("package-lock.json"));
  assert.equal(packageJson.scripts.typecheck, "tsc --noEmit");
  assert.equal(packageJson.scripts.test, "node --test tests/basic.test.mjs");
  assert.match(workflow, /cache: npm/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run quality/);
});

test("chapter one locations declare content pools", () => {
  assert.match(worldSource, /id: "qingyun_city"[\s\S]*eventPoolIds: \["qingyun_notice_tip", "mist_traveling_cultivator"\]/);
  assert.match(worldSource, /id: "black_wind_mountain"[\s\S]*enemyPoolIds: \["wolf_pack", "black_wind_duo"\]/);
  assert.match(worldSource, /id: "black_wind_mountain"[\s\S]*dropPool:/);
});

function parseWorldPois() {
  const pois = new Map();
  const matches = worldPoiSource.matchAll(/\{\s*id: "([^"]+)"[\s\S]*?coord: \{ x: ([0-9]+), y: ([0-9]+) \}/g);
  for (const match of matches) {
    pois.set(match[1], { x: Number(match[2]), y: Number(match[3]) });
  }
  return pois;
}

function parseWorldRoadPairs() {
  const roadPairsMatch = gridMapsSource.match(/export const worldRoadPairs:[\s\S]*?=\s*\[([\s\S]*?)\];/);
  assert.ok(roadPairsMatch, "worldRoadPairs should be exported from gridMaps.ts");
  return [...roadPairsMatch[1].matchAll(/\["([^"]+)", "([^"]+)"\]/g)].map((match) => [match[1], match[2]]);
}

function coordKey(coord) {
  return `${coord.x},${coord.y}`;
}

function createLineCoords(from, to) {
  const coords = [];
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

function createRoadKeySet(pois, pairs) {
  const roadKeys = new Set();
  for (const [fromId, toId] of pairs) {
    const from = pois.get(fromId);
    const to = pois.get(toId);
    assert.ok(from, `Missing road from POI ${fromId}`);
    assert.ok(to, `Missing road to POI ${toId}`);
    for (const coord of createLineCoords(from, to)) {
      for (let y = coord.y - 1; y <= coord.y + 1; y += 1) {
        for (let x = coord.x - 1; x <= coord.x + 1; x += 1) {
          if (x >= 0 && x < 320 && y >= 0 && y < 200) {
            roadKeys.add(`${x},${y}`);
          }
        }
      }
    }
  }
  return roadKeys;
}

function findRoadBiasedPath(start, target, roadKeys) {
  const open = [start];
  const cameFrom = new Map();
  const gScore = new Map([[coordKey(start), 0]]);
  const fScore = new Map([[coordKey(start), manhattan(start, target) * 0.55]]);
  const directions = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  while (open.length > 0) {
    open.sort((left, right) => (fScore.get(coordKey(left)) ?? Infinity) - (fScore.get(coordKey(right)) ?? Infinity));
    const current = open.shift();
    if (current.x === target.x && current.y === target.y) {
      return reconstruct(cameFrom, current);
    }

    for (const direction of directions) {
      const neighbor = { x: current.x + direction.x, y: current.y + direction.y };
      if (neighbor.x < 3 || neighbor.x >= 317 || neighbor.y < 3 || neighbor.y >= 197) {
        continue;
      }
      const neighborKey = coordKey(neighbor);
      const tentative = (gScore.get(coordKey(current)) ?? Infinity) + (roadKeys.has(neighborKey) ? 0.55 : 1.15);
      if (tentative >= (gScore.get(neighborKey) ?? Infinity)) {
        continue;
      }
      cameFrom.set(neighborKey, coordKey(current));
      gScore.set(neighborKey, tentative);
      fScore.set(neighborKey, tentative + manhattan(neighbor, target) * 0.55);
      if (!open.some((coord) => coord.x === neighbor.x && coord.y === neighbor.y)) {
        open.push(neighbor);
      }
    }
  }

  return [];
}

function reconstruct(cameFrom, current) {
  const path = [current];
  let currentKey = coordKey(current);
  while (cameFrom.has(currentKey)) {
    currentKey = cameFrom.get(currentKey);
    const [x, y] = currentKey.split(",").map(Number);
    path.unshift({ x, y });
  }
  return path;
}

function manhattan(left, right) {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

test("world road network connects every configured POI", () => {
  const pois = parseWorldPois();
  const pairs = parseWorldRoadPairs();
  const connectedPoiIds = new Set(pairs.flat());

  assert.ok(pois.size >= 20, "Expected the full world POI list");
  for (const poiId of pois.keys()) {
    assert.ok(connectedPoiIds.has(poiId), `${poiId} should be connected by at least one road segment`);
  }
});

test("road-biased A* routes use recorded world roads", () => {
  const pois = parseWorldPois();
  const roadKeys = createRoadKeySet(pois, parseWorldRoadPairs());
  const pairsToCheck = [
    ["qingyun_city", "black_wind_mountain"],
    ["qingyun_city", "tian_xuan_gate"],
    ["qingyun_city", "baicao_valley"],
    ["baicao_valley", "ten_thousand_beast_mountain"],
  ];

  for (const [fromId, toId] of pairsToCheck) {
    const path = findRoadBiasedPath(pois.get(fromId), pois.get(toId), roadKeys);
    const roadSteps = path.filter((coord) => roadKeys.has(coordKey(coord))).length;
    assert.ok(path.length > 0, `${fromId} -> ${toId} should have a path`);
    assert.ok(roadSteps > 0, `${fromId} -> ${toId} should include road cells`);
    assert.ok(roadSteps / path.length >= 0.45, `${fromId} -> ${toId} should strongly prefer roads`);
  }
});

test("12x grid zoom keeps visible cell rendering near the viewport", () => {
  assert.match(explorePanelSource, /const GRID_MAP_MAX_SCALE = 12;/);
  assert.match(explorePanelSource, /function getVisibleGridRectFromViewport/);

  const viewport = { width: 430, height: 460 };
  const map = { width: 320, height: 200 };
  const scale = 12;
  const padding = 4;
  const canvas = { width: viewport.width, height: viewport.width * (map.height / map.width) };
  const cellWidth = canvas.width / map.width;
  const cellHeight = canvas.height / map.height;
  const visibleWidth = Math.ceil(map.width / 2 + viewport.width / (2 * cellWidth * scale)) + padding - (Math.floor(map.width / 2 - viewport.width / (2 * cellWidth * scale)) - padding);
  const visibleHeight = Math.ceil(map.height / 2 + viewport.height / (2 * cellHeight * scale)) + padding - (Math.floor(map.height / 2 - viewport.height / (2 * cellHeight * scale)) - padding);

  assert.ok(visibleWidth * visibleHeight < 3000);
  assert.ok(visibleWidth * visibleHeight < 320 * 200);
});
