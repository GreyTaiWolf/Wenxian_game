import { useState } from "react";
import { getRealm } from "../data/progression";
import { getEffectivePower } from "../game/equipment";
import { formatCalendar, formatRegionWeather } from "../game/time";
import type { GameState } from "../types";
import { GameIcon } from "./GameIcon";
import { GameSettingsDialog } from "./GameSettingsDialog";

export function TopStatus({ game, onExit }: { game: GameState; onExit: () => void }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const realm = getRealm(game.player.realmId);
  return (
    <header className="top-status">
      <div className="identity-row">
        <div>
          <strong>{game.player.name}</strong>
          <span>
            <GameIcon name="realm" size={14} />
            {realm.name}
          </span>
        </div>
        <button className="icon-button" aria-label="设置" title="设置" onClick={() => setSettingsOpen(true)}>
          <GameIcon name="action-settings" size={18} />
        </button>
      </div>
      <div className="status-grid">
        <span>
          <GameIcon name="resource-power" size={15} />
          战力 {getEffectivePower(game)}
        </span>
        <span>
          <GameIcon name="resource-stones" size={15} />
          灵石 {game.player.spiritStones}
        </span>
        <span>
          <GameIcon name="resource-mood" size={15} />
          心境 {getMindLabel(game.player.mindValue)}
        </span>
        <span>
          <GameIcon name="module-explore" size={15} />
          {formatCalendar(game.world.calendar)}
        </span>
        <span>
          <GameIcon name="system-spirit-field" size={15} />
          天气 {formatRegionWeather(game.world.weather, game.world.regionId)}
        </span>
        <span>
          <GameIcon name="resource-life" size={15} />
          寿元 {Number(game.player.age.toFixed(2))}/{game.player.lifespan}
        </span>
      </div>
      <GameSettingsDialog game={game} open={settingsOpen} onOpenChange={setSettingsOpen} onExitToMenu={onExit} />
    </header>
  );
}

function getMindLabel(value: number): string {
  if (value >= 70) {
    return "清明";
  }
  if (value >= 45) {
    return "稳定";
  }
  if (value >= 25) {
    return "波动";
  }
  return "紊乱";
}
