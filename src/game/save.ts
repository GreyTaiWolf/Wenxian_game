import type { CombatActor, CombatReturnContext, CombatState, GameState, GridCoord, RootSave, SaveSlot, SettingsState } from "../types";
import { normalizeGridNavigationState } from "../data/gridMaps";
import { itemGradeOrder, normalizeItemId } from "../data/items";
import { normalizeNpcWorldState } from "../data/npcs";
import { normalizeCaveState } from "./cave";
import { syncActivePetToTeam } from "./beastStable";
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
const defaultCombatMaxRounds = 35;

export function createEmptyRootSave(): RootSave {
  return {
    version: 6,
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
    version: 6 as const,
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
  const calendar = normalizeCalendarDate(slot.game.world?.calendar);
  const gameWithNormalizedState: GameState = {
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
        calendar,
        weather: normalizeWeatherState(slot.game.world?.weather, calendar.dayIndex),
        events: normalizeWorldEventState(slot.game.world?.events),
        shops: normalizeShopStates(slot.game.world?.shops),
        learnedEquipmentRecipes: normalizeLearnedEquipmentRecipes(slot.game.world?.learnedEquipmentRecipes),
        npcs: normalizeNpcWorldState(slot.game.world?.npcs, calendar.dayIndex),
        navigation: normalizeGridNavigationState(slot.game.world?.navigation),
      },
      cave: normalizeCaveState(slot.game.cave, player.team),
    };
  const normalizedGame = syncActivePetToTeam(gameWithNormalizedState);

  return {
    ...slot,
    game: normalizedGame,
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
  return [1, 2, 3, 4, 5, 6].includes(Number(root.version)) && Array.isArray(root.slots);
}

function normalizeLearnedEquipmentRecipes(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, learned]) => learned === true).map(([recipeId]) => [recipeId, true]));
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
  const combatType = combat.combatType ?? "normal";
  const allies = combat.allies.map(normalizeCombatActor);
  const enemies = combat.enemies.map(normalizeCombatActor);
  const turnOrder = Array.isArray(combat.turnOrder) ? combat.turnOrder.filter((actorId) => typeof actorId === "string") : [];
  return {
    ...combat,
    combatType,
    timeoutResult: combat.timeoutResult ?? (combatType === "survival" ? "victory" : combatType === "normal" ? "escape" : "defeat"),
    maxRounds: normalizeNonNegativeInt(combat.maxRounds, defaultCombatMaxRounds, 1),
    preparationComplete: combat.preparationComplete ?? true,
    turnIndex: normalizeNonNegativeInt(combat.turnIndex, 0),
    round: normalizeNonNegativeInt(combat.round, 1, 0),
    lastRoundStarted: typeof combat.lastRoundStarted === "number" && Number.isFinite(combat.lastRoundStarted) ? Math.max(0, Math.floor(combat.lastRoundStarted)) : undefined,
    allies,
    enemies,
    turnOrder: turnOrder.length ? turnOrder : [...allies, ...enemies].filter((actor) => actor.hp > 0).sort((a, b) => b.speed - a.speed).map((actor) => actor.id),
    rewards: {
      ...combat.rewards,
      cultivation: normalizeNonNegativeInt(combat.rewards?.cultivation, 0),
      spiritStones: normalizeNonNegativeInt(combat.rewards?.spiritStones, 0),
      items: (combat.rewards?.items ?? []).map((item) => ({ ...item, itemId: normalizeItemId(item.itemId), amount: normalizeNonNegativeInt(item.amount, 1, 1) })),
    },
    returnContext: normalizeCombatReturnContext(combat.returnContext),
  };
}

function normalizeCombatReturnContext(context: CombatReturnContext | undefined): CombatReturnContext | undefined {
  if (!context || typeof context !== "object") {
    return undefined;
  }
  if (typeof context.regionId !== "string" || typeof context.locationId !== "string" || typeof context.sceneId !== "string" || typeof context.activeMapId !== "string") {
    return undefined;
  }
  return {
    regionId: context.regionId,
    locationId: context.locationId,
    sceneId: context.sceneId,
    activeMapId: context.activeMapId,
    position: normalizeGridCoord(context.position),
  };
}

function normalizeGridCoord(coord: GridCoord | undefined): GridCoord | undefined {
  if (!coord || typeof coord.x !== "number" || typeof coord.y !== "number" || !Number.isFinite(coord.x) || !Number.isFinite(coord.y)) {
    return undefined;
  }
  return {
    x: Math.floor(coord.x),
    y: Math.floor(coord.y),
  };
}

function normalizeCombatActor(actor: CombatActor): CombatActor {
  const stats = normalizeStats(actor, { dodgeRate: getDefaultDodge(actor.kind) });
  return {
    ...actor,
    ...stats,
    baseStats: actor.baseStats ? normalizeStats(actor.baseStats, { dodgeRate: getDefaultDodge(actor.kind) }) : stats,
    combatAffixes: Array.isArray(actor.combatAffixes) ? actor.combatAffixes : Array.isArray(actor.equipmentAffixes) ? actor.equipmentAffixes : [],
    equipmentAffixes: Array.isArray(actor.equipmentAffixes) ? actor.equipmentAffixes : Array.isArray(actor.combatAffixes) ? actor.combatAffixes : [],
    equipmentSeals: Array.isArray(actor.equipmentSeals)
      ? actor.equipmentSeals.map((seal) => ({
          ...seal,
          remainingRounds: normalizeNonNegativeInt(seal.remainingRounds, 0),
        }))
      : [],
    basicAttackDisabledActions: normalizeNonNegativeInt(actor.basicAttackDisabledActions, 0),
    skillDisabledActions: normalizeNonNegativeInt(actor.skillDisabledActions, 0),
    artifactDisabledActions: normalizeNonNegativeInt(actor.artifactDisabledActions, 0),
    pillDisabledActions: normalizeNonNegativeInt(actor.pillDisabledActions, 0),
    reviveDisabledActions: normalizeNonNegativeInt(actor.reviveDisabledActions, 0),
    shield: normalizeNonNegativeInt(actor.shield, 0),
    burnTurns: normalizeNonNegativeInt(actor.burnTurns, 0),
    burnDamage: normalizeNonNegativeInt(actor.burnDamage, 0),
    poisonTurns: normalizeNonNegativeInt(actor.poisonTurns, 0),
    poisonDamage: normalizeNonNegativeInt(actor.poisonDamage, 0),
    speedUpTurns: normalizeNonNegativeInt(actor.speedUpTurns, 0),
    speedUpAmount: normalizeNonNegativeInt(actor.speedUpAmount, 0),
    dodgeUpTurns: normalizeNonNegativeInt(actor.dodgeUpTurns, 0),
    dodgeUpAmount: normalizeNonNegativeInt(actor.dodgeUpAmount, 0),
    soulLockedTurns: normalizeNonNegativeInt(actor.soulLockedTurns, 0),
  };
}

function normalizeNonNegativeInt(value: unknown, fallback: number, min = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.floor(value)) : fallback;
}
