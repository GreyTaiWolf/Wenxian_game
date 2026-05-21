export interface WorldProvince {
  id: string;
  name: string;
  direction: string;
  forces: string[];
  description: string;
  open: boolean;
  regionId?: string;
  marker: {
    x: number;
    y: number;
  };
}

export const worldProvinces: WorldProvince[] = [
  {
    id: "central",
    name: "中州",
    direction: "天下腹地",
    forces: ["青云宗", "天都仙盟", "散修坊市"],
    description: "仙门与城镇最密集的修行中心，青云镇坐镇灵脉交汇之处。",
    open: true,
    regionId: "central",
    marker: { x: 49, y: 39 },
  },
  {
    id: "east_sea",
    name: "东海",
    direction: "万岛沧溟",
    forces: ["蓬莱仙岛", "碧海龙宫", "归墟散修"],
    description: "海岛、仙舟与水府交错的灵潮之地，传闻归墟深处有古修残碑。",
    open: false,
    marker: { x: 82, y: 38 },
  },
  {
    id: "west_desert",
    name: "西漠",
    direction: "沙海佛国",
    forces: ["黄沙魔宗", "万佛寺", "流沙商会"],
    description: "荒漠石城与古道商队并存，魔宗和佛寺在沙海边缘常年对峙。",
    open: false,
    marker: { x: 18, y: 48 },
  },
  {
    id: "south_ridge",
    name: "南疆",
    direction: "巫妖灵疆",
    forces: ["巫妖盟", "木灵宗", "百草谷", "潮汐海市"],
    description: "巫妖盟统御南疆诸部，木灵宗掌草木灵脉，百草谷产灵药，潮汐海市通海岛交易。",
    open: true,
    regionId: "south_ridge",
    marker: { x: 48, y: 74 },
  },
  {
    id: "north_border",
    name: "北境",
    direction: "玄冰雪域",
    forces: ["玄冰宫", "北冥剑宗", "雪原部族"],
    description: "雪山与寒河绵延千里，剑修和冰修在此磨炼心性。",
    open: false,
    marker: { x: 49, y: 16 },
  },
];

export function getWorldProvince(provinceId: string): WorldProvince {
  return worldProvinces.find((province) => province.id === provinceId) ?? worldProvinces[0];
}
