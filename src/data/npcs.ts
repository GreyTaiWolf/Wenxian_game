import { getRealm, realms } from "./progression";
import { getWorldPoi, worldPois } from "./worldPois";
import type { NpcRuntimeState, NpcWorldState } from "../types";

export type NpcGroup = "resident" | "shop" | "task" | "roamer";
export type NpcGender = "female" | "male" | "unknown";
export type NpcActionKind = "chat" | "spar" | "shop" | "quest" | "gift" | "craftEquipment" | "reforgeEquipment";
export type NpcRelationKind = "family" | "mentor" | "sect" | "shop" | "friend" | "rival" | "debt" | "rumor";

export interface NpcActionConfig {
  id: string;
  label: string;
  kind: NpcActionKind;
  description?: string;
  text?: string;
  shopId?: string;
  workshopId?: string;
  disabled?: boolean;
}

export interface NpcConfig {
  id: string;
  name: string;
  title: string;
  gender: NpcGender;
  familyName?: string;
  force?: string;
  group: NpcGroup;
  fixed: boolean;
  homeLocationId: string;
  homeSceneId?: string;
  shopId?: string;
  taskIds?: string[];
  dialogue: string;
  actions: NpcActionConfig[];
  initialRealmId: string;
  growth: number;
  growthPerDay?: number;
  moveIntervalDays?: number;
  routePoiIds?: string[];
}

export interface NpcRelationConfig {
  id: string;
  fromNpcId: string;
  toNpcId: string;
  kind: NpcRelationKind;
  label: string;
  note: string;
}

export interface NpcRosterGroup {
  id: NpcGroup;
  label: string;
  npcs: NpcConfig[];
}

export const npcGroupLabels: Record<NpcGroup, string> = {
  resident: "常驻人物",
  shop: "店铺人物",
  task: "任务人物",
  roamer: "过路修士",
};

export const npcGroupOrder: NpcGroup[] = ["resident", "shop", "task", "roamer"];

export const roamingNpcGrowthPerDay = 3;
export const roamingNpcMoveIntervalDays = 2;

const qingyunRoamingRoute = ["qingyun_city", "herb_valley", "black_wind_mountain", "luoxia_town", "tian_xuan_gate"];

