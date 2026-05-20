export type PrimaryModule = "cultivation" | "inventory" | "explore" | "cave" | "sect";
export type UnlockKey = PrimaryModule | "foundationSkills" | "pet" | "companion";
export type ActorKind = "player" | "companion" | "enemyCultivator" | "pet" | "beast";
export type SkillCategory = "cultivator" | "beast";
export type TargetType = "enemySingle" | "enemyAll" | "allySingle" | "allyAll" | "self";
export type EffectType = "damage" | "heal" | "shield" | "reduceDamage" | "restoreSpirit" | "control";
export type EquipmentSlotId = "weapon" | "robe" | "crown" | "shoes" | "accessory" | "treasure";
export type MajorRealmId =
  | "mortal"
  | "qi_refining"
  | "foundation"
  | "core_formation"
  | "nascent_soul"
  | "spirit_transformation"
  | "void_refining"
  | "body_integration"
  | "mahayana"
  | "post_ascension";
export type RealmPhaseId = "early" | "middle" | "late" | "peak";
export type ItemTierId = MajorRealmId;
export type ItemGrade = "common" | "fine" | "superior" | "rare" | "spirit" | "earth" | "heaven" | "immortal" | "divine";

export interface ItemAmount {
  itemId: string;
  amount: number;
}

export interface ItemAffix {
  id: string;
  name: string;
  description: string;
}

export interface Cost {
  spiritStones?: number;
  items?: ItemAmount[];
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
  divineSense: number;
  speed: number;
  dodge: number;
  crit: number;
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
  category: "currency" | "pill" | "material" | "quest" | "equipment";
  tier: ItemTierId;
  grade: ItemGrade;
  description: string;
  price?: number;
  combatHeal?: number;
  affixes?: ItemAffix[];
  equipment?: {
    slot: EquipmentSlotId;
    bonuses: EquipmentBonus;
    powerBonus: number;
    requiredMajorRealm?: MajorRealmId;
    requiredPhase?: RealmPhaseId;
  };
}

export interface EquipmentInstance {
  id: string;
  itemId: string;
  bonuses: EquipmentBonus;
  powerBonus: number;
  affixes: ItemAffix[];
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

export interface GridCell {
  x: number;
  y: number;
  walkable: boolean;
  movementCost: number;
  regionId: string;
  portalTargetMapId?: string;
  portalTargetX?: number;
  portalTargetY?: number;
}

export interface GridMapData {
  mapId: string;
  width: number;
  height: number;
  cellSize: number;
  origin: Vector2;
  cells: GridCell[];
}

export type GridDestinationKind = "province" | "location" | "event";

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
  navigation: GridNavigationState;
}

export interface CaveState {
  meditationStartedAt: string | null;
  spiritArrayLevel: number;
  totalMeditationMinutes: number;
}

export interface CombatActor extends Stats {
  id: string;
  name: string;
  side: "ally" | "enemy";
  kind: ActorKind;
  hp: number;
  spirit: number;
  skillIds: string[];
  defending?: boolean;
  guardedTurns?: number;
  attackDownTurns?: number;
}

export interface CombatReward {
  cultivation: number;
  spiritStones: number;
  items: ItemAmount[];
}

export interface CombatState {
  id: string;
  groupId: string;
  title: string;
  allies: CombatActor[];
  enemies: CombatActor[];
  turnOrder: string[];
  turnIndex: number;
  round: number;
  logs: string[];
  rewards: CombatReward;
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
  version: 1;
  recentSlotId: string | null;
  settings: SettingsState;
  slots: Array<SaveSlot | null>;
}
