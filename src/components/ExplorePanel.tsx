import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
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
import { REGION_TILE_MOVE_DAYS, WORLD_TILE_MOVE_DAYS } from "../data/time";
import { formatItemName, getItem, shouldEmphasizeItemGrade } from "../data/items";
import { getRegionMapConfig, type RegionMapConfig } from "../data/regionMaps";
import { getLocation, getRegion, getScene, shopItems, tasks, type LocationNode, type LocationSceneHotspot, type SceneAction, type SceneNode } from "../data/world";
import { getWorldProvince, worldProvinces, type WorldProvince } from "../data/worldMap";
import { getSceneImage, mapImages, regionMapImages } from "../data/assets";
import { beginCombat, grantGatherReward, grantTreasure } from "../game/combatEngine";
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
import { advanceTime } from "../game/time";
import type { GameState, GridCoord, GridDestinationZone, GridMapData, ItemConfig, QuestState } from "../types";
import { useActiveGame, useSettings, useUpdateGame } from "../stores/gameStore";
import { defaultMapViewport, useMapUiStore, type ActiveTravel, type LocationTravelIntent, type TravelIntent } from "../stores/mapUiStore";
import { GameIcon, getLocationIconName, type GameIconName } from "./GameIcon";
import { NpcDialogueSheet, SceneHotspot, SceneView } from "./scene";

const GRID_MOVEMENT_STEP_MS = 180;
const LOCATION_SCENE_GRID_WIDTH = 42;
const LOCATION_SCENE_GRID_HEIGHT = 23;
const LOCATION_SCENE_ASPECT_RATIO = LOCATION_SCENE_GRID_WIDTH / LOCATION_SCENE_GRID_HEIGHT;
const SCENE_DETAIL_MAP_ASPECT_RATIO = 3 / 2;
type ExploreChange = (next: GameState | ((prev: GameState) => GameState)) => void;