export const npcConfigs: NpcConfig[] = [
  {
    id: "qing_yu",
    name: "清雨",
    title: "小小仙铺掌柜",
    gender: "female",
    familyName: "清",
    force: "散修坊市",
    group: "shop",
    fixed: true,
    homeLocationId: "qingyun_city",
    homeSceneId: "xiaoxiao_shop",
    shopId: "xiaoxiao_shop",
    dialogue: "清雨把手中的玉简合上，笑道：小店东西杂，丹药、符纸、低阶法器都能凑齐。出镇前先把保命的备上。",
    actions: [
      {
        id: "qing_yu_chat",
        label: "聊天",
        kind: "chat",
        description: "问问仙铺近况",
        text: "清雨轻点货架：黑风山近来不太平，回春散走得快。你若要历练，别只想着省灵石。",
      },
      {
        id: "qing_yu_shop",
        label: "购买",
        kind: "shop",
        description: "杂货 / 丹药 / 法器",
        shopId: "xiaoxiao_shop",
        text: "清雨侧身让出货架：前期常用的东西都在这儿，按需拿。",
      },
      {
        id: "qing_yu_gift",
        label: "赠礼",
        kind: "gift",
        description: "关系系统预留",
        disabled: true,
        text: "清雨笑着摆手：等你常来小店，再谈人情往来不迟。",
      },
    ],
    initialRealmId: "qi_middle",
    growth: 220,
  },
  {
    id: "su_da",
    name: "苏达",
    title: "草药铺小童",
    gender: "male",
    familyName: "苏",
    force: "李百草草药铺",
    group: "shop",
    fixed: true,
    homeLocationId: "qingyun_city",
    homeSceneId: "li_baicao_herbs",
    shopId: "li_baicao_herbs",
    dialogue: "苏达把药杵放下，认真看了看你：客人若要买灵草、灵植或丹药，可以先问我。师父正在后柜配药。",
    actions: [
      {
        id: "su_da_chat",
        label: "聊天",
        kind: "chat",
        description: "问药草行情",
        text: "苏达压低声音：今日新到一批凝气草，叶尖还带露。若你常去灵药谷，师父也收新鲜灵草。",
      },
      {
        id: "su_da_shop",
        label: "购买",
        kind: "shop",
        description: "灵草 / 灵植 / 丹药",
        shopId: "li_baicao_herbs",
        text: "苏达指向右侧药柜：灵草、灵植、回春散都在柜上。",
      },
    ],
    initialRealmId: "qi_early",
    growth: 60,
  },
  {
    id: "zhao_tiejiang",
    name: "赵铁匠",
    title: "赵家炼器铺匠首",
    gender: "male",
    familyName: "赵",
    force: "赵家炼器铺",
    group: "shop",
    fixed: true,
    homeLocationId: "qingyun_city",
    homeSceneId: "zhao_refinery",
    shopId: "zhao_refinery",
    dialogue: "赵铁匠抬手压住炉火，火星映得眉骨发亮：剑不趁手，路上就少一分活路。看看铺里的成品吧。",
    actions: [
      {
        id: "zhao_tiejiang_chat",
        label: "聊天",
        kind: "chat",
        description: "问炼器近况",
        text: "赵铁匠敲了敲剑脊：黑风山矿脉有墨金，若能带回些许，我这炉火就能试新方。",
      },
      {
        id: "zhao_tiejiang_shop",
        label: "购买",
        kind: "shop",
        description: "武器 / 防具",
        shopId: "zhao_refinery",
        text: "赵铁匠把几柄低阶法剑推到柜前：先用得上，再谈趁不趁心。",
      },
      {
        id: "zhao_tiejiang_craft",
        label: "打造",
        kind: "craftEquipment",
        description: "消耗材料打造装备",
        workshopId: "zhao_refinery_workshop",
        text: "赵铁匠掀开炉盖：带够料，我就替你打一件能上路的家伙。",
      },
      {
        id: "zhao_tiejiang_reforge",
        label: "洗炼",
        kind: "reforgeEquipment",
        description: "锁定词条并重洗装备",
        workshopId: "zhao_refinery_workshop",
        text: "赵铁匠擦去砧台火灰：好词条可以留，想改命，就得再进一次火。",
      },
    ],
    initialRealmId: "qi_middle",
    growth: 260,
  },
  {
    id: "chen_banxian",
    name: "陈半仙",
    title: "散修相士",
    gender: "male",
    familyName: "陈",
    force: "青云镇散修",
    group: "resident",
    fixed: true,
    homeLocationId: "qingyun_city",
    homeSceneId: "chen_banxian_stall",
    dialogue: "陈半仙眯眼笑道：小友，我这摊上的残卷真假参半，修仙嘛，信则灵，不信也灵。",
    actions: [
      {
        id: "chen_banxian_chat",
        label: "问卦",
        kind: "chat",
        description: "听他讲传闻",
        text: "陈半仙捻须：镇外雾里常有陌生修士借路，有人求药，有人躲债，也有人在找青云旧令。",
      },
      {
        id: "chen_banxian_quest",
        label: "委托",
        kind: "quest",
        description: "查看任务榜",
        text: "陈半仙指向公告栏：真要有差事，先去那边挂名，免得功劳算不到你头上。",
      },
    ],
    initialRealmId: "qi_late",
    growth: 640,
  },
  {
    id: "li_baicao",
    name: "李百草",
    title: "草药铺主人",
    gender: "male",
    familyName: "李",
    force: "李百草草药铺",
    group: "shop",
    fixed: true,
    homeLocationId: "qingyun_city",
    homeSceneId: "li_baicao_herbs",
    shopId: "li_baicao_herbs",
    dialogue: "李百草从后柜挑帘出来，指尖还沾着药香：草木有时，药性有脉。买药可以，卖鲜草也可以。",
    actions: [
      {
        id: "li_baicao_chat",
        label: "请教",
        kind: "chat",
        description: "问灵药谷",
        text: "李百草说：灵药谷水气足，凝气草不难找，难的是别惊动护草妖兽。",
      },
      {
        id: "li_baicao_shop",
        label: "购买",
        kind: "shop",
        description: "草药铺货柜",
        shopId: "li_baicao_herbs",
        text: "李百草点了点柜台：药材标价都在签上，贵重丹药不赊账。",
      },
    ],
    initialRealmId: "qi_late",
    growth: 700,
  },
  {
    id: "city_manor_clerk",
    name: "罗执事",
    title: "城主府执事",
    gender: "male",
    familyName: "罗",
    force: "城主府",
    group: "task",
    fixed: true,
    homeLocationId: "qingyun_city",
    homeSceneId: "city_manor",
    taskIds: ["collect_qi_grass", "hunt_black_wind", "deliver_letter"],
    dialogue: "罗执事翻看镇中名册：散修若想在青云镇站稳脚，先从公告栏的小差事做起。",
    actions: [
      {
        id: "city_manor_clerk_chat",
        label: "请示",
        kind: "chat",
        description: "询问镇规",
        text: "罗执事说：镇内禁私斗，镇外凭本事。交任务记得带齐凭证。",
      },
      {
        id: "city_manor_clerk_tasks",
        label: "任务",
        kind: "quest",
        description: "打开任务榜",
        text: "罗执事将木牌推来：能做的差事都在这里，量力而行。",
      },
    ],
    initialRealmId: "qi_late",
    growth: 760,
  },
  {
    id: "qingyun_innkeeper",
    name: "云娘",
    title: "青云客栈老板娘",
    gender: "female",
    familyName: "云",
    force: "青云客栈",
    group: "resident",
    fixed: true,
    homeLocationId: "qingyun_city",
    homeSceneId: "qingyun_inn",
    dialogue: "云娘擦着柜台，眼里带笑：来往散修的脚步声，我隔着半条街都听得出。想打听山路消息，就坐一会儿。",
    actions: [
      {
        id: "qingyun_innkeeper_chat",
        label: "打听",
        kind: "chat",
        description: "问镇外传闻",
        text: "云娘说：黑风山的风这两日不对，若要去，记得多带回春散。",
      },
      {
        id: "qingyun_innkeeper_quest",
        label: "委托",
        kind: "quest",
        description: "查看客栈差事",
        text: "云娘把一张纸条压在柜上：客栈也会收些跑腿活，先去任务榜登记。",
      },
    ],
    initialRealmId: "qi_middle",
    growth: 340,
  },
  {
    id: "gu_qingluo",
    name: "顾青萝",
    title: "青云客栈游历女修",
    gender: "female",
    familyName: "顾",
    force: "散修",
    group: "resident",
    fixed: true,
    homeLocationId: "qingyun_city",
    homeSceneId: "qingyun_inn",
    dialogue: "顾青萝倚在窗边，剑穗随风轻晃：我暂住青云客栈，等黑风山的雾散些再走。",
    actions: [
      {
        id: "gu_qingluo_chat",
        label: "闲谈",
        kind: "chat",
        description: "聊游历见闻",
        text: "顾青萝说：散修走远路，靠的不只是修为。路上认得几张脸，有时比一柄剑更管用。",
      },
      {
        id: "gu_qingluo_spar",
        label: "切磋",
        kind: "spar",
        description: "陪练预留",
        disabled: true,
        text: "顾青萝按住剑柄：等你气息再稳些，我陪你走两招。",
      },
    ],
    initialRealmId: "qi_late",
    growth: 560,
  },
  {
    id: "han_muye",
    name: "韩牧野",
    title: "背剑散修",
    gender: "male",
    familyName: "韩",
    force: "韩家旁支",
    group: "roamer",
    fixed: false,
    homeLocationId: "qingyun_city",
    dialogue: "韩牧野背着一柄旧剑，衣摆沾着山尘：我从黑风山那边回来，路上见过几处新兽迹。",
    actions: [
      { id: "han_muye_chat", label: "请教", kind: "chat", description: "问山路", text: "韩牧野说：山狼怕火，妖修怕人多。独行时，别追太深。" },
    ],
    initialRealmId: "qi_early",
    growth: 80,
    routePoiIds: qingyunRoamingRoute,
  },
  {
    id: "lin_shuyu",
    name: "林书雨",
    title: "符箓学徒",
    gender: "female",
    familyName: "林",
    force: "林家符铺",
    group: "roamer",
    fixed: false,
    homeLocationId: "qingyun_city",
    dialogue: "林书雨抱着一卷符纸，指尖还残留朱砂气息：我跟着商队走，顺便练练识路。",
    actions: [
      { id: "lin_shuyu_chat", label: "闲谈", kind: "chat", description: "问符纸", text: "林书雨说：符箓最怕潮，进山前记得包好。湿了就只剩纸钱的用处。" },
    ],
    initialRealmId: "qi_early",
    growth: 70,
    routePoiIds: qingyunRoamingRoute,
  },
  {
    id: "xu_qianfan",
    name: "许千帆",
    title: "商队护卫",
    gender: "male",
    familyName: "许",
    force: "落霞商队",
    group: "roamer",
    fixed: false,
    homeLocationId: "luoxia_town",
    dialogue: "许千帆把护臂扣紧：青云镇和落霞镇之间的路我熟，熟归熟，夜里也不走。",
    actions: [
      { id: "xu_qianfan_chat", label: "询路", kind: "chat", description: "问商道", text: "许千帆说：走商路别贪近道，近道常常是妖兽替你挑的。" },
    ],
    initialRealmId: "qi_middle",
    growth: 240,
    routePoiIds: ["luoxia_town", "qingyun_city", "black_wind_mountain", "tian_xuan_gate"],
  },
  {
    id: "bai_zhihe",
    name: "白芷荷",
    title: "采药女修",
    gender: "female",
    familyName: "白",
    force: "白家药圃",
    group: "roamer",
    fixed: false,
    homeLocationId: "herb_valley",
    dialogue: "白芷荷把竹篓护在身侧：灵药谷的草不能乱拔，拔错一株，整片药气都会乱。",
    actions: [
      { id: "bai_zhihe_chat", label: "问药", kind: "chat", description: "问药草", text: "白芷荷说：凝气草叶背有细纹，月光下像水线。认准再采。" },
    ],
    initialRealmId: "qi_early",
    growth: 100,
    routePoiIds: ["herb_valley", "qingyun_city", "luoxia_town"],
  },
  {
    id: "mo_xiaolou",
    name: "莫小楼",
    title: "走镖少年",
    gender: "male",
    familyName: "莫",
    force: "落霞镖局",
    group: "roamer",
    fixed: false,
    homeLocationId: "qingyun_city",
    dialogue: "莫小楼把短棍横在肩上，笑得有些爽朗：路远不怕，就怕路上没人说话。",
    actions: [
      { id: "mo_xiaolou_chat", label: "聊天", kind: "chat", description: "听路上趣事", text: "莫小楼说：我见过有人把妖狼当狗哄，后来跑得比我还快。" },
    ],
    initialRealmId: "qi_early",
    growth: 50,
    routePoiIds: qingyunRoamingRoute,
  },
  {
    id: "tang_yan",
    name: "唐砚",
    title: "丹炉客卿",
    gender: "male",
    familyName: "唐",
    force: "唐氏丹房",
    group: "roamer",
    fixed: false,
    homeLocationId: "tian_xuan_gate",
    dialogue: "唐砚袖中隐有药香，语气温和：路过青云镇，正想看看此地灵草品相。",
    actions: [
      { id: "tang_yan_chat", label: "请教", kind: "chat", description: "问丹药", text: "唐砚说：丹药能救急，也会让人误判自己的底气。别把药当命。" },
    ],
    initialRealmId: "qi_middle",
    growth: 300,
    routePoiIds: ["tian_xuan_gate", "qingyun_city", "herb_valley", "luoxia_town"],
  },
  {
    id: "ye_lingzhou",
    name: "叶灵舟",
    title: "云游阵修",
    gender: "female",
    familyName: "叶",
    force: "叶家阵堂",
    group: "roamer",
    fixed: false,
    homeLocationId: "qingyun_city",
    dialogue: "叶灵舟蹲在路边看阵纹，像是在听石板下的水声：这镇子的灵脉走向很干净。",
    actions: [
      { id: "ye_lingzhou_chat", label: "请教", kind: "chat", description: "问阵纹", text: "叶灵舟说：阵法和道路一样，走得多了，就知道哪里会断。" },
    ],
    initialRealmId: "qi_middle",
    growth: 260,
    routePoiIds: qingyunRoamingRoute,
  },
  {
    id: "shen_wanqing",
    name: "沈晚晴",
    title: "天玄城书吏",
    gender: "female",
    familyName: "沈",
    force: "天玄城",
    group: "roamer",
    fixed: false,
    homeLocationId: "tian_xuan_gate",
    dialogue: "沈晚晴收起通关文书：天玄城最近查得严，我来青云镇核几份旧籍。",
    actions: [
      { id: "shen_wanqing_chat", label: "询问", kind: "chat", description: "问天玄城", text: "沈晚晴说：入城不难，难的是别让自己的来历前后对不上。" },
    ],
    initialRealmId: "qi_middle",
    growth: 280,
    routePoiIds: ["tian_xuan_gate", "qingyun_city", "luoxia_town"],
  },
];

