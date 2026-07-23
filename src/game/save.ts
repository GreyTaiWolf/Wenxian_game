import type {
  ActiveGridTravel,
  CombatActor,
  CombatState,
  EnemyRank,
  GameState,
  GridCoord,
  GridTravelIntent,
  InventoryState,
  PendingTravelEvent,
  RootSave,
  SaveSlot,
  SettingsState,
} from "../types";
import { getGridMapData, normalizeGridNavigationState } from "../data/gridMaps";
import { enemyGroups } from "../data/enemies";
import { itemGradeOrder, normalizeItemId } from "../data/items";
import { getTravelEventDefinition } from "../data/travelEvents";
import { regions } from "../data/world";
import { worldProvinces } from "../data/worldMap";
import { normalizeCaveState } from "./cave";
import { normalizeCalendarDate, normalizePassiveState, normalizeWorldTimeState } from "./time";
import { createEquipmentInstance, getEffectiveStats, normalizeInventoryState } from "./equipment";
import { getGridPathTravelHours, isSameGridCoord, validateGridPath } from "./gridNavigation";
import { normalizeQuestStates } from "./quests";
import { createNewGame, getDefaultDodge, normalizePlayerState, normalizeStats } from "./state";

export const SAVE_KEY = "xiuxian-text-rpg-save-slots-v1";

const defaultSettings: SettingsState = {
  textSize: "normal",
  motion: true,
  autoSave: true,
};

const gradePreviewQueryParam = "gradePreview";
const gradePreviewInstanceIdPrefix = "qa_grade_preview_";
const gradePreviewItemIdPrefix = "grade_preview_sword_";

export function createEmptyRootSave(): RootSave {
  return {
    version: 4,
    recentSlotId: null,
    settings: defaultSettings,
    slots: [null, null, null],
  };
}

export function loadRootSave(): RootSave {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return createEmptyRootSave();
    }
    const parsed = JSON.parse(raw) as RootSave;
    if (![1, 2, 3, 4].includes(parsed.version) || !Array.isArray(parsed.slots)) {
      return createEmptyRootSave();
    }
    const normalizedSlots: RootSave["slots"] = [
      normalizeSlotSafely(parsed.slots[0]),
      normalizeSlotSafely(parsed.slots[1]),
      normalizeSlotSafely(parsed.slots[2]),
    ];
    const normalizedRecentSlotId = normalizedSlots.some((slot) => slot?.id === parsed.recentSlotId)
      ? parsed.recentSlotId
      : normalizedSlots.find((slot): slot is SaveSlot => Boolean(slot))?.id ?? null;
    const normalizedRoot = {
      ...createEmptyRootSave(),
      ...parsed,
      version: 4 as const,
      recentSlotId: normalizedRecentSlotId,
      settings: { ...defaultSettings, ...parsed.settings },
      slots: normalizedSlots,
    };
    return shouldInjectGradePreviewEquipment() ? injectGradePreviewEquipment(normalizedRoot) : normalizedRoot;
  } catch {
    return createEmptyRootSave();
  }
}

function normalizeSlotSafely(slot: SaveSlot | null | undefined): SaveSlot | null {
  try {
    return normalizeSlot(slot);
  } catch {
    return null;
  }
}

export function persistRootSave(rootSave: RootSave): void {
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(rootSave));
}

export function createSlot(slotIndex: number, name: string): SaveSlot {
  const now = new Date().toISOString();
  return {
    id: `slot_${slotIndex + 1}`,
    createdAt: now,
    updatedAt: now,
    game: createNewGame(name),
  };
}

export function updateSlotGame(rootSave: RootSave, slotId: string, game: GameState): RootSave {
  const now = new Date().toISOString();
  return {
    ...rootSave,
    recentSlotId: slotId,
    slots: rootSave.slots.map((slot) => (slot?.id === slotId ? { ...slot, game, updatedAt: now } : slot)),
  };
}

export function deleteSlot(rootSave: RootSave, slotId: string): RootSave {
  return {
    ...rootSave,
    recentSlotId: rootSave.recentSlotId === slotId ? null : rootSave.recentSlotId,
    slots: rootSave.slots.map((slot) => (slot?.id === slotId ? null : slot)),
  };
}

