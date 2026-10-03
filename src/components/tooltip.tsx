import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { useEscapeKey, useOutsideClick } from "../hooks/use-dismiss";
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

/** What a TAP — a touch or a pen press, never the mouse — on the trigger does to the
 *  bubble. See "A tap is not a hover" on {@link Tooltip}.
 *
 *  - `"auto"` (the default): a tap that activates something shows nothing; a tap that
 *    activates nothing — on a disabled or `aria-disabled` control (a write lock's
 *    reason), or on a trigger with no control at all (a truncated name, a badge) —
 *    toggles the bubble, since showing it is then the tap's only answer.
 *  - `"toggle"`: every tap toggles it — for a control that exists only to explain, such
 *    as a "?" whose click does nothing.
 *  - `"ignore"`: a tap never shows it. */
export type TooltipTap = "auto" | "toggle" | "ignore";

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
 *  (Steering Design feedback #126). The CSS-placed one never turns round, so there
 *  `side` is still the whole of which side it is on — but since 0.14 it is slid back
 *  along the cross axis when it would cross the viewport edge (keksdose G7), which the
 *  viewport term in this cap is what makes possible: a bubble never wider than the glass
 *  minus the margins always fits once slid. */
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
  /**
   * Mount the IN-PLACE bubble only while it is up (hovered or focused, not dismissed),
   * instead of always. It still sits next to its trigger and is still placed by CSS
   * alone; what changes is that, while closed, it is not in the DOM — so it is not in
   * `getAllByRole("tooltip")`, not in an ancestor's `textContent` and not in an
   * ancestor's accessible name. The trigger is described (`aria-describedby`) while
   * the bubble is up, exactly as a portalled one is. See "Lazy in place" on
   * {@link Tooltip} for why this exists (keksdose F6) and why it is not the default.
   *
   * Has no effect on a bubble that is portalled (`portal`, or auto-portalled inside a
   * clipping container) — that one is already mounted only while up.
   */
  lazy?: boolean;
  /** Tag the bubble `data-private`, for a label that repeats the user's own data. */
  redact?: boolean;
  /**
   * What a tap (touch or pen) on the trigger does — see {@link TooltipTap} and "A tap is
   * not a hover" below. Default `"auto"`: a tap that activates the control shows nothing;
   * one that activates nothing (a disabled control, plain text) toggles the bubble.
   */
  tap?: TooltipTap;
  children: ReactNode;
}

/** What each variant below takes: the resolved `side` and `tap`, and every span attribute
 *  the caller handed {@link Tooltip}, forwarded to that variant's own wrapper. */
type TooltipVariantProps = Omit<TooltipProps, "side" | "portal" | "lazy" | "tap"> & {
  side: TooltipSide;
  tap: TooltipTap;
};

