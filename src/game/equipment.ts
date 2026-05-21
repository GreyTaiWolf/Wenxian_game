import { getItem, itemGradeMetas, normalizeInventoryItemId, normalizeItemId } from "../data/items";
import { getRealm, majorRealmOrder, realmPhaseOrder } from "../data/progression";
import { calculateRealmPower } from "./derived";
import { applyBalanceLimits, capFinalStats } from "./equipmentBalanceLimits";
import { calculateAffixBonuses, calculateEquipmentPowerBonus, EQUIPMENT_BALANCE_VERSION, generateEquipment, getMajorRealmRank, mergeBonuses } from "./generateEquipment";
import type { EquipmentBonus, EquipmentInstance, EquipmentSealState, EquipmentSlotId, GameState, InventoryState, ItemAffix, ItemConfig, MajorRealmId, RealmPhaseId, Stats } from "../types";

export const equipmentSlots: Array<{ id: EquipmentSlotId; label: string; emptyLabel: string }> = [
  { id: "weapon", label: "武器", emptyLabel: "未持兵刃" },
  { id: "robe", label: "法袍", emptyLabel: "未着法袍" },
  { id: "helmet", label: "头冠", emptyLabel: "未戴头冠" },
  { id: "wrist", label: "护腕", emptyLabel: "未佩护腕" },
  { id: "boots", label: "鞋履", emptyLabel: "未穿鞋履" },
  { id: "ring", label: "戒指", emptyLabel: "未戴戒指" },
  { id: "amulet", label: "护符", emptyLabel: "未佩护符" },
  { id: "artifact", label: "法宝", emptyLabel: "未祭法宝" },
];

export const emptyEquipment: InventoryState["equipment"] = {
  weapon: null,
  robe: null,
  helmet: null,
  wrist: null,
  boots: null,
  ring: null,
  amulet: null,
  artifact: null,
};

const legacyEquipmentMap: Record<string, string | null> = {
  粗铁剑: "rough_iron_sword",
  布衣: "cloth_robe",
  布履: "cloth_boots",
  starter_weapon: "rough_iron_sword",
  starter_robe: "cloth_robe",
  starter_shoes: "cloth_boots",
  无: null,
  "": null,
};

export function createEquipmentInstance(itemId: string, options: { id?: string; createdAt?: string; rng?: () => number } = {}): EquipmentInstance | null {
  const normalizedItemId = normalizeItemId(itemId);
  const item = getItem(normalizedItemId);
  if (!item.equipment) {
    return null;
  }

  return generateEquipment({
    itemId: normalizedItemId,
    realmTier: item.tier,
    realmPhase: item.equipment.requiredPhase ?? "middle",
    quality: item.grade,
    slot: item.equipment.slot,
    baseName: item.name,
    id: options.id,
    createdAt: options.createdAt,
    rng: options.rng,
  });
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
    const rawValue = getRawEquipmentSlotValue(inventory?.equipment, slot.id);
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
      const seal = getEquipmentSealState(game, instance);
      Object.entries(instance.bonuses).forEach(([statKey, value]) => {
        const key = statKey as keyof Stats;
        total.stats[key] = (total.stats[key] ?? 0) + (value ?? 0) * seal.mainStatMultiplier;
      });
      total.power += Math.round(instance.powerBonus * seal.mainStatMultiplier);
      return total;
    },
    { stats: {} as EquipmentBonus, power: 0 },
  );
}

export function getActiveEquipmentAffixes(game: GameState): ItemAffix[] {
  return equipmentSlots.flatMap((slot) => {
    const instance = getEquippedEquipmentInstance(game, slot.id);
    if (!instance) {
      return [];
    }
    const seal = getEquipmentSealState(game, instance);
    if (seal.affixesSealed) {
      return instance.affixes.filter((affix) => !affix.special && !affix.exclusive && !affix.unique);
    }
    return instance.affixes;
  });
}

