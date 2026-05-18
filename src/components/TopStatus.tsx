import { getRealm } from "../data/progression";
import { getEffectivePower } from "../game/equipment";
import type { GameState } from "../types";
import { GameIcon } from "./GameIcon";

export function TopStatus({ game, onExit }: { game: GameState; onExit: () => void }) {
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
        <button className="icon-button" aria-label="返回主菜单" title="返回主菜单" onClick={onExit}>
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
          心境 {game.player.mood}
        </span>
      </div>
      <div className="status-meter-grid">
        <StatusMeter icon="resource-life" label="寿元" value={game.player.lifespanCurrent} max={game.player.lifespanMax} tone="gold" />
        <StatusMeter icon="resource-spirit" label="修为" value={game.player.cultivation} max={realm.requiredCultivation} tone="primary" />
      </div>
    </header>
  );
}

function StatusMeter({
  icon,
  label,
  value,
  max,
  tone,
}: {
  icon: "resource-life" | "resource-spirit";
  label: string;
  value: number;
  max: number;
  tone: "primary" | "gold";
}) {
  const percent = Math.max(0, Math.min(100, Math.floor((value / Math.max(1, max)) * 100)));
  return (
    <div className={`status-meter ${tone}`}>
      <div className="status-meter-label">
        <span>
          <GameIcon name={icon} size={13} />
          {label}
        </span>
        <strong>
          {value}/{max}
        </strong>
      </div>
      <div className="status-meter-track">
        <div style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
