import type { PrimaryModule } from "../types";

export type MainQuestStageId =
  | "awaken_and_cultivate"
  | "accept_herb_commission"
  | "gather_qi_grass"
  | "turn_in_herb_commission"
  | "accept_black_wind_commission"
  | "hunt_black_wind"
  | "turn_in_black_wind_commission"
  | "breakthrough_qi_middle"
  | "explore_ancient_cave"
  | "join_qingyun_sect"
  | "reach_foundation"
  | "enter_south_ridge"
  | "establish_south_ridge"
  | "current_version_complete";

export interface MainQuestStageDefinition {
  id: MainQuestStageId;
  chapter: string;
  title: string;
  summary: string;
  destination: string;
  action: string;
  reward: string;
  module: PrimaryModule;
  ctaLabel: string;
}

export const mainQuestStageOrder: MainQuestStageId[] = [
  "awaken_and_cultivate",
  "accept_herb_commission",
  "gather_qi_grass",
  "turn_in_herb_commission",
  "accept_black_wind_commission",
  "hunt_black_wind",
  "turn_in_black_wind_commission",
  "breakthrough_qi_middle",
  "explore_ancient_cave",
  "join_qingyun_sect",
  "reach_foundation",
  "enter_south_ridge",
  "establish_south_ridge",
];

