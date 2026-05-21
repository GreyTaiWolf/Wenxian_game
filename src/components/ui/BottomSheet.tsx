import { AnimatePresence, motion } from "motion/react";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
import { GameIcon } from "../GameIcon";
import { sheetMotionTransition } from "../../utils/motion";

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  motionEnabled?: boolean;
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  footer,
  motionEnabled = true,
  className = "",
}: BottomSheetProps) {
  const overlay = <Dialog.Overlay className="bottom-sheet-overlay" />;
  const content = (
    <Dialog.Content className={`bottom-sheet-content ${className}`.trim()}>
      <div className="bottom-sheet-handle" aria-hidden="true" />
      <div className="bottom-sheet-header">
        <div>
          <Dialog.Title className="bottom-sheet-title">{title}</Dialog.Title>
          {subtitle ? <Dialog.Description className="bottom-sheet-subtitle">{subtitle}</Dialog.Description> : null}
        </div>
        <Dialog.Close className="bottom-sheet-close" aria-label="关闭">
          <GameIcon name="action-back" size={18} />
        </Dialog.Close>
      </div>
      <div className="bottom-sheet-body">{children}</div>
      {footer ? <div className="bottom-sheet-footer">{footer}</div> : null}
    </Dialog.Content>
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            {motionEnabled ? (
              <Dialog.Overlay asChild>
                <motion.div
                  className="bottom-sheet-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                />
              </Dialog.Overlay>
            ) : (
              overlay
            )}
            {motionEnabled ? (
              <Dialog.Content asChild>
                <motion.div
                  className={`bottom-sheet-content ${className}`.trim()}
                  initial={{ opacity: 0, y: 28, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 18, scale: 0.99 }}
                  transition={sheetMotionTransition}
                >
                  <div className="bottom-sheet-handle" aria-hidden="true" />
                  <div className="bottom-sheet-header">
                    <div>
                      <Dialog.Title className="bottom-sheet-title">{title}</Dialog.Title>
                      {subtitle ? <Dialog.Description className="bottom-sheet-subtitle">{subtitle}</Dialog.Description> : null}
                    </div>
                    <Dialog.Close className="bottom-sheet-close" aria-label="关闭">
                      <GameIcon name="action-back" size={18} />
                    </Dialog.Close>
                  </div>
                  <div className="bottom-sheet-body">{children}</div>
                  {footer ? <div className="bottom-sheet-footer">{footer}</div> : null}
                </motion.div>
              </Dialog.Content>
            ) : (
              content
            )}
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
