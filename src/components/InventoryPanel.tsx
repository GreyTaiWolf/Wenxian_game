import { useState } from "react";
import { getItem, items } from "../data/items";
import {
  equipItem,
  equipmentSlots,
  getEffectiveStats,
  getEquippableInventoryItems,
  getEquippedItem,
  getItemSellPrice,
  sellItem,
  unequipSlot,
} from "../game/equipment";
import type { EquipmentBonus, GameState, ItemConfig, Stats } from "../types";
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

const statOrder: Array<keyof Stats> = ["maxHp", "maxSpirit", "attack", "defense", "divineSense", "speed", "dodge", "crit"];
const compactStatOrder: Array<keyof Stats> = ["maxHp", "attack", "maxSpirit", "defense"];
const equippablePageSize = 6;
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
      {tab === "items" ? <ItemList game={game} title="随身物品" items={getInventoryItems(game, ["currency", "quest"])} /> : null}
      {tab === "pills" ? <ItemList game={game} title="丹药" items={getInventoryItems(game, ["pill"])} /> : null}
      {tab === "materials" ? <ItemList game={game} title="材料" items={getInventoryItems(game, ["material"])} /> : null}
    </section>
  );
}

function EquipmentPanel({ game, onChange }: { game: GameState; onChange: (game: GameState) => void }) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [equipmentPage, setEquipmentPage] = useState(0);
  const [showAttributeDetails, setShowAttributeDetails] = useState(false);
  const effectiveStats = getEffectiveStats(game);
  const equippableItems = getEquippableInventoryItems(game);
  const pageCount = Math.max(1, Math.ceil(equippableItems.length / equippablePageSize));
  const safeEquipmentPage = Math.min(equipmentPage, pageCount - 1);
  const pagedEquippableItems = equippableItems.slice(
    safeEquipmentPage * equippablePageSize,
    safeEquipmentPage * equippablePageSize + equippablePageSize,
  );
  const selectedItem = selectedItemId ? getItem(selectedItemId) : null;
  const selectedAmount = selectedItem ? (game.inventory.items[selectedItem.id] ?? 0) : 0;

  return (
    <div className="equipment-panel">
      <section>
        <div className="section-heading">
          <h2>
            <GameIcon name="equipment" size={18} />
            装备栏
          </h2>
          <span>六槽</span>
        </div>
        <div className="equipment-slot-grid">
          {equipmentSlots.map((slot) => {
            const item = getEquippedItem(game, slot.id);
            const rawValue = game.inventory.equipment[slot.id];
            return (
              <article className={`equipment-slot-card ${item ? "filled" : ""}`} key={slot.id}>
                <GameIcon name={slotIcons[slot.id] ?? "equipment"} size={18} />
                <div>
                  <small>{slot.label}</small>
                  <strong>{item?.name ?? rawValue ?? slot.emptyLabel}</strong>
                  <span>{item ? formatBonuses(item.equipment?.bonuses) : rawValue ? "旧存档装备，暂无加成" : "空槽"}</span>
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
          <span>{equippableItems.length > equippablePageSize ? `${safeEquipmentPage + 1}/${pageCount}` : `${equippableItems.length} 件`}</span>
        </div>
        <div className="equipment-candidate-list">
          {equippableItems.length ? (
            pagedEquippableItems.map((item) => (
              <button className="equipment-name-chip" key={item.id} onClick={() => setSelectedItemId(item.id)}>
                <GameIcon name={item.equipment ? slotIcons[item.equipment.slot] ?? "equipment" : "equipment"} size={15} />
                {item.name}
              </button>
            ))
          ) : (
            <p className="empty-hint">暂无可穿戴装备，可去坊市购买或历练获取。</p>
          )}
        </div>
        {equippableItems.length > equippablePageSize ? (
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
          <span>简略</span>
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

      {selectedItem && selectedItem.equipment && selectedAmount > 0 ? (
        <EquipmentDetailCard
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

function EquipmentDetailCard({
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
  const sellPrice = getItemSellPrice(item);

  return (
    <div className="equipment-detail-backdrop" onClick={onClose}>
      <section className="equipment-detail-card" onClick={(event) => event.stopPropagation()}>
        <div className="section-heading">
          <h2>
            <GameIcon name={slot ? slotIcons[slot] ?? "equipment" : "equipment"} size={18} />
            {item.name}
          </h2>
          <span>{slot ? getSlotLabel(slot) : "装备"}</span>
        </div>
        <p>{item.description}</p>
        <div className="equipment-detail-stats">
          <div>
            <span>数量</span>
            <strong>x{amount}</strong>
          </div>
          <div>
            <span>属性</span>
            <strong>{formatBonuses(item.equipment?.bonuses)}</strong>
          </div>
          <div>
            <span>出售</span>
            <strong>{sellPrice} 灵石</strong>
          </div>
        </div>
        <div className="equipment-detail-actions">
          <button className="primary-action compact" onClick={() => onChange(equipItem(game, item.id))}>
            {replacing ? "替换装备" : "选择装备"}
          </button>
          <button className="ghost-button" onClick={() => onChange(sellItem(game, item.id))}>
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

function ItemList({ title, items: visibleItems, game }: { title: string; items: ItemConfig[]; game: GameState }) {
  return (
    <div className="item-list">
      <div className="section-heading">
        <h2>
          <GameIcon name={visibleItems[0]?.category === "pill" ? "item-pill" : visibleItems[0]?.category === "material" ? "item-material" : "item"} size={18} />
          {title}
        </h2>
        <span>{visibleItems.length} 类</span>
      </div>
      {visibleItems.length ? (
        visibleItems.map((item) => (
          <div className="item-row" key={item.id}>
            <div>
              <strong>{getItem(item.id).name}</strong>
              <small>{item.description}</small>
            </div>
            <span>x{game.inventory.items[item.id] ?? 0}</span>
          </div>
        ))
      ) : (
        <p className="empty-hint">暂无此类物品。</p>
      )}
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
  return items.filter((item) => categories.includes(item.category) && (game.inventory.items[item.id] ?? 0) > 0);
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
