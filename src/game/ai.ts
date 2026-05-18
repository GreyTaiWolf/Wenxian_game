import { getSkill, getSkillsForUser } from "../data/skills";
import type { CombatActor, CombatState, SkillConfig } from "../types";

export interface AiChoice {
  skillId: string;
  targetId?: string;
}

function alive(actors: CombatActor[]): CombatActor[] {
  return actors.filter((actor) => actor.hp > 0);
}

function weightedPick(skills: SkillConfig[]): SkillConfig {
  const total = skills.reduce((sum, skill) => sum + skill.weight, 0);
  let cursor = Math.random() * total;
  for (const skill of skills) {
    cursor -= skill.weight;
    if (cursor <= 0) {
      return skill;
    }
  }
  return skills[0];
}

function chooseTarget(skill: SkillConfig, actor: CombatActor, combat: CombatState): string | undefined {
  const allies = actor.side === "ally" ? alive(combat.allies) : alive(combat.enemies);
  const enemies = actor.side === "ally" ? alive(combat.enemies) : alive(combat.allies);

  if (skill.targetType === "self") {
    return actor.id;
  }
  if (skill.targetType === "enemySingle") {
    const sorted = [...enemies].sort((a, b) => a.hp - b.hp);
    return sorted[0]?.id;
  }
  if (skill.targetType === "allySingle") {
    const wounded = [...allies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    return wounded[0]?.id;
  }
  return undefined;
}

function skillHasUsefulTarget(skill: SkillConfig, actor: CombatActor, combat: CombatState): boolean {
  if (skill.effectType === "heal") {
    const allies = actor.side === "ally" ? alive(combat.allies) : alive(combat.enemies);
    return allies.some((ally) => ally.hp < ally.maxHp * 0.72);
  }
  return chooseTarget(skill, actor, combat) !== undefined || skill.targetType.endsWith("All");
}

export function chooseAiAction(actor: CombatActor, combat: CombatState): AiChoice {
  const legalSkills = getSkillsForUser(actor.kind, actor.skillIds).filter((skill) => {
    return actor.spirit >= skill.spiritCost && skillHasUsefulTarget(skill, actor, combat);
  });

  const fallbackId = actor.kind === "beast" || actor.kind === "pet" ? "bite" : "basic_strike";
  const skill = legalSkills.length ? weightedPick(legalSkills) : getSkill(fallbackId);
  return {
    skillId: skill.id,
    targetId: chooseTarget(skill, actor, combat),
  };
}