export function getEffectiveStats(game: GameState): Stats {
  const bonuses = getEquipmentBonuses(game).stats;
  const affixes = getActiveEquipmentAffixes(game);
  const percentBonus = (stat: NonNullable<ItemAffix["stat"]>) =>
    affixes.reduce((sum, affix) => sum + (affix.stat === stat && typeof affix.value === "number" ? affix.value : 0), 0);
  const withPercent = (value: number, stat: NonNullable<ItemAffix["stat"]>) => Math.max(0, value * (1 + percentBonus(stat)));
  const flatStats = {
    maxHp: game.player.stats.maxHp + (bonuses.maxHp ?? 0),
    maxSpirit: game.player.stats.maxSpirit + (bonuses.maxSpirit ?? 0),
    attack: game.player.stats.attack + (bonuses.attack ?? 0),
    defense: game.player.stats.defense + (bonuses.defense ?? 0),
    spiritSense: game.player.stats.spiritSense + (bonuses.spiritSense ?? 0),
    speed: game.player.stats.speed + (bonuses.speed ?? 0),
    dodgeRate: game.player.stats.dodgeRate + (bonuses.dodgeRate ?? 0),
    critRate: game.player.stats.critRate + (bonuses.critRate ?? 0),
    critDamage: game.player.stats.critDamage + (bonuses.critDamage ?? 0),
  };
  return capFinalStats({
    maxHp: Math.round(withPercent(flatStats.maxHp, "maxHpPct")),
    maxSpirit: Math.round(withPercent(flatStats.maxSpirit, "maxSpiritPct")),
    attack: Math.round(withPercent(flatStats.attack, "attackPct")),
    defense: Math.round(withPercent(flatStats.defense, "defensePct")),
    spiritSense: Math.round(withPercent(flatStats.spiritSense, "spiritSensePct")),
    speed: Math.round(withPercent(flatStats.speed, "speedPct")),
    dodgeRate: flatStats.dodgeRate,
    critRate: flatStats.critRate,
    critDamage: flatStats.critDamage,
  });
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
  const itemRealm = requirement.requiredMajorRealm ?? item.tier;
  const playerRealm = getRealm(game.player.realmId).majorRealmId;
  return getMajorRealmRank(itemRealm) <= getMajorRealmRank(playerRealm) + 1;
}

export function getEquipmentSealState(game: GameState, instanceOrItem: EquipmentInstance | ItemConfig): EquipmentSealState {
  const itemRealm = "realmTier" in instanceOrItem ? instanceOrItem.realmTier : instanceOrItem.equipment?.requiredMajorRealm ?? instanceOrItem.tier;
  const quality = "quality" in instanceOrItem ? instanceOrItem.quality : instanceOrItem.grade;
  const playerRealm = getRealm(game.player.realmId).majorRealmId;
  const itemRank = getMajorRealmRank(itemRealm);
  const playerRank = getMajorRealmRank(playerRealm);
  const sealed = itemRank > playerRank;
  return {
    sealed,
    mainStatMultiplier: sealed ? 0.6 : 1,
    affixesSealed: sealed && itemGradeMetas[quality].tier >= itemGradeMetas.xuan.tier,
    reason: sealed ? "境界不足，装备处于封印中" : undefined,
  };
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
  const createdAt = typeof source.createdAt === "string" && source.createdAt ? source.createdAt : new Date().toISOString();
  const realmTier = normalizeMajorRealmId(source.realmTier, item.tier);
  const realmPhase = normalizeRealmPhaseId(source.realmPhase, item.equipment.requiredPhase ?? "middle");
  const slot = normalizeEquipmentSlotId(source.slot, item.equipment.slot);
  const fallback = generateEquipment({
    itemId,
    realmTier,
    realmPhase,
    quality: item.grade,
    slot,
    baseName: item.name,
    id,
    createdAt,
    rng: createSeededRng(`${EQUIPMENT_BALANCE_VERSION}:${id}:${itemId}:${createdAt}`),
  });
  const affixes = normalizeAffixes(source.affixes, fallback.affixes);
  const needsRebalance = source.equipmentBalanceVersion !== EQUIPMENT_BALANCE_VERSION;

  if (needsRebalance) {
    return rebuildEquipmentInstance({
      ...fallback,
      name: typeof source.name === "string" ? source.name : fallback.name,
      displayName: typeof source.displayName === "string" ? source.displayName : fallback.displayName,
      affixes,
    });
  }

  const normalized: EquipmentInstance = {
    ...fallback,
    id,
    itemId,
    name: typeof source.name === "string" ? source.name : fallback.name,
    displayName: typeof source.displayName === "string" ? source.displayName : fallback.displayName,
    realmTier,
    realmPhase,
    quality: item.grade,
    slot,
    mainStats: normalizeEquipmentBonuses(source.mainStats, fallback.mainStats),
    bonuses: normalizeEquipmentBonuses(source.bonuses, fallback.bonuses),
    powerBonus: typeof source.powerBonus === "number" && Number.isFinite(source.powerBonus) ? source.powerBonus : fallback.powerBonus,
    affixes,
    equipmentBalanceVersion: EQUIPMENT_BALANCE_VERSION,
    createdAt,
  };
  return applyBalanceLimitsAndPower(normalized);
}

