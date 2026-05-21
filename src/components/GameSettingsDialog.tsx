import { useEffect, useMemo, useState } from "react";
import { items, formatItemName, itemGradeLabels, itemTierLabels } from "../data/items";
import { getRealm, realms } from "../data/progression";
import { appendLog, addItems, normalizePlayerState } from "../game/state";
import { useSettings, useUpdateGame } from "../stores/gameStore";
import { useSaveStore } from "../stores/saveStore";
import type { EquipmentSlotId, GameState, ItemConfig, UnlockKey } from "../types";
import { GameIcon } from "./GameIcon";
import { GameButton, GameDialog, useGameToast } from "./ui";

const DEBUG_CODES = new Set(["debug", "wenxian_debug"]);
const DEBUG_VOLUME_KEY = "wenxian-debug-volume";

type ItemCategoryFilter = "all" | Exclude<ItemConfig["category"], "equipment">;
type EquipmentSlotFilter = "all" | EquipmentSlotId;

const ITEM_CATEGORY_LABELS: Record<ItemConfig["category"], string> = {
  currency: "货币",
  pill: "丹药",
  material: "材料",
  quest: "任务",
  equipment: "装备",
};

const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlotId, string> = {
  weapon: "武器",
  robe: "法袍",
  helmet: "头冠",
  wrist: "护腕",
  boots: "鞋履",
  ring: "戒指",
  amulet: "护符",
  artifact: "法宝",
};

const ITEM_CATEGORY_OPTIONS: Array<{ value: ItemCategoryFilter; label: string }> = [
  { value: "all", label: "全部物品" },
  { value: "pill", label: "丹药" },
  { value: "material", label: "材料" },
  { value: "quest", label: "任务" },
  { value: "currency", label: "货币" },
];

const EQUIPMENT_SLOT_OPTIONS: Array<{ value: EquipmentSlotFilter; label: string }> = [
  { value: "all", label: "全部装备" },
  { value: "weapon", label: "武器" },
  { value: "robe", label: "法袍" },
  { value: "helmet", label: "头冠" },
  { value: "wrist", label: "护腕" },
  { value: "boots", label: "鞋履" },
  { value: "ring", label: "戒指" },
  { value: "amulet", label: "护符" },
  { value: "artifact", label: "法宝" },
];

interface GameSettingsDialogProps {
  game: GameState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExitToMenu: () => void;
}

