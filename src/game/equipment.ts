import { getItem, items, normalizeItemId } from "../data/items";
import type { EquipmentBonus, EquipmentSlotId, GameState, InventoryState, ItemConfig, Stats } from "../types";

export const equipmentSlots: Array<{ id: EquipmentSlotId; label: string; emptyLabel: string }> = [
  { id: "weapon", label: "武器", emptyLabel: "未持兵刃" },
  { id: "robe", label: "衣服", emptyLabel: "未着法衣" },
  { id: "crown", label: "头冠", emptyLabel: "未戴头冠" },
  { id: "shoes", label: "鞋履", emptyLabel: "未穿鞋履" },
  { id: "accessory", label: "饰品", emptyLabel: "未佩饰品" },
  { id: "treasure", label: "法宝", emptyLabel: "未祭法宝" },
];

export const emptyEquipment: InventoryState["equipment"] = {
  weapon: null,
  robe: null,
  crown: null,
  shoes: null,
  accessory: null,
  treasure: null,
};

const legacyEquipmentMap: Record<string, string | null> = {
  粗铁剑: "rough_iron_sword",
  布衣: "cloth_robe",
  布履: "cloth_shoes",
  无: null,
  "": null,
};

export function normalizeEquipmentSlots(equipment?: Partial<Record<string, unknown>>): InventoryState["equipment"] {
  return equipmentSlots.reduce<InventoryState["equipment"]>((normalized, slot) => {
    normalized[slot.id] = normalizeEquipmentValue(equipment?.[slot.id], slot.id);
    return normalized;
  }, { ...emptyEquipment });
}

export function getEquippedItem(game: GameState, slotId: EquipmentSlotId): ItemConfig | null {
  const equippedId = game.inventory.equipment[slotId];
  if (!equippedId) {
    return null;
  }
  const item = getItem(equippedId);
  return item.equipment?.slot === slotId ? item : null;
}

export function getEquipmentBonuses(game: GameState): { stats: EquipmentBonus; power: number } {
  return equipmentSlots.reduce(
    (total, slot) => {
      const item = getEquippedItem(game, slot.id);
      if (!item?.equipment) {
        return total;
      }
      Object.entries(item.equipment.bonuses).forEach(([statKey, value]) => {
        const key = statKey as keyof Stats;
        total.stats[key] = (total.stats[key] ?? 0) + (value ?? 0);
      });
      total.power += item.equipment.powerBonus;
      return total;
    },
    { stats: {} as EquipmentBonus, power: 0 },
  );
}

export function getEffectiveStats(game: GameState): Stats {
  const bonuses = getEquipmentBonuses(game).stats;
  return {
    maxHp: game.player.stats.maxHp + (bonuses.maxHp ?? 0),
    maxSpirit: game.player.stats.maxSpirit + (bonuses.maxSpirit ?? 0),
    attack: game.player.stats.attack + (bonuses.attack ?? 0),
    defense: game.player.stats.defense + (bonuses.defense ?? 0),
    divineSense: game.player.stats.divineSense + (bonuses.divineSense ?? 0),
    speed: game.player.stats.speed + (bonuses.speed ?? 0),
    dodge: game.player.stats.dodge + (bonuses.dodge ?? 0),
    crit: game.player.stats.crit + (bonuses.crit ?? 0),
  };
}

export function getEffectivePower(game: GameState): number {
  return game.player.power + getEquipmentBonuses(game).power;
}

export function equipItem(game: GameState, itemId: string): GameState {
  const normalizedItemId = normalizeItemId(itemId);
  const item = getItem(normalizedItemId);
  const equipment = item.equipment;
  const amount = game.inventory.items[normalizedItemId] ?? 0;
  if (!equipment || amount <= 0) {
    return game;
  }

  const currentEquippedId = game.inventory.equipment[equipment.slot];
  const nextItems = {
    ...game.inventory.items,
    [normalizedItemId]: amount - 1,
  };

  if (currentEquippedId && getItem(currentEquippedId).equipment?.slot === equipment.slot) {
    nextItems[currentEquippedId] = (nextItems[currentEquippedId] ?? 0) + 1;
  }

  return {
    ...game,
    inventory: {
      ...game.inventory,
      items: nextItems,
      equipment: {
        ...game.inventory.equipment,
        [equipment.slot]: normalizedItemId,
      },
    },
  };
}

export function unequipSlot(game: GameState, slotId: EquipmentSlotId): GameState {
  const equippedId = game.inventory.equipment[slotId];
  if (!equippedId) {
    return game;
  }

  const item = getItem(equippedId);
  const nextItems = { ...game.inventory.items };
  if (item.equipment?.slot === slotId) {
    nextItems[equippedId] = (nextItems[equippedId] ?? 0) + 1;
  }

  return {
    ...game,
    inventory: {
      ...game.inventory,
      items: nextItems,
      equipment: {
        ...game.inventory.equipment,
        [slotId]: null,
      },
    },
  };
}

export function sellItem(game: GameState, itemId: string): GameState {
  const normalizedItemId = normalizeItemId(itemId);
  const item = getItem(normalizedItemId);
  const amount = game.inventory.items[normalizedItemId] ?? 0;
  if (amount <= 0 || !canSellItem(item)) {
    return game;
  }

  return {
    ...game,
    player: {
      ...game.player,
      spiritStones: game.player.spiritStones + getItemSellPrice(item),
    },
    inventory: {
      ...game.inventory,
      items: {
        ...game.inventory.items,
        [normalizedItemId]: amount - 1,
      },
    },
  };
}

export function getItemSellPrice(item: ItemConfig): number {
  return Math.max(1, Math.floor((item.price ?? 1) * 0.5));
}

export function canSellItem(item: ItemConfig): boolean {
  return Boolean(item.price);
}

export function getEquippableInventoryItems(game: GameState): ItemConfig[] {
  return items.filter((item) => item.equipment && (game.inventory.items[item.id] ?? 0) > 0);
}

function normalizeEquipmentValue(value: unknown, slotId: EquipmentSlotId): string | null {
  if (typeof value !== "string") {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(legacyEquipmentMap, value)) {
    return legacyEquipmentMap[value];
  }
  const normalizedValue = normalizeItemId(value);
  const item = getItem(normalizedValue);
  if (item.equipment?.slot === slotId) {
    return normalizedValue;
  }
  return null;
}
