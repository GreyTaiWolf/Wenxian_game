import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import {
  WORLD_GRID_MAP_ID,
  getDefaultGridCoord,
  getGridMapData,
  getLocalGridMapId,
  getLocalSceneGridCoord,
  getLocationIdFromLocalGridMapId,
  getWorldPoiGridCoord,
  gridMaps,
} from "../data/gridMaps";
import { findGridDestinationZone, getGridDestinationZone, getGridDestinationZones, gridDestinationZones } from "../data/gridMapZones";
import { COMBAT_ACTION_HOURS, GATHER_ACTION_HOURS, TREASURE_ACTION_HOURS, getGridMoveHours } from "../data/time";
import { getEnemyGroup } from "../data/enemies";
import { getWorldEvent } from "../data/events";
import { formatItemName, getItem, shouldEmphasizeItemGrade } from "../data/items";
import {
  getLocation,
  getRegion,
  getScene,
  getShopConfig,
  tasks,
  type LocationNode,
  type LocationSceneBlockedRect,
  type LocationSceneHotspot,
  type SceneAction,
  type SceneNode,
  type ShopConfig,
} from "../data/world";
import { getWorldPoi, getWorldPoiByLocationId, worldPois, type WorldPoiConfig } from "../data/worldPois";
import { beginCombat, grantGatherReward, grantTreasure } from "../game/combatEngine";
import { dismissActiveWorldEvent, getActiveWorldEvent, maybeTriggerMapEvent, resolveWorldEventChoice } from "../game/events";
import {
  findNearestWalkableCell,
  findPathAStar,
  getGridCell,
  getNearestWalkableZoneCoord,
  getPathMovementSteps,
  gridCoordKey,
  isSameGridCoord,
  runGridNavigationSelfTest,
  worldPositionToGridCoord,
} from "../game/gridNavigation";
import { addItems, addRewards, appendLog, joinSect, recruitCompanion, recruitPet, removeItems } from "../game/state";
import { buyShopItem, getShopDisplayItems, getShopRefreshInfo } from "../game/shop";
import { advanceTime } from "../game/time";
import type { GameState, GridCell, GridCoord, GridDestinationZone, GridMapData, ItemConfig, QuestState } from "../types";
import { useActiveGame, useSettings, useUpdateGame } from "../stores/gameStore";
import { defaultMapViewport, useMapUiStore, type ActiveTravel, type MapViewportState, type TravelIntent } from "../stores/mapUiStore";
import { GameIcon, getLocationIconName, type GameIconName } from "./GameIcon";
import { NpcDialogueSheet, SceneView, type SceneHotspotDialogueAction, type SceneHotspotModel } from "./scene";
import { BottomSheet, GradeBadge } from "./ui";

const GRID_MOVEMENT_STEP_MS = 180;
const LOCATION_SCENE_GRID_WIDTH = 42;
const LOCATION_SCENE_GRID_HEIGHT = 23;
const LOCATION_SCENE_ASPECT_RATIO = LOCATION_SCENE_GRID_WIDTH / LOCATION_SCENE_GRID_HEIGHT;
const SCENE_DETAIL_MAP_ASPECT_RATIO = 3 / 2;
const GRID_MAP_MAX_SCALE = 12;
const GRID_MAP_VISIBLE_PADDING = 4;
const GRID_MAP_EDGE_PADDING = 28;
const GRID_MAP_WHEEL_ZOOM_FACTOR = 1.18;
const GRID_MAP_BUTTON_ZOOM_FACTOR = 1.32;
type GridViewportSize = { width: number; height: number };
type GridVisibleRect = { left: number; top: number; right: number; bottom: number };
type ExploreChange = (next: GameState | ((prev: GameState) => GameState)) => void;

