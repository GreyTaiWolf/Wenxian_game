import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import {
  SAVE_KEY,
  backupRawRootSaveBeforeZustand,
  createEmptyRootSave,
  createSlot,
  deleteSlot as deleteRootSaveSlot,
  isPersistedRootSaveWrapper,
  normalizeRootSave,
  updateSlotGame,
} from "../game/save";
import type { GameState, RootSave, SaveSlot, SettingsState } from "../types";

const SAVE_STORE_VERSION = 1;

interface SavePersistedState {
  rootSave: RootSave;
}

interface SaveStoreState {
  rootSave: RootSave;
  persistedRootSave: RootSave;
  createGame: (slotIndex: number, name: string) => SaveSlot;
  deleteSlot: (slotId: string) => void;
  updateSettings: (settings: SettingsState) => void;
  updateGame: (next: GameState | ((prev: GameState) => GameState)) => void;
  setGame: (game: GameState) => void;
  forcePersist: () => void;
}

function getActiveSlot(rootSave: RootSave): SaveSlot | null {
  return rootSave.slots.find((slot) => slot?.id === rootSave.recentSlotId) ?? null;
}

function resolveNextGame(rootSave: RootSave, next: GameState | ((prev: GameState) => GameState)): GameState | null {
  const activeSlot = getActiveSlot(rootSave);
  if (!activeSlot) {
    return null;
  }
  return typeof next === "function" ? next(activeSlot.game) : next;
}

function createStoreStorage(): StateStorage {
  return {
    getItem: (name) => {
      if (typeof window === "undefined") {
        return null;
      }
      const raw = window.localStorage.getItem(name);
      if (!raw) {
        return null;
      }
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (isPersistedRootSaveWrapper(parsed)) {
          return raw;
        }
        const rootSave = normalizeRootSave(parsed);
        backupRawRootSaveBeforeZustand(raw);
        return JSON.stringify({ state: { rootSave }, version: SAVE_STORE_VERSION });
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      if (typeof window === "undefined") {
        return;
      }
      window.localStorage.setItem(name, value);
    },
    removeItem: (name) => {
      if (typeof window === "undefined") {
        return;
      }
      window.localStorage.removeItem(name);
    },
  };
}

function getRootSaveFromPersistedState(persisted: unknown): RootSave {
  if (!persisted || typeof persisted !== "object") {
    return createEmptyRootSave();
  }
  return normalizeRootSave((persisted as Partial<SavePersistedState>).rootSave ?? persisted);
}

const initialRootSave = createEmptyRootSave();

export const useSaveStore = create<SaveStoreState>()(
  persist<SaveStoreState, [], [], SavePersistedState>(
    (set, get) => ({
      rootSave: initialRootSave,
      persistedRootSave: initialRootSave,
      createGame: (slotIndex, name) => {
        const slot = createSlot(slotIndex, name);
        const baseRootSave = get().persistedRootSave;
        const nextRootSave: RootSave = {
          ...baseRootSave,
          recentSlotId: slot.id,
          slots: baseRootSave.slots.map((current, index) => (index === slotIndex ? slot : current)),
        };
        set({ rootSave: nextRootSave, persistedRootSave: nextRootSave });
        return slot;
      },
      deleteSlot: (slotId) => {
        const nextRootSave = deleteRootSaveSlot(get().persistedRootSave, slotId);
        set({ rootSave: nextRootSave, persistedRootSave: nextRootSave });
      },
      updateSettings: (settings) => {
        const rootSave = { ...get().rootSave, settings };
        const persistedRootSave = { ...get().persistedRootSave, settings };
        set({ rootSave, persistedRootSave });
      },
      updateGame: (next) => {
        const currentRootSave = get().rootSave;
        const activeSlot = getActiveSlot(currentRootSave);
        const nextGame = resolveNextGame(currentRootSave, next);
        if (!activeSlot || !nextGame) {
          return;
        }
        const rootSave = updateSlotGame(currentRootSave, activeSlot.id, nextGame);
        const persistedRootSave = currentRootSave.settings.autoSave ? rootSave : get().persistedRootSave;
        set({ rootSave, persistedRootSave });
      },
      setGame: (game) => {
        get().updateGame(game);
      },
      forcePersist: () => {
        set((state) => ({ persistedRootSave: state.rootSave }));
      },
    }),
    {
      name: SAVE_KEY,
      version: SAVE_STORE_VERSION,
      storage: createJSONStorage(createStoreStorage),
      partialize: (state) => ({ rootSave: state.persistedRootSave }),
      migrate: (persisted) => ({ rootSave: getRootSaveFromPersistedState(persisted) }),
      merge: (persisted, current) => {
        const rootSave = getRootSaveFromPersistedState(persisted);
        return {
          ...current,
          rootSave,
          persistedRootSave: rootSave,
        };
      },
    },
  ),
);
