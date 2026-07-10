import { getRealm, isRealmAtLeast } from "../data/progression";
import { tasks, type QuestObjective, type QuestPrerequisite, type TaskConfig } from "../data/world";
import type { GameState, ItemAmount, QuestState, QuestStatus } from "../types";
import { addItems, appendLog, removeItems } from "./state";

export type QuestAvailability = "locked" | QuestStatus;

export type QuestEvent =
  | { type: "kill"; targetId: string; amount?: number }
  | { type: "visit"; targetId: string; amount?: number }
  | { type: "talk"; targetId: string; amount?: number };

export interface QuestObjectiveView {
  id: string;
  label: string;
  current: number;
  target: number;
  complete: boolean;
}

export interface QuestProgressView {
  current: number;
  target: number;
  complete: boolean;
  objectives: QuestObjectiveView[];
}

export function getTask(taskId: string): TaskConfig | undefined {
  return tasks.find((task) => task.id === taskId);
}

export function getQuestState(game: GameState, taskId: string): QuestState {
  const state = game.world.tasks[taskId];
  return state
    ? {
        ...state,
        objectiveProgress: state.objectiveProgress ?? {},
      }
    : createAvailableQuestState();
}

export function getQuestAvailability(game: GameState, task: TaskConfig): QuestAvailability {
  const state = getQuestState(game, task.id);
  if (state.status === "accepted" || state.status === "completed") {
    return state.status;
  }
  return areQuestPrerequisitesMet(game, task) ? "available" : "locked";
}

export function areQuestPrerequisitesMet(game: GameState, task: TaskConfig): boolean {
  return (task.prerequisites ?? []).every((prerequisite) => isQuestPrerequisiteMet(game, prerequisite));
}

export function getQuestPrerequisiteHint(game: GameState, task: TaskConfig): string | null {
  const prerequisite = (task.prerequisites ?? []).find((candidate) => !isQuestPrerequisiteMet(game, candidate));
  if (!prerequisite) {
    return null;
  }
  if (prerequisite.type === "quest") {
    const previousTask = getTask(prerequisite.questId);
    return previousTask ? `先完成《${previousTask.title}》` : "先完成前置任务";
  }
  if (prerequisite.type === "cultivation") {
    return `先完成 ${prerequisite.amount} 次聚气`;
  }
  if (prerequisite.type === "realm") {
    return `达到 ${getRealm(prerequisite.realmId).name} 后解锁`;
  }
  if (prerequisite.type === "region") {
    return `前往指定州域后解锁`;
  }
  return prerequisite.joined ? "加入宗门后解锁" : "保持散修身份时可接取";
}

export function getQuestProgress(game: GameState, task: TaskConfig): QuestProgressView {
  const state = getQuestState(game, task.id);
  const completedTask = state.status === "completed";
  const objectives = task.objectives.map((objective) => getQuestObjectiveView(game, state, objective, completedTask));
  const current = objectives.filter((objective) => objective.complete).length;
  return {
    current,
    target: objectives.length,
    complete: completedTask || objectives.every((objective) => objective.complete),
    objectives,
  };
}

export function acceptQuest(game: GameState, taskId: string): GameState {
  const task = getTask(taskId);
  if (!task) {
    return appendLog(game, "任务配置不存在，暂时无法接取。");
  }
  const availability = getQuestAvailability(game, task);
  if (availability === "locked") {
    return appendLog(game, getQuestPrerequisiteHint(game, task) ?? "前置条件尚未满足。");
  }
  if (availability !== "available") {
    return game;
  }
  const previous = getQuestState(game, taskId);
  return appendLog(
    {
      ...game,
      world: {
        ...game.world,
        tasks: {
          ...game.world.tasks,
          [taskId]: {
            ...previous,
            status: "accepted",
            progress: 0,
          },
        },
      },
    },
    `接取任务《${task.title}》。`,
  );
}

export function completeQuest(game: GameState, taskId: string): GameState {
  const task = getTask(taskId);
  if (!task) {
    return appendLog(game, "任务配置不存在，暂时无法结算。");
  }
  const state = getQuestState(game, taskId);
  if (state.status === "completed") {
    return game;
  }
  if (state.status !== "accepted") {
    return appendLog(game, `尚未接取《${task.title}》。`);
  }
  const progress = getQuestProgress(game, task);
  if (!progress.complete) {
    const pending = progress.objectives.find((objective) => !objective.complete);
    return appendLog(game, pending ? `任务条件尚未完成：${pending.label}。` : "任务条件尚未完成。");
  }

  const paid = removeItems(game, getConsumedQuestItems(task));
  const rewarded = addItems(
    {
      ...paid,
      player: {
        ...paid.player,
        spiritStones: paid.player.spiritStones + task.rewards.spiritStones,
      },
      world: {
        ...paid.world,
        sectContribution: paid.world.sectContribution + task.rewards.contribution,
        sectReputation: paid.world.sectReputation + task.rewards.reputation,
        tasks: {
          ...paid.world.tasks,
          [taskId]: {
            ...state,
            status: "completed",
            progress: 1,
          },
        },
      },
    },
    task.rewards.items,
  );
  return appendLog(rewarded, `完成任务《${task.title}》，贡献 +${task.rewards.contribution}。`);
}