function normalizeSlot(slot: SaveSlot | null | undefined): SaveSlot | null {
  if (!slot) {
    return null;
  }
  const normalizedBasePlayer = normalizePlayerState(slot.game.player);
  const inventory = normalizeInventoryState(slot.game.inventory);
  const playerWithSavedVitals = {
    ...normalizedBasePlayer,
    hp: safeFiniteNumber(slot.game.player?.hp, normalizedBasePlayer.hp),
    spirit: safeFiniteNumber(slot.game.player?.spirit, normalizedBasePlayer.spirit),
    team: (normalizedBasePlayer.team ?? []).map((member) => ({
      ...member,
      stats: normalizeStats(member.stats, { dodgeRate: getDefaultDodge(member.kind) }),
    })),
  };
  const effectiveStats = getEffectiveStats({
    ...slot.game,
    player: playerWithSavedVitals,
    inventory,
  });
  const player = {
    ...playerWithSavedVitals,
    hp: clamp(playerWithSavedVitals.hp, 1, effectiveStats.maxHp),
    spirit: clamp(playerWithSavedVitals.spirit, 0, effectiveStats.maxSpirit),
  };
  const navigation = normalizeGridNavigationState(slot.game.world?.navigation);
  const normalizedTime = normalizeWorldTimeState(slot.game.world?.time);
  const pendingTravelEvent = normalizePendingTravelEvent(slot.game.world?.pendingTravelEvent);
  const activeTravel = pendingTravelEvent ? null : normalizeActiveTravel(slot.game.world?.activeTravel, navigation);
  const normalizedCombat = slot.game.combat ? normalizeCombat(slot.game.combat) : undefined;
  return {
    ...slot,
    game: {
      ...slot.game,
      player,
      combat: normalizedCombat,
      inventory,
      world: {
        ...slot.game.world,
        tasks: normalizeQuestStates(slot.game.world?.tasks),
        calendar: normalizeCalendarDate(slot.game.world?.calendar),
        time: normalizedTime,
        passive: normalizePassiveState(slot.game.world?.passive, normalizedTime.tick),
        navigation,
        activeTravel,
        pendingTravelEvent,
        travelEventHistory: normalizeStringArray(slot.game.world?.travelEventHistory, 40),
        eventFlags: normalizeNumberRecord(slot.game.world?.eventFlags),
        encounterWins: normalizeNumberRecord(slot.game.world?.encounterWins),
      },
      cave: normalizeCaveState(slot.game.cave),
      combatReport: normalizeCombatReport(slot.game.combatReport, inventory),
    },
  };
}

function normalizePendingTravelEvent(raw: unknown): PendingTravelEvent | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const source = raw as Partial<PendingTravelEvent>;
  if (typeof source.eventId !== "string" || !getTravelEventDefinition(source.eventId) || typeof source.mapId !== "string") {
    return null;
  }
  return {
    eventId: source.eventId,
    mapId: source.mapId,
    destinationLabel: typeof source.destinationLabel === "string" && source.destinationLabel.trim() ? source.destinationLabel.trim() : "前方灵路",
    stepCount: Math.max(0, Math.floor(safeFiniteNumber(source.stepCount, 0))),
    triggeredAtTick: Math.max(0, Math.floor(safeFiniteNumber(source.triggeredAtTick, 0))),
  };
}

function normalizeActiveTravel(raw: unknown, navigation: GameState["world"]["navigation"]): ActiveGridTravel | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const source = raw as Partial<ActiveGridTravel>;
  if (typeof source.mapId !== "string") {
    return null;
  }
  const map = getGridMapData(source.mapId);
  const current = navigation.positions[source.mapId];
  const target = normalizeGridCoord(source.target);
  const path = Array.isArray(source.path) ? source.path.map(normalizeGridCoord).filter((coord): coord is GridCoord => Boolean(coord)) : [];
  const intent = normalizeGridTravelIntent(source.intent);
  if (!map || !current || !target || !intent || path.length > map.width * map.height) {
    return null;
  }
  const completePath = [current, ...path];
  const endpoint = path[path.length - 1] ?? current;
  if (!validateGridPath(map, completePath) || !validateGridPath(map, [target]) || !isSameGridCoord(endpoint, target)) {
    return null;
  }
  const remainingHours = getGridPathTravelHours(map, path);
  return {
    mapId: source.mapId,
    target,
    path,
    totalSteps: Math.max(path.length, Math.floor(safeFiniteNumber(source.totalSteps, path.length))),
    totalHours: Math.max(remainingHours, Math.floor(safeFiniteNumber(source.totalHours, remainingHours))),
    originLocationId: typeof source.originLocationId === "string" && source.originLocationId ? source.originLocationId : "unknown",
    intent,
    adjusted: Boolean(source.adjusted),
  };
}

function normalizeGridTravelIntent(raw: unknown): GridTravelIntent | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const source = raw as Partial<GridTravelIntent> & { provinceId?: unknown; regionId?: unknown; locationId?: unknown };
  if (source.kind === "free") {
    return { kind: "free" };
  }
  if (source.kind === "province" && typeof source.provinceId === "string" && worldProvinces.some((province) => province.id === source.provinceId)) {
    return { kind: "province", provinceId: source.provinceId };
  }
  if (
    (source.kind === "location" || source.kind === "locationPreview") &&
    typeof source.regionId === "string" &&
    typeof source.locationId === "string" &&
    regions.some((region) => region.id === source.regionId && region.locations.some((location) => location.id === source.locationId))
  ) {
    return { kind: source.kind, regionId: source.regionId, locationId: source.locationId };
  }
  return null;
}

