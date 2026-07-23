import { describe, expect, it } from "vitest";
import {
  compareEquipmentInstance,
  createEquipmentInstance,
  equipEquipmentInstance,
  getEffectivePower,
  getEffectiveStats,
  normalizeInventoryState,
} from "./equipment";
import { createNewGame } from "./state";

describe("装备替换比较", () => {
  it("按最终面板模拟替换且不修改原状态", () => {
    const game = createNewGame("试剑者");
    const candidate = createEquipmentInstance("ancient_echo_sword", { id: "test_ancient_echo", rng: () => 0 });
    expect(candidate).not.toBeNull();
    if (!candidate) {
      return;
    }
    const withCandidate = {
      ...game,
      inventory: {
        ...game.inventory,
        equipmentItems: [...game.inventory.equipmentItems, candidate],
      },
    };
    const originalWeaponId = withCandidate.inventory.equipment.weapon;
    const comparison = compareEquipmentInstance(withCandidate, candidate);

    expect(comparison).not.toBeNull();
    expect(withCandidate.inventory.equipment.weapon).toBe(originalWeaponId);
    expect(comparison?.equipped?.id).toBe(originalWeaponId);

    const equipped = equipEquipmentInstance(withCandidate, candidate.id);
    expect(getEffectiveStats(equipped)).toEqual(
      Object.fromEntries(
        Object.entries(getEffectiveStats(withCandidate)).map(([key, value]) => [
          key,
          value + (comparison?.statDeltas[key as keyof ReturnType<typeof getEffectiveStats>] ?? 0),
        ]),
      ),
    );
    expect(getEffectivePower(equipped)).toBe(comparison?.afterPower);
  });

  it("相同规则词条的数值变化仍会提示规则改变", () => {
    const game = createNewGame("辨器者");
    const equipped = game.inventory.equipmentItems.find((instance) => instance.id === game.inventory.equipment.weapon);
    const candidate = createEquipmentInstance("rough_iron_sword", { id: "rule_delta_weapon", rng: () => 0 });
    expect(equipped).toBeDefined();
    expect(candidate).not.toBeNull();
    if (!equipped || !candidate) {
      return;
    }
    equipped.affixes = [{ id: "double_strike", name: "连击", description: "10% 概率连击", effect: "double_strike", value: 0.1 }];
    candidate.affixes = [{ id: "double_strike", name: "连击", description: "20% 概率连击", effect: "double_strike", value: 0.2 }];
    const comparison = compareEquipmentInstance(
      {
        ...game,
        inventory: {
          ...game.inventory,
          equipmentItems: [...game.inventory.equipmentItems, candidate],
        },
      },
      candidate,
    );
    expect(comparison?.hasRuleAffixChanges).toBe(true);
  });

  it("迁移时保留合法的实例品质", () => {
    const game = createNewGame("藏器者");
    const weapon = game.inventory.equipmentItems.find((instance) => instance.id === game.inventory.equipment.weapon);
    expect(weapon).toBeDefined();
    if (!weapon) {
      return;
    }
    const inventory = normalizeInventoryState({
      ...game.inventory,
      equipmentItems: [{ ...weapon, quality: "ling" }],
    });
    expect(inventory.equipmentItems.find((instance) => instance.id === weapon.id)?.quality).toBe("ling");
  });
});
