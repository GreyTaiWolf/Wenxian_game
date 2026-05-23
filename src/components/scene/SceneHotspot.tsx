import { memo } from "react";

export interface SceneHotspotModel {
  id: string;
  label: string;
  title?: string;
  text?: string;
  x: number;
  y: number;
  type?: "npc" | "shop" | "portal" | "action";
  dialogueActions?: SceneHotspotDialogueAction[];
}

export interface SceneHotspotDialogueAction {
  id: string;
  label: string;
  kind: "chat" | "spar" | "shop" | "quest" | "gift";
  description?: string;
  text?: string;
  shopId?: string;
  disabled?: boolean;
}

export const SceneHotspot = memo(function SceneHotspot({
  hotspot,
  onSelect,
}: {
  hotspot: SceneHotspotModel;
  onSelect: (hotspot: SceneHotspotModel) => void;
}) {
  return (
    <button
      aria-label={`查看${hotspot.label}`}
      className={`scene-hotspot-button scene-hotspot-${hotspot.type ?? "action"}`}
      onClick={() => onSelect(hotspot)}
      style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
      type="button"
    >
      <i aria-hidden="true" />
      <span>{hotspot.label}</span>
    </button>
  );
});
