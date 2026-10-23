import { useContext, useId } from "react";
import type { ReactElement } from "react";
import { Compass } from "lucide-react";
import { Button } from "../components/button";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { useTourOptional, type TourAt } from "./tour";
import { TourInternalContext } from "./tour-gates";
import { DEFAULT_TOUR_GUIDE_LABELS, type TourGuideLabels } from "./tour-guide-labels";

export { DEFAULT_TOUR_GUIDE_LABELS };
export type { TourGuideLabels };

export interface TourGuideButtonProps {
  /** The tour id handed to the provider's `launch`. */
  tour: string;
  /** Usually the form's first in-form anchor (`start(tour, { at })`). */
  at?: TourAt;
  /** Default `"ghost"`. */
  variant?: "ghost" | "secondary";
  /** Default `"sm"`. */
  size?: "sm" | "md";
  labels?: LabelOverride<TourGuideLabels>;
  className?: string;
}

/**
 * "Guide me" inside a form (docs/tours-harmonization.md §11.5): starts the tour `tour` by id,
 * at `at`, through `TourProvider`'s `launch` — the run starts inside the open form, with no
 * intro and no Back past `at`, and counts as completing the tour (Marcel, Q2).
 *
 * A decoration: it renders nothing without a provider, without `launch`, or while a tour
 * runs. Place it in the form's header or in `FormActions`' `start` slot.
 */
export function TourGuideButton({
  tour,
  at,
  variant = "ghost",
  size = "sm",
  labels,
  className,
}: TourGuideButtonProps): ReactElement | null {
  const engine = useTourOptional();
  const internals = useContext(TourInternalContext);
  const words = useKitLabels("tourGuide", DEFAULT_TOUR_GUIDE_LABELS, labels);
  const descriptionId = useId();
  if (!engine || !internals?.canLaunch || engine.active) return null;
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        aria-describedby={descriptionId}
        onClick={() => engine.start(tour, { at })}
      >
        <Compass className="size-4" aria-hidden="true" />
        {words.label}
      </Button>
      <span id={descriptionId} hidden>
        {words.description}
      </span>
    </>
  );
}
