import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { isComposing } from "../lib/ime";

/*
 * # One Escape stack (round 0.34 Wave 2, DUP-1)
 *
 * Escape closes the TOPMOST thing on screen, and only that: a list open in a dialog
 * closes and the dialog stays; the next press closes the dialog.
 *
 * "Who owns Escape" used to be decided five ways. The anchored pickers listened on the
 * document; Modal, FullBleedDialog, PickerSheet and Popover closed in their own panel's
 * `onKeyDown` and stopped the key; CommandPalette closed without stopping it. A dialog's
 * handler sits earlier on the key's path than any document listener, so Escape in an
 * open list inside a Modal closed the MODAL and threw the form away (BUG-1, sev 4,
 * kastlan's lease dialog), and HoverMenu, the numpad and a tooltip could not be
 * dismissed inside a dialog at all. And Modal and FullBleedDialog disagreed on when a
 * child had "claimed" the key: a ChipInput clearing its draft kept a Modal open and
 * closed a FullBleedDialog.
 *
 * Now every overlay and picker pushes a layer while it is open ({@link useDismissLayer}),
 * last in, first out, the way `use-overlay-history` stacks the Back gesture. One
 * capture-phase listener on the document notes which layer is on top as each Escape
 * goes down — before any handler on the page runs, so a layer that closes on the way
 * cannot pass the key on to the one beneath it. That layer, and only that one, is
 * handed the key:
 *
 * - at the first layer element the key passes on its way back up ({@link takeEscape},
 *   which Modal's panel, a picker's search box and the rest call from their
 *   `onKeyDown`). The key is stopped there, so nothing around the layers — a
 *   FloatingPanel, an app's own panel — closes with it;
 * - or, when focus is in none of them (a hover menu, a tooltip, the numpad over its
 *   field, a press on the page), at the document once the key has been everywhere else.
 *
 * Layers stack in the order they OPEN, which is the order their effects run. Two that
 * open in the same commit stack child first — the one case that order gets wrong, and
 * one no overlay in the kit does: each opens on a press, after whatever it sits in.
 *
 * ## Claiming the key: one rule
 *
 * An Escape that means "undo this step" is not a dismissal: ChipInput clearing its
 * draft, InlineEditField cancelling its edit, the date picker's month grid going back to
 * the days. Those call {@link claimEscape}, and no layer is handed the key. The only
 * other claim is the layer owner's OWN handler — a dialog's `onKeyDown` prop calling
 * `preventDefault()` on Escape (a busy reauth dialog holding itself open, Kurvenschmiede's
 * gear wizard asking first), through {@link runOwnKeyDown}. A `preventDefault()`
 * anywhere else claims nothing: a search box keeping Chromium from clearing itself
 * must not hold a dialog open (FullBleedDialog's 0.8.0 fix, which Modal never had).
 *
 * The owner's handler hears Escape only while its own layer is on top (0.35, KS). It
 * runs before the stack is asked, so with a tooltip, a hover menu or a list open over
 * the dialog and focus on the panel, the gear wizard asked "Discard this gear?" and the
 * tooltip stayed. Now the layer above takes that press, and the next one is the
 * owner's. Every other key reaches the handler as before.
 *
 * A handler that STOPS the key before it reaches a layer element has taken it too —
 * that is the DOM, and it is what the kit's cell editors and confirm buttons do.
 */

/** A layer's handler, read through a ref so the stack holds one stable entry per open. */
interface Layer {
  escape: (e: KeyboardEvent) => void;
  /** Whether it covers the page — a dialog, a sheet, a popover, a list — rather than
   *  annotating it (a tooltip). Counted by {@link useOverlayOpen}. */
  overlay: boolean;
}

/** What {@link useDismissLayer} hands back: its layer while open, for
 *  {@link runOwnKeyDown} to tell whether that layer is the one on top. */
export type DismissLayer = RefObject<Layer | null>;

/** Open layers, oldest first. Module-level, because the order is ACROSS instances. */
const layers: Layer[] = [];

/** Escapes a claimant has taken — see {@link claimEscape}. Weak: an event is garbage
 *  once its dispatch is over. */
