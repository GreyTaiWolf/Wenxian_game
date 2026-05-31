import { type ReactNode } from "react";
import { type SceneHotspotModel } from "./SceneHotspot";

export function SceneView({
  name,
  type,
  description,
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
  return (
    <section className="scene-view">
      <div className="scene-image-fallback">
        <strong>{name}</strong>
        <span>{description}</span>
      </div>
      {hotspots.length ? (
        <div className="scene-hotspot-list">
          {hotspots.map((hotspot) => (
            <button className={`scene-hotspot-list-button hotspot-${hotspot.type ?? "action"}`} key={hotspot.id} onClick={() => onHotspotSelect?.(hotspot)} type="button">
              <span>{hotspot.label}</span>
              {hotspot.title ?? hotspot.text ? <small>{hotspot.title ?? hotspot.text}</small> : null}
            </button>
          ))}
        </div>
      ) : null}
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