/**
 * Hover/focus label for a control.
 *
 * Two placements, and the choice matters more than it looks. In place, the bubble is
 * always mounted next to the trigger — so a plain render test finds it without a hover —
 * and shown while it is up (`display: none` otherwise, see "never widens the page"
 * below). Portalled, the bubble is mounted in `document.body` only while it is up,
 * positioned by measurement.
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
 *
 * ⚠️ **Lazy in place: `lazy` keeps the bubble next to its trigger but out of the DOM
 * until it is up (keksdose F6).** `data-clips` cured the doubled text for tooltips
 * inside a table; it did nothing for the ones outside any clipping container, where the
 * always-mounted bubble is still a real `role="tooltip"` node full of text. About seven
 * keksdose sites — column-header tooltips, a direction toggle, an fx-estimate row, a
 * FlagBadge, a toast inside a `<button>` — still pinned `portal` for that alone: their
 * tests found two tooltips with `getAllByRole("tooltip")`, read the label twice in a
 * `textContent`, or got a button whose accessible name had the bubble's sentence glued
 * on. `portal` fixed the test and cost the browser the measured, re-positioning bubble
 * for no reason. `lazy` is the in-place bubble with the portalled one's lifetime: it is
 * rendered only while hovered or focused (and not dismissed), in the same slot, with the
 * same classes, so it looks and sits exactly as the default one does when it is up.
 *
 * Why unmount rather than hide? Hiding was the other option — keep the bubble mounted
 * with `hidden` (or `aria-hidden` plus `display: none` until `:hover` / `:focus-within`)
 * and let `aria-describedby` go on pointing at it, which the accname algorithm allows:
 * a node referenced directly by `aria-describedby` contributes its text even while
 * hidden. That would take the bubble out of the role queries and out of an ancestor's
 * accessible name — but NOT out of `textContent`, which is plain DOM and counts hidden
 * text too, and `textContent` is one of the three things F6 lists. Only a bubble that
 * is not there solves all three. The cost is the portalled variant's: the trigger is
 * described while the bubble is up rather than always. Focusing the trigger IS what
 * puts it up, and React commits the `aria-describedby` in the same task as that focus
 * event, so a screen reader landing on the control still hears it; what goes is the description
 * of a trigger that is read in browse mode without ever being focused.
 *
 * Escape still dismisses it — here by unmounting it, which takes it off the screen and
 * out of the accessibility tree at once — and the next hover or focus brings it back.
 * There is no fade to lose: neither in-place bubble has ever had a transition, only the
 * `opacity` switch, so appearing on a state change looks the same as appearing on
 * `:hover`.
 *
 * Why opt-in rather than the new default? Because the always-mounted bubble is the one
 * existing app tests find without a hover (see above): flipping it would turn every
 * `getByRole("tooltip")` written against 0.12 into a failure in all three apps at once.
 * Reach for `lazy` wherever a `portal` was pinned only to keep a test's DOM clean.
 *
 * ⚠️ **The in-place bubble is clamped to the viewport when it opens (keksdose G7).** The
 * portalled bubble has always measured itself and been pushed back onto the glass
 * ({@link placeTooltip}); the in-place one never learnt its own size, so `side` was the
 * whole of its placement and a `top` / `bottom` bubble sat centred on its trigger
 * whatever that cost. The cost shows on a phone: long labels live at a row's START edge
 * — a gcloud command in keksdose's jobs panel, a canned reply in a support thread — and
 * a 20rem bubble centred on a trigger 16px from the edge hangs half its text off the
 * screen. keksdose pinned `portal` on those sites for that alone, which gave up `lazy`'s
 * point (the cheap, in-place bubble) to buy a placement.
 *
 * So now, when an in-place bubble goes up (default or `lazy`), a layout effect measures
 * it and, if it crosses the viewport edge minus the same margin the portalled bubble
 * keeps, slides it back along its CROSS axis only — sideways for `top` / `bottom`, up or
 * down for the four side placements — with an inline margin (a `transform` until 0.25; see
 * {@link shiftStyle} for why that widened the page). The main axis is left alone on purpose: sliding a
 * `start` bubble along the main axis would slide it over its own trigger, and turning it
 * round is a measured-placement decision this CSS-placed bubble does not make (pass
 * `portal` for that). The width is already capped to the viewport (see
 * `TOOLTIP_SURFACE`), so a bubble can always fit once slid, and a long label wraps
 * instead of growing past the glass.
 *
 * Why on by default, with no prop? Because it is a no-op for every bubble that already
 * fits — the shift is zero unless the bubble would overflow — so the only placements it
 * changes are ones that were broken. The maths is in physical viewport pixels: an RTL
 * row puts its long label at the RIGHT edge and gets slid left by the same code, and the
 * reading direction only decides which edge is kept when a bubble is wider than the room
 * (its start, as {@link placeTooltip} keeps). Under jsdom there is no layout — every rect
 * is zero-sized — and a zero-sized bubble is taken to be unmeasured, so tests see no
 * transform at all. It is measured on open (and when the label or side changes while
 * open), not on every scroll: an in-place bubble follows its trigger for free, and a page
 * that scrolls sideways under an open tooltip is not a case worth a listener per tooltip.
 *
 * ⚠️ **An in-place bubble never widens the page (keksdose run 72, live #381).** Two
 * holes let it, and a page wider than the screen is worse than a bubble cut off: on a
 * phone Chrome then lays every `position: fixed` layer out against the WIDER page while
 * the glass still shows the old width. Measured on a 406px phone: the sync icon at x=254,
 * its `bottom` bubble at 102–422, the page 426px wide, and a FloatingPanel 17px off the
 * glass. First, the clamp compared against `window.innerWidth` — and on a phone that is
 * the layout viewport, which GROWS to the page's width once something sticks out (430 on
 * a 406px screen, measured in Chromium's mobile emulation), so a bubble already past the
 * edge found itself "inside" and stayed there. It now measures against the root's client
 * width, which on a phone is the screen (the initial containing block, the width `100vw`
 * and media queries see) whatever overflows, and on a desktop also leaves out a classic
 * scrollbar; the window is the fallback where there is no layout (jsdom). The portalled
 * bubble takes the same width, since a `fixed` bubble placed against a grown layout
 * viewport is off the glass for the same reason. Second, the always-mounted bubble was
 * `opacity: 0` while closed — invisible, but still laid out where the CSS puts it, so a
 * bubble nobody opened, centred on a trigger near the end edge, widened the page all by
 * itself (dev#488's phantom scroll, at the scale of the page instead of a scroller, where
 * the auto-portal cannot help: the page is not an ancestor it can portal out of). It is
 * now `display: none` until it is up, so a closed bubble takes no room at all, and an open
 * one is slid onto the glass in the same layout pass that shows it, before paint. jsdom
 * computes no Tailwind, so tests still find the closed bubble without a hover.
 *
 * ⚠️ **A tap is not a hover (keksdose run 72, live #379).** The bubble used to show on
 * `mouseenter` and on `focus`, and hide only on `mouseleave` and `blur`. A tap on a phone
 * fires an emulated `mouseenter` and, on a button, focuses it — and the virtual mouse and
 * the focus both stay on the button until the next tap somewhere else, so every
 * IconButton's label (the top-bar icons, the sync indicator, a row's actions) stayed up
 * over whatever the tap had just opened. Now a touch or pen press is told apart from the
 * mouse: the emulated `mouseenter` that follows a tap is ignored, the press itself closes
 * a bubble that was up, and a focus that arrives while the page's last input was a finger
 * or a pen — the tap's own, or one a closing dialog RETURNS to the icon it was opened
 * from — shows nothing. The next key press (a Bluetooth keyboard on a tablet) or mouse
 * press makes focus count again, and a mouse entering the trigger hovers as ever, so a
 * hybrid laptop gets both.
 *
 * Focus otherwise shows the bubble, as it always did — the keyboard, a script, a test's
 * `.focus()` — with one more exception: the focus a mouse press on the trigger gives it.
 * There it follows `:focus-visible`, so a text field still shows its bubble while you type
 * and a clicked button does not hold it: a desktop click behaves as it always did while
 * the pointer is over the button (the hover shows it) and lets it go when the pointer
 * leaves, where the in-place bubble used to linger until the button lost focus — the same
 * left-behind bubble on a smaller scale, and what the portalled bubble always did. A
 * keyboard user's bubble, in turn, now stays up when a mouse passes over and leaves (the
 * portalled one used to close). Any `pointerdown` outside the trigger closes an open
 * bubble too — the Safari case, where a tap elsewhere moves no focus.
 *
 * What a tap DOES show is {@link TooltipTap} (`tap`). By default a tap that activates
 * something shows nothing — the action is the answer — while a tap that activates nothing
 * toggles the bubble, because there the bubble is the only answer: a write-locked or
 * disabled control, whose bubble is the reason it did not respond, and a trigger with no
 * control at all, a truncated payee or a badge, whose bubble is the rest of the text. A
 * second tap, a tap anywhere else, Escape or the focus leaving closes it. "Activates" is
 * read off the DOM — a link, a button, a field, a label, an element with a widget role
 * (`button`, `link`, `checkbox`, `option`, …), or a DataTable row (`tr[tabindex]`) — from
 * the tapped element outwards, past the tooltip, so a glyph inside a clickable row or a
 * button counts as that row or button. What it cannot read is a click handler on an
 * element with no role (give it `role="button"`, which it needs anyway, or pass
 * `tap="ignore"`), and a button that exists only to explain, whose click does nothing —
 * FieldHint's "?" — which says so with `tap="toggle"`.
 *
 * Why not show the label on a long press, as Android does for its own icons? Because the
 * web gives no reliable long press on a control: browsers disagree on whether the release
 * that ends one still clicks the button, and the button's own long press — the context
 * menu, text selection, a row's drag — claims the gesture first on others. A gesture meant
 * to ask "what does this do" must not risk doing it. Screen readers do not need it (the
 * bubble is in `aria-describedby`, and an IconButton's label is its name), and a tap on
 * anything that does nothing already shows it. No scroll listener either: every touch scroll begins with a `pointerdown`, which
 * already closes the bubble, and closing on scroll would close a keyboard user's bubble
 * the moment Tab scrolled its control into view.
 */