function normalizeGridCoord(raw: unknown): GridCoord | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const source = raw as Partial<GridCoord>;
  if (!Number.isFinite(source.x) || !Number.isFinite(source.y)) {
    return null;
  }
  return {
    x: Math.floor(source.x as number),
    y: Math.floor(source.y as number),
  };
}

function normalizeCombatReport(report: GameState["combatReport"], inventory: InventoryState): GameState["combatReport"] {
  if (!report) {
    return undefined;
  }
  const inventoryById = new Map(inventory.equipmentItems.map((instance) => [instance.id, instance]));
  return {
    ...report,
    rank: normalizeEnemyRank(report.rank, report.groupId),
    result: report.result === "defeat" ? "defeat" : "victory",
    items: (Array.isArray(report.items) ? report.items : [])
      .filter((item) => item && typeof item.itemId === "string" && safeFiniteNumber(item.amount, 0) > 0)
      .map((item) => ({
        itemId: normalizeItemId(item.itemId),
        amount: Math.floor(item.amount),
      })),
    equipment: (Array.isArray(report.equipment) ? report.equipment : [])
      .map((instance) => inventoryById.get(instance?.id))
      .filter((instance): instance is NonNullable<typeof instance> => Boolean(instance)),
  };
}

function normalizeStringArray(value: unknown, limit: number): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string").slice(0, limit) : [];
}

function normalizeNumberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => typeof entry === "number" && Number.isFinite(entry))
      .map(([key, entry]) => [key, Math.max(0, Math.floor(entry as number))]),
  );
}

function safeFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function shouldInjectGradePreviewEquipment(): boolean {
  const search = window.location.search;
  if (!search) {
    return false;
  }
  return new URLSearchParams(search).has(gradePreviewQueryParam);
}

function injectGradePreviewEquipment(rootSave: RootSave): RootSave {
  const targetSlot = rootSave.slots.find((slot) => slot?.id === rootSave.recentSlotId) ?? rootSave.slots.find(Boolean);
  if (!targetSlot) {
    return rootSave;
  }

  const now = new Date().toISOString();
  const previewItemIds = new Set(itemGradeOrder.map((grade) => `${gradePreviewItemIdPrefix}${grade}`));
  const removedInstanceIds = new Set<string>();
  const keptEquipmentItems = targetSlot.game.inventory.equipmentItems.filter((instance) => {
    const isPreview = instance.id.startsWith(gradePreviewInstanceIdPrefix) || previewItemIds.has(instance.itemId);
    if (isPreview) {
      removedInstanceIds.add(instance.id);
    }
    return !isPreview;
  });
  const previewEquipmentItems = itemGradeOrder
    .map((grade, index) =>
      createEquipmentInstance(`${gradePreviewItemIdPrefix}${grade}`, {
        id: `${gradePreviewInstanceIdPrefix}${grade}`,
        createdAt: new Date(Date.now() + index).toISOString(),
      }),
    )
    .filter((instance): instance is NonNullable<typeof instance> => Boolean(instance));

  const nextSlot: SaveSlot = {
    ...targetSlot,
    updatedAt: now,
    game: {
      ...targetSlot.game,
      inventory: {
        ...targetSlot.game.inventory,
        equipment: Object.fromEntries(
          Object.entries(targetSlot.game.inventory.equipment).map(([slotId, instanceId]) => [slotId, instanceId && removedInstanceIds.has(instanceId) ? null : instanceId]),
        ) as GameState["inventory"]["equipment"],
        equipmentItems: [...keptEquipmentItems, ...previewEquipmentItems],
      },
    },
  };

  const nextRoot: RootSave = {
    ...rootSave,
    recentSlotId: nextSlot.id,
    slots: rootSave.slots.map((slot) => (slot?.id === nextSlot.id ? nextSlot : slot)),
  };
  persistRootSave(nextRoot);
  clearGradePreviewQueryParam();
  return nextRoot;
}

function clearGradePreviewQueryParam(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(gradePreviewQueryParam);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function normalizeCombat(combat: CombatState): CombatState {
  return {
    ...combat,
    rank: normalizeEnemyRank(combat.rank, combat.groupId),
    allies: combat.allies.map(normalizeCombatActor),
    enemies: combat.enemies.map(normalizeCombatActor),
    rewards: {
      ...combat.rewards,
      items: combat.rewards.items.map((item) => ({ ...item, itemId: normalizeItemId(item.itemId) })),
    },
  };
}

function normalizeEnemyRank(rank: unknown, groupId: string): EnemyRank {
  if (rank === "normal" || rank === "elite" || rank === "boss") {
    return rank;
  }
  return enemyGroups.find((group) => group.id === groupId)?.rank ?? "normal";
}

function normalizeCombatActor(actor: CombatActor): CombatActor {
  return {
    ...actor,
    ...normalizeStats(actor, { dodgeRate: getDefaultDodge(actor.kind) }),
  };
}
