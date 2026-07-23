import { CENTRAL_GRID_MAP_ID } from "./gridMaps";
import type { Cost, ItemAmount } from "../types";

export interface TravelEventRewards {
  cultivation?: number;
  spiritStones?: number;
  items?: ItemAmount[];
}

export interface TravelEventOutcome {
  resultText: string;
  preview: string;
  rewards?: TravelEventRewards;
  mindValueDelta?: number;
  timeHours?: number;
  flags?: Record<string, number>;
  nextEventId?: string;
}

export interface TravelEventChoice {
  id: string;
  label: string;
  description: string;
  cost: Cost;
  isFallback?: boolean;
  outcome: TravelEventOutcome;
}

export interface TravelEventDefinition {
  id: string;
  title: string;
  locationName: string;
  description: string;
  regionId: "central";
  mapIds: readonly string[];
  locationIds: readonly string[];
  minStepCount: number;
  weight: number;
  cooldownKey: string;
  cooldownHours: number;
  stageOnly?: boolean;
  choices: [TravelEventChoice, TravelEventChoice];
}

const woundedGuestCooldown = "travel_event_wounded_guest";

/**
 * 中州 A* 网格行程会抽取的六条地点异闻。
 * locationIds 同时匹配行程起点与终点，避免把事件绑死在一条节点边上。
 */