export default function ExplorePanel() {
  const activeGame = useActiveGame();
  const onChange = useUpdateGame();
  const settings = useSettings();
  const view = useMapUiStore((state) => state.view);
  const selectedWorldPoiId = useMapUiStore((state) => state.selectedWorldPoiId);
  const activeSceneHotspotId = useMapUiStore((state) => state.activeSceneHotspotId);
  const debugOpen = useMapUiStore((state) => state.debugOpen);
  const debugResult = useMapUiStore((state) => state.debugResult);
  const travel = useMapUiStore((state) => state.travel);
  const setView = useMapUiStore((state) => state.setView);
  const setSelectedWorldPoiId = useMapUiStore((state) => state.setSelectedWorldPoiId);
  const setActiveSceneHotspotId = useMapUiStore((state) => state.setActiveSceneHotspotId);
  const toggleDebug = useMapUiStore((state) => state.toggleDebug);
  const setDebugResult = useMapUiStore((state) => state.setDebugResult);
  const setTravel = useMapUiStore((state) => state.setTravel);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);

  if (!activeGame) {
    return null;
  }

  const game = activeGame;
  const region = getRegion(game.world.regionId);
  const location = getLocation(game.world.regionId, game.world.locationId);
  const scene = getScene(game.world.regionId, game.world.locationId, game.world.sceneId);
  const activeSceneHotspot = scene.hotspots?.find((hotspot) => hotspot.id === activeSceneHotspotId) ?? null;
  const selectedWorldPoi = selectedWorldPoiId ? getWorldPoi(selectedWorldPoiId) ?? null : null;
  const currentWorldPoi = getWorldPoiByLocationId(game.world.locationId);

  useEffect(() => {
    setActiveSceneHotspotId(null);
  }, [game.world.sceneId]);

  useEffect(() => {
    if (!travel) {
      return;
    }

    if (travel.path.length === 0) {
      completeTravel(travel);
      setTravel(null);
      return;
    }

    const timer = window.setTimeout(() => {
      const [nextStep, ...remainingPath] = travel.path;
      onChange((currentGame) => {
        const movedGame = updateNavigationPosition(currentGame, travel.mapId, nextStep);
        const mapData = getGridMapData(travel.mapId);
        const stepCell = mapData ? getGridCell(mapData, nextStep) : undefined;
        const stepHours = mapData ? getGridMoveHours(mapData, stepCell) : 0;
        return advanceTime(movedGame, { hours: stepHours });
      });
      setTravel({ ...travel, path: remainingPath });
    }, GRID_MOVEMENT_STEP_MS);

    return () => window.clearTimeout(timer);
  }, [travel, onChange]);

  function runSelfTest() {
    const result = runGridNavigationSelfTest(gridMaps, gridDestinationZones);
    const details = result.checks.map((check) => `${check.ok ? "通过" : "失败"}：${check.name}`).join("；");
    setDebugResult(`${result.summary}。${details}`);
    onChange((currentGame) => appendLog(currentGame, result.ok ? "网格导航自检通过。" : "网格导航自检发现异常，请查看调试信息。"));
  }

  function startTravel(mapId: string, rawTarget: GridCoord, intent: TravelIntent) {
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
    setTravel({ mapId, target, path: steps, intent, adjusted: !isSameGridCoord(rawTarget, target) });
    setDebugResult(null);
    onChange((currentGame) => {
      const message = getTravelStartMessage(intent, target, !isSameGridCoord(rawTarget, target));
      return appendLog(updateNavigationPosition(currentGame, mapId, path[0]), message);
    });
  }

  function travelToWorldPoi(poi: WorldPoiConfig) {
    const map = getGridMapData(WORLD_GRID_MAP_ID);
    const zone = getGridDestinationZone(WORLD_GRID_MAP_ID, "poi", poi.id);
    const zoneTarget = map && zone ? getNearestWalkableZoneCoord(map, zone, getNavigationCoord(game, WORLD_GRID_MAP_ID)) : null;
    const target = zoneTarget ?? getWorldPoiGridCoord(poi.id);
    if (!target) {
      return;
    }
    setSelectedWorldPoiId(null);
    startTravel(WORLD_GRID_MAP_ID, target, { kind: "worldPoiPreview", poiId: poi.id });
  }

  function enterWorldPoi(poi: WorldPoiConfig) {
    if (!poi.open || !poi.locationId) {
      onChange((currentGame) => appendLog(currentGame, `${poi.name}尚未开放，灵雾遮住了深入路径。`));
      return;
    }
    setSelectedWorldPoiId(null);
    setActiveSceneHotspotId(null);
    setView("location");
    onChange((currentGame) => applyWorldPoiEnterChange(currentGame, poi));
  }

  function travelToLocalScene(sceneId: string) {
    const localMapId = getLocalGridMapId(game.world.locationId);
    const map = localMapId ? getGridMapData(localMapId) : undefined;
    const zone = localMapId ? getGridDestinationZone(localMapId, "scene", sceneId) : undefined;
    const zoneTarget = map && zone ? getNearestWalkableZoneCoord(map, zone, getNavigationCoord(game, map.mapId)) : null;
    const sceneCoord = getLocalSceneGridCoord(game.world.locationId, sceneId);
    const target = zoneTarget ?? sceneCoord;
    if (localMapId && target) {
      startTravel(localMapId, target, { kind: "localScene", locationId: game.world.locationId, sceneId });
      return;
    }
    setScene(sceneId);
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

  function openSceneHotspot(hotspot: SceneHotspotModel) {
    setActiveSceneHotspotId(hotspot.id);
    onChange((currentGame) => appendLog(currentGame, `${hotspot.label ?? "场景"}：${hotspot.text ?? "你略作停留。"}`));
  }

  function handleSceneHotspotAction(action: SceneHotspotDialogueAction, hotspot: SceneHotspotModel) {
    if (action.kind === "shop") {
      const shopId = action.shopId ?? game.world.sceneId;
      setActiveSceneHotspotId(null);
      setActiveShopId(shopId);
      onChange((currentGame) => appendLog(currentGame, `${hotspot.label}为你打开货柜。`));
      return;
    }
    const fallback = "对方似乎还在斟酌。";
    onChange((currentGame) => appendLog(currentGame, `${hotspot.label} · ${action.label}：${action.text ?? fallback}`));
  }

  function completeTravel(doneTravel: ActiveTravel) {
    const map = getGridMapData(doneTravel.mapId);
    const targetZone = map ? findGridDestinationZone(doneTravel.mapId, doneTravel.target) : null;

    if (doneTravel.intent.kind === "worldPoiPreview") {
      const poi = getWorldPoi(doneTravel.intent.poiId);
      if (poi) {
        setSelectedWorldPoiId(poi.id);
        setView("world");
        onChange((currentGame) =>
          applyArrivalEvent(
            appendLog(
              updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target),
              `${doneTravel.adjusted ? "目标落在险阻处，已改抵附近可走格。" : ""}你抵达${poi.name}周边，已展开地点预览。`,
            ),
            doneTravel,
          ),
        );
      }
      return;
    }

    if (doneTravel.intent.kind === "localScene") {
      const sceneId = doneTravel.intent.sceneId;
      setView("location");
      setActiveSceneHotspotId(null);
      onChange((currentGame) =>
        applyArrivalEvent(
          applySceneChange(updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target), sceneId),
          doneTravel,
        ),
      );
      return;
    }

    if (doneTravel.intent.kind === "location") {
      const locationId = doneTravel.intent.locationId;
      setView("location");
      onChange((currentGame) => applyArrivalEvent(applyLocationChange(updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target), locationId), doneTravel));
      return;
    }

    if (doneTravel.intent.kind === "locationPreview") {
      const poi = getWorldPoiByLocationId(doneTravel.intent.locationId);
      if (poi) {
        setSelectedWorldPoiId(poi.id);
        setView("world");
        onChange((currentGame) =>
          applyArrivalEvent(
            appendLog(
              updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target),
              `${doneTravel.adjusted ? "目标落在险阻处，已改抵附近可走格。" : ""}你抵达${poi.name}周边，已展开地点预览。`,
            ),
            doneTravel,
          ),
        );
      }
      return;
    }

    if (targetZone?.kind === "poi") {
      const poi = getWorldPoi(targetZone.targetId);
      if (poi) {
        setSelectedWorldPoiId(poi.id);
        setView("world");
        onChange((currentGame) =>
          applyArrivalEvent(
            appendLog(
              updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target),
              `${doneTravel.adjusted ? "目标落在险阻处，已改抵附近可走格。" : ""}你抵达${poi.name}周边，已展开地点预览。`,
            ),
            doneTravel,
          ),
        );
        return;
      }
    }

    if (targetZone?.kind === "scene") {
      setView("location");
      setActiveSceneHotspotId(null);
      onChange((currentGame) =>
        applyArrivalEvent(
          applySceneChange(updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target), targetZone.targetId),
          doneTravel,
        ),
      );
      return;
    }

    onChange((currentGame) =>
      applyArrivalEvent(
        appendLog(
          updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target),
          doneTravel.adjusted ? "目标落在险阻处，你已抵达附近最近的可走格。" : "你沿着灵路抵达目标格。",
        ),
        doneTravel,
      ),
    );
  }

  const worldMapData = getGridMapData(WORLD_GRID_MAP_ID);
  const localMapId = getLocalGridMapId(game.world.locationId);
  const localMapData = localMapId ? getGridMapData(localMapId) : undefined;

  return (
    <section className="module-panel explore-panel">
      {view === "world" && worldMapData ? (
        <GridMapPanel
          mode="world"
          mapData={worldMapData}
          game={game}
          travel={travel}
          debugOpen={debugOpen}
          debugResult={debugResult}
          selectedWorldPoi={selectedWorldPoi}
          onToggleDebug={toggleDebug}
          onRunSelfTest={runSelfTest}
          onMapTarget={(coord) => {
            setSelectedWorldPoiId(null);
            startTravel(WORLD_GRID_MAP_ID, coord, { kind: "free" });
          }}
          onSelectWorldPoi={travelToWorldPoi}
          onCloseWorldPoi={() => setSelectedWorldPoiId(null)}
          onEnterWorldPoi={enterWorldPoi}
        />
      ) : (
        <>
          <div className="location-header">
            <button
              className="ghost-button"
              onClick={() => {
                setSelectedWorldPoiId(currentWorldPoi?.id ?? null);
                setView("world");
              }}
            >
              <GameIcon name="action-back" size={15} />
              返回大世界
            </button>
            <div>
              <h2>
                <GameIcon name={getLocationIconName(location.type)} size={18} />
                {location.name}
              </h2>
              <span>
                local map / {currentWorldPoi?.regionTag ?? region.name} / {getLocationTypeLabel(location.type)}
              </span>
            </div>
          </div>

          {localMapData ? (
            <GridMapPanel
              mode="local"
              mapData={localMapData}
              game={game}
              travel={travel}
              debugOpen={debugOpen}
              debugResult={debugResult}
              location={location}
              currentScene={scene}
              onToggleDebug={toggleDebug}
              onRunSelfTest={runSelfTest}
              onMapTarget={(coord) => {
                startTravel(localMapData.mapId, coord, { kind: "free" });
              }}
              onSelectScene={travelToLocalScene}
            />
          ) : null}

          <LocationIntelCard location={location} />

          <article className="scene-card scene-card-no-image">
            <p className="muted">{location.description}</p>
            <div className="inner-map-grid">
              {location.scenes.map((item) => (
                <button className={item.id === scene.id ? "active" : ""} key={item.id} onClick={() => travelToLocalScene(item.id)}>
                  <GameIcon name={getSceneIconName(item.type)} size={16} />
                  <strong>{item.name}</strong>
                  <small>{item.type}</small>
                </button>
              ))}
            </div>
            <div className="scene-detail">
              <SceneView
                name={scene.name}
                type={scene.type}
                description={scene.description}
                imageSrc={null}
                hotspots={scene.hotspots}
                feedback={game.world.sceneMessage}
                onHotspotSelect={openSceneHotspot}
                actions={<SceneActionButtons actions={scene.actions} game={game} onChange={onChange} />}
              />
            </div>
          </article>

          {scene.actions.some((action) => action.kind === "shop") ? <Shop game={game} onChange={onChange} shopId={scene.id} /> : null}
          {scene.actions.some((action) => action.kind === "taskBoard") ? <TaskBoard game={game} onChange={onChange} /> : null}
          <NpcDialogueSheet
            open={Boolean(activeSceneHotspot)}
            hotspot={activeSceneHotspot}
            motionEnabled={settings.motion}
            onAction={handleSceneHotspotAction}
            onOpenChange={(open) => {
              if (!open) {
                setActiveSceneHotspotId(null);
              }
            }}
          />
          <ShopCatalogSheet
            game={game}
            motionEnabled={settings.motion}
            onChange={onChange}
            onOpenChange={(open) => {
              if (!open) {
                setActiveShopId(null);
              }
            }}
            open={Boolean(activeShopId)}
            shopId={activeShopId}
          />
        </>
      )}
      <MapEventSheet game={game} motionEnabled={settings.motion} onChange={onChange} />
    </section>
  );
}

function LocationIntelCard({ location }: { location: LocationNode }) {
  const eventNames = (location.eventPoolIds ?? []).map((eventId) => getWorldEvent(eventId)?.title ?? eventId);
  const enemyNames = (location.enemyPoolIds ?? []).map((enemyId) => getEnemyGroup(enemyId).title);
  const dropNames = (location.dropPool ?? []).map((drop) => `${formatItemName(getItem(drop.itemId))} x${drop.amount}`);
  const npcCount = location.npcIds?.length ?? 0;
  const taskCount = location.taskIds?.length ?? 0;
  const hasIntel = eventNames.length || enemyNames.length || dropNames.length || npcCount || taskCount || location.backgroundImageKey || location.resourceKey;

  if (!hasIntel) {
    return null;
  }

  return (
    <section className="location-intel-card">
      <div>
        <span>地点档案</span>
        <strong>{location.chapterId === "chapter_01_qingyun_black_wind" ? "第一章主循环" : "区域内容"}</strong>
      </div>
      <div className="location-intel-grid">
        <IntelLine label="资源" value={location.resourceKey ?? location.backgroundImageKey ?? "未配置"} />
        <IntelLine label="事件" value={eventNames.length ? eventNames.join(" / ") : "无随机事件"} />
        <IntelLine label="敌人" value={enemyNames.length ? enemyNames.join(" / ") : "安全区域"} />
        <IntelLine label="掉落" value={dropNames.length ? dropNames.join(" / ") : "无常规掉落"} />
        <IntelLine label="入口" value={`${npcCount} NPC / ${taskCount} 任务`} />
      </div>
    </section>
  );
}