export const npcRelations: NpcRelationConfig[] = [
  {
    id: "li_baicao_su_da_master",
    fromNpcId: "li_baicao",
    toNpcId: "su_da",
    kind: "mentor",
    label: "师徒",
    note: "李百草收苏达为药铺学徒，先教认药和守炉。",
  },
  {
    id: "su_da_li_baicao_apprentice",
    fromNpcId: "su_da",
    toNpcId: "li_baicao",
    kind: "mentor",
    label: "师父",
    note: "苏达敬畏李百草，常替师父看顾前柜。",
  },
  {
    id: "qing_yu_zhao_tiejiang_trade",
    fromNpcId: "qing_yu",
    toNpcId: "zhao_tiejiang",
    kind: "shop",
    label: "供货",
    note: "小小仙铺偶尔从赵家炼器铺代售低阶法器。",
  },
  {
    id: "zhao_tiejiang_qing_yu_account",
    fromNpcId: "zhao_tiejiang",
    toNpcId: "qing_yu",
    kind: "debt",
    label: "账目",
    note: "赵铁匠有几笔代售账挂在小小仙铺，嘴上说不急，账本记得很清。",
  },
  {
    id: "chen_banxian_gu_qingluo_rumor",
    fromNpcId: "chen_banxian",
    toNpcId: "gu_qingluo",
    kind: "rumor",
    label: "传闻",
    note: "陈半仙声称顾青萝身上有旧剑运，却总被顾青萝当成胡话。",
  },
  {
    id: "gu_qingluo_qingyun_innkeeper_friend",
    fromNpcId: "gu_qingluo",
    toNpcId: "qingyun_innkeeper",
    kind: "friend",
    label: "熟客",
    note: "顾青萝暂住青云客栈，常帮云娘拦下醉酒闹事的散修。",
  },
  {
    id: "city_manor_clerk_qing_yu_town",
    fromNpcId: "city_manor_clerk",
    toNpcId: "qing_yu",
    kind: "sect",
    label: "镇务",
    note: "城主府会向小小仙铺核对外来修士采购和任务交付传闻。",
  },
  {
    id: "han_lin_companion",
    fromNpcId: "han_muye",
    toNpcId: "lin_shuyu",
    kind: "friend",
    label: "同行",
    note: "韩牧野和林书雨偶尔结伴走青云镇到落霞镇的商道。",
  },
  {
    id: "xu_mo_rival",
    fromNpcId: "xu_qianfan",
    toNpcId: "mo_xiaolou",
    kind: "rival",
    label: "较劲",
    note: "许千帆嫌莫小楼走路太吵，莫小楼嫌许千帆太像账房。",
  },
  {
    id: "bai_tang_medicine",
    fromNpcId: "bai_zhihe",
    toNpcId: "tang_yan",
    kind: "shop",
    label: "药材",
    note: "白芷荷采药，唐砚炼丹，两人常因药价讨价还价。",
  },
];