export const mainQuestStages: Record<MainQuestStageId, MainQuestStageDefinition> = {
  awaken_and_cultivate: {
    id: "awaken_and_cultivate",
    chapter: "第一章 · 初入仙途",
    title: "引气入体",
    summary: "先完成一次聚气，熟悉修为增长与境界突破的基础节奏。",
    destination: "修炼 · 聚气",
    action: "点击聚气球完成一次周天运转。",
    reward: "开启中州新手历练路线",
    module: "cultivation",
    ctaLabel: "前往修炼",
  },
  accept_herb_commission: {
    id: "accept_herb_commission",
    chapter: "第一章 · 初入仙途",
    title: "城北初领差事",
    summary: "前往青云城城北任务榜，接取《采集凝气草》。",
    destination: "中州 · 青云城 · 城北任务榜",
    action: "打开任务榜并接取采集委托。",
    reward: "90 灵石、12 宗门贡献、3 声望",
    module: "explore",
    ctaLabel: "打开历练",
  },
  gather_qi_grass: {
    id: "gather_qi_grass",
    chapter: "第一章 · 初入仙途",
    title: "灵药谷采药",
    summary: "凝气草既是任务物品，也是炼气阶段突破所需的基础资源。",
    destination: "中州 · 灵药谷 · 凝气草田",
    action: "采集凝气草，累计至少 2 株；可在背包查看所得材料。",
    reward: "凝气草、灵草与任务完成条件",
    module: "explore",
    ctaLabel: "前往历练",
  },
  turn_in_herb_commission: {
    id: "turn_in_herb_commission",
    chapter: "第一章 · 初入仙途",
    title: "交付凝气草",
    summary: "返回任务榜交付材料，获得第一笔稳定成长资源。",
    destination: "中州 · 青云城 · 城北任务榜",
    action: "在《采集凝气草》任务上点击完成。",
    reward: "90 灵石、12 宗门贡献、3 声望",
    module: "explore",
    ctaLabel: "返回任务榜",
  },
  accept_black_wind_commission: {
    id: "accept_black_wind_commission",
    chapter: "第二章 · 山中试锋",
    title: "接取黑风讨伐",
    summary: "接下《讨伐黑风山妖兽》，准备完成第一次资源型战斗。",
    destination: "中州 · 青云城 · 城北任务榜",
    action: "接取黑风山讨伐委托。",
    reward: "120 灵石、18 宗门贡献、5 声望",
    module: "explore",
    ctaLabel: "打开任务榜",
  },
  hunt_black_wind: {
    id: "hunt_black_wind",
    chapter: "第二章 · 山中试锋",
    title: "黑风山试炼",
    summary: "击败山狼或黑风妖修，收集一份妖兽骨并熟悉回合制战斗。",
    destination: "中州 · 黑风山 · 山狼巢穴/黑风营地",
    action: "进入战斗并取得妖兽骨 x1。",
    reward: "灵石、修为、妖兽骨与装备掉落机会",
    module: "explore",
    ctaLabel: "前往黑风山",
  },
  turn_in_black_wind_commission: {
    id: "turn_in_black_wind_commission",
    chapter: "第二章 · 山中试锋",
    title: "回城复命",
    summary: "把妖兽骨交给任务榜，完成新手采集—战斗—交付闭环。",
    destination: "中州 · 青云城 · 城北任务榜",
    action: "在《讨伐黑风山妖兽》任务上点击完成。",
    reward: "120 灵石、18 宗门贡献、5 声望",
    module: "explore",
    ctaLabel: "返回青云城",
  },
  breakthrough_qi_middle: {
    id: "breakthrough_qi_middle",
    chapter: "第三章 · 炼气进境",
    title: "突破炼气中期",
    summary: "继续聚气至修为圆满，并准备 80 灵石完成首次正式突破。",
    destination: "修炼 · 突破准备",
    action: "修为达到 120 后放入所需资源并确认突破。",
    reward: "炼气中期属性、寿元与后续成长曲线",
    module: "cultivation",
    ctaLabel: "继续修炼",
  },
  explore_ancient_cave: {
    id: "explore_ancient_cave",
    chapter: "第四章 · 古修遗泽",
    title: "寻得筑基丹",
    summary: "探索古修洞府，挑战残阵守卫并在丹室寻找筑基机缘。",
    destination: "中州 · 古修洞府 · 残阵守卫/残破丹室",
    action: "取得筑基丹 x1，为炼气圆满冲击筑基做准备。",
    reward: "筑基丹、灵石与秘境装备机会",
    module: "explore",
    ctaLabel: "探索古修洞府",
  },
  join_qingyun_sect: {
    id: "join_qingyun_sect",
    chapter: "第五章 · 青云问道",
    title: "拜入青云宗",
    summary: "前往城东大道递交青云令牌，建立宗门身份与长期成长线。",
    destination: "中州 · 青云城 · 城东大道",
    action: "点击递交青云令牌，成为青云宗外门弟子。",
    reward: "宗门系统、贡献/声望与修炼倍率加成",
    module: "explore",
    ctaLabel: "前往青云城",
  },
  reach_foundation: {
    id: "reach_foundation",
    chapter: "第六章 · 道基初成",
    title: "冲击筑基初期",
    summary: "完成炼气中期、后期与圆满成长，使用筑基丹建立道基。",
    destination: "修炼 · 境界突破",
    action: "筹备各阶段灵石与材料，最终由炼气圆满突破至筑基初期。",
    reward: "筑基境属性、洞府系统与南疆进阶内容",
    module: "cultivation",
    ctaLabel: "推进境界",
  },
  enter_south_ridge: {
    id: "enter_south_ridge",
    chapter: "第七章 · 南疆风云",
    title: "踏入南疆",
    summary: "筑基后前往大世界南疆入口，接触巫妖盟、木灵宗与新的资源生态。",
    destination: "大世界 · 南疆 · 巫妖盟",
    action: "在大世界地图抵达南疆并进入州域。",
    reward: "筑基阶段悬赏、材料、秘境与装备来源",
    module: "explore",
    ctaLabel: "前往南疆",
  },
  establish_south_ridge: {
    id: "establish_south_ridge",
    chapter: "第七章 · 南疆风云",
    title: "立足南疆",
    summary: "完成至少两项南疆悬赏，或提升至筑基中期，建立稳定的进阶资源循环。",
    destination: "南疆 · 巫妖盟悬赏碑及各历练地点",
    action: "在采药、妖藤、巡山与潮音秘洞委托中完成任意两项。",
    reward: "筑基材料、青木灵液、妖丹碎片与更高阶装备",
    module: "explore",
    ctaLabel: "经营南疆路线",
  },
  current_version_complete: {
    id: "current_version_complete",
    chapter: "当前版本主线完成",
    title: "静候更高仙途",
    summary: "炼气至筑基的首轮成长闭环已经完成，可继续培养装备、宗门、洞府与南疆声望。",
    destination: "中州与南疆自由历练",
    action: "完善构筑并为结丹、炼丹、灵田和下一州域预作准备。",
    reward: "完成当前版本主线闭环",
    module: "explore",
    ctaLabel: "继续自由历练",
  },
};
