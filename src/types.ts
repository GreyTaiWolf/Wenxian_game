export type PrimaryModule = "cultivation" | "inventory" | "explore" | "cave" | "sect";
export type UnlockKey = PrimaryModule | "foundationSkills" | "pet" | "companion";
export type ActorKind = "player" | "companion" | "enemyCultivator" | "pet" | "beast";
export type SkillCategory = "cultivator" | "beast";
export type TargetType = "enemySingle" | "enemyAll" | "allySingle" | "allyAll" | "self";
export type EffectType = "damage" | "heal" | "shield" | "reduceDamage" | "restoreSpirit" | "control";
export type EquipmentSlotId = "weapon" | "robe" | "crown" | "shoes" | "accessory" | "treasure";

export interface ItemAmount {
  itemId: string;
  amount: number;
}

export interface Cost {
  spiritStones?: number;
  items?: ItemAmount[];
}

export interface RealmConfig {
  id: string;
  name: string;
  requiredCultivation: number;
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
  description: string;
  price?: number;
  combatHeal?: number;
  equipment?: {
    slot: EquipmentSlotId;
    bonuses: EquipmentBonus;
    powerBonus: number;
  };
}

export interface PlayerState {
  name: string;
  realmId: string;
  cultivation: number;
  power: number;
  lifespanCurrent: number;
  lifespanMax: number;
  mood: string;
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
}

export interface QuestState {
  status: "available" | "accepted" | "completed";
  progress: number;
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