function rebuildEquipmentInstance(instance: EquipmentInstance): EquipmentInstance {
  const bonuses = mergeBonuses(instance.mainStats, calculateAffixBonuses(instance.affixes));
  return applyBalanceLimitsAndPower({
    ...instance,
    bonuses,
    powerBonus: calculateEquipmentPowerBonus(bonuses),
    equipmentBalanceVersion: EQUIPMENT_BALANCE_VERSION,
  });
}

function applyBalanceLimitsAndPower(instance: EquipmentInstance): EquipmentInstance {
  const limited = applyBalanceLimits(instance);
  return {
    ...limited,
    powerBonus: calculateEquipmentPowerBonus(limited.bonuses),
    equipmentBalanceVersion: EQUIPMENT_BALANCE_VERSION,
  };
}

function normalizeRealmPhaseId(value: unknown, fallback: RealmPhaseId = "middle"): RealmPhaseId {
  return realmPhaseOrder.includes(value as RealmPhaseId) ? (value as RealmPhaseId) : fallback;
}

function normalizeEquipmentBonuses(rawBonuses: EquipmentBonus | undefined, fallback: EquipmentBonus): EquipmentBonus {
  const normalized: EquipmentBonus = {};
  Object.entries(rawBonuses ?? fallback).forEach(([key, rawValue]) => {
    const normalizedKey = normalizeStatKey(key);
    if (normalizedKey && typeof rawValue === "number" && Number.isFinite(rawValue)) {
      normalized[normalizedKey] = rawValue;
    }
  });
  return Object.keys(normalized).length ? normalized : fallback;
}

function normalizeAffixes(rawAffixes: ItemAffix[] | undefined, fallbackAffixes: ItemAffix[] | undefined): ItemAffix[] {
  const source = Array.isArray(rawAffixes) ? rawAffixes : fallbackAffixes ?? [];
  return source
    .filter((affix) => affix && typeof affix.id === "string" && typeof affix.name === "string" && typeof affix.description === "string")
    .map((affix) => ({ ...affix }));
}

function getRawEquipmentSlotValue(equipment: Partial<InventoryState["equipment"]> | undefined, slotId: EquipmentSlotId): unknown {
  const legacySlotMap: Record<EquipmentSlotId, string | null> = {
    weapon: null,
    robe: null,
    helmet: "crown",
    wrist: null,
    boots: "shoes",
    ring: "accessory",
    amulet: null,
    artifact: "treasure",
  };
  if (slotId === "artifact") {
    const rawEquipment = equipment as Record<string, unknown> | undefined;
    return equipment?.artifact ?? rawEquipment?.treasure ?? rawEquipment?.spirit_artifact;
  }
  return equipment?.[slotId] ?? (legacySlotMap[slotId] ? (equipment as Record<string, unknown> | undefined)?.[legacySlotMap[slotId]!] : undefined);
}

function createEquipmentInstanceId(itemId: string): string {
  const randomId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return `eq_${itemId}_${randomId}`;
}

function createSeededRng(seed: string): () => number {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeEquipmentSlotId(slotId: unknown, fallback: EquipmentSlotId = "weapon"): EquipmentSlotId {
  const legacySlotMap: Record<string, EquipmentSlotId> = {
    crown: "helmet",
    shoes: "boots",
    accessory: "ring",
    treasure: "artifact",
    spirit_artifact: "artifact",
  };
  if (typeof slotId !== "string") {
    return fallback;
  }
  const normalized = legacySlotMap[slotId] ?? slotId;
  return equipmentSlots.some((slot) => slot.id === normalized) ? (normalized as EquipmentSlotId) : fallback;
}

export function normalizeMajorRealmId(value: unknown, fallback: MajorRealmId = "mortal"): MajorRealmId {
  const legacyRealmMap: Record<string, MajorRealmId> = {
    qi_refining: "qi",
    core_formation: "core",
    nascent_soul: "nascent",
    spirit_transformation: "deity",
    void_refining: "void",
    body_integration: "integration",
    post_ascension: "tribulation",
  };
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = legacyRealmMap[value] ?? value;
  return majorRealmOrder.includes(normalized as MajorRealmId) ? (normalized as MajorRealmId) : fallback;
}

function normalizeStatKey(key: string): keyof Stats | null {
  const legacyStatMap: Record<string, keyof Stats> = {
    divineSense: "spiritSense",
    dodge: "dodgeRate",
    crit: "critRate",
  };
  const normalized = legacyStatMap[key] ?? key;
  return ["maxHp", "maxSpirit", "attack", "defense", "spiritSense", "speed", "dodgeRate", "critRate", "critDamage"].includes(normalized) ? (normalized as keyof Stats) : null;
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
