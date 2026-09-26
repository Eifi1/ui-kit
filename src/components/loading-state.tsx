import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { DEFAULT_COMMON_LABELS, useKitLabels } from "../i18n/kit-labels";
import { Spinner } from "./ui";

export type LoadingStateSize = "sm" | "md" | "lg";

export interface LoadingStateProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "role"> {
  /** The visible words under the spinner, and what the status region announces.
   *  Default: `common.loading` ("Loading…"). */
  label?: ReactNode;
  /** `sm` for a panel or a table body, `md` (default) for a section, `lg` for a page. */
  size?: LoadingStateSize;
  /** Spinner beside the text on one line, rather than above it. */
  inline?: boolean;
}

const SPINNER: Record<LoadingStateSize, string> = { sm: "h-4 w-4", md: "h-8 w-8", lg: "h-10 w-10" };
const TEXT: Record<LoadingStateSize, string> = { sm: "text-xs", md: "text-sm", lg: "text-base" };
const PAD: Record<LoadingStateSize, string> = { sm: "py-4", md: "py-12", lg: "py-20" };

/**
 * A spinner and the words "Loading…", centred where the content will be.
 *
 * kastlan's `LoadingState` (feedback/loading-state.tsx:14), which got the reading
 * right the second time: the WRAPPER is the `role="status"` region and the words are
 * visible text inside it, so the spinner is decorative (`label={null}`) — otherwise
 * the reader hears "Loading… Loading…", one from each.
 */
export function LoadingState({ label, size = "md", inline = false, className, ...rest }: LoadingStateProps) {
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  return (
    <div
      {...rest}
      role="status"
      className={cn(
        "flex items-center justify-center text-center text-[var(--text-muted)]",
        inline ? "gap-2" : "flex-col gap-2",
        PAD[size],
        className,
      )}
    >
      <Spinner label={null} className={SPINNER[size]} />
      <span className={TEXT[size]}>{label ?? common.loading}</span>
    </div>
  );
}