export const centralTravelEvents: TravelEventDefinition[] = [
  {
    id: "central_wounded_guest",
    title: "黑松坡·负伤客",
    locationName: "黑风山外黑松坡",
    description: "暮色压住山道，一名灰衣修士倚在折松下，袖口渗血。他没有呼救，只将一枚烧裂的铜牌扣在掌中。",
    regionId: "central",
    mapIds: [CENTRAL_GRID_MAP_ID],
    locationIds: ["black_wind_mountain", "luoxia_town"],
    minStepCount: 4,
    weight: 4,
    cooldownKey: woundedGuestCooldown,
    cooldownHours: 48,
    choices: [
      {
        id: "use_medicine",
        label: "以回春散替他止血",
        description: "药力能压住伤势，但你也许会因此卷入一桩未了旧事。",
        cost: { items: [{ itemId: "healing_powder", amount: 1 }] },
        outcome: {
          resultText: "你替灰衣修士敷药止血。他缓过气来，执意引你去前方废窑，说那里藏着这次追杀的缘由。",
          preview: "因果将延续",
          mindValueDelta: 2,
          flags: { helped_wounded_guest: 1 },
          nextEventId: "central_wounded_guest_old_kiln",
        },
      },
      {
        id: "keep_distance",
        label: "留下一句警告后绕行",
        description: "黑风山附近恩怨难辨，保全自身也是散修的生存之道。",
        cost: {},
        isFallback: true,
        outcome: {
          resultText: "你指出山雾将起，随即绕开折松。身后没有追赶声，只有铜牌落地的一声轻响。",
          preview: "心境 +1",
          mindValueDelta: 1,
          flags: { passed_wounded_guest: 1 },
        },
      },
    ],
  },
  {
    id: "central_mired_caravan",
    title: "落霞商道·陷车",
    locationName: "青云城至落霞镇商道",
    description: "一辆满载灵谷的兽车陷进雨后泥沟。车夫急得满头是汗，驮兽却被惊雷吓得不肯挪步。",
    regionId: "central",
    mapIds: [CENTRAL_GRID_MAP_ID],
    locationIds: ["qingyun_city", "luoxia_town"],
    minStepCount: 3,
    weight: 5,
    cooldownKey: "travel_event_mired_caravan",
    cooldownHours: 30,
    choices: [
      {
        id: "calm_pack_beast",
        label: "取灵草安抚驮兽",
        description: "以草木灵气安神，再借车队绞盘将货车拖回硬地。",
        cost: { items: [{ itemId: "spirit_herb", amount: 1 }] },
        outcome: {
          resultText: "驮兽嗅到灵草后渐渐安静，货车也终于脱困。商队管事依市价之外又添了一份谢仪。",
          preview: "灵石 +30、心境 +2",
          rewards: { spiritStones: 30 },
          mindValueDelta: 2,
          flags: { aided_luoxia_caravan: 1 },
        },
      },
      {
        id: "push_the_axle",
        label: "挽袖推车",
        description: "不用灵物，只花些力气与时间帮他们把车轴垫稳。",
        cost: {},
        isFallback: true,
        outcome: {
          resultText: "你与车夫们在泥水里忙了许久，终于将车推上商道。粗浅的发力吐纳，也让你对运气多了一分体会。",
          preview: "耗时 2 时辰、修为 +2",
          rewards: { cultivation: 2 },
          mindValueDelta: 2,
          timeHours: 2,
          flags: { pushed_luoxia_caravan: 1 },
        },
      },
    ],
  },
  {
    id: "central_three_leaf_verdure",
    title: "药谷外·三叶青",
    locationName: "灵药谷外溪涧",
    description: "溪边石缝中生着一簇三叶青，叶脉随水声明灭。采药人说，只有顺着地气下刀，才不会伤及根须。",
    regionId: "central",
    mapIds: [CENTRAL_GRID_MAP_ID],
    locationIds: ["herb_valley"],
    minStepCount: 3,
    weight: 5,
    cooldownKey: "travel_event_three_leaf_verdure",
    cooldownHours: 36,
    choices: [
      {
        id: "hire_herb_guide",
        label: "付灵石请采药人指点",
        description: "让熟悉谷中草木的人示范取叶、护根与封存之法。",
        cost: { spiritStones: 10 },
        outcome: {
          resultText: "采药人以竹刀分开根土，你照着手法取下成熟叶片，剩下的根须仍在溪雾中吐纳。",
          preview: "凝气草 ×2、灵草 ×1",
          rewards: {
            items: [
              { itemId: "qi_grass", amount: 2 },
              { itemId: "spirit_herb", amount: 1 },
            ],
          },
          timeHours: 2,
          flags: { learned_three_leaf_harvest: 1 },
        },
      },
      {
        id: "study_leaf_veins",
        label: "只观叶脉，不动灵根",
        description: "将草木吐纳与自身周天相互印证，留待有把握时再采。",
        cost: {},
        isFallback: true,
        outcome: {
          resultText: "你在溪边静坐，三叶青的明暗渐与呼吸重合。虽未采走灵草，却记住了一线地气走向。",
          preview: "耗时 1 时辰、修为 +3",
          rewards: { cultivation: 3 },
          mindValueDelta: 1,
          timeHours: 1,
          flags: { observed_three_leaf_verdure: 1 },
        },
      },
    ],
  },
  {
    id: "central_broken_stele",
    title: "洞府古道·断碑剑音",
    locationName: "古修洞府外残道",
    description: "半截石碑斜插荒草，雨水流过一道无名剑痕。每当你移开视线，识海里便会多出半声剑鸣。",
    regionId: "central",
    mapIds: [CENTRAL_GRID_MAP_ID],
    locationIds: ["ancient_cave"],
    minStepCount: 4,
    weight: 4,
    cooldownKey: "travel_event_broken_stele",
    cooldownHours: 54,
    choices: [
      {
        id: "feed_the_formation",
        label: "以灵石续亮残阵",
        description: "借灵石短暂补全碑下阵纹，强行听完那一声剑鸣。",
        cost: { spiritStones: 15 },
        outcome: {
          resultText: "残阵亮起的一瞬，完整剑音直贯灵台。你记下其运气之势，也承受了几分锋锐余压。",
          preview: "耗时 1 时辰、修为 +8、心境 -3",
          rewards: { cultivation: 8 },
          mindValueDelta: -3,
          timeHours: 1,
          flags: { heard_complete_stele_echo: 1 },
        },
      },
      {
        id: "take_a_rubbing",
        label: "拓下剑痕再走",
        description: "不触碰残阵，只以炭粉记下可见纹路，日后慢慢参详。",
        cost: {},
        isFallback: true,
        outcome: {
          resultText: "你避开阵眼，将剑痕一寸寸拓下。纸上只得其形，却也让行气中的一处滞涩豁然开朗。",
          preview: "耗时 2 时辰、修为 +3",
          rewards: { cultivation: 3 },
          timeHours: 2,
          flags: { copied_broken_stele: 1 },
        },
      },
    ],
  },
  {
    id: "central_rain_tea_stall",
    title: "青云驿路·无名茶棚",
    locationName: "青云城外旧驿路",
    description: "骤雨里，一座来时分明不存在的茶棚亮起青灯。摊主不问姓名，只说一碗茶换八枚灵石，也换片刻清净。",
    regionId: "central",
    mapIds: [CENTRAL_GRID_MAP_ID],
    locationIds: ["qingyun_city", "luoxia_town", "tian_xuan_gate"],
    minStepCount: 3,
    weight: 3,
    cooldownKey: "travel_event_rain_tea_stall",
    cooldownHours: 42,
    choices: [
      {
        id: "drink_quiet_tea",
        label: "付灵石饮茶",
        description: "茶气极淡，却能让一路积下的杂念沉入杯底。",
        cost: { spiritStones: 8 },
        outcome: {
          resultText: "茶入口时，雨声仿佛远了数里。你再抬头，棚中已无人影，桌上只留一句“道在脚下”。",
          preview: "耗时 1 时辰、修为 +2、心境 +7",
          rewards: { cultivation: 2 },
          mindValueDelta: 7,
          timeHours: 1,
          flags: { drank_nameless_tea: 1 },
        },
      },
      {
        id: "ask_the_road",
        label: "檐下问路便走",
        description: "不饮来历不明的茶，只借一角屋檐辨清前路。",
        cost: {},
        isFallback: true,
        outcome: {
          resultText: "摊主隔着雨幕指了指岔路。你回身道谢时，身后只剩一株被雨洗亮的老槐。",
          preview: "心境 +1",
          mindValueDelta: 1,
          flags: { passed_nameless_tea_stall: 1 },
        },
      },
    ],
  },
  {
    id: "central_star_track_array",
    title: "天玄城外·星轨残阵",
    locationName: "天玄城门外星砂坡",
    description: "道路旁散落的银砂忽然自行连成星轨，阵心缺了一点青色灵光。城墙上的阵纹也随之明灭。",
    regionId: "central",
    mapIds: [CENTRAL_GRID_MAP_ID],
    locationIds: ["tian_xuan_gate", "ancient_cave"],
    minStepCount: 4,
    weight: 4,
    cooldownKey: "travel_event_star_track_array",
    cooldownHours: 48,
    choices: [
      {
        id: "anchor_with_qi_grass",
        label: "以凝气草补住阵心",
        description: "草叶所含灵气温和，足以让残阵完成一次短暂周转。",
        cost: { items: [{ itemId: "qi_grass", amount: 1 }] },
        outcome: {
          resultText: "凝气草化作一缕青光，星轨随即转过完整一周。你顺势记下了阵中灵气生灭的次序。",
          preview: "耗时 1 时辰、修为 +7、心境 +2",
          rewards: { cultivation: 7 },
          mindValueDelta: 2,
          timeHours: 1,
          flags: { completed_star_track_array: 1 },
        },
      },
      {
        id: "mark_the_pattern",
        label: "记下阵纹后离开",
        description: "不贸然填补阵心，只将星砂次序画在路旁石片上。",
        cost: {},
        isFallback: true,
        outcome: {
          resultText: "你绕阵一周，确认它并无杀意，便将残缺星轨记入行囊中的旧纸。",
          preview: "耗时 1 时辰、修为 +2",
          rewards: { cultivation: 2 },
          timeHours: 1,
          flags: { recorded_star_track_array: 1 },
        },
      },
    ],
  },
];

