import type { ItemAmount, MajorRealmId, RealmPhaseId } from "../types";

export type EventTimeWindow = "day" | "night" | "all";
export type EventMapLayer = "world" | "region";
export type EventWeatherTag = "clear" | "rain" | "mist";

export interface TravelEventResult {
  id: string;
  text: string;
  weight: number;
  rewards?: { cultivation?: number; spiritStones?: number; items?: ItemAmount[] };
  penalties?: { spiritStones?: number };
  setFlags?: string[];
}

export interface TravelEventConfig {
  id: string;
  name: string;
  mapLayer: EventMapLayer;
  regionIds?: string[];
  locationIds?: string[];
  minRealm?: { majorRealmId: MajorRealmId; phaseId?: RealmPhaseId };
  requiredFlags?: string[];
  blockedUntilFlags?: string[];
  timeWindow: EventTimeWindow;
  weatherTags?: EventWeatherTag[];
  baseWeight: number;
  results: TravelEventResult[];
}

export const travelEvents: TravelEventConfig[] = [
  {
    id: "central_spirit_stream",
    name: "灵溪余泽",
    mapLayer: "region",
    regionIds: ["central"],
    timeWindow: "day",
    weatherTags: ["clear", "mist"],
    baseWeight: 12,
    results: [
      { id: "absorb", text: "你在溪畔吐纳片刻，灵息更顺。", weight: 7, rewards: { cultivation: 6 } },
      { id: "find_stones", text: "你在溪石缝隙中拾得几枚灵石。", weight: 3, rewards: { spiritStones: 18 } },
    ],
  },
  {
    id: "south_miasma_turbulence",
    name: "瘴潮翻涌",
    mapLayer: "region",
    regionIds: ["south_ridge"],
    timeWindow: "night",
    weatherTags: ["mist", "rain"],
    baseWeight: 10,
    results: [
      { id: "poisoned", text: "瘴风侵体，你急忙运气逼毒，损失部分灵石采买解毒药。", weight: 6, penalties: { spiritStones: 12 } },
      { id: "flower", text: "你借瘴雾掩护采得一株瘴毒花。", weight: 4, rewards: { items: [{ itemId: "miasma_flower", amount: 1 }] } },
    ],
  },
  {
    id: "east_sea_anomaly_locked",
    name: "海渊异象",
    mapLayer: "world",
    regionIds: ["east_sea"],
    timeWindow: "all",
    blockedUntilFlags: ["unlock_east_sea_anomaly"],
    baseWeight: 6,
    results: [
      { id: "locked", text: "此地异象未解锁", weight: 1 },
    ],
  },
  {
    id: "east_sea_anomaly",
    name: "海渊异象",
    mapLayer: "world",
    regionIds: ["east_sea"],
    requiredFlags: ["unlock_east_sea_anomaly"],
    minRealm: { majorRealmId: "foundation", phaseId: "middle" },
    timeWindow: "night",
    weatherTags: ["rain", "mist"],
    baseWeight: 5,
    results: [
      { id: "gain", text: "异象中有残碑显化，你参悟片刻。", weight: 3, rewards: { cultivation: 12, spiritStones: 20 }, setFlags: ["seen_east_sea_anomaly"] },
      { id: "tide_shell", text: "潮声回荡，你在礁隙中拾得潮生贝。", weight: 2, rewards: { items: [{ itemId: "tide_shell", amount: 1 }] } },
    ],
  },
];