const claimed = new WeakSet<Event>();

/** The Escape on its way through the page: the layer that was topmost as it went down,
 *  and whether that layer has been handed it yet. */
let inFlight: { event: KeyboardEvent; layer: Layer; done: boolean } | null = null;

function nativeOf(e: KeyboardEvent | ReactKeyboardEvent): KeyboardEvent {
  return "nativeEvent" in e ? e.nativeEvent : e;
}

function onCapture(e: KeyboardEvent): void {
  if (e.key !== "Escape") return;
  // An Escape inside an IME composition cancels the composition and nothing else.
  const top = isComposing(e) ? undefined : layers[layers.length - 1];
  inFlight = top ? { event: e, layer: top, done: false } : null;
}

/** The fallback: no layer element was on the key's path, or none took it. */
function onBubble(e: KeyboardEvent): void {
  handOver(e, false);
}

function handOver(e: KeyboardEvent | ReactKeyboardEvent, stop: boolean): boolean {
  const native = nativeOf(e);
  const flight = inFlight;
  if (native.key !== "Escape" || !flight || flight.event !== native || flight.done) return false;
  if (claimed.has(native)) return false;
  flight.done = true;
  // Consumed: a type="search" box does not clear itself as well, and a handler further
  // out that checks `defaultPrevented` (FloatingPanel, an app's own panel) leaves it.
  e.preventDefault();
  if (stop) e.stopPropagation();
  // A layer that closed on the way, by a handler of its own, has had its Escape.
  if (layers.includes(flight.layer)) flight.layer.escape(native);
  return true;
}

function push(layer: Layer): void {
  if (layers.length === 0) {
    document.addEventListener("keydown", onCapture, true);
    document.addEventListener("keydown", onBubble);
  }
  layers.push(layer);
  if (layer.overlay) notifyOverlays();
}

function pop(layer: Layer): void {
  const at = layers.indexOf(layer);
  if (at >= 0) layers.splice(at, 1);
  if (at >= 0 && layer.overlay) notifyOverlays();
  if (layers.length > 0) return;
  document.removeEventListener("keydown", onCapture, true);
  document.removeEventListener("keydown", onBubble);
  inFlight = null;
}

/**
 * An Escape layer on the stack while `open`: the topmost layer is handed the next
 * Escape and calls `onEscape`, every layer under it waits its turn. A list opened inside
 * a dialog is above the dialog; a popover opened from a list, above the list.
 *
 * Where focus can be INSIDE the layer, its element's `onKeyDown` calls
 * {@link takeEscape} too, so the key stops there — see the module note. `onEscape` is
 * read live, so it need not be memoised; the layer is pushed and popped only when
 * `open` flips. The layer it returns is for the owner's {@link runOwnKeyDown}.
 */
export function useDismissLayer(
  open: boolean,
  onEscape: (e: KeyboardEvent) => void,
  { overlay = true }: { overlay?: boolean } = {},
): DismissLayer {
  const handlerRef = useRef(onEscape);
  const layerRef = useRef<Layer | null>(null);
  // Written in an effect, not during render, so it satisfies react-hooks/refs: a
  // render that React starts and then discards — a transition, a Suspense retry —
  // would otherwise leave this holding a handler from a tree that never committed,
  // and the stack would go on to call it. Keydown events fire after the commit, so
  // the ref is always current by the time one arrives.
  useEffect(() => {
    handlerRef.current = onEscape;
  });
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const layer: Layer = { escape: (e) => handlerRef.current(e), overlay };
    layerRef.current = layer;
    push(layer);
    return () => {
      pop(layer);
      layerRef.current = null;
    };
  }, [open, overlay]);
  return layerRef;
}

/*
 * Whether an overlay is open (0.49 KIT-11): every layer on the stack but a tooltip's is a
 * dialog, a sheet, a popover, a hover menu or a list covering part of the page, so the
 * stack is also the one place that knows. The floating launchers (`hideWhenOverlay`) step
 * aside while one is open instead of floating over it or beside it.
 */
