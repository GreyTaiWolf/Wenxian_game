import GameScreen from "./components/GameScreen";
import MainMenu from "./components/MainMenu";
import { PwaBridge } from "./components/PwaBridge";
import { GameToastProvider } from "./components/ui";
import { useActiveSlot } from "./stores/gameStore";
import { useSaveStore } from "./stores/saveStore";
import { useUiStore } from "./stores/uiStore";

export default function App() {
  const settings = useSaveStore((state) => state.rootSave.settings);
  const screen = useUiStore((state) => state.screen);
  const activeSlot = useActiveSlot();

  return (
    <GameToastProvider motionEnabled={settings.motion}>
      <PwaBridge />
      <div className={`app-frame text-${settings.textSize} ${settings.motion ? "motion-on" : "motion-off"}`}>
        {screen === "menu" || !activeSlot ? (
          <MainMenu />
        ) : (
          <GameScreen />
        )}
      </div>
    </GameToastProvider>
  );
}
