import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import {
  WORLD_GRID_MAP_ID,
  getDefaultGridCoord,
  getGridMapData,
  getLocalGridMapId,
  getLocalSceneGridCoord,
  getLocationIdFromLocalGridMapId,
  getWorldPoiGridCoord,
} from "../data/gridMaps";
import { findGridDestinationZone, getGridDestinationZone } from "../data/gridMapZones";
import { COMBAT_ACTION_HOURS, GATHER_ACTION_HOURS, TREASURE_ACTION_HOURS } from "../data/time";
import { formatItemName, getItem, itemGradeLabels, itemTierLabels, shouldEmphasizeItemGrade } from "../data/items";
import { getEquipmentWorkshop, getEquipmentWorkshopByNpcId, getEquipmentWorkshopBySceneId, type EquipmentWorkshopConfig } from "../data/equipmentWorkshops";
import {
  formatNpcLocation,
  formatNpcRealm,
  getNpc,
  getNpcRelations,
  getNpcRosterGroups,
  getNpcsForLocation,
  type NpcActionConfig,
  type NpcConfig,
} from "../data/npcs";
import {
  getLocation,
  getLocationEntryScene,
  getScene,
  getShopConfig,
  tasks,
  type LocationNode,
  type LocationSceneBlockedRect,
  type LocationSceneHotspot,
  type SceneAction,
  type SceneNode,
  type ShopCategoryKey,
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
  worldPositionToGridCoord,
} from "../game/gridNavigation";
import { addItems, addRewards, appendLog, joinSect, recruitCompanion, recruitPet, removeItems } from "../game/state";
import { canAffordCost } from "../game/state";
import { equipmentSlots, getEquippedEquipmentInstance } from "../game/equipment";
import {
  craftWorkshopEquipment,
  formatWorkshopCost,
  formatWorkshopItemName,
  getEffectiveReforgeLockLimit,
  getReforgeCost,
  isEquipmentRecipeLearned,
  learnEquipmentCraftRecipe,
  reforgeWorkshopEquipment,
} from "../game/equipmentWorkshop";
import { buyShopItem, getShopDisplayItems, getShopRefreshInfo, type ShopDisplayItem } from "../game/shop";
import { getActiveMountLabel, getMountedGridMoveHours } from "../game/mounts";
import { advanceTime } from "../game/time";
import type { Cost, EquipmentInstance, EquipmentSlotId, GameState, GridCell, GridCoord, GridDestinationZone, GridMapData, ItemConfig, QuestState } from "../types";
import { useActiveGame, useSettings, useUpdateGame } from "../stores/gameStore";
import { defaultMapViewport, useMapUiStore, type ActiveTravel, type MapViewportState, type TravelIntent } from "../stores/mapUiStore";
import { GameIcon, getLocationIconName, type GameIconName } from "./GameIcon";
import { NpcDialogueSheet, type SceneHotspotDialogueAction, type SceneHotspotModel } from "./scene";
import { AffixRow, BottomSheet, GameDialog, GradeBadge, ItemSlot } from "./ui";

