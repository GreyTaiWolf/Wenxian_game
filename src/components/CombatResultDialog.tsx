import { formatItemName, getItem, itemGradeLabels, shouldEmphasizeItemGrade } from "../data/items";
import type { CombatReport, EnemyRank, ItemGrade } from "../types";
import { GameIcon } from "./GameIcon";

const rankLabels: Record<EnemyRank, string> = {
  normal: "寻常遭遇",
  elite: "精英鏖战",
  boss: "首领讨伐",
};

export default function CombatResultDialog({
  report,
  onDismiss,
  onOpenInventory,
}: {
  report: CombatReport;
  onDismiss: () => void;
  onOpenInventory: () => void;
}) {
  const victory = report.result === "victory";

  return (
    <div className="combat-result-backdrop" role="dialog" aria-modal="true" aria-labelledby="combat-result-title">
      <section className={`combat-result-card rank-${report.rank}`}>
        <header>
          <span className="combat-result-eyebrow">
            {rankLabels[report.rank]}
            {report.firstClear ? " · 首次击破" : ""}
          </span>
          <h2 id="combat-result-title">
            <GameIcon name={victory ? "equipment-artifact" : "combat"} size={20} />
            {victory ? "战利品结算" : "败退调息"}
          </h2>
          <p>{report.title}</p>
        </header>

        {victory ? (
          <>
            <div className="combat-result-currencies">
              <span>
                <small>修为</small>
                <strong>+{report.cultivation}</strong>
              </span>
              <span>
                <small>灵石</small>
                <strong>+{report.spiritStones}</strong>
              </span>
            </div>

            {report.items.length > 0 ? (
              <section className="combat-result-section">
                <h3>所得物资</h3>
                <div className="combat-result-materials">
                  {report.items.map((reward) => (
                    <span key={reward.itemId}>
                      {formatItemName(reward.itemId)} <strong>x{reward.amount}</strong>
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {report.equipment.length > 0 ? (
              <section className="combat-result-section">
                <h3>{report.firstClear ? "首破遗珍" : "装备掉落"}</h3>
                <div className="combat-result-equipment">
                  {report.equipment.map((instance) => {
                    const item = getItem(instance.itemId);
                    return (
                      <article className={`grade-card grade-${instance.quality}`} key={instance.id}>
                        <span className={`grade-name grade-${instance.quality}${shouldEmphasizeItemGrade(instance.quality) ? " strong" : ""}`}>
                          {instance.displayName}
                        </span>
                        <small>
                          {itemGradeLabels[instance.quality]} · {getSlotLabel(instance.slot)}
                        </small>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : (
              <p className="combat-result-empty">这次没有发现装备，精英与首领拥有更高掉落机会。</p>
            )}
          </>
        ) : (
          <p className="combat-result-defeat">你被送回最近的安全地点，奖励没有结算。气血与灵力恢复至可继续行动的程度。</p>
        )}

        <div className="combat-result-actions">
          {victory && report.equipment.length > 0 ? (
            <button className="primary-action compact" onClick={onOpenInventory}>
              查看并比较
            </button>
          ) : null}
          <button className="ghost-button" onClick={onDismiss}>
            {victory ? "收入行囊" : "继续"}
          </button>
        </div>
      </section>
    </div>
  );
}

function getSlotLabel(slot: string): string {
  const labels: Record<string, string> = {
    weapon: "武器",
    robe: "法袍",
    helmet: "头冠",
    wrist: "护腕",
    boots: "鞋履",
    ring: "戒指",
    amulet: "护符",
    artifact: "法宝",
  };
  return labels[slot] ?? "装备";
}
