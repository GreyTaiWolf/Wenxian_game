import { qualityGrades } from "./qualityGrades";
import type { ItemGrade } from "../types";

export function buildEquipmentDisplayName(item: { name: string; quality?: ItemGrade; grade?: ItemGrade }): string {
  const quality = qualityGrades[item.quality ?? item.grade ?? "fan"];
  return `${quality.prefix}·${item.name}`;
}
