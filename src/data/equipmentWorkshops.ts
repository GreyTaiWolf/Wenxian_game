import type { Cost, ItemGrade } from "../types";

export interface EquipmentCraftRecipe {
  id: string;
  label: string;
  itemId: string;
  blueprintItemId: string;
  description: string;
  cost: Cost;
}

export interface EquipmentWorkshopConfig {
  id: string;
  name: string;
  sceneId: string;
  managerNpcId: string;
  shopId: string;
  recipes: EquipmentCraftRecipe[];
}

export const reforgeLockLimitByGrade: Record<ItemGrade, number> = {
  fan: 0,
  liang: 1,
  jing: 1,
  ling: 2,
  xuan: 2,
  di: 3,
  tian: 3,
  xian: 4,
  shen: 4,
};

export const equipmentWorkshopConfigs: EquipmentWorkshopConfig[] = [
  {
    id: "zhao_refinery_workshop",
    name: "赵家炼器铺",
    sceneId: "zhao_refinery",
    managerNpcId: "zhao_tiejiang",
    shopId: "zhao_refinery",
    recipes: [
      {
        id: "forge_rough_iron_sword",
        label: "打造粗铁剑",
        itemId: "rough_iron_sword",
        blueprintItemId: "rough_iron_sword_blueprint",
        description: "赵铁匠用妖兽骨粉淬火，打一柄更稳的凡阶铁剑。",
        cost: {
          spiritStones: 56,
          items: [{ itemId: "beast_bone", amount: 1 }],
        },
      },
      {
        id: "forge_low_sword",
        label: "打造低阶法剑",
        itemId: "low_sword",
        blueprintItemId: "low_sword_blueprint",
        description: "以妖兽骨作炉料、凝气草引灵，打造炼气阶低阶法剑。",
        cost: {
          spiritStones: 460,
          items: [
            { itemId: "beast_bone", amount: 4 },
            { itemId: "qi_grass", amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: "cave_refinery_workshop",
    name: "洞府炼器室",
    sceneId: "cave_refinery",
    managerNpcId: "self",
    shopId: "",
    recipes: [
      {
        id: "forge_rough_iron_sword",
        label: "打造粗铁剑",
        itemId: "rough_iron_sword",
        blueprintItemId: "rough_iron_sword_blueprint",
        description: "以洞府炉火重炼凡铁，打一柄更稳的凡阶铁剑。",
        cost: {
          spiritStones: 56,
          items: [{ itemId: "beast_bone", amount: 1 }],
        },
      },
      {
        id: "forge_low_sword",
        label: "打造低阶法剑",
        itemId: "low_sword",
        blueprintItemId: "low_sword_blueprint",
        description: "以妖兽骨作炉料、凝气草引灵，在洞府炼器室打造低阶法剑。",
        cost: {
          spiritStones: 460,
          items: [
            { itemId: "beast_bone", amount: 4 },
            { itemId: "qi_grass", amount: 1 },
          ],
        },
      },
    ],
  },
];

export function getEquipmentWorkshop(workshopId: string | null | undefined): EquipmentWorkshopConfig | null {
  return equipmentWorkshopConfigs.find((workshop) => workshop.id === workshopId) ?? null;
}

export function getEquipmentWorkshopBySceneId(sceneId: string | null | undefined): EquipmentWorkshopConfig | null {
  return equipmentWorkshopConfigs.find((workshop) => workshop.sceneId === sceneId) ?? null;
}

export function getEquipmentWorkshopByNpcId(npcId: string | null | undefined): EquipmentWorkshopConfig | null {
  return equipmentWorkshopConfigs.find((workshop) => workshop.managerNpcId === npcId) ?? null;
}

export function getEquipmentCraftRecipe(workshopId: string | null | undefined, recipeId: string | null | undefined): EquipmentCraftRecipe | null {
  const workshop = getEquipmentWorkshop(workshopId);
  return workshop?.recipes.find((recipe) => recipe.id === recipeId) ?? null;
}