const overlayListeners = new Set<() => void>();

function notifyOverlays(): void {
  for (const listener of overlayListeners) listener();
}

function subscribeOverlays(listener: () => void): () => void {
  overlayListeners.add(listener);
  return () => {
    overlayListeners.delete(listener);
  };
}

function anyOverlayOpen(): boolean {
  return layers.some((layer) => layer.overlay);
}

/** True while a kit dialog, sheet, popover, hover menu or list is open (any layer of the
 *  Escape stack but a tooltip's). Internal. */
export function useOverlayOpen(enabled = true): boolean {
  const open = useSyncExternalStore(subscribeOverlays, anyOverlayOpen, () => false);
  return enabled && open;
}

/**
 * For a layer's own element, in its `onKeyDown`: hands an Escape on its way up to the
 * topmost layer — this one, unless something opened over it without taking focus (a
 * tooltip, the numpad) — and stops it here. True when it did; false for any other key,
 * a claimed Escape, or one already handed over.
 */
export function takeEscape(e: KeyboardEvent | ReactKeyboardEvent): boolean {
  return handOver(e, true);
}

/**
 * For an Escape that means "undo this step", not "close": the key is the caller's, and
 * no layer is handed it. `preventDefault()`s it as well, so a handler further out that
 * checks `defaultPrevented` leaves it alone, as before.
 */
export function claimEscape(e: KeyboardEvent | ReactKeyboardEvent): void {
  claimed.add(nativeOf(e));
  e.preventDefault();
}

/**
 * Runs a layer owner's own key handler — a dialog's `onKeyDown` prop — and turns a
 * `preventDefault()` it makes on Escape into a claim: the one way, beside
 * {@link claimEscape}, to keep a layer open.
 *
 * Given the owner's `layer` (what {@link useDismissLayer} returned), an Escape that went
 * down while another layer was above that one skips the handler: the press is the
 * layer's on top, and the owner hears the next (0.35, KS). Without it, or while the
 * owner's layer is not open, the handler sees every key, as before.
 */
export function runOwnKeyDown<E extends ReactKeyboardEvent>(
  e: E,
  handler: ((e: E) => void) | undefined,
  layer?: DismissLayer,
): void {
  if (!handler) return;
  if (layer && aboveOwner(e, layer.current)) return;
  const before = e.defaultPrevented;
  handler(e);
  if (e.key === "Escape" && !before && e.defaultPrevented) claimed.add(nativeOf(e));
}

/** Whether this Escape went down with a layer above `owner` — the topmost one then was
 *  another, and `owner` is on the stack. An Escape the stack did not note (one inside an
 *  IME composition) is nobody else's. */
function aboveOwner(e: ReactKeyboardEvent, owner: Layer | null): boolean {
  const flight = inFlight;
  if (e.key !== "Escape" || !owner || !flight || flight.event !== nativeOf(e)) return false;
  return flight.layer !== owner && layers.includes(owner);
}

/**
 * Calls `handler` on an Escape while `enabled` — as an Escape layer. Since 0.34 this is
 * {@link useDismissLayer} with its arguments the other way round: it hears the key only
 * while nothing opened above it, and inside a dialog it no longer loses the key to the
 * dialog (Wave 2, DUP-1). `handler` is read live, so it need not be memoised.
 */
export function useEscapeKey(handler: () => void, enabled = true): void {
  useDismissLayer(enabled, handler);
}

/** Called with each native press an owner's React tree saw — see {@link useOutsideClick}. */
type PressMark = (press: Event) => void;

/** The outside-click hooks watching each ref, for {@link pressInside}. */
const watchers = new WeakMap<RefObject<HTMLElement | null>, Set<PressMark>>();

/** What an `onPointerDownCapture` hands over: a React event, its press inside. */
type ReactPress = { nativeEvent: Event };

/**
 * An `onPointerDownCapture` for a panel whose `ref` an outside-click hook watches but
 * whose element the hook's owner does not render — {@link DropdownPanel} and
 * `ComboboxPanel` take `panelRef` from `useDropdown` / `useComboboxCore`. Every press
 * that reaches the panel through the React tree, a portalled list opened inside it
 * included, is marked inside for each hook watching `ref`. See {@link useOutsideClick}.
 */
