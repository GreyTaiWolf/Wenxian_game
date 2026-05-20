import type { EquipmentSlotId, Stats } from "../types";

export type SlotMainStatRule = Partial<Record<keyof Stats, [number, number] | "useSpeedTable" | "useDodgeRateTable" | "useCritRateTable" | "useSpiritSenseTable">> & {
  specialAffix?: boolean;
  enabledRealm?: "nascent";
};

export const slotMainStatRules: Record<EquipmentSlotId, SlotMainStatRule> = {
  weapon: {
    attack: [1, 1],
  },
  robe: {
    defense: [0.45, 0.6],
    maxHp: [4, 7],
  },
  helmet: {
    maxHp: [3, 5],
    defense: [0.25, 0.4],
  },
  wrist: {
    attack: [0.15, 0.25],
    defense: [0.2, 0.35],
  },
  boots: {
    speed: "useSpeedTable",
    dodgeRate: "useDodgeRateTable",
  },
  ring: {
    critRate: "useCritRateTable",
    attack: [0.12, 0.22],
  },
  amulet: {
    maxSpirit: [2.5, 4.5],
    dodgeRate: "useDodgeRateTable",
  },
  artifact: {
    attack: [0.6, 1.1],
    spiritSense: "useSpiritSenseTable",
    specialAffix: true,
  },
};