export const defaultRoamingNpcIds = npcConfigs.filter((npc) => !npc.fixed).map((npc) => npc.id);

export function getNpc(npcId: string | null | undefined): NpcConfig | null {
  return npcConfigs.find((npc) => npc.id === npcId) ?? null;
}

export function getNpcRelations(npcId: string): NpcRelationConfig[] {
  return npcRelations.filter((relation) => relation.fromNpcId === npcId || relation.toNpcId === npcId);
}

export function getNpcsForLocation(locationId: string, worldState?: NpcWorldState): NpcConfig[] {
  return npcConfigs.filter((npc) => {
    if (npc.fixed) {
      return npc.homeLocationId === locationId;
    }
    const runtime = worldState?.actors[npc.id];
    return (runtime?.locationId ?? npc.homeLocationId) === locationId;
  });
}

export function getNpcRosterGroups(locationId: string, worldState?: NpcWorldState): NpcRosterGroup[] {
  const npcs = getNpcsForLocation(locationId, worldState);
  return npcGroupOrder.map((groupId) => ({
    id: groupId,
    label: npcGroupLabels[groupId],
    npcs: npcs.filter((npc) => npc.group === groupId),
  }));
}

export function getNpcRuntime(npcId: string, worldState?: NpcWorldState): NpcRuntimeState | null {
  const config = getNpc(npcId);
  if (!config || config.fixed) {
    return null;
  }
  return worldState?.actors[npcId] ?? createDefaultNpcRuntime(config, 0);
}

