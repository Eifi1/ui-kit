import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { DEFAULT_COMMON_LABELS, useKitLabels } from "../i18n/kit-labels";
import { Spinner } from "./ui";

export type LoadingStateSize = "sm" | "md" | "lg";

/** Whether {@link LoadingStateProps.label} shows, or is only read out. */
export type LoadingStateLabelVisibility = "visible" | "sr-only";

export interface LoadingStateProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "role"> {
  /** The visible words under the spinner, and what the status region announces.
   *  Default: `common.loading` ("Loading…"). `null` (or `""`) hides the words — the
   *  same as `labelVisibility="sr-only"` with the default text, so the region still
   *  announces "Loading…" rather than nothing. */
  label?: ReactNode;
  /**
   * `sr-only`: the spinner alone shows, the label is still the status region's words
   * for a screen reader — a busy row or a bubble where "Loading…" in print is noise.
   * Default `visible`.
   */
  labelVisibility?: LoadingStateLabelVisibility;
  /** `sm` for a panel or a table body, `md` (default) for a section, `lg` for a page. */
  size?: LoadingStateSize;
  /**
   * Less room above and below, the size's spinner and text unchanged — `md` at `py-8`
   * instead of `py-12` (`sm` `py-2`, `lg` `py-12`): the step between a panel and a
   * section, for a card body that `md` makes look empty rather than loading.
   */
  compact?: boolean;
  /** Spinner beside the text on one line, rather than above it. */
  inline?: boolean;
}

const SPINNER: Record<LoadingStateSize, string> = { sm: "h-4 w-4", md: "h-8 w-8", lg: "h-10 w-10" };
const TEXT: Record<LoadingStateSize, string> = { sm: "text-xs", md: "text-sm", lg: "text-base" };
const PAD: Record<LoadingStateSize, string> = { sm: "py-4", md: "py-12", lg: "py-20" };
const PAD_COMPACT: Record<LoadingStateSize, string> = { sm: "py-2", md: "py-8", lg: "py-12" };

/**
 * A spinner and the words "Loading…", centred where the content will be.
 *
 * kastlan's `LoadingState` (feedback/loading-state.tsx:14), which got the reading
 * right the second time: the WRAPPER is the `role="status"` region and the words are
 * visible text inside it, so the spinner is decorative (`label={null}`) — otherwise
 * the reader hears "Loading… Loading…", one from each.
 */
export function LoadingState({
  label,
  labelVisibility = "visible",
  size = "md",
  compact = false,
  inline = false,
  className,
  ...rest
}: LoadingStateProps) {
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  // `null` / `""` used to fall through `??` to a printed "Loading…" (null) or leave a
  // silent region (""): both now mean "no words on screen", and the region keeps the
  // default words to announce — a status region with nothing in it says nothing.
  const hidden = label === null || label === "" || labelVisibility === "sr-only";
  const words = label === null || label === undefined || label === "" ? common.loading : label;
  return (
    <div
      {...rest}
      role="status"
      className={cn(
        "flex items-center justify-center text-center text-[var(--text-muted)]",
        inline ? "gap-2" : "flex-col gap-2",
        (compact ? PAD_COMPACT : PAD)[size],
        className,
      )}
    >
      <Spinner label={null} className={SPINNER[size]} />
      <span className={hidden ? "sr-only" : TEXT[size]}>{words}</span>
    </div>
  );
}
