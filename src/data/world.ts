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

export interface LocationSceneHotspot {
  id: string;
  label: string;
  sceneId: string;
  x: number;
  y: number;
  title?: string;
}

export interface LocationSceneBlockedRect {
  x: number;
  y: number;
  width: number;
  height: number;
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
  id: string;
  name: string;
  type: "city" | "town" | "wild" | "secret";
  description: string;
  sceneMapImageKey?: string;
  sceneMapHotspots?: LocationSceneHotspot[];
  sceneMapBlockedRects?: LocationSceneBlockedRect[];
  scenes: SceneNode[];
}

export interface RegionNode {
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
    locations: [
      {
        id: "qingyun_city",
        name: "青云镇",
        type: "city",
        description: "中州东部依青云宗灵脉而兴的修士镇，铺坊、客栈、公告栏与灵田沿主街展开。",
        sceneMapImageKey: "qingyun_town",
        sceneMapHotspots: [
          { id: "qingyun_shop_marker", label: "小小仙铺", sceneId: "xiaoxiao_shop", x: 48.81, y: 36.96, title: "杂货" },
          { id: "zhao_refinery_marker", label: "赵家炼器铺", sceneId: "zhao_refinery", x: 53.57, y: 58.7, title: "炼器" },
          { id: "chen_banxian_marker", label: "陈半仙", sceneId: "chen_banxian_stall", x: 41.67, y: 54.35, title: "秘籍摊" },
          { id: "li_baicao_marker", label: "李百草", sceneId: "li_baicao_herbs", x: 29.76, y: 50, title: "草药铺" },
          { id: "city_manor_marker", label: "城主府", sceneId: "city_manor", x: 60, y: 39, title: "府衙" },
          { id: "notice_board_marker", label: "公告栏", sceneId: "notice_board", x: 63.1, y: 23.91, title: "任务" },
          { id: "qingyun_inn_marker", label: "青云客栈", sceneId: "qingyun_inn", x: 72.62, y: 50, title: "客栈" },
          { id: "inn_spirit_field_marker", label: "灵田", sceneId: "inn_spirit_field", x: 79.76, y: 54.35, title: "客栈灵田" },
        ],
        scenes: [
          {
            id: "city_manor",
            name: "城主府",
            type: "NPC 对话",
            description: "朱漆府门前悬着青云镇令，镇中执事在此处理商税、治安与修士纠纷。",
            actions: [
              {
                id: "manor_talk",
                label: "拜见城府执事",
                kind: "dialogue",
                text: "城府执事翻看名册：镇中讲规矩，散修若要长住，最好先在公告栏立下功劳。",
              },
              {
                id: "join_qingyun",
                label: "递交青云令牌",
                kind: "joinSect",
              },
            ],
          },
          {
            id: "xiaoxiao_shop",
            name: "小小仙铺",
            type: "交易",
            description: "门脸不大，货架却塞满符纸、丹药、针线包和低阶修士最常用的杂物。",
            actions: [
              {
                id: "open_xiaoxiao_shop",
                label: "查看仙铺货架",
                kind: "shop",
              },
            ],
          },
          {
            id: "zhao_refinery",
            name: "赵家炼器铺",
            type: "交易",
            description: "铺内炉火不熄，赵家匠师常替散修修补兵刃，也售卖几柄低阶法剑。",
            actions: [{ id: "open_zhao_refinery", label: "查看炼器货架", kind: "shop" }],
          },
          {
            id: "chen_banxian_stall",
            name: "陈半仙",
            type: "NPC 对话",
            description: "一个白胡子老头坐在旧幡下，摊前摆着手抄秘籍、残卷和几本真假难辨的奇书。",
            actions: [
              {
                id: "talk_chen_banxian",
                label: "翻看秘籍摊",
                kind: "dialogue",
                text: "陈半仙眯眼笑道：小友，我这本《三息登仙诀》只卖十块灵石。是真是假？修仙嘛，信则灵，不信也灵。",
              },
            ],
          },
          {
            id: "li_baicao_herbs",
            name: "李百草",
            type: "交易",
            imageKey: "li_baicao_herbs",
            description: "草药铺外晾着新采灵草，李百草熟知山间药性，也常收购凝气草。",
            actions: [{ id: "open_li_baicao_shop", label: "查看草药柜", kind: "shop" }],
          },
          {
            id: "notice_board",
            name: "公告栏",
            type: "任务",
            description: "木榜上贴着城主府、青云宗和商会发布的差事，纸角被风吹得哗哗作响。",
            actions: [{ id: "open_tasks", label: "查看公告栏", kind: "taskBoard" }],
          },
          {
            id: "qingyun_inn",
            name: "青云客栈",
            type: "NPC 对话",
            description: "客栈门口酒旗轻晃，老板娘消息灵通，来往散修常在此交换山路传闻。",
            actions: [
              {
                id: "talk_innkeeper",
                label: "向老板娘打听消息",
                kind: "dialogue",
                text: "客栈老板娘擦着柜台：黑风山的风这两日不对，若要去，记得多带回春散。后院那片灵田也要人帮忙看着。",
              },
              {
                id: "invite_companion",
                label: "邀请顾青萝同行",
                kind: "recruitCompanion",
              },
            ],
          },
          {
            id: "inn_spirit_field",
            name: "灵田",
            type: "NPC 对话",
            description: "青云客栈老板娘在镇内托人照看的小灵田，田埂间能见到几株刚冒尖的灵草。",
            actions: [
              {
                id: "inspect_inn_spirit_field",
                label: "查看灵田",
                kind: "dialogue",
                text: "灵田泥土湿润，阵旗只压住一小片灵气。老板娘说等田势稳了，再让熟客帮忙采药。",
              },
            ],
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
        sceneMapImageKey: "black_wind_mountain",
        sceneMapHotspots: [
          { id: "black_spirit_spring_marker", label: "黑灵泉", sceneId: "black_spirit_spring", x: 48.81, y: 45.65, title: "灵泉" },
          { id: "mojin_cave_marker", label: "墨金洞", sceneId: "mojin_cave", x: 79.76, y: 76.09, title: "洞窟" },
          { id: "black_wind_demon_stockade_marker", label: "黑风妖寨", sceneId: "black_wind_demon_stockade", x: 84.52, y: 45.65, title: "妖寨" },
        ],
        sceneMapBlockedRects: [
          { x: 0, y: 0, width: 5, height: 23 },
          { x: 5, y: 0, width: 8, height: 4 },
          { x: 13, y: 0, width: 5, height: 2 },
          { x: 22, y: 0, width: 11, height: 7 },
          { x: 34, y: 0, width: 8, height: 6 },
          { x: 0, y: 9, width: 7, height: 5 },
          { x: 10, y: 8, width: 6, height: 6 },
          { x: 24, y: 7, width: 7, height: 2 },
          { x: 28, y: 9, width: 3, height: 5 },
          { x: 38, y: 8, width: 4, height: 5 },
          { x: 0, y: 17, width: 13, height: 6 },
          { x: 15, y: 14, width: 7, height: 9 },
          { x: 22, y: 18, width: 6, height: 5 },
          { x: 30, y: 18, width: 12, height: 5 },
        ],
        scenes: [
          {
            id: "black_spirit_spring",
            name: "黑灵泉",
            type: "灵泉",
            description: "石台中央的泉水泛着冷青灵光，黑雾贴着水面游走，像在吞吐山腹灵气。",
            actions: [
              {
                id: "inspect_black_spirit_spring",
                label: "探查黑灵泉",
                kind: "dialogue",
                text: "泉眼灵气清冷，却混着淡淡妖煞。你暂且记下此处，等修为更稳再深入汲取。",
              },
            ],
          },
          {
            id: "mojin_cave",
            name: "墨金洞",
            type: "洞窟战斗",
            description: "洞口石阶湿冷，黑金色矿脉在雾里若隐若现，洞内传来山狼低吼。",
            actions: [{ id: "fight_mojin_cave_wolves", label: "清剿洞中妖狼", kind: "combat", targetId: "wolf_pack" }],
          },
          {
            id: "black_wind_demon_stockade",
            name: "黑风妖寨",
            type: "妖修战斗",
            description: "乱木搭成的妖寨插满破旗，火堆边有妖修巡守，黑风绕寨不散。",
            actions: [{ id: "fight_black_wind_stockade", label: "攻入黑风妖寨", kind: "combat", targetId: "black_wind_duo" }],
          },
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
            description: "镇外商道通向青云镇，车辙旁偶有妖兽爪痕。",
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
