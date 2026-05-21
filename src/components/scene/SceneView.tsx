import { useState, type ReactNode } from "react";
import { SceneHotspot, type SceneHotspotModel } from "./SceneHotspot";

export function SceneView({
  name,
  type,
  description,
  imageSrc,
  hotspots = [],
  feedback,
  actions,
  onHotspotSelect,
}: {
  name: string;
  type?: string;
  description: string;
  imageSrc?: string | null;
  hotspots?: SceneHotspotModel[];
  feedback?: string;
  actions?: ReactNode;
  onHotspotSelect?: (hotspot: SceneHotspotModel) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(imageSrc) && !imageFailed;

  return (
    <section className="scene-view">
      {hasImage ? (
        <div className="scene-visual-frame">
          <img
            alt={name}
            className="scene-visual"
            draggable={false}
            loading="lazy"
            onError={() => setImageFailed(true)}
            src={imageSrc ?? ""}
          />
          {hotspots.map((hotspot) => (
            <SceneHotspot key={hotspot.id} hotspot={hotspot} onSelect={onHotspotSelect ?? (() => undefined)} />
          ))}
        </div>
      ) : (
        <div className="scene-image-fallback">
          <strong>{name}</strong>
          <span>{description}</span>
        </div>
      )}
      <div className="scene-view-copy">
        <small>{type ? `${type}场景` : "场景"}</small>
        <h3>{name}</h3>
        <p>{description}</p>
        {feedback ? <p className="scene-message">{feedback}</p> : null}
      </div>
      {actions ? <div className="scene-view-actions">{actions}</div> : null}
    </section>
  );
}
