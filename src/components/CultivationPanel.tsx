import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { formatItemName, getItem, shouldEmphasizeItemGrade } from "../data/items";
import { attemptBreakthrough, calculateBreakthroughRatePct, cultivate, describeCost } from "../game/state";
import { getNextRealm, getRealm } from "../data/progression";
import type { ItemAmount, ItemConfig } from "../types";
import { useActiveGame, useSettings, useUpdateGame } from "../stores/gameStore";
import { BREAKTHROUGH_SLOT_COUNT, useUiStore } from "../stores/uiStore";
import { BreakthroughBurst } from "./effects";
import { GameIcon } from "./GameIcon";
import { BottomSheet, GameButton, ItemSlot, useGameToast } from "./ui";

function mergeItemRequirements(items: ItemAmount[] = []): ItemAmount[] {
  const merged = new Map<string, number>();
  items.forEach((item) => {
    merged.set(item.itemId, (merged.get(item.itemId) ?? 0) + item.amount);
  });
  return Array.from(merged.entries()).map(([itemId, amount]) => ({ itemId, amount }));
}

export default function CultivationPanel() {
  const activeGame = useActiveGame();
  const updateGame = useUpdateGame();
  const settings = useSettings();
  const { notify } = useGameToast();
  const breakthroughEffectKey = useUiStore((state) => state.breakthroughEffectKey);
  const triggerBreakthroughBurst = useUiStore((state) => state.triggerBreakthroughBurst);
  const breakthroughOpen = useUiStore((state) => state.cultivationUi.breakthroughOpen);
  const pickerSlotIndex = useUiStore((state) => state.cultivationUi.pickerSlotIndex);
  const materialSlots = useUiStore((state) => state.cultivationUi.materialSlots);
  const setBreakthroughOpen = useUiStore((state) => state.setBreakthroughOpen);
  const setPickerSlotIndex = useUiStore((state) => state.setBreakthroughPickerSlot);
  const setBreakthroughMaterial = useUiStore((state) => state.setBreakthroughMaterial);
  const resetBreakthroughUi = useUiStore((state) => state.resetBreakthroughUi);
  const [pulseKey, setPulseKey] = useState(0);

  if (!activeGame) {
    return null;
  }

  const game = activeGame;
  const realm = getRealm(game.player.realmId);
  const nextRealm = getNextRealm(game.player.realmId);
  const multiplier = game.world.sectJoined ? 112 : 100;
  const progress = Math.min(100, Math.floor((game.player.cultivation / realm.requiredCultivation) * 100));
  const remaining = Math.max(0, realm.requiredCultivation - game.player.cultivation);
  const isCultivationFull = remaining === 0;
  const breakthroughCost = nextRealm?.breakthroughCost;
  const breakthroughRatePct = calculateBreakthroughRatePct(game, nextRealm);
  const spiritStoneCost = breakthroughCost?.spiritStones ?? 0;
  const requiredMaterials = useMemo(() => mergeItemRequirements(breakthroughCost?.items), [breakthroughCost?.items]);
  const hasBreakthroughCost = spiritStoneCost > 0 || requiredMaterials.length > 0;
  const hasTooManyMaterials = requiredMaterials.length > BREAKTHROUGH_SLOT_COUNT;
  const selectedMaterialIds = useMemo(() => new Set(materialSlots.filter((itemId): itemId is string => Boolean(itemId))), [materialSlots]);
  const hasEnoughSpiritStones = game.player.spiritStones >= spiritStoneCost;
  const missingMaterials = useMemo(
    () =>
      requiredMaterials.filter((requirement) => {
        const owned = game.inventory.items[requirement.itemId] ?? 0;
        return !selectedMaterialIds.has(requirement.itemId) || owned < requirement.amount;
      }),
    [game.inventory.items, requiredMaterials, selectedMaterialIds],
  );
  const canConfirmBreakthrough =
    Boolean(nextRealm) &&
    isCultivationFull &&
    hasEnoughSpiritStones &&
    !hasTooManyMaterials &&
    missingMaterials.length === 0;
  const pickerOptions = useMemo(
    () =>
      requiredMaterials.filter(
        (requirement) => !selectedMaterialIds.has(requirement.itemId) && (game.inventory.items[requirement.itemId] ?? 0) >= requirement.amount,
      ),
    [game.inventory.items, requiredMaterials, selectedMaterialIds],
  );
  const qiButtonText = isCultivationFull ? (nextRealm ? "突 破" : "圆 满") : "聚 气";
  const qiProgressText = isCultivationFull ? "修为已满" : `${game.player.cultivation}/${realm.requiredCultivation}`;

  useEffect(() => {
    resetBreakthroughUi();
  }, [game.player.realmId, resetBreakthroughUi]);

  function handleBreakthrough() {
    if (!nextRealm) {
      notify({ title: "已至当前境界尽头", tone: "gold" });
      return;
    }

    const nextGame = attemptBreakthrough(game);
    const succeeded = nextGame.player.realmId !== game.player.realmId;
    updateGame(nextGame);

    if (succeeded) {
      triggerBreakthroughBurst();
      notify({ title: "突破成功", description: `已至 ${getRealm(nextGame.player.realmId).name}`, tone: "gold" });
    } else {
      notify({ title: "突破失败", description: "灵气逆冲，先稳住心神。", tone: "danger" });
    }
  }

  function handleCultivate() {
    setPulseKey((key) => key + 1);
    updateGame(cultivate(game));
  }

  function handleQiButton() {
    if (isCultivationFull) {
      setPulseKey((key) => key + 1);
      if (!nextRealm) {
        handleBreakthrough();
        return;
      }
      if (!hasBreakthroughCost) {
        handleBreakthrough();
        return;
      }
      setBreakthroughOpen(true);
      return;
    }
    handleCultivate();
  }

  function handleSelectMaterial(slotIndex: number, itemId: string) {
    setBreakthroughMaterial(slotIndex, itemId);
  }

  function handleClearMaterial(slotIndex: number) {
    setBreakthroughMaterial(slotIndex, null);
  }

  function handleConfirmBreakthrough() {
    if (!canConfirmBreakthrough) {
      return;
    }
    resetBreakthroughUi();
    handleBreakthrough();
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
          <GameIcon name="equipment-artifact" size={15} />
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
          <BreakthroughBurst triggerKey={breakthroughEffectKey} motionEnabled={settings.motion} />
        </button>
        <div className="mini-stats">
          <span>今日聚气：{game.player.dailyCultivationCount} 次</span>
          <span>功法加成：{game.world.sectJoined ? "青云吐纳 +12%" : "未入门"}</span>
          <span>{nextRealm ? `下一境界：${nextRealm.name}` : "版本尽头"}</span>
        </div>
        <div className="breakthrough-inline status-only">
          <span>{nextRealm ? (isCultivationFull ? `修为已满，点击聚气球准备突破至 ${nextRealm.name}` : `距离突破 ${remaining} 修为`) : "已达版本境界尽头"}</span>
        </div>
      </div>
      {nextRealm ? (
        <BottomSheet
          open={breakthroughOpen}
          onOpenChange={(open) => {
            setBreakthroughOpen(open);
            if (!open) {
              setPickerSlotIndex(null);
            }
          }}
          title="突破准备"
          subtitle={`${realm.name} → ${nextRealm.name}`}
          motionEnabled={settings.motion}
          footer={
            <GameButton variant="gold" disabled={!canConfirmBreakthrough} icon={<GameIcon name="realm" size={15} />} onClick={handleConfirmBreakthrough}>
              确认突破
            </GameButton>
          }
        >
          <div className="breakthrough-prep-panel">
            <div className="breakthrough-prep-meta">
              <span>成功率 {Math.round(breakthroughRatePct)}%</span>
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
                return item && requirement ? (
                  <ItemSlot
                    key={`breakthrough-slot-${index}`}
                    state="filled"
                    grade={item.grade}
                    iconName="item-material"
                    name={formatItemName(item)}
                    description={`x${requirement.amount} · 拥有 ${owned}`}
                    onClick={() => handleClearMaterial(index)}
                    className="breakthrough-slot"
                  />
                ) : (
                  <ItemSlot
                    key={`breakthrough-slot-${index}`}
                    state="empty"
                    name="空格"
                    description={index < requiredMaterials.length ? "点击放入" : "备用"}
                    onClick={() => setPickerSlotIndex(index)}
                    className="breakthrough-slot"
                  />
                );
              })}
            </div>
            {pickerSlotIndex !== null ? (
              <div className="breakthrough-picker">
                <div className="breakthrough-picker-head">
                  <strong>选择突破材料</strong>
                  <GameButton variant="ghost" onClick={() => setPickerSlotIndex(null)}>
                    收起
                  </GameButton>
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
          </div>
        </BottomSheet>
      ) : null}
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
