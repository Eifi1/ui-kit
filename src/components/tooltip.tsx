import {
  cloneElement,
  isValidElement,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { useEscapeKey } from "../hooks/use-dismiss";
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
 * `extends ComponentPropsWithoutRef<"span">` because the wrapper this renders IS a span,
 * and a tooltip is the component a caller most often needs to reach past: it sits
 * between the layout and the control, so a `data-tour` anchor, a test id or an
 * `aria-label` aimed at the trigger used to be swallowed by it.
 *
 * ⚠️ On the empty-label branch there is no wrapper at all, and therefore nothing for
 * those attributes to land on — see the note in the body.
 */
export interface TooltipProps extends ComponentPropsWithoutRef<"span"> {
  label: ReactNode;
  side?: TooltipSide;
  className?: string;
  portal?: boolean;
  /** Tag the bubble `data-private`, for a label that repeats the user's own data. */
  redact?: boolean;
  children: ReactNode;
}

/** What each variant below takes: the resolved `side`, and every span attribute the
 *  caller handed {@link Tooltip}, forwarded to that variant's own wrapper. */
type TooltipVariantProps = Omit<TooltipProps, "side" | "portal"> & { side: TooltipSide };

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
 * ⚠️ **The bubble describes its trigger, which means cloning it.** `role="tooltip"` is
 * a name for a box, not a relationship — so for as long as nothing referenced the
 * bubble, the label reached the pointer and nobody else. That is worst on the call
 * sites that need it most: the kit's icon-only buttons, where the tooltip IS the
 * label. `aria-describedby` has to sit on the focusable element, which is the
 * caller's child and not this component's wrapper, so the child is CLONED to carry
 * it. A description the caller already set is appended to, never replaced — a field's
 * error text and its hint bubble both describe it. Children that cannot take props (a
 * fragment, a bare string, several elements) are left exactly as they were.
 *
 * ⚠️ **Escape dismisses it (WCAG 1.4.13).** Anything that appears on hover or focus has
 * to be dismissible without moving the pointer, and a bubble is opaque: it lands over
 * the row, field or figure you were reading, and the only way out of it used to be to
 * point somewhere else — which is precisely what you cannot do when what you need to
 * read is underneath it. The listener is the document's rather than the wrapper's
 * because the pointer opens this with the keyboard focus somewhere else entirely, and
 * it is subscribed only while a bubble is actually up: the CSS variant is always
 * mounted, and a table of forty tooltips must not mean forty keydown listeners.
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
  ...rest
}: TooltipProps) {
  // No label, no bubble — and no wrapper either, so a conditional tooltip costs the
  // layout nothing on the branch where it does not apply. `...rest` goes with the
  // wrapper on this branch, which is the documented limit of the pass-through: there is
  // no element left to put an attribute on.
  if (isEmptyLabel(label)) return <>{children}</>;
  if (portal) {
    return (
      <PortalTooltip
        label={label}
        side={side}
        className={className}
        redact={redact}
        {...rest}
      >
        {children}
      </PortalTooltip>
    );
  }
  // Both variants are separate components so that `Tooltip` itself can keep calling NO
  // hooks: the empty-label branch above returns before either of them, and a hook after
  // a conditional return is a hooks-order bug rather than a style violation.
  return (
    <CssTooltip label={label} side={side} className={className} redact={redact} {...rest}>
      {children}
    </CssTooltip>
  );
}

/** The always-mounted variant: the bubble sits next to the trigger and CSS fades it in.
 *
 *  It holds the little state it does for the two things CSS cannot express — which
 *  element to point `aria-describedby` at, and Escape — and not for the fade, which is
 *  still `group-hover`/`group-focus-within` and still costs a render nothing. */
function CssTooltip({
  label,
  side,
  className,
  redact,
  children,
  ...rest
}: TooltipVariantProps) {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEscapeKey(() => setDismissed(true), (hovered || focused) && !dismissed);
  return (
    <span
      // `...rest` first: the four handlers below are what decides whether a bubble is
      // up, and a caller passing an `onFocus` of its own must not replace them.
      {...rest}
      className={cn("relative inline-flex group/tooltip", className)}
      // These four track WHETHER A BUBBLE IS UP. They activate nothing — the only thing
      // here that can be activated is the caller's child, which keeps every handler it
      // arrived with — so this wrapper needs no role and no key handling of its own.
      // `jsx-a11y/no-static-element-interactions` warns about it all the same, as it
      // already does about the portal variant's identical trigger below; both are left
      // visible rather than silenced, because a rule this package ratchets should be
      // argued with in the backlog and not in a disable comment.
      //
      // Re-armed by the next hover or focus rather than by an effect watching those
      // flags: coming back to a trigger is a fresh request for its label, and an effect
      // would also re-show the bubble under a pointer that never left.
      onMouseEnter={() => {
        setHovered(true);
        setDismissed(false);
      }}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => {
        setFocused(true);
        setDismissed(false);
      }}
      onBlur={() => setFocused(false)}
    >
      {describedBy(children, dismissed ? undefined : id)}
      <span
        id={id}
        role="tooltip"
        // The `hidden` ATTRIBUTE, not an opacity class: dismissing has to take the
        // bubble out of the accessibility tree as well as off the screen, or a screen
        // reader still reads out the description of a bubble the user just closed.
        hidden={dismissed || undefined}
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

/** Hand `children` the bubble's id as an `aria-describedby`, if it is an element that
 *  can hold one. `id` is undefined while there is no bubble to point at — a dangling
 *  reference describes the trigger as nothing at all, which is worse than silence. */
function describedBy(children: ReactNode, id: string | undefined): ReactNode {
  if (id === undefined || !isValidElement(children)) return children;
  const child = children as ReactElement<{ "aria-describedby"?: string }>;
  // Fragments, Suspense and friends are symbol-typed and take no DOM props; cloning one
  // with an aria attribute warns in development and drops it in production.
  if (typeof child.type === "symbol") return children;
  const own = child.props["aria-describedby"];
  return cloneElement(child, { "aria-describedby": own ? `${own} ${id}` : id });
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
  ...rest
}: TooltipVariantProps) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  const id = useId();
  // Escape closes it outright, since this variant's bubble only exists while it is
  // shown. The next mouseenter/focus brings it back, which is the behaviour WCAG
  // 1.4.13 asks for: dismissible now, still available when you ask again.
  useEscapeKey(() => setVisible(false), visible);
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
        // As in `CssTooltip`: the caller's attributes first, the four handlers that run
        // this component after them. The BUBBLE is deliberately not given them — it is
        // portalled to `<body>`, and an id or a tour anchor duplicated onto a node that
        // only exists while hovered would match twice or match nothing.
        {...rest}
        ref={triggerRef}
        className={cn("relative inline-flex", className)}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        {describedBy(children, visible ? id : undefined)}
      </span>
      {visible &&
        point &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            ref={bubbleRef}
            id={id}
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
