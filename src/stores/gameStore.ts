import { useSaveStore } from "./saveStore";
import type { GameState, SaveSlot } from "../types";

export function getActiveSlot(): SaveSlot | null {
  const rootSave = useSaveStore.getState().rootSave;
  return rootSave.slots.find((slot) => slot?.id === rootSave.recentSlotId) ?? null;
}

export function updateGame(next: GameState | ((prev: GameState) => GameState)): void {
  useSaveStore.getState().updateGame(next);
}

export function setGame(game: GameState): void {
  useSaveStore.getState().setGame(game);
}

export function useActiveSlot(): SaveSlot | null {
  return useSaveStore((state) => state.rootSave.slots.find((slot) => slot?.id === state.rootSave.recentSlotId) ?? null);
}

export function useActiveGame(): GameState | null {
  return useSaveStore((state) => state.rootSave.slots.find((slot) => slot?.id === state.rootSave.recentSlotId)?.game ?? null);
}

export function useSettings() {
  return useSaveStore((state) => state.rootSave.settings);
}

export function useUpdateGame() {
  return useSaveStore((state) => state.updateGame);
}
