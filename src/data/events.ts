import type { ItemAmount, WeatherId, WorldEventChoiceKind, WorldEventType } from "../types";

export interface WorldEventChoiceConfig {
  id: string;
  label: string;
  kind: WorldEventChoiceKind;
  text: string;
  targetId?: string;
  rewards?: {
    cultivation?: number;
    spiritStones?: number;
    items?: ItemAmount[];
  };
  setFlags?: string[];
  weatherId?: WeatherId;
}

export interface WorldEventConfig {
  id: string;
  title: string;
  type: WorldEventType;
  description: string;
  mapIds?: string[];
  regionIds?: string[];
  locationIds?: string[];
  minRealmId?: string;
  requiredWeatherIds?: WeatherId[];
  chance: number;
  cooldownDays: number;
  maxTriggers?: number;
  choices: WorldEventChoiceConfig[];
}

export const worldEvents: WorldEventConfig[] = [
  {
    id: "mist_traveling_cultivator",
    title: "雾中散修",
    type: "dialogue",
    description: "薄雾里有一名散修倚石调息，腰间药囊散出淡淡草木气。",
    regionIds: ["central", "south_ridge"],
    locationIds: ["qingyun_city", "herb_valley", "baicao_valley", "wood_spirit_sect"],
    chance: 0.07,
    cooldownDays: 20,
    choices: [
      {
        id: "talk",
        label: "上前交谈",
        kind: "reward",
        text: "对方与你交换路引消息，临别时赠你一小包灵草种。",
        rewards: {
          items: [{ itemId: "spirit_grass_seed", amount: 1 }],
        },
      },
      {
        id: "leave",
        label: "绕路离开",
        kind: "dismiss",
        text: "你没有打扰对方，只记下此地雾气略有草木灵机。",
      },
    ],
  },
  {
    id: "wild_beast_ambush",
    title: "妖兽伏路",
    type: "combat",
    description: "山林忽然一静，几双幽绿兽瞳从乱石后亮起。",
    regionIds: ["central"],
    locationIds: ["black_wind_mountain"],
    chance: 0.055,
    cooldownDays: 18,
    choices: [
      {
        id: "fight",
        label: "拔剑迎战",
        kind: "combat",
        targetId: "wolf_pack",
        text: "你踏前一步，灵力灌入剑锋。",
      },
      {
        id: "avoid",
        label: "收敛气息",
        kind: "dismiss",
        text: "你收敛气息，贴着山石绕开了妖兽伏击。",
      },
    ],
  },
  {
    id: "qingyun_notice_tip",
    title: "公告栏旧纸",
    type: "quest",
    description: "青云镇公告栏边角压着一张旧悬赏，墨迹提到黑风山近来妖狼聚集。",
    regionIds: ["central"],
    locationIds: ["qingyun_city"],
    chance: 0.1,
    cooldownDays: 12,
    choices: [
      {
        id: "read_notice",
        label: "细读旧纸",
        kind: "reward",
        text: "你记下黑风山妖狼巢的位置，顺手得了几块压纸灵石。",
        rewards: {
          spiritStones: 18,
        },
        setFlags: ["read_black_wind_notice"],
      },
      {
        id: "leave",
        label: "暂且不看",
        kind: "dismiss",
        text: "你压下好奇，先把镇中事务处理完。",
      },
    ],
  },
  {
    id: "black_wind_bone_cache",
    title: "山道残骨",
    type: "treasure",
    description: "黑松根下露出几截妖兽骨，附近还有被翻乱的脚印。",
    regionIds: ["central"],
    locationIds: ["black_wind_mountain"],
    chance: 0.12,
    cooldownDays: 10,
    choices: [
      {
        id: "collect_bone",
        label: "收起残骨",
        kind: "reward",
        text: "你确认周围暂时安全，收起能用来交差和炼器的妖兽骨。",
        rewards: {
          items: [{ itemId: "beast_bone", amount: 1 }],
        },
      },
      {
        id: "track",
        label: "追踪脚印",
        kind: "combat",
        targetId: "wolf_pack",
        text: "你循着脚印追入林中，雾里忽然亮起数双兽瞳。",
      },
    ],
  },
  {
    id: "spirit_rain_seedfall",
    title: "灵雨落种",
    type: "field",
    description: "雨丝落在掌心竟带着微光，草叶间有几粒灵种被冲出泥面。",
    regionIds: ["central", "south_ridge"],
    requiredWeatherIds: ["spirit_rain", "spirit_tide"],
    chance: 0.18,
    cooldownDays: 45,
    choices: [
      {
        id: "collect",
        label: "收集灵种",
        kind: "field",
        text: "你以木匣收起灵种，又取了一瓶尚未散尽的灵雨。",
        rewards: {
          items: [
            { itemId: "qi_grass_seed", amount: 1 },
            { itemId: "spirit_spring_water", amount: 1 },
          ],
        },
      },
      {
        id: "observe",
        label: "只观天象",
        kind: "dialogue",
        text: "你记下灵雨流向，隐约明白洞府灵田需要顺应天时。",
        setFlags: ["observed_spirit_rain"],
      },
    ],
  },
  {
    id: "starfall_omen",
    title: "星陨异象",
    type: "weather",
    description: "夜色忽然被一道星火划开，远处山岭有灵光坠落。",
    chance: 0.025,
    cooldownDays: 120,
    maxTriggers: 3,
    choices: [
      {
        id: "watch_star",
        label: "观星推演",
        kind: "weather",
        weatherId: "starfall",
        text: "你静观星痕，天地间的灵机短暂沸腾。",
        rewards: {
          spiritStones: 60,
          items: [{ itemId: "five_color_spirit_soil", amount: 1 }],
        },
        setFlags: ["saw_starfall"],
      },
      {
        id: "ignore",
        label: "稳住心神",
        kind: "dismiss",
        text: "你没有追逐星火，只将异象记入心中。",
      },
    ],
  },
];

export function getWorldEvent(eventId: string): WorldEventConfig | undefined {
  return worldEvents.find((event) => event.id === eventId);
}