export function formatNpcRealm(npc: NpcConfig, worldState?: NpcWorldState): string {
  const runtime = getNpcRuntime(npc.id, worldState);
  return getRealm(runtime?.realmId ?? npc.initialRealmId).name;
}

export function formatNpcLocation(npc: NpcConfig, worldState?: NpcWorldState): string {
  const runtime = getNpcRuntime(npc.id, worldState);
  const poi = getWorldPoi(runtime?.poiId ?? npc.homeLocationId);
  return poi?.name ?? npc.homeLocationId;
}

export function createDefaultNpcWorldState(dayIndex = 0): NpcWorldState {
  return {
    actors: Object.fromEntries(npcConfigs.filter((npc) => !npc.fixed).map((npc) => [npc.id, createDefaultNpcRuntime(npc, dayIndex)])),
  };
}

export function normalizeNpcWorldState(input: unknown, dayIndex = 0): NpcWorldState {
  const defaults = createDefaultNpcWorldState(dayIndex);
  if (!input || typeof input !== "object") {
    return defaults;
  }
  const rawActors = "actors" in input ? (input as { actors?: unknown }).actors : undefined;
  if (!rawActors || typeof rawActors !== "object") {
    return defaults;
  }
  return {
    actors: Object.fromEntries(
      npcConfigs
        .filter((npc) => !npc.fixed)
        .map((npc) => {
          const source = (rawActors as Record<string, Partial<NpcRuntimeState> | undefined>)[npc.id];
          return [npc.id, normalizeNpcRuntime(npc, source, defaults.actors[npc.id], dayIndex)];
        }),
    ),
  };
}

