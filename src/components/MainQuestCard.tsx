import { getMainQuest } from "../game/mainQuest";
import type { GameState, PrimaryModule } from "../types";
import { GameIcon, type GameIconName } from "./GameIcon";

const moduleIcons: Record<PrimaryModule, GameIconName> = {
  cultivation: "module-cultivation",
  inventory: "module-inventory",
  explore: "module-explore",
  cave: "module-cave",
  sect: "module-sect",
};

export default function MainQuestCard({
  game,
  onOpenModule,
}: {
  game: GameState;
  onOpenModule: (module: PrimaryModule) => void;
}) {
  const quest = getMainQuest(game);
  const isComplete = quest.status === "chapterComplete";

  return (
    <section className={`main-quest-card${isComplete ? " complete" : ""}`} aria-live="polite">
      <div className="main-quest-heading">
        <div>
          <span className="main-quest-kicker">
            <GameIcon name="combat-log" size={15} />
            当前主线
          </span>
          <strong>{quest.chapter}</strong>
        </div>
        <span className="main-quest-stage">
          {quest.stageNumber}/{quest.stageCount}
        </span>
      </div>

      <div className="main-quest-title-row">
        <h2>{quest.title}</h2>
        {isComplete ? <span className="main-quest-complete-tag">已完成</span> : null}
      </div>
      <p className="main-quest-summary">{quest.summary}</p>

      <div className="main-quest-progress-copy">
        <span>{quest.progress.label}</span>
        <strong>{quest.progress.percent}%</strong>
      </div>
      <div
        className="main-quest-progress"
        role="progressbar"
        aria-label={`${quest.title}进度`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={quest.progress.percent}
      >
        <span style={{ width: `${quest.progress.percent}%` }} />
      </div>

      <div className="main-quest-route">
        <div>
          <span>地点</span>
          <strong>{quest.destination}</strong>
        </div>
        <div>
          <span>行动</span>
          <strong>{quest.action}</strong>
        </div>
        <div>
          <span>收益</span>
          <strong>{quest.reward}</strong>
        </div>
      </div>

      <div className="main-quest-unlock">
        <GameIcon name="realm" size={15} />
        <span>{quest.nextUnlock}</span>
      </div>

      <button className="main-quest-action" type="button" onClick={() => onOpenModule(quest.module)}>
        <GameIcon name={moduleIcons[quest.module]} size={17} />
        {quest.ctaLabel}
      </button>
    </section>
  );
}