export function pressInside(ref: RefObject<HTMLElement | null> | undefined): ((e: ReactPress) => void) | undefined {
  if (!ref) return undefined;
  return (e) => {
    watchers.get(ref)?.forEach((mark) => mark(e.nativeEvent));
  };
}

/**
 * Calls `handler` on a press that lands outside every supplied element, while
 * `enabled` — the outside-click-to-close half of the same dismissal story. Pass one
 * ref or several (trigger + panel); a press inside any of them is ignored. Refs and
 * `handler` are read live, so an inline `[triggerRef, panelRef]` array is fine and
 * won't churn the listener.
 *
 * ## A panel opened from inside is inside (0.48, keksdose dev#623)
 *
 * A CurrencySelect in a Popover: the currency list is portalled to `<body>`, so in the
 * DOM it is outside the popover's panel, and the first press on a currency closed the
 * POPOVER at pointerdown — the list went with it and the choice never landed. The same
 * for a combobox, a menu, a date picker's popover, a dropdown, at any depth.
 *
 * In the React tree the portal is still where it was opened from, and React passes a
 * press up that tree, through portals. So the hook hands back an
 * `onPointerDownCapture`: put it on the element the press should count as inside of —
 * the kit's Popover panel, HoverMenu, DropdownPanel and ComboboxPanel do — and every
 * press that travels through that element in React, portalled panels opened inside it
 * included, is not outside. React's listeners sit on the root and on each portal's
 * container, so they hear the press before this document listener does. No owner chain
 * to keep: depth is free, and an app's own portal inside a kit panel is covered too. A
 * panel the hook's owner does not render takes {@link pressInside} with the watched ref.
 *
 * **`pointerdown`, not `mousedown`** — one event covering mouse, touch and pen.
 * This listened for `mousedown` alone, which on a touch platform is a SYNTHESISED
 * event: the browser emits it for most taps, which is why nothing obviously broke,
 * but the synthesis is not guaranteed. A tap that begins a scroll, or one that lands
 * on an element which preventDefaults the touch sequence, may never produce one — and
 * on a phone-first PWA whose pickers, menus and flyouts all dismiss through this hook,
 * inheriting that is worse than choosing it.
 *
 * The one behaviour this changes deliberately: a touch-drag that starts outside an
 * open panel now dismisses it at touch-down, where before it did not dismiss at all
 * (a drag synthesises no mousedown). That matches every other platform surface, and
 * the anchored panels re-measure on scroll precisely because the page moves under
 * them.
 */
export function useOutsideClick(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  handler: () => void,
  enabled = true,
): (e: ReactPress) => void {
  const refsRef = useRef(refs);
  const handlerRef = useRef(handler);
  // The last press this owner's React tree saw: the one the document listener is about
  // to hear, when it went through a panel the owner marked.
  const insideRef = useRef<Event | null>(null);
  // In an effect rather than during render — see the note in useDismissLayer.
  useEffect(() => {
    refsRef.current = refs;
    handlerRef.current = handler;
  });
  const markInside = useCallback((e: ReactPress) => {
    insideRef.current = e.nativeEvent;
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const mark: PressMark = (press) => {
      insideRef.current = press;
    };
    const watched = Array.isArray(refsRef.current) ? refsRef.current : [refsRef.current];
    for (const r of watched) {
      const set = watchers.get(r) ?? new Set<PressMark>();
      set.add(mark);
      watchers.set(r, set);
    }
    const onPointerDown = (e: Event) => {
      const inside = insideRef.current === e;
      insideRef.current = null;
      if (inside) return;
      const target = e.target as Node;
      const list = Array.isArray(refsRef.current) ? refsRef.current : [refsRef.current];
      for (const r of list) {
        if (r.current?.contains(target)) return;
      }
      handlerRef.current();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      for (const r of watched) watchers.get(r)?.delete(mark);
    };
  }, [enabled]);
  return markInside;
}
