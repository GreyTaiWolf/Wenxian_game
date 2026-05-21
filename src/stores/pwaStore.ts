import { create } from "zustand";

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

interface PwaStoreState {
  isOnline: boolean;
  offlineReady: boolean;
  needRefresh: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  installPromptAvailable: boolean;
  isStandalone: boolean;
  registrationError: string | null;
  updateServiceWorker: UpdateServiceWorker | null;
  setOnline: (isOnline: boolean) => void;
  setOfflineReady: (offlineReady: boolean) => void;
  setNeedRefresh: (needRefresh: boolean) => void;
  setInstallPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
  setStandalone: (isStandalone: boolean) => void;
  setRegistrationError: (message: string | null) => void;
  setUpdateServiceWorker: (updateServiceWorker: UpdateServiceWorker) => void;
  promptInstall: () => Promise<boolean>;
  updateNow: () => Promise<void>;
  dismissUpdate: () => void;
}

function getInitialOnlineState(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export const usePwaStore = create<PwaStoreState>((set, get) => ({
  isOnline: getInitialOnlineState(),
  offlineReady: false,
  needRefresh: false,
  installPrompt: null,
  installPromptAvailable: false,
  isStandalone: false,
  registrationError: null,
  updateServiceWorker: null,
  setOnline: (isOnline) => set({ isOnline }),
  setOfflineReady: (offlineReady) => set({ offlineReady }),
  setNeedRefresh: (needRefresh) => set({ needRefresh }),
  setInstallPrompt: (installPrompt) => set({ installPrompt, installPromptAvailable: Boolean(installPrompt) }),
  setStandalone: (isStandalone) => set({ isStandalone }),
  setRegistrationError: (registrationError) => set({ registrationError }),
  setUpdateServiceWorker: (updateServiceWorker) => set({ updateServiceWorker }),
  promptInstall: async () => {
    const prompt = get().installPrompt;
    if (!prompt) {
      return false;
    }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    set({ installPrompt: null, installPromptAvailable: false });
    return choice.outcome === "accepted";
  },
  updateNow: async () => {
    const updateServiceWorker = get().updateServiceWorker;
    if (!updateServiceWorker) {
      return;
    }
    set({ needRefresh: false });
    await updateServiceWorker(true);
  },
  dismissUpdate: () => set({ needRefresh: false }),
}));
