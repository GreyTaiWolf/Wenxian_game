import {
  ArrowLeft,
  Backpack,
  BookOpen,
  Castle,
  CircleDot,
  Clock,
  Coins,
  Compass,
  CookingPot,
  Crown,
  FlaskConical,
  Gem,
  HeartPulse,
  Landmark,
  Map,
  Mountain,
  Package,
  Pill,
  RotateCcw,
  ScrollText,
  Settings,
  Shield,
  Shirt,
  Sparkles,
  Sprout,
  Store,
  Sword,
  Swords,
  Telescope,
  TentTree,
  Trophy,
  UserRound,
  Users,
  WandSparkles,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";

export type GameIconName =
  | "action-back"
  | "action-reset"
  | "action-settings"
  | "action-zoom-in"
  | "action-zoom-out"
  | "combat"
  | "combat-log"
  | "equipment"
  | "equipment-amulet"
  | "equipment-artifact"
  | "equipment-boots"
  | "equipment-helmet"
  | "equipment-ring"
  | "equipment-robe"
  | "equipment-wrist"
  | "equipment-weapon"
  | "item"
  | "item-material"
  | "item-pill"
  | "location-city"
  | "location-secret"
  | "location-town"
  | "location-wild"
  | "module-cave"
  | "module-cultivation"
  | "module-explore"
  | "module-inventory"
  | "module-sect"
  | "realm"
  | "resource-life"
  | "resource-mood"
  | "resource-power"
  | "resource-spirit"
  | "resource-stones"
  | "sect-contribution"
  | "sect-master"
  | "sect-reputation"
  | "system-alchemy"
  | "system-library"
  | "system-spirit-field"
  | "team";

const iconMap: Record<GameIconName, LucideIcon> = {
  "action-back": ArrowLeft,
  "action-reset": RotateCcw,
  "action-settings": Settings,
  "action-zoom-in": ZoomIn,
  "action-zoom-out": ZoomOut,
  combat: Swords,
  "combat-log": ScrollText,
  equipment: Shield,
  "equipment-amulet": Gem,
  "equipment-artifact": WandSparkles,
  "equipment-boots": Sparkles,
  "equipment-helmet": Crown,
  "equipment-ring": CircleDot,
  "equipment-robe": Shirt,
  "equipment-wrist": Shield,
  "equipment-weapon": Sword,
  item: Package,
  "item-material": Sprout,
  "item-pill": Pill,
  "location-city": Castle,
  "location-secret": Telescope,
  "location-town": Store,
  "location-wild": TentTree,
  "module-cave": Mountain,
  "module-cultivation": Sparkles,
  "module-explore": Map,
  "module-inventory": Backpack,
  "module-sect": Landmark,
  realm: Crown,
  "resource-life": Clock,
  "resource-mood": CircleDot,
  "resource-power": Trophy,
  "resource-spirit": FlaskConical,
  "resource-stones": Coins,
  "sect-contribution": BookOpen,
  "sect-master": UserRound,
  "sect-reputation": Gem,
  "system-alchemy": CookingPot,
  "system-library": BookOpen,
  "system-spirit-field": Sprout,
  team: Users,
};

export function GameIcon({
  name,
  size = 18,
  className = "",
  decorative = true,
}: {
  name: GameIconName;
  size?: number;
  className?: string;
  decorative?: boolean;
}) {
  const Icon = iconMap[name];
  return <Icon aria-hidden={decorative} className={`game-icon ${className}`.trim()} size={size} strokeWidth={2} />;
}

export function getLocationIconName(type: "city" | "town" | "wild" | "secret"): GameIconName {
  if (type === "city") {
    return "location-city";
  }
  if (type === "town") {
    return "location-town";
  }
  if (type === "secret") {
    return "location-secret";
  }
  return "location-wild";
}
