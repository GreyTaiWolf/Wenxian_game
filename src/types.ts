export type PrimaryModule = "cultivation" | "inventory" | "explore" | "cave" | "sect";
export type UnlockKey = PrimaryModule | "foundationSkills" | "pet" | "companion";
export type ActorKind = "player" | "companion" | "enemyCultivator" | "pet" | "beast";
export type SkillCategory = "cultivator" | "beast";
export type TargetType = "enemySingle" | "enemyAll" | "allySingle" | "allyAll" | "self";
export type EffectType = "damage" | "heal" | "shield" | "reduceDamage" | "restoreSpirit" | "control";
export type SkillHitType = "fullDodge" | "halfDodge" | "noDodge";
export type EquipmentSlotId = "weapon" | "robe" | "helmet" | "wrist" | "boots" | "ring" | "amulet" | "artifact";
export type MajorRealmId =
  | "mortal"
  | "qi"
  | "foundation"
  | "core"
  | "nascent"
  | "deity"
  | "void"
  | "integration"
  | "mahayana"
  | "tribulation";
export type RealmPhaseId = "early" | "middle" | "late" | "peak";
export type ItemTierId = MajorRealmId;
export type ItemGrade = "fan" | "liang" | "jing" | "ling" | "xuan" | "di" | "tian" | "xian" | "shen";
export type AffixCategory = "attack" | "defense" | "resource" | "speed" | "dodge" | "crit" | "spiritSense" | "special";
export type AffixRole = "base_stat" | "combat_proc" | "build_enabler" | "world_utility" | "progression_utility" | "keystone";
export type AffixValueType = "flat" | "percent" | "multiplier" | "special";
export type EquipmentSpecialEffect =
  | "on_hit_fire"
  | "on_hit_thunder"
  | "double_strike"
  | "basic_attack_damage_pct"
  | "group_attack"
  | "disable_basic_attack"
  | "disable_skill"
  | "disable_artifact"
  | "disable_pill"
  | "disable_revive"
  | "seal_random_equipment"
  | "break_shield"
  | "dispel_over_time"
  | "break_start_buff"
  | "execute_low_hp"
  | "armor_break_pct"
  | "damage_reduce_pct"
  | "start_shield"
  | "low_hp_guard"
  | "counter_chance"
  | "mp_recover_turn"
  | "mp_cost_reduce"
  | "battle_end_recover"
  | "initiative_bonus"
  | "escape_rate"
  | "after_dodge_speed"
  | "after_hit_dodge"
  | "perfect_dodge_proc"
  | "crit_restore_mp"
  | "crit_extra_hit"
  | "crit_ignore_def"
  | "spell_hit_bonus"
  | "ignore_dodge_pct"
  | "spirit_suppress"
  | "soul_lock"
  | "revive_once"
  | "domain_guard"
  | "domain_skill"
  | "active_skill"
  | "unique_law";

export interface ItemAmount {
  itemId: string;
  amount: number;
}

export interface ItemAffix {
  id: string;
  name: string;
  description: string;
  grade: ItemGrade;
  role: AffixRole;
  category?: AffixCategory;
  stat?: keyof Stats | "attackPct" | "defensePct" | "maxHpPct" | "maxSpiritPct" | "spiritSensePct" | "speedPct" | "skillDamagePct";
  type?: AffixValueType;
  value?: number;
  effect?: EquipmentSpecialEffect;
  special?: boolean;
  exclusive?: boolean;
  unique?: boolean;
}

export interface Cost {
  spiritStones?: number;
  items?: ItemAmount[];
}

export type SeasonId = "spring" | "summer" | "autumn" | "winter";

export type WeatherId =
  | "clear"
  | "cloudy"
  | "spirit_rain"
  | "thunder_cloud"
  | "miasma_rain"
  | "snowstorm"
  | "sandstorm"
  | "tide_fog"
  | "starfall"
  | "spirit_tide";

export interface CalendarState {
  eraId: string;
  eraName: string;
  calendarName: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  tick: number;
  dayIndex: number;
  tickIndex: number;
  season: SeasonId;
  solarTerm: string;
}

export interface WeatherSnapshot {
  weatherId: WeatherId;
  name: string;
  description: string;
  startedDayIndex: number;
  untilDayIndex: number;
}

export interface WeatherState {
  global: WeatherSnapshot;
  regions: Record<string, WeatherSnapshot>;
  updatedDayIndex: number;
}

export interface RealmConfig {
  id: string;
  name: string;
  majorRealmId: MajorRealmId;
  phaseId: RealmPhaseId;
  requiredCultivation: number;
  baseStats: Stats;
  lifespan: number;
  breakthroughCost: Cost;
  successRate: number;
  unlocks: UnlockKey[];
}

export interface SkillConfig {
  id: string;
  name: string;
  category: SkillCategory;
  allowedUsers: ActorKind[];
  targetType: TargetType;
  hitType: SkillHitType;
  spiritCost: number;
  power: number;
  effectType: EffectType;
  weight: number;
  unlockRealm: string;
  description: string;
}

