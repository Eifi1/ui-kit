import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { useAnchoredRect, type AnchorRect } from "../hooks/use-anchored-rect";

type TooltipSide = "top" | "bottom" | "left" | "right";

/** The floating bubble itself. Uses the shared surface/border/text tokens so it
 *  reads as part of the app's chrome (like the top bar and cards) rather than the
 *  cold slate pill it used to be.
 *
 *  `w-max` keeps a short label on one line — the old `whitespace-nowrap` did that
 *  too, but it also let a sentence-length label grow without bound, and a bubble
 *  wider than the space beside its trigger gets clipped by whatever overflow
 *  container it sits in. So cap it and let long text wrap instead. The cap tracks
 *  the viewport as well, for narrow screens where 20rem is already most of it.
 *  Placement is still the caller's job: a capped bubble can only wrap, not move,
 *  so a trigger hard against the right edge wants `side="left"`. */
const TOOLTIP_SURFACE =
  "w-max max-w-[min(20rem,calc(100vw-1rem))] rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] shadow-lg";

const sidePositionClass: Record<TooltipSide, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-1",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-1",
  left: "right-full top-1/2 -translate-y-1/2 mr-1",
  right: "left-full top-1/2 -translate-y-1/2 ml-1",
};

/**
 * Hover/focus label for a control.
 *
 * Two implementations, and the choice matters more than it looks. The default is
 * CSS-only: the bubble is always mounted next to the trigger and fades in on
 * `:hover`, which costs no state and works in a plain render test. The `portal`
 * variant mounts the bubble in `document.body` only while hovered, positioned by
 * measurement.
 *
 * ⚠️ **A bubble that repeats a value has to be redactable.** The consuming app blurs
 * `[data-private]` under a `demo-mode` class on `<html>` — and the portalled bubble is
 * mounted on `document.body`, which is INSIDE that class, so the rule reaches it as
 * long as the bubble is tagged. It is not tagged by default, because most labels are
 * UI strings; pass `redact` on the ones that repeat the user's own data (a truncated
 * payee, an account name, a memo). Getting this wrong is silent: the trigger blurs,
 * the bubble spells the value out on hover.
 *
 * ⚠️ **An empty label renders nothing at all.** `title={payee ?? ""}` is an ordinary
 * shape at a call site that reveals truncated text, and the native attribute answers
 * it by showing no tooltip. A component that faithfully rendered an empty bubble
 * would be a worse `title`, so the emptiness check is here rather than at every call
 * site that could forget it.
 *
 * ⚠️ **Inside a scroll container, use `portal`.** An always-mounted bubble is
 * absolutely positioned, but an absolutely positioned descendant still counts
 * towards its scroll-container ancestor's scrollable overflow — so an invisible
 * bubble on a control near the right edge makes the container scroll sideways
 * with nothing to reveal. That is what Keksdose feedback dev#488 reported on the
 * admin roster: 66px of horizontal scroll on a table that fit, 44px of it owed to
 * tooltips nobody could see. The portalled bubble is `position: fixed` and absent
 * until hovered, so it adds no width — and, being outside the container, it also
 * cannot be clipped by it.
 */
export function Tooltip({
  label,
  side = "top",
  className,
  portal = false,
  redact = false,
  children,
}: {
  label: ReactNode;
  side?: TooltipSide;
  className?: string;
  portal?: boolean;
  /** Tag the bubble `data-private`, for a label that repeats the user's own data. */
  redact?: boolean;
  children: ReactNode;
}) {
  // No label, no bubble — and no wrapper either, so a conditional tooltip costs the
  // layout nothing on the branch where it does not apply.
  if (isEmptyLabel(label)) return <>{children}</>;
  if (portal) {
    return (
      <PortalTooltip
        label={label}
        side={side}
        className={className}
        redact={redact}
      >
        {children}
      </PortalTooltip>
    );
  }
  return (
    <span className={cn("relative inline-flex group/tooltip", className)}>
      {children}
      <span
        role="tooltip"
        data-private={redact ? "" : undefined}
        className={cn(
          TOOLTIP_SURFACE,
          "pointer-events-none absolute z-50 opacity-0 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          sidePositionClass[side],
        )}
      >
        {label}
      </span>
    </span>
  );
}

/** "Would this bubble be blank." Only the values a call site actually produces when
 *  it has nothing to say — `""`, `null`, `undefined`, `false` from a `&&` guard. A
 *  numeric `0` is a real label and stays one. */
function isEmptyLabel(label: ReactNode): boolean {
  return (
    label == null ||
    label === false ||
    (typeof label === "string" && label.trim() === "")
  );
}

const TOOLTIP_GAP = 4;

const portalTransformBySide: Record<TooltipSide, string> = {
  right: "translate(0, -50%)",
  left: "translate(-100%, -50%)",
  top: "translate(-50%, -100%)",
  bottom: "translate(-50%, 0)",
};

/** Anchor point (viewport px) for the tooltip on the given side of `r`. Paired
 *  with {@link portalTransformBySide}, which shifts the box onto that point. */
function tooltipAnchor(
  r: AnchorRect,
  side: TooltipSide,
): { left: number; top: number } {
  switch (side) {
    case "right":
      return { left: r.right + TOOLTIP_GAP, top: r.top + r.height / 2 };
    case "left":
      return { left: r.left - TOOLTIP_GAP, top: r.top + r.height / 2 };
    case "top":
      return { left: r.left + r.width / 2, top: r.top - TOOLTIP_GAP };
    case "bottom":
      return { left: r.left + r.width / 2, top: r.bottom + TOOLTIP_GAP };
  }
}

function PortalTooltip({
  label,
  side,
  className,
  redact,
  children,
}: {
  label: ReactNode;
  side: TooltipSide;
  className?: string;
  redact?: boolean;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  // The measure + scroll/resize-tracking lifecycle is owned by useAnchoredRect;
  // here we only map the rect to a side-specific anchor point.
  const rect = useAnchoredRect(triggerRef, visible);
  const pos = rect ? tooltipAnchor(rect, side) : null;

  return (
    <>
      <span
        ref={triggerRef}
        className={cn("relative inline-flex", className)}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        {children}
      </span>
      {visible &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            role="tooltip"
            data-private={redact ? "" : undefined}
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.top,
              transform: portalTransformBySide[side],
            }}
            className={cn(TOOLTIP_SURFACE, "pointer-events-none z-50")}
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  );
}
