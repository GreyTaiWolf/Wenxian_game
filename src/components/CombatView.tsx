import { useEffect, useMemo, type ReactNode } from "react";
import { formatItemName, getItem, shouldEmphasizeItemGrade } from "../data/items";
import { getSkill } from "../data/skills";
import { canUseArtifactAction, getSkillSpiritCost, performArtifactAction, performEscape, performPlayerBasic, performPlayerSkill, performUseItem } from "../game/combatEngine";
import { getEquippedItem } from "../game/equipment";
import { defaultCombatLoadout } from "../game/state";
import type { CombatActor, CombatState, ItemConfig, SkillConfig } from "../types";
import { useActiveGame, useUpdateGame } from "../stores/gameStore";
import { useCombatUiStore } from "../stores/combatUiStore";
import { GameIcon, type GameIconName } from "./GameIcon";

type LogNameMeta = {
  name: string;
  className: string;
};

export default function CombatView() {
  const activeGame = useActiveGame();
  const onChange = useUpdateGame();
  const selectedSkillId = useCombatUiStore((state) => state.selectedSkillId);
  const logsOpen = useCombatUiStore((state) => state.logsOpen);
  const syncCombat = useCombatUiStore((state) => state.syncCombat);
  const selectSkill = useCombatUiStore((state) => state.selectSkill);
  const clearSelectedSkill = useCombatUiStore((state) => state.clearSelectedSkill);
  const toggleLogs = useCombatUiStore((state) => state.toggleLogs);
  const combat = activeGame?.combat;

  if (!combat) {
    return null;
  }

  const game = activeGame;
  const selectedSkill = selectedSkillId ? getSkill(selectedSkillId) : null;
  const currentActorId = combat.turnOrder[combat.turnIndex];
  const currentActor = [...combat.allies, ...combat.enemies].find((actor) => actor.id === currentActorId);
  const player = combat.allies.find((actor) => actor.kind === "player");
  const playerTurn = currentActor?.kind === "player";
  const loadout = game.player.combatLoadout ?? defaultCombatLoadout;
  const carriedSkills = loadout.skillIds.map((skillId) => getPlayerSkillSlot(skillId, player));
  const divineSkill = getPlayerSkillSlot(loadout.divineSkillId, player);
  const equippedTreasure = getEquippedItem(game, "artifact");
  const pill = loadout.pillItemId ? getItem(loadout.pillItemId) : null;
  const pillAmount = loadout.pillItemId ? game.inventory.items[loadout.pillItemId] ?? 0 : 0;
  const targetPool = selectedSkill ? getTargetPool(combat.allies, combat.enemies, selectedSkill.targetType) : [];
  const logNames = useMemo(() => getLogNameMeta(combat), [combat]);
  const hasUsableLoadoutAction =
    carriedSkills.some((skill) => canUseSkill(skill, player, playerTurn)) ||
    canUseSkill(divineSkill, player, playerTurn) ||
    Boolean(playerTurn && pill?.combatHeal && pillAmount > 0);

  useEffect(() => {
    syncCombat(combat.id);
  }, [combat.id, syncCombat]);

  useEffect(() => {
    if (!combat || !playerTurn || hasUsableLoadoutAction || selectedSkill) {
      return;
    }
    const timer = window.setTimeout(() => {
      onChange((prevGame) => performPlayerBasic(prevGame));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [combat?.id, combat?.turnIndex, hasUsableLoadoutAction, onChange, playerTurn, selectedSkill]);

  function useSkill(skill: SkillConfig, targetId?: string) {
    clearSelectedSkill();
    onChange(performPlayerSkill(game, skill.id, targetId));
  }

  function renderSkillButton(skill: SkillConfig | null, label: string) {
    const disabled = !canUseSkill(skill, player, playerTurn);
    const iconName: GameIconName = label === "神通" ? "equipment-artifact" : label.startsWith("武技") ? "combat" : "module-cultivation";
    return (
      <button
        className={`combat-slot ${skill ? "" : "empty"}`}
        disabled={disabled}
        onClick={() => {
          if (!skill) {
            return;
          }
          if (skill.targetType.endsWith("All") || skill.targetType === "self") {
            useSkill(skill);
          } else {
            selectSkill(skill.id);
          }
        }}
      >
        <span>
          <GameIcon name={iconName} size={15} />
          {label}
        </span>
        <strong>{skill?.name ?? "空槽"}</strong>
        <small>{skill ? (getSkillSpiritCost(player, skill) ? `${getSkillSpiritCost(player, skill)} 灵力` : "无消耗") : "未携带"}</small>
      </button>
    );
  }

  function renderEmptyLoadoutButton(label: string, description: string, iconName: GameIconName) {
    return (
      <button className="combat-slot empty" disabled>
        <span>
          <GameIcon name={iconName} size={15} />
          {label}
        </span>
        <strong>空槽</strong>
        <small>{description}</small>
      </button>
    );
  }

  function renderTreasureButton() {
    const artifactReady = playerTurn && canUseArtifactAction(game);
    return (
      <button className={`combat-slot utility ${equippedTreasure ? `grade-card grade-${equippedTreasure.grade}` : "empty"}`} disabled={!artifactReady} onClick={() => onChange(performArtifactAction(game))}>
        <span>
          <GameIcon name="equipment-artifact" size={15} />
          法宝
        </span>
        <strong className={equippedTreasure ? getGradeNameClass(equippedTreasure) : ""}>{equippedTreasure ? formatItemName(equippedTreasure) : "空槽"}</strong>
        <small>{equippedTreasure ? (artifactReady ? "可催动" : "被动生效") : "未装备"}</small>
      </button>
    );
  }

  return (
    <section className="combat-view">
      <div className="section-heading combat-heading">
        <div className="combat-title">
          <h2>
            <GameIcon name="combat" size={18} />
            {combat.title}
          </h2>
          <span>第 {combat.round} 回合</span>
        </div>
        <div className="combat-header-actions">
          <button className={`combat-top-button ${logsOpen ? "active" : ""}`} onClick={toggleLogs}>
            <GameIcon name="combat-log" size={15} />
            战斗日志
            <small>{combat.logs.length}</small>
          </button>
          <button className="combat-top-button escape" disabled={!playerTurn} onClick={() => onChange(performEscape(game))}>
            <GameIcon name="action-back" size={15} />
            逃离
            <small>72%</small>
          </button>
        </div>
      </div>

      {logsOpen ? (
        <section className="combat-log-popover">
          <div className="section-heading">
            <h2>
              <GameIcon name="combat-log" size={18} />
              战斗日志
            </h2>
            <span>{combat.logs.length}</span>
          </div>
          <div className="log-list">
            {combat.logs.slice(0, 10).map((line, index) => (
              <p key={`${line}-${index}`}>{renderColoredLogLine(line, logNames)}</p>
            ))}
          </div>
        </section>
      ) : null}

      <div className="combat-columns">
        <ActorColumn title="我方" actors={combat.allies} />
        <ActorColumn title="敌方" actors={combat.enemies} />
      </div>

      {selectedSkill ? (
        <div className="target-panel">
          <div className="section-heading">
            <h2>选择目标：{selectedSkill.name}</h2>
            <button className="ghost-button" onClick={clearSelectedSkill}>
              返回
            </button>
          </div>
          <div className="target-grid">
            {targetPool.map((actor) => (
              <button key={actor.id} disabled={actor.hp <= 0} onClick={() => useSkill(selectedSkill, actor.id)}>
                {actor.name}
                <small>
                  气血 {actor.hp}/{actor.maxHp}
                </small>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="combat-loadout-panel">
          <div className="combat-martial-row">
            {renderSkillButton(carriedSkills[0], "武技一")}
            {renderSkillButton(carriedSkills[1], "武技二")}
          </div>
          <div className="combat-method-row">
            {renderEmptyLoadoutButton("功法一", "未装配", "system-library")}
            {renderEmptyLoadoutButton("功法二", "未装配", "system-library")}
          </div>
          <div className="combat-artifact-row">
            {renderSkillButton(divineSkill, "神通")}
            {renderTreasureButton()}
            <button
              className={`combat-slot utility ${pill?.combatHeal ? `grade-card grade-${pill.grade}` : "empty"}`}
              disabled={!playerTurn || !pill?.combatHeal || pillAmount <= 0}
              onClick={() => loadout.pillItemId && onChange(performUseItem(game, loadout.pillItemId))}
            >
              <span>
                <GameIcon name="item-pill" size={15} />
                丹药
              </span>
              <strong className={pill ? getGradeNameClass(pill) : ""}>{pill ? formatItemName(pill) : "空槽"}</strong>
              <small>{pill?.combatHeal ? `x${pillAmount} · 气血 +${pill.combatHeal}` : "未携带"}</small>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function getGradeNameClass(item: ItemConfig): string {
  return `grade-name grade-${item.grade}${shouldEmphasizeItemGrade(item.grade) ? " strong" : ""}`;
}

function getPlayerSkillSlot(skillId: string | null, player?: CombatActor): SkillConfig | null {
  if (!skillId || skillId === "basic_strike" || !player?.skillIds.includes(skillId)) {
    return null;
  }
  const skill = getSkill(skillId);
  return skill.allowedUsers.includes("player") ? skill : null;
}

function canUseSkill(skill: SkillConfig | null, player: CombatActor | undefined, playerTurn: boolean): boolean {
  return Boolean(skill && playerTurn && player && player.spirit >= getSkillSpiritCost(player, skill));
}

function ActorColumn({ title, actors }: { title: string; actors: CombatActor[] }) {
  return (
    <div className="actor-column">
      <h3>
        <GameIcon name={title === "我方" ? "team" : "combat"} size={15} />
        {title}
      </h3>
      {actors.map((actor) => (
        <div className={`actor-card ${actor.hp <= 0 ? "down" : ""}`} key={actor.id}>
          <div className="actor-head">
            <strong>{actor.name}</strong>
            <span>{actor.kind === "player" ? "主角" : actor.kind === "pet" ? "灵宠" : actor.kind === "companion" ? "道友" : actor.kind === "beast" ? "妖兽" : "修士"}</span>
          </div>
          <Meter value={actor.hp} max={actor.maxHp} />
          <small>
            气血 {actor.hp}/{actor.maxHp} · 灵力 {actor.spirit}/{actor.maxSpirit}
          </small>
        </div>
      ))}
    </div>
  );
}

function Meter({ value, max }: { value: number; max: number }) {
  return (
    <div className="mini-meter hp-meter">
      <div style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  );
}

function getTargetPool(allies: CombatActor[], enemies: CombatActor[], targetType: SkillConfig["targetType"]): CombatActor[] {
  if (targetType.startsWith("enemy")) {
    return enemies.filter((actor) => actor.hp > 0);
  }
  if (targetType.startsWith("ally")) {
    return allies.filter((actor) => actor.hp > 0);
  }
  return allies.filter((actor) => actor.kind === "player");
}

function getLogNameMeta(combat: CombatState): LogNameMeta[] {
  const allies = combat.allies.map((actor) => ({
    name: actor.name,
    className: actor.kind === "player" ? "log-name-player" : "log-name-ally",
  }));
  const enemies = combat.enemies.map((actor) => ({
    name: actor.name,
    className: "log-name-enemy",
  }));
  return [...allies, ...enemies].filter((item) => item.name).sort((a, b) => b.name.length - a.name.length);
}

function renderColoredLogLine(line: string, names: LogNameMeta[]): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  while (cursor < line.length) {
    let nextMatch: { meta: LogNameMeta; index: number } | null = null;
    for (const meta of names) {
      const index = line.indexOf(meta.name, cursor);
      if (index >= 0 && (!nextMatch || index < nextMatch.index)) {
        nextMatch = { meta, index };
      }
    }

    if (!nextMatch) {
      nodes.push(line.slice(cursor));
      break;
    }

    if (nextMatch.index > cursor) {
      nodes.push(line.slice(cursor, nextMatch.index));
    }

    nodes.push(
      <span className={nextMatch.meta.className} key={`${nextMatch.meta.name}-${nextMatch.index}-${cursor}`}>
        {nextMatch.meta.name}
      </span>,
    );
    cursor = nextMatch.index + nextMatch.meta.name.length;
  }

  return nodes;
}
