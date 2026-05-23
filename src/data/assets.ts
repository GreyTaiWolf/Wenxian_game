import type { RegionMapConfig } from "./regionMaps";

const worldMapSrc = new URL("../../World_map.png", import.meta.url).href;
const southernMapSrc = new URL("../../World_map_nanjiang2.png", import.meta.url).href;
const centralMapSrc = new URL("../../World_map_zhonzhou2.png", import.meta.url).href;
const tianXuanGateSrc = new URL("../../maps/tian_xuan_cheng_meng.png", import.meta.url).href;
const qingyunTownSrc = new URL("../../scene/qinyun_town.png", import.meta.url).href;
const xiaoxiaoShopSrc = new URL("../../scene/xiaoxiao_shop.png", import.meta.url).href;
const liBaicaoSrc = new URL("../../scene/li_baicao.png", import.meta.url).href;
const blackWindMountainSrc = new URL("../../scene/black_wind_mountain.png", import.meta.url).href;

export const mapImages = {
  world: worldMapSrc,
  central: centralMapSrc,
  southern: southernMapSrc,
  zhongzhou: centralMapSrc,
  nanjiang: southernMapSrc,
} as const;

export const regionMapImages: Record<RegionMapConfig["imageKey"], string> = {
  nanjiang: southernMapSrc,
  zhongzhou: centralMapSrc,
};

export const sceneImages: Record<string, string> = {
  tian_xuan_gate: tianXuanGateSrc,
  qingyun_town: qingyunTownSrc,
  xiaoxiao_shop: xiaoxiaoShopSrc,
  li_baicao: liBaicaoSrc,
  li_baicao_herbs: liBaicaoSrc,
  black_wind_mountain: blackWindMountainSrc,
  qingyunGate: "/assets/scenes/qingyun-gate.png",
  groceryShop: "/assets/scenes/grocery-shop.png",
  blackWindMountain: "/assets/scenes/black-wind-mountain.png",
};

export const npcPortraits: Record<string, string> = {
  shenGuanlan: "/assets/npc/shen-guanlan.png",
  shen_guanlan: "/assets/npc/shen-guanlan.png",
  luXuanheng: "/assets/npc/lu-xuanheng.png",
  lu_xuanheng: "/assets/npc/lu-xuanheng.png",
};

export const itemIcons: Record<string, string> = {
  healingPowder: "/assets/items/healing-powder.png",
  healing_powder: "/assets/items/healing-powder.png",
  qiGrass: "/assets/items/qi-grass.png",
  qi_grass: "/assets/items/qi-grass.png",
  beastBone: "/assets/items/beast-bone.png",
  beast_bone: "/assets/items/beast-bone.png",
};

export function getSceneImage(imageKey: string | null | undefined): string | null {
  return imageKey ? sceneImages[imageKey] ?? null : null;
}

export function getNpcPortrait(npcId: string | null | undefined): string | null {
  return npcId ? npcPortraits[npcId] ?? null : null;
}

export function getItemIcon(itemId: string | null | undefined): string | null {
  return itemId ? itemIcons[itemId] ?? null : null;
}
