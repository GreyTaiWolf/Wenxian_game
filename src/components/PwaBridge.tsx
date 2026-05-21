import { useEffect, useRef } from "react";
import { registerPwa } from "../pwa/registerPwa";
import { usePwaStore } from "../stores/pwaStore";
import { useGameToast } from "./ui";

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean(navigator.standalone));
}

export function PwaBridge() {
  const { notify } = useGameToast();
  const offlineReady = usePwaStore((state) => state.offlineReady);
  const needRefresh = usePwaStore((state) => state.needRefresh);
  const registrationError = usePwaStore((state) => state.registrationError);
  const setOnline = usePwaStore((state) => state.setOnline);
  const setInstallPrompt = usePwaStore((state) => state.setInstallPrompt);
  const setStandalone = usePwaStore((state) => state.setStandalone);
  const offlineReadyNotified = useRef(false);
  const needRefreshNotified = useRef(false);
  const registerErrorNotified = useRef<string | null>(null);

  useEffect(() => {
    registerPwa();
  }, []);

  useEffect(() => {
    const updateOnlineState = () => {
      const nextOnline = navigator.onLine;
      setOnline(nextOnline);
      notify({
        title: nextOnline ? "网络已恢复" : "已离线，可继续游玩。",
        tone: nextOnline ? "success" : "gold",
      });
    };
    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setStandalone(true);
      notify({ title: "已安装到桌面", tone: "success" });
    };

    setOnline(navigator.onLine);
    setStandalone(isStandaloneDisplay());
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [notify, setInstallPrompt, setOnline, setStandalone]);

  useEffect(() => {
    if (!offlineReady || offlineReadyNotified.current) {
      return;
    }
    offlineReadyNotified.current = true;
    notify({ title: "离线游玩已准备", description: "断网后也能继续修行。", tone: "success" });
  }, [notify, offlineReady]);

  useEffect(() => {
    if (!needRefresh || needRefreshNotified.current) {
      return;
    }
    needRefreshNotified.current = true;
    notify({ title: "新版本已准备", description: "可在设置里立即更新。", tone: "gold" });
  }, [notify, needRefresh]);

  useEffect(() => {
    if (!registrationError || registerErrorNotified.current === registrationError) {
      return;
    }
    registerErrorNotified.current = registrationError;
    notify({ title: "离线缓存未启动", description: registrationError, tone: "danger" });
  }, [notify, registrationError]);

  return null;
}
