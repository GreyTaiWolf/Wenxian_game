import { getCombatDropTable } from "../data/dropTables";
import { getItem } from "../data/items";
import type { EquipmentInstance, ItemAmount } from "../types";
import { generateEquipment } from "./generateEquipment";

export interface CombatLootRoll {
  items: ItemAmount[];
  equipment: EquipmentInstance[];
  firstClearReward: boolean;
}

type RandomSource = () => number;
type Clock = () => string;

/**
 * 只依据掉落表、首通状态与注入的随机源生成战利品，不读取或修改存档。
 * 注入 rng 与 clock 后，测试可完整复现包括装备词缀在内的结果。
 */
export function rollCombatLoot(
  dropTableId: string,
  firstClear: boolean,
  rng: RandomSource = Math.random,
  clock: Clock = () => new Date().toISOString(),
): CombatLootRoll {
  const dropTable = getCombatDropTable(dropTableId);
  const createdAt = clock();
  const equipment: EquipmentInstance[] = [];
  let firstClearReward = false;

  if (firstClear && dropTable.firstClearEquipment) {
    equipment.push(createDroppedEquipment(dropTable.firstClearEquipment.itemId, dropTableId, equipment.length, createdAt, rng));
    firstClearReward = true;
  }

  const replacesEquipmentRoll = firstClearReward && dropTable.firstClearEquipment?.replacesEquipmentRoll;
  if (!replacesEquipmentRoll) {
    for (let rollIndex = 0; rollIndex < dropTable.equipment.rolls; rollIndex += 1) {
      if (nextRandom(rng) >= dropTable.equipment.chance) {
        continue;
      }
      const itemId = pickOne(dropTable.equipment.itemIds, rng);
      equipment.push(createDroppedEquipment(itemId, dropTableId, equipment.length, createdAt, rng));
    }
  }

  return {
    items: dropTable.fixedItems.map((item) => ({ ...item })),
    equipment,
    firstClearReward,
  };
}

function createDroppedEquipment(
  itemId: string,
  dropTableId: string,
  equipmentIndex: number,
  createdAt: string,
  rng: RandomSource,
): EquipmentInstance {
  const item = getItem(itemId);
  if (!item.equipment) {
    throw new Error(`Drop table equipment item is not equippable: ${itemId}`);
  }
  const randomToken = Math.floor(nextRandom(rng) * 0xffffffff)
    .toString(36)
    .padStart(7, "0");
  return generateEquipment({
    itemId,
    realmTier: item.tier,
    realmPhase: item.equipment.requiredPhase ?? "middle",
    quality: item.grade,
    slot: item.equipment.slot,
    baseName: item.name,
    id: `loot_${dropTableId}_${equipmentIndex + 1}_${randomToken}`,
    createdAt,
    rng,
    fixedAffixes: item.affixes,
  });
}

function pickOne<T>(items: T[], rng: RandomSource): T {
  if (!items.length) {
    throw new Error("Equipment drop pool cannot be empty");
  }
  return items[Math.floor(nextRandom(rng) * items.length)] ?? items[0];
}

function nextRandom(rng: RandomSource): number {
  const value = rng();
  if (!Number.isFinite(value)) {
    throw new Error("Loot rng must return a finite number");
  }
  return Math.max(0, Math.min(0.9999999999999999, value));
}
