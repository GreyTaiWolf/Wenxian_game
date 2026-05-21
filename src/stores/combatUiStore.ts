import { create } from "zustand";

interface CombatUiStoreState {
  lastCombatId: string | null;
  selectedSkillId: string | null;
  logsOpen: boolean;
  syncCombat: (combatId: string | null) => void;
  selectSkill: (skillId: string | null) => void;
  clearSelectedSkill: () => void;
  toggleLogs: () => void;
  setLogsOpen: (open: boolean) => void;
}

export const useCombatUiStore = create<CombatUiStoreState>((set) => ({
  lastCombatId: null,
  selectedSkillId: null,
  logsOpen: false,
  syncCombat: (combatId) =>
    set((state) =>
      state.lastCombatId === combatId
        ? state
        : {
            lastCombatId: combatId,
            selectedSkillId: null,
            logsOpen: false,
          },
    ),
  selectSkill: (selectedSkillId) => set({ selectedSkillId }),
  clearSelectedSkill: () => set({ selectedSkillId: null }),
  toggleLogs: () => set((state) => ({ logsOpen: !state.logsOpen })),
  setLogsOpen: (logsOpen) => set({ logsOpen }),
}));
