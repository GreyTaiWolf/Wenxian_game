import { getRealm } from "../data/progression";
import type { GameState } from "../types";
import { GameIcon } from "./GameIcon";

export default function CavePanel({ game }: { game: GameState }) {
  const realm = getRealm(game.player.realmId);
  return (
    <section className="module-panel">
      <div className="section-heading">
        <h2>
          <GameIcon name="module-cave" size={18} />
          闭关室
        </h2>
        <span>{realm.name}</span>
      </div>
      <div className="feature-grid">
        <Feature icon="module-cultivation" label="闭关效率" value="修为 +12 / 分钟" />
        <Feature icon="resource-life" label="最长闭关" value="8 小时" />
        <Feature icon="system-spirit-field" label="当前加成" value="聚灵阵 +0%" />
        <Feature icon="system-alchemy" label="丹炉" value="后续开放" />
      </div>
      <div className="feature-box">
        <button disabled>
          <GameIcon name="module-cave" size={16} />
          开始闭关
        </button>
        <small>v1 已开放入口，离线闭关结算留作下一步。</small>
      </div>
    </section>
  );
}

function Feature({
  icon,
  label,
  value,
}: {
  icon: "module-cultivation" | "resource-life" | "system-spirit-field" | "system-alchemy";
  label: string;
  value: string;
}) {
  return (
    <article className="feature-tile">
      <GameIcon name={icon} size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
