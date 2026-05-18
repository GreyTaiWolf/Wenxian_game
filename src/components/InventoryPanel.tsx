import { useState } from "react";
import {
  formatItemName,
  getItem,
  getItemGradeAffixes,
  itemGradeLabels,
  itemGradeMetas,
  items,
  shouldEmphasizeItemGrade,
} from "../data/items";
import {
  canSellItem,
  equipItem,
  equipmentSlots,
  getEffectiveStats,
  getEquippedItem,
  getItemSellPrice,
  sellItem,
  unequipSlot,
} from "../game/equipment";
import type { EquipmentBonus, GameState, ItemConfig, ItemGrade, Stats } from "../types";
import { GameIcon, type GameIconName } from "./GameIcon";

type InventoryTab = "equipment" | "items" | "pills" | "materials";

const statLabels: Record<keyof Stats, string> = {
  maxHp: "气血",
  maxSpirit: "灵力",
  attack: "攻击",
  defense: "防御",
  divineSense: "神识",
  speed: "速度",
  dodge: "闪避",
  crit: "暴击",
};

const categoryLabels: Record<ItemConfig["category"], string> = {
  currency: "货币",
  equipment: "装备",
  material: "材料",
  pill: "丹药",
  quest: "任务",
};

const statOrder: Array<keyof Stats> = ["maxHp", "maxSpirit", "attack", "defense", "divineSense", "speed", "dodge", "crit"];
const compactStatOrder: Array<keyof Stats> = ["maxHp", "attack", "maxSpirit", "defense"];
const equippableItemPageSize = 4;
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
      {tab === "items" ? <ItemList game={game} title="随身物品" categories={["currency", "quest"]} onChange={onChange} /> : null}
      {tab === "pills" ? <ItemList game={game} title="丹药" categories={["pill"]} onChange={onChange} /> : null}
      {tab === "materials" ? <ItemList game={game} title="材料" categories={["material"]} onChange={onChange} /> : null}
    </section>
  );
}

