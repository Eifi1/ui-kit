import type { ComponentPropsWithRef } from "react";
import { cn } from "../lib/cn";
import { DEFAULT_COMMON_LABELS, useKitLabels } from "../i18n/kit-labels";

/** A `<span>`'s props plus the words a reader hears — see {@link CardHeaderProps}.
 *  The ring is drawn with a border, so there is nothing inside it to put children in. */
export interface SpinnerProps extends Omit<ComponentPropsWithRef<"span">, "children"> {
  /**
   * What the spinner means, for a screen reader. Default: `common.loading` from the
   * {@link UiKitProvider}, else "Loading…".
   *
   * `null` makes it DECORATIVE — no role, no text, hidden from assistive tech. Use it
   * whenever words are already there: beside visible "Loading…" text (otherwise it is
   * announced twice), inside a labelled button (otherwise its text joins the button's
   * name), or inside a live region of the app's own (otherwise that region and this
   * one both announce).
   */
  label?: string | null;
  /**
   * Show the label as TEXT beside the ring, not only to a screen reader. kastlan's
   * LoadingState (feedback/loading-state.tsx:14) builds exactly this by hand — a
   * `role="status"` wrapper, the spinner at `label={null}`, a `<p>` of text — so it
   * has to get the three-part aria arrangement right itself. Here the visible text IS
   * the live region's content (the label stays the accessible name, said once), and
   * the ring is decorative. `className` still sizes the ring; the other props go on
   * the wrapper. Ignored with `label={null}`: there are no words to show.
   */
  showLabel?: boolean;
  /** Where the shown label sits: `end` (default) — beside the ring, for a row or a
   *  button; `below` — under it, centred, for a panel's loading state. */
  labelPosition?: "end" | "below";
}

/**
 * A spinning ring that also SAYS it is loading.
 *
 * It used to be a bordered span and nothing else, so a reader met no element at all
 * where a sighted user saw the page working — or, beside an emptied list, met the
 * empty list and concluded there was nothing there. `role="status"` makes it a polite
 * live region, and the text inside is what that region announces. Text rather than
 * `aria-label`: a live region's announcement is its CONTENT, and several readers
 * ignore a name on one.
 *
 * `relative` so the `sr-only` text has a local containing block (see
 * sr-only-containment.test). Where the words are already on screen, pass
 * `label={null}`: announcing is right for a spinner standing alone and wrong for one
 * beside text, inside a button, or inside the app's own live region.
 */
export function Spinner({ className, label, showLabel, labelPosition = "end", ...rest }: SpinnerProps) {
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS, {
    loading: label ?? undefined,
  });
  const ring = cn(
    "relative inline-block h-5 w-5 animate-spin rounded-full border-2 border-subtle border-t-[var(--text-primary)]",
    className,
  );
  if (label === null) return <span aria-hidden {...rest} className={ring} />;
  if (showLabel) {
    return (
      <span
        role="status"
        {...rest}
        className={cn(
          "inline-flex items-center text-sm text-secondary",
          labelPosition === "below" ? "flex-col gap-2 text-center" : "gap-2",
        )}
      >
        <span aria-hidden className={ring} />
        <span>{common.loading}</span>
      </span>
    );
  }
  return (
    <span role="status" {...rest} className={ring}>
      {/* The trailing space is a separator for the case the caller forgot `label={null}`
          inside a button: a name is the concatenation of its text, and without it the
          spinner's word ran straight into the button's — "Loadingconfirm". */}
      <span className="sr-only">{common.loading} </span>
    </span>
  );
}