/**
 * 只由前一阶段选择触发，不进入随机池。
 */
export const travelEventContinuations: TravelEventDefinition[] = [
  {
    id: "central_wounded_guest_old_kiln",
    title: "废窑灯火·旧诺",
    locationName: "黑松坡废窑",
    description: "废窑中没有追兵，只有一只封着商会火漆的木匣。灰衣修士坦言，他为护送账册遭同伴出卖，匣中便是最后一份证据。",
    regionId: "central",
    mapIds: [CENTRAL_GRID_MAP_ID],
    locationIds: ["black_wind_mountain", "luoxia_town"],
    minStepCount: 0,
    weight: 0,
    cooldownKey: woundedGuestCooldown,
    cooldownHours: 48,
    stageOnly: true,
    choices: [
      {
        id: "accept_the_gift",
        label: "收下谢礼，替他守口",
        description: "不接账册，只收一份救命谢礼，让这桩恩怨到此为止。",
        cost: {},
        outcome: {
          resultText: "灰衣修士取走账册，将木匣夹层里的灵石与凝气草留给你。窑火熄灭前，他郑重记下了你的道号。",
          preview: "灵石 +38、凝气草 ×1、心境 +1",
          rewards: {
            spiritStones: 38,
            items: [{ itemId: "qi_grass", amount: 1 }],
          },
          mindValueDelta: 1,
          flags: { accepted_wounded_guest_gift: 1 },
        },
      },
      {
        id: "ask_only_the_safe_road",
        label: "婉拒谢礼，只问安全山路",
        description: "救人并非为财，换一条避开黑雾的旧路已经足够。",
        cost: {},
        isFallback: true,
        outcome: {
          resultText: "灰衣修士在地上画出一条猎户旧路，又点明两处容易聚雾的山坳。你由此悟出几分察势先行的道理。",
          preview: "修为 +4、心境 +3",
          rewards: { cultivation: 4 },
          mindValueDelta: 3,
          flags: { refused_wounded_guest_gift: 1 },
        },
      },
    ],
  },
];

export const allTravelEvents: TravelEventDefinition[] = [...centralTravelEvents, ...travelEventContinuations];

const travelEventsById = new Map(allTravelEvents.map((event) => [event.id, event]));

export function getTravelEventDefinition(eventId: string): TravelEventDefinition | undefined {
  return travelEventsById.get(eventId);
}
