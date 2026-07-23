import { describe, expect, it } from "vitest";
import { combatDropTables } from "../data/dropTables";
import { enemyGroups } from "../data/enemies";
import { getItem } from "../data/items";
import { rollCombatLoot } from "./loot";

describe("统一战斗掉落", () => {
  it("古修洞府首杀只给一次专属残剑并保留固定词条", () => {
    const first = rollCombatLoot("drop_ancient_cave", true, () => 0, () => "2026-07-23T00:00:00.000Z");
    const repeat = rollCombatLoot("drop_ancient_cave", false, () => 0, () => "2026-07-23T01:00:00.000Z");

    expect(first.firstClearReward).toBe(true);
    expect(first.equipment).toHaveLength(1);
    expect(first.equipment[0].itemId).toBe("ancient_echo_sword");
    expect(first.equipment[0].affixes.map((affix) => affix.id)).toEqual(["beast_damage_pct", "crit_vs_beast"]);
    expect(repeat.firstClearReward).toBe(false);
    expect(repeat.equipment).toHaveLength(1);
    expect(repeat.equipment[0].itemId).not.toBe("ancient_echo_sword");
  });

  it("普通掉落概率失败时仍保留固定材料", () => {
    const loot = rollCombatLoot("drop_wolf_pack", false, () => 0.99, () => "2026-07-23T00:00:00.000Z");

    expect(loot.items).toEqual([{ itemId: "beast_bone", amount: 1 }]);
    expect(loot.equipment).toHaveLength(0);
  });

  it("所有敌群、掉落表与装备池引用都有效", () => {
    const tableIds = new Set(combatDropTables.map((table) => table.id));
    enemyGroups.forEach((group) => {
      expect(tableIds.has(group.dropTableId)).toBe(true);
      expect(combatDropTables.find((table) => table.id === group.dropTableId)?.rank).toBe(group.rank);
    });
    combatDropTables.forEach((table) => {
      table.fixedItems.forEach((reward) => expect(getItem(reward.itemId).id).toBe(reward.itemId));
      table.equipment.itemIds.forEach((itemId) => expect(getItem(itemId).equipment).toBeDefined());
      if (table.firstClearEquipment) {
        expect(getItem(table.firstClearEquipment.itemId).equipment).toBeDefined();
      }
    });
  });
});
