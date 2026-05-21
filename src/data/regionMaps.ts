export interface RegionMapMarker {
  locationId: string;
  x: number;
  y: number;
  labelOffsetX?: number;
  labelOffsetY?: number;
  recommendedRealm: string;
  danger: string;
}

export interface RegionMapConfig {
  regionId: string;
  imageKey: "nanjiang" | "zhongzhou";
  maxScale: number;
  markers: RegionMapMarker[];
}

export const regionMaps: RegionMapConfig[] = [
  {
    regionId: "central",
    imageKey: "zhongzhou",
    maxScale: 4,
    markers: [
      { locationId: "qingyun_city", x: 22, y: 39, recommendedRealm: "炼气初期", danger: "安全主镇，可交易、接取任务并递交青云令牌入宗。" },
      { locationId: "tian_xuan_gate", x: 59, y: 52, recommendedRealm: "炼气初期", danger: "天玄城门守卫森严，城墙阵纹常年亮起，是进入天玄城的正门。" },
      { locationId: "black_wind_mountain", x: 14, y: 39, recommendedRealm: "炼气初期", danger: "山中有妖兽与黑风妖修出没，建议备好回春散。" },
      { locationId: "herb_valley", x: 45, y: 80, recommendedRealm: "炼气初期", danger: "谷中可采集灵草和凝气草，但守草妖兽会护住药田。" },
      { locationId: "ancient_cave", x: 72, y: 17, recommendedRealm: "炼气后期", danger: "残阵守卫仍在巡守，深处藏有筑基材料机缘。" },
      { locationId: "luoxia_town", x: 18, y: 77, recommendedRealm: "炼气初期", danger: "城镇相对安全，商道沿线仍有妖兽袭扰传闻。" },
    ],
  },
  {
    regionId: "south_ridge",
    imageKey: "nanjiang",
    maxScale: 4,
    markers: [
      { locationId: "wuyao_alliance", x: 54, y: 25, recommendedRealm: "炼气后期", danger: "盟城安全，外来修士需守巫妖盟规矩。" },
      { locationId: "wood_spirit_sect", x: 22, y: 22, recommendedRealm: "筑基初期", danger: "宗门安全，试炼木阵有筑基压力。" },
      { locationId: "baicao_valley", x: 38, y: 48, recommendedRealm: "炼气后期", danger: "灵药丰茂，妖藤会主动缠杀采药人。" },
      { locationId: "ten_thousand_beast_mountain", x: 31, y: 33, recommendedRealm: "筑基初期", danger: "妖兽密集，灵宠踪迹伴随巡山兽出没。" },
      { locationId: "miasma_marsh", x: 18, y: 64, recommendedRealm: "筑基初期", danger: "瘴气侵体，蛊虫群速度极快。" },
      { locationId: "thousand_falls_cliff", x: 61, y: 47, recommendedRealm: "筑基中期", danger: "瀑下灵压沉重，木傀守卫防御坚硬。" },
      { locationId: "tide_market", x: 80, y: 44, recommendedRealm: "炼气后期", danger: "海市安全，但潮汐秘货价格偏高。" },
      { locationId: "returning_tide_reef", x: 71, y: 76, recommendedRealm: "筑基中期", danger: "礁洞潮音迷神，潮汐守卫结阵而行。" },
    ],
  },
];

export function getRegionMapConfig(regionId: string): RegionMapConfig | undefined {
  return regionMaps.find((map) => map.regionId === regionId);
}
