import { useState, type CSSProperties, type PointerEvent } from "react";
import { formatItemName, getItem, shouldEmphasizeItemGrade } from "../data/items";
import { getRegionMapConfig, type RegionMapConfig } from "../data/regionMaps";
import { getLocation, getRegion, getScene, shopItems, tasks, type LocationNode, type SceneAction } from "../data/world";
import { getWorldProvince, worldProvinces, type WorldProvince } from "../data/worldMap";
import { beginCombat, grantGatherReward, grantTreasure } from "../game/combatEngine";
import { addItems, addRewards, appendLog, joinSect, recruitCompanion, recruitPet, removeItems } from "../game/state";
import type { GameState, ItemConfig, QuestState } from "../types";
import { GameIcon, getLocationIconName, type GameIconName } from "./GameIcon";

const worldMapSrc = new URL("../../World_map.png", import.meta.url).href;
const regionMapImages: Record<RegionMapConfig["imageKey"], string> = {
  nanjiang: new URL("../../World_map_nanjiang2.png", import.meta.url).href,
};

export default function ExplorePanel({ game, onChange }: { game: GameState; onChange: (game: GameState) => void }) {
  const [view, setView] = useState<"world" | "region" | "location">("world");
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const region = getRegion(game.world.regionId);
  const location = getLocation(game.world.regionId, game.world.locationId);
  const scene = getScene(game.world.regionId, game.world.locationId, game.world.sceneId);
  const selectedProvince = selectedProvinceId ? getWorldProvince(selectedProvinceId) : null;
  const currentProvince = getWorldProvince(game.world.regionId);
  const regionMap = getRegionMapConfig(game.world.regionId);

  function enterProvince(province: WorldProvince) {
    if (!province.open || !province.regionId) {
      return;
    }
    const nextRegion = getRegion(province.regionId);
    const nextLocation = nextRegion.locations[0];
    onChange({
      ...game,
      world: {
        ...game.world,
        regionId: province.regionId,
        locationId: nextLocation.id,
        sceneId: nextLocation.scenes[0].id,
        lastTownId: nextLocation.type === "city" || nextLocation.type === "town" ? nextLocation.id : game.world.lastTownId,
        sceneMessage: `进入${province.name}。`,
      },
    });
    setSelectedProvinceId(province.id);
    setView("region");
  }

  function setLocation(locationId: string) {
    const nextLocation = getLocation(game.world.regionId, locationId);
    onChange({
      ...game,
      world: {
        ...game.world,
        locationId,
        sceneId: nextLocation.scenes[0].id,
        lastTownId: nextLocation.type === "city" || nextLocation.type === "town" ? nextLocation.id : game.world.lastTownId,
        sceneMessage: `抵达 ${nextLocation.name}。`,
      },
    });
    setView("location");
  }

  function setScene(sceneId: string) {
    onChange({
      ...game,
      world: {
        ...game.world,
        sceneId,
        sceneMessage: `来到 ${getScene(game.world.regionId, game.world.locationId, sceneId).name}。`,
      },
    });
  }

  return (
    <section className="module-panel explore-panel">
      {view === "world" ? (
        <WorldMapView
          selectedProvince={selectedProvince}
          onSelectProvince={setSelectedProvinceId}
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
            {regionMap ? (
              <RegionImageMapView
                config={regionMap}
                currentLocationId={location.id}
                locations={region.locations}
                onEnterLocation={setLocation}
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
              <h3>{scene.name}</h3>
              <small>{scene.type}</small>
              <p>{scene.description}</p>
              <div className="action-grid">
                {scene.actions.map((action) => (
                  <button key={action.id} onClick={() => onChange(handleAction(game, action))}>
                    <GameIcon name={getActionIconName(action.kind)} size={16} />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </article>

          {scene.actions.some((action) => action.kind === "shop") ? <Shop game={game} onChange={onChange} /> : null}
          {scene.actions.some((action) => action.kind === "taskBoard") ? <TaskBoard game={game} onChange={onChange} /> : null}
          <p className="scene-message">{game.world.sceneMessage}</p>
        </>
      )}
    </section>
  );
}

function WorldMapView({
  selectedProvince,
  onSelectProvince,
  onCloseProvince,
  onEnterProvince,
}: {
  selectedProvince: WorldProvince | null;
  onSelectProvince: (provinceId: string) => void;
  onCloseProvince: () => void;
  onEnterProvince: (province: WorldProvince) => void;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);

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

  return (
    <>
      <div className="world-map-header">
        <div>
          <h2>
            <GameIcon name="module-explore" size={18} />
            大世界
          </h2>
          <span>{selectedProvince ? `已选州域：${selectedProvince.name}` : "点击州域标记查看势力"}</span>
        </div>
        <div className="map-controls" onPointerDown={(event) => event.stopPropagation()}>
          <button onClick={() => zoom(0.18)} aria-label="放大地图">
            <GameIcon name="action-zoom-in" size={16} />
          </button>
          <button onClick={() => zoom(-0.18)} aria-label="缩小地图">
            <GameIcon name="action-zoom-out" size={16} />
          </button>
          <button onClick={resetMap}>
            <GameIcon name="action-reset" size={16} />
            重置
          </button>
        </div>
      </div>

      <div
        className="world-map-viewport"
        onWheel={(event) => {
          event.preventDefault();
          zoom(event.deltaY < 0 ? 0.12 : -0.12);
        }}
        onPointerDown={(event) => {
          if (event.target instanceof Element && event.target.closest("button, .world-info-drawer")) {
            return;
          }
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragStart({ pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y });
        }}
        onPointerMove={(event) => {
          if (!dragStart || dragStart.pointerId !== event.pointerId) {
            return;
          }
          setOffset({
            x: dragStart.originX + event.clientX - dragStart.x,
            y: dragStart.originY + event.clientY - dragStart.y,
          });
        }}
        onPointerUp={() => setDragStart(null)}
        onPointerCancel={() => setDragStart(null)}
      >
        <div
          className="world-map-canvas"
          style={{
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
          }}
        >
          <img src={worldMapSrc} alt="修仙大世界地图" draggable={false} />
          {worldProvinces.map((province) => (
            <button
              className={`province-marker ${selectedProvince?.id === province.id ? "active" : ""} ${province.open ? "open" : "locked"}`}
              key={province.id}
              style={{ left: `${province.marker.x}%`, top: `${province.marker.y}%`, "--marker-scale": `${1 / scale}` } as CSSProperties}
              onPointerDown={stopMapGesture}
              onPointerMove={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onSelectProvince(province.id);
              }}
            >
              <GameIcon name={province.open ? "module-explore" : "realm"} size={13} />
              <strong>{province.name}</strong>
              <small>{province.open ? "已开放" : "未开放"}</small>
            </button>
          ))}
        </div>

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
  config,
  currentLocationId,
  locations,
  onEnterLocation,
}: {
  config: RegionMapConfig;
  currentLocationId: string;
  locations: LocationNode[];
  onEnterLocation: (locationId: string) => void;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const selectedMarker = selectedMarkerId ? config.markers.find((marker) => marker.locationId === selectedMarkerId) : null;
  const selectedLocation = selectedMarker ? locations.find((item) => item.id === selectedMarker.locationId) : null;

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

  return (
    <div className="region-image-map">
      <div className="world-map-header region-image-map-header">
        <div>
          <h2>
            <GameIcon name="module-explore" size={18} />
            区域地图
          </h2>
          <span>{selectedLocation ? `已选地点：${selectedLocation.name}` : "点击地点标记查看详情"}</span>
        </div>
        <div className="map-controls" onPointerDown={(event) => event.stopPropagation()}>
          <button onClick={() => zoom(0.18)} aria-label="放大区域地图">
            <GameIcon name="action-zoom-in" size={16} />
          </button>
          <button onClick={() => zoom(-0.18)} aria-label="缩小区域地图">
            <GameIcon name="action-zoom-out" size={16} />
          </button>
          <button onClick={resetMap}>
            <GameIcon name="action-reset" size={16} />
            重置
          </button>
        </div>
      </div>

      <div
        className="world-map-viewport region-map-viewport"
        onWheel={(event) => {
          event.preventDefault();
          zoom(event.deltaY < 0 ? 0.12 : -0.12);
        }}
        onPointerDown={(event) => {
          if (event.target instanceof Element && event.target.closest("button, .world-info-drawer")) {
            return;
          }
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragStart({ pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y });
        }}
        onPointerMove={(event) => {
          if (!dragStart || dragStart.pointerId !== event.pointerId) {
            return;
          }
          setOffset({
            x: dragStart.originX + event.clientX - dragStart.x,
            y: dragStart.originY + event.clientY - dragStart.y,
          });
        }}
        onPointerUp={() => setDragStart(null)}
        onPointerCancel={() => setDragStart(null)}
      >
        <div
          className="world-map-canvas region-map-canvas"
          style={{
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
          }}
        >
          <img src={regionMapImages[config.imageKey]} alt="南疆区域地图" draggable={false} />
          {config.markers.map((marker) => {
            const item = locations.find((location) => location.id === marker.locationId);
            if (!item) {
              return null;
            }
            return (
              <button
                className={`province-marker region-location-marker ${selectedMarkerId === marker.locationId ? "active" : ""} ${
                  currentLocationId === marker.locationId ? "current" : ""
                }`}
                key={marker.locationId}
                style={{ left: `${marker.x}%`, top: `${marker.y}%`, "--marker-scale": `${1 / scale}` } as CSSProperties}
                onPointerDown={stopMapGesture}
                onPointerMove={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedMarkerId(marker.locationId);
                }}
              >
                <GameIcon name={getLocationIconName(item.type)} size={13} />
                <strong>{item.name}</strong>
                <small>{marker.recommendedRealm}</small>
              </button>
            );
          })}
        </div>

        {selectedMarker && selectedLocation ? (
          <section className="world-info-drawer" onPointerDown={(event) => event.stopPropagation()}>
            <div className="section-heading">
              <h2>
                <GameIcon name={getLocationIconName(selectedLocation.type)} size={18} />
                {selectedLocation.name}
              </h2>
              <span>{getLocationTypeLabel(selectedLocation.type)} · {selectedMarker.recommendedRealm}</span>
            </div>
            <p>{selectedLocation.description}</p>
            <p className="danger-hint">{selectedMarker.danger}</p>
            <div className="world-drawer-actions">
              <button className="ghost-button" onClick={() => setSelectedMarkerId(null)}>
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
    return "equipment-treasure";
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

function Shop({ game, onChange }: { game: GameState; onChange: (game: GameState) => void }) {
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

function TaskBoard({ game, onChange }: { game: GameState; onChange: (game: GameState) => void }) {
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
    onChange(appendLog(rewarded, `完成任务「${task.title}」，贡献 +${task.rewards.contribution}。`));
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
