import {
  getAlchemyFurnaceLevel,
  getAlchemyRecipe,
  getNextAlchemyFurnaceLevel,
  normalizeAlchemyState,
} from "../data/caveFacilities";
import { formatItemName } from "../data/items";
import type { AlchemyState, Cost, GameState, ItemAmount } from "../types";
import { addItems, appendLog, canAffordCost, describeCost, spendCost } from "./state";

export function learnAlchemyRecipe(game: GameState, recipeId: string): GameState {
  const recipe = getAlchemyRecipe(recipeId);
  if (!recipe) {
    return appendLog(game, "这张丹方暂未收入丹阁目录。");
  }
  const alchemy = normalizeAlchemyState(game.cave.alchemy);
  if (alchemy.learnedRecipes[recipe.id]) {
    return appendLog(game, `${recipe.label}的丹方已经研读过了。`);
  }
  const cost: Cost = { items: [{ itemId: recipe.recipeItemId, amount: 1 }] };
  if (!canAffordCost(game, cost)) {
    return appendLog(game, `缺少${formatItemName(recipe.recipeItemId)}，无法研读丹方。`);
  }
  const paidGame = spendCost(game, cost);
  return appendLog(
    {
      ...paidGame,
      cave: {
        ...paidGame.cave,
        alchemy: {
          ...alchemy,
          learnedRecipes: {
            ...alchemy.learnedRecipes,
            [recipe.id]: true,
          },
        },
      },
    },
    `你研读${formatItemName(recipe.recipeItemId)}，掌握了${recipe.label}。`,
  );
}

export function craftAlchemyRecipe(game: GameState, recipeId: string): GameState {
  const recipe = getAlchemyRecipe(recipeId);
  if (!recipe) {
    return appendLog(game, "这道丹方暂不可炼制。");
  }
  const alchemy = normalizeAlchemyState(game.cave.alchemy);
  const furnace = getAlchemyFurnaceLevel(alchemy.furnaceLevel);
  if (!alchemy.learnedRecipes[recipe.id]) {
    return appendLog(game, `尚未研读${formatItemName(recipe.recipeItemId)}，无法开炉炼丹。`);
  }
  if (furnace.level < recipe.requiredFurnaceLevel) {
    return appendLog(game, `${recipe.label}至少需要 ${recipe.requiredFurnaceLevel} 级丹炉。`);
  }
  if (!canAffordCost(game, recipe.cost)) {
    return appendLog(game, `炼丹所需不足：${describeCost(recipe.cost)}。`);
  }

  const paidGame = spendCost(game, recipe.cost);
  const successRate = getAlchemySuccessRate(recipe.baseSuccessRate, furnace.successBonus);
  const success = Math.random() <= successRate;
  if (!success) {
    const returnedItems = getFailureReturnItems(recipe.cost.items ?? [], furnace.failureReturnRate);
    const returnedGame = returnedItems.length ? addItems(paidGame, returnedItems) : paidGame;
    return appendLog(
      {
        ...returnedGame,
        cave: {
          ...returnedGame.cave,
          alchemy: {
            ...alchemy,
            totalFailures: alchemy.totalFailures + 1,
          },
        },
      },
      `${recipe.label}炉火失衡，灵石已化作炉火，返还${formatReturnedItems(returnedItems)}。`,
    );
  }

  const extra = Math.random() < furnace.extraOutputChance ? 1 : 0;
  const rewards = [{ itemId: recipe.resultItemId, amount: recipe.outputAmount + extra }];
  const rewardedGame = addItems(paidGame, rewards);
  return appendLog(
    {
      ...rewardedGame,
      cave: {
        ...rewardedGame.cave,
        alchemy: {
          ...alchemy,
          totalCrafts: alchemy.totalCrafts + 1,
        },
      },
    },
    `${recipe.label}成丹，获得${formatItemName(recipe.resultItemId)} x${recipe.outputAmount + extra}${extra > 0 ? "，丹炉灵火额外凝出一份药力" : ""}。`,
  );
}

export function upgradeAlchemyFurnace(game: GameState): GameState {
  const alchemy = normalizeAlchemyState(game.cave.alchemy);
  const nextLevel = getNextAlchemyFurnaceLevel(alchemy.furnaceLevel);
  if (!nextLevel?.upgradeCost) {
    return appendLog(game, "丹炉已升至当前版本上限。");
  }
  if (!canAffordCost(game, nextLevel.upgradeCost)) {
    return appendLog(game, `升级丹炉所需资源不足：${describeCost(nextLevel.upgradeCost)}。`);
  }
  const paidGame = spendCost(game, nextLevel.upgradeCost);
  return appendLog(
    {
      ...paidGame,
      cave: {
        ...paidGame.cave,
        alchemy: {
          ...alchemy,
          furnaceLevel: nextLevel.level,
        },
      },
    },
    `丹炉升至 ${nextLevel.level} 级，成丹更稳，灵火偶尔会多凝一份药力。`,
  );
}

export function getAlchemySuccessRate(baseSuccessRate: number, successBonus: number): number {
  return Math.min(0.98, Math.max(0.05, baseSuccessRate + successBonus));
}

export function isAlchemyRecipeLearned(alchemy: AlchemyState, recipeId: string): boolean {
  return Boolean(alchemy.learnedRecipes[recipeId]);
}

function getFailureReturnItems(items: ItemAmount[], returnRate: number): ItemAmount[] {
  return items
    .map((item) => ({ ...item, amount: Math.floor(item.amount * returnRate) }))
    .filter((item) => item.amount > 0);
}

function formatReturnedItems(items: ItemAmount[]): string {
  if (!items.length) {
    return "少量药渣";
  }
  return items.map((item) => `${formatItemName(item.itemId)} x${item.amount}`).join("，");
}