export function recordQuestEvent(game: GameState, event: QuestEvent): GameState {
  const eventAmount = Math.max(1, Math.floor(event.amount ?? 1));
  const nextTasks = { ...game.world.tasks };
  let changed = false;

  tasks.forEach((task) => {
    const state = getQuestState(game, task.id);
    if (state.status !== "accepted") {
      return;
    }
    let objectiveProgress = state.objectiveProgress;
    let taskChanged = false;

    task.objectives.forEach((objective) => {
      if (!doesEventMatchObjective(event, objective)) {
        return;
      }
      const target = getObjectiveTarget(objective);
      const current = Math.max(0, Math.floor(objectiveProgress[objective.id] ?? 0));
      const next = Math.min(target, current + eventAmount);
      if (next === current) {
        return;
      }
      objectiveProgress = { ...objectiveProgress, [objective.id]: next };
      taskChanged = true;
    });

    if (taskChanged) {
      nextTasks[task.id] = {
        ...state,
        objectiveProgress,
      };
      changed = true;
    }
  });

  if (!changed) {
    return game;
  }
  return {
    ...game,
    world: {
      ...game.world,
      tasks: nextTasks,
    },
  };
}

export function normalizeQuestStates(questStates: Record<string, QuestState> | undefined): Record<string, QuestState> {
  if (!questStates || typeof questStates !== "object") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(questStates).map(([taskId, state]) => {
      const status: QuestStatus = state?.status === "accepted" || state?.status === "completed" ? state.status : "available";
      const progress = Number.isFinite(state?.progress) ? Math.max(0, Math.floor(state.progress)) : 0;
      const objectiveProgress = Object.fromEntries(
        Object.entries(state?.objectiveProgress ?? {})
          .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
          .map(([objectiveId, value]) => [objectiveId, Math.max(0, Math.floor(value))]),
      );

      if (taskId === "deliver_letter" && progress > 0) {
        objectiveProgress.visit_luoxia_town = Math.max(1, objectiveProgress.visit_luoxia_town ?? 0);
        objectiveProgress.talk_to_luoxia_steward = Math.max(1, objectiveProgress.talk_to_luoxia_steward ?? 0);
      }

      return [
        taskId,
        {
          status,
          progress,
          objectiveProgress,
        },
      ];
    }),
  );
}

export function getQuestStatusLabel(availability: QuestAvailability): string {
  if (availability === "locked") {
    return "未解锁";
  }
  if (availability === "available") {
    return "可接取";
  }
  if (availability === "accepted") {
    return "进行中";
  }
  return "已完成";
}

function createAvailableQuestState(): QuestState {
  return {
    status: "available",
    progress: 0,
    objectiveProgress: {},
  };
}

function isQuestPrerequisiteMet(game: GameState, prerequisite: QuestPrerequisite): boolean {
  if (prerequisite.type === "quest") {
    const status = getQuestState(game, prerequisite.questId).status;
    return prerequisite.status === "accepted" ? status === "accepted" || status === "completed" : status === "completed";
  }
  if (prerequisite.type === "cultivation") {
    return (
      game.player.dailyCultivationCount >= prerequisite.amount ||
      game.player.cultivation >= prerequisite.amount ||
      isRealmAtLeast(game.player.realmId, "qi_middle")
    );
  }
  if (prerequisite.type === "realm") {
    return isRealmAtLeast(game.player.realmId, prerequisite.realmId);
  }
  if (prerequisite.type === "region") {
    return game.world.regionId === prerequisite.regionId;
  }
  return game.world.sectJoined === prerequisite.joined;
}

function getQuestObjectiveView(game: GameState, state: QuestState, objective: QuestObjective, completedTask: boolean): QuestObjectiveView {
  const target = getObjectiveTarget(objective);
  const current = completedTask ? target : Math.min(target, getObjectiveCurrent(game, state, objective));
  return {
    id: objective.id,
    label: objective.label,
    current,
    target,
    complete: current >= target,
  };
}

function getObjectiveCurrent(game: GameState, state: QuestState, objective: QuestObjective): number {
  if (objective.type === "gather") {
    return Math.max(0, game.inventory.items[objective.itemId] ?? 0);
  }
  if (objective.type === "realm") {
    return isRealmAtLeast(game.player.realmId, objective.realmId) ? 1 : 0;
  }
  if (objective.type === "equip") {
    const instanceId = game.inventory.equipment[objective.slot];
    const instance = instanceId ? game.inventory.equipmentItems.find((item) => item.id === instanceId) : undefined;
    return instance && (!objective.itemId || instance.itemId === objective.itemId) ? 1 : 0;
  }
  return Math.max(0, state.objectiveProgress[objective.id] ?? 0);
}

function getObjectiveTarget(objective: QuestObjective): number {
  return objective.type === "gather" || objective.type === "kill" ? Math.max(1, Math.floor(objective.amount)) : 1;
}

function doesEventMatchObjective(event: QuestEvent, objective: QuestObjective): boolean {
  if (event.type === "kill" && objective.type === "kill") {
    return event.targetId === objective.targetId;
  }
  if (event.type === "visit" && objective.type === "visit") {
    return event.targetId === objective.locationId;
  }
  if (event.type === "talk" && objective.type === "talk") {
    return event.targetId === objective.actionId;
  }
  return false;
}

function getConsumedQuestItems(task: TaskConfig): ItemAmount[] {
  const itemAmounts = new Map<string, number>();
  task.objectives.forEach((objective) => {
    if (objective.type !== "gather" || !objective.consumeOnComplete) {
      return;
    }
    itemAmounts.set(objective.itemId, (itemAmounts.get(objective.itemId) ?? 0) + objective.amount);
  });
  return Array.from(itemAmounts, ([itemId, amount]) => ({ itemId, amount }));
}
