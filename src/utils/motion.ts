import type { SettingsState } from "../types";

export type MotionPreference = Pick<SettingsState, "motion"> | boolean | null | undefined;

export function isMotionEnabled(settings: MotionPreference): boolean {
  if (typeof settings === "boolean") {
    return settings;
  }
  return settings?.motion ?? true;
}

export const pageMotionTransition = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
} as const;

export const sheetMotionTransition = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1],
} as const;
