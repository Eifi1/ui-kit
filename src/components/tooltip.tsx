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
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { useEscapeKey } from "../hooks/use-dismiss";
import { useAnchoredRect, type AnchorRect } from "../hooks/use-anchored-rect";
import { dirOf, type Direction } from "../lib/direction";
import { hasClippingAncestor } from "../lib/clipping";

/** The attribute that marks an element as a clipping container for {@link Tooltip}'s
 *  auto-portal, whatever its computed `overflow` — `<div data-clips>` or
 *  `<div {...{ [CLIPS_ATTRIBUTE]: "" }}>`. Put it on an app's own scroller so a test
 *  environment without stylesheets (jsdom) portals the same tooltips the browser
 *  does. DataTable's body and Table's wrapper already carry it. */
export { CLIPS_ATTRIBUTE } from "../lib/clipping";

/** Where the bubble sits. `start` / `end` follow the reading direction — `end` is the
 *  right in LTR and the left in RTL — and are what a layout that mirrors should ask
 *  for. `left` / `right` stay physical, for a bubble tied to something that does not
 *  mirror (a chart axis, a map). */
export type TooltipSide = "top" | "bottom" | "left" | "right" | "start" | "end";

/** The placement the maths works in: a logical side resolved against the trigger. */
type PhysicalSide = "top" | "bottom" | "left" | "right";

function physicalSide(side: TooltipSide, dir: Direction): PhysicalSide {
  if (side === "start") return dir === "rtl" ? "right" : "left";
  if (side === "end") return dir === "rtl" ? "left" : "right";
  return side;
}

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
  // Logical insets, so CSS resolves the side from the inherited direction with no
  // JavaScript: `end-full` pins the bubble's END edge to the trigger's start.
  start: "end-full top-1/2 -translate-y-1/2 me-1",
  end: "start-full top-1/2 -translate-y-1/2 ms-1",
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
  /**
   * Where the bubble lives. Left out (the default since 0.10.0), the tooltip decides for
   * itself: the bubble stays next to the trigger unless an ancestor clips or scrolls
   * (`overflow` other than `visible`, or the {@link CLIPS_ATTRIBUTE} marker), in which
   * case it is portalled — see "Inside a scroll container" below. `true` always portals, `false` never does; both are exactly
   * what they were before the default existed.
   */
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
 * Two placements, and the choice matters more than it looks. In place, the bubble is
 * always mounted next to the trigger and fades in on `:hover`, which costs no state and
 * works in a plain render test. Portalled, the bubble is mounted in `document.body`
 * only while it is up, positioned by measurement.
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
 * it is subscribed only while a bubble is actually up: the in-place bubble is always
 * mounted, and a table of forty tooltips must not mean forty keydown listeners.
 *
 * ⚠️ **Inside a scroll container, the bubble has to be portalled — and by default it
 * now is.** An always-mounted bubble is absolutely positioned, but an absolutely
 * positioned descendant still counts towards its scroll-container ancestor's
 * scrollable overflow — so an invisible bubble on a control near the right edge makes
 * the container scroll sideways with nothing to reveal. That is what Keksdose feedback
 * dev#488 reported on the admin roster: 66px of horizontal scroll on a table that fit,
 * 44px of it owed to tooltips nobody could see. And a visible one is clipped by the
 * container's edge. The portalled bubble is `position: fixed` and absent until hovered,
 * so it adds no width and cannot be clipped.
 *
 * Until 0.10.0 the cure was `portal` at the call site, and kastlan asked for it to stop
 * being one: every tooltip in a table, a drawer or a scrolling card had to remember it,
 * and the ones that forgot were only found by someone scrolling sideways. So with
 * `portal` left out, the tooltip looks for a clipping ancestor itself — any element
 * between it and `<body>` whose computed `overflow-x` / `overflow-y` is not `visible`,
 * or that carries {@link CLIPS_ATTRIBUTE} (`data-clips`). The marker is what makes the
 * answer the same under test: jsdom computes no Tailwind, so there every scroller
 * reads `visible` and a table-cell tooltip used to stay in place — its always-mounted
 * bubble then repeated the label in the cell's accessible name and `textContent`
 * ("CheckingChecking"), and apps pinned `portal` to stop it. The kit's own scrollers
 * are marked, so a tooltip in a DataTable or Table cell portals in jsdom exactly as it
 * does in the browser.
 * It looks at MOUNT, not only on open: dev#488's phantom scroll is caused by a bubble
 * nobody opened, so a check that waited for the hover would find the damage already
 * done. It looks again on every open, for a container that started scrolling after
 * the tooltip mounted (a table that grew). Only the bubble changes place; the trigger
 * and the caller's child stay mounted, so a switch never costs a focused button its
 * focus. Outside any such container the in-place bubble is kept, which is still the
 * cheaper one and the one a plain render test can find without a hover.
 *
 * Why not simply portal everything? Because the in-place bubble is the one existing
 * app tests rely on (it is in the DOM without a hover), and because it follows its
 * trigger through a scroll or an animation for free — the portalled one re-measures.
 */
