import { getEquipmentCraftRecipe, getEquipmentWorkshop, reforgeLockLimitByGrade } from "../data/equipmentWorkshops";
import { getCaveRefineryLevel } from "../data/caveFacilities";
import { formatItemName, getItem } from "../data/items";
import { itemGradeLabels } from "../data/qualityGrades";
import { applyBalanceLimits } from "./equipmentBalanceLimits";
import { createEquipmentInstance, getEquipmentInstance, getEquipmentInstanceItem } from "./equipment";
import { calculateAffixBonuses, calculateEquipmentPowerBonus, generateEquipment, mergeBonuses } from "./generateEquipment";
import { appendLog, canAffordCost, describeCost, spendCost } from "./state";
import type { Cost, EquipmentInstance, GameState, ItemAffix } from "../types";

export function craftWorkshopEquipment(game: GameState, workshopId: string, recipeId: string): GameState {
  const workshop = getEquipmentWorkshop(workshopId);
  const recipe = getEquipmentCraftRecipe(workshopId, recipeId);
  if (!workshop || !recipe) {
    return appendLog(game, "此处暂时没有可用的炼器方。");
  }
  if (!isEquipmentRecipeLearned(game, recipe.id)) {
    return appendLog(game, `尚未研读${formatItemName(recipe.blueprintItemId)}，无法开炉打造。`);
  }
  const craftCost = getEffectiveWorkshopCraftCost(game, workshopId, recipe.cost);
  if (!canAffordCost(game, craftCost)) {
    return appendLog(game, `打造所需不足：${describeCost(craftCost)}。`);
  }
  const instance = createEquipmentInstance(recipe.itemId);
  if (!instance) {
    return appendLog(game, "这件器物暂时无法打造。");
  }
  const paidGame = spendCost(game, craftCost);
  return appendLog(
    {
      ...paidGame,
      inventory: {
        ...paidGame.inventory,
        equipmentItems: [...paidGame.inventory.equipmentItems, instance],
      },
    },
    `${workshop.name}炉火一收，打造出 ${instance.displayName}。`,
  );
}

export function learnEquipmentCraftRecipe(game: GameState, workshopId: string, recipeId: string): GameState {
  const recipe = getEquipmentCraftRecipe(workshopId, recipeId);
  if (!recipe) {
    return appendLog(game, "此处暂时没有可研读的炼器图纸。");
  }
  if (isEquipmentRecipeLearned(game, recipe.id)) {
    return appendLog(game, `${formatItemName(recipe.blueprintItemId)}已经研读过了。`);
  }
  const learnCost: Cost = { items: [{ itemId: recipe.blueprintItemId, amount: 1 }] };
  if (!canAffordCost(game, learnCost)) {
    return appendLog(game, `缺少${formatItemName(recipe.blueprintItemId)}，无法研读。`);
  }
  const paidGame = spendCost(game, learnCost);
  return appendLog(
    {
      ...paidGame,
      world: {
        ...paidGame.world,
        learnedEquipmentRecipes: {
          ...(paidGame.world.learnedEquipmentRecipes ?? {}),
          [recipe.id]: true,
        },
      },
    },
    `你研读${formatItemName(recipe.blueprintItemId)}，学会了${recipe.label}。`,
  );
}

export function isEquipmentRecipeLearned(game: GameState, recipeId: string): boolean {
  return Boolean(game.world.learnedEquipmentRecipes?.[recipeId]);
}

export function reforgeWorkshopEquipment(game: GameState, instanceId: string, lockedAffixIds: string[]): GameState {
  const instance = getEquipmentInstance(game, instanceId);
  const item = getEquipmentInstanceItem(instance);
  if (!instance || !item || !item.equipment) {
    return appendLog(game, "未找到可洗炼的装备。");
  }
  const lockLimit = getEffectiveReforgeLockLimit(instance);
  const lockedIds = getValidLockedAffixIds(instance, lockedAffixIds).slice(0, lockLimit);
  if (lockedAffixIds.length > lockLimit) {
    return appendLog(game, `${itemGradeLabels[instance.quality]}装备最多锁定 ${lockLimit} 条词条。`);
  }
  if (instance.affixes.length <= lockedIds.length) {
    return appendLog(game, "至少要留下一条词条用于洗炼。");
  }
  const cost = getReforgeCost(instance, lockedIds.length);
  if (!canAffordCost(game, cost)) {
    return appendLog(game, `洗炼所需不足：${describeCost(cost)}。`);
  }

  const nextInstance = reforgeEquipmentInstanceAffixes(instance, lockedIds);
  const paidGame = spendCost(game, cost);
  return appendLog(
    {
      ...paidGame,
      inventory: {
        ...paidGame.inventory,
        equipmentItems: paidGame.inventory.equipmentItems.map((itemInstance) => (itemInstance.id === instance.id ? nextInstance : itemInstance)),
      },
    },
    `赵铁匠重开炉火，${nextInstance.displayName} 的词条已重新洗炼。`,
  );
}

