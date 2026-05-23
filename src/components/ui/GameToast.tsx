import type { ReactNode } from "react";
import { Toast } from "radix-ui";
import { useUiStore, type GameToastTone } from "../../stores/uiStore";
import type { ItemGrade } from "../../types";

export interface GameToastInput {
  title: string;
  description?: string;
  tone?: GameToastTone;
  grade?: ItemGrade;
}

export function GameToastProvider({
  children,
  motionEnabled = true,
}: {
  children: ReactNode;
  motionEnabled?: boolean;
}) {
  const messages = useUiStore((state) => state.toastQueue);
  const dismissToast = useUiStore((state) => state.dismissToast);

  return (
    <Toast.Provider swipeDirection="down" duration={2400}>
      {children}
      {messages.map((toast) => (
        <Toast.Root
          key={toast.id}
          className={`game-toast game-toast-${toast.tone} ${toast.grade ? `game-toast-grade grade-card grade-${toast.grade}` : ""} ${motionEnabled ? "toast-motion-on" : "toast-motion-off"}`.trim()}
          defaultOpen
          onOpenChange={(open) => {
            if (!open) {
              dismissToast(toast.id);
            }
          }}
        >
          <Toast.Title className="game-toast-title">{toast.title}</Toast.Title>
          {toast.description ? <Toast.Description className="game-toast-description">{toast.description}</Toast.Description> : null}
        </Toast.Root>
      ))}
      <Toast.Viewport className="game-toast-viewport" />
    </Toast.Provider>
  );
}

export function useGameToast() {
  const notify = useUiStore((state) => state.notify);
  return { notify };
}
