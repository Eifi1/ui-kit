import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../lib/cn";

export interface SeparatorProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "role"> {
  orientation?: "horizontal" | "vertical";
  /**
   * `false` (default, as in Radix): a real `role="separator"`, which a reader
   * announces — right between groups of controls, a menu's sections, a toolbar's
   * halves. `true`: a line for the eye only (`role="none"`), for a divider that
   * separates nothing the structure does not already separate.
   */
  decorative?: boolean;
}

/**
 * A hairline between two things.
 *
 * kastlan's other Radix leftover. `aria-orientation` is set only when vertical:
 * horizontal is the role's default, and stating a default is noise in every reader's
 * verbose mode.
 */
export function Separator({ orientation = "horizontal", decorative = false, className, ...rest }: SeparatorProps) {
  const vertical = orientation === "vertical";
  return (
    <div
      {...rest}
      role={decorative ? "none" : "separator"}
      aria-orientation={!decorative && vertical ? "vertical" : undefined}
      data-orientation={orientation}
      className={cn(
        "shrink-0 bg-[var(--border)]",
        vertical ? "w-px self-stretch" : "h-px w-full",
        className,
      )}
    />
  );
}
