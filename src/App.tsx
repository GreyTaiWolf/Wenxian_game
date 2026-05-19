import { useEffect, useMemo, useState } from "react";
import GameScreen from "./components/GameScreen";
import MainMenu from "./components/MainMenu";
import { createEmptyRootSave, createSlot, deleteSlot, loadRootSave, persistRootSave, updateSlotGame } from "./game/save";
import type { GameState, RootSave, SettingsState } from "./types";

export default function App() {
  const [rootSave, setRootSave] = useState<RootSave>(() => {
    if (typeof window === "undefined") {
      return createEmptyRootSave();
    }
    return loadRootSave();
  });
  const [screen, setScreen] = useState<"menu" | "game">("menu");

  const activeSlot = useMemo(() => {
    return rootSave.slots.find((slot) => slot?.id === rootSave.recentSlotId) ?? null;
  }, [rootSave.recentSlotId, rootSave.slots]);

  useEffect(() => {
    if (rootSave.settings.autoSave) {
      persistRootSave(rootSave);
    }
  }, [rootSave]);

  function createGame(slotIndex: number, name: string) {
    const slot = createSlot(slotIndex, name);
    const nextSave: RootSave = {
      ...rootSave,
      recentSlotId: slot.id,
      slots: rootSave.slots.map((current, index) => (index === slotIndex ? slot : current)),
    };
    setRootSave(nextSave);
    persistRootSave(nextSave);
    setScreen("game");
  }

  function updateGame(next: GameState | ((prev: GameState) => GameState)) {
    if (!activeSlot) {
      return;
    }
    setRootSave((current) => {
      const slot = current.slots.find((item) => item?.id === activeSlot.id);
      if (!slot) {
        return current;
      }
      const game = typeof next === "function" ? next(slot.game) : next;
      return updateSlotGame(current, activeSlot.id, game);
    });
  }

  function updateSettings(settings: SettingsState) {
    const nextSave = { ...rootSave, settings };
    setRootSave(nextSave);
    persistRootSave(nextSave);
  }

  function removeSlot(slotId: string) {
    const nextSave = deleteSlot(rootSave, slotId);
    setRootSave(nextSave);
    persistRootSave(nextSave);
    if (rootSave.recentSlotId === slotId) {
      setScreen("menu");
    }
  }

  return (
    <div className={`app-frame text-${rootSave.settings.textSize} ${rootSave.settings.motion ? "motion-on" : "motion-off"}`}>
      {screen === "menu" || !activeSlot ? (
        <MainMenu
          rootSave={rootSave}
          onContinue={() => activeSlot && setScreen("game")}
          onCreate={createGame}
          onDelete={removeSlot}
          onUpdateSettings={updateSettings}
        />
      ) : (
        <GameScreen game={activeSlot.game} onChange={updateGame} onExit={() => setScreen("menu")} />
      )}
    </div>
  );
}
