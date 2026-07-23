import { describe, expect, it } from "vitest";
import { beginCombat, settleCombat } from "./combatEngine";
import { createNewGame } from "./state";

describe("战斗结算", () => {
  it("首领首杀写入战绩、结算卡并同步角色状态", () => {
    const started = beginCombat(createNewGame("问道者"), "ancient_cave");
    expect(started.combat).toBeDefined();
    if (!started.combat) {
      return;
    }
    const finished = {
      ...started.combat,
      allies: started.combat.allies.map((actor) => (actor.kind === "player" ? { ...actor, hp: 77, spirit: 9 } : actor)),
      enemies: started.combat.enemies.map((actor) => ({ ...actor, hp: 0 })),
    };
    const result = settleCombat(started, finished);

    expect(result.combat).toBeUndefined();
    expect(result.world.encounterWins.ancient_cave).toBe(1);
    expect(result.combatReport?.firstClear).toBe(true);
    expect(result.combatReport?.equipment.map((instance) => instance.itemId)).toContain("ancient_echo_sword");
    expect(result.player.hp).toBe(77);
    expect(result.player.spirit).toBe(9);
  });

  it("战败不发奖励并退回当前州域的有效安全场景", () => {
    const started = beginCombat(createNewGame("问道者"), "wolf_pack");
    expect(started.combat).toBeDefined();
    if (!started.combat) {
      return;
    }
    const defeated = {
      ...started.combat,
      allies: started.combat.allies.map((actor) => ({ ...actor, hp: 0, spirit: 0 })),
    };
    const result = settleCombat(started, defeated);

    expect(result.combatReport?.result).toBe("defeat");
    expect(result.world.encounterWins.wolf_pack).toBeUndefined();
    expect(result.world.locationId).toBe("qingyun_city");
    expect(result.world.sceneId).toBeTruthy();
    expect(result.player.hp).toBeGreaterThan(0);
    expect(result.player.spirit).toBeGreaterThan(0);
  });
});