function IntelLine({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span>{label}</span>
      <strong>{value}</strong>
    </p>
  );
}

function MapEventSheet({
  game,
  motionEnabled,
  onChange,
}: {
  game: GameState;
  motionEnabled: boolean;
  onChange: ExploreChange;
}) {
  const event = getActiveWorldEvent(game);
  return (
    <BottomSheet
      open={Boolean(event)}
      onOpenChange={(open) => {
        if (!open) {
          onChange(dismissActiveWorldEvent(game));
        }
      }}
      title={event?.title ?? "玄幻事件"}
      subtitle={event ? getEventTypeLabel(event.type) : undefined}
      motionEnabled={motionEnabled}
      className="map-event-sheet"
    >
      {event ? (
        <div className="map-event-content">
          <p>{event.description}</p>
          <div className="map-event-choice-list">
            {event.choices.map((choice) => (
              <button className={choice.kind === "combat" ? "ghost-button danger" : "ghost-button"} type="button" key={choice.id} onClick={() => onChange(resolveWorldEventChoice(game, choice.id))}>
                <GameIcon name={getEventChoiceIcon(choice.kind)} size={15} />
                <span>{choice.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}

function LocationSceneImageMap({
  currentScene,
  game,
  hotspots,
  imageSrc,
  location,
  onChange,
  onSceneHotspotSelect,
  onSelectScene,
}: {
  currentScene: SceneNode;
  game: GameState;
  hotspots: LocationSceneHotspot[];
  imageSrc: string;
  location: LocationNode;
  onChange: ExploreChange;
  onSceneHotspotSelect: (hotspot: SceneHotspotModel) => void;
  onSelectScene: (sceneId: string) => void;
}) {
  const mapId = `scene:${location.id}`;
  const viewport = useMapUiStore((state) => state.viewportByMapId[mapId] ?? defaultMapViewport);
  const setMapViewport = useMapUiStore((state) => state.setMapViewport);
  const resetMapViewport = useMapUiStore((state) => state.resetMapViewport);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [dragStart, setDragStart] = useState<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailMapOpen, setDetailMapOpen] = useState(false);
  const [sceneGridOpen, setSceneGridOpen] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const scale = viewport.scale;
  const offset = clampLocationSceneOffset(viewport.offset, scale, viewportSize);
  const markerScale = 1 / scale;
  const hasShop = currentScene.actions.some((action) => action.kind === "shop");
  const hasTaskBoard = currentScene.actions.some((action) => action.kind === "taskBoard");
  const currentSceneImage: string | null = null;

  useEffect(() => {
    if (!currentSceneImage) {
      setDetailMapOpen(false);
    }
  }, [currentSceneImage]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return undefined;
    }

    const updateViewportSize = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      setViewportSize((current) => (current.width === width && current.height === height ? current : { width, height }));
    };

    updateViewportSize();
    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const nextOffset = clampLocationSceneOffset(viewport.offset, scale, viewportSize);
    if (nextOffset.x !== viewport.offset.x || nextOffset.y !== viewport.offset.y) {
      setMapViewport(mapId, { offset: nextOffset });
    }
  }, [mapId, scale, setMapViewport, viewport.offset.x, viewport.offset.y, viewportSize.width, viewportSize.height]);

  function clampScale(nextScale: number) {
    return Math.min(4, Math.max(1, Number(nextScale.toFixed(2))));
  }

  function zoom(delta: number) {
    const nextScale = clampScale(scale + delta);
    setMapViewport(mapId, {
      scale: nextScale,
      offset: clampLocationSceneOffset(offset, nextScale, viewportSize),
    });
  }

  function stopMapGesture(event: PointerEvent<HTMLElement>) {
    event.stopPropagation();
    setDragStart(null);
  }

  if (detailMapOpen && currentSceneImage) {
    return (
      <SceneDetailImageMap
        imageSrc={currentSceneImage}
        location={location}
        onBack={() => setDetailMapOpen(false)}
        onSceneHotspotSelect={onSceneHotspotSelect}
        scene={currentScene}
      />
    );
  }

  return (
    <div className="location-scene-image-map">
      <div
        ref={viewportRef}
        className="world-map-viewport location-scene-map-viewport"
        onWheel={(event) => {
          event.preventDefault();
          zoom(event.deltaY < 0 ? 0.12 : -0.12);
        }}
        onPointerDown={(event) => {
          if (isInteractiveMapTarget(event.target)) {
            return;
          }
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragStart({ pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y });
        }}
        onPointerMove={(event) => {
          if (!dragStart || dragStart.pointerId !== event.pointerId) {
            return;
          }
          setMapViewport(mapId, {
            offset: clampLocationSceneOffset(
              {
                x: dragStart.originX + event.clientX - dragStart.x,
                y: dragStart.originY + event.clientY - dragStart.y,
              },
              scale,
              viewportSize,
            ),
          });
        }}
        onPointerUp={() => setDragStart(null)}
        onPointerCancel={() => setDragStart(null)}
      >
        <div className="location-scene-map-toolbar" onPointerDown={(event) => event.stopPropagation()}>
          <div>
            <h3>{location.name}</h3>
            <span>{currentScene.name}</span>
          </div>
          <div className="map-controls">
            <button onClick={() => zoom(0.18)} aria-label="放大场景图">
              <GameIcon name="action-zoom-in" size={16} />
            </button>
            <button onClick={() => zoom(-0.18)} aria-label="缩小场景图">
              <GameIcon name="action-zoom-out" size={16} />
            </button>
            <button onClick={() => resetMapViewport(mapId)}>
              <GameIcon name="action-reset" size={16} />
              重置
            </button>
            <button className={sceneGridOpen ? "active" : ""} onClick={() => setSceneGridOpen((open) => !open)}>
              网格
            </button>
          </div>
        </div>

        <div
          className="world-map-canvas location-scene-map-canvas"
          style={{
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
          }}
        >
          <div className="scene-image-fallback location-scene-map-fallback">
            <strong>{location.name}</strong>
            <span>{currentScene.description}</span>
          </div>
          {sceneGridOpen ? <LocationSceneGridOverlay blockedRects={location.sceneMapBlockedRects ?? []} /> : null}
          {hotspots.map((hotspot) => (
            <button
              aria-label={`前往${hotspot.label}`}
              className={`map-zone-label location-scene-zone-label${hotspot.sceneId === currentScene.id ? " active" : ""}`}
              key={hotspot.id}
              onClick={(event) => {
                event.stopPropagation();
                onSelectScene(hotspot.sceneId);
                setDetailMapOpen(false);
                setDrawerOpen(true);
              }}
              onPointerDown={stopMapGesture}
              onPointerMove={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              style={getPercentAnchorStyle(hotspot.x, hotspot.y, markerScale)}
              type="button"
            >
              {hotspot.label}
            </button>
          ))}
        </div>

        {drawerOpen ? (
          <section className="world-info-drawer location-scene-drawer" onPointerDown={(event) => event.stopPropagation()}>
            <div className="section-heading">
              <h2>
                <GameIcon name={getSceneIconName(currentScene.type)} size={18} />
                {currentScene.name}
              </h2>
              <button className="ghost-button location-scene-drawer-close" onClick={() => setDrawerOpen(false)}>
                <GameIcon name="action-back" size={15} />
                返回
              </button>
            </div>
            <small>{currentScene.type}</small>
            <p>{currentScene.description}</p>
            {game.world.sceneMessage ? <p className="scene-message">{game.world.sceneMessage}</p> : null}
            {currentScene.hotspots?.length ? (
              <div className="action-grid">
                {currentScene.hotspots.map((hotspot) => (
                  <button key={hotspot.id} onClick={() => onSceneHotspotSelect(hotspot)}>
                    <GameIcon name={getActionIconName("dialogue")} size={16} />
                    {hotspot.label}
                  </button>
                ))}
              </div>
            ) : null}
            <SceneActionButtons actions={currentScene.actions} game={game} onChange={onChange} />
            {hasShop ? <Shop game={game} onChange={onChange} shopId={currentScene.id} /> : null}
            {hasTaskBoard ? <TaskBoard game={game} onChange={onChange} /> : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function SceneDetailImageMap({
  imageSrc,
  location,
  onBack,
  onSceneHotspotSelect,
  scene,
}: {
  imageSrc: string;
  location: LocationNode;
  onBack: () => void;
  onSceneHotspotSelect: (hotspot: SceneHotspotModel) => void;
  scene: SceneNode;
}) {
  const mapId = `scene-detail:${location.id}:${scene.id}`;
  const viewport = useMapUiStore((state) => state.viewportByMapId[mapId] ?? defaultMapViewport);
  const setMapViewport = useMapUiStore((state) => state.setMapViewport);
  const resetMapViewport = useMapUiStore((state) => state.resetMapViewport);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [dragStart, setDragStart] = useState<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const scale = viewport.scale;
  const offset = clampSceneImageMapOffset(viewport.offset, scale, viewportSize, SCENE_DETAIL_MAP_ASPECT_RATIO);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return undefined;
    }

    const updateViewportSize = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      setViewportSize((current) => (current.width === width && current.height === height ? current : { width, height }));
    };

    updateViewportSize();
    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const nextOffset = clampSceneImageMapOffset(viewport.offset, scale, viewportSize, SCENE_DETAIL_MAP_ASPECT_RATIO);
    if (nextOffset.x !== viewport.offset.x || nextOffset.y !== viewport.offset.y) {
      setMapViewport(mapId, { offset: nextOffset });
    }
  }, [mapId, scale, setMapViewport, viewport.offset.x, viewport.offset.y, viewportSize.width, viewportSize.height]);

  function clampScale(nextScale: number) {
    return Math.min(4, Math.max(1, Number(nextScale.toFixed(2))));
  }

  function zoom(delta: number) {
    const nextScale = clampScale(scale + delta);
    setMapViewport(mapId, {
      scale: nextScale,
      offset: clampSceneImageMapOffset(offset, nextScale, viewportSize, SCENE_DETAIL_MAP_ASPECT_RATIO),
    });
  }

  return (
    <div className="location-scene-image-map">
      <div
        ref={viewportRef}
        className="world-map-viewport location-scene-map-viewport scene-detail-map-viewport"
        onWheel={(event) => {
          event.preventDefault();
          zoom(event.deltaY < 0 ? 0.12 : -0.12);
        }}
        onPointerDown={(event) => {
          if (isInteractiveMapTarget(event.target)) {
            return;
          }
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragStart({ pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y });
        }}
        onPointerMove={(event) => {
          if (!dragStart || dragStart.pointerId !== event.pointerId) {
            return;
          }
          setMapViewport(mapId, {
            offset: clampSceneImageMapOffset(
              {
                x: dragStart.originX + event.clientX - dragStart.x,
                y: dragStart.originY + event.clientY - dragStart.y,
              },
              scale,
              viewportSize,
              SCENE_DETAIL_MAP_ASPECT_RATIO,
            ),
          });
        }}
        onPointerUp={() => setDragStart(null)}
        onPointerCancel={() => setDragStart(null)}
      >
        <div className="location-scene-map-toolbar" onPointerDown={(event) => event.stopPropagation()}>
          <div>
            <h3>{scene.name}</h3>
            <span>{location.name} / 第四级地图</span>
          </div>
          <div className="map-controls">
            <button
              onPointerDown={(event) => {
                event.stopPropagation();
                onBack();
              }}
              type="button"
            >
              <GameIcon name="action-back" size={15} />
              返回
            </button>
            <button onClick={() => zoom(0.18)} aria-label="放大场景图">
              <GameIcon name="action-zoom-in" size={16} />
            </button>
            <button onClick={() => zoom(-0.18)} aria-label="缩小场景图">
              <GameIcon name="action-zoom-out" size={16} />
            </button>
            <button onClick={() => resetMapViewport(mapId)}>
              <GameIcon name="action-reset" size={16} />
              重置
            </button>
          </div>
        </div>

        <div
          className="world-map-canvas scene-detail-map-canvas"
          style={{
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
          }}
        >
          <div className="scene-image-fallback location-scene-map-fallback">
            <strong>{scene.name}</strong>
            <span>{scene.description}</span>
          </div>
          {scene.hotspots?.length ? (
            <div className="scene-hotspot-list scene-detail-hotspot-list">
              {scene.hotspots.map((hotspot) => (
                <button className={`scene-hotspot-list-button hotspot-${hotspot.type ?? "action"}`} key={hotspot.id} onClick={() => onSceneHotspotSelect(hotspot)} type="button">
                  <span>{hotspot.label}</span>
                  {hotspot.title ?? hotspot.text ? <small>{hotspot.title ?? hotspot.text}</small> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function clampLocationSceneOffset(
  offset: { x: number; y: number },
  scale: number,
  viewportSize: { width: number; height: number },
) {
  return clampSceneImageMapOffset(offset, scale, viewportSize, LOCATION_SCENE_ASPECT_RATIO);
}

function clampSceneImageMapOffset(
  offset: { x: number; y: number },
  scale: number,
  viewportSize: { width: number; height: number },
  aspectRatio: number,
) {
  if (viewportSize.width <= 0 || viewportSize.height <= 0) {
    return { x: offset.x, y: 0 };
  }

  const canvasWidth = viewportSize.height * aspectRatio;
  const scaledCanvasWidth = canvasWidth * scale;
  const maxOffsetX = Math.max(0, (scaledCanvasWidth - viewportSize.width) / 2);

  return {
    x: clampNumber(offset.x, -maxOffsetX, maxOffsetX),
    y: 0,
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function LocationSceneGridOverlay({ blockedRects }: { blockedRects: LocationSceneBlockedRect[] }) {
  const cells = [];
  for (let y = 0; y < LOCATION_SCENE_GRID_HEIGHT; y += 1) {
    for (let x = 0; x < LOCATION_SCENE_GRID_WIDTH; x += 1) {
      cells.push({ x, y });
    }
  }

  return (
    <div className="location-scene-grid-overlay" aria-hidden="true">
      {cells.map((cell) => (
        <span
          className={`location-scene-grid-cell${isLocationSceneBlockedCell(cell, blockedRects) ? " blocked" : ""}`}
          key={`${cell.x}-${cell.y}`}
          style={{
            left: `${(cell.x / LOCATION_SCENE_GRID_WIDTH) * 100}%`,
            top: `${(cell.y / LOCATION_SCENE_GRID_HEIGHT) * 100}%`,
            width: `${100 / LOCATION_SCENE_GRID_WIDTH}%`,
            height: `${100 / LOCATION_SCENE_GRID_HEIGHT}%`,
          }}
        >
          {cell.x},{cell.y}
        </span>
      ))}
    </div>
  );
}

function isLocationSceneBlockedCell(cell: { x: number; y: number }, blockedRects: LocationSceneBlockedRect[]) {
  return blockedRects.some(
    (rect) => cell.x >= rect.x && cell.x < rect.x + rect.width && cell.y >= rect.y && cell.y < rect.y + rect.height,
  );
}

function SceneActionButtons({ actions, game, onChange }: { actions: SceneAction[]; game: GameState; onChange: ExploreChange }) {
  return (
    <div className="action-grid">
      {actions.map((action) => (
        <button className={`scene-action-card action-${action.kind}`} key={action.id} onClick={() => onChange(handleAction(game, action))}>
          <GameIcon name={getActionIconName(action.kind)} size={16} />
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

function GridMapPanel({
  mode,
  mapData,
  game,
  travel,
  debugOpen,
  debugResult,
  selectedWorldPoi,
  location,
  currentScene,
  onToggleDebug,
  onRunSelfTest,
  onMapTarget,
  onSelectWorldPoi,
  onCloseWorldPoi,
  onEnterWorldPoi,
  onSelectScene,
}: {
  mode: "world" | "local";
  mapData: GridMapData;
  game: GameState;
  travel: ActiveTravel | null;
  debugOpen: boolean;
  debugResult: string | null;
  selectedWorldPoi?: WorldPoiConfig | null;
  location?: LocationNode;
  currentScene?: SceneNode;
  onToggleDebug: () => void;
  onRunSelfTest: () => void;
  onMapTarget: (coord: GridCoord) => void;
  onSelectWorldPoi?: (poi: WorldPoiConfig) => void;
  onCloseWorldPoi?: () => void;
  onEnterWorldPoi?: (poi: WorldPoiConfig) => void;
  onSelectScene?: (sceneId: string) => void;
}) {
  const storedViewport = useMapUiStore((state) => state.viewportByMapId[mapData.mapId]);
  const setMapViewport = useMapUiStore((state) => state.setMapViewport);
  const [dragStart, setDragStart] = useState<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const [didDrag, setDidDrag] = useState(false);
  const [isMapInteracting, setIsMapInteracting] = useState(false);
  const [viewportSize, setViewportSize] = useState<GridViewportSize>({ width: 0, height: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewportSizeRef = useRef<GridViewportSize>({ width: 0, height: 0 });
  const pendingViewportFrameRef = useRef<number | null>(null);
  const pendingViewportRef = useRef<MapViewportState | null>(null);
  const wheelIdleTimerRef = useRef<number | null>(null);
  const viewport = normalizeGridViewport(mapData, viewportSize, storedViewport ?? getDefaultViewportForMap(mapData));
  const scale = viewport.scale;
  const offset = viewport.offset;
  const currentCoord = getNavigationCoord(game, mapData.mapId);
  const targetCoord = travel?.mapId === mapData.mapId ? travel.target : null;
  const visiblePath = travel?.mapId === mapData.mapId ? [currentCoord, ...travel.path] : [];
  const zones = useMemo(() => getGridDestinationZones(mapData.mapId), [mapData.mapId]);
  const hitZone = (targetCoord ? findGridDestinationZone(mapData.mapId, targetCoord) : null) ?? findGridDestinationZone(mapData.mapId, currentCoord);
  const hitZoneLabel = hitZone ? getDestinationZoneLabel(hitZone, game.world.regionId, game.world.locationId) : null;
  const visibleRect = useMemo(() => getVisibleGridRectFromViewport(mapData, viewportSize, scale, offset), [mapData, viewportSize, scale, offset.x, offset.y]);
  const visibleCells = useMemo(() => getCellsInRect(mapData, visibleRect), [mapData, visibleRect]);
  const zoomTier = getZoomTier(scale);
  const pathKeys = useMemo(() => new Set(visiblePath.map(gridCoordKey)), [visiblePath]);
  const detailedCells = debugOpen ? visibleCells : [];
  const markers = mode === "world" ? getVisibleWorldPoiMarkers(scale) : getLocalSceneMarkers(location, currentScene);
  const travelLabel = getTravelLabel(travel, mapData.mapId, location);
  const subtitle =
    travelLabel ??
    (mode === "world"
      ? selectedWorldPoi
        ? `已抵达：${selectedWorldPoi.name}`
        : `缩放 ${scale.toFixed(2)}x / ${getWorldZoomHint(scale)}`
      : currentScene
        ? `${location?.name ?? mapData.name} / 当前：${currentScene.name}`
        : `${location?.name ?? mapData.name} local map`);

  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) {
      return undefined;
    }

    const updateViewportSize = () => {
      const nextSize = {
        width: viewportElement.clientWidth,
        height: viewportElement.clientHeight,
      };
      viewportSizeRef.current = nextSize;
      setViewportSize((current) => (current.width === nextSize.width && current.height === nextSize.height ? current : nextSize));
    };

    updateViewportSize();
    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(viewportElement);
    window.addEventListener("resize", updateViewportSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateViewportSize);
    };
  }, [mapData.mapId]);

  useEffect(() => {
    pendingViewportRef.current = viewport;
  }, [viewport.scale, viewport.offset.x, viewport.offset.y]);

  useEffect(
    () => () => {
      if (pendingViewportFrameRef.current !== null) {
        cancelAnimationFrame(pendingViewportFrameRef.current);
      }
      if (wheelIdleTimerRef.current !== null) {
        window.clearTimeout(wheelIdleTimerRef.current);
      }
    },
    [],
  );

  function clampScale(nextScale: number) {
    const minScale = mapData.layer === "world" ? 0.4 : 0.8;
    return Math.min(GRID_MAP_MAX_SCALE, Math.max(minScale, Number(nextScale.toFixed(3))));
  }

  function scheduleViewport(nextViewport: MapViewportState, immediate = false) {
    const nextSize = viewportSizeRef.current.width > 0 ? viewportSizeRef.current : viewportSize;
    const normalizedViewport = normalizeGridViewport(mapData, nextSize, nextViewport);
    pendingViewportRef.current = normalizedViewport;

    if (immediate) {
      if (pendingViewportFrameRef.current !== null) {
        cancelAnimationFrame(pendingViewportFrameRef.current);
        pendingViewportFrameRef.current = null;
      }
      setMapViewport(mapData.mapId, normalizedViewport);
      return;
    }

    if (pendingViewportFrameRef.current !== null) {
      return;
    }

    pendingViewportFrameRef.current = requestAnimationFrame(() => {
      pendingViewportFrameRef.current = null;
      const pendingViewport = pendingViewportRef.current;
      if (pendingViewport) {
        setMapViewport(mapData.mapId, pendingViewport);
      }
    });
  }

  function zoomAtViewportPoint(centerX: number, centerY: number, factor: number, immediate = false) {
    const current = pendingViewportRef.current ?? viewport;
    const nextScale = clampScale(current.scale * factor);
    if (nextScale === current.scale) {
      return;
    }
    const contentX = (centerX - current.offset.x) / current.scale;
    const contentY = (centerY - current.offset.y) / current.scale;
    scheduleViewport(
      {
        scale: nextScale,
        offset: {
          x: centerX - contentX * nextScale,
          y: centerY - contentY * nextScale,
        },
      },
      immediate,
    );
  }

  function zoom(factor: number) {
    zoomAtViewportPoint(0, 0, factor, true);
  }

  function resetMap() {
    scheduleViewport(getDefaultViewportForMap(mapData), true);
  }

  function startWheelInteraction() {
    setIsMapInteracting(true);
    if (wheelIdleTimerRef.current !== null) {
      window.clearTimeout(wheelIdleTimerRef.current);
    }
    wheelIdleTimerRef.current = window.setTimeout(() => {
      setIsMapInteracting(false);
      wheelIdleTimerRef.current = null;
    }, 120);
  }

  function stopMapGesture(event: PointerEvent<HTMLElement>) {
    event.stopPropagation();
    setDragStart(null);
    setIsMapInteracting(false);
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
    setIsMapInteracting(false);
  }

  return (
    <div className={`grid-map-panel ${mode === "world" ? "world-grid-map-panel" : "local-grid-map-panel"}`}>
      <MapHeader
        title={mode === "world" ? "问仙大世界" : "local map"}
        subtitle={subtitle}
        debugOpen={debugOpen}
        onZoomIn={() => zoom(GRID_MAP_BUTTON_ZOOM_FACTOR)}
        onZoomOut={() => zoom(1 / GRID_MAP_BUTTON_ZOOM_FACTOR)}
        onReset={resetMap}
        onToggleDebug={onToggleDebug}
        onRunSelfTest={onRunSelfTest}
      />

      <div
        ref={viewportRef}
        className={`world-map-viewport grid-map-viewport ${mode === "world" ? "world-grid-map-viewport" : "local-grid-map-viewport"} zoom-${zoomTier} ${
          isMapInteracting ? "is-map-interacting" : ""
        }`}
        onWheel={(event) => {
          event.preventDefault();
          startWheelInteraction();
          const viewportRect = event.currentTarget.getBoundingClientRect();
          const centerX = event.clientX - viewportRect.left - viewportRect.width / 2;
          const centerY = event.clientY - viewportRect.top - viewportRect.height / 2;
          zoomAtViewportPoint(centerX, centerY, event.deltaY < 0 ? GRID_MAP_WHEEL_ZOOM_FACTOR : 1 / GRID_MAP_WHEEL_ZOOM_FACTOR);
        }}
        onPointerDown={(event) => {
          if (isInteractiveMapTarget(event.target)) {
            return;
          }
          event.currentTarget.setPointerCapture(event.pointerId);
          setIsMapInteracting(true);
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
          scheduleViewport({
            scale,
            offset: { x: dragStart.originX + deltaX, y: dragStart.originY + deltaY },
          });
        }}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setDragStart(null);
          setDidDrag(false);
          setIsMapInteracting(false);
        }}
      >
        <div
          className={`world-map-canvas grid-map-canvas ${mode === "world" ? "world-grid-map-canvas" : "local-grid-map-canvas"}`}
          style={{
            aspectRatio: `${mapData.width} / ${mapData.height}`,
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
          }}
        >
          <GridAtmosphereOverlay mode={mode} />
          {mapData.roadSegments.length > 0 ? <GridRoadOverlay mapData={mapData} visibleRect={visibleRect} /> : null}
          {detailedCells.map((cell) => (
            <GridTerrainCell
              cell={cell}
              className={`${pathKeys.has(gridCoordKey(cell)) ? "route" : ""}`}
              key={`terrain-${cell.x}-${cell.y}`}
              mapData={mapData}
            />
          ))}
          {debugOpen ? <GridDebugOverlay mapData={mapData} current={currentCoord} target={targetCoord} path={visiblePath} zones={zones} hitZone={hitZone} visibleCells={visibleCells} /> : null}
          {visiblePath.length > 0 ? <GridRouteOverlay mapData={mapData} path={visiblePath} /> : null}
        </div>

        <div className="grid-map-marker-overlay">
          <GridPlayerMarker style={getGridViewportAnchorStyle(mapData, currentCoord, viewportSize, scale, offset)} />
          {markers.map((marker) => (
            <button
              aria-label={`查看${marker.label}`}
              className={marker.className}
              key={marker.id}
              style={getGridViewportAnchorStyle(mapData, marker.coord, viewportSize, scale, offset)}
              onPointerDown={stopMapGesture}
              onPointerMove={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                if (marker.kind === "worldPoi") {
                  onSelectWorldPoi?.(marker.poi);
                  return;
                }
                onSelectScene?.(marker.scene.id);
              }}
              type="button"
            >
              <GameIcon name={marker.iconName} size={14} />
              <span>{marker.label}</span>
              {marker.detail ? <small>{marker.detail}</small> : null}
            </button>
          ))}
          {mode === "world" ? <WorldRegionLabels scale={scale} mapData={mapData} viewportSize={viewportSize} offset={offset} /> : null}
        </div>

        {debugOpen ? <GridDebugReadout current={currentCoord} target={targetCoord} path={visiblePath} hitZoneLabel={hitZoneLabel} result={debugResult} /> : null}
        {mode === "world" && selectedWorldPoi ? (
          <WorldPoiDrawer poi={selectedWorldPoi} onClose={onCloseWorldPoi} onEnter={onEnterWorldPoi} />
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
        <button className={debugOpen ? "active" : ""} onClick={onToggleDebug}>
          网格
        </button>
        <button onClick={onRunSelfTest}>自检</button>
      </div>
    </div>
  );
}

type GridMapMarker =
  | {
      kind: "worldPoi";
      id: string;
      label: string;
      coord: GridCoord;
      poi: WorldPoiConfig;
      iconName: GameIconName;
      className: string;
      detail?: string;
    }
  | {
      kind: "scene";
      id: string;
      label: string;
      coord: GridCoord;
      scene: SceneNode;
      iconName: GameIconName;
      className: string;
      detail?: string;
    };

function GridAtmosphereOverlay({ mode }: { mode: "world" | "local" }) {
  return <div className={`grid-atmosphere-overlay ${mode}`} aria-hidden="true" />;
}

function GridRoadOverlay({ mapData, visibleRect }: { mapData: GridMapData; visibleRect: GridVisibleRect }) {
  const segments = mapData.roadSegments.filter((segment) => isRoadSegmentVisible(segment, visibleRect));
  if (segments.length === 0) {
    return null;
  }

  return (
    <svg className="grid-road-overlay-svg" viewBox={`0 0 ${mapData.width} ${mapData.height}`} preserveAspectRatio="none" aria-hidden="true">
      {segments.map((segment) => (
        <polyline
          className={`grid-road-line road-kind-${segment.kind}`}
          key={segment.id}
          points={segment.points.map((point) => `${point.x + 0.5},${point.y + 0.5}`).join(" ")}
        />
      ))}
    </svg>
  );
}

function GridTerrainCell({ mapData, cell, className = "" }: { mapData: GridMapData; cell: GridCell; className?: string }) {
  return (
    <span
      className={`grid-terrain-cell terrain-${cell.terrain} danger-${Math.min(7, cell.dangerLevel)} spirit-${Math.min(8, cell.spiritLevel)} ${
        cell.walkable ? "walkable" : "blocked"
      } ${className}`.trim()}
      style={getGridCellStyle(mapData, cell)}
    />
  );
}

function GridRouteOverlay({ mapData, path }: { mapData: GridMapData; path: GridCoord[] }) {
  return (
    <div className="grid-route-overlay" aria-hidden="true">
      {path.map((coord, index) => (
        <span className={index === path.length - 1 ? "route-step target" : "route-step"} key={`${coord.x}-${coord.y}-${index}`} style={getGridCellStyle(mapData, coord)} />
      ))}
    </div>
  );
}

function WorldRegionLabels({
  mapData,
  scale,
  viewportSize,
  offset,
}: {
  mapData: GridMapData;
  scale: number;
  viewportSize: GridViewportSize;
  offset: { x: number; y: number };
}) {
  const labels = [
    { id: "north", name: "北境", coord: { x: 156, y: 24 }, detail: "玄冰雪域" },
    { id: "central", name: "中州", coord: { x: 160, y: 104 }, detail: "天下腹地" },
    { id: "south", name: "南疆", coord: { x: 156, y: 168 }, detail: "巫妖灵疆" },
    { id: "east", name: "东海", coord: { x: 268, y: 88 }, detail: "万岛沧溟" },
    { id: "west", name: "西漠", coord: { x: 58, y: 112 }, detail: "沙海佛国" },
  ];
  return (
    <div className={`world-region-labels ${scale < 1.5 ? "visible" : ""}`} aria-hidden="true">
      {labels.map((label) => (
        <span className={`world-region-label ${label.id}`} key={label.id} style={getGridViewportAnchorStyle(mapData, label.coord, viewportSize, scale, offset)}>
          {label.name}
          <small>{label.detail}</small>
        </span>
      ))}
    </div>
  );
}

function WorldPoiDrawer({
  poi,
  onClose,
  onEnter,
}: {
  poi: WorldPoiConfig;
  onClose?: () => void;
  onEnter?: (poi: WorldPoiConfig) => void;
}) {
  return (
    <section className={`world-info-drawer world-poi-drawer poi-${poi.kind}`} onPointerDown={(event) => event.stopPropagation()}>
      <div className="section-heading">
        <h2>
          <GameIcon name={poi.iconName as GameIconName} size={18} />
          {poi.name}
        </h2>
        <span>
          {poi.regionTag} / {poi.climateTag}
        </span>
      </div>
      <p>{poi.description}</p>
      <p className="danger-hint">
        危险 {poi.dangerLevel} / 灵气 {poi.spiritLevel} / 推荐 {poi.recommendedRealm}
      </p>
      <p className="muted">{poi.danger}</p>
      {poi.forces?.length ? (
        <div className="force-list">
          {poi.forces.map((force) => (
            <span key={force}>{force}</span>
          ))}
        </div>
      ) : null}
      <div className="world-drawer-actions">
        <button className="ghost-button" onClick={onClose}>
          <GameIcon name="action-back" size={15} />
          返回
        </button>
        <button className="primary-action compact" disabled={!poi.open || !poi.locationId} onClick={() => onEnter?.(poi)}>
          {poi.open && poi.locationId ? `进入${poi.name}` : "暂未开放"}
          <small>{poi.open && poi.locationId ? "进入该地点 local map" : "保留为世界区域标签/后续内容"}</small>
        </button>
      </div>
    </section>
  );
}

function GridPlayerMarker({ style }: { style: CSSProperties }) {
  return (
    <span className="grid-player-marker" style={style}>
      你
    </span>
  );
}

function getGridViewportAnchorStyle(
  mapData: GridMapData,
  coord: GridCoord,
  viewportSize: GridViewportSize,
  scale: number,
  offset: { x: number; y: number },
  offsetX = 0,
  offsetY = 0,
): CSSProperties {
  const canvasSize = getGridCanvasBaseSize(mapData, viewportSize);
  if (!canvasSize) {
    return {
      left: "50%",
      top: "50%",
      "--label-offset-x": `${offsetX}px`,
      "--label-offset-y": `${offsetY}px`,
    } as CSSProperties;
  }

  const x = viewportSize.width / 2 + offset.x + (((coord.x + 0.5) / mapData.width) - 0.5) * canvasSize.width * scale;
  const y = viewportSize.height / 2 + offset.y + (((coord.y + 0.5) / mapData.height) - 0.5) * canvasSize.height * scale;
  return {
    left: `${Math.round(x)}px`,
    top: `${Math.round(y)}px`,
    "--label-offset-x": `${offsetX}px`,
    "--label-offset-y": `${offsetY}px`,
  } as CSSProperties;
}

function getGridCellStyle(mapData: GridMapData, coord: GridCoord): CSSProperties {
  return {
    left: `${(coord.x / mapData.width) * 100}%`,
    top: `${(coord.y / mapData.height) * 100}%`,
    width: `${100 / mapData.width}%`,
    height: `${100 / mapData.height}%`,
  };
}

function getPercentAnchorStyle(x: number, y: number, markerScale: number): CSSProperties {
  return {
    left: `${x}%`,
    top: `${y}%`,
    "--marker-scale": `${markerScale}`,
  } as CSSProperties;
}

function GridDebugOverlay({
  mapData,
  current,
  target,
  path,
  zones,
  hitZone,
  visibleCells,
}: {
  mapData: GridMapData;
  current: GridCoord;
  target: GridCoord | null;
  path: GridCoord[];
  zones: GridDestinationZone[];
  hitZone: GridDestinationZone | null;
  visibleCells: GridCell[];
}) {
  const pathKeys = useMemo(() => new Set(path.map(gridCoordKey)), [path]);
  const zoneKeys = useMemo(() => new Set(zones.flatMap((zone) => zone.cells.map(gridCoordKey))), [zones]);
  const hitZoneKeys = useMemo(() => new Set(hitZone?.cells.map(gridCoordKey) ?? []), [hitZone]);
  const currentKey = gridCoordKey(current);
  const targetKey = target ? gridCoordKey(target) : null;

  return (
    <div className="grid-debug-overlay" aria-hidden="true">
      {visibleCells.map((cell) => {
        const key = gridCoordKey(cell);
        return (
          <span
            className={`grid-debug-cell ${cell.walkable ? "walkable" : "blocked"} ${zoneKeys.has(key) ? "zone" : ""} ${
              hitZoneKeys.has(key) ? "zone-hit" : ""
            } ${cell.portalTargetMapId ? "portal" : ""} ${pathKeys.has(key) ? "path" : ""} ${key === currentKey ? "current" : ""} ${
              key === targetKey ? "target" : ""
            }`}
            key={key}
            style={getGridCellStyle(mapData, cell)}
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

function getVisibleWorldPoiMarkers(scale: number): GridMapMarker[] {
  return worldPois
    .filter((poi) => scale >= poi.revealZoom)
    .sort((left, right) => right.priority - left.priority)
    .map((poi) => ({
      kind: "worldPoi",
      id: poi.id,
      label: poi.name,
      coord: poi.coord,
      poi,
      iconName: poi.iconName as GameIconName,
      detail: scale >= 0.8 ? `${poi.regionTag} · 危险${poi.dangerLevel}` : undefined,
      className: `map-zone-label grid-map-marker world-poi-marker poi-${poi.kind} ${poi.open ? "open" : "locked"} ${
        poi.mainQuest ? "main-quest" : ""
      }`,
    }));
}

function getLocalSceneMarkers(location: LocationNode | undefined, currentScene: SceneNode | undefined): GridMapMarker[] {
  if (!location) {
    return [];
  }
  const markers: GridMapMarker[] = [];
  location.scenes.forEach((scene) => {
    const coord = getLocalSceneGridCoord(location.id, scene.id);
    if (!coord) {
      return;
    }
    markers.push({
      kind: "scene",
      id: scene.id,
      label: scene.name,
      coord,
      scene,
      iconName: getSceneIconName(scene.type),
      detail: scene.type,
      className: `map-zone-label grid-map-marker local-scene-marker ${scene.id === currentScene?.id ? "active" : ""}`,
    });
  });
  return markers;
}

function getTravelLabel(travel: ActiveTravel | null, mapId: string, location?: LocationNode): string | null {
  if (!travel || travel.mapId !== mapId) {
    return null;
  }
  if (travel.intent.kind === "worldPoiPreview") {
    const poi = getWorldPoi(travel.intent.poiId);
    return poi ? `正在前往：${poi.name}` : "正在寻路";
  }
  if (travel.intent.kind === "localScene") {
    const sceneId = travel.intent.sceneId;
    const sceneName = location?.scenes.find((scene) => scene.id === sceneId)?.name;
    return sceneName ? `正在前往：${sceneName}` : "正在 local map 内移动";
  }
  return "正在沿灵路移动";
}

function getDefaultViewportForMap(mapData: GridMapData) {
  return mapData.layer === "world" ? { scale: 0.72, offset: { x: 0, y: 0 } } : defaultMapViewport;
}

function getZoomTier(scale: number): "overview" | "normal" | "detail" | "cell" | "micro" {
  if (scale < 0.8) {
    return "overview";
  }
  if (scale < 1.5) {
    return "normal";
  }
  if (scale < 2.5) {
    return "detail";
  }
  if (scale < 4) {
    return "cell";
  }
  return "micro";
}

function getWorldZoomHint(scale: number): string {
  if (scale < 0.8) {
    return "总览：大城、宗门、山脉、禁地";
  }
  if (scale < 1.5) {
    return "区域：城镇、道路、航线、危险等级";
  }
  if (scale < 2.5) {
    return "细节：洞府、秘境、资源点、妖兽区";
  }
  return "格子：地形、灵气、移动消耗、可通行状态";
}

function getFullGridRect(mapData: GridMapData): GridVisibleRect {
  return { left: 0, top: 0, right: mapData.width, bottom: mapData.height };
}

function getVisibleGridRectFromViewport(mapData: GridMapData, viewportSize: GridViewportSize, scale: number, offset: { x: number; y: number }): GridVisibleRect {
  const canvasSize = getGridCanvasBaseSize(mapData, viewportSize);
  if (!canvasSize) {
    return getFullGridRect(mapData);
  }
  const cellWidth = canvasSize.width / mapData.width;
  const cellHeight = canvasSize.height / mapData.height;
  const centerX = mapData.width / 2 - offset.x / (cellWidth * scale);
  const centerY = mapData.height / 2 - offset.y / (cellHeight * scale);
  const halfWidth = viewportSize.width / (2 * cellWidth * scale);
  const halfHeight = viewportSize.height / (2 * cellHeight * scale);
  const padding = mapData.layer === "world" ? GRID_MAP_VISIBLE_PADDING : 2;

  return {
    left: clampNumber(Math.floor(centerX - halfWidth) - padding, 0, mapData.width),
    top: clampNumber(Math.floor(centerY - halfHeight) - padding, 0, mapData.height),
    right: clampNumber(Math.ceil(centerX + halfWidth) + padding, 0, mapData.width),
    bottom: clampNumber(Math.ceil(centerY + halfHeight) + padding, 0, mapData.height),
  };
}

function normalizeGridViewport(mapData: GridMapData, viewportSize: GridViewportSize, viewport: MapViewportState): MapViewportState {
  const minScale = mapData.layer === "world" ? 0.4 : 0.8;
  const scale = Math.min(GRID_MAP_MAX_SCALE, Math.max(minScale, Number(viewport.scale.toFixed(3))));
  const canvasSize = getGridCanvasBaseSize(mapData, viewportSize);
  if (!canvasSize) {
    return { scale, offset: viewport.offset };
  }

  const maxOffsetX = Math.max(GRID_MAP_EDGE_PADDING, (canvasSize.width * scale - viewportSize.width) / 2 + GRID_MAP_EDGE_PADDING);
  const maxOffsetY = Math.max(GRID_MAP_EDGE_PADDING, (canvasSize.height * scale - viewportSize.height) / 2 + GRID_MAP_EDGE_PADDING);
  return {
    scale,
    offset: {
      x: clampNumber(viewport.offset.x, -maxOffsetX, maxOffsetX),
      y: clampNumber(viewport.offset.y, -maxOffsetY, maxOffsetY),
    },
  };
}

function getGridCanvasBaseSize(mapData: GridMapData, viewportSize: GridViewportSize): GridViewportSize | null {
  if (viewportSize.width <= 0 || viewportSize.height <= 0) {
    return null;
  }
  return {
    width: viewportSize.width,
    height: viewportSize.width * (mapData.height / mapData.width),
  };
}

function isRoadSegmentVisible(segment: GridMapData["roadSegments"][number], rect: GridVisibleRect): boolean {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  segment.points.forEach((point) => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x + 1);
    maxY = Math.max(maxY, point.y + 1);
  });

  return maxX >= rect.left && minX <= rect.right && maxY >= rect.top && minY <= rect.bottom;
}

function getCellsInRect(mapData: GridMapData, rect: GridVisibleRect): GridCell[] {
  const cells: GridCell[] = [];
  for (let y = rect.top; y < rect.bottom; y += 1) {
    for (let x = rect.left; x < rect.right; x += 1) {
      const cell = mapData.cells[y * mapData.width + x];
      if (cell) {
        cells.push(cell);
      }
    }
  }
  return cells;
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

function applyArrivalEvent(game: GameState, travel: ActiveTravel): GameState {
  return maybeTriggerMapEvent(game, { mapId: travel.mapId, coord: travel.target, locationId: getTravelLocationId(travel) });
}

function getTravelLocationId(travel: ActiveTravel): string | undefined {
  if (travel.intent.kind === "location" || travel.intent.kind === "locationPreview" || travel.intent.kind === "localScene") {
    return travel.intent.locationId;
  }
  if (travel.intent.kind === "worldPoiPreview") {
    return getWorldPoi(travel.intent.poiId)?.locationId;
  }
  const targetZone = findGridDestinationZone(travel.mapId, travel.target);
  if (targetZone?.kind === "poi") {
    return getWorldPoi(targetZone.targetId)?.locationId;
  }
  if (targetZone?.kind === "scene") {
    return getLocationIdFromLocalGridMapId(targetZone.mapId);
  }
  return targetZone?.kind === "location" ? targetZone.targetId : undefined;
}

function getDestinationZoneLabel(zone: GridDestinationZone, currentRegionId: string, currentLocationId: string): string {
  if (zone.kind === "poi") {
    return getWorldPoi(zone.targetId)?.name ?? zone.targetId;
  }
  if (zone.kind === "location") {
    return getLocation(currentRegionId, zone.targetId).name;
  }
  if (zone.kind === "scene") {
    const locationId = getLocationIdFromLocalGridMapId(zone.mapId) ?? currentLocationId;
    return getLocation(currentRegionId, locationId).scenes.find((scene) => scene.id === zone.targetId)?.name ?? zone.targetId;
  }
  return zone.zoneId;
}

function applyWorldPoiEnterChange(game: GameState, poi: WorldPoiConfig): GameState {
  if (!poi.locationId) {
    return game;
  }
  const nextLocation = getLocation(poi.regionId, poi.locationId);
  const nextMapId = poi.enterMapId ?? getLocalGridMapId(poi.locationId);
  const nextCoord = nextMapId ? getDefaultGridCoord(nextMapId) : null;

  return {
    ...game,
    world: {
      ...game.world,
      regionId: poi.regionId,
      locationId: nextLocation.id,
      sceneId: nextLocation.scenes[0].id,
      lastTownId: nextLocation.type === "city" || nextLocation.type === "town" ? nextLocation.id : game.world.lastTownId,
      sceneMessage: `进入${poi.name} local map。`,
      navigation: {
        ...game.world.navigation,
        activeMapId: nextMapId ?? WORLD_GRID_MAP_ID,
        positions: nextMapId && nextCoord ? { ...game.world.navigation.positions, [nextMapId]: nextCoord } : game.world.navigation.positions,
      },
    },
  };
}

function applyLocationChange(game: GameState, locationId: string): GameState {
  const nextLocation = getLocation(game.world.regionId, locationId);
  return {
    ...game,
    world: {
      ...game.world,
      locationId,
      sceneId: nextLocation.scenes[0].id,
      lastTownId: nextLocation.type === "city" || nextLocation.type === "town" ? nextLocation.id : game.world.lastTownId,
      sceneMessage: `抵达 ${nextLocation.name}。`,
    },
  };
}

function applySceneChange(game: GameState, sceneId: string): GameState {
  const nextScene = getScene(game.world.regionId, game.world.locationId, sceneId);
  return {
    ...game,
    world: {
      ...game.world,
      sceneId,
      sceneMessage: `来到 ${nextScene.name}。`,
    },
  };
}

function getTravelStartMessage(intent: TravelIntent, target: GridCoord, adjusted: boolean): string {
  const suffix = adjusted ? "目标不可走，已改往附近最近可走格。" : `目标格 ${gridCoordKey(target)}。`;
  if (intent.kind === "worldPoiPreview") {
    const poi = getWorldPoi(intent.poiId);
    return `你向${poi?.name ?? "目标地点"}行去，${suffix}`;
  }
  if (intent.kind === "location" || intent.kind === "locationPreview") {
    return `你向${getLocation(intent.regionId, intent.locationId).name}行去，${suffix}`;
  }
  if (intent.kind === "localScene") {
    return `你在 local map 内移动，${suffix}`;
  }
  return `你展开身法沿格线前行，${suffix}`;
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

function getEventTypeLabel(type: string): string {
  if (type === "combat") {
    return "战斗事件";
  }
  if (type === "field") {
    return "灵田事件";
  }
  if (type === "weather") {
    return "天象事件";
  }
  if (type === "treasure") {
    return "机缘事件";
  }
  if (type === "quest") {
    return "任务事件";
  }
  return "对话事件";
}

function getEventChoiceIcon(kind: string): GameIconName {
  if (kind === "combat") {
    return "combat";
  }
  if (kind === "field" || kind === "reward") {
    return "system-spirit-field";
  }
  if (kind === "weather") {
    return "module-explore";
  }
  return "combat-log";
}

function handleAction(game: GameState, action: SceneAction): GameState {
  if (action.kind === "dialogue") {
    const visitedLuoxia = game.world.locationId === "luoxia_town";
    return appendLog(
      {
        ...game,
        world: {
          ...game.world,
          tasks: visitedLuoxia
            ? {
                ...game.world.tasks,
                deliver_letter: {
                  status: game.world.tasks.deliver_letter?.status ?? "available",
                  progress: 1,
                },
              }
            : game.world.tasks,
        },
      },
      action.text ?? "你与此地修士交谈片刻，记下一些传闻。",
    );
  }
  if (action.kind === "joinSect") {
    return joinSect(game);
  }
  if (action.kind === "combat" && action.targetId) {
    return advanceSceneActionTime(beginCombat(game, action.targetId), action.kind);
  }
  if (action.kind === "gather") {
    if (action.rewards) {
      return advanceSceneActionTime(appendLog(addRewards(game, action.rewards), action.text ?? "你细心采集，收起此地灵物。"), action.kind);
    }
    return advanceSceneActionTime(grantGatherReward(game), action.kind);
  }
  if (action.kind === "recruitPet") {
    return recruitPet(game);
  }
  if (action.kind === "recruitCompanion") {
    return recruitCompanion(game);
  }
  if (action.kind === "treasure") {
    if (action.rewards) {
      return advanceSceneActionTime(appendLog(addRewards(game, action.rewards), action.text ?? "你搜寻此地，得到一份机缘。"), action.kind);
    }
    return advanceSceneActionTime(grantTreasure(game), action.kind);
  }
  return game;
}

function advanceSceneActionTime(game: GameState, kind: SceneAction["kind"]): GameState {
  if (kind === "combat") {
    return advanceTime(game, { hours: COMBAT_ACTION_HOURS });
  }
  if (kind === "gather") {
    return advanceTime(game, { hours: GATHER_ACTION_HOURS });
  }
  if (kind === "treasure") {
    return advanceTime(game, { hours: TREASURE_ACTION_HOURS });
  }
  return game;
}

function Shop({ game, onChange, shopId }: { game: GameState; onChange: ExploreChange; shopId?: string }) {
  const shop = getShopConfig(shopId, game.world.regionId);
  const refresh = getShopRefreshInfo(shop, game.world.calendar);
  return (
    <section className="shop-list">
      <div className="section-heading">
        <h2>
          <GameIcon name="location-town" size={18} />
          {shop.name}
        </h2>
        <span>灵石 {game.player.spiritStones}</span>
      </div>
      <p className="shop-refresh-note">
        {refresh.label}
        {refresh.remainingDays !== null ? ` · ${refresh.remainingDays}天后补货` : ""}
      </p>
      <ShopItemList game={game} onChange={onChange} shop={shop} />
    </section>
  );
}

function ShopCatalogSheet({
  game,
  motionEnabled,
  onChange,
  onOpenChange,
  open,
  shopId,
}: {
  game: GameState;
  motionEnabled: boolean;
  onChange: ExploreChange;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  shopId: string | null;
}) {
  const shop = getShopConfig(shopId, game.world.regionId);
  const refresh = getShopRefreshInfo(shop, game.world.calendar);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={shop.name}
      subtitle={shop.ownerName ? `${shop.ownerName} · ${refresh.label}` : refresh.label}
      motionEnabled={motionEnabled}
      className="shop-catalog-sheet"
    >
      <div className="shop-catalog">
        <section className="shop-catalog-summary">
          <div>
            <h3>{shop.description}</h3>
            <p>
              当前灵石：<strong>{game.player.spiritStones}</strong>
            </p>
          </div>
          <span>{refresh.remainingDays !== null ? `${refresh.remainingDays}天后补货` : "固定库存"}</span>
        </section>
        <ShopItemList game={game} onChange={onChange} shop={shop} large />
      </div>
    </BottomSheet>
  );
}

function ShopItemList({ game, large = false, onChange, shop }: { game: GameState; large?: boolean; onChange: ExploreChange; shop: ShopConfig }) {
  const displayItems = getShopDisplayItems(game, shop);

  function buy(itemId: string) {
    onChange((currentGame) => buyShopItem(currentGame, shop.id, itemId));
  }

  return (
    <div className={large ? "shop-catalog-grid" : "shop-inline-list"}>
      {displayItems.map(({ item, remaining, shopItem, soldOut }) => {
        const stockText = remaining === null ? "不限" : `${remaining}/${shopItem.stock}`;
        const canBuy = !soldOut && game.player.spiritStones >= shopItem.price;
        return (
          <div className={`item-row shop-item-row grade-card grade-${item.grade}${soldOut ? " sold-out" : ""}`} key={shopItem.itemId}>
            <div className="shop-item-main">
              <div className="shop-item-title">
                <strong className={getGradeNameClass(item)}>{formatItemName(item)}</strong>
                <GradeBadge compact grade={item.grade} />
              </div>
              <small>{item.description}</small>
              <span>库存 {stockText}</span>
            </div>
            <button disabled={!canBuy} onClick={() => buy(shopItem.itemId)}>
              {soldOut ? "售罄" : `${shopItem.price} 灵石`}
            </button>
          </div>
        );
      })}
      {displayItems.length === 0 ? <p className="shop-refresh-note">此地暂时没有适合当前州域的货物。</p> : null}
    </div>
  );
}

function getGradeNameClass(item: ItemConfig): string {
  return `grade-name grade-${item.grade}${shouldEmphasizeItemGrade(item.grade) ? " strong" : ""}`;
}

function TaskBoard({ game, onChange }: { game: GameState; onChange: ExploreChange }) {
  const visibleTasks = tasks.filter((task) => !task.regionId || task.regionId === game.world.regionId);

  function accept(taskId: string) {
    const nextTask: QuestState = { status: "accepted", progress: game.world.tasks[taskId]?.progress ?? 0 };
    onChange(
      appendLog(
        {
          ...game,
          world: {
            ...game.world,
            tasks: { ...game.world.tasks, [taskId]: nextTask },
          },
        },
        "你接下宗门任务。",
      ),
    );
  }

  function complete(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }
    const hasItems = task.requiredItems?.every((item) => (game.inventory.items[item.itemId] ?? 0) >= item.amount) ?? true;
    const hasFlags = task.requiredFlags?.every((flag) => flag === "visited_luoxia" && (game.world.tasks.deliver_letter?.progress ?? 0) > 0) ?? true;
    if (!hasItems || !hasFlags) {
      onChange(appendLog(game, "任务条件尚未完成。"));
      return;
    }
    const paid = removeItems(game, task.requiredItems);
    const rewarded = addItems(
      {
        ...paid,
        player: {
          ...paid.player,
          spiritStones: paid.player.spiritStones + task.rewards.spiritStones,
        },
        world: {
          ...paid.world,
          sectContribution: paid.world.sectContribution + task.rewards.contribution,
          sectReputation: paid.world.sectReputation + task.rewards.reputation,
          tasks: {
            ...paid.world.tasks,
            [taskId]: { status: "completed", progress: 1 },
          },
        },
      },
      task.rewards.items,
    );
    onChange(appendLog(rewarded, `完成任务《${task.title}》，贡献 +${task.rewards.contribution}。`));
  }

  return (
    <section className="task-board">
      <div className="section-heading">
        <h2>
          <GameIcon name="combat-log" size={18} />
          任务榜
        </h2>
        <span>{visibleTasks.length} 件</span>
      </div>
      {visibleTasks.map((task) => {
        const state = game.world.tasks[task.id]?.status ?? "available";
        return (
          <div className="task-row" key={task.id}>
            <div>
              <strong>{task.title}</strong>
              <small>{task.description}</small>
              <small>需求：{task.requirementText}</small>
            </div>
            {state === "available" ? <button onClick={() => accept(task.id)}>接取</button> : null}
            {state === "accepted" ? <button onClick={() => complete(task.id)}>完成</button> : null}
            {state === "completed" ? <span className="done-tag">已完成</span> : null}
          </div>
        );
      })}
    </section>
  );
}
