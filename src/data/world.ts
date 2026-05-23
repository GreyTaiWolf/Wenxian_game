import type { Cost, ItemAmount } from "../types";

export type SceneActionKind =
  | "dialogue"
  | "shop"
  | "taskBoard"
  | "combat"
  | "gather"
  | "recruitPet"
  | "recruitCompanion"
  | "joinSect"
  | "treasure";

export interface SceneAction {
  id: string;
  label: string;
  kind: SceneActionKind;
  targetId?: string;
  text?: string;
  rewards?: {
    cultivation?: number;
    spiritStones?: number;
    items?: ItemAmount[];
  };
}

export interface SceneHotspot {
  id: string;
  label: string;
  title: string;
  x: number;
  y: number;
  text: string;
}

export interface SceneNode {
  id: string;
  name: string;
  type: string;
  description: string;
  imageKey?: string;
  hotspots?: SceneHotspot[];
  actions: SceneAction[];
}

export interface LocationNode {
  eventPoolIds?: string[];
  id: string;
  name: string;
  type: "city" | "town" | "wild" | "secret";
  description: string;
  scenes: SceneNode[];
}

export interface RegionNode {
  eventPoolIds?: string[];
  id: string;
  name: string;
  locations: LocationNode[];
}

export interface ShopItem {
  itemId: string;
  price: number;
  regionId?: string;
}

export interface TaskConfig {
  id: string;
  regionId?: string;
  title: string;
  description: string;
  requirementText: string;
  requiredItems?: ItemAmount[];
  requiredFlags?: string[];
  rewards: {
    spiritStones: number;
    contribution: number;
    reputation: number;
    items?: ItemAmount[];
  };
}

export const shopItems: ShopItem[] = [
  { itemId: "healing_powder", price: 55 },
  { itemId: "qi_pill", price: 144 },
  { itemId: "low_sword", price: 396 },
  { itemId: "foundation_pill", price: 2640 },
  { itemId: "miasma_flower", price: 288, regionId: "south_ridge" },
  { itemId: "tide_shell", price: 320, regionId: "south_ridge" },
  { itemId: "demon_core_shard", price: 480, regionId: "south_ridge" },
  { itemId: "greenwood_essence", price: 880, regionId: "south_ridge" },
];

export const tasks: TaskConfig[] = [
  {
    id: "collect_qi_grass",
    regionId: "central",
    title: "采集凝气草",
    description: "宗门药房需要一批新鲜凝气草。",
    requirementText: "交付 凝气草 x2",
    requiredItems: [{ itemId: "qi_grass", amount: 2 }],
    rewards: { spiritStones: 90, contribution: 12, reputation: 3 },
  },
  {
    id: "hunt_black_wind",
    regionId: "central",
    title: "讨伐黑风山妖兽",
    description: "黑风山妖兽频繁袭扰商路。",
    requirementText: "交付 妖兽骨 x1",
    requiredItems: [{ itemId: "beast_bone", amount: 1 }],
    rewards: { spiritStones: 120, contribution: 18, reputation: 5 },
  },
  {
    id: "deliver_letter",
    regionId: "central",
    title: "送信落霞镇",
    description: "将宗门信笺带给落霞镇执事。",
    requirementText: "到落霞镇完成对话",
    requiredFlags: ["visited_luoxia"],
    rewards: {
      spiritStones: 65,
      contribution: 8,
      reputation: 2,
      items: [{ itemId: "spirit_herb", amount: 1 }],
    },
  },
  {
    id: "collect_miasma_flower",
    regionId: "south_ridge",
    title: "采瘴毒花",
    description: "巫妖盟药师需要新鲜瘴毒花炼制避瘴药。",
    requirementText: "交付 瘴毒花 x2",
    requiredItems: [{ itemId: "miasma_flower", amount: 2 }],
    rewards: {
      spiritStones: 180,
      contribution: 16,
      reputation: 4,
      items: [{ itemId: "healing_powder", amount: 1 }],
    },
  },
  {
    id: "purge_baicao_vines",
    regionId: "south_ridge",
    title: "清剿妖藤",
    description: "百草谷深处妖藤疯长，已经缠伤数名采药人。",
    requirementText: "交付 妖丹碎片 x1",
    requiredItems: [{ itemId: "demon_core_shard", amount: 1 }],
    rewards: {
      spiritStones: 220,
      contribution: 20,
      reputation: 5,
      items: [{ itemId: "spirit_herb", amount: 2 }],
    },
  },
  {
    id: "patrol_beast_mountain",
    regionId: "south_ridge",
    title: "巡查万妖山",
    description: "万妖山巡山兽躁动，巫妖盟需要外来修士探明兽群动向。",
    requirementText: "交付 妖兽骨 x2",
    requiredItems: [{ itemId: "beast_bone", amount: 2 }],
    rewards: {
      spiritStones: 260,
      contribution: 24,
      reputation: 6,
      items: [{ itemId: "demon_core_shard", amount: 1 }],
    },
  },
  {
    id: "investigate_tide_cave",
    regionId: "south_ridge",
    title: "探查潮音秘洞",
    description: "归潮礁岛潮音异常，海市散修怀疑秘洞守卫苏醒。",
    requirementText: "交付 潮生贝 x2",
    requiredItems: [{ itemId: "tide_shell", amount: 2 }],
    rewards: {
      spiritStones: 300,
      contribution: 28,
      reputation: 8,
      items: [{ itemId: "greenwood_essence", amount: 1 }],
    },
  },
];

