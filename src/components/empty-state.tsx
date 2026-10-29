import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "../lib/cn";

export interface EmptyStateProps extends Omit<ComponentPropsWithRef<"div">, "children" | "title"> {
  /** The box renders `title` and `hint` in its own two-line rhythm, which is what makes
   *  every empty state in three apps look like the same thing — so there is no
   *  `children` slot to put arbitrary content in. The two slots below are the only
   *  other things an empty state has turned out to need, and each has a fixed place. */
  /** Nodes rather than strings, so a title can carry a code, a link or an emphasised
   *  word — keksdose's error boundary shows the error's name in `<code>` — while the
   *  box still sets the type. */
  title: ReactNode;
  hint?: ReactNode;
  /**
   * Render the title as a heading of this level. Left out it is a `<div>`, as before:
   * most empty states are a message inside a section that already has its heading.
   * keksdose's error boundary IS the page when it trips, and its `<h2>` went missing
   * when it moved onto EmptyState — so the page's heading outline lost the one line
   * that says what happened. Only the element changes; the look is the box's.
   * `h1` (0.42.0) for an empty state that is the whole page — `AdminForbidden`.
   */
  headingAs?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  /** A glyph ABOVE the title — kastlan's InboxEmptyState (an inbox), keksdose's
   *  offline card (a cloud with a slash). Sized by the box (`[&_svg]:size-8`) and
   *  muted, so five call sites cannot pick five sizes; hidden from assistive tech,
   *  because the title already says what it shows. */
  icon?: ReactNode;
  /** What to do about it, BELOW the hint: keksdose's query-state cards (Retry), its
   *  error boundary (Retry / Reload / Go home — pass all three in a fragment, they
   *  wrap and centre as one row), kastlan's "Create a rule". Buttons or links the
   *  caller renders; the box only places them. */
  action?: ReactNode;
  /**
   * `box` (default): the dashed, padded card that stands in for a whole section.
   * `inline`: one quiet line with no box — for the empty state INSIDE something that
   * already has its own frame, where a dashed card would be a box in a box. keksdose
   * writes that line by hand five times as a muted `<p className="py-6 text-center">`:
   * the notification inbox (notification-inbox:140), a support thread
   * (support-thread:144), the assistant (assistant-page:321), the admin support panel
   * (support-panel:265) and the funding dialog (funding-dialog:89). The icon shrinks
   * to the text's size and sits before the title, the hint follows on the same line,
   * and the row wraps only when it must. Centred like the box; `className="justify-start"`
   * for a list that reads from the start edge (funding-dialog).
   */
  variant?: "box" | "inline";
  /**
   * Colour the icon and the title: `danger` for an error standing where the content
   * should be — kastlan's ErrorState (shared/components/feedback/error-state.tsx) and
   * its error boundary's fallback (error-boundary.tsx:16), both a red triangle over a
   * message — and `success` for an empty state that is GOOD news, kastlan's "No defects
   * recorded for this room" (handover defects-step.tsx:142, a green check). Left out,
   * both stay muted. The hint stays muted either way: it is the explanation, not the
   * verdict.
   */
  tone?: "danger" | "success";
  /**
   * `inline` only (0.11.0). `sm`: 12px, start-aligned and tight (`py-1`) — the empty
   * line INSIDE a detail panel, under a panel heading and among `text-xs` rows, where
   * the default's 14px centred line with `py-4` read as a section of its own.
   * keksdose's holdings panel (holdings-panel:563), asset-loan panel
   * (asset-loan-panel:108) and loan-payment panel (loan-payment-panel:191) each wrote
   * `className="justify-start py-1"` over it and still got body-size text. Default `md`,
   * the look it had. Ignored by the box.
   */
  size?: "sm" | "md";
}

const EMPTY_STATE_TONE: Record<"danger" | "success", string> = {
  danger: "text-danger",
  success: "text-success",
};

export function EmptyState({
  title,
  hint,
  icon,
  action,
  headingAs,
  variant = "box",
  tone,
  size = "md",
  className,
  ...rest
}: EmptyStateProps) {
  const Title = headingAs ?? "div";
  const toneClass = tone ? EMPTY_STATE_TONE[tone] : undefined;
  const hasHint = hint != null && hint !== false && hint !== "";
  if (variant === "inline") {
    const sm = size === "sm";
    return (
      <div
        {...rest}
        className={cn(
          "flex flex-wrap items-center text-muted",
          sm
            ? "justify-start gap-x-1.5 gap-y-0.5 py-1 text-start text-xs"
            : "justify-center gap-x-2 gap-y-1 py-4 text-center text-sm",
          className,
        )}
      >
        {icon != null && (
          <span
            aria-hidden
            className={cn("flex text-placeholder", sm ? "[&_svg]:size-3.5" : "[&_svg]:size-4", toneClass)}
          >
            {icon}
          </span>
        )}
        {/* No weight of its own: one muted line is what these sites were, and a
            bold title would turn a quiet "nothing here" into a heading. */}
        <Title className={cn(sm ? "text-xs" : "text-sm", toneClass)}>{title}</Title>
        {hasHint && <span className="text-xs">{hint}</span>}
        {action != null && <span className="flex flex-wrap items-center gap-2">{action}</span>}
      </div>
    );
  }
  return (
    <div
      {...rest}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-strong bg-surface-2 px-4 py-10 text-center text-sm text-muted",
        className,
      )}
    >
      {icon != null && (
        <div aria-hidden className={cn("mb-3 text-placeholder [&_svg]:size-8", toneClass)}>
          {icon}
        </div>
      )}
      {/* `text-sm`: a heading keeps the box's size, not whatever a stylesheet gives h2. */}
      <Title className={cn("text-sm font-medium text-secondary", toneClass)}>{title}</Title>
      {hasHint && <div className="mt-1 text-xs">{hint}</div>}
      {action != null && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