export interface Stats {
  maxHp: number;
  maxSpirit: number;
  attack: number;
  defense: number;
  spiritSense: number;
  speed: number;
  dodgeRate: number;
  critRate: number;
  critDamage: number;
}

export type EquipmentBonus = Partial<Stats>;

export interface TeamMember {
  id: string;
  name: string;
  kind: ActorKind;
  stats: Stats;
  skillIds: string[];
}

export interface CombatLoadout {
  skillIds: [string | null, string | null];
  divineSkillId: string | null;
  pillItemId: string | null;
}

export interface ItemConfig {
  id: string;
  name: string;
  category: "currency" | "pill" | "material" | "quest" | "equipment" | "blueprint" | "recipe";
  tier: ItemTierId;
  grade: ItemGrade;
  description: string;
  price?: number;
  combatHeal?: number;
  affixes?: ItemAffix[];
  equipment?: {
    slot: EquipmentSlotId;
    requiredMajorRealm?: MajorRealmId;
    requiredPhase?: RealmPhaseId;
  };
}

export interface EquipmentSealState {
  sealed: boolean;
  mainStatMultiplier: number;
  affixesSealed: boolean;
  reason?: string;
}

export interface EquipmentInstance {
  id: string;
  itemId: string;
  name: string;
  displayName: string;
  realmTier: ItemTierId;
  realmPhase: RealmPhaseId;
  quality: ItemGrade;
  slot: EquipmentSlotId;
  mainStats: EquipmentBonus;
  bonuses: EquipmentBonus;
  powerBonus: number;
  affixes: ItemAffix[];
  equipmentBalanceVersion?: number;
  seal?: EquipmentSealState;
  createdAt: string;
}

export interface PlayerState {
  name: string;
  realmId: string;
  cultivation: number;
  hp: number;
  spirit: number;
  age: number;
  lifespan: number;
  mindValue: number;
  comprehension: number;
  injuryStacks: number;
  instabilityStacks: number;
  power?: number;
  lifespanCurrent?: number;
  lifespanMax?: number;
  mood?: string;
  spiritStones: number;
  stats: Stats;
  skillIds: string[];
  combatLoadout: CombatLoadout;
  team: TeamMember[];
  unlocks: UnlockKey[];
  dailyCultivationCount: number;
}

export interface InventoryState {
  items: Record<string, number>;
  equipment: Record<EquipmentSlotId, string | null>;
  equipmentItems: EquipmentInstance[];
}

