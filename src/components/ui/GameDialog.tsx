import { AnimatePresence, motion } from "motion/react";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
import { GameIcon } from "../GameIcon";
import { sheetMotionTransition } from "../../utils/motion";

export interface GameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  motionEnabled?: boolean;
  className?: string;
}

export function GameDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  footer,
  motionEnabled = true,
  className = "",
}: GameDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              {motionEnabled ? (
                <motion.div
                  className="game-dialog-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                />
              ) : (
                <div className="game-dialog-overlay" />
              )}
            </Dialog.Overlay>
            <Dialog.Content asChild>
              {motionEnabled ? (
                <motion.div
                  className={`game-dialog-content ${className}`.trim()}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.99 }}
                  transition={sheetMotionTransition}
                >
                  <DialogChrome title={title} subtitle={subtitle} footer={footer}>
                    {children}
                  </DialogChrome>
                </motion.div>
              ) : (
                <div className={`game-dialog-content ${className}`.trim()}>
                  <DialogChrome title={title} subtitle={subtitle} footer={footer}>
                    {children}
                  </DialogChrome>
                </div>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function DialogChrome({
  title,
  subtitle,
  footer,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="game-dialog-header">
        <div>
          <Dialog.Title className="game-dialog-title">{title}</Dialog.Title>
          {subtitle ? <Dialog.Description className="game-dialog-subtitle">{subtitle}</Dialog.Description> : null}
        </div>
        <Dialog.Close className="game-dialog-close" aria-label="关闭">
          <GameIcon name="action-back" size={18} />
        </Dialog.Close>
      </div>
      <div className="game-dialog-body">{children}</div>
      {footer ? <div className="game-dialog-footer">{footer}</div> : null}
    </>
  );
}
