export const sceneImages: Record<string, string> = {};

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
  void imageKey;
  return null;
}

export function getNpcPortrait(npcId: string | null | undefined): string | null {
  return npcId ? npcPortraits[npcId] ?? null : null;
}

export function getItemIcon(itemId: string | null | undefined): string | null {
  return itemId ? itemIcons[itemId] ?? null : null;
}
