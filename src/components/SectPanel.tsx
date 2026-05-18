import { tasks } from "../data/world";
import type { GameState } from "../types";
import { GameIcon } from "./GameIcon";

export default function SectPanel({ game }: { game: GameState }) {
  return (
    <section className="module-panel">
      <div className="sub-tabs">
        <button className="active">
          <GameIcon name="module-sect" size={15} />
          身份
        </button>
        <button>
          <GameIcon name="combat-log" size={15} />
          任务
        </button>
        <button disabled>
          <GameIcon name="system-library" size={15} />
          藏经阁
        </button>
        <button disabled>
          <GameIcon name="sect-contribution" size={15} />
          贡献
        </button>
        <button disabled>
          <GameIcon name="sect-master" size={15} />
          师门
        </button>
        <button disabled>
          <GameIcon name="combat" size={15} />
          宗门战
        </button>
      </div>
      <div className="stat-list">
        <Stat icon="module-sect" label="宗门" value={game.world.sectJoined ? "青云宗" : "未加入"} />
        <Stat icon="realm" label="身份" value={game.world.sectJoined ? "外门弟子" : "散修"} />
        <Stat icon="sect-contribution" label="贡献" value={game.world.sectContribution} />
        <Stat icon="sect-reputation" label="声望" value={game.world.sectReputation} />
        <Stat icon="sect-master" label="师父" value="暂无" />
      </div>
      <section className="task-board">
        <div className="section-heading">
          <h2>
            <GameIcon name="combat-log" size={18} />
            宗门任务
          </h2>
          <span>前往青云城任务榜完成</span>
        </div>
        {tasks.map((task) => (
          <div className="task-row" key={task.id}>
            <div>
              <strong>{task.title}</strong>
              <small>{task.requirementText}</small>
            </div>
            <span className="done-tag">{game.world.tasks[task.id]?.status ?? "未接取"}</span>
          </div>
        ))}
      </section>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: "module-sect" | "realm" | "sect-contribution" | "sect-reputation" | "sect-master"; label: string; value: string | number }) {
  return (
    <div className="stat-row">
      <span>
        <GameIcon name={icon} size={15} />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