export function GameSettingsDialog({ game, open, onOpenChange, onExitToMenu }: GameSettingsDialogProps) {
  const settings = useSettings();
  const updateGame = useUpdateGame();
  const forcePersist = useSaveStore((state) => state.forcePersist);
  const { notify } = useGameToast();
  const [volume, setVolume] = useState(readInitialVolume);
  const [debugCode, setDebugCode] = useState("");
  const [debugUnlocked, setDebugUnlocked] = useState(false);
  const [realmId, setRealmId] = useState(game.player.realmId);
  const [cultivation, setCultivation] = useState(String(game.player.cultivation));
  const [spiritStones, setSpiritStones] = useState(String(game.player.spiritStones));
  const [itemSearch, setItemSearch] = useState("");
  const [itemCategory, setItemCategory] = useState<ItemCategoryFilter>("all");
  const [selectedItemId, setSelectedItemId] = useState("qi_grass");
  const [itemAmount, setItemAmount] = useState("1");
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [equipmentSlot, setEquipmentSlot] = useState<EquipmentSlotFilter>("all");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("low_sword");
  const [equipmentAmount, setEquipmentAmount] = useState("1");
  const [sectContribution, setSectContribution] = useState(String(game.world.sectContribution));
  const [sectReputation, setSectReputation] = useState(String(game.world.sectReputation));

  const targetRealm = useMemo(() => getRealm(realmId), [realmId]);
  const itemConfigs = useMemo(() => items.filter((item) => !item.equipment), []);
  const equipmentConfigs = useMemo(() => items.filter((item) => item.equipment), []);
  const filteredItemConfigs = useMemo(
    () =>
      itemConfigs.filter((item) => {
        const categoryMatches = itemCategory === "all" || item.category === itemCategory;
        return categoryMatches && matchesCatalogSearch(item, itemSearch);
      }),
    [itemCategory, itemConfigs, itemSearch],
  );
  const filteredEquipmentConfigs = useMemo(
    () =>
      equipmentConfigs.filter((item) => {
        const slotMatches = equipmentSlot === "all" || item.equipment?.slot === equipmentSlot;
        return slotMatches && matchesCatalogSearch(item, equipmentSearch);
      }),
    [equipmentConfigs, equipmentSearch, equipmentSlot],
  );
  const selectedItem = useMemo(() => itemConfigs.find((item) => item.id === selectedItemId) ?? itemConfigs[0] ?? null, [itemConfigs, selectedItemId]);
  const selectedEquipment = useMemo(
    () => equipmentConfigs.find((item) => item.id === selectedEquipmentId) ?? equipmentConfigs[0] ?? null,
    [equipmentConfigs, selectedEquipmentId],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setRealmId(game.player.realmId);
    setCultivation(String(game.player.cultivation));
    setSpiritStones(String(game.player.spiritStones));
    setSectContribution(String(game.world.sectContribution));
    setSectReputation(String(game.world.sectReputation));
  }, [game.player.cultivation, game.player.realmId, game.player.spiritStones, game.world.sectContribution, game.world.sectReputation, open]);

  function handleVolumeChange(nextVolume: number) {
    setVolume(nextVolume);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DEBUG_VOLUME_KEY, String(nextVolume));
    }
  }

  function unlockDebug() {
    const normalizedCode = debugCode.trim().toLowerCase();
    if (DEBUG_CODES.has(normalizedCode)) {
      setDebugUnlocked(true);
      setDebugCode("");
      notify({ title: "Debug 已解锁", description: "测试工具已开启。", tone: "gold" });
      return;
    }
    notify({ title: "兑换码无效", description: "请输入有效测试码。", tone: "danger" });
  }

  function exitToMenu() {
    onOpenChange(false);
    onExitToMenu();
  }

  function exitGame() {
    forcePersist();
    onOpenChange(false);
    onExitToMenu();
    notify({ title: "进度已保存", description: "可以关闭浏览器页面。", tone: "success" });
  }

  function applyPlayerDebug(fillCultivation = false) {
    const safeCultivation = fillCultivation ? targetRealm.requiredCultivation : clampInt(cultivation, 0, targetRealm.requiredCultivation);
    const safeStones = clampInt(spiritStones, 0, 9999999);
    const mergedUnlocks = mergeUnlocks(game.player.unlocks, getUnlocksThroughRealm(targetRealm.id));
    const normalizedPlayer = normalizePlayerState({
      ...game.player,
      realmId: targetRealm.id,
      cultivation: safeCultivation,
      spiritStones: safeStones,
      hp: targetRealm.baseStats.maxHp,
      spirit: targetRealm.baseStats.maxSpirit,
      lifespan: Math.max(game.player.lifespan, targetRealm.lifespan),
      stats: targetRealm.baseStats,
      unlocks: mergedUnlocks,
    });
    updateGame((currentGame) =>
      appendLog(
        {
          ...currentGame,
          player: normalizedPlayer,
        },
        `Debug：境界调整为 ${targetRealm.name}。`,
      ),
    );
    setCultivation(String(safeCultivation));
    setSpiritStones(String(safeStones));
    notify({ title: "角色状态已调整", description: `${targetRealm.name} · 修为 ${safeCultivation}/${targetRealm.requiredCultivation}`, tone: "success" });
  }

  function restoreVitals() {
    updateGame((currentGame) =>
      appendLog(
        {
          ...currentGame,
          player: {
            ...currentGame.player,
            hp: currentGame.player.stats.maxHp,
            spirit: currentGame.player.stats.maxSpirit,
          },
        },
        "Debug：气血与灵力已回满。",
      ),
    );
    notify({ title: "状态已回满", tone: "success" });
  }

  function grantDebugItem(itemConfig: ItemConfig | null, amountValue: string) {
    const amount = clampInt(amountValue, 1, 99);
    if (!itemConfig) {
      notify({ title: "请先选择目录项", tone: "danger" });
      return;
    }

    updateGame((currentGame) => appendLog(addItems(currentGame, [{ itemId: itemConfig.id, amount }]), `Debug：获得 ${formatItemName(itemConfig)} x${amount}。`));
    notify({ title: "已加入背包", description: `${formatItemName(itemConfig)} x${amount}`, tone: itemConfig.equipment ? "gold" : "success" });
  }

  function applySectDebug() {
    const nextContribution = clampInt(sectContribution, 0, 999999);
    const nextReputation = clampInt(sectReputation, 0, 999999);
    updateGame((currentGame) =>
      appendLog(
        {
          ...currentGame,
          player: {
            ...currentGame.player,
            unlocks: mergeUnlocks(currentGame.player.unlocks, ["sect"]),
          },
          world: {
            ...currentGame.world,
            sectJoined: true,
            sectContribution: nextContribution,
            sectReputation: nextReputation,
          },
        },
        "Debug：宗门状态已调整。",
      ),
    );
    setSectContribution(String(nextContribution));
    setSectReputation(String(nextReputation));
    notify({ title: "宗门数据已调整", tone: "success" });
  }

  function clearCombat() {
    if (!game.combat) {
      notify({ title: "当前不在战斗中" });
      return;
    }
    updateGame((currentGame) => appendLog({ ...currentGame, combat: undefined }, "Debug：已退出当前战斗。"));
    notify({ title: "战斗已清除", tone: "success" });
  }

  return (
    <GameDialog
      open={open}
      onOpenChange={onOpenChange}
      title="设置"
      subtitle="本地设置、退出与测试工具"
      motionEnabled={settings.motion}
      className="settings-dialog"
      footer={
        <GameButton variant="ghost" onClick={() => onOpenChange(false)}>
          关闭
        </GameButton>
      }
    >
      <div className="settings-dialog-stack">
        <section className="settings-section">
          <div className="settings-section-title">
            <GameIcon name="action-settings" size={15} />
            游戏
          </div>
          <div className="settings-action-grid">
            <GameButton variant="ghost" onClick={exitToMenu}>
              退出到主菜单
            </GameButton>
            <GameButton variant="danger" onClick={exitGame}>
              退出游戏
            </GameButton>
          </div>
        </section>

        <section className="settings-section">
          <label className="debug-field-label settings-volume-label" htmlFor="settings-volume">
            <span>音量设置</span>
            <strong>{volume}%</strong>
          </label>
          <input
            id="settings-volume"
            className="settings-range"
            type="range"
            min={0}
            max={100}
            step={5}
            value={volume}
            onChange={(event) => handleVolumeChange(Number(event.target.value))}
          />
          <p className="debug-muted">音频系统预留，本地记录当前偏好。</p>
        </section>

        <section className="settings-section">
          <div className="settings-section-title">
            <GameIcon name="combat-log" size={15} />
            兑换码
          </div>
          <div className="debug-code-row">
            <input
              aria-label="兑换码"
              autoComplete="off"
              placeholder="输入兑换码"
              value={debugCode}
              onChange={(event) => setDebugCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  unlockDebug();
                }
              }}
            />
            <GameButton variant="gold" onClick={unlockDebug}>
              解锁 Debug
            </GameButton>
          </div>
          <p className="debug-muted">测试码：debug</p>
        </section>

        {debugUnlocked ? (
          <section className="settings-section debug-panel">
            <div className="settings-section-title">
              <GameIcon name="realm" size={15} />
              Debug 菜单
            </div>

            <div className="debug-subsection">
              <h3>角色状态</h3>
              <label className="debug-field-label" htmlFor="debug-realm">
                境界
              </label>
              <select id="debug-realm" value={realmId} onChange={(event) => setRealmId(event.target.value)}>
                {realms.map((realm) => (
                  <option key={realm.id} value={realm.id}>
                    {realm.name} · {realm.id}
                  </option>
                ))}
              </select>
              <div className="debug-two-col">
                <label className="debug-field-label" htmlFor="debug-cultivation">
                  修为
                  <input
                    id="debug-cultivation"
                    inputMode="numeric"
                    value={cultivation}
                    onChange={(event) => setCultivation(event.target.value)}
                  />
                </label>
                <label className="debug-field-label" htmlFor="debug-stones">
                  灵石
                  <input
                    id="debug-stones"
                    inputMode="numeric"
                    value={spiritStones}
                    onChange={(event) => setSpiritStones(event.target.value)}
                  />
                </label>
              </div>
              <div className="settings-action-grid">
                <GameButton variant="primary" onClick={() => applyPlayerDebug(false)}>
                  应用角色状态
                </GameButton>
                <GameButton variant="gold" onClick={() => applyPlayerDebug(true)}>
                  修为填满
                </GameButton>
                <GameButton variant="ghost" onClick={restoreVitals}>
                  回满气血灵力
                </GameButton>
              </div>
            </div>

            <div className="debug-subsection">
              <h3>物品与装备</h3>
              <div className="debug-catalog-block">
                <div className="debug-catalog-heading">
                  <strong>物品目录</strong>
                  <span>{filteredItemConfigs.length}/{itemConfigs.length}</span>
                </div>
                <div className="debug-catalog-toolbar">
                  <input
                    aria-label="搜索物品目录"
                    autoComplete="off"
                    placeholder="搜索名称 / ID"
                    value={itemSearch}
                    onChange={(event) => setItemSearch(event.target.value)}
                  />
                  <select aria-label="物品分类" value={itemCategory} onChange={(event) => setItemCategory(event.target.value as ItemCategoryFilter)}>
                    {ITEM_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <DebugCatalogTable
                  items={filteredItemConfigs}
                  selectedId={selectedItem?.id ?? null}
                  onSelect={setSelectedItemId}
                  mode="item"
                />
                <div className="debug-selected-row">
                  <span>
                    已选：<strong>{selectedItem ? formatItemName(selectedItem) : "无"}</strong>
                  </span>
                  <label className="debug-field-label debug-amount-field" htmlFor="debug-item-amount">
                    数量
                    <input
                      id="debug-item-amount"
                      inputMode="numeric"
                      value={itemAmount}
                      onChange={(event) => setItemAmount(event.target.value)}
                    />
                  </label>
                  <GameButton variant="primary" onClick={() => grantDebugItem(selectedItem, itemAmount)}>
                    获得选中物品
                  </GameButton>
                </div>
              </div>

              <div className="debug-catalog-block">
                <div className="debug-catalog-heading">
                  <strong>装备目录</strong>
                  <span>{filteredEquipmentConfigs.length}/{equipmentConfigs.length}</span>
                </div>
                <div className="debug-catalog-toolbar">
                  <input
                    aria-label="搜索装备目录"
                    autoComplete="off"
                    placeholder="搜索名称 / ID"
                    value={equipmentSearch}
                    onChange={(event) => setEquipmentSearch(event.target.value)}
                  />
                  <select aria-label="装备部位" value={equipmentSlot} onChange={(event) => setEquipmentSlot(event.target.value as EquipmentSlotFilter)}>
                    {EQUIPMENT_SLOT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <DebugCatalogTable
                  items={filteredEquipmentConfigs}
                  selectedId={selectedEquipment?.id ?? null}
                  onSelect={setSelectedEquipmentId}
                  mode="equipment"
                />
                <div className="debug-selected-row">
                  <span>
                    已选：<strong>{selectedEquipment ? formatItemName(selectedEquipment) : "无"}</strong>
                  </span>
                  <label className="debug-field-label debug-amount-field" htmlFor="debug-equipment-amount">
                    数量
                    <input
                      id="debug-equipment-amount"
                      inputMode="numeric"
                      value={equipmentAmount}
                      onChange={(event) => setEquipmentAmount(event.target.value)}
                    />
                  </label>
                  <GameButton variant="gold" onClick={() => grantDebugItem(selectedEquipment, equipmentAmount)}>
                    获得选中装备
                  </GameButton>
                </div>
              </div>
              <p className="debug-muted">表格自动读取当前项目已登记的物品和装备配置。</p>
            </div>

            <div className="debug-subsection">
              <h3>宗门与战斗</h3>
              <div className="debug-two-col">
                <label className="debug-field-label" htmlFor="debug-sect-contribution">
                  贡献
                  <input
                    id="debug-sect-contribution"
                    inputMode="numeric"
                    value={sectContribution}
                    onChange={(event) => setSectContribution(event.target.value)}
                  />
                </label>
                <label className="debug-field-label" htmlFor="debug-sect-reputation">
                  声望
                  <input
                    id="debug-sect-reputation"
                    inputMode="numeric"
                    value={sectReputation}
                    onChange={(event) => setSectReputation(event.target.value)}
                  />
                </label>
              </div>
              <div className="settings-action-grid">
                <GameButton variant="primary" onClick={applySectDebug}>
                  应用宗门数据
                </GameButton>
                <GameButton variant="danger" onClick={clearCombat}>
                  清除战斗
                </GameButton>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </GameDialog>
  );
}

function readInitialVolume(): number {
  if (typeof window === "undefined") {
    return 80;
  }
  const raw = window.localStorage.getItem(DEBUG_VOLUME_KEY);
  return clampInt(raw ?? "80", 0, 100);
}

function clampInt(value: string | number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function getUnlocksThroughRealm(realmId: string): UnlockKey[] {
  const targetIndex = realms.findIndex((realm) => realm.id === realmId);
  const safeIndex = targetIndex >= 0 ? targetIndex : 0;
  return Array.from(new Set(realms.slice(0, safeIndex + 1).flatMap((realm) => realm.unlocks)));
}

function mergeUnlocks(current: UnlockKey[], next: UnlockKey[]): UnlockKey[] {
  return Array.from(new Set([...current, ...next]));
}

function matchesCatalogSearch(item: ItemConfig, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }
  const searchable = [
    item.id,
    formatItemName(item),
    item.description,
    ITEM_CATEGORY_LABELS[item.category],
    itemGradeLabels[item.grade],
    itemTierLabels[item.tier],
    item.equipment ? EQUIPMENT_SLOT_LABELS[item.equipment.slot] : "",
  ];
  return searchable.some((value) => value.toLowerCase().includes(query));
}

function DebugCatalogTable({
  items: catalogItems,
  selectedId,
  onSelect,
  mode,
}: {
  items: ItemConfig[];
  selectedId: string | null;
  onSelect: (itemId: string) => void;
  mode: "item" | "equipment";
}) {
  if (catalogItems.length === 0) {
    return <div className="debug-catalog-empty">没有匹配项</div>;
  }

  return (
    <div className="debug-catalog-table-wrap">
      <table className="debug-catalog-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>名称</th>
            <th>{mode === "equipment" ? "部位" : "分类"}</th>
            <th>品级</th>
            <th>阶位</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {catalogItems.map((item) => {
            const selected = item.id === selectedId;
            const typeLabel = item.equipment ? EQUIPMENT_SLOT_LABELS[item.equipment.slot] : ITEM_CATEGORY_LABELS[item.category];
            return (
              <tr key={item.id} className={selected ? "is-selected" : ""}>
                <td>
                  <code>{item.id}</code>
                </td>
                <td>
                  <button className="debug-catalog-name" type="button" onClick={() => onSelect(item.id)}>
                    {formatItemName(item)}
                  </button>
                </td>
                <td>{typeLabel}</td>
                <td>{itemGradeLabels[item.grade]}</td>
                <td>{itemTierLabels[item.tier]}</td>
                <td>
                  <button className="debug-catalog-select" type="button" onClick={() => onSelect(item.id)}>
                    {selected ? "已选" : "选择"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
