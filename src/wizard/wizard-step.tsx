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
  /**
   * Controls for the step as a whole, at the end of the header row beside the title —
   * kastlan 43: the buildings step's "Add building" had nowhere to go but UNDER the
   * list it adds to, where it falls below the fold once there are three buildings.
   * A header action is where every other kit surface (`PageHeader`, `Card`) puts it.
   *
   * Wraps under the title on a narrow screen rather than squeezing it. Renders the
   * header on its own if there is no `title` either.
   */
  actions?: ReactNode;
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
  actions,
}: WizardStepProps) {
  const hasTitle = title !== undefined && title !== null && title !== false && title !== "";
  const hasDescription =
    description !== undefined && description !== null && description !== false && description !== "";
  const hasActions = actions !== undefined && actions !== null && actions !== false && actions !== "";
  const Heading = HEADING[headingLevel];
  const heading = (
    <>
      {hasTitle && <Heading className="text-lg font-semibold text-[var(--text-primary)]">{title}</Heading>}
      {hasDescription && <p className="text-sm text-[var(--text-muted)]">{description}</p>}
    </>
  );
  return (
    <div className={cn("space-y-6", className)}>
      {hasActions ? (
        // One row: the text takes the room, the actions keep their width at the end
        // and wrap below it when there is not enough — `basis-64` is the width the
        // title asks for before that happens (a zero basis would never wrap and
        // squeeze the title to a word a line instead). `items-start` so a two-line
        // description does not pull the button down to its middle; `ms-auto` keeps
        // the actions at the end with no title, and when they wrap.
        <div data-slot="wizard-step-header" className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          {(hasTitle || hasDescription) && <div className="min-w-0 grow basis-64 space-y-1">{heading}</div>}
          <div data-slot="wizard-step-actions" className="ms-auto flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        </div>
      ) : (
        // Without actions the header is exactly what it was, so a step that passes
        // none renders as before.
        (hasTitle || hasDescription) && (
          <div data-slot="wizard-step-header" className="space-y-1">
            {heading}
          </div>
        )
      )}
      {children}
    </div>
  );
}
