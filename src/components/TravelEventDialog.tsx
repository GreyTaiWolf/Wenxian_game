import { formatItemName } from "../data/items";
import { getTravelEventDefinition, type TravelEventChoice } from "../data/travelEvents";
import { canAffordTravelEventChoice } from "../game/travelEvents";
import type { GameState } from "../types";
import { GameIcon } from "./GameIcon";

export interface TravelEventDialogProps {
  game: GameState;
  onChoose: (choiceId: string) => void;
}

export default function TravelEventDialog({ game, onChoose }: TravelEventDialogProps) {
  const pending = game.world.pendingTravelEvent;
  if (!pending) {
    return null;
  }

  const event = getTravelEventDefinition(pending.eventId);
  if (!event) {
    return (
      <div className="scene-dialogue-backdrop travel-event-backdrop" role="dialog" aria-modal="true" aria-labelledby="travel-event-missing-title">
        <section className="scene-dialogue-card travel-event-card">
          <div className="section-heading">
            <h2 id="travel-event-missing-title">
              <GameIcon name="module-explore" size={18} />
              异闻散佚
            </h2>
            <span>行路事件</span>
          </div>
          <p>这段异闻已无法辨认，继续赶路即可。</p>
          <div className="action-grid">
            <button className="primary-action compact" type="button" onClick={() => onChoose("__clear_missing_event")}>
              继续赶路
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="scene-dialogue-backdrop travel-event-backdrop" role="dialog" aria-modal="true" aria-labelledby="travel-event-title">
      <section className="scene-dialogue-card travel-event-card">
        <div className="section-heading">
          <h2 id="travel-event-title">
            <GameIcon name="module-explore" size={18} />
            {event.title}
          </h2>
          <span>行路异闻</span>
        </div>

        <p>{event.description}</p>

        <div className="equipment-detail-stats compact">
          <div>
            <span>去处</span>
            <strong>{pending.destinationLabel}</strong>
          </div>
          <div>
            <span>路程</span>
            <strong>{pending.stepCount} 格</strong>
          </div>
        </div>

        <div className="slot-list">
          {event.choices.map((choice) => {
            const affordable = canAffordTravelEventChoice(game, choice);
            return (
              <div className="task-row" key={choice.id}>
                <div className="task-copy">
                  <strong>{choice.label}</strong>
                  <span className="muted">{choice.description}</span>
                  <small>
                    {formatChoiceCost(choice)}
                    {" · "}
                    {choice.outcome.preview}
                  </small>
                </div>
                <button
                  className={choice.isFallback ? "ghost-button" : "primary-action compact"}
                  type="button"
                  disabled={!affordable}
                  onClick={() => onChoose(choice.id)}
                >
                  {affordable ? "选择" : "资源不足"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function formatChoiceCost(choice: TravelEventChoice): string {
  const costs: string[] = [];
  if (choice.cost.spiritStones) {
    costs.push(`需灵石 ${choice.cost.spiritStones}`);
  }
  choice.cost.items?.forEach((item) => {
    costs.push(`需${formatItemName(item.itemId)} ×${item.amount}`);
  });
  return costs.length > 0 ? costs.join("、") : "无需资源";
}
