import { useState } from "react";
import {
  formatItemName,
  getItem,
  itemGradeLabels,
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
  getEquippedEquipmentInstance,
  getEquippedItem,
  getEquippableInventoryItems,
  getItemSellPrice,
  sellEquipmentInstance,
  sellItem,
  unequipSlot,
} from "../game/equipment";
import type { EquipmentBonus, EquipmentInstance, GameState, ItemConfig, ItemGrade, Stats } from "../types";
import { GameIcon, type GameIconName } from "./GameIcon";

type InventoryTab = "equipment" | "items" | "pills" | "materials";

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
  divineSense: "神识",
  speed: "速度",
  dodge: "闪避",
  crit: "暴击",
  critDamage: "暴伤",
};

const categoryLabels: Record<ItemConfig["category"], string> = {
  currency: "货币",
  equipment: "装备",
  material: "材料",
  pill: "丹药",
  quest: "任务",
};

const statOrder: Array<keyof Stats> = ["maxHp", "maxSpirit", "attack", "defense", "divineSense", "speed", "dodge", "crit", "critDamage"];
const compactStatOrder: Array<keyof Stats> = ["maxHp", "attack", "maxSpirit", "defense"];
const inventoryGridPageSize = 9;
const slotIcons: Record<string, GameIconName> = {
  weapon: "equipment-weapon",
  robe: "equipment-robe",
  crown: "equipment-crown",
  shoes: "equipment-shoes",
  accessory: "equipment-accessory",
  treasure: "equipment-treasure",
};

export default function InventoryPanel({ game, onChange }: { game: GameState; onChange: (game: GameState) => void }) {
  const [tab, setTab] = useState<InventoryTab>("equipment");

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

      {tab === "equipment" ? <EquipmentPanel game={game} onChange={onChange} /> : null}
      {tab === "items" ? <ItemList game={game} title="背包" subtitle="物品" categories={["currency", "quest"]} onChange={onChange} /> : null}
      {tab === "pills" ? <ItemList game={game} title="背包" subtitle="丹药" categories={["pill"]} onChange={onChange} /> : null}
      {tab === "materials" ? <ItemList game={game} title="背包" subtitle="材料" categories={["material"]} onChange={onChange} /> : null}
    </section>
  );
}