export function Tooltip({
  label,
  side = "top",
  className,
  portal,
  lazy = false,
  redact = false,
  tap = "auto",
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
        tap={tap}
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
      lazy={lazy}
      tap={tap}
      {...rest}
    >
      {children}
    </InPlaceTooltip>
  );
}


/** The pointer handlers a caller may hand {@link Tooltip} that the trigger also needs:
 *  both run, the trigger's first. (The mouse and focus handlers are the trigger's alone,
 *  as they have always been.) */
type PointerHandlers = Pick<
  ComponentPropsWithoutRef<"span">,
  "onPointerEnter" | "onPointerDown" | "onPointerUp" | "onPointerCancel"
>;

/** A press that is not the mouse's: a finger, or a pen on the glass. */
function isTap(pointerType: string): boolean {
  return pointerType === "touch" || pointerType === "pen";
}

/**
 * What a tap ACTIVATES, for `tap="auto"`: the tapped element or the nearest ancestor —
 * inside the tooltip or round it — that a tap would do something with. The DataTable's
 * own list of row-owned controls (`OWN_CONTROL`), plus `tr[tabindex]` — a clickable
 * DataTable row is a roving tab stop, so all but one of its rows say `-1` — and the other
 * widget roles a tap selects or toggles.
 *
 * Two things on the DataTable's list are left off on purpose. A bare `tabindex`: a roving
 * tab stop is `0` on one element of a widget and `-1` on the rest, so it would make one
 * cell of a display-only grid "activate" and its neighbours not — and dialogs, panels and
 * `<main>` carry `-1` only to be focusable by script. And `gridcell` / `row`: the
 * CalendarHeatmap's days are display-only grid cells whose tooltip is the day's value,
 * and a tap is the only way to read it on a phone; a heatmap day that does select is a
 * `<button>`, caught above.
 */