export const regions: RegionNode[] = [
  {
    id: "central",
    name: "中州",
    eventPoolIds: ["central_spirit_stream"],
    locations: [
      {
        id: "qingyun_city",
        name: "青云城",
        type: "city",
        description: "中州东部的修士城池，坊市繁盛，青云宗在此设有接引处。",
        eventPoolIds: ["central_spirit_stream"],
        scenes: [
          {
            id: "city_manor",
            name: "城主府",
            type: "NPC 对话",
            description: "朱漆府门前悬着青云城令，城中执事在此处理商税、治安与修士纠纷。",
            actions: [
              {
                id: "manor_talk",
                label: "拜见城府执事",
                kind: "dialogue",
                text: "城府执事翻看名册：城中讲规矩，散修若要长住，最好先在任务榜立下功劳。",
              },
            ],
          },
          {
            id: "east_road",
            name: "城东大道",
            type: "NPC 对话",
            description: "青石大道直通城门，守城修士与宗门接引人在此核验来往散修的令牌。",
            actions: [
              {
                id: "guard_talk",
                label: "与守城修士交谈",
                kind: "dialogue",
                text: "守城修士打量你片刻：初入仙途，先去任务榜历练，若有青云令牌，可入宗门记名。",
              },
              {
                id: "join_qingyun",
                label: "递交青云令牌",
                kind: "joinSect",
              },
            ],
          },
          {
            id: "west_market",
            name: "城西坊市",
            type: "交易",
            description: "城西商贸区摊位沿街而立，丹药、材料和低阶法器都可在此购得。",
            actions: [{ id: "open_shop", label: "查看摊位", kind: "shop" }],
          },
          {
            id: "south_residence",
            name: "城南民居",
            type: "NPC 对话",
            description: "凡人与低阶散修混居于此，巷口茶棚常能听到黑风山与落霞镇的消息。",
            actions: [
              {
                id: "talk_wanderers",
                label: "听散修闲谈",
                kind: "dialogue",
                text: "一名青衣女修低声提醒：黑风山夜里有妖修出没，若无同伴，最好白日入山。",
              },
              {
                id: "invite_companion",
                label: "邀请顾青萝同行",
                kind: "recruitCompanion",
              },
            ],
          },
          {
            id: "north_board",
            name: "城北任务榜",
            type: "任务",
            description: "城北广场木榜上贴着宗门、城主府和商会发布的差事。",
            actions: [{ id: "open_tasks", label: "查看任务榜", kind: "taskBoard" }],
          },
        ],
      },
      {
        id: "tian_xuan_gate",
        name: "天玄城门",
        type: "city",
        description: "中州腹地新显露的巍峨城门，城墙阵纹如星轨交织，门内隐约可见繁盛长街。",
        scenes: [
          {
            id: "tian_xuan_gate",
            name: "天玄城门",
            type: "城门",
            imageKey: "tian_xuan_gate",
            description: "高阙压云，双旗临风，守门修士在阵纹下核验来往修士的令牌与来历。",
            hotspots: [
              {
                id: "shen_guanlan",
                label: "沈观澜",
                title: "城门登记修士",
                x: 22,
                y: 78,
                text: "沈观澜抬笔看你一眼：入天玄城，先登记道号、来处与所修功法。城中不问出身，但问是否守规矩。",
              },
              {
                id: "lu_xuanheng",
                label: "陆玄衡",
                title: "天玄守门修士",
                x: 76,
                y: 76,
                text: "陆玄衡按剑立在门侧：城门阵纹能照妖气，也能照杀意。若要入城，收敛锋芒，莫在长街动手。",
              },
            ],
            actions: [
              {
                id: "inspect_tian_xuan_gate",
                label: "查看城门",
                kind: "dialogue",
                text: "你驻足望向天玄城门，墙上阵纹缓缓流转，门内人声与车马声隔着灵光传来。",
              },
            ],
          },
        ],
      },
      {
        id: "black_wind_mountain",
        name: "黑风山",
        type: "wild",
        description: "山路狭窄，林间常有妖兽伏击，也有妖修借黑雾遮身。",
        scenes: [
          {
            id: "mountain_path",
            name: "山道",
            type: "野外",
            description: "山道两旁黑松低垂，风声像从石缝里挤出来。",
            actions: [
              {
                id: "black_wind_warning",
                label: "观察山势",
                kind: "dialogue",
                text: "你察觉林中有妖气残留，越往山腹走，伏击越多。",
              },
            ],
          },
          {
            id: "wolves",
            name: "山狼巢穴",
            type: "妖兽战斗",
            description: "碎骨散落在石缝间，狼嚎从雾中传来。",
            actions: [{ id: "fight_wolves", label: "迎战狼群", kind: "combat", targetId: "wolf_pack" }],
          },
          {
            id: "cultivators",
            name: "黑风营地",
            type: "修士战斗",
            description: "破旧旗幡下，妖修正在炼化妖骨。",
            actions: [{ id: "fight_cultivator", label: "讨伐妖修", kind: "combat", targetId: "black_wind_duo" }],
          },
        ],
      },
      {
        id: "herb_valley",
        name: "灵药谷",
        type: "wild",
        description: "谷中灵气湿润，凝气草沿溪生长，也吸引了护草妖兽。",
        scenes: [
          {
            id: "valley_entrance",
            name: "谷口",
            type: "野外",
            description: "谷口藤蔓垂落，水雾里混着草木灵气。",
            actions: [
              {
                id: "sense_valley",
                label: "感应灵气",
                kind: "dialogue",
                text: "你静心感应，发现溪流上游的凝气草长势最好。",
              },
            ],
          },
          {
            id: "gather_field",
            name: "凝气草田",
            type: "采集",
            description: "浅绿色灵草在水雾里舒展叶片。",
            actions: [
              {
                id: "gather_qi_grass",
                label: "采集凝气草",
                kind: "gather",
                rewards: {
                  items: [
                    { itemId: "qi_grass", amount: 1 },
                    { itemId: "spirit_herb", amount: 1 },
                  ],
                },
              },
            ],
          },
          {
            id: "herb_guard",
            name: "守草妖兽",
            type: "妖兽战斗",
            description: "一只妖兽盘踞草田深处，警惕所有靠近者。",
            actions: [{ id: "fight_herb_guard", label: "驱离妖兽", kind: "combat", targetId: "herb_guard" }],
          },
          {
            id: "pet_event",
            name: "溪边灵兽",
            type: "灵宠事件",
            description: "溪边有一只受伤的青羽狐，仍旧警惕地望着你。",
            actions: [{ id: "recruit_pet", label: "安抚青羽狐", kind: "recruitPet" }],
          },
        ],
      },
      {
        id: "ancient_cave",
        name: "古修洞府",
        type: "secret",
        description: "洞府石门半开，残阵仍在运转。",
        scenes: [
          {
            id: "stone_gate",
            name: "石门",
            type: "秘境入口",
            description: "半塌石门上留着古修刻痕，阵纹仍有微弱金光流转。",
            actions: [
              {
                id: "inspect_gate",
                label: "查看阵纹",
                kind: "dialogue",
                text: "阵纹残缺不全，但你能看出深处仍有守卫镇守。",
              },
            ],
          },
          {
            id: "guardian",
            name: "残阵守卫",
            type: "秘境战斗",
            description: "石卫在阵纹中苏醒，拦住去路。",
            actions: [{ id: "fight_cave", label: "挑战守卫", kind: "combat", targetId: "ancient_cave" }],
          },
          {
            id: "treasure",
            name: "残破丹室",
            type: "机缘",
            description: "丹室里留有几只封蜡玉瓶。",
            actions: [
              {
                id: "open_treasure",
                label: "搜寻丹室",
                kind: "treasure",
                rewards: {
                  spiritStones: 60,
                  items: [{ itemId: "foundation_pill", amount: 1 }],
                },
              },
            ],
          },
        ],
      },
      {
        id: "luoxia_town",
        name: "落霞镇",
        type: "town",
        description: "镇子依山而建，凡人与低阶修士混居。",
        scenes: [
          {
            id: "courier",
            name: "镇口驿亭",
            type: "任务",
            description: "驿亭执事负责接收宗门信笺。",
            actions: [
              {
                id: "finish_delivery",
                label: "拜访驿亭执事",
                kind: "dialogue",
                text: "执事接过信笺，向你道谢：青云宗弟子果然守信。",
              },
            ],
          },
          {
            id: "trade_road",
            name: "商道",
            type: "NPC 对话",
            description: "镇外商道通向青云城，车辙旁偶有妖兽爪痕。",
            actions: [
              {
                id: "talk_caravan",
                label: "询问商队",
                kind: "dialogue",
                text: "商队护卫说：若能清理黑风山妖兽，来往商路会安稳许多。",
              },
            ],
          },
          {
            id: "homes",
            name: "民居",
            type: "NPC 对话",
            description: "镇中民居低矮，屋檐挂着晒干的药草。",
            actions: [
              {
                id: "talk_resident",
                label: "拜访镇民",
                kind: "dialogue",
                text: "镇民递来一盏热茶，提醒你灵药谷近日有守草妖兽徘徊。",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "south_ridge",
    name: "南疆",
    eventPoolIds: ["south_miasma_turbulence"],
    locations: [
      {
        id: "wuyao_alliance",
        name: "巫妖盟",
        type: "city",
        description: "南疆诸部共立的盟城，巫祝、妖修和外来散修都在盟约规矩下往来。",
        scenes: [
          {
            id: "alliance_gate",
            name: "巫妖盟城门",
            type: "NPC 对话",
            description: "兽骨旌旗挂在高门两侧，守门妖修登记外来修士的来历与去向。",
            actions: [
              {
                id: "talk_alliance_guard",
                label: "询问南疆规矩",
                kind: "dialogue",
                text: "守门妖修沉声道：入南疆可历练，可交易，不可擅闯部族禁地，更不可私夺妖丹。",
              },
            ],
          },
          {
            id: "alliance_market",
            name: "盟城坊市",
            type: "交易",
            description: "巫药、妖骨、潮汐贝壳与低阶法器堆满石摊，摊主多半不问来路。",
            actions: [{ id: "open_nanjiang_market", label: "查看南疆摊位", kind: "shop" }],
          },
          {
            id: "alliance_board",
            name: "巫妖盟悬赏碑",
            type: "任务",
            description: "黑石悬赏碑上刻着采药、清剿妖藤、巡山和探查海洞的委托。",
            actions: [{ id: "open_nanjiang_tasks", label: "查看南疆悬赏", kind: "taskBoard" }],
          },
          {
            id: "envoy_house",
            name: "使者馆",
            type: "NPC 对话",
            description: "各地宗门使者暂居于此，青云宗的旧旗也挂在偏院廊下。",
            actions: [
              {
                id: "talk_qingyun_envoy",
                label: "拜访青云使者",
                kind: "dialogue",
                text: "青云使者提醒你：南疆不似中州，巫妖盟重契约，木灵宗重生机，行事切莫轻慢。",
              },
            ],
          },
          {
            id: "witch_stone_court",
            name: "巫祝石庭",
            type: "NPC 对话",
            description: "石庭中央立着刻满巫纹的古柱，巫祝在此记录妖族契约与盟城声望。",
            actions: [
              {
                id: "talk_witch_priest",
                label: "聆听巫祝告诫",
                kind: "dialogue",
                text: "巫祝抚过石柱：妖族守诺，也记仇。若你替南疆做事，日后自有石庭为你作证。",
              },
            ],
          },
        ],
      },
      {
        id: "wood_spirit_sect",
        name: "木灵宗",
        type: "city",
        description: "南疆大型宗门，主修草木、生机、灵植与藤木术法，宗门灵脉绵延入山。",
        scenes: [
          {
            id: "wood_gate",
            name: "木灵宗山门",
            type: "NPC 对话",
            description: "古木托起山门，藤桥横跨云雾，木灵宗弟子在树影间巡守。",
            actions: [
              {
                id: "talk_wood_gate",
                label: "询问木灵宗",
                kind: "dialogue",
                text: "山门弟子说：木灵宗不轻收外人，但愿与守护草木灵脉之修士结善缘。",
              },
            ],
          },
          {
            id: "vine_guest_platform",
            name: "青藤迎客台",
            type: "NPC 对话",
            description: "青藤织成的平台悬在林冠之间，外门执事在此接待散修与采药人。",
            actions: [
              {
                id: "talk_outer_deacon",
                label: "请教外门执事",
                kind: "dialogue",
                text: "外门执事指向百草谷：谷中妖藤近日躁动，若能平息，木灵宗会记下一分情面。",
              },
            ],
          },
          {
            id: "teaching_forest",
            name: "授法林",
            type: "功法预留",
            description: "林中木桩刻满木行术纹，弟子借风声与叶脉观摩术法流转。",
            actions: [
              {
                id: "watch_wood_spell",
                label: "观摩木行术",
                kind: "dialogue",
                text: "你观摩片刻，只觉藤木术法重在生机流转。真正参悟，还需后续功法系统开放。",
              },
            ],
          },
          {
            id: "spirit_wood_hall",
            name: "灵木殿",
            type: "交易",
            description: "殿内以灵木为柜，售卖草木灵材、基础丹药和少量青木灵液。",
            actions: [{ id: "open_wood_shop", label: "查看灵木殿", kind: "shop" }],
          },
          {
            id: "hundred_plants_garden",
            name: "百植园",
            type: "采集",
            description: "百植园中灵草按五行分垄而生，雾气里偶有青木灵液凝成露珠。",
            actions: [
              {
                id: "gather_hundred_plants",
                label: "采集百植园",
                kind: "gather",
                text: "你按执事所教采下灵草，叶脉中残留一线青木灵气。",
                rewards: {
                  items: [
                    { itemId: "spirit_herb", amount: 2 },
                    { itemId: "qi_grass", amount: 1 },
                    { itemId: "greenwood_essence", amount: 1 },
                  ],
                },
              },
            ],
          },
          {
            id: "root_archive",
            name: "藏根阁",
            type: "藏经预留",
            description: "古树根须垂入阁中，封存着木系功法、灵植札记与宗门旧约。",
            actions: [
              {
                id: "read_root_archive",
                label: "翻阅灵植札记",
                kind: "dialogue",
                text: "你只看得懂浅显札记：木法不争一时锋芒，胜在生生不息。",
              },
            ],
          },
          {
            id: "wood_trial",
            name: "试炼木阵",
            type: "宗门试炼",
            description: "藤木与木傀构成试炼阵，专门考验筑基前后修士的续航与破阵能力。",
            actions: [{ id: "fight_wood_trial", label: "挑战试炼木阵", kind: "combat", targetId: "wood_spirit_trial" }],
          },
        ],
      },
      {
        id: "baicao_valley",
        name: "百草谷",
        type: "wild",
        description: "南疆灵药汇聚之谷，浅滩灵雾常年不散，妖藤在深处疯长。",
        scenes: [
          {
            id: "vine_path",
            name: "谷口藤径",
            type: "野外",
            description: "藤蔓沿石径垂落，草木气息浓得几乎能拧出水来。",
            actions: [
              {
                id: "sense_baicao",
                label: "辨认药气",
                kind: "dialogue",
                text: "你分辨出灵草、凝气草与妖藤气息交织，越往深处越危险。",
              },
            ],
          },
          {
            id: "herb_shoal",
            name: "灵药浅滩",
            type: "采集",
            description: "浅滩水声细密，灵草在湿润泥土里成片生长。",
            actions: [
              {
                id: "gather_baicao_herbs",
                label: "采集灵药",
                kind: "gather",
                text: "你避开带刺藤蔓，采得一束带露灵草。",
                rewards: {
                  items: [
                    { itemId: "spirit_herb", amount: 2 },
                    { itemId: "qi_grass", amount: 1 },
                  ],
                },
              },
            ],
          },
          {
            id: "vine_depths",
            name: "妖藤深处",
            type: "妖兽战斗",
            description: "藤影层层合拢，根须像活物般探向脚踝。",
            actions: [{ id: "fight_baicao_vines", label: "斩断妖藤", kind: "combat", targetId: "baicao_vines" }],
          },
        ],
      },
      {
        id: "ten_thousand_beast_mountain",
        name: "万妖山",
        type: "wild",
        description: "山中妖气与灵气并生，巫妖盟巡山兽和野生妖族共同盘踞其间。",
        scenes: [
          {
            id: "beast_path",
            name: "山麓兽径",
            type: "野外",
            description: "兽径穿过山麓密林，树皮上留着深浅不一的爪痕。",
            actions: [
              {
                id: "read_beast_tracks",
                label: "查看兽径",
                kind: "dialogue",
                text: "你看出新旧兽痕交错，近日至少有一支巡山兽群经过此处。",
              },
            ],
          },
          {
            id: "beast_lair",
            name: "妖兽巢穴",
            type: "妖兽战斗",
            description: "乱石间腥风扑面，山魈的低吼从巢穴深处传来。",
            actions: [{ id: "fight_beast_patrol", label: "迎战巡山兽", kind: "combat", targetId: "beast_mountain_patrol" }],
          },
          {
            id: "pet_traces",
            name: "灵宠踪迹",
            type: "灵宠事件",
            description: "草叶间有细小灵爪印，似乎有温顺妖兽从此经过。",
            actions: [{ id: "comfort_green_fox", label: "追寻灵宠踪迹", kind: "recruitPet" }],
          },
        ],
      },
      {
        id: "miasma_marsh",
        name: "瘴雾沼泽",
        type: "wild",
        description: "沼泽瘴气常年不散，毒花与蛊虫共同构成南疆最危险的低阶资源地。",
        scenes: [
          {
            id: "miasma_shoal",
            name: "毒雾浅滩",
            type: "采集",
            description: "浅滩边瘴毒花开得妖艳，花心凝着一滴灰绿色毒露。",
            actions: [
              {
                id: "gather_miasma_flower",
                label: "采集瘴毒花",
                kind: "gather",
                text: "你屏息采下瘴毒花，指尖仍被毒雾熏得微微发麻。",
                rewards: { items: [{ itemId: "miasma_flower", amount: 2 }] },
              },
            ],
          },
          {
            id: "gu_nest",
            name: "蛊虫巢",
            type: "妖兽战斗",
            description: "沼泥鼓起细密气泡，成群蛊虫在毒雾里振翅。",
            actions: [{ id: "fight_miasma_gu", label: "清理蛊虫巢", kind: "combat", targetId: "miasma_gu_swarm" }],
          },
          {
            id: "sunken_wood_ruin",
            name: "沉木遗迹",
            type: "机缘",
            description: "半截沉木浮在沼中，树心处嵌着几枚旧时巫纹钱。",
            actions: [
              {
                id: "search_sunken_wood",
                label: "搜寻沉木遗迹",
                kind: "treasure",
                text: "你从沉木树心取出灵石与一片妖丹碎片。",
                rewards: {
                  spiritStones: 80,
                  items: [{ itemId: "demon_core_shard", amount: 1 }],
                },
              },
            ],
          },
        ],
      },
      {
        id: "thousand_falls_cliff",
        name: "千瀑灵崖",
        type: "secret",
        description: "万千瀑流自灵崖垂落，水雾中藏着青木水府与古旧木傀。",
        scenes: [
          {
            id: "falls_plank",
            name: "瀑下栈道",
            type: "秘境入口",
            description: "湿滑栈道贴着崖壁延伸，瀑声震得胸口发闷。",
            actions: [
              {
                id: "watch_falls",
                label: "观察灵瀑",
                kind: "dialogue",
                text: "你看见瀑后隐有青光浮动，似有阵法把水脉牵入洞天。",
              },
            ],
          },
          {
            id: "falls_cave",
            name: "灵瀑洞天",
            type: "秘境战斗",
            description: "洞天水汽凝成灵压，木傀从瀑雾中踏步而出。",
            actions: [{ id: "fight_waterfall_guard", label: "挑战灵瀑守卫", kind: "combat", targetId: "waterfall_guard" }],
          },
          {
            id: "greenwood_water_house",
            name: "青木水府",
            type: "机缘",
            description: "水府石台上凝着几滴青木灵液，像活物般映着瀑光。",
            actions: [
              {
                id: "collect_greenwood_water",
                label: "收取青木灵液",
                kind: "treasure",
                text: "你以玉瓶收下青木灵液，水府灵光随之暗去。",
                rewards: {
                  spiritStones: 90,
                  items: [{ itemId: "greenwood_essence", amount: 1 }],
                },
              },
            ],
          },
        ],
      },
      {
        id: "tide_market",
        name: "潮汐海市",
        type: "town",
        description: "潮水涨落间才显露的海边坊市，散修、海客和妖族商人都在此交易。",
        scenes: [
          {
            id: "sea_market_pier",
            name: "海市码头",
            type: "NPC 对话",
            description: "木桩码头随潮起伏，远处礁岛上的楼阁若隐若现。",
            actions: [
              {
                id: "talk_tide_boatman",
                label: "询问潮汐路",
                kind: "dialogue",
                text: "船夫提醒你：归潮礁岛需趁退潮登岸，潮音一起，秘洞守卫便会苏醒。",
              },
            ],
          },
          {
            id: "tide_bazaar",
            name: "潮汐坊市",
            type: "交易",
            description: "贝壳灯照着潮湿摊位，海客售卖潮生贝、丹药与南疆灵材。",
            actions: [{ id: "open_tide_market", label: "查看潮汐摊位", kind: "shop" }],
          },
          {
            id: "wanderer_inn",
            name: "散修客栈",
            type: "NPC 对话",
            description: "客栈一半架在海水上，散修们在此交换礁岛和水府传闻。",
            actions: [
              {
                id: "listen_tide_rumors",
                label: "听海客传闻",
                kind: "dialogue",
                text: "海客低声说：潮音秘洞里有潮生贝，也有守卫，莫贪多。",
              },
            ],
          },
        ],
      },
      {
        id: "returning_tide_reef",
        name: "归潮礁岛",
        type: "secret",
        description: "潮水环绕的礁岛秘境，潮音会扰乱神识，秘洞深处藏有沉珠宝匣。",
        scenes: [
          {
            id: "reef_shore",
            name: "礁岛外滩",
            type: "秘境入口",
            description: "白浪拍打礁石，潮线退去后露出通往秘洞的湿滑石阶。",
            actions: [
              {
                id: "watch_reef_tide",
                label: "等待退潮",
                kind: "dialogue",
                text: "你等到潮水暂退，听见洞中传来似钟似贝的低鸣。",
              },
            ],
          },
          {
            id: "tide_sound_cave",
            name: "潮音秘洞",
            type: "秘境战斗",
            description: "洞壁贝纹泛光，潮汐守卫沿着水痕缓缓结阵。",
            actions: [{ id: "fight_tide_guard", label: "挑战潮音守卫", kind: "combat", targetId: "tide_cave_guard" }],
          },
          {
            id: "sunken_pearl_chest",
            name: "沉珠宝匣",
            type: "机缘",
            description: "宝匣半埋在细沙中，匣缝里透出淡蓝潮光。",
            actions: [
              {
                id: "open_pearl_chest",
                label: "开启沉珠宝匣",
                kind: "treasure",
                text: "你打开宝匣，潮光散去，留下潮生贝与灵石。",
                rewards: {
                  spiritStones: 120,
                  items: [{ itemId: "tide_shell", amount: 2 }],
                },
              },
            ],
          },
        ],
      },
    ],
  },
];

export const emptyCost: Cost = {};

export function getRegion(regionId: string): RegionNode {
  return regions.find((region) => region.id === regionId) ?? regions[0];
}

export function getLocation(regionId: string, locationId: string): LocationNode {
  const region = getRegion(regionId);
  return region.locations.find((location) => location.id === locationId) ?? region.locations[0];
}

export function getScene(regionId: string, locationId: string, sceneId: string): SceneNode {
  const location = getLocation(regionId, locationId);
  return location.scenes.find((scene) => scene.id === sceneId) ?? location.scenes[0];
}
