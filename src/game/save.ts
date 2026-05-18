import type { CombatActor, CombatState, GameState, RootSave, SaveSlot, SettingsState } from "../types";
import { normalizeInventoryItemId, normalizeItemId } from "../data/items";
import { normalizeCaveState } from "./cave";
import { normalizeEquipmentSlots } from "./equipment";
import { createNewGame, getDefaultDodge, normalizeCombatLoadout, normalizeStats } from "./state";

export const SAVE_KEY = "xiuxian-text-rpg-save-slots-v1";

const defaultSettings: SettingsState = {
  textSize: "normal",
  motion: true,
  autoSave: true,
};

export function createEmptyRootSave(): RootSave {
  return {
    version: 1,
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
    if (parsed.version !== 1 || !Array.isArray(parsed.slots)) {
      return createEmptyRootSave();
    }
    return {
      ...createEmptyRootSave(),
      ...parsed,
      settings: { ...defaultSettings, ...parsed.settings },
      slots: [normalizeSlot(parsed.slots[0]), normalizeSlot(parsed.slots[1]), normalizeSlot(parsed.slots[2])],
    };
  } catch {
    return createEmptyRootSave();
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
  const player = slot.game.player;
  return {
    ...slot,
    game: {
      ...slot.game,
      player: {
        ...player,
        stats: normalizeStats(player.stats, { dodge: getDefaultDodge("player") }),
        combatLoadout: normalizeCombatLoadout(player),
        team: (player.team ?? []).map((member) => ({
          ...member,
          stats: normalizeStats(member.stats, { dodge: getDefaultDodge(member.kind) }),
        })),
      },
      combat: slot.game.combat ? normalizeCombat(slot.game.combat) : undefined,
      inventory: {
        ...slot.game.inventory,
        items: normalizeInventoryItems(slot.game.inventory?.items),
        equipment: normalizeEquipmentSlots(slot.game.inventory?.equipment),
      },
      cave: normalizeCaveState(slot.game.cave),
    },
  };
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
    ...normalizeStats(actor, { dodge: getDefaultDodge(actor.kind) }),
  };
}

function normalizeInventoryItems(rawItems: Record<string, number> | undefined): Record<string, number> {
  const source = rawItems ?? {};
  const normalized: Record<string, number> = {};

  Object.entries(source).forEach(([rawItemId, rawAmount]) => {
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    const itemId = normalizeInventoryItemId(rawItemId);
    if (!itemId) {
      return;
    }
    normalized[itemId] = (normalized[itemId] ?? 0) + amount;
  });

  return normalized;
}
