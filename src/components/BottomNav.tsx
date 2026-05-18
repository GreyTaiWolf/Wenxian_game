import type { GameState, PrimaryModule } from "../types";
import { GameIcon, type GameIconName } from "./GameIcon";

const navItems: Array<{ id: PrimaryModule; label: string; icon: GameIconName }> = [
  { id: "cultivation", label: "修炼", icon: "module-cultivation" },
  { id: "inventory", label: "背包", icon: "module-inventory" },
  { id: "explore", label: "历练", icon: "module-explore" },
  { id: "cave", label: "洞府", icon: "module-cave" },
  { id: "sect", label: "宗门", icon: "module-sect" },
];

export function isModuleUnlocked(game: GameState, moduleId: PrimaryModule): boolean {
  if (moduleId === "sect") {
    return game.world.sectJoined || game.player.unlocks.includes("sect");
  }
  return game.player.unlocks.includes(moduleId);
}

export function BottomNav({
  game,
  activeModule,
  onSelect,
}: {
  game: GameState;
  activeModule: PrimaryModule;
  onSelect: (moduleId: PrimaryModule) => void;
}) {
  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const unlocked = isModuleUnlocked(game, item.id);
        return (
          <button
            key={item.id}
            className={activeModule === item.id ? "active" : ""}
            disabled={!unlocked}
            title={unlocked ? item.label : "尚未解锁"}
            onClick={() => onSelect(item.id)}
          >
            <GameIcon name={item.icon} size={18} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