const ACTIVATES = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  '[contenteditable=""]',
  '[contenteditable="true"]',
  "tr[tabindex]",
  ...[
    "button",
    "link",
    "checkbox",
    "radio",
    "switch",
    "tab",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "treeitem",
    "slider",
    "spinbutton",
    "combobox",
  ].map((role) => `[role="${role}"]`),
].join(",");

/** Whether a tap on `target` should toggle the bubble — see {@link TooltipTap}. Under
 *  `auto`: when the tap activates nothing, either because there is no control under it
 *  or because the control is disabled (natively, or `aria-disabled` — a write lock). */
function tapShows(tap: TooltipTap, target: EventTarget | null): boolean {
  if (tap !== "auto") return tap === "toggle";
  if (!(target instanceof Element)) return true;
  const control = target.closest(ACTIVATES);
  return control === null || control.matches(":disabled") || control.closest('[aria-disabled="true"]') !== null;
}

/**
 * The last kind of input the document saw: a `pointerdown`'s `pointerType` ("mouse",
 * "touch", "pen"), "keyboard" after a key press, `null` before either. ONE pair of
 * capturing listeners for the whole page, installed by the first trigger that mounts —
 * not a pair per tooltip, which a table of forty would multiply.
 *
 * Why a page-wide note and not only the trigger's own: the focus that brings a label back
 * after a tap is not always the tap's. A tap on a top-bar icon opens a dialog; closing it
 * (another tap) RETURNS the focus to the icon by script, and that focus arrives with no
 * press on the icon at all. On a phone it would put the label up over the page the dialog
 * just left, and keep it there. Keys an on-screen keyboard sends while typing
 * (`Unidentified`, a composition) and shortcut chords do not count as the keyboard.
 */
let lastInput: string | null = null;
let trackingInput = false;

function trackInput(): void {
  if (trackingInput || typeof document === "undefined") return;
  trackingInput = true;
  document.addEventListener(
    "pointerdown",
    (e) => {
      lastInput = e.pointerType;
    },
    { capture: true, passive: true },
  );
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Unidentified" || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      lastInput = "keyboard";
    },
    { capture: true, passive: true },
  );
}

/**
 * Whether a focus should show the bubble. Not after a tap — the last input was a finger
 * or a pen, whoever moved the focus. Not after a mouse press on this very trigger either,
 * unless the browser would draw a focus ring there (`:focus-visible`: a text field, not a
 * button) — the hover already shows it while the pointer is there. Every other focus
 * shows it as every focus did before: the keyboard, a script, and a test's `.focus()` or
 * `fireEvent.focus` (jsdom's own `:focus-visible` guesses from whatever events the test
 * file fired before, so it is consulted only where a press makes the answer certain).
 */
