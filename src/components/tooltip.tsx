import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
 *  `side` is a preference rather than an instruction for the PORTALLED variant,
 *  which measures the bubble and turns it round when it would not fit
 *  (Steering Design feedback #126). The CSS-only one never learns its own size,
 *  so there `side` is still the whole of the placement. */
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

/** How close to the viewport edge a bubble may sit. Not zero: a label flush
 *  against the glass reads as clipped even when every character is on screen. */
const TOOLTIP_MARGIN = 4;

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

export interface TooltipSize {
  width: number;
  height: number;
}

export interface TooltipViewport {
  width: number;
  height: number;
}

export interface TooltipPlacement {
  left: number;
  top: number;
  /** Which side it ended up on, which need not be the one that was asked for. */
  side: TooltipSide;
}

const opposite: Record<TooltipSide, TooltipSide> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

/** Whether the bubble clears the viewport edge on `side` of the trigger. */
function roomOn(
  r: AnchorRect,
  side: TooltipSide,
  size: TooltipSize,
  viewport: TooltipViewport,
): boolean {
  switch (side) {
    case "left":
      return r.left - TOOLTIP_GAP - size.width >= TOOLTIP_MARGIN;
    case "right":
      return r.right + TOOLTIP_GAP + size.width <= viewport.width - TOOLTIP_MARGIN;
    case "top":
      return r.top - TOOLTIP_GAP - size.height >= TOOLTIP_MARGIN;
    case "bottom":
      return r.bottom + TOOLTIP_GAP + size.height <= viewport.height - TOOLTIP_MARGIN;
  }
}

function sameRoom(
  a: { size: TooltipSize; viewport: TooltipViewport },
  b: { size: TooltipSize; viewport: TooltipViewport },
): boolean {
  return (
    a.size.width === b.size.width &&
    a.size.height === b.size.height &&
    a.viewport.width === b.viewport.width &&
    a.viewport.height === b.viewport.height
  );
}

function clamp(value: number, low: number, high: number): number {
  // `high` first, so a bubble taller or wider than the viewport is pinned to the
  // top-left corner rather than to the bottom-right one — the start of a label
  // is the half worth keeping.
  return Math.max(low, Math.min(value, high));
}

/**
 * Where the bubble actually goes, given how big it turned out to be.
 *
 * Two rules, and they are separate because they fix separate failures.
 *
 * **Turn round when the preferred side has no room.** `side` says which side of
 * the trigger the label reads best on, and on a form near the left edge of the
 * window that side is off the screen — the capped bubble can only wrap, not
 * move, so what the reader gets is a sentence with its first half outside the
 * glass. Flipped only when the *other* side is genuinely better: a trigger in a
 * viewport too narrow for the bubble either way keeps the side it asked for, and
 * the clamp below does what it can.
 *
 * **Then clamp both axes.** The cross axis is the one that needs it — a `top`
 * bubble is centred on the trigger, so a trigger near the left edge pushes half
 * the label off even though the side it is on is right — and clamping the main
 * axis too costs nothing and covers the flip having nowhere to land.
 *
 * Pure, and measured in viewport pixels throughout, so it can be tested without
 * a layout: the caller supplies the trigger's rect, the bubble's own size and
 * the window.
 */
export function placeTooltip(
  r: AnchorRect,
  side: TooltipSide,
  size: TooltipSize,
  viewport: TooltipViewport,
): TooltipPlacement {
  const chosen =
    roomOn(r, side, size, viewport) || !roomOn(r, opposite[side], size, viewport)
      ? side
      : opposite[side];
  const point = tooltipAnchor(r, chosen);
  const box =
    chosen === "left"
      ? { left: point.left - size.width, top: point.top - size.height / 2 }
      : chosen === "right"
        ? { left: point.left, top: point.top - size.height / 2 }
        : chosen === "top"
          ? { left: point.left - size.width / 2, top: point.top - size.height }
          : { left: point.left - size.width / 2, top: point.top };
  return {
    left: clamp(box.left, TOOLTIP_MARGIN, viewport.width - size.width - TOOLTIP_MARGIN),
    top: clamp(box.top, TOOLTIP_MARGIN, viewport.height - size.height - TOOLTIP_MARGIN),
    side: chosen,
  };
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
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  // The measure + scroll/resize-tracking lifecycle is owned by useAnchoredRect;
  // here we only map the rect to a side-specific anchor point.
  const rect = useAnchoredRect(triggerRef, visible);
  // The bubble's own size and the window it has to fit in — neither of which is
  // knowable in render: the width is whatever the label wrapped to inside the
  // cap, and reading `window` while rendering is not a pure thing to do. Both
  // are taken in a LAYOUT effect, so the correction lands before the browser
  // paints and there is no frame in which the label sits off the screen.
  const [room, setRoom] = useState<{ size: TooltipSize; viewport: TooltipViewport } | null>(null);
  useLayoutEffect(() => {
    const measured = visible ? bubbleRef.current?.getBoundingClientRect() : undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a measurement is the one thing a layout effect is for
    setRoom((previous) => {
      if (!measured) return null;
      const next = {
        size: { width: measured.width, height: measured.height },
        viewport: { width: window.innerWidth, height: window.innerHeight },
      };
      // Only publish what actually CHANGED: every re-measure allocates a fresh
      // object, and a new object on every scroll event would re-render the
      // bubble forever.
      return previous && sameRoom(previous, next) ? previous : next;
    });
  }, [visible, rect, label]);

  const point = rect ? tooltipAnchor(rect, side) : null;
  // Unmeasured on the very first pass, where the anchor point plus the side's
  // own transform is exactly what this always did. One layout effect later the
  // size is known and the placement is decided properly.
  const placed = rect && room ? placeTooltip(rect, side, room.size, room.viewport) : null;

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
        point &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            ref={bubbleRef}
            role="tooltip"
            data-private={redact ? "" : undefined}
            style={
              placed
                ? { position: "fixed", left: placed.left, top: placed.top }
                : {
                    position: "fixed",
                    left: point.left,
                    top: point.top,
                    transform: portalTransformBySide[side],
                  }
            }
            className={cn(TOOLTIP_SURFACE, "pointer-events-none z-50")}
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  );
}
