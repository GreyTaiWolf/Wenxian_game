import { useState, type CSSProperties } from "react";
import { describeCost } from "../game/state";
import { getNextRealm, getRealm } from "../data/progression";
import type { GameState } from "../types";
import { GameIcon } from "./GameIcon";

export default function CultivationPanel({
  game,
  onBreakthrough,
  onCultivate,
}: {
  game: GameState;
  onBreakthrough: () => void;
  onCultivate: () => void;
}) {
  const realm = getRealm(game.player.realmId);
  const nextRealm = getNextRealm(game.player.realmId);
  const multiplier = game.world.sectJoined ? 112 : 100;
  const progress = Math.min(100, Math.floor((game.player.cultivation / realm.requiredCultivation) * 100));
  const remaining = Math.max(0, realm.requiredCultivation - game.player.cultivation);
  const [pulseKey, setPulseKey] = useState(0);

  function handleCultivate() {
    setPulseKey((key) => key + 1);
    onCultivate();
  }

  return (
    <section className="module-panel">
      <div className="sub-tabs">
        <button className="active">
          <GameIcon name="module-cultivation" size={15} />
          聚气
        </button>
        <button disabled>
          <GameIcon name="system-library" size={15} />
          功法
        </button>
        <button disabled>
          <GameIcon name="equipment-treasure" size={15} />
          神通
        </button>
        <button disabled>
          <GameIcon name="resource-power" size={15} />
          强化
        </button>
        <button disabled>
          <GameIcon name="resource-spirit" size={15} />
          洗髓
        </button>
        <button disabled>
          <GameIcon name="realm" size={15} />
          本命
        </button>
      </div>
      <div className="cultivation-core">
        <div className="cultivation-metrics">
          <p>
            <GameIcon name="module-cultivation" size={15} />
            当前：打坐聚气
          </p>
          <p>
            <GameIcon name="resource-spirit" size={15} />
            聚气效率：+1 修为 / 次
          </p>
          <p>
            <GameIcon name="resource-power" size={15} />
            修炼倍率：{multiplier}%
          </p>
          <p>
            <GameIcon name="realm" size={15} />
            突破准备：{nextRealm ? describeCost(nextRealm.breakthroughCost) : "暂无"}
          </p>
        </div>
        <button className="qi-button" style={{ "--qi-progress": `${progress}%` } as CSSProperties} onClick={handleCultivate}>
          <span className="qi-button-fill" aria-hidden="true" />
          <GameIcon name="module-cultivation" size={24} />
          <span className="qi-button-text">聚 气</span>
          <small className="qi-progress-text">
            {game.player.cultivation}/{realm.requiredCultivation}
          </small>
          {pulseKey > 0 ? <span key={pulseKey} className="qi-button-pulse" aria-hidden="true" /> : null}
        </button>
        <div className="mini-stats">
          <span>今日聚气：{game.player.dailyCultivationCount} 次</span>
          <span>功法加成：{game.world.sectJoined ? "青云吐纳 +12%" : "未入门"}</span>
          <span>{nextRealm ? `下一境界：${nextRealm.name}` : "版本尽头"}</span>
        </div>
        <div className="breakthrough-inline">
          <span>{nextRealm ? `距离突破 ${remaining} 修为` : "已达版本境界尽头"}</span>
          <button className="gold-button" disabled={remaining > 0 || !nextRealm} onClick={onBreakthrough}>
            <GameIcon name="module-cultivation" size={15} />
            尝试突破
          </button>
        </div>
      </div>
      <LogList logs={game.world.logs} title="修行日志" />
    </section>
  );
}

export function LogList({ logs, title = "日志" }: { logs: string[]; title?: string }) {
  return (
    <section className="log-panel">
      <div className="section-heading">
        <h2>
          <GameIcon name="combat-log" size={18} />
          {title}
        </h2>
        <span>{logs.length}</span>
      </div>
      <div className="log-list">
        {logs.slice(0, 6).map((log, index) => (
          <p key={`${log}-${index}`}>{log}</p>
        ))}
      </div>
    </section>
  );
}