export function advanceNpcWorldState(input: unknown, dayIndex: number): NpcWorldState {
  const normalized = normalizeNpcWorldState(input, dayIndex);
  return {
    actors: Object.fromEntries(
      npcConfigs
        .filter((npc) => !npc.fixed)
        .map((npc) => [npc.id, advanceNpcRuntime(npc, normalized.actors[npc.id], dayIndex)]),
    ),
  };
}

function createDefaultNpcRuntime(npc: NpcConfig, dayIndex: number): NpcRuntimeState {
  const route = getNpcRoute(npc);
  const poiId = route[0] ?? npc.homeLocationId;
  return {
    npcId: npc.id,
    mapId: "world",
    locationId: getLocationIdByPoiId(poiId),
    poiId,
    realmId: npc.initialRealmId,
    growth: npc.growth,
    lastUpdatedDayIndex: dayIndex,
    targetPoiId: route[1] ?? poiId,
    taskSeed: `${npc.id}_${dayIndex}`,
  };
}

function normalizeNpcRuntime(
  npc: NpcConfig,
  source: Partial<NpcRuntimeState> | undefined,
  fallback: NpcRuntimeState,
  dayIndex: number,
): NpcRuntimeState {
  const route = getNpcRoute(npc);
  const sourcePoiId = typeof source?.poiId === "string" && route.includes(source.poiId) ? source.poiId : fallback.poiId;
  const sourceGrowth = toFiniteNumber(source?.growth, fallback.growth);
  const realmId = isValidRealmId(source?.realmId) ? String(source?.realmId) : getRealmIdForGrowth(sourceGrowth, npc.initialRealmId);
  const targetPoiId = typeof source?.targetPoiId === "string" && route.includes(source.targetPoiId) ? source.targetPoiId : getNextRoutePoiId(route, sourcePoiId);
  return {
    npcId: npc.id,
    mapId: typeof source?.mapId === "string" ? source.mapId : fallback.mapId,
    locationId: getLocationIdByPoiId(sourcePoiId),
    poiId: sourcePoiId,
    realmId,
    growth: sourceGrowth,
    lastUpdatedDayIndex: Math.max(0, Math.floor(toFiniteNumber(source?.lastUpdatedDayIndex, dayIndex))),
    targetPoiId,
    taskSeed: typeof source?.taskSeed === "string" ? source.taskSeed : fallback.taskSeed,
  };
}

