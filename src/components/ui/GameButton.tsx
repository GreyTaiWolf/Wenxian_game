import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type GameButtonVariant = "primary" | "ghost" | "danger" | "gold" | "icon";

export interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GameButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
}

export const GameButton = forwardRef<HTMLButtonElement, GameButtonProps>(function GameButton(
  { className = "", variant = "primary", loading = false, disabled, icon, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`game-button game-button-${variant} ${loading ? "is-loading" : ""} ${className}`.trim()}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {icon ? <span className="game-button-leading">{icon}</span> : null}
      {children ? <span className="game-button-label">{children}</span> : null}
    </button>
  );
});