export function getEffectiveReforgeLockLimit(instance: EquipmentInstance): number {
  const gradeLimit = reforgeLockLimitByGrade[instance.quality] ?? 0;
  return Math.max(0, Math.min(gradeLimit, instance.affixes.length - 1));
}

export function getReforgeCost(instance: EquipmentInstance, lockedCount: number): Cost {
  const item = getItem(instance.itemId);
  const basePrice = item.price ?? 40;
  const lockMultiplier = 1 + lockedCount * 0.8 + lockedCount * lockedCount * 0.35;
  const tierMultiplier = instance.realmTier === "mortal" ? 1 : 1.25;
  const spiritStones = Math.max(40, Math.ceil(basePrice * 0.9 * lockMultiplier * tierMultiplier));
  const items = [{ itemId: "beast_bone", amount: 1 + lockedCount * 2 }];
  if (instance.realmTier !== "mortal") {
    items.push({ itemId: "qi_grass", amount: 1 + lockedCount });
  }
  return { spiritStones, items };
}

export function getValidLockedAffixIds(instance: EquipmentInstance, lockedAffixIds: string[]): string[] {
  const availableIds = new Set(instance.affixes.map((affix) => affix.id));
  return Array.from(new Set(lockedAffixIds.filter((affixId) => availableIds.has(affixId))));
}

function reforgeEquipmentInstanceAffixes(instance: EquipmentInstance, lockedAffixIds: string[]): EquipmentInstance {
  const lockedAffixes = instance.affixes.filter((affix) => lockedAffixIds.includes(affix.id));
  const neededCount = Math.max(0, instance.affixes.length - lockedAffixes.length);
  const rerolledAffixes = rollReplacementAffixes(instance, lockedAffixes.map((affix) => affix.id), neededCount);
  const affixes = [...lockedAffixes, ...rerolledAffixes].slice(0, instance.affixes.length);
  const bonuses = mergeBonuses(instance.mainStats, calculateAffixBonuses(affixes));
  return applyBalanceLimits({
    ...instance,
    affixes,
    bonuses,
    powerBonus: calculateEquipmentPowerBonus(bonuses),
  });
}

function rollReplacementAffixes(instance: EquipmentInstance, blockedAffixIds: string[], neededCount: number) {
  const picked: ItemAffix[] = [];
  const blocked = new Set(blockedAffixIds);
  for (let attempt = 0; picked.length < neededCount && attempt < 8; attempt += 1) {
    const generated = generateEquipment({
      itemId: instance.itemId,
      realmTier: instance.realmTier,
      realmPhase: instance.realmPhase,
      quality: instance.quality,
      slot: instance.slot,
      baseName: instance.name,
    });
    for (const affix of generated.affixes) {
      if (picked.length >= neededCount) {
        break;
      }
      if (blocked.has(affix.id) || picked.some((item) => item.id === affix.id)) {
        continue;
      }
      picked.push(affix);
    }
  }
  return picked;
}

export function formatWorkshopCost(cost: Cost): string {
  return describeCost(cost);
}

export function formatWorkshopItemName(itemId: string): string {
  return formatItemName(itemId);
}

export function getEffectiveWorkshopCraftCost(game: GameState, workshopId: string, cost: Cost): Cost {
  if (workshopId !== "cave_refinery_workshop") {
    return cost;
  }
  const refinery = game.cave.refinery;
  const level = getCaveRefineryLevel(refinery?.level ?? 0);
  if (!cost.spiritStones || level.spiritStoneDiscount <= 0) {
    return cost;
  }
  return {
    ...cost,
    spiritStones: Math.max(1, Math.ceil(cost.spiritStones * (1 - level.spiritStoneDiscount))),
  };
}
