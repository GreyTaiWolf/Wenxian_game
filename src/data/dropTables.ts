import type { EnemyRank, ItemAmount } from "../types";

export interface EquipmentDropRule {
  /** 每个 roll 独立判定。1 表示必掉，0 表示不掉。 */
  chance: number;
  rolls: number;
  itemIds: string[];
}

export interface FirstClearEquipmentReward {
  itemId: string;
  /** 首通专属装备替代常规装备判定，避免首通一次喷出两件而冲淡专属感。 */
  replacesEquipmentRoll: boolean;
}

export interface CombatDropTable {
  id: string;
  rank: EnemyRank;
  fixedItems: ItemAmount[];
  equipment: EquipmentDropRule;
  firstClearEquipment?: FirstClearEquipmentReward;
}

const mortalEquipmentPool = [
  "rough_iron_sword",
  "cloth_robe",
  "cloth_boots",
  "old_wood_sword",
  "bamboo_crown",
  "coarse_cloth_wrist",
  "straw_sandals",
  "copper_ring",
];

const qiEquipmentPool = [
  "low_sword",
  "short_azure_blade",
  "azure_pattern_robe",
  "jade_crown",
  "azure_pattern_wrist",
  "breeze_shoes",
  "jade_ring",
  "clarity_talisman",
];

const qiEliteEquipmentPool = [
  "cloudbreaker_spear",
  "spiritfocus_staff",
  "spirit_spring_robe",
  "mystic_pattern_crown",
  "spirit_gather_pendant",
];

const foundationEquipmentPool = [
  "frost_sword",
  "mystic_fire_sword",
  "flowing_cloud_sword",
  "crimson_flame_blade",
  "blackwind_blade",
  "mystic_fire_robe",
  "flowing_cloud_robe",
  "greenwood_robe",
  "frost_crown",
  "flowing_cloud_crown",
  "mystic_fire_wrist",
  "flowing_cloud_wrist",
  "cloudstride_boots",
  "windchase_boots",
  "crimson_fire_ring",
  "azure_frost_ring",
  "mind_ward_pendant",
  "brightmind_talisman",
  "spirit_gourd",
  "clarity_bell",
  "spirit_spring_orb",
];

export const combatDropTables: CombatDropTable[] = [
  {
    id: "drop_wolf_pack",
    rank: "normal",
    fixedItems: [{ itemId: "beast_bone", amount: 1 }],
    equipment: { chance: 0.14, rolls: 1, itemIds: mortalEquipmentPool },
  },
  {
    id: "drop_black_wind_duo",
    rank: "elite",
    fixedItems: [
      { itemId: "beast_bone", amount: 2 },
      { itemId: "spirit_herb", amount: 1 },
    ],
    equipment: { chance: 0.48, rolls: 1, itemIds: qiEquipmentPool },
  },
  {
    id: "drop_herb_guard",
    rank: "normal",
    fixedItems: [
      { itemId: "qi_grass", amount: 1 },
      { itemId: "spirit_herb", amount: 2 },
    ],
    equipment: { chance: 0.18, rolls: 1, itemIds: mortalEquipmentPool },
  },
  {
    id: "drop_ancient_cave",
    rank: "boss",
    fixedItems: [
      { itemId: "foundation_pill", amount: 1 },
      { itemId: "greenwood_essence", amount: 1 },
    ],
    equipment: { chance: 1, rolls: 1, itemIds: qiEliteEquipmentPool },
    firstClearEquipment: {
      itemId: "ancient_echo_sword",
      replacesEquipmentRoll: true,
    },
  },
  {
    id: "drop_baicao_vines",
    rank: "normal",
    fixedItems: [
      { itemId: "spirit_herb", amount: 2 },
      { itemId: "demon_core_shard", amount: 1 },
    ],
    equipment: { chance: 0.26, rolls: 1, itemIds: qiEquipmentPool },
  },
  {
    id: "drop_miasma_gu_swarm",
    rank: "elite",
    fixedItems: [
      { itemId: "miasma_flower", amount: 2 },
      { itemId: "demon_core_shard", amount: 1 },
    ],
    equipment: { chance: 0.52, rolls: 1, itemIds: qiEliteEquipmentPool },
  },
  {
    id: "drop_beast_mountain_patrol",
    rank: "elite",
    fixedItems: [
      { itemId: "beast_bone", amount: 2 },
      { itemId: "demon_core_shard", amount: 1 },
    ],
    equipment: { chance: 0.58, rolls: 1, itemIds: foundationEquipmentPool },
  },
  {
    id: "drop_waterfall_guard",
    rank: "boss",
    fixedItems: [
      { itemId: "greenwood_essence", amount: 1 },
      { itemId: "spirit_herb", amount: 2 },
    ],
    equipment: { chance: 1, rolls: 1, itemIds: foundationEquipmentPool },
  },
  {
    id: "drop_tide_cave_guard",
    rank: "boss",
    fixedItems: [{ itemId: "tide_shell", amount: 2 }],
    equipment: { chance: 1, rolls: 1, itemIds: foundationEquipmentPool },
  },
  {
    id: "drop_wood_spirit_trial",
    rank: "elite",
    fixedItems: [{ itemId: "greenwood_essence", amount: 1 }],
    equipment: { chance: 0.72, rolls: 1, itemIds: foundationEquipmentPool },
  },
];

const combatDropTablesById = new Map(combatDropTables.map((dropTable) => [dropTable.id, dropTable]));

export function getCombatDropTable(dropTableId: string): CombatDropTable {
  const dropTable = combatDropTablesById.get(dropTableId);
  if (!dropTable) {
    throw new Error(`Unknown combat drop table: ${dropTableId}`);
  }
  return dropTable;
}
