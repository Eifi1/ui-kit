import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * The sticky app header frame: a `brand` slot on the left and an `actions` slot
 * on the right (theme/palette/language controls, account menu, etc.). Domain-free
 * — each app composes its own actions from the shared controls plus its own menus.
 */
export function TopBar({
  brand,
  actions,
  className,
}: {
  brand: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-12 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg-surface)] px-3 md:px-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">{brand}</div>
      <div className="flex items-center gap-1">{actions}</div>
    </header>
  );
}