function focusShows(target: EventTarget, pressedByMouse: boolean): boolean {
  if (lastInput !== null && isTap(lastInput)) return false;
  if (!pressedByMouse || !(target instanceof Element)) return true;
  try {
    return target.matches(":focus-visible");
  } catch {
    return true;
  }
}

/**
 * Whether the bubble is up, from what the trigger hears — shared by both variants so the
 * in-place and the portalled bubble cannot disagree about it. See "A tap is not a hover"
 * on {@link Tooltip} for the rules; this is their bookkeeping.
 *
 * Three ways up — hovered by a mouse (or a hovering pen), focused (see {@link focusShows}),
 * and tapped (`tap`) — and Escape over all three (`dismissed`), re-armed by the next
 * request rather than by an effect watching the flags: coming back to a trigger is a
 * fresh request for its label, and an effect would also re-show the bubble under a
 * pointer that never left. `onArm` runs with each request, for the variant's own per-open
 * work (the reading direction, the clipping check).
 *
 * The refs change nothing on screen, only how the next event is read. `pressedByTouch`
 * is set by a touch or pen arriving or pressing — which precedes the emulated
 * `mouseenter` a tap produces (pointer events first, then the compatibility mouse
 * events) — and cleared by a mouse, or a pen that is not pressing, entering again, so a
 * hybrid laptop's mouse still hovers. `pressedByMouse` spans one mouse press, the window
 * in which that press's own focus arrives.
 */
function useTooltipTrigger(
  triggerRef: RefObject<HTMLSpanElement | null>,
  tap: TooltipTap,
  passed: PointerHandlers,
  onArm: (el: HTMLElement) => void,
) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const pressedByTouch = useRef(false);
  const pressedByMouse = useRef(false);
  // The tap in progress, and whether a bubble was up when it began: a tap on an open
  // bubble closes it (at pointerdown) and must not open it again at pointerup.
  const press = useRef<{ wasOpen: boolean } | null>(null);
  useEffect(trackInput, []);
  const open = (hovered || focused || tapped) && !dismissed;
  const close = () => {
    setHovered(false);
    setFocused(false);
    setTapped(false);
  };
  useEscapeKey(() => setDismissed(true), open);
  // A press anywhere else closes it — the case a blur does not cover: Safari moves no
  // focus on a tap, and a tap on plain text moves it nowhere.
  useOutsideClick(triggerRef, close, open);
  const arm = (el: HTMLElement) => {
    setDismissed(false);
    onArm(el);
  };
  const handlers = {
    onPointerEnter: (e: PointerEvent<HTMLSpanElement>) => {
      if (e.pointerType === "touch") pressedByTouch.current = true;
      else if (e.buttons === 0) pressedByTouch.current = false;
      passed.onPointerEnter?.(e);
    },
    onPointerDown: (e: PointerEvent<HTMLSpanElement>) => {
      if (isTap(e.pointerType)) {
        pressedByTouch.current = true;
        press.current = { wasOpen: open };
        close();
      } else {
        pressedByTouch.current = false;
        pressedByMouse.current = true;
      }
      passed.onPointerDown?.(e);
    },
    onPointerUp: (e: PointerEvent<HTMLSpanElement>) => {
      pressedByMouse.current = false;
      const began = press.current;
      press.current = null;
      if (began && !began.wasOpen && isTap(e.pointerType) && tapShows(tap, e.target)) {
        setTapped(true);
        arm(e.currentTarget);
      }
      passed.onPointerUp?.(e);
    },
    // The browser took the gesture over — a scroll, a pinch: not a tap.
    onPointerCancel: (e: PointerEvent<HTMLSpanElement>) => {
      pressedByMouse.current = false;
      press.current = null;
      passed.onPointerCancel?.(e);
    },
    onMouseEnter: (e: MouseEvent<HTMLSpanElement>) => {
      if (pressedByTouch.current) return;
      setHovered(true);
      arm(e.currentTarget);
    },
    onMouseLeave: () => setHovered(false),
    onFocus: (e: FocusEvent<HTMLSpanElement>) => {
      if (!focusShows(e.target, pressedByMouse.current)) return;
      setFocused(true);
      arm(e.currentTarget);
    },
    onBlur: (e: FocusEvent<HTMLSpanElement>) => {
      setFocused(false);
      if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
      setTapped(false);
    },
  };
  return { open, dismissed, handlers };
}

