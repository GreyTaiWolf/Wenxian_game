import { getItem, itemGradeMetas, normalizeInventoryItemId, normalizeItemId } from "../data/items";
import { getRealm, isRealmStageAtLeast } from "../data/progression";
import { calculateRealmPower } from "./derived";
import type { EquipmentBonus, EquipmentInstance, EquipmentSlotId, GameState, InventoryState, ItemAffix, ItemConfig, Stats } from "../types";

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
  starter_weapon: "rough_iron_sword",
  starter_robe: "cloth_robe",
  starter_shoes: "cloth_shoes",
  无: null,
  "": null,
};

export function createEquipmentInstance(itemId: string, options: { id?: string; createdAt?: string } = {}): EquipmentInstance | null {
  const normalizedItemId = normalizeItemId(itemId);
  const item = getItem(normalizedItemId);
  if (!item.equipment) {
    return null;
  }

  return {
    id: options.id ?? createEquipmentInstanceId(normalizedItemId),
    itemId: normalizedItemId,
    bonuses: { ...item.equipment.bonuses },
    powerBonus: item.equipment.powerBonus,
    affixes: [...(item.affixes ?? [])],
    createdAt: options.createdAt ?? new Date().toISOString(),
  };
}

export function normalizeInventoryState(inventory?: Partial<InventoryState>): InventoryState {
  const normalizedItems: Record<string, number> = {};
  const equipmentItems: EquipmentInstance[] = [];
  const usedInstanceIds = new Set<string>();

  function addEquipmentInstance(itemId: string, preferredId?: string, createdAt?: string): EquipmentInstance | null {
    const instance = createEquipmentInstance(itemId, {
      id: preferredId ? makeUniqueInstanceId(preferredId, usedInstanceIds) : undefined,
      createdAt,
    });
    if (!instance) {
      return null;
    }
    usedInstanceIds.add(instance.id);
    equipmentItems.push(instance);
    return instance;
  }

  (Array.isArray(inventory?.equipmentItems) ? inventory?.equipmentItems : []).forEach((rawInstance) => {
    const instance = normalizeEquipmentInstance(rawInstance, usedInstanceIds);
    if (!instance) {
      return;
    }
    usedInstanceIds.add(instance.id);
    equipmentItems.push(instance);
  });

  Object.entries(inventory?.items ?? {}).forEach(([rawItemId, rawAmount]) => {
    const amount = Math.floor(Number(rawAmount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    const itemId = normalizeInventoryItemId(rawItemId);
    if (!itemId) {
      return;
    }
    const item = getItem(itemId);
    if (item.equipment) {
      Array.from({ length: amount }).forEach((_, index) => addEquipmentInstance(itemId, `legacy_bag_${itemId}_${index + 1}`));
      return;
    }
    normalizedItems[itemId] = (normalizedItems[itemId] ?? 0) + amount;
  });

  const equipment = equipmentSlots.reduce<InventoryState["equipment"]>((slots, slot) => {
    const rawValue = inventory?.equipment?.[slot.id];
    const instanceId = resolveEquipmentSlotInstanceId(rawValue, slot.id, equipmentItems, usedInstanceIds, addEquipmentInstance);
    slots[slot.id] = instanceId;
    return slots;
  }, { ...emptyEquipment });

  return {
    items: normalizedItems,
    equipment,
    equipmentItems,
  };
}

export function normalizeEquipmentSlots(equipment?: Partial<Record<string, unknown>>): InventoryState["equipment"] {
  return normalizeInventoryState({ equipment: equipment as InventoryState["equipment"] }).equipment;
}

export function getEquipmentInstance(game: GameState, instanceId: string | null | undefined): EquipmentInstance | null {
  if (!instanceId) {
    return null;
  }
  return game.inventory.equipmentItems.find((instance) => instance.id === instanceId) ?? null;
}

export function getEquipmentInstanceItem(instance: EquipmentInstance | null | undefined): ItemConfig | null {
  if (!instance) {
    return null;
  }
  const item = getItem(instance.itemId);
  return item.equipment ? item : null;
}

export function getEquippedEquipmentInstance(game: GameState, slotId: EquipmentSlotId): EquipmentInstance | null {
  const instance = getEquipmentInstance(game, game.inventory.equipment[slotId]);
  const item = getEquipmentInstanceItem(instance);
  return item?.equipment?.slot === slotId ? instance : null;
}

export function getEquippedItem(game: GameState, slotId: EquipmentSlotId): ItemConfig | null {
  return getEquipmentInstanceItem(getEquippedEquipmentInstance(game, slotId));
}

export function getEquipmentBonuses(game: GameState): { stats: EquipmentBonus; power: number } {
  return equipmentSlots.reduce(
    (total, slot) => {
      const instance = getEquippedEquipmentInstance(game, slot.id);
      if (!instance) {
        return total;
      }
      Object.entries(instance.bonuses).forEach(([statKey, value]) => {
        const key = statKey as keyof Stats;
        if (key === "dodge") {
          return;
        }
        total.stats[key] = (total.stats[key] ?? 0) + (value ?? 0);
      });
      total.power += instance.powerBonus;
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
    dodge: 0,
    crit: game.player.stats.crit + (bonuses.crit ?? 0),
    critDamage: game.player.stats.critDamage + (bonuses.critDamage ?? 0),
  };
}

export function getEffectivePower(game: GameState): number {
  return calculateRealmPower(getEffectiveStats(game), getRealm(game.player.realmId));
}

export function equipItem(game: GameState, itemId: string): GameState {
  const normalizedItemId = normalizeItemId(itemId);
  const item = getItem(normalizedItemId);
  const equipment = item.equipment;
  const amount = game.inventory.items[normalizedItemId] ?? 0;
  if (!equipment || amount <= 0 || !canEquipItem(game, item)) {
    return game;
  }

  const instance = createEquipmentInstance(normalizedItemId);
  if (!instance) {
    return game;
  }
  const nextAmount = amount - 1;
  const nextItems = { ...game.inventory.items };
  if (nextAmount > 0) {
    nextItems[normalizedItemId] = nextAmount;
  } else {
    delete nextItems[normalizedItemId];
  }

  return {
    ...game,
    inventory: {
      ...game.inventory,
      items: nextItems,
      equipment: {
        ...game.inventory.equipment,
        [equipment.slot]: instance.id,
      },
      equipmentItems: [...game.inventory.equipmentItems, instance],
    },
  };
}

export function equipEquipmentInstance(game: GameState, instanceId: string): GameState {
  const instance = getEquipmentInstance(game, instanceId);
  const item = getEquipmentInstanceItem(instance);
  const slot = item?.equipment?.slot;
  if (!instance || !item || !slot || !canEquipItem(game, item)) {
    return game;
  }

  return {
    ...game,
    inventory: {
      ...game.inventory,
      equipment: {
        ...game.inventory.equipment,
        [slot]: instance.id,
      },
    },
  };
}

export function unequipSlot(game: GameState, slotId: EquipmentSlotId): GameState {
  if (!game.inventory.equipment[slotId]) {
    return game;
  }

  return {
    ...game,
    inventory: {
      ...game.inventory,
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
  if (item.equipment || amount <= 0 || !canSellItem(item)) {
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

export function sellEquipmentInstance(game: GameState, instanceId: string): GameState {
  const instance = getEquipmentInstance(game, instanceId);
  const item = getEquipmentInstanceItem(instance);
  if (!instance || !item || !canSellItem(item)) {
    return game;
  }

  const nextEquipment = equipmentSlots.reduce<InventoryState["equipment"]>((slots, slot) => {
    slots[slot.id] = game.inventory.equipment[slot.id] === instanceId ? null : game.inventory.equipment[slot.id];
    return slots;
  }, { ...emptyEquipment });

  return {
    ...game,
    player: {
      ...game.player,
      spiritStones: game.player.spiritStones + getItemSellPrice(item),
    },
    inventory: {
      ...game.inventory,
      equipment: nextEquipment,
      equipmentItems: game.inventory.equipmentItems.filter((itemInstance) => itemInstance.id !== instanceId),
    },
  };
}

export function getItemSellPrice(item: ItemConfig): number {
  return Math.max(1, Math.floor((item.price ?? 1) * 0.5));
}

export function canSellItem(item: ItemConfig): boolean {
  return Boolean(item.price);
}

export function canEquipItem(game: GameState, item: ItemConfig): boolean {
  const requirement = item.equipment;
  if (!requirement) {
    return false;
  }
  if (!requirement.requiredMajorRealm) {
    return true;
  }
  return isRealmStageAtLeast(game.player.realmId, requirement.requiredMajorRealm, requirement.requiredPhase ?? "early");
}

export function getEquippableInventoryItems(game: GameState): EquipmentInstance[] {
  const equippedIds = new Set(Object.values(game.inventory.equipment).filter(Boolean));
  return game.inventory.equipmentItems
    .filter((instance) => !equippedIds.has(instance.id) && Boolean(getEquipmentInstanceItem(instance)?.equipment))
    .sort((a, b) => {
      const itemA = getItem(a.itemId);
      const itemB = getItem(b.itemId);
      return itemGradeMetas[itemB.grade].tier - itemGradeMetas[itemA.grade].tier || itemA.name.localeCompare(itemB.name, "zh-CN") || a.createdAt.localeCompare(b.createdAt);
    });
}

function resolveEquipmentSlotInstanceId(
  value: unknown,
  slotId: EquipmentSlotId,
  equipmentItems: EquipmentInstance[],
  usedInstanceIds: Set<string>,
  addEquipmentInstance: (itemId: string, preferredId?: string, createdAt?: string) => EquipmentInstance | null,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const existingInstance = equipmentItems.find((instance) => instance.id === value);
  const existingItem = getEquipmentInstanceItem(existingInstance);
  if (existingInstance && existingItem?.equipment?.slot === slotId) {
    return existingInstance.id;
  }

  const legacyItemId = normalizeLegacyEquipmentValue(value, slotId);
  if (!legacyItemId) {
    return null;
  }

  return addEquipmentInstance(legacyItemId, makeUniqueInstanceId(`legacy_equipped_${slotId}_${legacyItemId}`, usedInstanceIds))?.id ?? null;
}

function normalizeLegacyEquipmentValue(value: string, slotId: EquipmentSlotId): string | null {
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

function normalizeEquipmentInstance(rawInstance: unknown, usedInstanceIds: Set<string>): EquipmentInstance | null {
  if (!rawInstance || typeof rawInstance !== "object") {
    return null;
  }
  const source = rawInstance as Partial<EquipmentInstance>;
  if (typeof source.itemId !== "string") {
    return null;
  }
  const itemId = normalizeItemId(source.itemId);
  const item = getItem(itemId);
  if (!item.equipment) {
    return null;
  }
  const id = typeof source.id === "string" && source.id ? makeUniqueInstanceId(source.id, usedInstanceIds) : createEquipmentInstanceId(itemId);
  return {
    id,
    itemId,
    bonuses: normalizeEquipmentBonuses(source.bonuses, item.equipment.bonuses),
    powerBonus: typeof source.powerBonus === "number" && Number.isFinite(source.powerBonus) ? source.powerBonus : item.equipment.powerBonus,
    affixes: normalizeAffixes(source.affixes, item.affixes),
    createdAt: typeof source.createdAt === "string" && source.createdAt ? source.createdAt : new Date().toISOString(),
  };
}

function normalizeEquipmentBonuses(rawBonuses: EquipmentBonus | undefined, fallback: EquipmentBonus): EquipmentBonus {
  const normalized: EquipmentBonus = {};
  Object.entries(rawBonuses ?? fallback).forEach(([key, rawValue]) => {
    if (key === "dodge") {
      return;
    }
    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      normalized[key as keyof Stats] = rawValue;
    }
  });
  return Object.keys(normalized).length ? normalized : (Object.fromEntries(Object.entries(fallback).filter(([key]) => key !== "dodge")) as EquipmentBonus);
}

function normalizeAffixes(rawAffixes: ItemAffix[] | undefined, fallbackAffixes: ItemAffix[] | undefined): ItemAffix[] {
  const source = Array.isArray(rawAffixes) ? rawAffixes : fallbackAffixes ?? [];
  return source
    .filter((affix) => affix && typeof affix.id === "string" && typeof affix.name === "string" && typeof affix.description === "string")
    .map((affix) => ({ id: affix.id, name: affix.name, description: affix.description }));
}

function createEquipmentInstanceId(itemId: string): string {
  const randomId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return `eq_${itemId}_${randomId}`;
}

function makeUniqueInstanceId(preferredId: string, usedIds: Set<string>): string {
  if (!usedIds.has(preferredId)) {
    return preferredId;
  }
  let index = 2;
  let nextId = `${preferredId}_${index}`;
  while (usedIds.has(nextId)) {
    index += 1;
    nextId = `${preferredId}_${index}`;
  }
  return nextId;
}
