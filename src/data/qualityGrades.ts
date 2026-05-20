import type { ItemGrade } from "../types";

export interface QualityGradeConfig {
  id: ItemGrade;
  name: string;
  prefix: string;
  color: string;
  affixCount: [number, number];
  affixCoeff: number;
  specialAffix: boolean;
  exclusiveAffix?: boolean;
  tier: number;
  priceMultiplier: number;
  effectMultiplier: number;
  tone: string;
}

export const itemGradeOrder: ItemGrade[] = ["fan", "liang", "jing", "ling", "xuan", "di", "tian", "xian", "shen"];

export const qualityGrades: Record<ItemGrade, QualityGradeConfig> = {
  fan: {
    id: "fan",
    name: "凡品",
    prefix: "凡",
    color: "#C8CDD6",
    affixCount: [0, 1],
    affixCoeff: 0.75,
    specialAffix: false,
    tier: 1,
    priceMultiplier: 1,
    effectMultiplier: 1,
    tone: "灰白朴素边框",
  },
  liang: {
    id: "liang",
    name: "良品",
    prefix: "良",
    color: "#45C46B",
    affixCount: [1, 1],
    affixCoeff: 1,
    specialAffix: false,
    tier: 2,
    priceMultiplier: 1.8,
    effectMultiplier: 1.1,
    tone: "绿色灵光",
  },
  jing: {
    id: "jing",
    name: "精品",
    prefix: "精",
    color: "#4E8DFF",
    affixCount: [1, 2],
    affixCoeff: 1.25,
    specialAffix: false,
    tier: 3,
    priceMultiplier: 3.2,
    effectMultiplier: 1.22,
    tone: "蓝色流光",
  },
  ling: {
    id: "ling",
    name: "灵品",
    prefix: "灵",
    color: "#A56DFF",
    affixCount: [2, 3],
    affixCoeff: 1.55,
    specialAffix: true,
    tier: 4,
    priceMultiplier: 5.5,
    effectMultiplier: 1.38,
    tone: "紫色符纹",
  },
  xuan: {
    id: "xuan",
    name: "玄品",
    prefix: "玄",
    color: "#FF9A3D",
    affixCount: [3, 4],
    affixCoeff: 1.95,
    specialAffix: true,
    tier: 5,
    priceMultiplier: 9,
    effectMultiplier: 1.58,
    tone: "橙色灵焰",
  },
  di: {
    id: "di",
    name: "地品",
    prefix: "地",
    color: "#FF5E6A",
    affixCount: [4, 5],
    affixCoeff: 2.45,
    specialAffix: true,
    tier: 6,
    priceMultiplier: 15,
    effectMultiplier: 1.82,
    tone: "赤红地脉光",
  },
  tian: {
    id: "tian",
    name: "天品",
    prefix: "天",
    color: "#FFD45A",
    affixCount: [5, 6],
    affixCoeff: 3.1,
    specialAffix: true,
    tier: 7,
    priceMultiplier: 24,
    effectMultiplier: 2.1,
    tone: "金色天光",
  },
  xian: {
    id: "xian",
    name: "仙品",
    prefix: "仙",
    color: "#FFF2B2",
    affixCount: [6, 7],
    affixCoeff: 3.9,
    specialAffix: true,
    exclusiveAffix: true,
    tier: 8,
    priceMultiplier: 38,
    effectMultiplier: 2.38,
    tone: "金白流光",
  },
  shen: {
    id: "shen",
    name: "神品",
    prefix: "神",
    color: "#FFCC88",
    affixCount: [7, 8],
    affixCoeff: 5,
    specialAffix: true,
    exclusiveAffix: true,
    tier: 9,
    priceMultiplier: 60,
    effectMultiplier: 2.72,
    tone: "赤金虹光",
  },
};

export const itemGradeLabels = Object.fromEntries(itemGradeOrder.map((grade) => [grade, qualityGrades[grade].name])) as Record<ItemGrade, string>;

export const itemGradeNamePrefixes = Object.fromEntries(itemGradeOrder.map((grade) => [grade, qualityGrades[grade].prefix])) as Record<ItemGrade, string>;

export const itemGradeMetas = Object.fromEntries(
  itemGradeOrder.map((grade) => {
    const config = qualityGrades[grade];
    return [
      grade,
      {
        label: config.name,
        hex: config.color,
        priceMultiplier: config.priceMultiplier,
        effectMultiplier: config.effectMultiplier,
        affixCount: `${config.affixCount[0]}-${config.affixCount[1]}`,
        specialEffect: config.exclusiveAffix ? "专属/唯一词条" : config.specialAffix ? "可生成特殊词条" : "无",
        tier: config.tier,
        tone: config.tone,
      },
    ];
  }),
) as Record<
  ItemGrade,
  {
    label: string;
    hex: string;
    priceMultiplier: number;
    effectMultiplier: number;
    affixCount: string;
    specialEffect: string;
    tier: number;
    tone: string;
  }
>;

export const legacyQualityMap: Record<string, ItemGrade> = {
  common: "fan",
  fine: "liang",
  superior: "jing",
  rare: "ling",
  mystic: "ling",
  spirit: "xuan",
  earth: "di",
  heaven: "tian",
  immortal: "xian",
  divine: "shen",
};

export function normalizeQuality(quality: string): ItemGrade {
  return legacyQualityMap[quality] ?? (itemGradeOrder.includes(quality as ItemGrade) ? (quality as ItemGrade) : "fan");
}