export function Tooltip({
  label,
  side = "top",
  className,
  portal,
  redact = false,
  children,
  ...rest
}: TooltipProps) {
  // No label, no bubble — and no wrapper either, so a conditional tooltip costs the
  // layout nothing on the branch where it does not apply. `...rest` goes with the
  // wrapper on this branch, which is the documented limit of the pass-through: there is
  // no element left to put an attribute on.
  if (isEmptyLabel(label)) return <>{children}</>;
  if (portal === true) {
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
    <InPlaceTooltip
      label={label}
      side={side}
      className={className}
      redact={redact}
      detect={portal === undefined}
      {...rest}
    >
      {children}
    </InPlaceTooltip>
  );
}


/** The variant that lives next to its trigger, and — when `detect` is on, which is the
 *  default — moves its bubble to `<body>` when that turns out to be inside a clipping
 *  container (see "Inside a scroll container" on {@link Tooltip}).
 *
 *  In place it holds the little state it does for the two things CSS cannot express —
 *  which element to point `aria-describedby` at, and Escape — and not for the fade,
 *  which is still `group-hover`/`group-focus-within` and still costs a render nothing.
 *
 *  ONE component for both placements rather than a switch between the two variants: a
 *  switch would be a different component at the same place in the tree, and React
 *  would remount the caller's child with it — a button that loses focus the moment
 *  its own tooltip decided where to go. Here the wrapper and the child stay put and
 *  only the bubble's slot changes. */
