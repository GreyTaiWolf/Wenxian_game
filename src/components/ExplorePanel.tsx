import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent } from "react";
import {
  WORLD_GRID_MAP_ID,
  getDefaultGridCoord,
  getGridMapData,
  getRegionGridMapId,
  getRegionLocationGridCoord,
  getWorldProvincePortalCoord,
  gridMaps,
} from "../data/gridMaps";
import { findGridDestinationZone, getGridDestinationZone, getGridDestinationZones, gridDestinationZones } from "../data/gridMapZones";
import { formatItemName, getItem, shouldEmphasizeItemGrade } from "../data/items";
import { getRegionMapConfig, type RegionMapConfig } from "../data/regionMaps";
import { getLocation, getRegion, getScene, shopItems, tasks, type LocationNode, type SceneAction, type SceneHotspot, type SceneNode } from "../data/world";
import { getWorldProvince, worldProvinces, type WorldProvince } from "../data/worldMap";
import { beginCombat, grantGatherReward, grantTreasure } from "../game/combatEngine";
import {
  findNearestWalkableCell,
  findPathAStar,
  getGridCell,
  getGridPathTravelHours,
  getGridStepTravelHours,
  getNearestWalkableZoneCoord,
  getPathMovementSteps,
  gridCoordKey,
  isSameGridCoord,
  runGridNavigationSelfTest,
  worldPositionToGridCoord,
} from "../game/gridNavigation";
import {
  acceptQuest,
  completeQuest,
  getQuestAvailability,
  getQuestPrerequisiteHint,
  getQuestProgress,
  recordQuestEvent,
} from "../game/quests";
import { addItems, addRewards, appendLog, joinSect, recruitCompanion, recruitPet } from "../game/state";
import { advanceTime } from "../game/time";
import { maybeQueueTravelEvent } from "../game/travelEvents";
import type {
  ActiveGridTravel,
  GameState,
  GridCoord,
  GridDestinationZone,
  GridMapData,
  GridTravelIntent,
  ItemConfig,
} from "../types";
import { GameIcon, getLocationIconName, type GameIconName } from "./GameIcon";

const sceneImages: Record<string, string> = {
  tian_xuan_gate: new URL("../../maps/tian_xuan_cheng_meng.png", import.meta.url).href,
};
const GRID_MOVEMENT_STEP_MS = 180;
const SHOW_MAP_DEBUG_TOOLS = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);

type ExploreView = "world" | "region" | "location";
type ExploreChange = (next: GameState | ((prev: GameState) => GameState)) => void;
type LocationTravelIntent = Extract<GridTravelIntent, { kind: "locationPreview" | "location" }>;

