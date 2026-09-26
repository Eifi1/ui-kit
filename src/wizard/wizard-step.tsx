import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface WizardStepProps {
  children: ReactNode;
  className?: string;
  /**
   * The step's heading ("Choose a unit"), drawn in the one style every step shares.
   * kastlan's steps each hand-wrote `<h3 className="text-lg font-semibold">` (about
   * sixteen of them: lease-picker-step, lease-unit-step, …), and a hand-written
   * heading is one that drifts — a size here, a colour there. Omitted: no heading.
   */
  title?: ReactNode;
  /** The line under the title: what the step asks for, or why. Rendered only with a
   *  `title` or on its own when there is none. */
  description?: ReactNode;
  /** The heading's level. Default 3: the page has its `h1` and the wizard's own
   *  chrome sits at `h2` (the review step, the cancel dialog), so a step is under it. */
  headingLevel?: 2 | 3 | 4;
}

const HEADING = { 2: "h2", 3: "h3", 4: "h4" } as const;

/** The vertical rhythm one wizard step's content sits on. A component rather
 *  than a class string so every step in every app spaces its fields the same —
 *  and, with `title` / `description`, heads them the same. */
export function WizardStep({
  children,
  className,
  title,
  description,
  headingLevel = 3,
}: WizardStepProps) {
  const hasTitle = title !== undefined && title !== null && title !== false && title !== "";
  const hasDescription =
    description !== undefined && description !== null && description !== false && description !== "";
  const Heading = HEADING[headingLevel];
  return (
    <div className={cn("space-y-6", className)}>
      {(hasTitle || hasDescription) && (
        <div data-slot="wizard-step-header" className="space-y-1">
          {hasTitle && (
            <Heading className="text-lg font-semibold text-[var(--text-primary)]">{title}</Heading>
          )}
          {hasDescription && <p className="text-sm text-[var(--text-muted)]">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
