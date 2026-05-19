import { useState } from "react";
import { attemptBreakthrough, cultivate, appendLog } from "../game/state";
import type { GameState, PrimaryModule } from "../types";
import { BottomNav, isModuleUnlocked } from "./BottomNav";
import CavePanel from "./CavePanel";
import CombatView from "./CombatView";
import CultivationPanel from "./CultivationPanel";
import ExplorePanel from "./ExplorePanel";
import InventoryPanel from "./InventoryPanel";
import SectPanel from "./SectPanel";
import { TopStatus } from "./TopStatus";

export default function GameScreen({
  game,
  onChange,
  onExit,
}: {
  game: GameState;
  onChange: (next: GameState | ((prev: GameState) => GameState)) => void;
  onExit: () => void;
}) {
  const [activeModule, setActiveModule] = useState<PrimaryModule>("cultivation");

  function selectModule(moduleId: PrimaryModule) {
    if (!isModuleUnlocked(game, moduleId)) {
      onChange(appendLog(game, "此系统尚未解锁，继续提升境界或推进任务。"));
      return;
    }
    setActiveModule(moduleId);
  }

  return (
    <main className="game-shell">
      <TopStatus game={game} onExit={onExit} />
      <section className="content-area">
        {game.combat ? (
          <CombatView game={game} onChange={onChange} />
        ) : (
          <>
            {activeModule === "cultivation" ? (
              <CultivationPanel
                game={game}
                onBreakthrough={() => onChange(attemptBreakthrough(game))}
                onCultivate={() => onChange(cultivate(game))}
              />
            ) : null}
            {activeModule === "inventory" ? <InventoryPanel game={game} onChange={onChange} /> : null}
            {activeModule === "explore" ? <ExplorePanel game={game} onChange={onChange} /> : null}
            {activeModule === "cave" ? <CavePanel game={game} onChange={onChange} /> : null}
            {activeModule === "sect" ? <SectPanel game={game} /> : null}
          </>
        )}
      </section>
      <BottomNav game={game} activeModule={activeModule} onSelect={selectModule} />
    </main>
  );
}