function EquipmentPanel({ game, onChange }: { game: GameState; onChange: (game: GameState) => void }) {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [equipmentPage, setEquipmentPage] = useState(0);
  const [showAttributeDetails, setShowAttributeDetails] = useState(false);
  const [highlightSlotId, setHighlightSlotId] = useState<string | null>(null);
  const effectiveStats = getEffectiveStats(game);
  const equipmentBagItems = getEquippableInventoryItems(game);
  const selectedEquipment = selectedEquipmentId ? game.inventory.equipmentItems.find((instance) => instance.id === selectedEquipmentId) ?? null : null;
  const selectedItem = getEquipmentInstanceItem(selectedEquipment);
  const equipmentEntries = equipmentBagItems.flatMap<InventoryGridEntry>((instance) => {
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
  });

  return (
    <div className="equipment-panel">
      <section>
        <div className="section-heading">
          <h2>
            <GameIcon name="equipment" size={18} />
            装备格
          </h2>
          <span>六槽</span>
        </div>
        <div className="equipment-slot-grid">
          {equipmentSlots.map((slot) => {
            const instance = getEquippedEquipmentInstance(game, slot.id);
            const item = getEquippedItem(game, slot.id);
            const rawValue = game.inventory.equipment[slot.id];
            return (
              <article
                className={`equipment-slot-card ${item ? `filled grade-card grade-${item.grade}` : ""}${highlightSlotId === slot.id ? " slot-action-highlight" : ""}`}
                key={slot.id}
              >
                <GameIcon name={slotIcons[slot.id] ?? "equipment"} size={18} />
                <div>
                  <div className="equipment-slot-meta">
                    <small>{slot.label}</small>
                    {item ? <GradeChip grade={item.grade} compact /> : null}
                  </div>
                  <strong className={item ? getGradeNameClass(item) : ""}>{item ? formatItemName(item) : rawValue ? "装备数据已失效" : slot.emptyLabel}</strong>
                  <span>{item ? formatBonuses(instance?.bonuses) : rawValue ? "请卸下后重新获取" : "空槽"}</span>
                </div>
                <button
                  disabled={!rawValue}
                  onClick={() => {
                    onChange(unequipSlot(game, slot.id));
                    setHighlightSlotId(slot.id);
                    setTimeout(() => setHighlightSlotId((current) => (current === slot.id ? null : current)), 220);
                  }}
                >
                  卸下
                </button>
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
            onClick={() => setShowAttributeDetails((isOpen) => !isOpen)}
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
          onClose={() => setSelectedEquipmentId(null)}
          onChange={(nextGame) => {
            onChange(nextGame);
            if (selectedItem.equipment?.slot) {
              const nextSlot = selectedItem.equipment.slot;
              setHighlightSlotId(nextSlot);
              setTimeout(() => setHighlightSlotId((current) => (current === nextSlot ? null : current)), 220);
            }
            setSelectedEquipmentId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ItemList({
  title,
  subtitle,
  categories,
  game,
  onChange,
}: {
  title: string;
  subtitle: string;
  categories: ItemConfig["category"][];
  game: GameState;
  onChange: (game: GameState) => void;
}) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const visibleItems = getInventoryItems(game, categories);
  const selectedItem = selectedItemId ? getItem(selectedItemId) : null;
  const selectedAmount = selectedItem ? (game.inventory.items[selectedItem.id] ?? 0) : 0;
  const iconName = categories.includes("pill") ? "item-pill" : categories.includes("material") ? "item-material" : "item";
  const entries = visibleItems.map<InventoryGridEntry>((item) => ({
    id: item.id,
    item,
    iconName: getItemIconName(item, iconName),
    amount: game.inventory.items[item.id] ?? 0,
    onSelect: () => setSelectedItemId(item.id),
  }));

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
      <InventoryGrid entries={entries} emptyText="暂无此类物品。" page={page} onPageChange={setPage} showStackCount />
      {selectedItem && selectedAmount > 0 ? (
        <ItemDetailCard
          game={game}
          item={selectedItem}
          onClose={() => setSelectedItemId(null)}
          onChange={(nextGame) => {
            onChange(nextGame);
            setSelectedItemId(null);
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
  const pageCount = Math.max(1, Math.ceil(entries.length / inventoryGridPageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageEntries = entries.slice(safePage * inventoryGridPageSize, safePage * inventoryGridPageSize + inventoryGridPageSize);
  const slots = Array.from({ length: inventoryGridPageSize }, (_, index) => pageEntries[index] ?? null);

  return (
    <div className="inventory-grid-wrap">
      <div className="inventory-grid">
        {slots.map((entry, index) =>
          entry ? (
            <button
              className={`inventory-grid-slot filled grade-card grade-${entry.item.grade} item-grade-press`}
              key={entry.id}
              type="button"
              onClick={entry.onSelect}
            >
              <GameIcon name={entry.iconName} size={17} />
              <strong className={getGradeNameClass(entry.item)}>{formatItemName(entry.item)}</strong>
              <span className="inventory-grid-meta">
                <GradeChip grade={entry.item.grade} compact />
                {showStackCount && typeof entry.amount === "number" ? <small className="inventory-count-badge">x{entry.amount}</small> : null}
              </span>
            </button>
          ) : (
            <div className="inventory-grid-slot empty" key={`empty-${safePage}-${index}`} aria-hidden="true" />
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
  onClose,
  onChange,
}: {
  game: GameState;
  item: ItemConfig;
  equipmentInstance?: EquipmentInstance;
  onClose: () => void;
  onChange: (game: GameState) => void;
}) {
  const slot = item.equipment?.slot;
  const amount = equipmentInstance ? 1 : game.inventory.items[item.id] ?? 0;
  const replacing = slot ? Boolean(game.inventory.equipment[slot] && game.inventory.equipment[slot] !== equipmentInstance?.id) : false;
  const sellable = canSellItem(item);
  const sellPrice = getItemSellPrice(item);
  const equipAllowed = item.equipment ? canEquipItem(game, item) : false;
  const visibleAffixes = equipmentInstance?.affixes ?? item.affixes ?? [];
  const equipmentBonuses = equipmentInstance?.bonuses ?? item.equipment?.bonuses;

  return (
    <div className="equipment-detail-backdrop" onClick={onClose}>
      <section className={`equipment-detail-card item-detail-card grade-card grade-${item.grade}`} onClick={(event) => event.stopPropagation()}>
        <div className="section-heading item-detail-head">
          <h2 className={getGradeNameClass(item)}>
            <GameIcon name={slot ? slotIcons[slot] ?? "equipment" : getItemIconName(item)} size={18} />
            {formatItemName(item)}
          </h2>
          <GradeChip grade={item.grade} />
        </div>
        <p>{item.description}</p>
        <div className="item-detail-pill-row">
          <span>{itemTierLabels[item.tier]}</span>
          <span>{slot ? getSlotLabel(slot) : categoryLabels[item.category]}</span>
          {!equipmentInstance ? <span>x{amount}</span> : null}
        </div>
        {item.equipment ? (
          <section className="item-detail-section">
            <h3>属性</h3>
            <div className="item-detail-bonus-grid">
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
                  <small>{affix.description}</small>
                </span>
              ))}
            </div>
          </section>
        ) : null}
        <div className="equipment-detail-stats compact">
          <DetailRow label="价值" value={item.price ? `${formatNumber(item.price)} 灵石` : "不可定价"} />
          <DetailRow label="出售" value={sellable ? `${formatNumber(sellPrice)} 灵石` : "不可出售"} />
        </div>
        <div className="equipment-detail-actions">
          {equipmentInstance && item.equipment ? (
            <button
              className="primary-action compact"
              disabled={!equipAllowed}
              onClick={() => {
                onChange(equipEquipmentInstance(game, equipmentInstance.id));
                onClose();
              }}
            >
              {equipAllowed ? (replacing ? "替换装备" : "选择装备") : "境界不足"}
            </button>
          ) : null}
          <button
            className="ghost-button"
            disabled={!sellable || (!equipmentInstance && amount <= 0)}
            onClick={() => {
              onChange(equipmentInstance ? sellEquipmentInstance(game, equipmentInstance.id) : sellItem(game, item.id));
              onClose();
            }}
          >
            出售
          </button>
          <button className="ghost-button" onClick={onClose}>
            关闭
          </button>
        </div>
      </section>
    </div>
  );
}

function GradeChip({ grade, compact = false }: { grade: ItemGrade; compact?: boolean }) {
  const tier = itemGradeMetas[grade].tier;
  const showTierMarks = !compact && shouldEmphasizeItemGrade(grade);
  return (
    <span className={`grade-chip grade-${grade} ${compact ? "compact" : ""}`}>
      <strong>{itemGradeLabels[grade]}</strong>
      {showTierMarks ? <i aria-hidden>{Array.from({ length: tier }, () => "✦").join("")}</i> : null}
    </span>
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

function formatBonuses(bonuses?: EquipmentBonus): string {
  if (!bonuses) {
    return "无属性加成";
  }
  const parts = statOrder
    .filter((key) => Boolean(bonuses[key]))
    .map((key) => `${statLabels[key]} +${formatStatValue(key, bonuses[key] ?? 0)}`);
  return parts.length ? parts.join("，") : "无属性加成";
}

function formatBonusEntries(bonuses?: EquipmentBonus): Array<{ label: string; value: string }> {
  if (!bonuses) {
    return [];
  }
  return statOrder
    .filter((key) => Boolean(bonuses[key]))
    .map((key) => ({
      label: statLabels[key],
      value: `+${formatStatValue(key, bonuses[key] ?? 0)}`,
    }));
}

function formatBonusValue(key: keyof Stats, value: number): string | null {
  if (value <= 0) {
    return null;
  }
  return `+${formatStatValue(key, value)}`;
}

function formatStatValue(key: keyof Stats, value: number): string | number {
  if (key === "crit" || key === "dodge") {
    return `${Math.round(value * 100)}%`;
  }
  if (key === "critDamage") {
    return `${value.toFixed(2)}倍`;
  }
  return Math.round(value);
}

function formatNumber(value: number): string {
  return value.toLocaleString("zh-CN");
}