function advanceNpcRuntime(npc: NpcConfig, runtime: NpcRuntimeState, dayIndex: number): NpcRuntimeState {
  const elapsedDays = Math.max(0, dayIndex - runtime.lastUpdatedDayIndex);
  if (elapsedDays <= 0) {
    return runtime;
  }
  const route = getNpcRoute(npc);
  const moveInterval = npc.moveIntervalDays ?? roamingNpcMoveIntervalDays;
  const moveSteps = moveInterval > 0 ? Math.floor(elapsedDays / moveInterval) : 0;
  const nextPoiId = moveSteps > 0 ? getAdvancedRoutePoiId(route, runtime.poiId, moveSteps) : runtime.poiId;
  const nextGrowth = runtime.growth + elapsedDays * (npc.growthPerDay ?? roamingNpcGrowthPerDay);
  return {
    ...runtime,
    locationId: getLocationIdByPoiId(nextPoiId),
    poiId: nextPoiId,
    realmId: getRealmIdForGrowth(nextGrowth, npc.initialRealmId),
    growth: nextGrowth,
    lastUpdatedDayIndex: dayIndex,
    targetPoiId: getNextRoutePoiId(route, nextPoiId),
    taskSeed: `${npc.id}_${Math.floor(dayIndex / 5)}`,
  };
}

function getNpcRoute(npc: NpcConfig): string[] {
  return npc.routePoiIds?.length ? npc.routePoiIds : [npc.homeLocationId];
}

function getAdvancedRoutePoiId(route: string[], currentPoiId: string, steps: number): string {
  if (route.length === 0) {
    return currentPoiId;
  }
  const currentIndex = Math.max(0, route.indexOf(currentPoiId));
  return route[(currentIndex + steps) % route.length];
}

function getNextRoutePoiId(route: string[], currentPoiId: string): string {
  return getAdvancedRoutePoiId(route, currentPoiId, 1);
}

function getLocationIdByPoiId(poiId: string): string {
  return getWorldPoi(poiId)?.locationId ?? poiId;
}

function getRealmIdForGrowth(growth: number, fallbackRealmId: string): string {
  const growthStages = [
    { growth: 0, realmId: "qi_early" },
    { growth: 180, realmId: "qi_middle" },
    { growth: 520, realmId: "qi_late" },
    { growth: 980, realmId: "qi_peak" },
    { growth: 1680, realmId: "foundation_early" },
  ];
  const fallbackIndex = realms.findIndex((realm) => realm.id === fallbackRealmId);
  const matchedRealmId = growthStages.reduce((current, stage) => (growth >= stage.growth ? stage.realmId : current), growthStages[0].realmId);
  const matchedIndex = realms.findIndex((realm) => realm.id === matchedRealmId);
  if (fallbackIndex > matchedIndex) {
    return fallbackRealmId;
  }
  return matchedRealmId;
}

function isValidRealmId(value: unknown): boolean {
  return typeof value === "string" && realms.some((realm) => realm.id === value);
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export function getRoamingPoiOptions(): string[] {
  return worldPois.filter((poi) => poi.locationId).map((poi) => poi.id);
}
