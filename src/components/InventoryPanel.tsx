import { useMemo } from "react";
import {
  formatItemName,
  getItem,
  itemGradeMetas,
  itemTierLabels,
  items,
  shouldEmphasizeItemGrade,
} from "../data/items";
import {
  canEquipItem,
  canSellItem,
  equipEquipmentInstance,
  equipmentSlots,
  getEffectiveStats,
  getEquipmentInstanceItem,
  getEquipmentSealState,
  getEquippedEquipmentInstance,
  getEquippedItem,
  getEquippableInventoryItems,
  getItemSellPrice,
  sellEquipmentInstance,
  sellItem,
  unequipSlot,
} from "../game/equipment";
import type { EquipmentBonus, EquipmentInstance, EquipmentSlotId, GameState, ItemConfig, Stats } from "../types";
import { useActiveGame, useSettings, useUpdateGame } from "../stores/gameStore";
import { useUiStore, type InventoryTab } from "../stores/uiStore";
import { GameIcon, type GameIconName } from "./GameIcon";
import { BottomSheet, GameButton, GradeBadge, ItemSlot, useGameToast } from "./ui";

interface InventoryGridEntry {
  id: string;
  item: ItemConfig;
  iconName: GameIconName;
  amount?: number;
  onSelect: () => void;
}

const statLabels: Record<keyof Stats, string> = {
  maxHp: "气血",
  maxSpirit: "灵力",
  attack: "攻击",
  defense: "防御",
  spiritSense: "神识",
  speed: "速度",
  dodgeRate: "闪避",
  critRate: "暴击",
  critDamage: "暴伤",
};

const categoryLabels: Record<ItemConfig["category"], string> = {
  currency: "货币",
  equipment: "装备",
  material: "材料",
  pill: "丹药",
  quest: "任务",
};

const statOrder: Array<keyof Stats> = ["maxHp", "maxSpirit", "attack", "defense", "spiritSense", "speed", "dodgeRate", "critRate", "critDamage"];
const compactStatOrder: Array<keyof Stats> = ["maxHp", "attack", "maxSpirit", "defense"];
const inventoryGridPageSize = 9;
const slotIcons: Record<string, GameIconName> = {
  weapon: "equipment-weapon",
  robe: "equipment-robe",
  helmet: "equipment-helmet",
  wrist: "equipment-wrist",
  boots: "equipment-boots",
  ring: "equipment-ring",
  amulet: "equipment-amulet",
  artifact: "equipment-artifact",
};

export default function InventoryPanel() {
  const activeGame = useActiveGame();
  const tab = useUiStore((state) => state.inventoryUi.tab);
  const setTab = useUiStore((state) => state.setInventoryTab);

  if (!activeGame) {
    return null;
  }

  return (
    <section className="module-panel inventory-panel">
      <div className="sub-tabs">
        <button className={tab === "equipment" ? "active" : ""} onClick={() => setTab("equipment")}>
          <GameIcon name="equipment" size={15} />
          装备
        </button>
        <button className={tab === "items" ? "active" : ""} onClick={() => setTab("items")}>
          <GameIcon name="item" size={15} />
          物品
        </button>
        <button className={tab === "pills" ? "active" : ""} onClick={() => setTab("pills")}>
          <GameIcon name="item-pill" size={15} />
          丹药
        </button>
        <button className={tab === "materials" ? "active" : ""} onClick={() => setTab("materials")}>
          <GameIcon name="item-material" size={15} />
          材料
        </button>
      </div>

      {tab === "equipment" ? <EquipmentPanel /> : null}
      {tab === "items" ? (
        <ItemList tabKey="items" title="背包" subtitle="物品" categories={["currency", "quest"]} />
      ) : null}
      {tab === "pills" ? <ItemList tabKey="pills" title="背包" subtitle="丹药" categories={["pill"]} /> : null}
      {tab === "materials" ? (
        <ItemList tabKey="materials" title="背包" subtitle="材料" categories={["material"]} />
      ) : null}
    </section>
  );
}