function InPlaceTooltip({
  label,
  side,
  className,
  redact,
  detect,
  children,
  ...rest
}: TooltipVariantProps & { detect: boolean }) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [clipped, setClipped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [dir, setDir] = useState<Direction>("ltr");
  const open = (hovered || focused) && !dismissed;
  useEscapeKey(() => setDismissed(true), open);
  // At mount, before the first paint: the in-place bubble inside a scroller is the
  // phantom-scroll bug whether or not anyone opens it.
  useLayoutEffect(() => {
    if (detect) setClipped(hasClippingAncestor(triggerRef.current));
  }, [detect]);
  // Re-armed by the next hover or focus rather than by an effect watching those flags:
  // coming back to a trigger is a fresh request for its label, and an effect would also
  // re-show the bubble under a pointer that never left. The clipping check is repeated
  // here for a container that began to scroll after mount.
  const arm = (el: Element) => {
    setDismissed(false);
    if (!detect) return;
    setDir(dirOf(el));
    setClipped(hasClippingAncestor(el));
  };
  return (
    <span
      // `...rest` first: the four handlers below are what decides whether a bubble is
      // up, and a caller passing an `onFocus` of its own must not replace them.
      {...rest}
      ref={triggerRef}
      className={cn("relative inline-flex", !clipped && "group/tooltip", className)}
      // These four track WHETHER A BUBBLE IS UP. They activate nothing — the only thing
      // here that can be activated is the caller's child, which keeps every handler it
      // arrived with — so this wrapper needs no role and no key handling of its own.
      // `jsx-a11y/no-static-element-interactions` warns about it all the same, as it
      // already does about the portal variant's identical trigger below; both are left
      // visible rather than silenced, because a rule this package ratchets should be
      // argued with in the backlog and not in a disable comment.
      onMouseEnter={(e) => {
        setHovered(true);
        arm(e.currentTarget);
      }}
      onMouseLeave={() => setHovered(false)}
      onFocus={(e) => {
        setFocused(true);
        arm(e.currentTarget);
      }}
      onBlur={() => setFocused(false)}
    >
      {/* In place the bubble is always there to point at; portalled, only while up. */}
      {describedBy(children, clipped ? (open ? id : undefined) : dismissed ? undefined : id)}
      {clipped ? (
        open && (
          <PortalBubble triggerRef={triggerRef} id={id} label={label} side={side} dir={dir} redact={redact} />
        )
      ) : (
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
      )}
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

const portalTransformBySide: Record<PhysicalSide, string> = {
  right: "translate(0, -50%)",
  left: "translate(-100%, -50%)",
  top: "translate(-50%, -100%)",
  bottom: "translate(-50%, 0)",
};

/** Anchor point (viewport px) for the tooltip on the given side of `r`. Paired
 *  with {@link portalTransformBySide}, which shifts the box onto that point. */
function tooltipAnchor(
  r: AnchorRect,
  side: PhysicalSide,
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
  side: PhysicalSide;
}

const opposite: Record<PhysicalSide, PhysicalSide> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

/** Whether the bubble clears the viewport edge on `side` of the trigger. */
function roomOn(
  r: AnchorRect,
  side: PhysicalSide,
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
  side: PhysicalSide,
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
  const [visible, setVisible] = useState(false);
  // The trigger's reading direction, read when the bubble is asked for (an event, not a
  // render): it resolves `start` / `end`, and the portalled bubble — which has left the
  // subtree it would have inherited `dir` from — carries it too.
  const [dir, setDir] = useState<Direction>("ltr");
  const show = (el: Element) => {
    setDir(dirOf(el));
    setVisible(true);
  };
  const id = useId();
  // Escape closes it outright, since this variant's bubble only exists while it is
  // shown. The next mouseenter/focus brings it back, which is the behaviour WCAG
  // 1.4.13 asks for: dismissible now, still available when you ask again.
  useEscapeKey(() => setVisible(false), visible);

  return (
    <>
      <span
        // As in `InPlaceTooltip`: the caller's attributes first, the four handlers that
        // run this component after them. The BUBBLE is deliberately not given them — it
        // is portalled to `<body>`, and an id or a tour anchor duplicated onto a node
        // that only exists while hovered would match twice or match nothing.
        {...rest}
        ref={triggerRef}
        className={cn("relative inline-flex", className)}
        onMouseEnter={(e) => show(e.currentTarget)}
        onMouseLeave={() => setVisible(false)}
        onFocus={(e) => show(e.currentTarget)}
        onBlur={() => setVisible(false)}
      >
        {describedBy(children, visible ? id : undefined)}
      </span>
      {visible && (
        <PortalBubble triggerRef={triggerRef} id={id} label={label} side={side} dir={dir} redact={redact} />
      )}
    </>
  );
}

/** The measured, `position: fixed` bubble on `<body>`, mounted only while it is up.
 *  Shared by {@link PortalTooltip} and the in-place variant's clipped mode, so the two
 *  cannot place a bubble differently. */
function PortalBubble({
  triggerRef,
  id,
  label,
  side,
  dir,
  redact,
}: {
  triggerRef: RefObject<HTMLSpanElement | null>;
  id: string;
  label: ReactNode;
  side: TooltipSide;
  dir: Direction;
  redact: boolean | undefined;
}) {
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  // The measure + scroll/resize-tracking lifecycle is owned by useAnchoredRect;
  // here we only map the rect to a side-specific anchor point.
  const rect = useAnchoredRect(triggerRef, true);
  // The bubble's own size and the window it has to fit in — neither of which is
  // knowable in render: the width is whatever the label wrapped to inside the
  // cap, and reading `window` while rendering is not a pure thing to do. Both
  // are taken in a LAYOUT effect, so the correction lands before the browser
  // paints and there is no frame in which the label sits off the screen.
  const [room, setRoom] = useState<{ size: TooltipSize; viewport: TooltipViewport } | null>(null);
  useLayoutEffect(() => {
    const measured = bubbleRef.current?.getBoundingClientRect();
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
  }, [rect, label]);

  const physical = physicalSide(side, dir);
  const point = rect ? tooltipAnchor(rect, physical) : null;
  // Unmeasured on the very first pass, where the anchor point plus the side's
  // own transform is exactly what this always did. One layout effect later the
  // size is known and the placement is decided properly.
  const placed = rect && room ? placeTooltip(rect, physical, room.size, room.viewport) : null;

  if (!point || typeof document === "undefined") return null;
  return createPortal(
    <span
      ref={bubbleRef}
      id={id}
      role="tooltip"
      dir={dir}
      data-private={redact ? "" : undefined}
      style={
        placed
          ? { position: "fixed", left: placed.left, top: placed.top }
          : {
              position: "fixed",
              left: point.left,
              top: point.top,
              transform: portalTransformBySide[physical],
            }
      }
      className={cn(TOOLTIP_SURFACE, "pointer-events-none z-50")}
    >
      {label}
    </span>,
    document.body,
  );
}
