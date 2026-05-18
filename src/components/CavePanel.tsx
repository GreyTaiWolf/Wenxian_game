import { useEffect, useState } from "react";
import { getNextSpiritArrayConfig, getSpiritArrayConfig } from "../data/cave";
import { getRealm } from "../data/progression";
import { claimMeditation, getMeditationPreview, normalizeCaveState, startMeditation, upgradeSpiritArray } from "../game/cave";
import { describeCost } from "../game/state";
import type { GameState } from "../types";
import { GameIcon, type GameIconName } from "./GameIcon";

export default function CavePanel({ game, onChange }: { game: GameState; onChange: (game: GameState) => void }) {
  const [now, setNow] = useState(() => new Date());
  const cave = normalizeCaveState(game.cave);
  const realm = getRealm(game.player.realmId);
  const preview = getMeditationPreview({ ...game, cave }, now);
  const currentArray = getSpiritArrayConfig(cave.spiritArrayLevel);
  const nextArray = getNextSpiritArrayConfig(cave.spiritArrayLevel);
  const progress = Math.min(100, Math.floor((preview.effectiveMinutes / Math.max(1, preview.maxMinutes)) * 100));
  const arrayBonus = Math.round((currentArray.multiplier - 1) * 100);

  useEffect(() => {
    setNow(new Date());
    if (!cave.meditationStartedAt) {
      return;
    }
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, [cave.meditationStartedAt]);

  return (
    <section className="module-panel cave-panel">
      <div className="section-heading">
        <h2>
          <GameIcon name="module-cave" size={18} />
          洞府
        </h2>
        <span>{realm.name}</span>
      </div>

      <div className="feature-grid">
        <Feature icon="module-cultivation" label="闭关效率" value={`修为 +${formatRate(preview.ratePerMinute)} / 分钟`} />
        <Feature icon="resource-life" label="最长闭关" value={formatDuration(preview.maxMinutes)} />
        <Feature icon="system-spirit-field" label="当前加成" value={`聚灵阵 +${arrayBonus}%`} />
        <Feature icon="combat-log" label="累计闭关" value={formatDuration(cave.totalMeditationMinutes)} />
      </div>

      <section className="cave-status-card">
        <div className="section-heading">
          <h2>
            <GameIcon name="module-cultivation" size={18} />
            闭关状态
          </h2>
          <span>{preview.isActive ? "闭关中" : "未闭关"}</span>
        </div>
        <div className="cave-detail-grid">
          <Metric label="已闭关" value={preview.isActive ? formatDuration(preview.elapsedMinutes) : "未开始"} />
          <Metric label="有效时间" value={formatDuration(preview.effectiveMinutes)} />
          <Metric label="预计修为" value={`+${preview.potentialCultivation}`} />
          <Metric label="可领取" value={`+${preview.claimableCultivation}`} />
        </div>
        <div className="cave-progress-track" aria-label="闭关时间进度">
          <div style={{ width: `${progress}%` }} />
        </div>
        <p className="cave-hint">
          {preview.remainingCultivation <= 0
            ? "当前境界修为已满，先完成突破再继续闭关。"
            : preview.cappedByTime
              ? "闭关已达到当前聚灵阵上限，可以出关领取。"
              : preview.isActive
                ? "洞府已封门，离线期间也会继续累计闭关时间。"
                : "开始闭关后会记录时间，回到洞府时可领取修为。"}
        </p>
        <button
          className="primary-action compact"
          type="button"
          onClick={() => onChange(preview.isActive ? claimMeditation(game, new Date()) : startMeditation(game, new Date()))}
        >
          <GameIcon name={preview.isActive ? "resource-spirit" : "module-cave"} size={18} />
          {preview.isActive ? "领取出关" : "开始闭关"}
          <small>{preview.isActive ? "结算本次闭关修为" : "离线也会累积"}</small>
        </button>
      </section>

      <section className="cave-status-card">
        <div className="section-heading">
          <h2>
            <GameIcon name="system-spirit-field" size={18} />
            聚灵阵
          </h2>
          <span>{currentArray.level} 级</span>
        </div>
        <div className="cave-detail-grid">
          <Metric label="当前倍率" value={`${Math.round(currentArray.multiplier * 100)}%`} />
          <Metric label="时长上限" value={formatDuration(currentArray.maxMeditationMinutes)} />
          <Metric label="下一等级" value={nextArray ? `${nextArray.level} 级` : "已满级"} />
          <Metric label="升级消耗" value={nextArray?.upgradeCost ? describeCost(nextArray.upgradeCost) : "无"} />
        </div>
        <button className="gold-button cave-upgrade-button" type="button" disabled={!nextArray} onClick={() => onChange(upgradeSpiritArray(game))}>
          <GameIcon name="system-spirit-field" size={15} />
          {nextArray ? "升级聚灵阵" : "聚灵阵已满级"}
        </button>
      </section>

      <section className="cave-status-card">
        <div className="section-heading">
          <h2>
            <GameIcon name="system-alchemy" size={18} />
            后续设施
          </h2>
          <span>规划中</span>
        </div>
        <div className="feature-grid cave-facility-grid">
          <Feature icon="system-spirit-field" label="灵田" value="后续开放" />
          <Feature icon="system-alchemy" label="丹炉" value="后续开放" />
          <Feature icon="team" label="灵宠位" value="后续开放" />
          <Feature icon="equipment-treasure" label="洞府禁制" value="后续开放" />
        </div>
      </section>
    </section>
  );
}

function Feature({ icon, label, value }: { icon: GameIconName; label: string; value: string }) {
  return (
    <article className="feature-tile">
      <GameIcon name={icon} size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="cave-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatRate(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) {
    return "0 分钟";
  }
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes > 0 ? `${hours} 小时 ${restMinutes} 分钟` : `${hours} 小时`;
}