export default function ExplorePanel({ game, onChange }: { game: GameState; onChange: ExploreChange }) {
  const [view, setView] = useState<ExploreView>("world");
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const [selectedRegionMarkerId, setSelectedRegionMarkerId] = useState<string | null>(null);
  const [activeSceneHotspotId, setActiveSceneHotspotId] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugResult, setDebugResult] = useState<string | null>(null);
  const travel = game.world.activeTravel;
  const region = getRegion(game.world.regionId);
  const location = getLocation(game.world.regionId, game.world.locationId);
  const scene = getScene(game.world.regionId, game.world.locationId, game.world.sceneId);
  const sceneImage = scene.imageKey ? sceneImages[scene.imageKey] : null;
  const activeSceneHotspot = scene.hotspots?.find((hotspot) => hotspot.id === activeSceneHotspotId) ?? null;
  const selectedProvince = selectedProvinceId ? getWorldProvince(selectedProvinceId) : null;
  const currentProvince = getWorldProvince(game.world.regionId);
  const regionMap = getRegionMapConfig(game.world.regionId);

  useEffect(() => {
    setActiveSceneHotspotId(null);
  }, [game.world.sceneId]);

  useEffect(() => {
    if (!travel) {
      return;
    }

    if (travel.path.length === 0) {
      completeTravel(travel);
      return;
    }

    const timer = window.setTimeout(() => {
      onChange((currentGame) => {
        const activeTravel = currentGame.world.activeTravel;
        const [nextStep, ...remainingPath] = activeTravel?.path ?? [];
        if (!activeTravel || !nextStep) {
          return currentGame;
        }
        const movedGame = updateNavigationPosition(currentGame, activeTravel.mapId, nextStep);
        const map = getGridMapData(activeTravel.mapId);
        const timedGame = map ? advanceTime(movedGame, getGridStepTravelHours(map, nextStep)) : movedGame;
        return {
          ...timedGame,
          world: {
            ...timedGame.world,
            activeTravel: {
              ...activeTravel,
              path: remainingPath,
            },
          },
        };
      });
    }, GRID_MOVEMENT_STEP_MS);

    return () => window.clearTimeout(timer);
  }, [travel, onChange]);

  function runSelfTest() {
    const result = runGridNavigationSelfTest(gridMaps, gridDestinationZones);
    const details = result.checks.map((check) => `${check.ok ? "通过" : "失败"}：${check.name}`).join("；");
    setDebugResult(`${result.summary}。${details}`);
    onChange((currentGame) => appendLog(currentGame, result.ok ? "网格导航自检通过。" : "网格导航自检发现异常，请查看调试信息。"));
  }

  function startTravel(mapId: string, rawTarget: GridCoord, intent: GridTravelIntent) {
    if (game.world.activeTravel) {
      onChange((currentGame) => appendLog(currentGame, "你正在赶路，先走完当前行程。"));
      return;
    }
    const map = getGridMapData(mapId);
    if (!map) {
      return;
    }

    const current = getNavigationCoord(game, mapId);
    const target = findNearestWalkableCell(map, rawTarget);
    if (!target) {
      onChange(appendLog(game, "此处灵路断绝，暂时无法前往。"));
      return;
    }

    const path = findPathAStar(map, current, target);
    if (path.length === 0) {
      onChange(appendLog(game, "此处无可通行路线，换个落点再试。"));
      return;
    }

    const steps = getPathMovementSteps(path);
    const totalHours = getGridPathTravelHours(map, steps);
    const activeTravel: ActiveGridTravel = {
      mapId,
      target,
      path: steps,
      totalSteps: steps.length,
      totalHours,
      originLocationId: game.world.locationId,
      intent,
      adjusted: !isSameGridCoord(rawTarget, target),
    };
    setDebugResult(null);
    onChange((currentGame) => {
      const message = getTravelStartMessage(intent, target, !isSameGridCoord(rawTarget, target), steps.length, totalHours);
      const startedGame = appendLog(updateNavigationPosition(currentGame, mapId, path[0]), message);
      return {
        ...startedGame,
        world: {
          ...startedGame.world,
          activeTravel,
        },
      };
    });
  }

  function enterProvince(province: WorldProvince) {
    if (!province.open || !province.regionId) {
      return;
    }
    const map = getGridMapData(WORLD_GRID_MAP_ID);
    const currentCoord = getNavigationCoord(game, WORLD_GRID_MAP_ID);
    const targetCell = map ? getGridCell(map, currentCoord) : undefined;
    setSelectedProvinceId(null);
    setSelectedRegionMarkerId(null);
    setView("region");
    onChange((currentGame) => applyProvinceTravelChange(currentGame, province, targetCell));
  }

  function travelToProvinceMarker(province: WorldProvince) {
    const map = getGridMapData(WORLD_GRID_MAP_ID);
    const zone = getGridDestinationZone(WORLD_GRID_MAP_ID, "province", province.id);
    const zoneTarget = map && zone ? getNearestWalkableZoneCoord(map, zone, getNavigationCoord(game, WORLD_GRID_MAP_ID)) : null;
    const portalCoord = province.regionId ? getWorldProvincePortalCoord(province.regionId) : undefined;
    const target = zoneTarget ?? portalCoord;
    if (!target) {
      return;
    }
    setSelectedProvinceId(null);
    setSelectedRegionMarkerId(null);
    startTravel(WORLD_GRID_MAP_ID, target, { kind: "province", provinceId: province.id });
  }

  function setLocation(locationId: string) {
    const regionMapId = getRegionGridMapId(game.world.regionId);
    const map = regionMapId ? getGridMapData(regionMapId) : undefined;
    const zone = regionMapId ? getGridDestinationZone(regionMapId, "location", locationId) : undefined;
    const zoneTarget = map && zone ? getNearestWalkableZoneCoord(map, zone, getNavigationCoord(game, map.mapId)) : null;
    const locationCoord = getRegionLocationGridCoord(game.world.regionId, locationId);
    const target = zoneTarget ?? locationCoord;
    if (regionMapId && target) {
      startTravel(regionMapId, target, { kind: "location", regionId: game.world.regionId, locationId });
      return;
    }
    onChange(applyLocationChange(game, locationId));
    setView("location");
  }

  function travelToLocationMarker(locationId: string) {
    const regionMapId = getRegionGridMapId(game.world.regionId);
    const map = regionMapId ? getGridMapData(regionMapId) : undefined;
    const zone = regionMapId ? getGridDestinationZone(regionMapId, "location", locationId) : undefined;
    const zoneTarget = map && zone ? getNearestWalkableZoneCoord(map, zone, getNavigationCoord(game, map.mapId)) : null;
    const locationCoord = getRegionLocationGridCoord(game.world.regionId, locationId);
    const target = zoneTarget ?? locationCoord;
    if (regionMapId && target) {
      setSelectedRegionMarkerId(null);
      startTravel(regionMapId, target, { kind: "locationPreview", regionId: game.world.regionId, locationId });
      return;
    }
    setSelectedRegionMarkerId(locationId);
  }

  function enterLocation(locationId: string) {
    setSelectedRegionMarkerId(null);
    onChange(applyLocationChange(game, locationId));
    setView("location");
  }

  function setScene(sceneId: string) {
    setActiveSceneHotspotId(null);
    onChange({
      ...game,
      world: {
        ...game.world,
        sceneId,
        sceneMessage: `来到 ${getScene(game.world.regionId, game.world.locationId, sceneId).name}。`,
      },
    });
  }

  function openSceneHotspot(hotspot: SceneHotspot) {
    setActiveSceneHotspotId(hotspot.id);
    onChange((currentGame) => appendLog(currentGame, `${hotspot.label}：${hotspot.text}`));
  }

  function completeTravel(doneTravel: ActiveGridTravel) {
    const map = getGridMapData(doneTravel.mapId);
    const targetZone = map ? findGridDestinationZone(doneTravel.mapId, doneTravel.target) : null;
    const settleTravel = (transform: (currentGame: GameState) => GameState) => {
      onChange((currentGame) => {
        const activeTravel = currentGame.world.activeTravel;
        if (
          !activeTravel ||
          activeTravel.mapId !== doneTravel.mapId ||
          activeTravel.path.length > 0 ||
          !isSameGridCoord(activeTravel.target, doneTravel.target)
        ) {
          return currentGame;
        }
        return transform(clearActiveTravel(currentGame));
      });
    };

    if (doneTravel.intent.kind === "province") {
      const provinceId = doneTravel.intent.provinceId;
      const province = worldProvinces.find((item) => item.id === provinceId);
      if (province) {
        setSelectedProvinceId(province.id);
        setSelectedRegionMarkerId(null);
        setView("world");
        settleTravel((currentGame) =>
          appendLog(
            updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target),
            `${doneTravel.adjusted ? "目标落在险阻处，已改抵附近可走格。" : ""}你抵达${province.name}地界，已展开州域信息。`,
          ),
        );
      } else {
        settleTravel((currentGame) => appendLog(currentGame, "行程目标已失效，你在原地重新辨认方向。"));
      }
      return;
    }

    if (doneTravel.intent.kind === "location") {
      const locationId = doneTravel.intent.locationId;
      const targetLocation = getLocation(doneTravel.intent.regionId, locationId);
      setView("location");
      settleTravel((currentGame) => {
        const arrived = applyLocationChange(updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target), locationId);
        return queueArrivalEvent(arrived, doneTravel, targetLocation.name, locationId, targetZone?.eventIds);
      });
      return;
    }

    if (doneTravel.intent.kind === "locationPreview") {
      const targetLocation = getLocation(doneTravel.intent.regionId, doneTravel.intent.locationId);
      setSelectedRegionMarkerId(targetLocation.id);
      setView("region");
      settleTravel((currentGame) => {
        const arrived = appendLog(
          updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target),
          `${doneTravel.adjusted ? "目标落在险阻处，已改抵附近可走格。" : ""}你抵达${targetLocation.name}周边，已展开地点信息。`,
        );
        return queueArrivalEvent(arrived, doneTravel, targetLocation.name, targetLocation.id, targetZone?.eventIds);
      });
      return;
    }

    if (targetZone?.kind === "province") {
      const province = worldProvinces.find((item) => item.id === targetZone.targetId);
      if (province) {
        setSelectedProvinceId(province.id);
        setView("world");
        settleTravel((currentGame) =>
          appendLog(
            updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target),
            `${doneTravel.adjusted ? "目标落在险阻处，已改抵附近可走格。" : ""}你抵达${province.name}地界，已展开州域信息。`,
          ),
        );
        return;
      }
    }

    if (targetZone?.kind === "location") {
      const regionId = getRegionIdFromGridMapId(doneTravel.mapId) ?? game.world.regionId;
      const targetLocation = getRegion(regionId).locations.find((item) => item.id === targetZone.targetId);
      if (targetLocation) {
        setSelectedRegionMarkerId(targetLocation.id);
        setView("region");
        settleTravel((currentGame) => {
          const arrived = appendLog(
            updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target),
            `${doneTravel.adjusted ? "目标落在险阻处，已改抵附近可走格。" : ""}你抵达${targetLocation.name}周边，已展开地点信息。`,
          );
          return queueArrivalEvent(arrived, doneTravel, targetLocation.name, targetLocation.id, targetZone.eventIds);
        });
        return;
      }
    }

    settleTravel((currentGame) =>
      appendLog(
        updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target),
        doneTravel.adjusted ? "目标落在险阻处，你已抵达附近最近的可走格。" : "你沿着灵路抵达目标格。",
      ),
    );
  }

  const worldMapData = getGridMapData(WORLD_GRID_MAP_ID);
  const regionMapData = getRegionGridMapId(game.world.regionId) ? getGridMapData(getRegionGridMapId(game.world.regionId) ?? "") : undefined;

  return (
    <section className="module-panel explore-panel">
      {view === "world" && worldMapData ? (
        <WorldMapView
          mapData={worldMapData}
          game={game}
          travel={travel}
          debugOpen={debugOpen}
          debugResult={debugResult}
          selectedProvince={selectedProvince}
          onToggleDebug={() => setDebugOpen((open) => !open)}
          onRunSelfTest={runSelfTest}
          onMapTarget={(coord) => {
            setSelectedProvinceId(null);
            setSelectedRegionMarkerId(null);
            startTravel(WORLD_GRID_MAP_ID, coord, { kind: "free" });
          }}
          onSelectProvince={travelToProvinceMarker}
          onCloseProvince={() => setSelectedProvinceId(null)}
          onEnterProvince={enterProvince}
        />
      ) : view === "region" ? (
        <>
          <div className="location-header">
            <button
              className="ghost-button"
              onClick={() => {
                setSelectedProvinceId(null);
                setSelectedRegionMarkerId(null);
                setView("world");
              }}
            >
              <GameIcon name="action-back" size={15} />
              返回大世界
            </button>
            <div>
              <h2>
                <GameIcon name="module-explore" size={18} />
                {region.name}地图
              </h2>
              <span>{region.locations.length} 处地点</span>
            </div>
          </div>

          <article className="scene-card">
            <p className="muted">{currentProvince.description}</p>
            {regionMap && regionMapData ? (
              <GridRegionMapView
                mapData={regionMapData}
                game={game}
                travel={travel}
                debugOpen={debugOpen}
                debugResult={debugResult}
                config={regionMap}
                currentLocationId={location.id}
                selectedMarkerId={selectedRegionMarkerId}
                locations={region.locations}
                onToggleDebug={() => setDebugOpen((open) => !open)}
                onRunSelfTest={runSelfTest}
                onMapTarget={(coord) => {
                  setSelectedRegionMarkerId(null);
                  startTravel(regionMapData.mapId, coord, { kind: "free" });
                }}
                onSelectMarker={travelToLocationMarker}
                onCloseMarker={() => setSelectedRegionMarkerId(null)}
                onEnterLocation={enterLocation}
              />
            ) : (
              <div className="location-grid">
                {region.locations.map((item) => (
                  <button className={item.id === location.id ? "active" : ""} key={item.id} onClick={() => setLocation(item.id)}>
                    <GameIcon name={getLocationIconName(item.type)} size={17} />
                    <strong>{item.name}</strong>
                    <small>{getLocationTypeLabel(item.type)}</small>
                    <span>{item.description}</span>
                  </button>
                ))}
              </div>
            )}
          </article>
        </>
      ) : (
        <>
          <div className="location-header">
            <button className="ghost-button" onClick={() => setView("region")}>
              <GameIcon name="action-back" size={15} />
              返回{region.name}
            </button>
            <div>
              <h2>
                <GameIcon name={getLocationIconName(location.type)} size={18} />
                {location.name}
              </h2>
              <span>{getLocationTypeLabel(location.type)}</span>
            </div>
          </div>

          <article className="scene-card">
            <p className="muted">{location.description}</p>
            <div className="inner-map-grid">
              {location.scenes.map((item) => (
                <button className={item.id === scene.id ? "active" : ""} key={item.id} onClick={() => setScene(item.id)}>
                  <GameIcon name={getSceneIconName(item.type)} size={16} />
                  <strong>{item.name}</strong>
                  <small>{item.type}</small>
                </button>
              ))}
            </div>
            <div className="scene-detail">
              {sceneImage ? <SceneVisual scene={scene} src={sceneImage} onSelectHotspot={openSceneHotspot} /> : null}
              <h3>{scene.name}</h3>
              <small>{scene.type}</small>
              <p>{scene.description}</p>
              <div className="action-grid">
                {scene.actions.map((action) => {
                  const cooldownKey = getSceneActionCooldownKey(game, action);
                  const cooldownHours = game.world.passive.eventCooldowns[cooldownKey] ?? 0;
                  const coolingDown = isCooldownAction(action) && cooldownHours > 0;
                  return (
                    <button key={action.id} disabled={coolingDown} onClick={() => onChange(handleAction(game, action))}>
                      <GameIcon name={getActionIconName(action.kind)} size={16} />
                      {coolingDown ? `${action.label} · ${formatCooldown(cooldownHours)}` : action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </article>

          {scene.actions.some((action) => action.kind === "shop") ? <Shop game={game} onChange={onChange} /> : null}
          {scene.actions.some((action) => action.kind === "taskBoard") ? <TaskBoard game={game} onChange={onChange} /> : null}
          {activeSceneHotspot ? <SceneDialogueDialog hotspot={activeSceneHotspot} onClose={() => setActiveSceneHotspotId(null)} /> : null}
          <p className="scene-message">{game.world.sceneMessage}</p>
        </>
      )}
    </section>
  );
}

function SceneVisual({ scene, src, onSelectHotspot }: { scene: SceneNode; src: string; onSelectHotspot: (hotspot: SceneHotspot) => void }) {
  return (
    <div className="scene-visual-frame">
      <img className="scene-visual" src={src} alt={scene.name} draggable={false} />
      {scene.hotspots?.map((hotspot) => (
        <button
          aria-label={`与${hotspot.label}对话`}
          className="scene-hotspot-button"
          key={hotspot.id}
          style={{ "--hotspot-x": `${hotspot.x}%`, "--hotspot-y": `${hotspot.y}%` } as CSSProperties}
          type="button"
          onClick={() => onSelectHotspot(hotspot)}
        >
          <span>{hotspot.label}</span>
        </button>
      ))}
    </div>
  );
}

function SceneDialogueDialog({ hotspot, onClose }: { hotspot: SceneHotspot; onClose: () => void }) {
  return (
    <div className="scene-dialogue-backdrop" role="dialog" aria-modal="true" aria-label={`${hotspot.label}对话`} onClick={onClose}>
      <section className="scene-dialogue-card" onClick={(event) => event.stopPropagation()}>
        <div className="section-heading">
          <h2>
            <GameIcon name="module-explore" size={18} />
            {hotspot.label}
          </h2>
          <span>{hotspot.title}</span>
        </div>
        <p>{hotspot.text}</p>
        <div className="world-drawer-actions">
          <button className="ghost-button" type="button" onClick={onClose}>
            返回
          </button>
        </div>
      </section>
    </div>
  );
}

function WorldMapView({
  mapData,
  game,
  travel,
  debugOpen,
  debugResult,
  selectedProvince,
  onToggleDebug,
  onRunSelfTest,
  onMapTarget,
  onSelectProvince,
  onCloseProvince,
  onEnterProvince,
}: {
  mapData: GridMapData;
  game: GameState;
  travel: ActiveGridTravel | null;
  debugOpen: boolean;
  debugResult: string | null;
  selectedProvince: WorldProvince | null;
  onToggleDebug: () => void;
  onRunSelfTest: () => void;
  onMapTarget: (coord: GridCoord) => void;
  onSelectProvince: (province: WorldProvince) => void;
  onCloseProvince: () => void;
  onEnterProvince: (province: WorldProvince) => void;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const [didDrag, setDidDrag] = useState(false);
  const currentCoord = getNavigationCoord(game, mapData.mapId);
  const targetCoord = travel?.mapId === mapData.mapId ? travel.target : null;
  const visiblePath = travel?.mapId === mapData.mapId ? [currentCoord, ...travel.path] : [];
  const zones = useMemo(() => getGridDestinationZones(mapData.mapId), [mapData.mapId]);
  const hitZone = (targetCoord ? findGridDestinationZone(mapData.mapId, targetCoord) : null) ?? findGridDestinationZone(mapData.mapId, currentCoord);
  const hitZoneLabel = hitZone ? getDestinationZoneLabel(hitZone, game.world.regionId) : null;
  const travelTargetProvinceId =
    travel?.mapId === mapData.mapId && travel.intent.kind === "province" ? travel.intent.provinceId : null;
  const travelTargetProvince = travelTargetProvinceId
    ? worldProvinces.find((province) => province.id === travelTargetProvinceId)
    : null;

  function clampScale(nextScale: number) {
    return Math.min(4, Math.max(1, Number(nextScale.toFixed(2))));
  }

  function zoom(delta: number) {
    setScale((current) => clampScale(current + delta));
  }

  function resetMap() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  function stopMapGesture(event: PointerEvent<HTMLElement>) {
    event.stopPropagation();
    setDragStart(null);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragStart && dragStart.pointerId === event.pointerId && !didDrag && !isInteractiveMapTarget(event.target)) {
      const coord = getGridCoordFromPointer(event, mapData);
      if (coord) {
        onMapTarget(coord);
      }
    }
    setDragStart(null);
    setDidDrag(false);
  }

  return (
    <>
      <MapHeader
        title="大世界"
        subtitle={
          travelTargetProvince
            ? `正在前往：${travelTargetProvince.name} · ${travel?.totalSteps ?? 0} 格 / ${formatTravelTime(travel?.totalHours ?? 0)}`
            : selectedProvince
              ? `已抵达州域：${selectedProvince.name}`
              : "点击州域标记自动寻路，抵达后查看势力"
        }
        debugOpen={debugOpen}
        onZoomIn={() => zoom(0.18)}
        onZoomOut={() => zoom(-0.18)}
        onReset={resetMap}
        onToggleDebug={onToggleDebug}
        onRunSelfTest={onRunSelfTest}
      />

      <div
        className="world-map-viewport"
        onWheel={(event) => {
          event.preventDefault();
          zoom(event.deltaY < 0 ? 0.12 : -0.12);
        }}
        onPointerDown={(event) => {
          if (isInteractiveMapTarget(event.target)) {
            return;
          }
          event.currentTarget.setPointerCapture(event.pointerId);
          setDidDrag(false);
          setDragStart({ pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y });
        }}
        onPointerMove={(event) => {
          if (!dragStart || dragStart.pointerId !== event.pointerId) {
            return;
          }
          const deltaX = event.clientX - dragStart.x;
          const deltaY = event.clientY - dragStart.y;
          if (Math.abs(deltaX) + Math.abs(deltaY) > 5) {
            setDidDrag(true);
          }
          setOffset({
            x: dragStart.originX + deltaX,
            y: dragStart.originY + deltaY,
          });
        }}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setDragStart(null);
          setDidDrag(false);
        }}
      >
        <div
          className="world-map-canvas grid-map-canvas"
          style={{
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
          }}
        >
          <GridTerrainLayer mapData={mapData} current={currentCoord} target={targetCoord} path={visiblePath} zones={zones} hitZone={hitZone} />
          <GridPlayerMarker mapData={mapData} coord={currentCoord} markerScale={1 / scale} />
          {worldProvinces.map((province) => {
            const zone = getGridDestinationZone(mapData.mapId, "province", province.id);
            if (!zone) {
              return null;
            }
            return (
              <button
                aria-label={`查看${province.name}`}
                className={`map-zone-label ${selectedProvince?.id === province.id ? "active" : ""} ${province.open ? "open" : "locked"}`}
                key={province.id}
                style={getGridAnchorStyle(mapData, zone.anchor, 1 / scale)}
                onPointerDown={stopMapGesture}
                onPointerMove={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectProvince(province);
                }}
              >
                {province.name}
              </button>
            );
          })}
        </div>

        {debugOpen ? <GridDebugReadout current={currentCoord} target={targetCoord} path={visiblePath} hitZoneLabel={hitZoneLabel} result={debugResult} /> : null}

        {selectedProvince ? (
          <section className="world-info-drawer" onPointerDown={(event) => event.stopPropagation()}>
            <div className="section-heading">
              <h2>
                <GameIcon name="module-explore" size={18} />
                {selectedProvince.name}
              </h2>
              <span>{selectedProvince.direction}</span>
            </div>
            <p>{selectedProvince.description}</p>
            <div className="force-list">
              {selectedProvince.forces.map((force) => (
                <span key={force}>{force}</span>
              ))}
            </div>
            <div className="world-drawer-actions">
              <button className="ghost-button" onClick={onCloseProvince}>
                <GameIcon name="action-back" size={15} />
                返回
              </button>
              <button className="primary-action compact" disabled={!selectedProvince.open} onClick={() => onEnterProvince(selectedProvince)}>
                {selectedProvince.open ? `进入${selectedProvince.name}` : "暂未开放"}
                <small>{selectedProvince.open ? "进入州域内部地图" : "后续版本开放此州域"}</small>
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}

function GridRegionMapView({
  mapData,
  game,
  travel,
  debugOpen,
  debugResult,
  config,
  currentLocationId,
  selectedMarkerId,
  locations,
  onToggleDebug,
  onRunSelfTest,
  onMapTarget,
  onSelectMarker,
  onCloseMarker,
  onEnterLocation,
}: {
  mapData: GridMapData;
  game: GameState;
  travel: ActiveGridTravel | null;
  debugOpen: boolean;
  debugResult: string | null;
  config: RegionMapConfig;
  currentLocationId: string;
  selectedMarkerId: string | null;
  locations: LocationNode[];
  onToggleDebug: () => void;
  onRunSelfTest: () => void;
  onMapTarget: (coord: GridCoord) => void;
  onSelectMarker: (locationId: string) => void;
  onCloseMarker: () => void;
  onEnterLocation: (locationId: string) => void;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const [didDrag, setDidDrag] = useState(false);
  const selectedMarker = selectedMarkerId ? config.markers.find((marker) => marker.locationId === selectedMarkerId) : null;
  const selectedLocation = selectedMarker ? locations.find((item) => item.id === selectedMarker.locationId) : null;
  const travelIntent = travel?.mapId === mapData.mapId ? travel.intent : null;
  const travelTargetLocation =
    travelIntent && isLocationTravelIntent(travelIntent) ? locations.find((item) => item.id === travelIntent.locationId) : null;
  const currentCoord = getNavigationCoord(game, mapData.mapId);
  const targetCoord = travel?.mapId === mapData.mapId ? travel.target : null;
  const visiblePath = travel?.mapId === mapData.mapId ? [currentCoord, ...travel.path] : [];
  const zones = useMemo(() => getGridDestinationZones(mapData.mapId), [mapData.mapId]);
  const hitZone = (targetCoord ? findGridDestinationZone(mapData.mapId, targetCoord) : null) ?? findGridDestinationZone(mapData.mapId, currentCoord);
  const hitZoneLabel = hitZone ? getDestinationZoneLabel(hitZone, game.world.regionId) : null;

  function clampScale(nextScale: number) {
    return Math.min(config.maxScale, Math.max(1, Number(nextScale.toFixed(2))));
  }

  function zoom(delta: number) {
    setScale((current) => clampScale(current + delta));
  }

  function resetMap() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  function stopMapGesture(event: PointerEvent<HTMLElement>) {
    event.stopPropagation();
    setDragStart(null);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragStart && dragStart.pointerId === event.pointerId && !didDrag && !isInteractiveMapTarget(event.target)) {
      const coord = getGridCoordFromPointer(event, mapData);
      if (coord) {
        onMapTarget(coord);
      }
    }
    setDragStart(null);
    setDidDrag(false);
  }

  return (
    <div className="region-grid-map grid-region-map">
      <MapHeader
        title="区域地图"
        subtitle={
          travelTargetLocation
            ? `正在前往：${travelTargetLocation.name} · ${travel?.totalSteps ?? 0} 格 / ${formatTravelTime(travel?.totalHours ?? 0)}`
            : selectedLocation
              ? `已抵达地点：${selectedLocation.name}`
              : "点击地点标记自动寻路，抵达后查看详情"
        }
        debugOpen={debugOpen}
        onZoomIn={() => zoom(0.18)}
        onZoomOut={() => zoom(-0.18)}
        onReset={resetMap}
        onToggleDebug={onToggleDebug}
        onRunSelfTest={onRunSelfTest}
      />

      <div
        className="world-map-viewport region-map-viewport"
        onWheel={(event) => {
          event.preventDefault();
          zoom(event.deltaY < 0 ? 0.12 : -0.12);
        }}
        onPointerDown={(event) => {
          if (isInteractiveMapTarget(event.target)) {
            return;
          }
          event.currentTarget.setPointerCapture(event.pointerId);
          setDidDrag(false);
          setDragStart({ pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y });
        }}
        onPointerMove={(event) => {
          if (!dragStart || dragStart.pointerId !== event.pointerId) {
            return;
          }
          const deltaX = event.clientX - dragStart.x;
          const deltaY = event.clientY - dragStart.y;
          if (Math.abs(deltaX) + Math.abs(deltaY) > 5) {
            setDidDrag(true);
          }
          setOffset({
            x: dragStart.originX + deltaX,
            y: dragStart.originY + deltaY,
          });
        }}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setDragStart(null);
          setDidDrag(false);
        }}
      >
        <div
          className="world-map-canvas region-map-canvas grid-map-canvas"
          style={{
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
          }}
        >
          <GridTerrainLayer mapData={mapData} current={currentCoord} target={targetCoord} path={visiblePath} zones={zones} hitZone={hitZone} />
          <GridPlayerMarker mapData={mapData} coord={currentCoord} markerScale={1 / scale} />
          {config.markers.map((marker) => {
            const item = locations.find((location) => location.id === marker.locationId);
            const zone = getGridDestinationZone(mapData.mapId, "location", marker.locationId);
            if (!item || !zone) {
              return null;
            }
            return (
              <button
                aria-label={`查看${item.name}`}
                className={`map-zone-label region-zone-label ${selectedMarkerId === marker.locationId ? "active" : ""} ${
                  currentLocationId === marker.locationId ? "current" : ""
                }`}
                key={marker.locationId}
                style={getGridAnchorStyle(mapData, zone.anchor, 1 / scale)}
                onPointerDown={stopMapGesture}
                onPointerMove={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectMarker(marker.locationId);
                }}
              >
                {item.name}
              </button>
            );
          })}
        </div>

        {debugOpen ? <GridDebugReadout current={currentCoord} target={targetCoord} path={visiblePath} hitZoneLabel={hitZoneLabel} result={debugResult} /> : null}

        {selectedMarker && selectedLocation ? (
          <section className="world-info-drawer" onPointerDown={(event) => event.stopPropagation()}>
            <div className="section-heading">
              <h2>
                <GameIcon name={getLocationIconName(selectedLocation.type)} size={18} />
                {selectedLocation.name}
              </h2>
              <span>
                {getLocationTypeLabel(selectedLocation.type)} / 推荐 {selectedMarker.recommendedRealm}
              </span>
            </div>
            <p>{selectedLocation.description}</p>
            <p className="danger-hint">{selectedMarker.danger}</p>
            <div className="world-drawer-actions">
              <button className="ghost-button" onClick={onCloseMarker}>
                <GameIcon name="action-back" size={15} />
                返回
              </button>
              <button className="primary-action compact" onClick={() => onEnterLocation(selectedLocation.id)}>
                进入{selectedLocation.name}
                <small>进入地点内部场景</small>
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function MapHeader({
  title,
  subtitle,
  debugOpen,
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleDebug,
  onRunSelfTest,
}: {
  title: string;
  subtitle: string;
  debugOpen: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToggleDebug: () => void;
  onRunSelfTest: () => void;
}) {
  return (
    <div className="world-map-header">
      <div>
        <h2>
          <GameIcon name="module-explore" size={18} />
          {title}
        </h2>
        <span>{subtitle}</span>
      </div>
      <div className="map-controls" onPointerDown={(event) => event.stopPropagation()}>
        <button onClick={onZoomIn} aria-label="放大地图">
          <GameIcon name="action-zoom-in" size={16} />
        </button>
        <button onClick={onZoomOut} aria-label="缩小地图">
          <GameIcon name="action-zoom-out" size={16} />
        </button>
        <button onClick={onReset}>
          <GameIcon name="action-reset" size={16} />
          重置
        </button>
        {SHOW_MAP_DEBUG_TOOLS ? (
          <>
            <button className={debugOpen ? "active" : ""} onClick={onToggleDebug}>
              坐标
            </button>
            <button onClick={onRunSelfTest}>自检</button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function GridPlayerMarker({ mapData, coord, markerScale }: { mapData: GridMapData; coord: GridCoord; markerScale: number }) {
  return (
    <span
      className="grid-player-marker"
      style={{
        left: `${((coord.x + 0.5) / mapData.width) * 100}%`,
        top: `${((coord.y + 0.5) / mapData.height) * 100}%`,
        "--marker-scale": `${markerScale}`,
      } as CSSProperties}
    >
      你
    </span>
  );
}

function getGridAnchorStyle(mapData: GridMapData, coord: GridCoord, markerScale: number): CSSProperties {
  return {
    left: `${((coord.x + 0.5) / mapData.width) * 100}%`,
    top: `${((coord.y + 0.5) / mapData.height) * 100}%`,
    "--marker-scale": `${markerScale}`,
  } as CSSProperties;
}

function GridTerrainLayer({
  mapData,
  current,
  target,
  path,
  zones,
  hitZone,
}: {
  mapData: GridMapData;
  current: GridCoord;
  target: GridCoord | null;
  path: GridCoord[];
  zones: GridDestinationZone[];
  hitZone: GridDestinationZone | null;
}) {
  const pathKeys = useMemo(() => new Set(path.map(gridCoordKey)), [path]);
  const zoneKeys = useMemo(() => new Set(zones.flatMap((zone) => zone.cells.map(gridCoordKey))), [zones]);
  const hitZoneKeys = useMemo(() => new Set(hitZone?.cells.map(gridCoordKey) ?? []), [hitZone]);
  const currentKey = gridCoordKey(current);
  const targetKey = target ? gridCoordKey(target) : null;

  return (
    <div className="grid-debug-overlay grid-terrain-layer" aria-hidden="true">
      {mapData.cells.map((cell) => {
        const key = gridCoordKey(cell);
        const terrainClass = cell.walkable
          ? cell.movementCost > 1
            ? `walkable high-cost cost-${cell.movementCost}`
            : "walkable"
          : "blocked";
        return (
          <span
            className={`grid-debug-cell grid-terrain-cell ${terrainClass} ${zoneKeys.has(key) ? "zone" : ""} ${
              hitZoneKeys.has(key) ? "zone-hit" : ""
            } ${cell.portalTargetMapId ? "portal" : ""} ${pathKeys.has(key) ? "path" : ""} ${key === currentKey ? "current" : ""} ${
              key === targetKey ? "target" : ""
            }`}
            key={key}
            style={{
              left: `${(cell.x / mapData.width) * 100}%`,
              top: `${(cell.y / mapData.height) * 100}%`,
              width: `${100 / mapData.width}%`,
              height: `${100 / mapData.height}%`,
            }}
          />
        );
      })}
    </div>
  );
}

function GridDebugReadout({
  current,
  target,
  path,
  hitZoneLabel,
  result,
}: {
  current: GridCoord;
  target: GridCoord | null;
  path: GridCoord[];
  hitZoneLabel: string | null;
  result: string | null;
}) {
  return (
    <div className="grid-debug-readout">
      <span>当前 {gridCoordKey(current)}</span>
      <span>目标 {target ? gridCoordKey(target) : "-"}</span>
      <span>路径 {Math.max(0, path.length - 1)} 格</span>
      <span>区域 {hitZoneLabel ?? "-"}</span>
      {result ? <small>{result}</small> : null}
    </div>
  );
}

function getGridCoordFromPointer(event: PointerEvent<HTMLDivElement>, mapData: GridMapData): GridCoord | null {
  const canvas = event.currentTarget.querySelector<HTMLElement>(".world-map-canvas");
  if (!canvas) {
    return null;
  }
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const position = {
    x: ((event.clientX - rect.left) / rect.width) * mapData.width * mapData.cellSize,
    y: ((event.clientY - rect.top) / rect.height) * mapData.height * mapData.cellSize,
  };
  return worldPositionToGridCoord(mapData, position);
}

function isInteractiveMapTarget(target: EventTarget): boolean {
  return target instanceof Element && Boolean(target.closest("button, .world-info-drawer"));
}

function getNavigationCoord(game: GameState, mapId: string): GridCoord {
  return game.world.navigation.positions[mapId] ?? getDefaultGridCoord(mapId);
}

function updateNavigationPosition(game: GameState, mapId: string, coord: GridCoord, activeMapId = mapId): GameState {
  return {
    ...game,
    world: {
      ...game.world,
      navigation: {
        ...game.world.navigation,
        activeMapId,
        positions: {
          ...game.world.navigation.positions,
          [mapId]: coord,
        },
      },
    },
  };
}

function clearActiveTravel(game: GameState): GameState {
  return {
    ...game,
    world: {
      ...game.world,
      activeTravel: null,
    },
  };
}

function getRegionIdFromGridMapId(mapId: string): string | null {
  return mapId.startsWith("region:") ? mapId.slice("region:".length) : null;
}

function isLocationTravelIntent(intent: GridTravelIntent): intent is LocationTravelIntent {
  return intent.kind === "locationPreview" || intent.kind === "location";
}

function getDestinationZoneLabel(zone: GridDestinationZone, currentRegionId: string): string {
  if (zone.kind === "province") {
    return getWorldProvince(zone.targetId).name;
  }
  if (zone.kind === "location") {
    const regionId = getRegionIdFromGridMapId(zone.mapId) ?? currentRegionId;
    return getLocation(regionId, zone.targetId).name;
  }
  return zone.zoneId;
}

function queueArrivalEvent(
  game: GameState,
  travel: ActiveGridTravel,
  destinationLabel: string,
  destinationLocationId: string,
  eventIds?: readonly string[],
): GameState {
  const regionId = getRegionIdFromGridMapId(travel.mapId) ?? game.world.regionId;
  if (regionId !== "central" || travel.totalSteps <= 0) {
    return game;
  }
  return maybeQueueTravelEvent(game, {
    mapId: travel.mapId,
    regionId,
    destinationLabel,
    stepCount: travel.totalSteps,
    originLocationId: travel.originLocationId,
    destinationLocationId,
    eventIds,
  });
}

function applyProvinceTravelChange(game: GameState, province: WorldProvince, portalCell?: { portalTargetMapId?: string; portalTargetX?: number; portalTargetY?: number }): GameState {
  if (!province.regionId) {
    return game;
  }
  const nextRegion = getRegion(province.regionId);
  const nextLocation = nextRegion.locations[0];
  const nextRegionMapId = getRegionGridMapId(province.regionId);
  const nextRegionCoord =
    nextRegionMapId && typeof portalCell?.portalTargetX === "number" && typeof portalCell.portalTargetY === "number"
      ? { x: portalCell.portalTargetX, y: portalCell.portalTargetY }
      : nextRegionMapId
        ? getDefaultGridCoord(nextRegionMapId)
        : null;

  return recordQuestEvent({
    ...game,
    world: {
      ...game.world,
      regionId: province.regionId,
      locationId: nextLocation.id,
      sceneId: nextLocation.scenes[0].id,
      lastTownId: nextLocation.type === "city" || nextLocation.type === "town" ? nextLocation.id : game.world.lastTownId,
      sceneMessage: `抵达${province.name}入口，进入州域地图。`,
      navigation: {
        ...game.world.navigation,
        activeMapId: nextRegionMapId ?? WORLD_GRID_MAP_ID,
        positions: nextRegionMapId && nextRegionCoord ? { ...game.world.navigation.positions, [nextRegionMapId]: nextRegionCoord } : game.world.navigation.positions,
      },
    },
  }, { type: "visit", targetId: nextLocation.id });
}

function applyLocationChange(game: GameState, locationId: string): GameState {
  const nextLocation = getLocation(game.world.regionId, locationId);
  return recordQuestEvent({
    ...game,
    world: {
      ...game.world,
      locationId,
      sceneId: nextLocation.scenes[0].id,
      lastTownId: nextLocation.type === "city" || nextLocation.type === "town" ? nextLocation.id : game.world.lastTownId,
      sceneMessage: `抵达 ${nextLocation.name}。`,
    },
  }, { type: "visit", targetId: locationId });
}

function getTravelStartMessage(
  intent: GridTravelIntent,
  target: GridCoord,
  adjusted: boolean,
  stepCount: number,
  totalHours: number,
): string {
  const route = `${stepCount} 格，预计 ${formatTravelTime(totalHours)}`;
  const suffix = adjusted ? `目标不可走，已改往附近最近可走格；${route}。` : `目标格 ${gridCoordKey(target)}；${route}。`;
  if (intent.kind === "province") {
    const province = worldProvinces.find((item) => item.id === intent.provinceId);
    return `你向${province?.name ?? "州域"}入口行去，${suffix}`;
  }
  if (intent.kind === "location" || intent.kind === "locationPreview") {
    return `你向${getLocation(intent.regionId, intent.locationId).name}行去，${suffix}`;
  }
  return `你展开身法沿格线前行，${suffix}`;
}

function formatTravelTime(hours: number): string {
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return remainHours ? `${days} 日 ${remainHours} 时辰` : `${days} 日`;
  }
  return `${Math.max(0, hours)} 时辰`;
}

function getLocationTypeLabel(type: "city" | "town" | "wild" | "secret"): string {
  if (type === "city") {
    return "城市";
  }
  if (type === "town") {
    return "城镇";
  }
  if (type === "secret") {
    return "秘境";
  }
  return "野外";
}

function getSceneIconName(type: string): GameIconName {
  if (type.includes("战斗")) {
    return "combat";
  }
  if (type.includes("交易")) {
    return "location-town";
  }
  if (type.includes("任务")) {
    return "combat-log";
  }
  if (type.includes("秘境") || type.includes("机缘")) {
    return "location-secret";
  }
  if (type.includes("采集")) {
    return "item-material";
  }
  if (type.includes("灵宠")) {
    return "team";
  }
  return "module-explore";
}

function getActionIconName(kind: SceneAction["kind"]): GameIconName {
  if (kind === "combat") {
    return "combat";
  }
  if (kind === "shop") {
    return "location-town";
  }
  if (kind === "taskBoard") {
    return "combat-log";
  }
  if (kind === "gather") {
    return "item-material";
  }
  if (kind === "treasure") {
    return "equipment-artifact";
  }
  if (kind === "joinSect") {
    return "module-sect";
  }
  if (kind === "recruitPet" || kind === "recruitCompanion") {
    return "team";
  }
  return "module-explore";
}

function handleAction(game: GameState, action: SceneAction): GameState {
  const cooldownKey = getSceneActionCooldownKey(game, action);
  const cooldownHours = game.world.passive.eventCooldowns[cooldownKey] ?? 0;
  if (isCooldownAction(action) && cooldownHours > 0) {
    return appendLog(game, `此处灵机尚未恢复，还需等待 ${formatCooldown(cooldownHours)}。`);
  }
  if (action.kind === "dialogue") {
    return appendLog(
      recordQuestEvent(game, { type: "talk", targetId: action.id }),
      action.text ?? "你与此地修士交谈片刻，记下一些传闻。",
    );
  }
  if (action.kind === "joinSect") {
    return joinSect(game);
  }
  if (action.kind === "combat" && action.targetId) {
    return beginCombat(game, action.targetId);
  }
  if (action.kind === "gather") {
    const nextGame = action.rewards
      ? advanceTime(appendLog(addRewards(game, action.rewards), action.text ?? "你细心采集，收起此地灵物。"), 2)
      : grantGatherReward(game);
    return setSceneActionCooldown(nextGame, cooldownKey, 24);
  }
  if (action.kind === "recruitPet") {
    return recruitPet(game);
  }
  if (action.kind === "recruitCompanion") {
    return recruitCompanion(game);
  }
  if (action.kind === "treasure") {
    const nextGame = action.rewards
      ? advanceTime(appendLog(addRewards(game, action.rewards), action.text ?? "你搜寻此地，得到一份机缘。"), 2)
      : grantTreasure(game);
    return setSceneActionCooldown(nextGame, cooldownKey, 720);
  }
  return game;
}

function isCooldownAction(action: SceneAction): boolean {
  return action.kind === "gather" || action.kind === "treasure";
}

function getSceneActionCooldownKey(game: GameState, action: SceneAction): string {
  return `scene_action:${game.world.regionId}:${game.world.locationId}:${game.world.sceneId}:${action.id}`;
}

function setSceneActionCooldown(game: GameState, cooldownKey: string, hours: number): GameState {
  return {
    ...game,
    world: {
      ...game.world,
      passive: {
        ...game.world.passive,
        eventCooldowns: {
          ...game.world.passive.eventCooldowns,
          [cooldownKey]: hours,
        },
      },
    },
  };
}

function formatCooldown(hours: number): string {
  if (hours >= 24) {
    return `${Math.ceil(hours / 24)}日`;
  }
  return `${Math.ceil(hours)}时`;
}

function Shop({ game, onChange }: { game: GameState; onChange: ExploreChange }) {
  const visibleShopItems = shopItems.filter((shopItem) => !shopItem.regionId || shopItem.regionId === game.world.regionId);

  function buy(itemId: string, price: number) {
    if (game.player.spiritStones < price) {
      onChange(appendLog(game, "灵石不足，摊主只是笑而不语。"));
      return;
    }
    const bought = addItems(
      {
        ...game,
        player: {
          ...game.player,
          spiritStones: game.player.spiritStones - price,
        },
      },
      [{ itemId, amount: 1 }],
    );
    onChange(appendLog(bought, `购得 ${formatItemName(itemId)} x1。`));
  }

  return (
    <section className="shop-list">
      <div className="section-heading">
        <h2>
          <GameIcon name="location-town" size={18} />
          坊市摊位
        </h2>
        <span>灵石 {game.player.spiritStones}</span>
      </div>
      {visibleShopItems.map((shopItem) => {
        const item = getItem(shopItem.itemId);
        return (
          <div className={`item-row grade-card grade-${item.grade}`} key={shopItem.itemId}>
            <div>
              <strong className={getGradeNameClass(item)}>{formatItemName(item)}</strong>
              <small>{item.description}</small>
            </div>
            <button onClick={() => buy(shopItem.itemId, shopItem.price)}>{shopItem.price} 灵石</button>
          </div>
        );
      })}
    </section>
  );
}

function getGradeNameClass(item: ItemConfig): string {
  return `grade-name grade-${item.grade}${shouldEmphasizeItemGrade(item.grade) ? " strong" : ""}`;
}

function TaskBoard({ game, onChange }: { game: GameState; onChange: ExploreChange }) {
  const regionTasks = tasks.filter((task) => !task.regionId || task.regionId === game.world.regionId);
  const visibleTasks = regionTasks.filter((task) => getQuestAvailability(game, task) !== "locked");
  const nextLockedTask = regionTasks.find((task) => getQuestAvailability(game, task) === "locked");

  return (
    <section className="task-board">
      <div className="section-heading">
        <h2>
          <GameIcon name="combat-log" size={18} />
          任务榜
        </h2>
        <span>{visibleTasks.length} 件已解锁</span>
      </div>
      {visibleTasks.length === 0 && nextLockedTask ? (
        <p className="quest-lock-notice">{getQuestPrerequisiteHint(game, nextLockedTask)}</p>
      ) : null}
      {visibleTasks.map((task) => {
        const availability = getQuestAvailability(game, task);
        const progress = getQuestProgress(game, task);
        return (
          <div className="task-row" key={task.id}>
            <div className="task-copy">
              <small className="task-chapter">{task.chapter}</small>
              <strong>{task.title}</strong>
              <small>{task.description}</small>
              <ul className="quest-objective-list">
                {progress.objectives.map((objective) => (
                  <li className={objective.complete ? "complete" : ""} key={objective.id}>
                    <span>{objective.complete ? "已完成" : "进行中"}</span>
                    {objective.label}
                    <em>
                      {objective.current}/{objective.target}
                    </em>
                  </li>
                ))}
              </ul>
            </div>
            {availability === "available" ? <button onClick={() => onChange((current) => acceptQuest(current, task.id))}>接取</button> : null}
            {availability === "accepted" ? (
              <button disabled={!progress.complete} onClick={() => onChange((current) => completeQuest(current, task.id))}>
                {progress.complete ? "提交" : `${progress.current}/${progress.target}`}
              </button>
            ) : null}
            {availability === "completed" ? <span className="done-tag">已完成</span> : null}
          </div>
        );
      })}
    </section>
  );
}
