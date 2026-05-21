import type { HTMLAttributes, ReactNode } from "react";

export interface GamePanelProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function GamePanel({ title, subtitle, actions, children, className = "", ...props }: GamePanelProps) {
  return (
    <section className={`game-panel ${className}`.trim()} {...props}>
      {title || subtitle || actions ? (
        <div className="game-panel-header">
          <div>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <small>{subtitle}</small> : null}
          </div>
          {actions ? <div className="game-panel-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
