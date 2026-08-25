import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/** The vertical rhythm one wizard step's content sits on. A component rather
 *  than a class string so every step in every app spaces its fields the same. */
export function WizardStep({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}
