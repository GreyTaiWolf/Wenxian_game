import type { CombatActor, CombatState, GameState, RootSave, SaveSlot, SettingsState } from "../types";
import { normalizeGridNavigationState } from "../data/gridMaps";
import { itemGradeOrder, normalizeItemId } from "../data/items";
import { normalizeCaveState } from "./cave";
import { normalizeCalendarDate, normalizeWeatherState, normalizeWorldEventState } from "./time";
import { createEquipmentInstance, normalizeInventoryState } from "./equipment";
import { normalizeShopStates } from "./shop";
import { createNewGame, getDefaultDodge, normalizePlayerState, normalizeStats } from "./state";

export const SAVE_KEY = "xiuxian-text-rpg-save-slots-v1";
export const SAVE_BACKUP_BEFORE_ZUSTAND_KEY = `${SAVE_KEY}-backup-before-zustand`;

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
    version: 3,
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
    return normalizeRootSave(JSON.parse(raw));
  } catch {
    return createEmptyRootSave();
  }
}

export function normalizeRootSave(input: unknown): RootSave {
  const parsed = unwrapPersistedRootSave(input);
  if (!isRootSaveLike(parsed)) {
    return createEmptyRootSave();
  }
  const normalizedRoot = {
    ...createEmptyRootSave(),
    ...parsed,
    version: 3 as const,
    settings: { ...defaultSettings, ...parsed.settings },
    slots: [normalizeSlot(parsed.slots[0]), normalizeSlot(parsed.slots[1]), normalizeSlot(parsed.slots[2])],
  };
  return shouldInjectGradePreviewEquipment() ? injectGradePreviewEquipment(normalizedRoot) : normalizedRoot;
}

export function persistRootSave(rootSave: RootSave): void {
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(rootSave));
}

export function backupRawRootSaveBeforeZustand(raw: string): void {
  if (typeof window === "undefined") {
    return;
  }
  if (window.localStorage.getItem(SAVE_BACKUP_BEFORE_ZUSTAND_KEY)) {
    return;
  }
  window.localStorage.setItem(SAVE_BACKUP_BEFORE_ZUSTAND_KEY, raw);
}

export function isPersistedRootSaveWrapper(input: unknown): boolean {
  if (!input || typeof input !== "object") {
    return false;
  }
  const state = "state" in input ? (input as { state?: unknown }).state : undefined;
  return Boolean(state && typeof state === "object" && "rootSave" in state);
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
  const player = normalizePlayerState(slot.game.player);
  return {
    ...slot,
    game: {
      ...slot.game,
      player: {
        ...player,
        team: (player.team ?? []).map((member) => ({
          ...member,
          stats: normalizeStats(member.stats, { dodgeRate: getDefaultDodge(member.kind) }),
        })),
      },
      combat: slot.game.combat ? normalizeCombat(slot.game.combat) : undefined,
      inventory: {
        ...normalizeInventoryState(slot.game.inventory),
      },
      world: {
        ...slot.game.world,
        calendar: normalizeCalendarDate(slot.game.world?.calendar),
        weather: normalizeWeatherState(slot.game.world?.weather, normalizeCalendarDate(slot.game.world?.calendar).dayIndex),
        events: normalizeWorldEventState(slot.game.world?.events),
        shops: normalizeShopStates(slot.game.world?.shops),
        navigation: normalizeGridNavigationState(slot.game.world?.navigation),
      },
      cave: normalizeCaveState(slot.game.cave),
    },
  };
}

function unwrapPersistedRootSave(input: unknown): unknown {
  if (!input || typeof input !== "object") {
    return input;
  }
  const state = "state" in input ? (input as { state?: unknown }).state : undefined;
  if (state && typeof state === "object" && "rootSave" in state) {
    return (state as { rootSave?: unknown }).rootSave;
  }
  if ("rootSave" in input) {
    return (input as { rootSave?: unknown }).rootSave;
  }
  return input;
}

function isRootSaveLike(input: unknown): input is Partial<RootSave> & Pick<RootSave, "slots"> {
  if (!input || typeof input !== "object") {
    return false;
  }
  const root = input as Partial<RootSave>;
  return [1, 2, 3].includes(Number(root.version)) && Array.isArray(root.slots);
}

function shouldInjectGradePreviewEquipment(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
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
  clearGradePreviewQueryParam();
  return nextRoot;
}

function clearGradePreviewQueryParam(): void {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.delete(gradePreviewQueryParam);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function normalizeCombat(combat: CombatState): CombatState {
  return {
    ...combat,
    allies: combat.allies.map(normalizeCombatActor),
    enemies: combat.enemies.map(normalizeCombatActor),
    rewards: {
      ...combat.rewards,
      items: combat.rewards.items.map((item) => ({ ...item, itemId: normalizeItemId(item.itemId) })),
    },
  };
}

function normalizeCombatActor(actor: CombatActor): CombatActor {
  return {
    ...actor,
    ...normalizeStats(actor, { dodgeRate: getDefaultDodge(actor.kind) }),
  };
}
