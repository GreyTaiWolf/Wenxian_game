import { registerSW } from "virtual:pwa-register";
import { usePwaStore } from "../stores/pwaStore";

let didRegister = false;

export function registerPwa(): void {
  if (didRegister || typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  didRegister = true;

  const updateServiceWorker = registerSW({
    immediate: false,
    onOfflineReady() {
      usePwaStore.getState().setOfflineReady(true);
    },
    onNeedRefresh() {
      usePwaStore.getState().setNeedRefresh(true);
    },
    onRegisterError(error) {
      usePwaStore.getState().setRegistrationError(error instanceof Error ? error.message : String(error));
    },
  });

  usePwaStore.getState().setUpdateServiceWorker(updateServiceWorker);
  void navigator.serviceWorker.ready.then(() => {
    usePwaStore.getState().setOfflineReady(true);
  });
}