function EquipmentPanel() {
  const game = useActiveGame();
  const updateGame = useUpdateGame();
  const settings = useSettings();
  const selectedEquipmentId = useUiStore((state) => state.inventoryUi.selectedEquipmentId);
  const selectedEquippedSlotId = useUiStore((state) => state.inventoryUi.selectedEquippedSlotId);
  const equipmentPage = useUiStore((state) => state.inventoryUi.equipmentPage);
  const showAttributeDetails = useUiStore((state) => state.inventoryUi.showAttributeDetails);
  const highlightSlotId = useUiStore((state) => state.inventoryUi.highlightSlotId);
  const setSelectedEquipmentId = useUiStore((state) => state.setSelectedEquipmentId);
  const setSelectedEquippedSlotId = useUiStore((state) => state.setSelectedEquippedSlotId);
  const setEquipmentPage = useUiStore((state) => state.setEquipmentPage);
  const setShowAttributeDetails = useUiStore((state) => state.setShowAttributeDetails);
  const setHighlightSlotId = useUiStore((state) => state.setHighlightSlotId);

  if (!game) {
    return null;
  }

  const effectiveStats = useMemo(() => getEffectiveStats(game), [game]);
  const equipmentBagItems = useMemo(() => getEquippableInventoryItems(game), [game]);
  const selectedEquipment = useMemo(
    () => (selectedEquipmentId ? game.inventory.equipmentItems.find((instance) => instance.id === selectedEquipmentId) ?? null : null),
    [game.inventory.equipmentItems, selectedEquipmentId],
  );
  const selectedItem = getEquipmentInstanceItem(selectedEquipment);
  const selectedEquippedInstance = useMemo(
    () => (selectedEquippedSlotId ? getEquippedEquipmentInstance(game, selectedEquippedSlotId) : null),
    [game, selectedEquippedSlotId],
  );
  const selectedEquippedItem = getEquipmentInstanceItem(selectedEquippedInstance);
  const equipmentEntries = useMemo(
    () =>
      equipmentBagItems.flatMap<InventoryGridEntry>((instance) => {
        const item = getEquipmentInstanceItem(instance);
        if (!item) {
          return [];
        }
        return [
          {
            id: instance.id,
            item,
            iconName: item.equipment ? slotIcons[item.equipment.slot] ?? "equipment" : "equipment",
            onSelect: () => setSelectedEquipmentId(instance.id),
          },
        ];
      }),
    [equipmentBagItems],
  );

  return (
    <div className="equipment-panel">
      <section>
        <div className="section-heading">
          <h2>
            <GameIcon name="equipment" size={18} />
            装备格
          </h2>
          <span>八槽</span>
        </div>
        <div className="equipment-slot-grid">
          {equipmentSlots.map((slot) => {
            const instance = getEquippedEquipmentInstance(game, slot.id);
            const item = getEquippedItem(game, slot.id);
            const rawValue = game.inventory.equipment[slot.id];
            const canOpenDetail = Boolean(instance && item);
            return (
              <article
                aria-label={`${slot.label} ${instance ? instance.displayName : item ? formatItemName(item) : rawValue ? "装备数据已失效" : slot.emptyLabel}`}
                className={`equipment-slot-card ${canOpenDetail ? "clickable" : ""} ${item ? `filled grade-card grade-${item.grade}` : ""}${highlightSlotId === slot.id ? " slot-action-highlight" : ""}`}
                key={slot.id}
                role={canOpenDetail ? "button" : undefined}
                tabIndex={canOpenDetail ? 0 : undefined}
                onClick={() => {
                  if (canOpenDetail) {
                    setSelectedEquippedSlotId(slot.id);
                  }
                }}
                onKeyDown={(event) => {
                  if (!canOpenDetail || (event.key !== "Enter" && event.key !== " ")) {
                    return;
                  }
                  event.preventDefault();
                  setSelectedEquippedSlotId(slot.id);
                }}
              >
                <GameIcon name={slotIcons[slot.id] ?? "equipment"} size={18} />
                <div>
                  <div className="equipment-slot-meta">
                    <small>{slot.label}</small>
                  </div>
                  <strong className={item ? getGradeNameClass(item) : ""}>{instance ? instance.displayName : item ? formatItemName(item) : rawValue ? "装备数据已失效" : slot.emptyLabel}</strong>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="section-heading">
          <h2>
            <GameIcon name="equipment-weapon" size={18} />
            背包
          </h2>
          <span>装备 {equipmentBagItems.length} 件</span>
        </div>
        <InventoryGrid
          entries={equipmentEntries}
          emptyText="暂无装备，可去坊市购买或历练获取。"
          page={equipmentPage}
          onPageChange={setEquipmentPage}
          showStackCount={false}
        />
      </section>

      <section className="attribute-panel">
        <div className="section-heading">
          <button
            className="attribute-title-button"
            aria-expanded={showAttributeDetails}
            onClick={() => setShowAttributeDetails(!showAttributeDetails)}
          >
            <GameIcon name="resource-power" size={18} />
            属性
          </button>
          <span>简览</span>
        </div>
        {showAttributeDetails ? (
          <div className="attribute-detail-popover">
            <div className="section-heading">
              <h2>详细属性</h2>
              <button className="ghost-button" onClick={() => setShowAttributeDetails(false)}>
                关闭
              </button>
            </div>
            <div className="attribute-detail-grid">
              {statOrder.map((key) => {
                const base = game.player.stats[key];
                const total = effectiveStats[key];
                const bonus = total - base;
                return <StatCell key={key} label={statLabels[key]} value={formatStatValue(key, total)} bonus={formatBonusValue(key, bonus)} />;
              })}
            </div>
          </div>
        ) : null}
        <div className="attribute-grid attribute-summary-grid">
          {compactStatOrder.map((key) => {
            const base = game.player.stats[key];
            const total = effectiveStats[key];
            const bonus = total - base;
            return <StatCell key={key} label={statLabels[key]} value={formatStatValue(key, total)} bonus={formatBonusValue(key, bonus)} />;
          })}
        </div>
      </section>

      {selectedEquipment && selectedItem ? (
        <ItemDetailCard
          game={game}
          item={selectedItem}
          equipmentInstance={selectedEquipment}
          motionEnabled={settings.motion}
          onClose={() => setSelectedEquipmentId(null)}
          onChange={(nextGame) => {
            updateGame(nextGame);
            if (selectedItem.equipment?.slot) {
              const nextSlot = selectedItem.equipment.slot;
              setHighlightSlotId(nextSlot);
              setTimeout(() => setHighlightSlotId(null), 220);
            }
            setSelectedEquipmentId(null);
          }}
        />
      ) : null}
      {selectedEquippedSlotId && selectedEquippedInstance && selectedEquippedItem ? (
        <ItemDetailCard
          game={game}
          item={selectedEquippedItem}
          equipmentInstance={selectedEquippedInstance}
          equippedSlotId={selectedEquippedSlotId}
          motionEnabled={settings.motion}
          onClose={() => setSelectedEquippedSlotId(null)}
          onChange={(nextGame) => {
            updateGame(nextGame);
            const nextSlot = selectedEquippedSlotId;
            setSelectedEquippedSlotId(null);
            setHighlightSlotId(nextSlot);
            setTimeout(() => setHighlightSlotId(null), 220);
          }}
        />
      ) : null}
    </div>
  );
}

function ItemList({
  tabKey,
  title,
  subtitle,
  categories,
}: {
  tabKey: Exclude<InventoryTab, "equipment">;
  title: string;
  subtitle: string;
  categories: ItemConfig["category"][];
}) {
  const game = useActiveGame();
  const updateGame = useUpdateGame();
  const settings = useSettings();
  const selectedItemId = useUiStore((state) => state.inventoryUi.selectedItemIdByTab[tabKey]);
  const page = useUiStore((state) => state.inventoryUi.itemPageByTab[tabKey]);
  const setSelectedItemId = useUiStore((state) => state.setSelectedItemId);
  const setPage = useUiStore((state) => state.setItemPage);

  if (!game) {
    return null;
  }

  const visibleItems = useMemo(() => getInventoryItems(game, categories), [categories, game]);
  const selectedItem = useMemo(() => (selectedItemId ? getItem(selectedItemId) : null), [selectedItemId]);
  const selectedAmount = selectedItem ? (game.inventory.items[selectedItem.id] ?? 0) : 0;
  const iconName = categories.includes("pill") ? "item-pill" : categories.includes("material") ? "item-material" : "item";
  const entries = useMemo(
    () =>
      visibleItems.map<InventoryGridEntry>((item) => ({
        id: item.id,
        item,
        iconName: getItemIconName(item, iconName),
        amount: game.inventory.items[item.id] ?? 0,
        onSelect: () => setSelectedItemId(tabKey, item.id),
      })),
    [game.inventory.items, iconName, setSelectedItemId, tabKey, visibleItems],
  );

  return (
    <div className="item-list">
      <div className="section-heading">
        <h2>
          <GameIcon name={iconName} size={18} />
          {title}
        </h2>
        <span>
          {subtitle} {visibleItems.length} 种
        </span>
      </div>
      <InventoryGrid entries={entries} emptyText="暂无此类物品。" page={page} onPageChange={(nextPage) => setPage(tabKey, nextPage)} showStackCount />
      {selectedItem && selectedAmount > 0 ? (
        <ItemDetailCard
          game={game}
          item={selectedItem}
          motionEnabled={settings.motion}
          onClose={() => setSelectedItemId(tabKey, null)}
          onChange={(nextGame) => {
            updateGame(nextGame);
            setSelectedItemId(tabKey, null);
          }}
        />
      ) : null}
    </div>
  );
}

function InventoryGrid({
  entries,
  emptyText,
  page,
  onPageChange,
  showStackCount,
}: {
  entries: InventoryGridEntry[];
  emptyText: string;
  page: number;
  onPageChange: (page: number) => void;
  showStackCount: boolean;
}) {
  const pageCount = useMemo(() => Math.max(1, Math.ceil(entries.length / inventoryGridPageSize)), [entries.length]);
  const safePage = Math.min(page, pageCount - 1);
  const pageEntries = useMemo(() => entries.slice(safePage * inventoryGridPageSize, safePage * inventoryGridPageSize + inventoryGridPageSize), [entries, safePage]);
  const slots = useMemo(() => Array.from({ length: inventoryGridPageSize }, (_, index) => pageEntries[index] ?? null), [pageEntries]);

  return (
    <div className="inventory-grid-wrap">
      <div className="inventory-grid">
        {slots.map((entry, index) =>
          entry ? (
            <ItemSlot
              key={entry.id}
              state="filled"
              grade={entry.item.grade}
              iconName={entry.iconName}
              name={formatItemName(entry.item)}
              amount={showStackCount ? entry.amount : undefined}
              onClick={entry.onSelect}
              className="inventory-grid-slot item-grade-press"
            />
          ) : (
            <ItemSlot state="empty" className="inventory-grid-slot empty" key={`empty-${safePage}-${index}`} />
          ),
        )}
      </div>
      {entries.length === 0 ? <p className="inventory-grid-empty">{emptyText}</p> : null}
      {pageCount > 1 ? (
        <div className="equipment-page-controls inventory-page-controls">
          <button className="ghost-button" disabled={safePage <= 0} onClick={() => onPageChange(Math.max(0, safePage - 1))}>
            上一页
          </button>
          <span>
            {safePage + 1} / {pageCount}
          </span>
          <button className="ghost-button" disabled={safePage >= pageCount - 1} onClick={() => onPageChange(Math.min(pageCount - 1, safePage + 1))}>
            下一页
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ItemDetailCard({
  game,
  item,
  equipmentInstance,
  equippedSlotId,
  motionEnabled,
  onClose,
  onChange,
}: {
  game: GameState;
  item: ItemConfig;
  equipmentInstance?: EquipmentInstance;
  equippedSlotId?: EquipmentSlotId;
  motionEnabled: boolean;
  onClose: () => void;
  onChange: (game: GameState) => void;
}) {
  const { notify } = useGameToast();
  const slot = item.equipment?.slot;
  const amount = equipmentInstance ? 1 : game.inventory.items[item.id] ?? 0;
  const replacing = slot ? Boolean(game.inventory.equipment[slot] && game.inventory.equipment[slot] !== equipmentInstance?.id) : false;
  const sellable = canSellItem(item);
  const sellPrice = getItemSellPrice(item);
  const equipAllowed = item.equipment ? canEquipItem(game, item) : false;
  const visibleAffixes = equipmentInstance?.affixes ?? (item.equipment ? [] : item.affixes ?? []);
  const equipmentBonuses = equipmentInstance?.bonuses;
  const seal = equipmentInstance ? getEquipmentSealState(game, equipmentInstance) : item.equipment ? getEquipmentSealState(game, item) : null;
  const displayName = equipmentInstance?.displayName ?? formatItemName(item);

  function handleUnequip() {
    if (!equippedSlotId) {
      return;
    }
    onChange(unequipSlot(game, equippedSlotId));
    notify({ title: "已卸下装备", description: displayName, tone: "success", grade: item.grade });
    onClose();
  }

  function handleEquip() {
    if (!equipmentInstance) {
      return;
    }
    onChange(equipEquipmentInstance(game, equipmentInstance.id));
    notify({ title: replacing ? "已替换装备" : "已装备", description: displayName, tone: "success", grade: item.grade });
    onClose();
  }

  function handleSell() {
    onChange(equipmentInstance ? sellEquipmentInstance(game, equipmentInstance.id) : sellItem(game, item.id));
    notify({ title: "出售成功", description: `获得 ${formatNumber(sellPrice)} 灵石`, tone: "gold", grade: item.grade });
    onClose();
  }

  return (
    <BottomSheet
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={displayName}
      subtitle={`${itemTierLabels[item.tier]} · ${slot ? getSlotLabel(slot) : categoryLabels[item.category]}`}
      motionEnabled={motionEnabled}
      className={`item-detail-card grade-card grade-${item.grade}`}
      footer={
        <div className="equipment-detail-actions">
          {equipmentInstance && item.equipment && equippedSlotId ? (
            <GameButton variant="primary" onClick={handleUnequip}>
              卸下
            </GameButton>
          ) : equipmentInstance && item.equipment ? (
            <GameButton variant="primary" disabled={!equipAllowed} onClick={handleEquip}>
              {equipAllowed ? (replacing ? "替换装备" : "选择装备") : "境界不足"}
            </GameButton>
          ) : null}
          {!equippedSlotId ? (
            <GameButton variant="danger" disabled={!sellable || (!equipmentInstance && amount <= 0)} onClick={handleSell}>
              出售
            </GameButton>
          ) : null}
          <GameButton variant="ghost" onClick={onClose}>
            {equippedSlotId ? "返回" : "关闭"}
          </GameButton>
        </div>
      }
    >
      <div className="item-detail-sheet">
        <div className="item-detail-title-row">
          <span className="item-detail-icon">
            <GameIcon name={slot ? slotIcons[slot] ?? "equipment" : getItemIconName(item)} size={20} />
          </span>
          <div>
            <strong className={getGradeNameClass(item)}>{displayName}</strong>
            <GradeBadge grade={item.grade} />
          </div>
        </div>
        <p>{item.description}</p>
        <div className="item-detail-pill-row">
          <span>{itemTierLabels[item.tier]}</span>
          <span>{slot ? getSlotLabel(slot) : categoryLabels[item.category]}</span>
          {!equipmentInstance ? <span>x{amount}</span> : null}
          {seal?.sealed ? <span>封印中 · 主属性 {Math.round(seal.mainStatMultiplier * 100)}%</span> : null}
        </div>
        {item.equipment && equipmentBonuses ? (
          <section className="item-detail-section">
            <h3>属性</h3>
            <div className="item-detail-bonus-list">
              {formatBonusEntries(equipmentBonuses).map((entry) => (
                <div key={entry.label}>
                  <span>{entry.label}</span>
                  <strong>{entry.value}</strong>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        {item.combatHeal ? (
          <section className="item-detail-section">
            <h3>效果</h3>
            <div className="item-detail-bonus-grid">
              <div>
                <span>战斗回复</span>
                <strong>气血 +{formatNumber(item.combatHeal)}</strong>
              </div>
            </div>
          </section>
        ) : null}
        {visibleAffixes.length > 0 ? (
          <section className="item-detail-section">
            <h3>词条</h3>
            <div className="grade-affix-list">
              {visibleAffixes.map((affix) => (
                <span key={affix.id}>
                  <strong>{affix.name}</strong>
                  <small>{seal?.affixesSealed && affix.special ? "境界不足，特殊词条暂未激活" : affix.description}</small>
                </span>
              ))}
            </div>
          </section>
        ) : null}
        <div className="equipment-detail-stats compact">
          <DetailRow label="价值" value={item.price ? `${formatNumber(item.price)} 灵石` : "不可定价"} />
          <DetailRow label="出售" value={sellable ? `${formatNumber(sellPrice)} 灵石` : "不可出售"} />
        </div>
      </div>
    </BottomSheet>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatCell({ label, value, bonus }: { label: string; value: string | number; bonus: string | null }) {
  return (
    <div className="attribute-cell">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{bonus ?? "基础"}</small>
    </div>
  );
}

function getInventoryItems(game: GameState, categories: ItemConfig["category"][]): ItemConfig[] {
  return items
    .filter((item) => !item.equipment && categories.includes(item.category) && (game.inventory.items[item.id] ?? 0) > 0)
    .sort((a, b) => itemGradeMetas[b.grade].tier - itemGradeMetas[a.grade].tier || a.name.localeCompare(b.name, "zh-CN"));
}

function getGradeNameClass(item: ItemConfig): string {
  return `grade-name grade-${item.grade}${shouldEmphasizeItemGrade(item.grade) ? " strong" : ""}`;
}

function getItemIconName(item: ItemConfig, fallback: GameIconName = "item"): GameIconName {
  if (item.equipment) {
    return slotIcons[item.equipment.slot] ?? "equipment";
  }
  if (item.category === "pill") {
    return "item-pill";
  }
  if (item.category === "material") {
    return "item-material";
  }
  return fallback;
}

function getSlotLabel(slotId: string): string {
  return equipmentSlots.find((slot) => slot.id === slotId)?.label ?? "装备";
}

function formatBonusEntries(bonuses?: EquipmentBonus): Array<{ label: string; value: string }> {
  if (!bonuses) {
    return [];
  }
  return statOrder
    .filter((key) => Boolean(bonuses[key]))
    .map((key) => ({
      label: statLabels[key],
      value: formatSignedStatValue(key, bonuses[key] ?? 0),
    }));
}

function formatBonusValue(key: keyof Stats, value: number): string | null {
  if (value <= 0) {
    return null;
  }
  return formatSignedStatValue(key, value);
}

function formatSignedStatValue(key: keyof Stats, value: number): string {
  const formatted = String(formatStatValue(key, value));
  return formatted.startsWith("+") || formatted.startsWith("-") ? formatted : `+${formatted}`;
}

function formatStatValue(key: keyof Stats, value: number): string | number {
  if (key === "critRate" || key === "dodgeRate") {
    return `${Math.round(value * 100)}%`;
  }
  if (key === "critDamage") {
    return value < 1 ? `+${Math.round(value * 100)}%` : `${value.toFixed(2)}倍`;
  }
  return Math.round(value);
}

function formatNumber(value: number): string {
  return value.toLocaleString("zh-CN");
}
