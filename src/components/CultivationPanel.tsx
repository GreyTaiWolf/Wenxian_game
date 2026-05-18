import { useEffect, useState, type CSSProperties } from "react";
import { formatItemName, getItem, shouldEmphasizeItemGrade } from "../data/items";
import { describeCost } from "../game/state";
import { getNextRealm, getRealm } from "../data/progression";
import type { GameState, ItemAmount, ItemConfig } from "../types";
import { GameIcon } from "./GameIcon";

const BREAKTHROUGH_SLOT_COUNT = 5;

function createEmptyMaterialSlots(): Array<string | null> {
  return Array.from({ length: BREAKTHROUGH_SLOT_COUNT }, () => null);
}

function mergeItemRequirements(items: ItemAmount[] = []): ItemAmount[] {
  const merged = new Map<string, number>();
  items.forEach((item) => {
    merged.set(item.itemId, (merged.get(item.itemId) ?? 0) + item.amount);
  });
  return Array.from(merged.entries()).map(([itemId, amount]) => ({ itemId, amount }));
}

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
  const isCultivationFull = remaining === 0;
  const breakthroughCost = nextRealm?.breakthroughCost;
  const spiritStoneCost = breakthroughCost?.spiritStones ?? 0;
  const requiredMaterials = mergeItemRequirements(breakthroughCost?.items);
  const hasBreakthroughCost = spiritStoneCost > 0 || requiredMaterials.length > 0;
  const hasTooManyMaterials = requiredMaterials.length > BREAKTHROUGH_SLOT_COUNT;
  const [pulseKey, setPulseKey] = useState(0);
  const [breakthroughOpen, setBreakthroughOpen] = useState(false);
  const [pickerSlotIndex, setPickerSlotIndex] = useState<number | null>(null);
  const [materialSlots, setMaterialSlots] = useState<Array<string | null>>(createEmptyMaterialSlots);

  const selectedMaterialIds = new Set(materialSlots.filter((itemId): itemId is string => Boolean(itemId)));
  const hasEnoughSpiritStones = game.player.spiritStones >= spiritStoneCost;
  const missingMaterials = requiredMaterials.filter((requirement) => {
    const owned = game.inventory.items[requirement.itemId] ?? 0;
    return !selectedMaterialIds.has(requirement.itemId) || owned < requirement.amount;
  });
  const canConfirmBreakthrough =
    Boolean(nextRealm) &&
    isCultivationFull &&
    hasEnoughSpiritStones &&
    !hasTooManyMaterials &&
    missingMaterials.length === 0;
  const pickerOptions = requiredMaterials.filter(
    (requirement) => !selectedMaterialIds.has(requirement.itemId) && (game.inventory.items[requirement.itemId] ?? 0) >= requirement.amount,
  );
  const qiButtonText = isCultivationFull ? (nextRealm ? "突 破" : "圆 满") : "聚 气";
  const qiProgressText = isCultivationFull ? "修为已满" : `${game.player.cultivation}/${realm.requiredCultivation}`;

  useEffect(() => {
    setBreakthroughOpen(false);
    setPickerSlotIndex(null);
    setMaterialSlots(createEmptyMaterialSlots());
  }, [game.player.realmId]);

  function handleCultivate() {
    setPulseKey((key) => key + 1);
    onCultivate();
  }

  function handleQiButton() {
    if (isCultivationFull) {
      setPulseKey((key) => key + 1);
      if (!nextRealm) {
        onBreakthrough();
        return;
      }
      if (!hasBreakthroughCost) {
        onBreakthrough();
        return;
      }
      setBreakthroughOpen(true);
      return;
    }
    handleCultivate();
  }

  function handleSelectMaterial(slotIndex: number, itemId: string) {
    setMaterialSlots((slots) => slots.map((slotItemId, index) => (index === slotIndex ? itemId : slotItemId)));
    setPickerSlotIndex(null);
  }

  function handleClearMaterial(slotIndex: number) {
    setMaterialSlots((slots) => slots.map((itemId, index) => (index === slotIndex ? null : itemId)));
    setPickerSlotIndex(null);
  }

  function handleConfirmBreakthrough() {
    if (!canConfirmBreakthrough) {
      return;
    }
    setBreakthroughOpen(false);
    setPickerSlotIndex(null);
    setMaterialSlots(createEmptyMaterialSlots());
    onBreakthrough();
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
        <button
          className={`qi-button${isCultivationFull && nextRealm ? " ready" : ""}`}
          style={{ "--qi-progress": `${progress}%` } as CSSProperties}
          onClick={handleQiButton}
        >
          <span className="qi-button-fill" aria-hidden="true" />
          <GameIcon name="module-cultivation" size={24} />
          <span className="qi-button-text">{qiButtonText}</span>
          <small className="qi-progress-text">{qiProgressText}</small>
          {pulseKey > 0 ? <span key={pulseKey} className="qi-button-pulse" aria-hidden="true" /> : null}
        </button>
        <div className="mini-stats">
          <span>今日聚气：{game.player.dailyCultivationCount} 次</span>
          <span>功法加成：{game.world.sectJoined ? "青云吐纳 +12%" : "未入门"}</span>
          <span>{nextRealm ? `下一境界：${nextRealm.name}` : "版本尽头"}</span>
        </div>
        <div className="breakthrough-inline status-only">
          <span>{nextRealm ? (isCultivationFull ? `修为已满，点击聚气球准备突破至 ${nextRealm.name}` : `距离突破 ${remaining} 修为`) : "已达版本境界尽头"}</span>
        </div>
        {breakthroughOpen && nextRealm ? (
          <section className="breakthrough-prep-panel" role="dialog" aria-label="突破准备">
            <div className="breakthrough-prep-header">
              <div>
                <span>突破准备</span>
                <strong>
                  {realm.name} → {nextRealm.name}
                </strong>
              </div>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setBreakthroughOpen(false);
                  setPickerSlotIndex(null);
                }}
              >
                关闭
              </button>
            </div>
            <div className="breakthrough-prep-meta">
              <span>成功率 {Math.round(nextRealm.successRate * 100)}%</span>
              <span>{hasBreakthroughCost ? describeCost(nextRealm.breakthroughCost) : "无需材料"}</span>
            </div>
            <div className="breakthrough-requirements">
              {spiritStoneCost > 0 ? (
                <div className={`breakthrough-requirement${hasEnoughSpiritStones ? " ok" : " missing"}`}>
                  <span>
                    <GameIcon name="resource-stones" size={14} />
                    灵石
                  </span>
                  <strong>
                    {game.player.spiritStones}/{spiritStoneCost}
                  </strong>
                </div>
              ) : (
                <div className="breakthrough-requirement ok">
                  <span>
                    <GameIcon name="resource-stones" size={14} />
                    灵石
                  </span>
                  <strong>无需</strong>
                </div>
              )}
              {requiredMaterials.length > 0 ? (
                requiredMaterials.map((requirement) => {
                  const item = getItem(requirement.itemId);
                  const owned = game.inventory.items[requirement.itemId] ?? 0;
                  const isPlaced = selectedMaterialIds.has(requirement.itemId);
                  const isReady = isPlaced && owned >= requirement.amount;
                  return (
                    <div key={requirement.itemId} className={`breakthrough-requirement grade-card grade-${item.grade}${isReady ? " ok" : " missing"}`}>
                      <span>
                        <GameIcon name="item-material" size={14} />
                        <span className={getGradeNameClass(item)}>{formatItemName(item)}</span>
                      </span>
                      <strong>
                        {owned}/{requirement.amount}
                      </strong>
                    </div>
                  );
                })
              ) : (
                <div className="breakthrough-requirement ok">
                  <span>
                    <GameIcon name="item-material" size={14} />
                    突破材料
                  </span>
                  <strong>无需</strong>
                </div>
              )}
            </div>
            <div className="breakthrough-slot-grid" aria-label="突破材料格">
              {materialSlots.map((itemId, index) => {
                const requirement = itemId ? requiredMaterials.find((material) => material.itemId === itemId) : null;
                const item = requirement ? getItem(requirement.itemId) : null;
                const owned = requirement ? game.inventory.items[requirement.itemId] ?? 0 : 0;
                return (
                  <button
                    key={`breakthrough-slot-${index}`}
                    type="button"
                    className={`breakthrough-slot${item ? ` filled grade-card grade-${item.grade}` : ""}`}
                    onClick={() => (item ? handleClearMaterial(index) : setPickerSlotIndex(index))}
                  >
                    <small>{index + 1}</small>
                    {item && requirement ? (
                      <>
                        <strong className={getGradeNameClass(item)}>{formatItemName(item)}</strong>
                        <span>
                          x{requirement.amount} · 拥有 {owned}
                        </span>
                      </>
                    ) : (
                      <>
                        <strong>空格</strong>
                        <span>{index < requiredMaterials.length ? "点击放入" : "备用"}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            {pickerSlotIndex !== null ? (
              <div className="breakthrough-picker">
                <div className="breakthrough-picker-head">
                  <strong>选择突破材料</strong>
                  <button className="ghost-button" type="button" onClick={() => setPickerSlotIndex(null)}>
                    收起
                  </button>
                </div>
                {pickerOptions.length > 0 ? (
                  <div className="breakthrough-picker-list">
                    {pickerOptions.map((requirement) => {
                      const item = getItem(requirement.itemId);
                      const owned = game.inventory.items[requirement.itemId] ?? 0;
                      return (
                        <button
                          key={requirement.itemId}
                          type="button"
                          className={`breakthrough-picker-item grade-card grade-${item.grade}`}
                          onClick={() => handleSelectMaterial(pickerSlotIndex, requirement.itemId)}
                        >
                          <strong className={getGradeNameClass(item)}>{formatItemName(item)}</strong>
                          <span>
                            需要 x{requirement.amount} · 拥有 x{owned}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="empty-state">当前没有可放入的突破材料，先去历练、任务或坊市筹备。</p>
                )}
              </div>
            ) : null}
            {hasTooManyMaterials ? <p className="breakthrough-warning">当前突破需求超过 5 种材料，请先调整境界配置。</p> : null}
            {missingMaterials.length > 0 ? (
              <p className="breakthrough-warning">
                还需放入：
                {missingMaterials.map((requirement) => `${formatItemName(getItem(requirement.itemId))} x${requirement.amount}`).join("、")}
              </p>
            ) : null}
            {!hasEnoughSpiritStones ? <p className="breakthrough-warning">灵石不足，仍需 {spiritStoneCost - game.player.spiritStones}。</p> : null}
            <button className="gold-button breakthrough-confirm" type="button" disabled={!canConfirmBreakthrough} onClick={handleConfirmBreakthrough}>
              <GameIcon name="realm" size={15} />
              确认突破
            </button>
          </section>
        ) : null}
      </div>
      <LogList logs={game.world.logs} title="修行日志" />
    </section>
  );
}

function getGradeNameClass(item: ItemConfig): string {
  return `grade-name grade-${item.grade}${shouldEmphasizeItemGrade(item.grade) ? " strong" : ""}`;
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