export default function ExplorePanel() {
  const activeGame = useActiveGame();
  const onChange = useUpdateGame();
  const settings = useSettings();
  const view = useMapUiStore((state) => state.view);
  const selectedProvinceId = useMapUiStore((state) => state.selectedProvinceId);
  const selectedRegionMarkerId = useMapUiStore((state) => state.selectedRegionMarkerId);
  const activeSceneHotspotId = useMapUiStore((state) => state.activeSceneHotspotId);
  const debugOpen = useMapUiStore((state) => state.debugOpen);
  const debugResult = useMapUiStore((state) => state.debugResult);
  const travel = useMapUiStore((state) => state.travel);
  const setView = useMapUiStore((state) => state.setView);
  const setSelectedProvinceId = useMapUiStore((state) => state.setSelectedProvinceId);
  const setSelectedRegionMarkerId = useMapUiStore((state) => state.setSelectedRegionMarkerId);
  const setActiveSceneHotspotId = useMapUiStore((state) => state.setActiveSceneHotspotId);
  const toggleDebug = useMapUiStore((state) => state.toggleDebug);
  const setDebugResult = useMapUiStore((state) => state.setDebugResult);
  const setTravel = useMapUiStore((state) => state.setTravel);

  if (!activeGame) {
    return null;
  }

  const game = activeGame;
  const region = getRegion(game.world.regionId);
  const location = getLocation(game.world.regionId, game.world.locationId);
  const scene = getScene(game.world.regionId, game.world.locationId, game.world.sceneId);
  const sceneImage = getSceneImage(scene.imageKey);
  const locationSceneMapImage = getSceneImage(location.sceneMapImageKey);
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
      setTravel(null);
      return;
    }

    const timer = window.setTimeout(() => {
      const [nextStep, ...remainingPath] = travel.path;
      onChange((currentGame) => {
        const movedGame = updateNavigationPosition(currentGame, travel.mapId, nextStep);
        const stepDays = travel.mapId === WORLD_GRID_MAP_ID ? WORLD_TILE_MOVE_DAYS : REGION_TILE_MOVE_DAYS;
        return advanceTime(movedGame, stepDays);
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
    startTravel(WORLD_GRID_MAP_ID, target, { kind: "province", province });
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

  function openSceneHotspot(hotspot: { id: string; label?: string; text?: string }) {
    setActiveSceneHotspotId(hotspot.id);
    onChange((currentGame) => appendLog(currentGame, `${hotspot.label ?? "场景"}：${hotspot.text ?? "你略作停留。"}`));
  }

  function completeTravel(doneTravel: ActiveTravel) {
    const map = getGridMapData(doneTravel.mapId);
    const targetZone = map ? findGridDestinationZone(doneTravel.mapId, doneTravel.target) : null;

    if (doneTravel.intent.kind === "province") {
      const province = doneTravel.intent.province;
      if (province) {
        setSelectedProvinceId(province.id);
        setSelectedRegionMarkerId(null);
        setView("world");
        onChange((currentGame) =>
          appendLog(
            updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target),
            `${doneTravel.adjusted ? "目标落在险阻处，已改抵附近可走格。" : ""}你抵达${province.name}地界，已展开州域信息。`,
          ),
        );
      }
      return;
    }

    if (doneTravel.intent.kind === "location") {
      const locationId = doneTravel.intent.locationId;
      setView("location");
      onChange((currentGame) => applyLocationChange(updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target), locationId));
      return;
    }

    if (doneTravel.intent.kind === "locationPreview") {
      const targetLocation = getLocation(doneTravel.intent.regionId, doneTravel.intent.locationId);
      setSelectedRegionMarkerId(targetLocation.id);
      setView("region");
      onChange((currentGame) =>
        appendLog(
          updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target),
          `${doneTravel.adjusted ? "目标落在险阻处，已改抵附近可走格。" : ""}你抵达${targetLocation.name}周边，已展开地点信息。`,
        ),
      );
      return;
    }

    if (targetZone?.kind === "province") {
      const province = worldProvinces.find((item) => item.id === targetZone.targetId);
      if (province) {
        setSelectedProvinceId(province.id);
        setView("world");
        onChange((currentGame) =>
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
        onChange((currentGame) =>
          appendLog(
            updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target),
            `${doneTravel.adjusted ? "目标落在险阻处，已改抵附近可走格。" : ""}你抵达${targetLocation.name}周边，已展开地点信息。`,
          ),
        );
        return;
      }
    }

    onChange((currentGame) =>
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
          onToggleDebug={toggleDebug}
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
              <RegionImageMapView
                mapData={regionMapData}
                game={game}
                travel={travel}
                debugOpen={debugOpen}
                debugResult={debugResult}
                config={regionMap}
                regionName={region.name}
                currentLocationId={location.id}
                selectedMarkerId={selectedRegionMarkerId}
                locations={region.locations}
                onToggleDebug={toggleDebug}
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

          {locationSceneMapImage && location.sceneMapHotspots ? (
            <LocationSceneImageMap
              currentScene={scene}
              game={game}
              hotspots={location.sceneMapHotspots}
              imageSrc={locationSceneMapImage}
              location={location}
              onChange={onChange}
              onSceneHotspotSelect={openSceneHotspot}
              onSelectScene={setScene}
            />
          ) : (
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
                <SceneView
                  name={scene.name}
                  type={scene.type}
                  description={scene.description}
                  imageSrc={sceneImage}
                  hotspots={scene.hotspots}
                  feedback={game.world.sceneMessage}
                  onHotspotSelect={openSceneHotspot}
                  actions={<SceneActionButtons actions={scene.actions} game={game} onChange={onChange} />}
                />
              </div>
            </article>
          )}

          {!(locationSceneMapImage && location.sceneMapHotspots) && scene.actions.some((action) => action.kind === "shop") ? (
            <Shop game={game} onChange={onChange} />
          ) : null}
          {!(locationSceneMapImage && location.sceneMapHotspots) && scene.actions.some((action) => action.kind === "taskBoard") ? (
            <TaskBoard game={game} onChange={onChange} />
          ) : null}
          <NpcDialogueSheet
            open={Boolean(activeSceneHotspot)}
            hotspot={activeSceneHotspot}
            motionEnabled={settings.motion}
            onOpenChange={(open) => {
              if (!open) {
                setActiveSceneHotspotId(null);
              }
            }}
          />
        </>
      )}
    </section>
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
  onSceneHotspotSelect: (hotspot: { id: string; label?: string; text?: string }) => void;
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
  const currentSceneImage = getSceneImage(currentScene.imageKey);

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
        game={game}
        imageSrc={currentSceneImage}
        location={location}
        onBack={() => setDetailMapOpen(false)}
        onChange={onChange}
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
          <img src={imageSrc} alt={`${location.name}场景图`} draggable={false} loading="lazy" />
          {sceneGridOpen ? <LocationSceneGridOverlay /> : null}
          {hotspots.map((hotspot) => (
            <button
              aria-label={`前往${hotspot.label}`}
              className={`map-zone-label location-scene-zone-label${hotspot.sceneId === currentScene.id ? " active" : ""}`}
              key={hotspot.id}
              onClick={(event) => {
                event.stopPropagation();
                const nextScene = location.scenes.find((item) => item.id === hotspot.sceneId);
                const nextSceneImage = getSceneImage(nextScene?.imageKey);
                onSelectScene(hotspot.sceneId);
                setDetailMapOpen(Boolean(nextSceneImage));
                setDrawerOpen(!nextSceneImage);
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
            {hasShop ? <Shop game={game} onChange={onChange} /> : null}
            {hasTaskBoard ? <TaskBoard game={game} onChange={onChange} /> : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function SceneDetailImageMap({
  game,
  imageSrc,
  location,
  onBack,
  onChange,
  onSceneHotspotSelect,
  scene,
}: {
  game: GameState;
  imageSrc: string;
  location: LocationNode;
  onBack: () => void;
  onChange: ExploreChange;
  onSceneHotspotSelect: (hotspot: { id: string; label?: string; text?: string }) => void;
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
  const hasShop = scene.actions.some((action) => action.kind === "shop");
  const hasTaskBoard = scene.actions.some((action) => action.kind === "taskBoard");

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
          <img src={imageSrc} alt={`${scene.name}地图`} draggable={false} loading="lazy" />
          {scene.hotspots?.map((hotspot) => (
            <SceneHotspot key={hotspot.id} hotspot={hotspot} onSelect={onSceneHotspotSelect} />
          ))}
        </div>

        <section className="world-info-drawer location-scene-drawer scene-detail-map-drawer" onPointerDown={(event) => event.stopPropagation()}>
          <div className="section-heading">
            <h2>
              <GameIcon name={getSceneIconName(scene.type)} size={18} />
              {scene.name}
            </h2>
            <span>{scene.type}</span>
          </div>
          <p>{scene.description}</p>
          {game.world.sceneMessage ? <p className="scene-message">{game.world.sceneMessage}</p> : null}
          <SceneActionButtons actions={scene.actions} game={game} onChange={onChange} />
          {hasShop ? <Shop game={game} onChange={onChange} /> : null}
          {hasTaskBoard ? <TaskBoard game={game} onChange={onChange} /> : null}
        </section>
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

function LocationSceneGridOverlay() {
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
          className="location-scene-grid-cell"
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

function SceneActionButtons({ actions, game, onChange }: { actions: SceneAction[]; game: GameState; onChange: ExploreChange }) {
  return (
    <div className="action-grid">
      {actions.map((action) => (
        <button key={action.id} onClick={() => onChange(handleAction(game, action))}>
          <GameIcon name={getActionIconName(action.kind)} size={16} />
          {action.label}
        </button>
      ))}
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
  travel: ActiveTravel | null;
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
  const viewport = useMapUiStore((state) => state.viewportByMapId[mapData.mapId] ?? defaultMapViewport);
  const setMapViewport = useMapUiStore((state) => state.setMapViewport);
  const resetMapViewport = useMapUiStore((state) => state.resetMapViewport);
  const [dragStart, setDragStart] = useState<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const [didDrag, setDidDrag] = useState(false);
  const scale = viewport.scale;
  const offset = viewport.offset;
  const currentCoord = getNavigationCoord(game, mapData.mapId);
  const targetCoord = travel?.mapId === mapData.mapId ? travel.target : null;
  const visiblePath = travel?.mapId === mapData.mapId ? [currentCoord, ...travel.path] : [];
  const zones = useMemo(() => getGridDestinationZones(mapData.mapId), [mapData.mapId]);
  const hitZone = (targetCoord ? findGridDestinationZone(mapData.mapId, targetCoord) : null) ?? findGridDestinationZone(mapData.mapId, currentCoord);
  const hitZoneLabel = hitZone ? getDestinationZoneLabel(hitZone, game.world.regionId) : null;

  function clampScale(nextScale: number) {
    return Math.min(4, Math.max(1, Number(nextScale.toFixed(2))));
  }

  function zoom(delta: number) {
    setMapViewport(mapData.mapId, { scale: clampScale(scale + delta) });
  }

  function resetMap() {
    resetMapViewport(mapData.mapId);
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
          travel?.mapId === mapData.mapId && travel.intent.kind === "province"
            ? `正在前往：${travel.intent.province.name}`
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
          setMapViewport(mapData.mapId, { offset: { x: dragStart.originX + deltaX, y: dragStart.originY + deltaY } });
        }}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setDragStart(null);
          setDidDrag(false);
        }}
      >
        <div
          className="world-map-canvas"
          style={{
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
          }}
        >
          <img src={mapImages.world} alt="修仙大世界地图" draggable={false} loading="lazy" />
          {debugOpen ? <GridDebugOverlay mapData={mapData} current={currentCoord} target={targetCoord} path={visiblePath} zones={zones} hitZone={hitZone} /> : null}
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

function RegionImageMapView({
  mapData,
  game,
  travel,
  debugOpen,
  debugResult,
  config,
  regionName,
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
  travel: ActiveTravel | null;
  debugOpen: boolean;
  debugResult: string | null;
  config: RegionMapConfig;
  regionName: string;
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
  const viewport = useMapUiStore((state) => state.viewportByMapId[mapData.mapId] ?? defaultMapViewport);
  const setMapViewport = useMapUiStore((state) => state.setMapViewport);
  const resetMapViewport = useMapUiStore((state) => state.resetMapViewport);
  const [dragStart, setDragStart] = useState<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const [didDrag, setDidDrag] = useState(false);
  const scale = viewport.scale;
  const offset = viewport.offset;
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
    setMapViewport(mapData.mapId, { scale: clampScale(scale + delta) });
  }

  function resetMap() {
    resetMapViewport(mapData.mapId);
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
    <div className="region-image-map">
      <MapHeader
        title="区域地图"
        subtitle={
          travelTargetLocation
            ? `正在前往：${travelTargetLocation.name}`
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
          setMapViewport(mapData.mapId, { offset: { x: dragStart.originX + deltaX, y: dragStart.originY + deltaY } });
        }}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setDragStart(null);
          setDidDrag(false);
        }}
      >
        <div
          className="world-map-canvas region-map-canvas"
          style={{
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
          }}
        >
          <img src={regionMapImages[config.imageKey]} alt={`${regionName}区域地图`} draggable={false} loading="lazy" />
          {debugOpen ? <GridDebugOverlay mapData={mapData} current={currentCoord} target={targetCoord} path={visiblePath} zones={zones} hitZone={hitZone} /> : null}
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
                style={getGridAnchorStyle(mapData, zone.anchor, 1 / scale, marker.labelOffsetX, marker.labelOffsetY)}
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
        <button className={debugOpen ? "active" : ""} onClick={onToggleDebug}>
          网格
        </button>
        <button onClick={onRunSelfTest}>自检</button>
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

function getGridAnchorStyle(mapData: GridMapData, coord: GridCoord, markerScale: number, offsetX = 0, offsetY = 0): CSSProperties {
  return {
    left: `${((coord.x + 0.5) / mapData.width) * 100}%`,
    top: `${((coord.y + 0.5) / mapData.height) * 100}%`,
    "--marker-scale": `${markerScale}`,
    "--label-offset-x": `${offsetX}px`,
    "--label-offset-y": `${offsetY}px`,
  } as CSSProperties;
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
    <div className="grid-debug-overlay" aria-hidden="true">
      {mapData.cells.map((cell) => {
        const key = gridCoordKey(cell);
        return (
          <span
            className={`grid-debug-cell ${cell.walkable ? "walkable" : "blocked"} ${zoneKeys.has(key) ? "zone" : ""} ${
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

function getRegionIdFromGridMapId(mapId: string): string | null {
  return mapId.startsWith("region:") ? mapId.slice("region:".length) : null;
}

function isLocationTravelIntent(intent: TravelIntent): intent is LocationTravelIntent {
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

  return {
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

function getTravelStartMessage(intent: TravelIntent, target: GridCoord, adjusted: boolean): string {
  const suffix = adjusted ? "目标不可走，已改往附近最近可走格。" : `目标格 ${gridCoordKey(target)}。`;
  if (intent.kind === "province") {
    return `你向${intent.province.name}入口行去，${suffix}`;
  }
  if (intent.kind === "location" || intent.kind === "locationPreview") {
    return `你向${getLocation(intent.regionId, intent.locationId).name}行去，${suffix}`;
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
    return beginCombat(game, action.targetId);
  }
  if (action.kind === "gather") {
    if (action.rewards) {
      return appendLog(addRewards(game, action.rewards), action.text ?? "你细心采集，收起此地灵物。");
    }
    return grantGatherReward(game);
  }
  if (action.kind === "recruitPet") {
    return recruitPet(game);
  }
  if (action.kind === "recruitCompanion") {
    return recruitCompanion(game);
  }
  if (action.kind === "treasure") {
    if (action.rewards) {
      return appendLog(addRewards(game, action.rewards), action.text ?? "你搜寻此地，得到一份机缘。");
    }
    return grantTreasure(game);
  }
  return game;
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
