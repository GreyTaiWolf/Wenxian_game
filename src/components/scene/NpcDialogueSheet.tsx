import { useEffect, useState } from "react";
import { getNpcPortrait } from "../../data/assets";
import { BottomSheet, GameButton } from "../ui";
import type { SceneHotspotDialogueAction, SceneHotspotModel } from "./SceneHotspot";

export function NpcDialogueSheet({
  open,
  onOpenChange,
  onAction,
  hotspot,
  motionEnabled = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction?: (action: SceneHotspotDialogueAction, hotspot: SceneHotspotModel) => void;
  hotspot: SceneHotspotModel | null;
  motionEnabled?: boolean;
}) {
  const [portraitFailed, setPortraitFailed] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  useEffect(() => {
    setActiveActionId(null);
    setPortraitFailed(false);
  }, [hotspot?.id]);

  if (!hotspot) {
    return null;
  }

  const portrait = !portraitFailed ? getNpcPortrait(hotspot.id) : null;
  const initials = hotspot.label.slice(0, 1);
  const actions = hotspot.dialogueActions ?? [];
  const activeAction = actions.find((action) => action.id === activeActionId) ?? null;
  const dialogueText = activeAction?.text ?? hotspot.text ?? "对方微微颔首，似乎还有话未曾说尽。";

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={hotspot.label}
      subtitle={hotspot.title}
      motionEnabled={motionEnabled}
      className="npc-dialogue-glass"
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
          <p>{dialogueText}</p>
          {activeAction?.description ? <small>{activeAction.description}</small> : null}
        </div>
        {actions.length ? (
          <div className="npc-dialogue-actions" aria-label={`${hotspot.label}互动`}>
            {actions.map((action) => (
              <button
                className={activeActionId === action.id ? "active" : ""}
                disabled={action.disabled}
                key={action.id}
                onClick={() => {
                  setActiveActionId(action.id);
                  onAction?.(action, hotspot);
                }}
                type="button"
              >
                <span>{action.label}</span>
                {action.description ? <small>{action.description}</small> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </BottomSheet>
  );
}
