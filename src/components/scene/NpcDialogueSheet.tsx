import { useState } from "react";
import { getNpcPortrait } from "../../data/assets";
import { BottomSheet, GameButton } from "../ui";
import type { SceneHotspotModel } from "./SceneHotspot";

export function NpcDialogueSheet({
  open,
  onOpenChange,
  hotspot,
  motionEnabled = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotspot: SceneHotspotModel | null;
  motionEnabled?: boolean;
}) {
  const [portraitFailed, setPortraitFailed] = useState(false);

  if (!hotspot) {
    return null;
  }

  const portrait = !portraitFailed ? getNpcPortrait(hotspot.id) : null;
  const initials = hotspot.label.slice(0, 1);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={hotspot.label}
      subtitle={hotspot.title}
      motionEnabled={motionEnabled}
      footer={
        <GameButton variant="ghost" onClick={() => onOpenChange(false)}>
          离开
        </GameButton>
      }
    >
      <div className="npc-dialogue-sheet">
        <div className="npc-portrait-frame">
          {portrait ? (
            <img alt={hotspot.label} loading="lazy" onError={() => setPortraitFailed(true)} src={portrait} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="npc-dialogue-copy">
          <p>{hotspot.text ?? "对方微微颔首，似乎还有话未曾说尽。"}</p>
        </div>
      </div>
    </BottomSheet>
  );
}