function EquipmentPanel({ game, onChange }: { game: GameState; onChange: (game: GameState) => void }) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [equipmentPage, setEquipmentPage] = useState(0);
  const [showAttributeDetails, setShowAttributeDetails] = useState(false);
  const effectiveStats = getEffectiveStats(game);
  const equippableItems = getInventoryItems(game, ["equipment"]);
  const pageCount = Math.max(1, Math.ceil(equippableItems.length / equippableItemPageSize));
  const safeEquipmentPage = Math.min(equipmentPage, pageCount - 1);
  const pagedEquippableItems = equippableItems.slice(
    safeEquipmentPage * equippableItemPageSize,
    safeEquipmentPage * equippableItemPageSize + equippableItemPageSize,
  );
  const selectedItem = selectedItemId ? getItem(selectedItemId) : null;
  const selectedAmount = selectedItem ? (game.inventory.items[selectedItem.id] ?? 0) : 0;

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
            const item = getEquippedItem(game, slot.id);
            const rawValue = game.inventory.equipment[slot.id];
            return (
              <article className={`equipment-slot-card ${item ? `filled grade-card grade-${item.grade}` : ""}`} key={slot.id}>
                <GameIcon name={slotIcons[slot.id] ?? "equipment"} size={18} />
                <div>
                  <div className="equipment-slot-meta">
                    <small>{slot.label}</small>
                    {item ? <GradeChip grade={item.grade} compact /> : null}
                  </div>
                  <strong className={item ? getGradeNameClass(item) : ""}>{item ? formatItemName(item) : rawValue ?? slot.emptyLabel}</strong>
                  <span>{item ? formatBonuses(item.equipment?.bonuses) : rawValue ? "旧存档装备已失效" : "空槽"}</span>
                </div>
                <button disabled={!rawValue} onClick={() => onChange(unequipSlot(game, slot.id))}>
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
            可穿戴
          </h2>
          <span>{equippableItems.length > equippableItemPageSize ? `${safeEquipmentPage + 1}/${pageCount}` : `${equippableItems.length} 件`}</span>
        </div>
        <div className="equipment-candidate-list">
          {equippableItems.length ? (
            pagedEquippableItems.map((item) => (
              <ItemCard
                game={game}
                iconName={item.equipment ? slotIcons[item.equipment.slot] ?? "equipment" : "equipment"}
                item={item}
                key={item.id}
                onSelect={setSelectedItemId}
              />
            ))
          ) : (
            <p className="empty-hint">暂无可穿戴装备，可去坊市购买或历练获取。</p>
          )}
        </div>
        {equippableItems.length > equippableItemPageSize ? (
          <div className="equipment-page-controls">
            <button className="ghost-button" disabled={safeEquipmentPage <= 0} onClick={() => setEquipmentPage(Math.max(0, safeEquipmentPage - 1))}>
              上一页
            </button>
            <span>
              {safeEquipmentPage + 1} / {pageCount}
            </span>
            <button
              className="ghost-button"
              disabled={safeEquipmentPage >= pageCount - 1}
              onClick={() => setEquipmentPage(Math.min(pageCount - 1, safeEquipmentPage + 1))}
            >
              下一页
            </button>
          </div>
        ) : null}
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

function ItemList({
  title,
  categories,
  game,
  onChange,
}: {
  title: string;
  categories: ItemConfig["category"][];
  game: GameState;
  onChange: (game: GameState) => void;
}) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const visibleItems = getInventoryItems(game, categories);
  const selectedItem = selectedItemId ? getItem(selectedItemId) : null;
  const selectedAmount = selectedItem ? (game.inventory.items[selectedItem.id] ?? 0) : 0;
  const iconName = categories.includes("pill") ? "item-pill" : categories.includes("material") ? "item-material" : "item";

  return (
    <div className="item-list">
      <div className="section-heading">
        <h2>
          <GameIcon name={iconName} size={18} />
          {title}
        </h2>
        <span>{visibleItems.length} 件</span>
      </div>
      {visibleItems.length ? (
        visibleItems.map((item) => <ItemCard game={game} iconName={getItemIconName(item, iconName)} item={item} key={item.id} onSelect={setSelectedItemId} />)
      ) : (
        <p className="empty-hint">暂无此类物品。</p>
      )}
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

function ItemCard({
  game,
  item,
  iconName,
  onSelect,
}: {
  game: GameState;
  item: ItemConfig;
  iconName: GameIconName;
  onSelect: (itemId: string) => void;
}) {
  const amount = game.inventory.items[item.id] ?? 0;
  return (
    <button className={`item-card grade-card grade-${item.grade}`} type="button" onClick={() => onSelect(item.id)}>
      <GameIcon name={iconName} size={17} />
      <div>
        <strong className={getGradeNameClass(item)}>{formatItemName(item)}</strong>
        <small>
          {categoryLabels[item.category]} · x{amount}
          {item.equipment ? ` · ${getSlotLabel(item.equipment.slot)}` : ""}
        </small>
        <span>{formatItemSummary(item)}</span>
      </div>
      <GradeChip grade={item.grade} />
    </button>
  );
}

function ItemDetailCard({
  game,
  item,
  onClose,
  onChange,
}: {
  game: GameState;
  item: ItemConfig;
  onClose: () => void;
  onChange: (game: GameState) => void;
}) {
  const slot = item.equipment?.slot;
  const replacing = slot ? Boolean(game.inventory.equipment[slot]) : false;
  const amount = game.inventory.items[item.id] ?? 0;
  const sellable = canSellItem(item);
  const sellPrice = getItemSellPrice(item);
  const gradeMeta = itemGradeMetas[item.grade];
  const gradeAffixes = getItemGradeAffixes(item.grade);

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
        <div className="equipment-detail-stats">
          <DetailRow label="品级" value={`${itemGradeLabels[item.grade]} · ${gradeMeta.tone}`} />
          <DetailRow label="倍率" value={`价格 x${formatNumber(gradeMeta.priceMultiplier)} · 效果 x${gradeMeta.effectMultiplier}`} />
          <DetailRow label="类型" value={slot ? getSlotLabel(slot) : categoryLabels[item.category]} />
          <DetailRow label="数量" value={`x${amount}`} />
          <DetailRow label="价值" value={item.price ? `${formatNumber(item.price)} 灵石` : "不可定价"} />
          {item.equipment ? <DetailRow label="属性" value={formatBonuses(item.equipment.bonuses)} /> : null}
          {item.equipment ? <DetailRow label="战力" value={`+${formatNumber(item.equipment.powerBonus)}`} /> : null}
          {item.combatHeal ? <DetailRow label="战斗" value={`气血 +${formatNumber(item.combatHeal)}`} /> : null}
          <DetailRow label="出售" value={sellable ? `${formatNumber(sellPrice)} 灵石` : "不可出售"} />
        </div>
        <div className="grade-affix-list">
          {gradeAffixes.map((affix) => (
            <span key={affix.id}>
              <strong>{affix.name}</strong>
              <small>{affix.description}</small>
            </span>
          ))}
        </div>
        <div className="equipment-detail-actions">
          {item.equipment ? (
            <button className="primary-action compact" onClick={() => onChange(equipItem(game, item.id))}>
              {replacing ? "替换装备" : "选择装备"}
            </button>
          ) : null}
          <button className="ghost-button" disabled={!sellable || amount <= 0} onClick={() => onChange(sellItem(game, item.id))}>
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
  return <span className={`grade-chip grade-${grade} ${compact ? "compact" : ""}`}>{itemGradeLabels[grade]}</span>;
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
    .filter((item) => categories.includes(item.category) && (game.inventory.items[item.id] ?? 0) > 0)
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

function formatItemSummary(item: ItemConfig): string {
  if (item.equipment) {
    return formatBonuses(item.equipment.bonuses);
  }
  if (item.combatHeal) {
    return `战斗气血 +${formatNumber(item.combatHeal)}`;
  }
  if (item.price) {
    return `价值 ${formatNumber(item.price)} 灵石`;
  }
  return item.description;
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
  return Math.round(value);
}

function formatNumber(value: number): string {
  return value.toLocaleString("zh-CN");
}