export interface QuestState {
  status: "available" | "accepted" | "completed";
  progress: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface GridCoord {
  x: number;
  y: number;
}

export type GridMapLayer = "world" | "local";
export type GridCellDistanceUnit = "li" | "meter";
export type GridTerrain =
  | "plain"
  | "road"
  | "city"
  | "sect"
  | "forest"
  | "mountain"
  | "valley"
  | "water"
  | "marsh"
  | "desert"
  | "snow"
  | "cave"
  | "secret"
  | "forbidden";

export type GridRoadKind = "road" | "trail" | "spirit_route";

export interface GridRoadSegment {
  id: string;
  fromId: string;
  toId: string;
  kind: GridRoadKind;
  points: GridCoord[];
}

export interface GridCell {
  x: number;
  y: number;
  walkable: boolean;
  movementCost: number;
  regionId: string;
  terrain: GridTerrain;
  dangerLevel: number;
  spiritLevel: number;
  regionTag: string;
  climateTag: string;
  poiId?: string;
  portalTargetMapId?: string;
  portalTargetX?: number;
  portalTargetY?: number;
}

export interface GridMapData {
  mapId: string;
  layer: GridMapLayer;
  name: string;
  width: number;
  height: number;
  cellSize: number;
  cellDistance: number;
  cellDistanceUnit: GridCellDistanceUnit;
  origin: Vector2;
  cells: GridCell[];
  roadSegments: GridRoadSegment[];
}

export type GridDestinationKind = "province" | "poi" | "location" | "scene" | "event";

export interface GridDestinationZone {
  mapId: string;
  zoneId: string;
  kind: GridDestinationKind;
  targetId: string;
  anchor: GridCoord;
  cells: GridCoord[];
  eventIds?: string[];
}

export interface GridNavigationState {
  mapVersion: number;
  activeMapId: string;
  positions: Record<string, GridCoord>;
}

export interface WorldState {
  regionId: string;
  locationId: string;
  sceneId: string;
  lastTownId: string;
  sectJoined: boolean;
  sectContribution: number;
  sectReputation: number;
  tasks: Record<string, QuestState>;
  logs: string[];
  sceneMessage: string;
  calendar: CalendarState;
  weather: WeatherState;
  events: WorldEventState;
  shops: Record<string, ShopRuntimeState>;
  learnedEquipmentRecipes: Record<string, boolean>;
  npcs: NpcWorldState;
  navigation: GridNavigationState;
}

export interface ShopRuntimeState {
  cycleKey: string;
  purchases: Record<string, number>;
}

export interface NpcRuntimeState {
  npcId: string;
  mapId: string;
  locationId: string;
  poiId: string;
  realmId: string;
  growth: number;
  lastUpdatedDayIndex: number;
  targetPoiId?: string;
  taskSeed?: string;
}

export interface NpcWorldState {
  actors: Record<string, NpcRuntimeState>;
}

export type WorldEventType = "dialogue" | "combat" | "treasure" | "quest" | "field" | "weather";
export type WorldEventChoiceKind = "dialogue" | "combat" | "reward" | "field" | "weather" | "quest" | "dismiss";

export interface WorldEventState {
  triggeredCounts: Record<string, number>;
  cooldowns: Record<string, number>;
  flags: Record<string, boolean>;
  activeEventId: string | null;
  lastEventDayIndex: number;
}

export interface SpiritPlantInstance {
  id: string;
  speciesId: string;
  grade: ItemGrade;
  plantedAt: CalendarState;
  years: number;
  plotId: string;
  growthBonusSnapshot: number;
  growthProgressDays: number;
}

export interface SpiritFieldPlot {
  id: string;
  unlocked: boolean;
  soilGrade: ItemGrade;
  plant: SpiritPlantInstance | null;
}

export interface SpiritFieldRegionState {
  regionId: string;
  level: number;
  unlocked: boolean;
  plots: SpiritFieldPlot[];
}

export interface SpiritFieldState {
  activeRegionId: string;
  regions: Record<string, SpiritFieldRegionState>;
  totalHarvests: number;
}

export interface AlchemyState {
  furnaceLevel: number;
  learnedRecipes: Record<string, boolean>;
  totalCrafts: number;
  totalFailures: number;
}

export interface CaveRefineryState {
  level: number;
  totalCrafts: number;
  totalReforges: number;
}

export interface CavePetInstance {
  petId: string;
  level: number;
  intimacy: number;
  breakthrough: number;
}

export interface BeastStableState {
  level: number;
  pets: CavePetInstance[];
  activePetId: string | null;
}

export interface MountInstance {
  mountId: string;
  level: number;
  intimacy: number;
}

export interface MountYardState {
  level: number;
  mounts: MountInstance[];
  activeMountId: string | null;
}

export interface CaveState {
  meditationStartedAt: string | null;
  spiritArrayLevel: number;
  totalMeditationMinutes: number;
  spiritField: SpiritFieldState;
  alchemy: AlchemyState;
  refinery: CaveRefineryState;
  beastStable: BeastStableState;
  mountYard: MountYardState;
}

export interface CombatActor extends Stats {
  id: string;
  name: string;
  side: "ally" | "enemy";
  kind: ActorKind;
  hp: number;
  spirit: number;
  skillIds: string[];
  baseStats?: Stats;
  combatAffixes?: ItemAffix[];
  equipmentAffixes?: ItemAffix[];
  equipmentSeals?: CombatEquipmentSeal[];
  basicAttackDisabledActions?: number;
  skillDisabledActions?: number;
  artifactDisabledActions?: number;
  pillDisabledActions?: number;
  reviveDisabledActions?: number;
  initiativeGradeRank?: number;
  defending?: boolean;
  guardedTurns?: number;
  attackDownTurns?: number;
  shield?: number;
  burnTurns?: number;
  burnDamage?: number;
  poisonTurns?: number;
  poisonDamage?: number;
  speedUpTurns?: number;
  speedUpAmount?: number;
  dodgeUpTurns?: number;
  dodgeUpAmount?: number;
  reviveReady?: boolean;
  damageReducePct?: number;
  spiritSuppressTurns?: number;
  soulLockedTurns?: number;
}

export interface CombatReward {
  cultivation: number;
  spiritStones: number;
  items: ItemAmount[];
}

export type CombatType = "normal" | "elite" | "boss" | "survival";
export type CombatTimeoutResult = "escape" | "defeat" | "victory";

export interface CombatEquipmentSeal {
  slotId: EquipmentSlotId;
  label: string;
  remainingRounds: number;
}

export interface CombatReturnContext {
  regionId: string;
  locationId: string;
  sceneId: string;
  activeMapId: string;
  position?: GridCoord;
}

export interface CombatState {
  id: string;
  groupId: string;
  title: string;
  combatType: CombatType;
  timeoutResult: CombatTimeoutResult;
  maxRounds: number;
  preparationComplete: boolean;
  allies: CombatActor[];
  enemies: CombatActor[];
  turnOrder: string[];
  turnIndex: number;
  round: number;
  lastRoundStarted?: number;
  logs: string[];
  rewards: CombatReward;
  returnContext?: CombatReturnContext;
}

export interface GameState {
  player: PlayerState;
  inventory: InventoryState;
  world: WorldState;
  cave: CaveState;
  combat?: CombatState;
}

export interface SaveSlot {
  id: string;
  createdAt: string;
  updatedAt: string;
  game: GameState;
}

export interface SettingsState {
  textSize: "small" | "normal" | "large";
  motion: boolean;
  autoSave: boolean;
}

export interface RootSave {
  version: 1 | 2 | 3 | 4 | 5 | 6;
  recentSlotId: string | null;
  settings: SettingsState;
  slots: Array<SaveSlot | null>;
}