/** The variant that lives next to its trigger, and — when `detect` is on, which is the
 *  default — moves its bubble to `<body>` when that turns out to be inside a clipping
 *  container (see "Inside a scroll container" on {@link Tooltip}).
 *
 *  Whether the bubble is up is {@link useTooltipTrigger}'s, shared with the portalled
 *  variant. Until 0.25 the always-mounted bubble showed itself with CSS alone —
 *  `group-hover` / `group-focus-within` — which is exactly what a tap on a phone could not
 *  get rid of: the tapped button keeps the focus, and `:focus-within` cannot be told that
 *  the focus came from a finger. It is shown from the same state as every other bubble
 *  now, and is `display: none` while closed (see "never widens the page" on
 *  {@link Tooltip}).
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
  lazy,
  tap,
  children,
  ...rest
}: TooltipVariantProps & { detect: boolean; lazy: boolean }) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [clipped, setClipped] = useState(false);
  const [dir, setDir] = useState<Direction>("ltr");
  // The reading direction on every request (the clamp keeps the start edge of a bubble
  // too wide for the room); the clipping check too, for a container that began to scroll
  // after mount.
  const { open, dismissed, handlers } = useTooltipTrigger(triggerRef, tap, rest, (el) => {
    setDir(dirOf(el));
    if (detect) setClipped(hasClippingAncestor(el));
  });
  // keksdose G7: slide an open in-place bubble back onto the screen. See "The in-place
  // bubble is clamped" on {@link Tooltip}.
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  const { shift, measuring } = useViewportClamp(bubbleRef, open && !clipped, side, label, dir);
  // At mount, before the first paint: the in-place bubble inside a scroller is the
  // phantom-scroll bug whether or not anyone opens it.
  useLayoutEffect(() => {
    if (detect) setClipped(hasClippingAncestor(triggerRef.current));
  }, [detect]);
  return (
    // No role for this span: its handlers track whether the bubble is up and activate
    // nothing; the caller's child is the interactive element, keeps its own handlers,
    // and its focus shows the bubble too.
    <span
      // `...rest` first: the handlers below are what decides whether a bubble is up, and
      // a caller passing an `onFocus` of its own must not replace them (its pointer
      // handlers are called from them).
      {...rest}
      ref={triggerRef}
      // Clipped for the one render in which the bubble is measured (see useViewportClamp):
      // that layout must not reach the page's width.
      style={measuring ? { ...rest.style, overflow: "clip" } : rest.style}
      className={cn("relative inline-flex", !clipped && "group/tooltip", className)}
      // These track WHETHER A BUBBLE IS UP. They activate nothing — the only thing here
      // that can be activated is the caller's child, which keeps every handler it
      // arrived with — so this wrapper needs no role and no key handling of its own.
      {...handlers}
    >
      {/* In place the bubble is always there to point at; portalled or lazy, only while up. */}
      {describedBy(children, clipped || lazy ? (open ? id : undefined) : dismissed ? undefined : id)}
      {clipped ? (
        open && (
          <PortalBubble triggerRef={triggerRef} id={id} label={label} side={side} dir={dir} redact={redact} />
        )
      ) : lazy ? (
        // keksdose F6: the in-place slot and classes, the portalled lifetime. Mounted only
        // while up, so it is visible whenever it exists.
        open && (
          <span
            ref={bubbleRef}
            id={id}
            role="tooltip"
            data-private={redact ? "" : undefined}
            style={shiftStyle(shift)}
            className={cn(TOOLTIP_SURFACE, "pointer-events-none absolute z-50 opacity-100", sidePositionClass[side])}
          >
            {label}
          </span>
        )
      ) : (
        <span
          ref={bubbleRef}
          id={id}
          role="tooltip"
          style={shiftStyle(shift)}
          // The `hidden` ATTRIBUTE, not a class: dismissing has to take the bubble out of
          // the accessibility tree as well as off the screen, or a screen reader still
          // reads out the description of a bubble the user just closed. Merely CLOSED it
          // is the `hidden` CLASS — `display: none` in the browser, so it takes no room
          // and widens nothing (live #381), and nothing at all under jsdom, where tests
          // have always found this bubble without a hover. `aria-describedby` reads a
          // `display: none` node all the same.
          hidden={dismissed || undefined}
          data-private={redact ? "" : undefined}
          className={cn(
            TOOLTIP_SURFACE,
            "pointer-events-none absolute z-50",
            open ? "opacity-100" : "hidden",
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

/** A cross-axis slide, in viewport pixels, for an in-place bubble. */
interface Shift {
  x: number;
  y: number;
}

const NO_SHIFT: Shift = { x: 0, y: 0 };

/** An in-place bubble's slide and the label, side and direction it was measured for. */
interface Placement {
  shift: Shift;
  for: { side: TooltipSide; label: ReactNode; dir: Direction } | null;
}

const UNPLACED: Placement = { shift: NO_SHIFT, for: null };

/** How far to slide the span `[low, high]` so it sits inside `[TOOLTIP_MARGIN,
 *  extent - TOOLTIP_MARGIN]`. Zero when it already does. When the span is wider than the
 *  room, the edge it keeps is its START — as in {@link clamp}, the start of a label is the
 *  half worth keeping — which is the low edge unless `keepHigh` says the start is the
 *  high one (an RTL label, along x). The width cap means that only happens on a viewport
 *  barely wider than the margins, or one whose scrollbar the cap's `100vw` counts. */
function slideInto(low: number, high: number, extent: number, keepHigh = false): number {
  const min = TOOLTIP_MARGIN;
  const max = extent - TOOLTIP_MARGIN;
  if (high - low > max - min) return keepHigh ? max - high : min - low;
  if (low < min) return min - low;
  if (high > max) return max - high;
  return 0;
}

/**
 * The glass a bubble has to stay on, in CSS pixels — `window.innerWidth` is the wrong
 * width on a phone (keksdose run 72, live #381). There it is the LAYOUT viewport, and
 * that grows to the page's width as soon as anything sticks out past the screen: 430 on
 * a 406px screen in Chromium's mobile emulation, with `position: fixed` layers laid out
 * against the 430. A bubble that had widened the page then measured itself as inside it.
 * The root element's client width is the initial containing block instead — the screen,
 * the width `100vw` and the media queries see — whatever overflows, and on a desktop it
 * also leaves a classic scrollbar out. It is 0 where nothing is laid out (jsdom), and the
 * window is the answer there. The height stays the window's: nothing measured grows it,
 * and a phone's collapsing toolbar makes the window the truer of the two.
 */
function viewportSize(): TooltipViewport {
  return {
    width: document.documentElement.clientWidth || window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * The in-place bubble's viewport clamp (keksdose G7): while `active`, measure the bubble
 * in a LAYOUT effect — before paint, so there is no frame with the label off the screen —
 * and return the cross-axis slide that brings it inside the viewport ({@link viewportSize})
 * minus `TOOLTIP_MARGIN`. `top` / `bottom` slide along x; `left` / `right` / `start` / `end`
 * along y. {@link NO_SHIFT} while closed, so the next open measures the bubble where the
 * CSS alone puts it. `dir` only decides which edge survives a bubble wider than the room.
 *
 * `measuring` is true for the one render in which the bubble is measured — on open, and
 * again when the label, side or direction changes while open — and the caller clips its
 * wrapper (`overflow: clip`) for that render. Measuring means laying the bubble out where
 * the CSS alone puts it, which is past the edge whenever there is something to slide, and
 * that layout counts towards the page's scrollable overflow even though it is never
 * painted. Chrome on a phone grows the layout viewport to it and does not always give the
 * width back: in an RTL page, where overflow on the left is scrollable, a bubble measured
 * at −24 left the page 426 wide and scrolled by −20 after the slide had already brought it
 * to 4 (Chromium mobile emulation, 406px). A clipped wrapper keeps the measurement out of
 * every ancestor's overflow — `clip` and not `hidden`, so the wrapper never becomes a
 * scroll container — and it is unclipped, with the slide, in the same task, before paint.
 *
 * The rect it reads already includes the slide it applied last time (a label that
 * changed while open), so that slide is taken back out before deciding the new one.
 * A zero-sized rect means no layout (jsdom, `display: none`) and leaves the bubble put.
 */
function useViewportClamp(
  bubbleRef: RefObject<HTMLSpanElement | null>,
  active: boolean,
  side: TooltipSide,
  label: ReactNode,
  dir: Direction,
): { shift: Shift; measuring: boolean } {
  // The slide, and what it was measured for: anything else on screen — a fresh open, a
  // new label, side or direction — is not measured yet, and renders clipped until it is.
  const [placement, setPlacement] = useState<Placement>(UNPLACED);
  const measured =
    placement.for !== null &&
    placement.for.side === side &&
    placement.for.label === label &&
    placement.for.dir === dir;
  useLayoutEffect(() => {
    const el = bubbleRef.current;
    if (!active || !el) {
      setPlacement(UNPLACED);
      return;
    }
    if (measured) return;
    const r = el.getBoundingClientRect();
    const unlaid = r.width === 0 && r.height === 0;
    const horizontal = side === "top" || side === "bottom";
    const viewport = viewportSize();
    setPlacement(({ shift: previous }) => {
      const next = unlaid
        ? previous
        : horizontal
          ? { x: slideInto(r.left - previous.x, r.right - previous.x, viewport.width, dir === "rtl"), y: 0 }
          : { x: 0, y: slideInto(r.top - previous.y, r.bottom - previous.y, viewport.height) };
      const shift = next.x === previous.x && next.y === previous.y ? previous : next;
      return { shift, for: { side, label, dir } };
    });
  }, [bubbleRef, active, measured, side, label, dir]);
  return { shift: placement.shift, measuring: active && !measured };
}

/**
 * The inline style for a slide: none at all when there is nothing to slide, so a bubble
 * that fits renders exactly as it did before G7.
 *
 * A MARGIN, not a `transform` (0.14–0.24 used `transform: translate(…)`), because of what
 * Blink does with the page's width (keksdose run 72, live #381). The slide is decided after
 * a layout that placed the bubble where the CSS alone puts it — past the edge — and that
 * layout already counted it into the page's scrollable overflow. A later change to
 * `transform` alone re-paints but does not re-lay-out, so that overflow was never taken
 * back: measured in Chromium's mobile emulation, a bubble shown at 108–428 on a 406px
 * screen and then slid to 400 by a transform left the page 428 wide, the layout viewport
 * with it (`position: fixed` layers laid out against 428), until the bubble closed. The
 * same slide as a margin is a layout change; the page went back to 406 in the same frame.
 *
 * Physical margins, matching the physical maths: `margin-left` moves a `top` / `bottom`
 * bubble, whose placement is the physical `left: 50%`; `margin-top` moves the four side
 * placements, placed by `top: 50%`. Neither is a margin the placement classes set — they
 * keep their gap on the main axis (`mb-1`, `ms-1`, …).
 */
function shiftStyle(shift: Shift) {
  if (shift.x === 0 && shift.y === 0) return undefined;
  return shift.x !== 0 ? { marginLeft: shift.x } : { marginTop: shift.y };
}

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
  tap,
  children,
  ...rest
}: TooltipVariantProps) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  // The trigger's reading direction, read when the bubble is asked for (an event, not a
  // render): it resolves `start` / `end`, and the portalled bubble — which has left the
  // subtree it would have inherited `dir` from — carries it too.
  const [dir, setDir] = useState<Direction>("ltr");
  const id = useId();
  // Escape closes it outright, since this variant's bubble only exists while it is
  // shown. The next mouseenter/focus brings it back, which is the behaviour WCAG
  // 1.4.13 asks for: dismissible now, still available when you ask again.
  const { open, handlers } = useTooltipTrigger(triggerRef, tap, rest, (el) => setDir(dirOf(el)));

  return (
    <>
      {/* As in `InPlaceTooltip`, no role: the handlers only show and hide the bubble; the
          caller's child is the interactive element, and focusing it shows the bubble. */}
      <span
        // As in `InPlaceTooltip`: the caller's attributes first, the handlers that run
        // this component after them. The BUBBLE is deliberately not given them — it
        // is portalled to `<body>`, and an id or a tour anchor duplicated onto a node
        // that only exists while hovered would match twice or match nothing.
        {...rest}
        ref={triggerRef}
        className={cn("relative inline-flex", className)}
        {...handlers}
      >
        {describedBy(children, open ? id : undefined)}
      </span>
      {open && (
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
        // The glass, not the window: see viewportSize (live #381).
        viewport: viewportSize(),
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