const GRID_MOVEMENT_STEP_MS = 180;
const LOCATION_SCENE_GRID_WIDTH = 42;
const LOCATION_SCENE_GRID_HEIGHT = 23;
const LOCATION_SCENE_ASPECT_RATIO = LOCATION_SCENE_GRID_WIDTH / LOCATION_SCENE_GRID_HEIGHT;
const SCENE_DETAIL_MAP_ASPECT_RATIO = 3 / 2;
const GRID_MAP_MAX_SCALE = 12;
const GRID_MAP_VISIBLE_PADDING = 4;
const GRID_MAP_EDGE_PADDING = 28;
const GRID_MAP_WHEEL_ZOOM_FACTOR = 1.18;
const SHOP_MOBILE_PAGE_SIZE = 8;
const SHOP_WIDE_PAGE_SIZE = 9;
const SHOP_WIDE_MEDIA_QUERY = "(min-width: 640px)";
const shopCategoryTabs: Array<{ key: ShopCategoryKey; label: string; iconName: GameIconName }> = [
  { key: "all", label: "全部", iconName: "item" },
  { key: "pill", label: "丹药", iconName: "item-pill" },
  { key: "artifact", label: "法器", iconName: "equipment-artifact" },
  { key: "material", label: "材料", iconName: "item-material" },
  { key: "misc", label: "杂货", iconName: "module-inventory" },
];
const shopCategoryLabels: Record<ShopCategoryKey, string> = {
  all: "全部",
  pill: "丹药",
  artifact: "法器",
  material: "材料",
  misc: "杂货",
};
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
  const travel = useMapUiStore((state) => state.travel);
  const setView = useMapUiStore((state) => state.setView);
  const setSelectedWorldPoiId = useMapUiStore((state) => state.setSelectedWorldPoiId);
  const setActiveSceneHotspotId = useMapUiStore((state) => state.setActiveSceneHotspotId);
  const setTravel = useMapUiStore((state) => state.setTravel);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [npcRosterOpen, setNpcRosterOpen] = useState(false);
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [taskBoardOpen, setTaskBoardOpen] = useState(false);
  const [activeSceneDetailId, setActiveSceneDetailId] = useState<string | null>(null);
  const [activeCraftWorkshopId, setActiveCraftWorkshopId] = useState<string | null>(null);
  const [activeReforgeWorkshopId, setActiveReforgeWorkshopId] = useState<string | null>(null);

  if (!activeGame) {
    return null;
  }

  const game = activeGame;
  const location = getLocation(game.world.regionId, game.world.locationId);
  const scene = getScene(game.world.regionId, game.world.locationId, game.world.sceneId);
  const activeSceneHotspot = scene.hotspots?.find((hotspot) => hotspot.id === activeSceneHotspotId) ?? null;
  const selectedWorldPoi = selectedWorldPoiId ? getWorldPoi(selectedWorldPoiId) ?? null : null;
  const currentWorldPoi = getWorldPoiByLocationId(game.world.locationId) ?? null;
  const activeNpc = getNpc(activeNpcId);
  const activeSceneDetail = activeSceneDetailId ? location.scenes.find((item) => item.id === activeSceneDetailId) ?? null : null;
  const activeSceneNpcs = activeSceneDetail ? getSceneNpcs(location, activeSceneDetail, game.world.npcs) : [];

  useEffect(() => {
    setActiveSceneHotspotId(null);
  }, [game.world.sceneId]);

  useEffect(() => {
    if (activeNpcId && !getNpc(activeNpcId)) {
      setActiveNpcId(null);
    }
  }, [activeNpcId]);

  useEffect(() => {
    if (activeSceneDetailId && !location.scenes.some((item) => item.id === activeSceneDetailId)) {
      setActiveSceneDetailId(null);
    }
  }, [activeSceneDetailId, location.id]);

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
        const stepHours = mapData ? getMountedGridMoveHours(currentGame, mapData, stepCell) : 0;
        return advanceTime(movedGame, { hours: stepHours });
      });
      setTravel({ ...travel, path: remainingPath });
    }, GRID_MOVEMENT_STEP_MS);

    return () => window.clearTimeout(timer);
  }, [travel, onChange]);

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
    onChange((currentGame) => {
      const mountLabel = getActiveMountLabel(currentGame);
      const message = `${getTravelStartMessage(intent, target, !isSameGridCoord(rawTarget, target))}${mountLabel ? ` ${mountLabel}随行，脚程更快。` : ""}`;
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

  function travelToLocalScene(sceneId: string, openOnArrival = false) {
    setActiveNpcId(null);
    setActiveSceneHotspotId(null);
    setTaskBoardOpen(false);
    setActiveShopId(null);
    setActiveCraftWorkshopId(null);
    setActiveReforgeWorkshopId(null);

    if (game.world.sceneId === sceneId) {
      if (openOnArrival) {
        openSceneInteraction(sceneId);
        return;
      }
      setActiveSceneDetailId(null);
      return;
    }

    const localMapId = getLocalGridMapId(game.world.locationId);
    const map = localMapId ? getGridMapData(localMapId) : undefined;
    const zone = localMapId ? getGridDestinationZone(localMapId, "scene", sceneId) : undefined;
    const zoneTarget = map && zone ? getNearestWalkableZoneCoord(map, zone, getNavigationCoord(game, map.mapId)) : null;
    const sceneCoord = getLocalSceneGridCoord(game.world.locationId, sceneId);
    const target = zoneTarget ?? sceneCoord;
    if (localMapId && target) {
      startTravel(localMapId, target, { kind: "localScene", locationId: game.world.locationId, sceneId, openOnArrival });
      return;
    }
    setScene(sceneId);
    if (openOnArrival) {
      openSceneInteraction(sceneId);
    }
  }

  function travelToNpc(npcId: string) {
    const npc = getNpc(npcId);
    if (!npc) {
      return;
    }
    const sceneId = getNpcSceneId(npc, location);
    if (!sceneId) {
      setNpcRosterOpen(false);
      onChange((currentGame) => appendLog(currentGame, `${npc.name}行踪未定，暂时找不到落脚处。`));
      return;
    }
    setNpcRosterOpen(false);
    setActiveNpcId(null);
    setActiveSceneHotspotId(null);
    setActiveSceneDetailId(null);
    setTaskBoardOpen(false);
    setActiveShopId(null);
    setActiveCraftWorkshopId(null);
    setActiveReforgeWorkshopId(null);
    if (game.world.sceneId === sceneId) {
      setActiveNpcId(npc.id);
      onChange((currentGame) => appendLog(currentGame, `你来到${getScene(currentGame.world.regionId, currentGame.world.locationId, sceneId).name}，见到了${npc.name}。`));
      return;
    }
    const localMapId = getLocalGridMapId(game.world.locationId);
    const map = localMapId ? getGridMapData(localMapId) : undefined;
    const zone = localMapId ? getGridDestinationZone(localMapId, "scene", sceneId) : undefined;
    const zoneTarget = map && zone ? getNearestWalkableZoneCoord(map, zone, getNavigationCoord(game, map.mapId)) : null;
    const sceneCoord = getLocalSceneGridCoord(game.world.locationId, sceneId);
    const target = zoneTarget ?? sceneCoord;
    if (localMapId && target) {
      startTravel(localMapId, target, { kind: "localNpc", locationId: game.world.locationId, sceneId, npcId: npc.id });
      return;
    }
    setScene(sceneId);
    setActiveNpcId(npc.id);
  }

  function setScene(sceneId: string) {
    setActiveSceneHotspotId(null);
    setActiveSceneDetailId(null);
    setActiveCraftWorkshopId(null);
    setActiveReforgeWorkshopId(null);
    onChange({
      ...game,
      world: {
        ...game.world,
        sceneId,
        sceneMessage: `来到 ${getScene(game.world.regionId, game.world.locationId, sceneId).name}。`,
      },
    });
  }

  function handleSceneHotspotAction(action: SceneHotspotDialogueAction, hotspot: SceneHotspotModel) {
    if (action.kind === "shop") {
      const shopId = action.shopId ?? game.world.sceneId;
      setActiveSceneHotspotId(null);
      setActiveShopId(shopId);
      setActiveCraftWorkshopId(null);
      setActiveReforgeWorkshopId(null);
      onChange((currentGame) => appendLog(currentGame, `${hotspot.label}为你打开货柜。`));
      return;
    }
    const fallback = "对方似乎还在斟酌。";
    onChange((currentGame) => appendLog(currentGame, `${hotspot.label} · ${action.label}：${action.text ?? fallback}`));
  }

  function handleNpcAction(npc: NpcConfig, action: NpcActionConfig) {
    if (action.kind === "shop") {
      setActiveNpcId(null);
      setActiveShopId(action.shopId ?? npc.shopId ?? game.world.sceneId);
      setActiveCraftWorkshopId(null);
      setActiveReforgeWorkshopId(null);
      onChange((currentGame) => appendLog(currentGame, `${npc.name}为你打开货柜。`));
      return;
    }
    if (action.kind === "quest") {
      setActiveNpcId(null);
      setTaskBoardOpen(true);
      setActiveCraftWorkshopId(null);
      setActiveReforgeWorkshopId(null);
      onChange((currentGame) => appendLog(currentGame, action.text ?? `${npc.name}带你查看可接的差事。`));
      return;
    }
    if (action.kind === "craftEquipment" || action.kind === "reforgeEquipment") {
      const workshop = getEquipmentWorkshop(action.workshopId) ?? getEquipmentWorkshopByNpcId(npc.id);
      if (!workshop) {
        onChange((currentGame) => appendLog(currentGame, `${npc.name}暂时没有可用的炼器台。`));
        return;
      }
      setActiveNpcId(null);
      setActiveShopId(null);
      setTaskBoardOpen(false);
      setActiveSceneDetailId(null);
      if (action.kind === "craftEquipment") {
        setActiveReforgeWorkshopId(null);
        setActiveCraftWorkshopId(workshop.id);
      } else {
        setActiveCraftWorkshopId(null);
        setActiveReforgeWorkshopId(workshop.id);
      }
      onChange((currentGame) => appendLog(currentGame, action.text ?? `${npc.name}领你到${workshop.name}的炉前。`));
      return;
    }
    const fallback = "对方暂时没有更多安排。";
    onChange((currentGame) => appendLog(currentGame, `${npc.name} · ${action.label}：${action.text ?? fallback}`));
  }

  function openSceneInteraction(sceneId: string) {
    setNpcRosterOpen(false);
    setActiveNpcId(null);
    setActiveSceneHotspotId(null);
    setActiveShopId(null);
    setTaskBoardOpen(false);
    setActiveCraftWorkshopId(null);
    setActiveReforgeWorkshopId(null);
    setActiveSceneDetailId(sceneId);
  }

  function openSceneHotspot(hotspot: SceneHotspotModel) {
    setActiveSceneDetailId(null);
    setActiveNpcId(null);
    setTaskBoardOpen(false);
    setActiveShopId(null);
    setActiveCraftWorkshopId(null);
    setActiveReforgeWorkshopId(null);
    setActiveSceneHotspotId(hotspot.id);
  }

  function handleSceneDetailAction(action: SceneAction, sceneId: string) {
    if (action.kind === "shop") {
      setActiveSceneDetailId(null);
      setTaskBoardOpen(false);
      setActiveCraftWorkshopId(null);
      setActiveReforgeWorkshopId(null);
      setActiveShopId(action.targetId ?? sceneId);
      return;
    }
    if (action.kind === "taskBoard") {
      setActiveSceneDetailId(null);
      setActiveShopId(null);
      setActiveCraftWorkshopId(null);
      setActiveReforgeWorkshopId(null);
      setTaskBoardOpen(true);
      return;
    }
    if (action.kind !== "dialogue") {
      setActiveSceneDetailId(null);
    }
    onChange((currentGame) => handleAction(currentGame, action));
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
      setActiveNpcId(null);
      setActiveCraftWorkshopId(null);
      setActiveReforgeWorkshopId(null);
      if (doneTravel.intent.openOnArrival) {
        openSceneInteraction(sceneId);
      } else {
        setActiveSceneDetailId(null);
      }
      onChange((currentGame) =>
        applyArrivalEvent(
          applySceneChange(updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target), sceneId),
          doneTravel,
        ),
      );
      return;
    }

    if (doneTravel.intent.kind === "localNpc") {
      const sceneId = doneTravel.intent.sceneId;
      const npc = getNpc(doneTravel.intent.npcId);
      setView("location");
      setActiveSceneHotspotId(null);
      setActiveSceneDetailId(null);
      setTaskBoardOpen(false);
      setActiveShopId(null);
      setActiveCraftWorkshopId(null);
      setActiveReforgeWorkshopId(null);
      setActiveNpcId(doneTravel.intent.npcId);
      onChange((currentGame) => {
        const arrivedGame = applySceneChange(updateNavigationPosition(currentGame, doneTravel.mapId, doneTravel.target), sceneId);
        const sceneName = getScene(arrivedGame.world.regionId, arrivedGame.world.locationId, sceneId).name;
        return applyArrivalEvent(appendLog(arrivedGame, `你来到${sceneName}，见到了${npc?.name ?? "目标人物"}。`), doneTravel);
      });
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
  const localNpcCount = getNpcsForLocation(location.id, game.world.npcs).length;
  const localPeopleLabel = getLocalPeopleLabel(location.type);

  return (
    <section className="module-panel explore-panel">
      {view === "world" && worldMapData ? (
        <>
          <ExploreMapHeader iconName="module-explore" subtitle={getWorldMapHeaderSubtitle(travel, currentWorldPoi)} title="问仙大世界" />
          <GridMapPanel
            mode="world"
            mapData={worldMapData}
            game={game}
            travel={travel}
            selectedWorldPoi={selectedWorldPoi}
            onMapTarget={(coord) => {
              setSelectedWorldPoiId(null);
              startTravel(WORLD_GRID_MAP_ID, coord, { kind: "free" });
            }}
            onSelectWorldPoi={travelToWorldPoi}
            onCloseWorldPoi={() => setSelectedWorldPoiId(null)}
            onEnterWorldPoi={enterWorldPoi}
          />
        </>
      ) : (
        <>
          <ExploreMapHeader
            action={
              <button className="town-npc-button" onClick={() => setNpcRosterOpen(true)} type="button">
                <GameIcon name="team" size={16} />
                {localPeopleLabel}
                <small>{localNpcCount}</small>
              </button>
            }
            backLabel="返回大世界"
            iconName={getLocationIconName(location.type)}
            onBack={() => {
              setSelectedWorldPoiId(currentWorldPoi?.id ?? null);
              setView("world");
            }}
            subtitle={getLocalMapHeaderSubtitle(travel, localMapId, location, scene)}
            title={location.name}
          />

          {localMapData ? (
            <GridMapPanel
              mode="local"
              mapData={localMapData}
              game={game}
              travel={travel}
              location={location}
              currentScene={scene}
              onMapTarget={(coord) => {
                startTravel(localMapData.mapId, coord, { kind: "free" });
              }}
              onSelectNpc={travelToNpc}
              onSelectScene={(sceneId) => travelToLocalScene(sceneId, true)}
            />
          ) : null}

          <NpcRosterDialog
            game={game}
            location={location}
            motionEnabled={settings.motion}
            onNpcSelect={travelToNpc}
            onOpenChange={setNpcRosterOpen}
            open={npcRosterOpen}
          />
          <NpcProfileDialog
            game={game}
            motionEnabled={settings.motion}
            npc={activeNpc}
            onAction={handleNpcAction}
            onOpenChange={(open) => {
              if (!open) {
                setActiveNpcId(null);
              }
            }}
            open={Boolean(activeNpc)}
          />
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
          <SceneDetailDialog
            game={game}
            motionEnabled={settings.motion}
            onAction={handleSceneDetailAction}
            onHotspotSelect={openSceneHotspot}
            onNpcSelect={travelToNpc}
            onOpenChange={(open) => {
              if (!open) {
                setActiveSceneDetailId(null);
              }
            }}
            open={Boolean(activeSceneDetail)}
            scene={activeSceneDetail}
            sceneNpcs={activeSceneNpcs}
          />
          <TaskBoardDialog
            game={game}
            motionEnabled={settings.motion}
            onChange={onChange}
            onOpenChange={setTaskBoardOpen}
            open={taskBoardOpen}
          />
          <ShopCatalogDialog
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
          <EquipmentWorkshopDialog
            game={game}
            motionEnabled={settings.motion}
            onChange={onChange}
            onOpenChange={(open) => {
              if (!open) {
                setActiveCraftWorkshopId(null);
              }
            }}
            open={Boolean(activeCraftWorkshopId)}
            workshopId={activeCraftWorkshopId}
          />
          <EquipmentReforgeDialog
            game={game}
            motionEnabled={settings.motion}
            onChange={onChange}
            onOpenChange={(open) => {
              if (!open) {
                setActiveReforgeWorkshopId(null);
              }
            }}
            open={Boolean(activeReforgeWorkshopId)}
            workshopId={activeReforgeWorkshopId}
          />
        </>
      )}
      <MapEventSheet game={game} motionEnabled={settings.motion} onChange={onChange} />
    </section>
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
  onOpenShop,
  onOpenTaskBoard,
  onSceneHotspotSelect,
  onSelectScene,
}: {
  currentScene: SceneNode;
  game: GameState;
  hotspots: LocationSceneHotspot[];
  imageSrc: string;
  location: LocationNode;
  onChange: ExploreChange;
  onOpenShop: (shopId: string) => void;
  onOpenTaskBoard: () => void;
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
            <SceneActionButtons
              actions={currentScene.actions}
              contextShopId={currentScene.id}
              onAction={(action) => {
                if (action.kind === "shop") {
                  onOpenShop(action.targetId ?? currentScene.id);
                  return;
                }
                if (action.kind === "taskBoard") {
                  onOpenTaskBoard();
                  return;
                }
                onChange(handleAction(game, action));
              }}
            />
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

function SceneActionButtons({
  actions,
  contextShopId,
  onAction,
}: {
  actions: SceneAction[];
  contextShopId?: string;
  onAction: (action: SceneAction, contextShopId?: string) => void;
}) {
  return (
    <div className="action-grid">
      {actions.map((action) => (
        <button className={`scene-action-card action-${action.kind}`} key={action.id} onClick={() => onAction(action, contextShopId)}>
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
  selectedWorldPoi,
  location,
  currentScene,
  onMapTarget,
  onSelectWorldPoi,
  onCloseWorldPoi,
  onEnterWorldPoi,
  onSelectNpc,
  onSelectScene,
}: {
  mode: "world" | "local";
  mapData: GridMapData;
  game: GameState;
  travel: ActiveTravel | null;
  selectedWorldPoi?: WorldPoiConfig | null;
  location?: LocationNode;
  currentScene?: SceneNode;
  onMapTarget: (coord: GridCoord) => void;
  onSelectWorldPoi?: (poi: WorldPoiConfig) => void;
  onCloseWorldPoi?: () => void;
  onEnterWorldPoi?: (poi: WorldPoiConfig) => void;
  onSelectNpc?: (npcId: string) => void;
  onSelectScene?: (sceneId: string) => void;
}) {
  const storedViewport = useMapUiStore((state) => state.viewportByMapId[mapData.mapId]);
  const setMapViewport = useMapUiStore((state) => state.setMapViewport);
  const [dragStart, setDragStart] = useState<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const [didDrag, setDidDrag] = useState(false);
  const [isMapInteracting, setIsMapInteracting] = useState(false);
  const [viewportSize, setViewportSize] = useState<GridViewportSize>({ width: 0, height: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ distance: number; centerX: number; centerY: number; viewport: MapViewportState } | null>(null);
  const viewportSizeRef = useRef<GridViewportSize>({ width: 0, height: 0 });
  const pendingViewportFrameRef = useRef<number | null>(null);
  const pendingViewportRef = useRef<MapViewportState | null>(null);
  const wheelIdleTimerRef = useRef<number | null>(null);
  const viewport = normalizeGridViewport(mapData, viewportSize, storedViewport ?? getDefaultViewportForMap(mapData));
  const scale = viewport.scale;
  const offset = viewport.offset;
  const currentCoord = getNavigationCoord(game, mapData.mapId);
  const visiblePath = travel?.mapId === mapData.mapId ? [currentCoord, ...travel.path] : [];
  const visibleRect = useMemo(() => getVisibleGridRectFromViewport(mapData, viewportSize, scale, offset), [mapData, viewportSize, scale, offset.x, offset.y]);
  const zoomTier = getZoomTier(scale);
  const markers = mode === "world" ? getVisibleWorldPoiMarkers(scale) : getLocalMapMarkers(location, currentScene, game.world.npcs);

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

  function getPinchMetrics(element: HTMLDivElement) {
    const points = Array.from(activePointersRef.current.values()).slice(0, 2);
    if (points.length < 2) {
      return null;
    }
    const [first, second] = points;
    const viewportRect = element.getBoundingClientRect();
    return {
      centerX: (first.x + second.x) / 2 - viewportRect.left - viewportRect.width / 2,
      centerY: (first.y + second.y) / 2 - viewportRect.top - viewportRect.height / 2,
      distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
    };
  }

  function startPinchGesture(element: HTMLDivElement) {
    const metrics = getPinchMetrics(element);
    if (!metrics) {
      return;
    }
    pinchStartRef.current = {
      ...metrics,
      viewport: pendingViewportRef.current ?? viewport,
    };
    setDragStart(null);
    setDidDrag(true);
    setIsMapInteracting(true);
  }

  function updatePinchGesture(element: HTMLDivElement) {
    if (activePointersRef.current.size < 2) {
      return false;
    }
    if (!pinchStartRef.current) {
      startPinchGesture(element);
    }
    const start = pinchStartRef.current;
    const metrics = getPinchMetrics(element);
    if (!start || !metrics) {
      return false;
    }
    const nextScale = clampScale(start.viewport.scale * (metrics.distance / start.distance));
    const contentX = (start.centerX - start.viewport.offset.x) / start.viewport.scale;
    const contentY = (start.centerY - start.viewport.offset.y) / start.viewport.scale;
    scheduleViewport({
      scale: nextScale,
      offset: {
        x: metrics.centerX - contentX * nextScale,
        y: metrics.centerY - contentY * nextScale,
      },
    });
    setDidDrag(true);
    return true;
  }

  function stopMapGesture(event: PointerEvent<HTMLElement>) {
    event.stopPropagation();
    setDragStart(null);
    activePointersRef.current.delete(event.pointerId);
    pinchStartRef.current = null;
    setIsMapInteracting(false);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const hadPinch = Boolean(pinchStartRef.current) || activePointersRef.current.size >= 2;
    activePointersRef.current.delete(event.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }

    if (!hadPinch && dragStart && dragStart.pointerId === event.pointerId && !didDrag && !isInteractiveMapTarget(event.target)) {
      const coord = getGridCoordFromPointer(event, mapData);
      if (coord) {
        onMapTarget(coord);
      }
    }

    if (activePointersRef.current.size === 1) {
      const [remainingPointerId, remainingPoint] = Array.from(activePointersRef.current.entries())[0];
      const current = pendingViewportRef.current ?? viewport;
      setDragStart({
        pointerId: remainingPointerId,
        x: remainingPoint.x,
        y: remainingPoint.y,
        originX: current.offset.x,
        originY: current.offset.y,
      });
      setDidDrag(true);
      setIsMapInteracting(true);
      return;
    }

    setDragStart(null);
    setDidDrag(false);
    setIsMapInteracting(false);
  }

  return (
    <div className={`grid-map-panel ${mode === "world" ? "world-grid-map-panel" : "local-grid-map-panel"}`}>
      <div
        ref={viewportRef}
        className={`world-map-viewport grid-map-viewport ${mode === "world" ? "world-grid-map-viewport" : "local-grid-map-viewport"} zoom-${zoomTier} ${
          mode === "world" && selectedWorldPoi ? "has-info-drawer" : ""
        } ${
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
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          setIsMapInteracting(true);
          setDidDrag(false);
          if (activePointersRef.current.size >= 2) {
            startPinchGesture(event.currentTarget);
            return;
          }
          setDragStart({ pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y });
        }}
        onPointerMove={(event) => {
          if (activePointersRef.current.has(event.pointerId)) {
            activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          }
          if (updatePinchGesture(event.currentTarget)) {
            event.preventDefault();
            return;
          }
          if (!dragStart || dragStart.pointerId !== event.pointerId) {
            return;
          }
          event.preventDefault();
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
        onPointerCancel={(event) => {
          activePointersRef.current.delete(event.pointerId);
          if (activePointersRef.current.size < 2) {
            pinchStartRef.current = null;
          }
          setDragStart(null);
          setDidDrag(false);
          setIsMapInteracting(activePointersRef.current.size > 0);
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
          {visiblePath.length > 0 ? <GridRouteOverlay mapData={mapData} path={visiblePath} /> : null}
        </div>

        <div className="grid-map-marker-overlay">
          <GridPlayerMarker style={getGridViewportAnchorStyle(mapData, currentCoord, viewportSize, scale, offset)} />
          {markers.map((marker) => (
            <button
              aria-label={`查看${marker.label}`}
              className={marker.className}
              key={marker.id}
              style={getGridViewportAnchorStyle(mapData, marker.coord, viewportSize, scale, offset, marker.offsetX ?? 0, marker.offsetY ?? 0)}
              onPointerDown={stopMapGesture}
              onPointerMove={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                if (marker.kind === "worldPoi") {
                  onSelectWorldPoi?.(marker.poi);
                  return;
                }
                if (marker.kind === "npc") {
                  onSelectNpc?.(marker.npc.id);
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

        {mode === "world" && selectedWorldPoi ? (
          <WorldPoiDrawer poi={selectedWorldPoi} onClose={onCloseWorldPoi} onEnter={onEnterWorldPoi} />
        ) : null}
      </div>
    </div>
  );
}

function ExploreMapHeader({
  action,
  backLabel,
  iconName,
  onBack,
  subtitle,
  title,
}: {
  action?: ReactNode;
  backLabel?: string;
  iconName: GameIconName;
  onBack?: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <div className={`location-header map-hud-header ${onBack ? "has-back" : ""} ${action ? "has-action" : ""}`.trim()}>
      {onBack ? (
        <button className="ghost-button" onClick={onBack} type="button">
          <GameIcon name="action-back" size={15} />
          {backLabel ?? "返回"}
        </button>
      ) : null}
      <div className="map-hud-main">
        <h2>
          <GameIcon name={iconName} size={18} />
          {title}
        </h2>
        <span>{subtitle}</span>
      </div>
      {action ? <div className="map-hud-action">{action}</div> : null}
    </div>
  );
}

function getWorldMapHeaderSubtitle(travel: ActiveTravel | null, currentWorldPoi: WorldPoiConfig | null): string {
  return getTravelLabel(travel, WORLD_GRID_MAP_ID) ?? (currentWorldPoi ? `已抵达：${currentWorldPoi.name}` : "点击地图探索");
}

function getLocalMapHeaderSubtitle(travel: ActiveTravel | null, mapId: string | null | undefined, location: LocationNode, currentScene: SceneNode): string {
  return (mapId ? getTravelLabel(travel, mapId, location) : null) ?? `当前：${currentScene.name}`;
}

function getLocalPeopleLabel(locationType: LocationNode["type"]): string {
  return locationType === "city" || locationType === "town" ? "城镇人物" : "此地人物";
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
      offsetX?: number;
      offsetY?: number;
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
      offsetX?: number;
      offsetY?: number;
    }
  | {
      kind: "npc";
      id: string;
      label: string;
      coord: GridCoord;
      npc: NpcConfig;
      iconName: GameIconName;
      className: string;
      detail?: string;
      offsetX?: number;
      offsetY?: number;
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
    <div className={`world-region-labels ${scale < 0.8 ? "visible" : ""}`} aria-hidden="true">
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
          <small>{poi.open && poi.locationId ? "进入地点内部地图" : "保留为世界区域标签/后续内容"}</small>
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

const localNpcMarkerOffsets = [
  { x: 0, y: -34 },
  { x: 34, y: -20 },
  { x: -34, y: -20 },
  { x: 34, y: 18 },
  { x: -34, y: 18 },
];

function getLocalMapMarkers(location: LocationNode | undefined, currentScene: SceneNode | undefined, npcWorldState: GameState["world"]["npcs"]): GridMapMarker[] {
  if (!location) {
    return [];
  }
  const markers: GridMapMarker[] = [];
  const npcSceneCounts = new Map<string, number>();

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
      className: `map-zone-label grid-map-marker local-scene-marker ${scene.id === currentScene?.id ? "active" : ""}`,
    });
  });

  getNpcsForLocation(location.id, npcWorldState).forEach((npc) => {
    if (npc.fixed) {
      return;
    }
    const sceneId = getNpcSceneId(npc, location);
    if (!sceneId) {
      return;
    }
    const coord = getLocalSceneGridCoord(location.id, sceneId);
    if (!coord) {
      return;
    }
    const sceneCount = npcSceneCounts.get(sceneId) ?? 0;
    const offset = localNpcMarkerOffsets[sceneCount % localNpcMarkerOffsets.length];
    npcSceneCounts.set(sceneId, sceneCount + 1);
    markers.push({
      kind: "npc",
      id: `npc:${npc.id}`,
      label: npc.name,
      coord,
      npc,
      iconName: "team",
      offsetX: offset.x,
      offsetY: offset.y,
      className: `map-zone-label grid-map-marker local-npc-marker npc-${npc.group}`,
    });
  });
  return markers;
}

function getSceneNpcs(location: LocationNode, scene: SceneNode, npcWorldState: GameState["world"]["npcs"]): NpcConfig[] {
  const workshop = getEquipmentWorkshopBySceneId(scene.id);
  return getNpcsForLocation(location.id, npcWorldState)
    .filter((npc) => getNpcSceneId(npc, location) === scene.id)
    .sort((left, right) => {
      if (left.id === workshop?.managerNpcId) {
        return -1;
      }
      if (right.id === workshop?.managerNpcId) {
        return 1;
      }
      return left.name.localeCompare(right.name, "zh-CN");
    });
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
    return sceneName ? `正在前往：${sceneName}` : "正在内部地图移动";
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
  const entryScene = getLocationEntryScene(nextLocation);

  return {
    ...game,
    world: {
      ...game.world,
      regionId: poi.regionId,
      locationId: nextLocation.id,
      sceneId: entryScene.id,
      lastTownId: nextLocation.type === "city" || nextLocation.type === "town" ? nextLocation.id : game.world.lastTownId,
      sceneMessage: `进入${poi.name}内部地图。`,
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
  const entryScene = getLocationEntryScene(nextLocation);
  return {
    ...game,
    world: {
      ...game.world,
      locationId,
      sceneId: entryScene.id,
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
    return `你在内部地图内移动，${suffix}`;
  }
  if (intent.kind === "localNpc") {
    const npc = getNpc(intent.npcId);
    return `你前往${npc?.name ?? "目标人物"}所在处，${suffix}`;
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

function getSceneInteractionTarget(scene: SceneNode): { kind: "shop"; shopId: string } | { kind: "taskBoard" } | { kind: "detail" } {
  const actionable = scene.actions;
  if (actionable.length > 0 && actionable.every((action) => action.kind === "shop")) {
    return { kind: "shop", shopId: actionable[0].targetId ?? scene.id };
  }
  if (actionable.length > 0 && actionable.every((action) => action.kind === "taskBoard")) {
    return { kind: "taskBoard" };
  }
  return { kind: "detail" };
}

function getNpcSceneId(npc: NpcConfig, location: LocationNode): string | null {
  if (npc.homeSceneId && location.scenes.some((scene) => scene.id === npc.homeSceneId)) {
    return npc.homeSceneId;
  }
  if (npc.shopId && location.scenes.some((scene) => scene.id === npc.shopId)) {
    return npc.shopId;
  }
  if (npc.group === "task") {
    return location.scenes.find((scene) => scene.id === "notice_board")?.id ?? location.scenes.find((scene) => scene.type.includes("任务"))?.id ?? location.scenes[0]?.id ?? null;
  }
  if (npc.group === "roamer") {
    return location.scenes.find((scene) => scene.id === "qingyun_inn")?.id ?? location.scenes.find((scene) => scene.type.includes("NPC"))?.id ?? location.scenes[0]?.id ?? null;
  }
  return location.scenes.find((scene) => scene.type.includes("NPC"))?.id ?? location.scenes[0]?.id ?? null;
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

function SceneDetailDialog({
  game,
  motionEnabled,
  onAction,
  onHotspotSelect,
  onNpcSelect,
  onOpenChange,
  open,
  scene,
  sceneNpcs,
}: {
  game: GameState;
  motionEnabled: boolean;
  onAction: (action: SceneAction, sceneId: string) => void;
  onHotspotSelect: (hotspot: SceneHotspotModel) => void;
  onNpcSelect: (npcId: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  scene: SceneNode | null;
  sceneNpcs: NpcConfig[];
}) {
  if (!scene) {
    return null;
  }
  const workshop = getEquipmentWorkshopBySceneId(scene.id);
  const facilityActions = sceneNpcs.length ? scene.actions.filter((action) => action.kind !== "shop" && action.kind !== "taskBoard") : scene.actions;

  return (
    <GameDialog
      className="scene-detail-dialog"
      motionEnabled={motionEnabled}
      onOpenChange={onOpenChange}
      open={open}
      subtitle={scene.type}
      title={`在${scene.name}`}
    >
      <div className="scene-detail-dialog-body">
        <p>{scene.description}</p>
        {game.world.sceneMessage ? <p className="scene-message">{game.world.sceneMessage}</p> : null}
        {sceneNpcs.length ? (
          <section className="scene-npc-section">
            <div className="scene-dialog-section-title">
              <strong>此地修士</strong>
              <small>{sceneNpcs.length}</small>
            </div>
            <div className="scene-npc-list">
              {sceneNpcs.map((npc) => (
                <button className="scene-npc-card" key={npc.id} onClick={() => onNpcSelect(npc.id)} type="button">
                  <span className="npc-roster-avatar">{npc.name.slice(0, 1)}</span>
                  <span>
                    <strong>{npc.name}</strong>
                    <small>{npc.title}</small>
                  </span>
                  {workshop?.managerNpcId === npc.id ? <em>管事</em> : null}
                </button>
              ))}
            </div>
          </section>
        ) : null}
        {scene.hotspots?.length ? (
          <div className="scene-hotspot-list">
            {scene.hotspots.map((hotspot) => (
              <button className={`scene-hotspot-list-button hotspot-${hotspot.type ?? "action"}`} key={hotspot.id} onClick={() => onHotspotSelect(hotspot)} type="button">
                <span>{hotspot.label}</span>
                {hotspot.title ?? hotspot.text ? <small>{hotspot.title ?? hotspot.text}</small> : null}
              </button>
            ))}
          </div>
        ) : null}
        {facilityActions.length ? (
          <section className="scene-facility-section">
            <div className="scene-dialog-section-title">
              <strong>可用设施</strong>
            </div>
            <SceneActionButtons actions={facilityActions} contextShopId={scene.id} onAction={(action, contextShopId) => onAction(action, contextShopId ?? scene.id)} />
          </section>
        ) : !sceneNpcs.length && !scene.hotspots?.length ? (
          <p className="empty-hint compact">此处暂时没有可执行的行动。</p>
        ) : null}
      </div>
    </GameDialog>
  );
}

function NpcRosterDialog({
  game,
  location,
  motionEnabled,
  onNpcSelect,
  onOpenChange,
  open,
}: {
  game: GameState;
  location: LocationNode;
  motionEnabled: boolean;
  onNpcSelect: (npcId: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const groups = getNpcRosterGroups(location.id, game.world.npcs);
  const total = groups.reduce((count, group) => count + group.npcs.length, 0);
  return (
    <GameDialog
      className="npc-roster-dialog"
      motionEnabled={motionEnabled}
      onOpenChange={onOpenChange}
      open={open}
      subtitle={`${location.name} · ${total} 人`}
      title={getLocalPeopleLabel(location.type)}
    >
      <div className="npc-roster-groups">
        {groups.map((group) => (
          <section className="npc-roster-group" key={group.id}>
            <div className="npc-roster-group-heading">
              <h3>{group.label}</h3>
              <span>{group.npcs.length}</span>
            </div>
            {group.npcs.length ? (
              <div className="npc-roster-list">
                {group.npcs.map((npc) => (
                  <button className="npc-roster-card" key={npc.id} onClick={() => onNpcSelect(npc.id)} type="button">
                    <span className="npc-roster-avatar">{npc.name.slice(0, 1)}</span>
                    <span className="npc-roster-main">
                      <strong>{npc.name}</strong>
                      <small>{npc.title}</small>
                    </span>
                    <span className="npc-roster-meta">
                      <small>{formatNpcRealm(npc, game.world.npcs)}</small>
                      <small>{npc.fixed ? "固定" : formatNpcLocation(npc, game.world.npcs)}</small>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-hint compact">此类人物暂未出现在这里。</p>
            )}
          </section>
        ))}
      </div>
    </GameDialog>
  );
}

function NpcProfileDialog({
  game,
  motionEnabled,
  npc,
  onAction,
  onOpenChange,
  open,
}: {
  game: GameState;
  motionEnabled: boolean;
  npc: NpcConfig | null;
  onAction: (npc: NpcConfig, action: NpcActionConfig) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  if (!npc) {
    return null;
  }
  const relations = getNpcRelations(npc.id);
  return (
    <GameDialog
      className="npc-profile-dialog npc-dialogue-glass"
      motionEnabled={motionEnabled}
      onOpenChange={onOpenChange}
      open={open}
      subtitle={`${npc.title} · ${formatNpcRealm(npc, game.world.npcs)}`}
      title={npc.name}
    >
      <div className="npc-profile">
        <div className="npc-profile-hero">
          <span className="npc-profile-avatar">{npc.name.slice(0, 1)}</span>
          <div>
            <p>{npc.dialogue}</p>
            <div className="npc-profile-tags">
              <span>{npc.force ?? "散修"}</span>
              <span>{formatNpcLocation(npc, game.world.npcs)}</span>
              <span>{npc.fixed ? "常驻" : "游历"}</span>
            </div>
          </div>
        </div>
        {relations.length ? (
          <div className="npc-relation-list">
            {relations.slice(0, 4).map((relation) => {
              const otherNpcId = relation.fromNpcId === npc.id ? relation.toNpcId : relation.fromNpcId;
              const otherNpc = getNpc(otherNpcId);
              return (
                <span key={relation.id}>
                  {relation.label}：{otherNpc?.name ?? "未知"}
                </span>
              );
            })}
          </div>
        ) : null}
        <div className="npc-dialogue-actions" aria-label={`${npc.name}互动`}>
          {npc.actions.map((action) => (
            <button disabled={action.disabled} key={action.id} onClick={() => onAction(npc, action)} type="button">
              <span>{action.label}</span>
              {action.description ? <small>{action.description}</small> : null}
            </button>
          ))}
        </div>
      </div>
    </GameDialog>
  );
}

function EquipmentWorkshopDialog({
  game,
  motionEnabled,
  onChange,
  onOpenChange,
  open,
  workshopId,
}: {
  game: GameState;
  motionEnabled: boolean;
  onChange: ExploreChange;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  workshopId: string | null;
}) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [materialsLoaded, setMaterialsLoaded] = useState(false);
  const [forging, setForging] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const workshop = getEquipmentWorkshop(workshopId);
  const selectedRecipe = workshop?.recipes.find((recipe) => recipe.id === selectedRecipeId) ?? workshop?.recipes[0] ?? null;
  const selectedItem = selectedRecipe ? getItem(selectedRecipe.itemId) : null;
  const blueprintItem = selectedRecipe ? getItem(selectedRecipe.blueprintItemId) : null;
  const blueprintCount = selectedRecipe ? (game.inventory.items[selectedRecipe.blueprintItemId] ?? 0) : 0;
  const learned = selectedRecipe ? isEquipmentRecipeLearned(game, selectedRecipe.id) : false;
  const canLoadMaterials = Boolean(selectedRecipe && learned && canAffordCost(game, selectedRecipe.cost));
  const canForge = Boolean(selectedRecipe && learned && materialsLoaded && canAffordCost(game, selectedRecipe.cost) && !forging);

  useEffect(() => {
    if (!open || !workshop) {
      setSelectedRecipeId(null);
      setMaterialsLoaded(false);
      setForging(false);
      setFeedback(null);
      return;
    }
    setSelectedRecipeId(workshop.recipes[0]?.id ?? null);
    setMaterialsLoaded(false);
    setForging(false);
    setFeedback(null);
  }, [open, workshopId]);

  if (!workshop) {
    return null;
  }
  const activeWorkshop = workshop;

  function selectRecipe(recipeId: string) {
    setSelectedRecipeId(recipeId);
    setMaterialsLoaded(false);
    setFeedback(null);
  }

  function learnRecipe() {
    if (!selectedRecipe) {
      return;
    }
    const currentWorkshopId = activeWorkshop.id;
    onChange((currentGame) => learnEquipmentCraftRecipe(currentGame, currentWorkshopId, selectedRecipe.id));
    setMaterialsLoaded(false);
    setFeedback(`你将${formatItemName(selectedRecipe.blueprintItemId)}收入火候册。`);
  }

  function loadMaterials() {
    if (!canLoadMaterials) {
      return;
    }
    setMaterialsLoaded(true);
    setFeedback("所需材料已摆上炼器台。");
  }

  function confirmForge() {
    if (!selectedRecipe || !canForge) {
      return;
    }
    setForging(true);
    setFeedback("炉火正旺，器胚正在成形。");
    const currentWorkshopId = activeWorkshop.id;
    const recipeId = selectedRecipe.id;
    const resultName = formatWorkshopItemName(selectedRecipe.itemId);
    window.setTimeout(
      () => {
        onChange((currentGame) => craftWorkshopEquipment(currentGame, currentWorkshopId, recipeId));
        setForging(false);
        setMaterialsLoaded(false);
        setFeedback(`炉火一收，${resultName}已入背包。`);
      },
      motionEnabled ? 800 : 0,
    );
  }

  return (
    <GameDialog
      className="equipment-workshop-dialog"
      motionEnabled={motionEnabled}
      onOpenChange={onOpenChange}
      open={open}
      subtitle="赵铁匠 · 打造装备"
      title={activeWorkshop.name}
    >
      <div className={`equipment-workshop workbench ${forging ? "is-forging" : ""}`}>
        <p>先研读图纸，再一键放入所需材料，最后开炉打造。图纸学习后永久解锁。</p>
        <div className="workbench-recipe-tabs" aria-label="炼器图纸">
          {activeWorkshop.recipes.map((recipe) => {
            const item = getItem(recipe.itemId);
            const recipeLearned = isEquipmentRecipeLearned(game, recipe.id);
            return (
              <button className={`workbench-recipe-tab grade-card grade-${item.grade}${recipe.id === selectedRecipe?.id ? " active" : ""}`} key={recipe.id} onClick={() => selectRecipe(recipe.id)} type="button">
                <GameIcon name={getShopItemIconName(item)} size={17} />
                <span>
                  <strong className={getGradeNameClass(item)}>{formatWorkshopItemName(recipe.itemId)}</strong>
                  <small>{recipeLearned ? "已学会" : "需研读图纸"}</small>
                </span>
              </button>
            );
          })}
        </div>
        {selectedRecipe && selectedItem && blueprintItem ? (
          <div className="workbench-layout">
            <section className={`workbench-stage-card blueprint-stage ${learned ? "ready" : blueprintCount > 0 ? "available" : "missing"}`}>
              <div className="workshop-card-heading">
                <GameIcon name="system-library" size={18} />
                <div>
                  <strong>{blueprintItem.name}</strong>
                  <small>{learned ? "已学会" : blueprintCount > 0 ? `可研读 · 持有 x${blueprintCount}` : "缺图纸"}</small>
                </div>
              </div>
              <p>{selectedRecipe.description}</p>
              {!learned ? (
                <button disabled={blueprintCount <= 0 || forging} onClick={learnRecipe} type="button">
                  {blueprintCount > 0 ? "研读图纸" : "缺少图纸"}
                </button>
              ) : (
                <span className="workbench-status-tag">图纸已收入火候册</span>
              )}
            </section>
            <section className={`workbench-stage-card material-stage ${materialsLoaded ? "ready" : ""}`}>
              <div className="workshop-card-heading">
                <GameIcon name="item-material" size={18} />
                <div>
                  <strong>所需材料</strong>
                  <small>{formatWorkshopCost(selectedRecipe.cost)}</small>
                </div>
              </div>
              <WorkshopCostSlots cost={selectedRecipe.cost} game={game} loaded={materialsLoaded} />
              <button disabled={!canLoadMaterials || materialsLoaded || forging} onClick={loadMaterials} type="button">
                {materialsLoaded ? "材料已放入" : canLoadMaterials ? "一键放入材料" : learned ? "材料不足" : "先研读图纸"}
              </button>
            </section>
            <section className={`workbench-stage-card result-stage grade-card grade-${selectedItem.grade}${forging ? " forging" : ""}`}>
              <div className="workshop-card-heading">
                <GameIcon name={getShopItemIconName(selectedItem)} size={18} />
                <div>
                  <strong className={getGradeNameClass(selectedItem)}>{formatWorkshopItemName(selectedRecipe.itemId)}</strong>
                  <small>
                    {itemTierLabels[selectedItem.tier]} · {selectedItem.equipment ? getWorkshopSlotLabel(selectedItem.equipment.slot) : "器物"}
                  </small>
                </div>
                <GradeBadge compact grade={selectedItem.grade} />
              </div>
              <p>打造成功后生成一件独立装备实例，不占用商店库存。</p>
              <button disabled={!canForge} onClick={confirmForge} type="button">
                {forging ? "打造中" : canForge ? "开始打造" : materialsLoaded ? "无法打造" : "等待材料"}
              </button>
            </section>
          </div>
        ) : null}
        {feedback ? <p className="workbench-feedback">{feedback}</p> : null}
      </div>
    </GameDialog>
  );
}

type ReforgeSourceKey = "bag" | "equipped";

function EquipmentReforgeDialog({
  game,
  motionEnabled,
  onChange,
  onOpenChange,
  open,
  workshopId,
}: {
  game: GameState;
  motionEnabled: boolean;
  onChange: ExploreChange;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  workshopId: string | null;
}) {
  const [source, setSource] = useState<ReforgeSourceKey>("bag");
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [lockedAffixIds, setLockedAffixIds] = useState<string[]>([]);
  const [materialsLoaded, setMaterialsLoaded] = useState(false);
  const [reforging, setReforging] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const workshop = getEquipmentWorkshop(workshopId);
  const equippedInstanceIds = useMemo(() => new Set(Object.values(game.inventory.equipment).filter(Boolean) as string[]), [game.inventory.equipment]);
  const bagEquipmentInstances = game.inventory.equipmentItems.filter((instance) => !equippedInstanceIds.has(instance.id));
  const equippedEntries = equipmentSlots
    .map((slot) => ({ slotId: slot.id, slotLabel: slot.label, instance: getEquippedEquipmentInstance(game, slot.id) }))
    .filter((entry): entry is { slotId: EquipmentSlotId; slotLabel: string; instance: EquipmentInstance } => Boolean(entry.instance));
  const equipmentInstances = source === "bag" ? bagEquipmentInstances : equippedEntries.map((entry) => entry.instance);
  const selectedInstance = selectedInstanceId ? equipmentInstances.find((instance) => instance.id === selectedInstanceId) ?? null : null;
  const selectedItem = selectedInstance ? getItem(selectedInstance.itemId) : null;
  const lockLimit = selectedInstance ? getEffectiveReforgeLockLimit(selectedInstance) : 0;
  const cost = selectedInstance ? getReforgeCost(selectedInstance, lockedAffixIds.length) : null;
  const canPay = cost ? canAffordCost(game, cost) : false;
  const canLoadMaterials = Boolean(selectedInstance && selectedInstance.affixes.length > lockedAffixIds.length && canPay);
  const canReforge = Boolean(selectedInstance && materialsLoaded && selectedInstance.affixes.length > lockedAffixIds.length && canPay && !reforging);

  useEffect(() => {
    if (!open) {
      setSource("bag");
      setSelectedInstanceId(null);
      setLockedAffixIds([]);
      setMaterialsLoaded(false);
      setReforging(false);
      setFeedback(null);
    }
  }, [open, workshopId]);

  useEffect(() => {
    if (selectedInstanceId && !game.inventory.equipmentItems.some((instance) => instance.id === selectedInstanceId)) {
      setSelectedInstanceId(null);
      setLockedAffixIds([]);
      setMaterialsLoaded(false);
      setFeedback(null);
    }
  }, [game.inventory.equipmentItems, selectedInstanceId]);

  function changeSource(nextSource: ReforgeSourceKey) {
    if (nextSource === source) {
      return;
    }
    setSource(nextSource);
    setSelectedInstanceId(null);
    setLockedAffixIds([]);
    setMaterialsLoaded(false);
    setFeedback(null);
  }

  function selectInstance(instanceId: string) {
    setSelectedInstanceId(instanceId);
    setLockedAffixIds([]);
    setMaterialsLoaded(false);
    setFeedback(null);
  }

  function toggleLockedAffix(affixId: string) {
    setLockedAffixIds((current) => {
      if (current.includes(affixId)) {
        return current.filter((item) => item !== affixId);
      }
      if (current.length >= lockLimit) {
        return current;
      }
      return [...current, affixId];
    });
    setMaterialsLoaded(false);
    setFeedback(null);
  }

  function loadReforgeMaterials() {
    if (!canLoadMaterials) {
      return;
    }
    setMaterialsLoaded(true);
    setFeedback("洗炼材料已置入炉阵。");
  }

  function confirmReforge() {
    if (!selectedInstance || !canReforge) {
      return;
    }
    const instanceId = selectedInstance.id;
    const resultName = selectedInstance.displayName;
    const lockedIds = lockedAffixIds;
    setReforging(true);
    setFeedback("灵纹入炉，词条正在重排。");
    window.setTimeout(
      () => {
        onChange((currentGame) => reforgeWorkshopEquipment(currentGame, instanceId, lockedIds));
        setLockedAffixIds([]);
        setMaterialsLoaded(false);
        setReforging(false);
        setFeedback(`${resultName} 的词条已重新洗炼。`);
      },
      motionEnabled ? 900 : 0,
    );
  }

  if (!workshop) {
    return null;
  }

  return (
    <>
      <GameDialog
        className="equipment-reforge-dialog"
        motionEnabled={motionEnabled}
        onOpenChange={onOpenChange}
        open={open}
        subtitle="赵铁匠 · 洗炼词条"
        title={workshop.name}
      >
        <div className="equipment-reforge">
          <p>先选择要洗炼的装备来源，再进入洗炼台锁定词条和放入材料。</p>
          <div className="reforge-source-tabs" aria-label="装备来源">
            <button className={source === "bag" ? "active" : ""} onClick={() => changeSource("bag")} type="button">
              背包装备 <small>{bagEquipmentInstances.length}</small>
            </button>
            <button className={source === "equipped" ? "active" : ""} onClick={() => changeSource("equipped")} type="button">
              已穿装备 <small>{equippedEntries.length}</small>
            </button>
          </div>
          <div className="reforge-equipment-list">
            {source === "bag"
              ? bagEquipmentInstances.map((instance) => <ReforgeEquipmentButton instance={instance} key={instance.id} onSelect={selectInstance} selected={instance.id === selectedInstanceId} />)
              : equippedEntries.map((entry) => (
                  <ReforgeEquipmentButton
                    instance={entry.instance}
                    key={entry.instance.id}
                    onSelect={selectInstance}
                    selected={entry.instance.id === selectedInstanceId}
                    sourceLabel={entry.slotLabel}
                  />
                ))}
            {equipmentInstances.length === 0 ? <p className="empty-hint compact">{source === "bag" ? "背包中暂无可洗炼装备。" : "当前没有已穿装备。"}</p> : null}
          </div>
        </div>
      </GameDialog>
      <ReforgeWorkbenchDialog
        canLoadMaterials={canLoadMaterials}
        canPay={canPay}
        canReforge={canReforge}
        cost={cost}
        feedback={feedback}
        game={game}
        lockedAffixIds={lockedAffixIds}
        lockLimit={lockLimit}
        materialsLoaded={materialsLoaded}
        motionEnabled={motionEnabled}
        onConfirm={confirmReforge}
        onLoadMaterials={loadReforgeMaterials}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedInstanceId(null);
            setLockedAffixIds([]);
            setMaterialsLoaded(false);
            setFeedback(null);
          }
        }}
        onToggleAffix={toggleLockedAffix}
        open={open && Boolean(selectedInstance)}
        reforging={reforging}
        selectedInstance={selectedInstance}
        selectedItem={selectedItem}
      />
    </>
  );
}

function WorkshopCostSlots({ cost, game, loaded }: { cost: Cost; game: GameState; loaded: boolean }) {
  const slots = getWorkshopCostSlots(cost, game);
  if (!slots.length) {
    return <p className="empty-hint compact">无需额外材料。</p>;
  }
  return (
    <div className="workbench-cost-grid">
      {slots.map((slot) => {
        const missing = slot.owned < slot.required;
        return (
          <div className={`workbench-cost-slot ${loaded ? "loaded" : missing ? "missing" : "ready"}`} key={slot.id}>
            <GameIcon name={slot.iconName} size={16} />
            <strong>{slot.name}</strong>
            <small>
              {slot.kind === "stones" ? `${slot.required} 灵石` : `库存 ${slot.owned}/${slot.required}`}
            </small>
          </div>
        );
      })}
    </div>
  );
}

function ReforgeEquipmentButton({
  instance,
  onSelect,
  selected,
  sourceLabel,
}: {
  instance: EquipmentInstance;
  onSelect: (instanceId: string) => void;
  selected: boolean;
  sourceLabel?: string;
}) {
  const item = getItem(instance.itemId);
  return (
    <button className={`reforge-equipment-card grade-card grade-${instance.quality}${selected ? " active" : ""}`} onClick={() => onSelect(instance.id)} type="button">
      <GameIcon name={getShopItemIconName(item)} size={18} />
      <span>
        <strong className={getGradeNameClass(item)}>{instance.displayName}</strong>
        <small>
          {sourceLabel ? `${sourceLabel} · ` : ""}
          {itemTierLabels[instance.realmTier]} · {itemGradeLabels[instance.quality]} · 词条 {instance.affixes.length}
        </small>
      </span>
    </button>
  );
}

function ReforgeWorkbenchDialog({
  canLoadMaterials,
  canPay,
  canReforge,
  cost,
  feedback,
  game,
  lockedAffixIds,
  lockLimit,
  materialsLoaded,
  motionEnabled,
  onConfirm,
  onLoadMaterials,
  onOpenChange,
  onToggleAffix,
  open,
  reforging,
  selectedInstance,
  selectedItem,
}: {
  canLoadMaterials: boolean;
  canPay: boolean;
  canReforge: boolean;
  cost: Cost | null;
  feedback: string | null;
  game: GameState;
  lockedAffixIds: string[];
  lockLimit: number;
  materialsLoaded: boolean;
  motionEnabled: boolean;
  onConfirm: () => void;
  onLoadMaterials: () => void;
  onOpenChange: (open: boolean) => void;
  onToggleAffix: (affixId: string) => void;
  open: boolean;
  reforging: boolean;
  selectedInstance: EquipmentInstance | null;
  selectedItem: ItemConfig | null;
}) {
  if (!selectedInstance || !selectedItem) {
    return null;
  }

  const hasRerollTarget = selectedInstance.affixes.length > lockedAffixIds.length;
  const materialLabel = materialsLoaded ? "材料已放入" : canLoadMaterials ? "一键放入材料" : canPay ? "需保留词条" : "材料不足";
  const reforgeLabel = reforging ? "洗炼中" : canReforge ? "开始洗炼" : materialsLoaded ? "无法洗炼" : "等待材料";

  return (
    <GameDialog
      className="reforge-workbench-dialog"
      motionEnabled={motionEnabled}
      onOpenChange={onOpenChange}
      open={open}
      overlayClassName="reforge-workbench-overlay"
      subtitle={`${itemGradeLabels[selectedInstance.quality]} · 最多锁定 ${lockLimit} 条`}
      title={`洗炼：${selectedInstance.displayName}`}
    >
      <div className={`reforge-workbench ${reforging ? "is-reforging" : ""}`}>
        <section className={`reforge-workbench-hero grade-card grade-${selectedInstance.quality}`}>
          <GameIcon name={getShopItemIconName(selectedItem)} size={22} />
          <div>
            <strong className={getGradeNameClass(selectedItem)}>{selectedInstance.displayName}</strong>
            <small>
              {itemTierLabels[selectedInstance.realmTier]} · {getWorkshopSlotLabel(selectedInstance.slot)} · 战力 +{selectedInstance.powerBonus}
            </small>
          </div>
          <GradeBadge compact grade={selectedInstance.quality} />
        </section>
        <section className="reforge-workbench-section">
          <div className="scene-dialog-section-title">
            <strong>锁定词条</strong>
            <small>
              {lockedAffixIds.length}/{lockLimit}
            </small>
          </div>
          {selectedInstance.affixes.length ? (
            <div className="reforge-affix-list">
              {selectedInstance.affixes.map((affix) => {
                const locked = lockedAffixIds.includes(affix.id);
                const disabled = reforging || (!locked && (lockedAffixIds.length >= lockLimit || selectedInstance.affixes.length - lockedAffixIds.length <= 1));
                return (
                  <AffixRow
                    actionLabel={locked ? "已锁定" : disabled ? "不可锁" : "点击锁定"}
                    affix={affix}
                    disabled={disabled}
                    key={affix.id}
                    locked={locked}
                    onClick={() => onToggleAffix(affix.id)}
                  />
                );
              })}
            </div>
          ) : (
            <p className="empty-hint compact">这件装备暂无可洗炼词条。</p>
          )}
        </section>
        <section className={`workbench-stage-card material-stage ${materialsLoaded ? "ready" : ""}`}>
          <div className="workshop-card-heading">
            <GameIcon name="item-material" size={18} />
            <div>
              <strong>洗炼材料</strong>
              <small>{cost ? formatWorkshopCost(cost) : "先选择装备"}</small>
            </div>
          </div>
          {cost ? <WorkshopCostSlots cost={cost} game={game} loaded={materialsLoaded} /> : null}
          <button disabled={!canLoadMaterials || materialsLoaded || reforging} onClick={onLoadMaterials} type="button">
            {materialLabel}
          </button>
        </section>
        <button className="reforge-confirm-button" disabled={!canReforge || !hasRerollTarget} onClick={onConfirm} type="button">
          {reforgeLabel}
        </button>
        {feedback ? <p className="workbench-feedback">{feedback}</p> : null}
      </div>
    </GameDialog>
  );
}

function ShopCatalogDialog({
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
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState<ShopCategoryKey>("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const pageSize = useShopPageSize(open);
  const shop = getShopConfig(shopId, game.world.regionId);
  const refresh = getShopRefreshInfo(shop, game.world.calendar);
  const displayItems = getShopDisplayItems(game, shop);
  const categoryCounts = useMemo(() => getShopCategoryCounts(displayItems), [displayItems]);
  const visibleTabs = useMemo(() => shopCategoryTabs.filter((tab) => tab.key === "all" || categoryCounts[tab.key] > 0), [categoryCounts]);
  const filteredItems = useMemo(
    () => (category === "all" ? displayItems : displayItems.filter((entry) => getShopItemCategory(entry) === category)),
    [category, displayItems],
  );
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = filteredItems.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const selectedEntry = selectedItemId ? filteredItems.find((entry) => entry.shopItem.itemId === selectedItemId) ?? null : null;

  useEffect(() => {
    setCategory("all");
    setPage(0);
    setSelectedItemId(null);
  }, [shop.id, open]);

  useEffect(() => {
    if (page > pageCount - 1) {
      setPage(pageCount - 1);
    }
  }, [page, pageCount]);

  function changeCategory(nextCategory: ShopCategoryKey) {
    if (nextCategory === category) {
      return;
    }
    setCategory(nextCategory);
    setPage(0);
    setSelectedItemId(null);
  }

  function buy(itemId: string) {
    onChange((currentGame) => buyShopItem(currentGame, shop.id, itemId));
  }

  return (
    <>
      <GameDialog
        open={open}
        onOpenChange={onOpenChange}
        title={shop.name}
        subtitle={shop.ownerName ? `${shop.ownerName} · ${refresh.label}` : refresh.label}
        motionEnabled={motionEnabled}
        className="shop-catalog-dialog"
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
          <section className="shop-category-tabs" aria-label="商品分类">
            {visibleTabs.map((tab) => (
              <button className={tab.key === category ? "active" : ""} key={tab.key} onClick={() => changeCategory(tab.key)} type="button">
                <GameIcon name={tab.iconName} size={14} />
                <span>{tab.label}</span>
                <small>{categoryCounts[tab.key]}</small>
              </button>
            ))}
          </section>
          <ShopItemGrid displayItems={pageItems} onSelect={setSelectedItemId} pageSize={pageSize} selectedItemId={selectedItemId} />
          {filteredItems.length > pageSize ? (
            <div className="shop-page-controls">
              <button disabled={safePage <= 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
                上一页
              </button>
              <span>
                {safePage + 1} / {pageCount}
              </span>
              <button disabled={safePage >= pageCount - 1} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}>
                下一页
              </button>
            </div>
          ) : null}
        </div>
      </GameDialog>
      <ShopPurchaseDialog
        entry={selectedEntry}
        game={game}
        motionEnabled={motionEnabled}
        onBuy={buy}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedItemId(null);
          }
        }}
        open={open && Boolean(selectedEntry)}
      />
    </>
  );
}

function ShopItemGrid({
  displayItems,
  onSelect,
  pageSize,
  selectedItemId,
}: {
  displayItems: ShopDisplayItem[];
  onSelect: (itemId: string) => void;
  pageSize: number;
  selectedItemId: string | null;
}) {
  const slots = useMemo(() => Array.from({ length: pageSize }, (_, index) => displayItems[index] ?? null), [displayItems, pageSize]);

  return (
    <div className="shop-grid-wrap">
      <div className="shop-catalog-grid">
        {slots.map((entry, index) =>
          entry ? (
            <ItemSlot
              amountLabel={getShopSlotStockLabel(entry)}
              className={`shop-grid-slot item-grade-press${entry.soldOut ? " sold-out" : ""}`}
              description={`${formatShopNumber(entry.shopItem.price)} 灵石`}
              grade={entry.item.grade}
              iconName={getShopItemIconName(entry.item)}
              key={entry.shopItem.itemId}
              name={formatItemName(entry.item)}
              onClick={() => onSelect(entry.shopItem.itemId)}
              state={selectedItemId === entry.shopItem.itemId ? "selected" : "filled"}
            />
          ) : (
            <ItemSlot className="shop-grid-slot empty" key={`empty-${pageSize}-${index}`} state="empty" />
          ),
        )}
      </div>
      {displayItems.length === 0 ? <p className="shop-refresh-note">此分类暂时没有货物。</p> : null}
    </div>
  );
}

function ShopPurchaseDialog({
  entry,
  game,
  motionEnabled,
  onBuy,
  onOpenChange,
  open,
}: {
  entry: ShopDisplayItem | null;
  game: GameState;
  motionEnabled: boolean;
  onBuy: (itemId: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  if (!entry) {
    return null;
  }

  const { item, shopItem, soldOut } = entry;
  const canAfford = game.player.spiritStones >= shopItem.price;
  const canBuy = !soldOut && canAfford;
  const actionLabel = soldOut ? "售罄" : canAfford ? `购买 ${formatShopNumber(shopItem.price)} 灵石` : "灵石不足";

  return (
    <GameDialog
      className="shop-purchase-dialog"
      motionEnabled={motionEnabled}
      onOpenChange={onOpenChange}
      open={open}
      overlayClassName="shop-purchase-overlay"
      subtitle={`${shopCategoryLabels[getShopItemCategory(entry)]} · 库存 ${getShopStockText(entry)}`}
      title={formatItemName(item)}
    >
      <section className={`shop-selected-item shop-purchase-card grade-card grade-${item.grade}${soldOut ? " sold-out" : ""}`}>
        <div className="shop-selected-heading">
          <GameIcon name={getShopItemIconName(item)} size={18} />
          <div>
            <strong className={getGradeNameClass(item)}>{formatItemName(item)}</strong>
            <span>
              {shopCategoryLabels[getShopItemCategory(entry)]} · 库存 {getShopStockText(entry)}
            </span>
          </div>
          <GradeBadge compact grade={item.grade} />
        </div>
        <p>{item.description}</p>
        <div className="shop-selected-meta">
          <span>
            价格 <strong>{formatShopNumber(shopItem.price)}</strong> 灵石
          </span>
          <span>当前灵石 {formatShopNumber(game.player.spiritStones)}</span>
        </div>
        <button disabled={!canBuy} onClick={() => onBuy(shopItem.itemId)} type="button">
          {actionLabel}
        </button>
      </section>
    </GameDialog>
  );
}

type ShopItemCategoryKey = Exclude<ShopCategoryKey, "all">;

function useShopPageSize(open: boolean): number {
  const [pageSize, setPageSize] = useState(() => getCurrentShopPageSize());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia(SHOP_WIDE_MEDIA_QUERY);
    const sync = () => setPageSize(media.matches ? SHOP_WIDE_PAGE_SIZE : SHOP_MOBILE_PAGE_SIZE);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [open]);

  return pageSize;
}

function getCurrentShopPageSize(): number {
  if (typeof window === "undefined") {
    return SHOP_MOBILE_PAGE_SIZE;
  }
  return window.matchMedia(SHOP_WIDE_MEDIA_QUERY).matches ? SHOP_WIDE_PAGE_SIZE : SHOP_MOBILE_PAGE_SIZE;
}

function getShopCategoryCounts(displayItems: ShopDisplayItem[]): Record<ShopCategoryKey, number> {
  const counts: Record<ShopCategoryKey, number> = { all: displayItems.length, pill: 0, artifact: 0, material: 0, misc: 0 };
  displayItems.forEach((entry) => {
    counts[getShopItemCategory(entry)] += 1;
  });
  return counts;
}

function getShopItemCategory(entry: ShopDisplayItem): ShopItemCategoryKey {
  if (entry.shopItem.shopCategory) {
    return entry.shopItem.shopCategory;
  }
  if (entry.item.equipment || entry.item.category === "equipment") {
    return "artifact";
  }
  if (entry.item.category === "pill") {
    return "pill";
  }
  if (entry.item.category === "material") {
    return "material";
  }
  return "misc";
}

function getShopItemIconName(item: ItemConfig): GameIconName {
  if (item.equipment) {
    return shopEquipmentSlotIcons[item.equipment.slot] ?? "equipment";
  }
  if (item.category === "blueprint") {
    return "system-library";
  }
  if (item.category === "recipe") {
    return "system-alchemy";
  }
  if (item.category === "pill") {
    return "item-pill";
  }
  if (item.category === "material") {
    return "item-material";
  }
  return "item";
}

const shopEquipmentSlotIcons: Record<string, GameIconName> = {
  weapon: "equipment-weapon",
  robe: "equipment-robe",
  helmet: "equipment-helmet",
  wrist: "equipment-wrist",
  boots: "equipment-boots",
  ring: "equipment-ring",
  amulet: "equipment-amulet",
  artifact: "equipment-artifact",
};

function getWorkshopSlotLabel(slotId: string): string {
  return equipmentSlots.find((slot) => slot.id === slotId)?.label ?? "装备";
}

function getWorkshopCostSlots(cost: Cost, game: GameState): Array<{ id: string; name: string; required: number; owned: number; kind: "item" | "stones"; iconName: GameIconName }> {
  const slots: Array<{ id: string; name: string; required: number; owned: number; kind: "item" | "stones"; iconName: GameIconName }> = [];
  if ((cost.spiritStones ?? 0) > 0) {
    slots.push({
      id: "spirit_stones",
      name: "灵石",
      required: cost.spiritStones ?? 0,
      owned: game.player.spiritStones,
      kind: "stones",
      iconName: "resource-stones",
    });
  }
  cost.items?.forEach((part) => {
    const item = getItem(part.itemId);
    slots.push({
      id: item.id,
      name: formatItemName(item),
      required: part.amount,
      owned: game.inventory.items[item.id] ?? 0,
      kind: "item",
      iconName: getShopItemIconName(item),
    });
  });
  return slots;
}

function getShopSlotStockLabel(entry: ShopDisplayItem): string {
  return entry.remaining === null ? "库存不限" : `库存x${entry.remaining}`;
}

function getShopStockText(entry: ShopDisplayItem): string {
  return entry.remaining === null ? "不限" : `${entry.remaining}/${entry.shopItem.stock ?? entry.remaining}`;
}

function formatShopNumber(value: number): string {
  return value.toLocaleString("zh-CN");
}

function getGradeNameClass(item: ItemConfig): string {
  return `grade-name grade-${item.grade}${shouldEmphasizeItemGrade(item.grade) ? " strong" : ""}`;
}

function TaskBoardDialog({
  game,
  motionEnabled,
  onChange,
  onOpenChange,
  open,
}: {
  game: GameState;
  motionEnabled: boolean;
  onChange: ExploreChange;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const visibleTasks = tasks.filter((task) => !task.regionId || task.regionId === game.world.regionId);

  function accept(taskId: string) {
    onChange((currentGame) => {
      const nextTask: QuestState = { status: "accepted", progress: currentGame.world.tasks[taskId]?.progress ?? 0 };
      return appendLog(
        {
          ...currentGame,
          world: {
            ...currentGame.world,
            tasks: { ...currentGame.world.tasks, [taskId]: nextTask },
          },
        },
        "你接下宗门任务。",
      );
    });
  }

  function complete(taskId: string) {
    onChange((currentGame) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task) {
        return currentGame;
      }
      const hasItems = task.requiredItems?.every((item) => (currentGame.inventory.items[item.itemId] ?? 0) >= item.amount) ?? true;
      const hasFlags = task.requiredFlags?.every((flag) => flag === "visited_luoxia" && (currentGame.world.tasks.deliver_letter?.progress ?? 0) > 0) ?? true;
      if (!hasItems || !hasFlags) {
        return appendLog(currentGame, "任务条件尚未完成。");
      }
      const paid = removeItems(currentGame, task.requiredItems);
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
      return appendLog(rewarded, `完成任务《${task.title}》，贡献 +${task.rewards.contribution}。`);
    });
  }

  return (
    <GameDialog
      className="task-board-dialog"
      motionEnabled={motionEnabled}
      onOpenChange={onOpenChange}
      open={open}
      subtitle={`${visibleTasks.length} 件可见差事`}
      title="任务榜"
    >
      <div className="task-board-list">
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
      </div>
    </GameDialog>
  );
}
