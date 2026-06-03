import { AnimatePresence } from "motion/react";
import { useEffect, useRef } from "react";
import { WORLD_GRID_MAP_ID } from "../data/gridMaps";
import { appendLog } from "../game/state";
import type { PrimaryModule } from "../types";
import { useCombatUiStore } from "../stores/combatUiStore";
import { useActiveGame, useSettings, useUpdateGame } from "../stores/gameStore";
import { useMapUiStore } from "../stores/mapUiStore";
import { useUiStore } from "../stores/uiStore";
import { BottomNav, isModuleUnlocked } from "./BottomNav";
import CavePanel from "./CavePanel";
import CombatView from "./CombatView";
import CultivationPanel from "./CultivationPanel";
import ExplorePanel from "./ExplorePanel";
import InventoryPanel from "./InventoryPanel";
import SectPanel from "./SectPanel";
import { TopStatus } from "./TopStatus";
import { MotionPage } from "./ui";

export default function GameScreen() {
  const activeGame = useActiveGame();
  const settings = useSettings();
  const updateGame = useUpdateGame();
  const activeModule = useUiStore((state) => state.activeModule);
  const setActiveModule = useUiStore((state) => state.setActiveModule);
  const setScreen = useUiStore((state) => state.setScreen);
  const setMapView = useMapUiStore((state) => state.setView);
  const setSelectedWorldPoiId = useMapUiStore((state) => state.setSelectedWorldPoiId);
  const setActiveSceneHotspotId = useMapUiStore((state) => state.setActiveSceneHotspotId);
  const setTravel = useMapUiStore((state) => state.setTravel);
  const syncCombat = useCombatUiStore((state) => state.syncCombat);
  const combatActive = Boolean(activeGame?.combat);
  const activeMapId = activeGame?.world.navigation.activeMapId ?? WORLD_GRID_MAP_ID;
  const wasInCombatRef = useRef(false);

  useEffect(() => {
    if (combatActive) {
      wasInCombatRef.current = true;
      if (activeModule !== "explore") {
        setActiveModule("explore");
      }
      return;
    }
    if (!wasInCombatRef.current) {
      return;
    }
    wasInCombatRef.current = false;
    if (activeModule !== "explore") {
      setActiveModule("explore");
    }
    setMapView(activeMapId === WORLD_GRID_MAP_ID ? "world" : "location");
    setSelectedWorldPoiId(null);
    setActiveSceneHotspotId(null);
    setTravel(null);
    syncCombat(null);
  }, [activeMapId, activeModule, combatActive, setActiveModule, setActiveSceneHotspotId, setMapView, setSelectedWorldPoiId, setTravel, syncCombat]);

  if (!activeGame) {
    return null;
  }
  const game = activeGame;

  function selectModule(moduleId: PrimaryModule) {
    if (!isModuleUnlocked(game, moduleId)) {
      updateGame(appendLog(game, "此系统尚未解锁，继续提升境界或推进任务。"));
      return;
    }
    setActiveModule(moduleId);
  }

  return (
    <main className="game-shell">
      <TopStatus game={game} onExit={() => setScreen("menu")} />
      <section className="content-area">
        <AnimatePresence mode="wait" initial={false}>
          {game.combat ? (
            <MotionPage key="combat" motionEnabled={settings.motion}>
              <CombatView />
            </MotionPage>
          ) : (
            <MotionPage key={activeModule} motionEnabled={settings.motion}>
              {activeModule === "cultivation" ? <CultivationPanel /> : null}
              {activeModule === "inventory" ? <InventoryPanel /> : null}
              {activeModule === "explore" ? <ExplorePanel /> : null}
              {activeModule === "cave" ? <CavePanel game={game} onChange={updateGame} /> : null}
              {activeModule === "sect" ? <SectPanel game={game} /> : null}
            </MotionPage>
          )}
        </AnimatePresence>
      </section>
      <BottomNav game={game} activeModule={activeModule} onSelect={selectModule} />
    </main>
  );
}
