import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { Button } from "../components/button";
import { firstTabStop, tabStops, useFocusTrap } from "../hooks/use-focus-trap";
import { useDismissLayer } from "../hooks/use-dismiss";
import { sameRect } from "../hooks/use-anchored-rect";
import { anchoredInline, viewportSize } from "../hooks/use-anchored-panel";
import { useBreakpoint } from "../hooks/use-breakpoint";
import { useCoarsePointer } from "../hooks/use-large-text";
import { dirOf, horizontalStep } from "../lib/direction";
import { isComposing } from "../lib/ime";
import { focusQuietly } from "../lib/quiet-focus";
import type { Direction } from "../lib/direction";
import type { TourLabels, TourPlacement, TourStep, TourStepContext } from "./tour";
import { devWarnings, isShown, stepContext, type GateRegistry } from "./tour-gates";
import { dockEdge, dockStyle, readBand, scrollIntoFreeHalf, type DockEdge } from "./tour-dock";

/*
 * # The tour's overlay: the card, the spotlight and its shields, the placement, the dock
 *
 * Its own module since 0.52 (refactor audit 2026-10-30, MOD-1): `TourProvider` is mounted
 * above every app's routes and renders this only while a tour runs, so it is loaded by a
 * literal `import()` when a tour first starts (tour.tsx), not with the provider — about
 * 28.5 kB minified, 10.3 kB gzip that sat in each app's first load (measured at 0.51.6). Nothing here is public; what
 * the provider shares with it (the step context, `when`, the gates) is in tour-gates.ts.
 */

/** The app's `refuse` on the step that awaits its key (§11.4). */
export interface Refusal {
  step: TourStep;
  reason?: string;
  /** Bumped per refusal, so the same words are announced again. */
  seq: number;
}

const NOOP = () => {};

/** The first step in [floor, index) shown now whose gate is published and unsatisfied, or -1. */
function firstEmptied(steps: TourStep[], floor: number, index: number, gates: GateRegistry): number {
  const ctx = stepContext(gates, "goto");
  for (let j = floor; j < index; j++) {
    const key = steps[j].gate;
    if (key && gates.get(key) === false && isShown(steps[j], ctx)) return j;
  }
  return -1;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function isVisible(el: Element): boolean {
  // A non-zero box already rules out display:none on the element or any ancestor
  // (an unrendered element measures 0x0). We deliberately do NOT test
  // offsetParent: it is null for position:fixed elements even when fully visible,
  // which made the mobile bottom-nav bar (fixed) un-highlightable on mobile
  // (feedback #313). visibility:hidden keeps a box, so check it explicitly.
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const style = getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none";
}

// The first VISIBLE element matching the selector, not merely the first in DOM
// order. This lets a step target the same control across layouts with one
// combined selector — e.g. the desktop sidebar link AND the mobile bottom-bar
// link — where the off-layout copy is present but `display:none` (feedback
// #313). Returns null while none is visible so the finder keeps retrying.
function queryVisibleTarget(selector: string): Element | null {
  const els = document.querySelectorAll(selector);
  for (const el of els) {
    if (isVisible(el)) return el;
  }
  return null;
}

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** The two-tone frame's width outside the spot (3px white, 2px keyline), plus a pixel. */
const RING_BAND = 6;

/**
 * What a step's ring frames (keksdose S1, §11.6): the target, and on a FIELD step also the
 * lines that describe the field from outside it — the elements its `aria-describedby`
 * (on the target or a control inside) names that lie within the ring's reach of it (a
 * caption, a hint or warning line, an error drawn under or above the field). Without
 * them the ring's frame ran through such a line; with them it frames field and line, and
 * the line is lit, not under the scrim. A kit field's own caption and error are inside
 * its root already. A line far away (a tooltip, another part of the page) is not taken.
 */
function spotRectOf(el: Element, step: TourStep): Rect {
  const own = rectOf(el);
  if (!isFieldStep(step)) return own;
  const ids = new Set<string>();
  const holders = [el, ...Array.from(el.querySelectorAll("[aria-describedby]"))];
  for (const holder of holders) {
    for (const id of (holder.getAttribute("aria-describedby") ?? "").split(/\s+/)) if (id) ids.add(id);
  }
  if (ids.size === 0) return own;
  const lines: DOMRect[] = [];
  for (const id of ids) {
    const line = document.getElementById(id);
    if (!line || el.contains(line) || line.closest('[role="tooltip"]') || !isVisible(line)) continue;
    const r = line.getBoundingClientRect();
    // An `sr-only` description measures 1×1: nothing to frame.
    if (r.width > 1 && r.height > 1) lines.push(r);
  }
  let top = own.top;
  let left = own.left;
  let right = own.left + own.width;
  let bottom = own.top + own.height;
  const reach = (step.padding ?? 8) + RING_BAND;
  // Grow until nothing more is in reach: a hint under the field, then an error under it.
  for (let grew = true; grew;) {
    grew = false;
    for (let i = lines.length - 1; i >= 0; i--) {
      const r = lines[i];
      const across = r.left < right && r.right > left;
      const gap = Math.max(r.top - bottom, top - r.bottom);
      if (!across || gap > reach) continue;
      top = Math.min(top, r.top);
      left = Math.min(left, r.left);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
      lines.splice(i, 1);
      grew = true;
    }
  }
  return { top, left, width: right - left, height: bottom - top };
}

/**
 * What the finder established for ONE step: where its target is (`null` = no target,
 * or not on the page), and the reading direction the card takes from it.
 *
 * It carries the step it was found for, and the overlay only believes it for that
 * step — which is the whole fix for keksdose's tours audit 2026-10-02, §1.0 A ("stale
 * spotlight on the step after a spotlighted one", 15 steps in 16 tours, desktop and
 * phone, mouse and keyboard). When step N spotlit a target and step N+1 had none (or
 * its anchor was missing), N+1 kept N's hole and parked its card beside it, so a
 * centred "You're all set" read as pointing at the Import & Export link; Back→Next kept
 * it for as long as anyone watched.
 *
 * The overlay used to hold `rect` and `ready` as separate states and reset them
 * DURING RENDER when the step changed. React 19 does not keep a render-phase update
 * while an earlier, lower-priority update to the same hook is still queued — it only
 * writes the result to the base state "unless the queue is empty" — and the follow
 * interval below queues exactly such an update every 250 ms (eagerly bailed out because
 * the rect had not moved, but left in the queue for rebasing). So the click's render
 * showed the reset, and the very next render (the finder saying "ready") re-based on
 * the old rect. A deep link was fine because nothing had queued anything yet.
 *
 * Keying the result to its step does not depend on any of that ordering: a rect found
 * for another step is not this step's rect, whatever the queue does with it, and a
 * missing anchor reads as "no target" instead of as the last thing that was lit.
 */
interface Located {
  index: number;
  step: TourStep;
  rect: Rect | null;
  dir: Direction;
  /**
   * A field step's own container (§11.6): inserted right after the kit layer holding the
   * target (`host.after`), or at the end of <body> on the page. `null` on a plain step,
   * which is portalled to <body> at z-[60] as ever.
   */
  layer: HTMLElement | null;
  /** The host fills the visual viewport (a phone's FullBleedDialog): no scrim, no shields. */
  fullScreen: boolean;
}

/** The kit layer (`data-kit-layer`) holding `el`, if any. */
function layerHost(el: Element): HTMLElement | null {
  return el.closest<HTMLElement>("[data-kit-layer]");
}

/**
 * Does the host fill the visual viewport? A backdrop host (`data-kit-layer="backdrop"`:
 * Modal, FullBleedDialog) is judged by its panel, the child holding the target.
 */
function coversViewport(host: HTMLElement, el: Element): boolean {
  let surface: Element = host;
  if (host.getAttribute("data-kit-layer") === "backdrop") {
    for (const child of Array.from(host.children)) {
      if (child.contains(el)) {
        surface = child;
        break;
      }
    }
  }
  const r = surface.getBoundingClientRect();
  const vv = window.visualViewport;
  // Without a visual viewport, the glass (`viewportSize`), not `innerWidth`: an overflow
  // grows the layout viewport, and a sheet as wide as the screen read as narrower than it
  // (refactor audit 2026-10-30, DUP-9; live #381).
  const view = viewportSize();
  const top = vv?.offsetTop ?? 0;
  const bottom = top + (vv?.height ?? view.height);
  const width = vv?.width ?? view.width;
  return r.width > 0 && r.left <= 1 && r.top <= top + 1 && r.right >= width - 1 && r.bottom >= bottom - 1;
}

/** Does this step's card dock now (§11.7)? Below `sm` (`phone`), and `"dock"` or a field
 *  step with no placement while the provider docks on phones. */
function docks(step: TourStep, dockOnPhones: boolean, phone: boolean): boolean {
  if (!phone || !step.target) return false;
  return step.placement === "dock" || (step.placement === undefined && dockOnPhones && isFieldStep(step));
}

/** A step whose control is for using: its card joins the layer stack above the field (§11.6). */
function isFieldStep(step: TourStep): boolean {
  return !!(step.interactive || step.awaitInput || step.gate || step.awaitGate);
}

export function TourOverlay({
  steps,
  index,
  via,
  floor,
  position,
  count,
  refusal,
  onGoTo,
  labels,
  gates,
  dockOnPhones,
  onNext,
  onPrev,
  onSkip,
}: {
  steps: TourStep[];
  index: number;
  via: TourStepContext["via"];
  floor: number;
  /** The app refused this step's save (§11.4). */
  refusal: Refusal | null;
  onGoTo: (index: number) => void;
  /** 1-based among the steps shown; Back is hidden on the first, Done on the last. */
  position: number;
  count: number;
  labels: TourLabels;
  gates: GateRegistry;
  dockOnPhones: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const step = steps[index];
  const isFirst = position <= 1;
  const isLast = position >= count;
  // A new step starts unlocated: whatever was found for another step (see `Located`)
  // is ignored, so the overlay renders nothing until the effect below has located THIS
  // step, and never the previous step's spotlight.
  const [located, setLocated] = useState<Located | null>(null);
  const current = located !== null && located.index === index && located.step === step ? located : null;
  const ready = current !== null;
  const rect = current?.rect ?? null;
  // The overlay is portalled to <body>, out of whatever `dir` subtree the app set, so it
  // takes the direction of the element it spotlights (the document's for a centered
  // step). Arrow keys and start/end placement read it.
  const dir: Direction = current?.dir ?? "ltr";
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const bodyId = useId();
  const hintId = useId();
  // Below `sm` at the text size in force (§3.3: 640 px at Normal, 800 at Large), the
  // question CSS's `max-sm:` asks — a fixed 640 docked nothing in a 700 px window at
  // Large, which lays the page out as a phone (refactor audit 2026-10-30, DUP-9).
  const phone = useBreakpoint("max-sm");
  // A touch screen: the card takes focus, so no keyboard or pad opens before the step is
  // read (§11.8).
  const coarse = useCoarsePointer();

  // The gate (§11.1). Re-rendered on every registry change while the tour runs.
  const gateVersion = useSyncExternalStore(gates.subscribe, gates.version, gates.version);
  const gateKey = step.gate;
  const enforced = !!gateKey && gates.has(gateKey);
  const locked = enforced && gates.get(gateKey) !== true;

  // The polite live region (§11.8): `gateReady` once a gate opens, the hint on a locked
  // Next. A repeat of the same words gets a trailing zero-width space so it is read again.
  const [polite, setPolite] = useState("");
  const announce = useCallback((text: string) => {
    setPolite((prev) => (prev === text ? `${text}\u200b` : text));
  }, []);

  // Run beforeStep, then locate the target (retrying across route/render lag).
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    // `null` = untargeted, or the finder gave up → the card centres, with no hole.
    const settle = (el: Element | null) => {
      let layer: HTMLElement | null = null;
      let fullScreen = false;
      if (el && isFieldStep(step)) {
        // §11.6: directly above the layer holding the field — DOM order decides between
        // the kit's z-50 body children, so this paints over the host and everything opened
        // before it, and under whatever the field opens next (a list, the number pad).
        const host = layerHost(el);
        layer = document.createElement("div");
        layer.setAttribute("data-tour-layer", "");
        if (host) host.after(layer);
        else document.body.appendChild(layer);
        fullScreen = !!host && coversViewport(host, el);
      }
      setLocated({ index, step, rect: el ? spotRectOf(el, step) : null, dir: dirOf(el), layer, fullScreen });
    };
    void (async () => {
      try {
        await step.beforeStep?.(stepContext(gates, via));
      } catch (error) {
        // The step is shown anyway (FLW-5): left unlocated, the tour stayed `active`
        // with no card, no scrim and no Escape layer, and everything keyed on "a tour
        // runs" (the `?tour=` mirror, the apps' PWA-update hold) stayed on with it. The
        // target may well be there regardless; if not, the finder gives up and centres.
        console.error(error);
      }
      if (cancelled) return;
      if (!step.target) {
        settle(null);
        return;
      }
      let tries = 0;
      const find = () => {
        if (cancelled) return;
        const el = queryVisibleTarget(step.target!);
        if (el) {
          // A docked step scrolls the field into the half the card leaves free, through
          // the field's own scroll container (§11.7); any other centres it, as ever.
          if (docks(step, dockOnPhones, phone)) scrollIntoFreeHalf(el, null, null);
          else el.scrollIntoView({ block: "center", behavior: "smooth" });
          settle(el);
          return;
        }
        if (tries++ < 45) raf = requestAnimationFrame(find);
        else settle(null); // give up → render centered
      };
      find();
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // `via` and the gates are read at arrival, not followed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, step]);

  // Follow the target as the page scrolls / reflows — only once THIS step is located,
  // and only into this step's result.
  useEffect(() => {
    if (!step.target) return;
    const update = () => {
      const el = queryVisibleTarget(step.target!);
      if (el) {
        const next = spotRectOf(el, step);
        // A sheet that grows to full screen (or shrinks from it) takes or drops the scrim.
        const host = layerHost(el);
        const full = !!host && coversViewport(host, el);
        setLocated((prev) => {
          if (!prev || prev.index !== index || prev.step !== step) return prev;
          const fullScreen = prev.layer ? full : prev.fullScreen;
          if (sameRect(prev.rect, next) && fullScreen === prev.fullScreen) return prev;
          return { ...prev, rect: next, fullScreen };
        });
      }
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    const id = window.setInterval(update, 250);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      clearInterval(id);
    };
  }, [index, step]);

  // A field step's container goes with the step (and with the tour).
  const layer = located?.layer ?? null;
  useEffect(() => {
    if (!layer) return;
    return () => layer.remove();
  }, [layer]);

  // Escape (§11.6.4): the tour is a layer on the kit's Escape stack, pushed on each
  // arrival, so it sits above the sheet holding the form. Escape from the card skips the
  // tour and no longer also closes that sheet; a layer the field opens afterwards (a
  // list, the pad) is above the tour and takes Escape first. An Escape pressed in the
  // field itself belongs to the field: the tour lets it pass by doing nothing.
  useDismissLayer(
    ready,
    (e) => {
      if (fieldStepNow && step.target && e.target instanceof Node) {
        const el = queryVisibleTarget(step.target);
        if (el?.contains(e.target)) return;
      }
      onSkip();
    },
    // Not an overlay to `useOverlayOpen`: a floating launcher a tour spotlights stays.
    { overlay: false },
  );

  // awaitClick: advance when the *real* target is clicked. The spotlight hole is
  // click-through (see the shields in the render below) so the element's own
  // handler runs first; we step forward on the next macrotask.
  //
  // Re-armed when the target turns up after the finder gave up (the follow effect
  // lights it late): the card swaps Next for the "click the highlighted element" hint
  // as soon as there is a rect, so the click must work from that moment too.
  const spotted = rect !== null;
  useEffect(() => {
    if (!ready || !spotted || !step.awaitClick || !step.target) return;
    const el = queryVisibleTarget(step.target);
    if (!el) return;
    const onClick = () => window.setTimeout(() => onNext(), 0);
    el.addEventListener("click", onClick, { once: true });
    return () => el.removeEventListener("click", onClick);
  }, [ready, spotted, index, step, onNext]);

  // A field step (see `TourStep.interactive`): only while the target is lit — a step
  // whose target is missing centres its card over a full scrim, modal as ever.
  const interactive =
    spotted && !!step.target && !!(step.interactive || step.awaitInput || step.gate || step.awaitGate);
  // A GUIDED field step (§11.8): focus goes to the field on a fine pointer, and Tab
  // cycles field + card. A plain `interactive` step keeps the card's own trap.
  const guided = interactive && !!(step.gate || step.awaitInput || step.awaitGate);
  const fieldStepNow = interactive;
  // An awaitGate step whose target is lit: only `release` moves it (a missing Save
  // button would otherwise be a dead end, as for awaitClick).
  const awaitsRelease = spotted && !!step.target && !!step.awaitGate;

  // A gate nobody publishes is not enforced: Next opens, and a development build says why
  // (on arrival, or when its publisher unmounts under the step), once per step.
  const warnedGateRef = useRef<TourStep | null>(null);
  useEffect(() => {
    if (!ready || !gateKey || gates.has(gateKey) || !devWarnings() || warnedGateRef.current === step) return;
    warnedGateRef.current = step;
    console.warn(
      `[ui-kit] Tour step "${step.title}" waits for the gate "${gateKey}", which nothing publishes: its Next is open. ` +
        "Publish it with useTourGate beside the field, or the form has closed under the tour.",
    );
  }, [ready, gateKey, gates, step, gateVersion]);

  // `optional` means "may stay EMPTY": without a gate there is no value to compare.
  useEffect(() => {
    if (!ready || !step.optional || step.gate || !devWarnings()) return;
    console.warn(
      `[ui-kit] Tour step "${step.title}" is \`optional\` without a \`gate\`: it shows the Optional chip ` +
        'and a plain Next. "Leave empty" needs a gate to compare.',
    );
  }, [ready, step]);

  // "Ready" once, when this step's gate turns satisfied (not when it arrives satisfied).
  const wasLockedRef = useRef<{ step: TourStep; locked: boolean } | null>(null);
  useEffect(() => {
    if (!ready || !gateKey) return;
    const before = wasLockedRef.current;
    if (before && before.step === step && before.locked && !locked && enforced) announce(labels.gateReady);
    wasLockedRef.current = { step, locked };
  }, [ready, gateKey, step, locked, enforced, announce, labels.gateReady]);

  // Arrival on a guided step: the field takes focus on a fine pointer, the card on a
  // coarse one; the field is described by the card's body while the step lasts.
  // Declared BEFORE the advance listeners below, so the focus it moves is not mistaken
  // for the person leaving the field.
  useEffect(() => {
    if (!ready || !guided || !step.target) return;
    const el = queryVisibleTarget(step.target);
    const control = el ? firstTabStop(el) : null;
    // Described BEFORE it is focused, so a screen reader reads the step with the field's
    // name. Focused quietly (0.50.1, keksdose B1): a picker that opens on focus stays
    // closed, or its list would cover the card; ArrowDown, typing or a click opens it.
    const previous = control ? control.getAttribute("aria-describedby") : null;
    if (control) control.setAttribute("aria-describedby", previous ? `${previous} ${bodyId}` : bodyId);
    if (coarse || !control) cardRef.current?.focus();
    else if (!el!.contains(document.activeElement)) focusQuietly(control);
    if (!control) return;
    return () => {
      if (previous === null) control.removeAttribute("aria-describedby");
      else control.setAttribute("aria-describedby", previous);
    };
  }, [ready, guided, index, step, bodyId, coarse]);

  // Tab on a guided step cycles field + card as one ring (§11.8): from the field's last
  // stop to the card's first, from the card's last back to the field. Captured on the
  // document, ahead of a sheet's own trap, which would wrap inside the sheet.
  useEffect(() => {
    if (!ready || !guided || !step.target) return;
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const el = queryVisibleTarget(step.target!);
      const card = cardRef.current;
      if (!el || !card) return;
      const active = document.activeElement;
      const fieldStops = tabStops(el);
      const cardStops = tabStops(card);
      if (fieldStops.length === 0 || cardStops.length === 0) return;
      let to: HTMLElement | null = null;
      if (active instanceof Node && el.contains(active)) {
        if (!e.shiftKey && active === fieldStops[fieldStops.length - 1]) to = cardStops[0];
        else if (e.shiftKey && active === fieldStops[0]) to = cardStops[cardStops.length - 1];
      } else if (active instanceof Node && card.contains(active)) {
        if (!e.shiftKey && active === cardStops[cardStops.length - 1]) to = fieldStops[0];
        else if (e.shiftKey && (active === cardStops[0] || active === card)) to = fieldStops[fieldStops.length - 1];
      }
      if (!to) return;
      e.preventDefault();
      e.stopPropagation();
      to.focus();
    };
    document.addEventListener("keydown", onTab, true);
    return () => document.removeEventListener("keydown", onTab, true);
  }, [ready, guided, index, step]);

  // gate: once satisfied, advance on Enter in the field (unless the control took it, or
  // a textarea without Ctrl/Cmd) or on focus leaving the field to nowhere or to the card.
  // Checked on the next macrotask, after the field's own blur/Enter commit has rendered.
  useEffect(() => {
    if (!ready || !spotted || !gateKey || !step.target) return;
    const el = queryVisibleTarget(step.target) as HTMLElement | null;
    if (!el) return;
    const satisfied = () => !gates.has(gateKey) || gates.get(gateKey) === true;
    let timer = 0;
    // Focus that was in the field when the step settled, or went there since. A focus
    // move the tour made itself (the card taking it on a phone) is not a leave.
    let armed = el.contains(document.activeElement);
    const check = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (satisfied()) onNext();
      }, 0);
    };
    const onFocusIn = () => {
      armed = true;
    };
    const onFocusOut = (e: FocusEvent) => {
      const to = e.relatedTarget;
      if (to instanceof Node && el.contains(to)) return;
      const wasArmed = armed;
      armed = false;
      if (!wasArmed) return;
      if (to === null || (to instanceof Node && rootRef.current?.contains(to))) check();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || !(e.target instanceof Node) || !el.contains(e.target)) return;
      // Heard at the document, after React's handlers: a combobox picking an option has
      // called preventDefault by now.
      if (e.defaultPrevented || isComposing(e)) return;
      if (e.target instanceof HTMLTextAreaElement && !(e.ctrlKey || e.metaKey)) return;
      check();
    };
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ready, spotted, gateKey, gates, index, step, onNext]);

  // awaitInput: advance once the target's fields hold another value than when the step
  // was armed, checked when focus leaves the target or Enter is pressed in it — on the
  // next macrotask, after the field's own blur/Enter commit has rendered. A value the
  // number pad typed fires no native `change`, so comparing is what catches it.
  useEffect(() => {
    if (!ready || !spotted || !step.awaitInput || !step.target) return;
    const el = queryVisibleTarget(step.target) as HTMLElement | null;
    if (!el) return;
    const read = () => fieldValues(el);
    const before = read();
    let timer = 0;
    let done = false;
    const check = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (done || read() === before) return;
        done = true;
        onNext();
      }, 0);
    };
    const onFocusOut = (e: FocusEvent) => {
      if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
      check();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") check();
    };
    el.addEventListener("focusout", onFocusOut);
    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("change", check);
    return () => {
      window.clearTimeout(timer);
      el.removeEventListener("focusout", onFocusOut);
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("change", check);
    };
  }, [ready, spotted, index, step, onNext]);

  /** A press on the locked Next (or Enter / → from the card): no move; the field takes
   *  focus and the hint is read again. */
  const gateHint = step.gateHint ?? labels.gateHint;
  const lockedNext = useCallback(() => {
    const el = step.target ? queryVisibleTarget(step.target) : null;
    const control = el ? firstTabStop(el) : null;
    // Quietly, as on arrival: the hint is read with the card in view, not under a list.
    if (control) focusQuietly(control);
    announce(gateHint);
  }, [step.target, announce, gateHint]);
  const tryNext = awaitsRelease ? NOOP : locked ? lockedNext : onNext;

  // After a refused save: the first earlier step shown whose field is now empty (§11.4).
  // Computed each render, which the gate subscription above triggers: a field filled
  // again drops the link.
  const backTo = refusal ? firstEmptied(steps, floor, index, gates) : -1;

  // Keyboard: Esc skips, Enter and the reading-direction arrow advance (→ in LTR,
  // ← in RTL), the other arrow goes back. On awaitClick steps Enter is ignored (it
  // would fire the target's click AND advance) — the forward arrow stays as an escape
  // hatch. On a locked gate step both are the locked Next.
  //
  // Enter on a focused control belongs to that control. This used to advance from
  // anywhere, so Enter on a focused Skip or Back ran the button's own click AND stepped
  // forward: Back moved nowhere, Skip skipped and then called `next` on a dead tour.
  // The same goes for arrows in a text field a step's `action` might contain.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // On an interactive step a key pressed in the target, or in a layer it opened (the
      // number pad's Escape, a menu's arrows), is the page's. The card's and the bare
      // page's (focus on <body>) stay the tour's.
      if (
        interactive &&
        e.target instanceof Node &&
        e.target !== document.body &&
        !rootRef.current?.contains(e.target)
      ) {
        return;
      }
      // Escape is the tour's Escape layer's (above) once the step is shown; while it is
      // still being located there is no layer yet, and the tour takes it here as in 0.49.
      if (e.key === "Escape") {
        if (!ready) onSkip();
        return;
      }
      // Nothing on screen to move on from: a step whose `beforeStep` is still running
      // (a route loading) is not passed over by an Enter or a → pressed on the bare
      // page (FLW-5). Escape, above, still leaves.
      if (!ready) return;
      if (e.key === "Enter") {
        if (step.awaitClick || step.awaitInput || ownsKey(e.target, "Enter")) return;
        e.preventDefault();
        tryNext();
        return;
      }
      if (ownsKey(e.target, e.key)) return;
      // The overlay root carries `dir`; before it paints, the document's answers.
      const delta = horizontalStep(e.key, rootRef.current);
      if (delta === 1) {
        e.preventDefault();
        tryNext();
      } else if (delta === -1) {
        if (!isFirst) onPrev();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isFirst, step, interactive, tryNext, onPrev, onSkip, ready]);

  if (!ready) return null;

  // No scrim, no shields: a field step inside a layer that fills the screen (§11.6.3).
  const bare = interactive && !!current?.fullScreen;
  const pad = step.padding ?? 8;
  const spot: Rect | null = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  // `aria-modal` promises the page behind is out of reach, and the card's focus trap
  // keeps that promise for the keyboard. The pointer used to get no such treatment: the
  // root is `pointer-events-none` so that the spotlight hole can stay live for
  // `awaitClick`, and the scrim is a box-shadow, which takes no clicks — so every
  // control on the dimmed page stayed clickable. Four shields now tile the viewport
  // around the hole: the page is blocked, the card and the spotlighted target are not.
  // Keeping `aria-modal` (rather than dropping it) is the coherent half: the tour
  // really is modal — focus is trapped and Esc/Skip is the way out.
  return createPortal(
    <div
      ref={rootRef}
      // z-50 on a field step, in its own container right after the layer holding the field
      // (or at the end of <body>): over that layer and the page, under the z-50 layers the
      // field opens next (§11.6). z-[60] on a plain step, over everything.
      className={cn("pointer-events-none fixed inset-0", interactive ? "z-50" : "z-[60]")}
      role="dialog"
      aria-modal={interactive ? undefined : "true"}
      // A stable marker for the overlay, on every step (0.48, keksdose dev#611–613): an
      // app that hides its floating help launcher while a modal is open excepts the
      // tour, which may spotlight that launcher — `[aria-modal="true"]:not([data-tour-overlay])`.
      // keksdose matched the `pointer-events-none` class until now, which is the kit's to change.
      data-tour-overlay=""
      data-tour-interactive={interactive ? "" : undefined}
      data-tour-bare={bare ? "" : undefined}
      aria-label={step.title}
      dir={dir}
    >
      {/* In a full-screen layer (a phone's form sheet) no scrim and no shields: the rest of
          the form stays usable and scrollable, and the ring alone marks the field. */}
      {spot && !bare && <SpotlightShields spot={spot} />}
      {spot ? (
        <div
          className="pointer-events-none fixed rounded-lg transition-all duration-200 ease-out"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            // A two-tone frame, not a single translucent ring.
            //
            // The old treatment was `ring-2 ring-white/80` over a 55% scrim, and it
            // "was barely visible" on the app's blue-tinted surfaces. Two reasons,
            // and a single ring can't fix either: at 55% the surround stays bright
            // enough that the un-dimmed hole barely reads AS a hole, and a 80%-white
            // ring sitting on the edge of a light card is white-on-near-white.
            //
            // So: an opaque white band immediately around the target, a dark keyline
            // outside it, then the scrim. Whatever the target's own colour is, one of
            // the two bands is always in contrast with it and the other is always in
            // contrast with the dimmed surround — there is no background that can
            // swallow both. The blurred layer between them softens the step so the
            // frame reads as lighting rather than as a pasted-on rectangle.
            boxShadow: [
              "0 0 0 3px rgba(255,255,255,0.98)",
              "0 0 0 5px rgba(15,23,42,0.92)",
              "0 0 18px 6px rgba(15,23,42,0.45)",
              ...(bare ? [] : ["0 0 0 9999px rgba(15,23,42,0.70)"]),
            ].join(", "),
          }}
        />
      ) : (
        <div className="pointer-events-auto fixed inset-0 bg-black/70" />
      )}
      <TourCard
        cardRef={cardRef}
        step={step}
        index={index}
        position={position}
        total={count}
        labels={labels}
        isFirst={isFirst}
        isLast={isLast}
        rect={spot}
        dir={dir}
        trap={!guided}
        bodyId={bodyId}
        hintId={hintId}
        locked={locked}
        gateHint={gateHint}
        onBack={onPrev}
        onNext={tryNext}
        onLeaveEmpty={onNext}
        onSkip={onSkip}
        awaitsRelease={awaitsRelease}
        docked={spot !== null && docks(step, dockOnPhones, phone)}
        refusal={refusal}
        backTo={backTo >= 0 ? { title: steps[backTo].title, go: () => onGoTo(backTo) } : null}
      />
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {polite}
      </div>
    </div>,
    (interactive && current?.layer) || document.body,
  );
}

/** The values of the fields at or inside `el`, as one string to compare (`awaitInput`). */
function fieldValues(el: Element): string {
  const fields = el.matches("input,textarea,select") ? [el] : Array.from(el.querySelectorAll("input,textarea,select"));
  return fields
    .map((f) =>
      f instanceof HTMLInputElement && (f.type === "checkbox" || f.type === "radio")
        ? String(f.checked)
        : (f as HTMLInputElement).value,
    )
    .join("\u0000");
}

/** Does the focused element handle `key` itself? Enter on a button or link, and any
 *  editing key in a text field or select, is the control's — not the tour's. */
function ownsKey(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (target as HTMLInputElement).type;
    // Enter on a checkbox does nothing natively, but ←/→ on a radio moves it.
    return key !== "Enter" || type !== "checkbox";
  }
  if (key !== "Enter") return false;
  return (
    tag === "BUTTON" ||
    (tag === "A" && target.hasAttribute("href")) ||
    target.getAttribute("role") === "button" ||
    target.getAttribute("role") === "link"
  );
}

/**
 * Transparent pointer blockers tiling the viewport around the spotlight hole: one
 * full-width band above and below, one on each side at the hole's own height. The hole
 * itself stays uncovered, so the target keeps its clicks.
 */
function SpotlightShields({ spot }: { spot: Rect }) {
  const shield = "pointer-events-auto fixed";
  const bottom = spot.top + spot.height;
  return (
    <>
      <div
        data-tour-shield=""
        className={shield}
        style={{ top: 0, left: 0, right: 0, height: Math.max(0, spot.top) }}
      />
      <div data-tour-shield="" className={shield} style={{ top: bottom, left: 0, right: 0, bottom: 0 }} />
      <div
        data-tour-shield=""
        className={shield}
        style={{ top: spot.top, left: 0, width: Math.max(0, spot.left), height: spot.height }}
      />
      <div
        data-tour-shield=""
        className={shield}
        style={{ top: spot.top, left: spot.left + spot.width, right: 0, height: spot.height }}
      />
    </>
  );
}

/**
 * Card position (viewport px) for the given placement relative to the padded
 * spotlight `rect`. Omitted placement keeps the original auto behavior
 * (below → above → vertically centered); an explicit side flips to its opposite
 * if it would overflow, then clamps into the viewport. "center" (or no rect)
 * centers on screen.
 */
function placeCard(
  rect: Rect | null,
  cw: number,
  ch: number,
  vw: number,
  vh: number,
  m: number,
  placement?: TourPlacement,
  dir: Direction = "ltr",
): { top: number; left: number } {
  // The logical sides resolve to a physical one here, and only here.
  if (placement === "start") placement = dir === "rtl" ? "right" : "left";
  else if (placement === "end") placement = dir === "rtl" ? "left" : "right";
  // Every anchored panel's inline clamp (`anchoredInline`; refactor audit 2026-10-30,
  // DUP-9): `m` inside the glass, and a card wider than the room keeps its START on it.
  const clampX = (x: number) =>
    anchoredInline({ left: x, right: x + cw }, cw, { dir, align: "left", edge: m, viewportWidth: vw }).left;
  if (!rect || placement === "center") {
    return { top: Math.max(m, (vh - ch) / 2), left: clampX((vw - cw) / 2) };
  }
  const clampY = (y: number) => Math.min(Math.max(m, y), Math.max(m, vh - ch - m));
  const centerX = clampX(rect.left + rect.width / 2 - cw / 2);
  const centerY = clampY(rect.top + rect.height / 2 - ch / 2);
  const belowTop = rect.top + rect.height + m;
  const aboveTop = rect.top - ch - m;
  const rightLeft = rect.left + rect.width + m;
  const leftLeft = rect.left - cw - m;
  const fitsBelow = belowTop + ch <= vh;
  const fitsAbove = aboveTop >= 0;
  const fitsRight = rightLeft + cw <= vw;
  const fitsLeft = leftLeft >= 0;

  switch (placement) {
    case "top":
      return { top: fitsAbove ? aboveTop : fitsBelow ? belowTop : clampY(aboveTop), left: centerX };
    case "bottom":
      return { top: fitsBelow ? belowTop : fitsAbove ? aboveTop : clampY(belowTop), left: centerX };
    case "right":
      return { top: centerY, left: fitsRight ? rightLeft : fitsLeft ? leftLeft : clampX(rightLeft) };
    case "left":
      return { top: centerY, left: fitsLeft ? leftLeft : fitsRight ? rightLeft : clampX(leftLeft) };
    default:
      if (fitsBelow) return { top: belowTop, left: centerX };
      if (fitsAbove) return { top: aboveTop, left: centerX };
      return { top: Math.max(m, (vh - ch) / 2), left: centerX };
  }
}

function TourCard({
  cardRef: ref,
  step,
  index,
  position,
  total,
  labels,
  isFirst,
  isLast,
  rect,
  dir,
  trap,
  bodyId,
  hintId,
  locked,
  gateHint,
  onBack,
  onNext,
  onLeaveEmpty,
  onSkip,
  awaitsRelease,
  docked,
  refusal,
  backTo,
}: {
  cardRef: RefObject<HTMLDivElement | null>;
  step: TourStep;
  index: number;
  /** 1-based among the steps shown (§11.3). */
  position: number;
  /** How many steps the run shows. */
  total: number;
  labels: TourLabels;
  isFirst: boolean;
  isLast: boolean;
  rect: Rect | null;
  dir: Direction;
  /** The card's own focus trap; off on a guided step, where field + card are one ring. */
  trap: boolean;
  bodyId: string;
  hintId: string;
  /** A gate step whose field is not filled yet (§11.1). */
  locked: boolean;
  gateHint: string;
  onBack: () => void;
  onNext: () => void;
  /** Moves on past an `optional` field left empty. */
  onLeaveEmpty: () => void;
  onSkip: () => void;
  /** An awaitGate step with its target lit: the hint in place of Next. */
  awaitsRelease: boolean;
  /** Pinned to the band's edge away from the field (§11.7). */
  docked: boolean;
  refusal: Refusal | null;
  /** The "Back to …" link after a refused save. */
  backTo: { title: string; go: () => void } | null;
}) {
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });

  /**
   * The card holds the focus, because the card is what the tour IS.
   *
   * The overlay above declares `role="dialog" aria-modal="true"` — it always has — and
   * then left focus wherever the page had put it. For a tour that is the most pointed
   * version of the audit's *"Only Modal manages focus"*: the whole component exists to
   * say "look here", and for a keyboard user "here" is the focus ring. They were told
   * the page was hidden, given no way to reach the Next button without Tabbing through
   * it, and left on a control the screen reader would no longer describe.
   *
   * It re-engages on every step, without any bookkeeping here, because `TourOverlay`
   * returns null while it re-locates the next target: the card genuinely unmounts and
   * remounts between steps. That is what keeps focus honest when the BUTTONS change —
   * "Back" does not exist on the first step, so stepping back onto it destroys the
   * control the press came from, and focus would otherwise fall to `<body>`, outside
   * this trap's own listener, where Tab walks straight into the page the overlay claims
   * to have hidden.
   *
   * **The cost, written down:** on an `awaitClick` step the user is asked to click the
   * spotlighted element, and they can no longer Tab to it. ArrowRight still advances
   * (the key handler in `TourOverlay` is on the document and does not care where focus
   * is), which is the escape hatch that step already documents for the case where the
   * target cannot be found. Containment is worth that: an `awaitClick` step is a
   * minority of steps, while focus stranded behind `aria-modal` is every step.
   *
   * A guided field step (`gate`, `awaitInput`, 0.50) is the exception: the field is
   * what the step is about, so the overlay focuses it (or the card, on a touch screen)
   * and runs one Tab ring over field + card itself.
   */
  useFocusTrap(ref, { active: trap });

  // Docked (§11.7): the edge it last took, for the hysteresis, and a tick bumped when the
  // band moves under an unmoved field (a pad or keyboard opening).
  const edgeRef = useRef<DockEdge | null>(null);
  const [bandTick, setBandTick] = useState(0);
  const [edge, setEdge] = useState<DockEdge | null>(null);
  useEffect(() => {
    if (!docked) return;
    let last = "";
    const look = () => {
      const target = step.target ? queryVisibleTarget(step.target) : null;
      const band = readBand(target, ref.current);
      const key = `${band.top}:${band.bottom}`;
      if (key === last) return;
      last = key;
      // A field the pad or keyboard now covers is brought back into the free half.
      if (target) {
        const r = target.getBoundingClientRect();
        if (r.top < band.top || r.bottom > band.bottom) {
          edgeRef.current = scrollIntoFreeHalf(target, ref.current, edgeRef.current);
        }
      }
      setBandTick((t) => t + 1);
    };
    const vv = window.visualViewport;
    vv?.addEventListener("resize", look);
    vv?.addEventListener("scroll", look);
    window.addEventListener("resize", look);
    // The follow tick's cadence: it catches a pad opening, which moves nothing.
    const id = window.setInterval(look, 250);
    return () => {
      vv?.removeEventListener("resize", look);
      vv?.removeEventListener("scroll", look);
      window.removeEventListener("resize", look);
      clearInterval(id);
    };
  }, [docked, step.target, ref]);

  useLayoutEffect(() => {
    const card = ref.current;
    if (!card) return;
    if (docked) {
      const target = step.target ? queryVisibleTarget(step.target) : null;
      const band = readBand(target, card);
      const next = rect ? dockEdge(rect, band, edgeRef.current, card.offsetHeight) : "bottom";
      edgeRef.current = next;
      setEdge(next);
      setStyle(dockStyle(next, rect, band));
      return;
    }
    setEdge(null);
    // The glass, not `innerWidth`: on a phone whose page overflows that is the grown
    // layout viewport, and a centred card sat off-centre by half the overflow (DUP-9).
    const view = viewportSize();
    setStyle(placeCard(rect, card.offsetWidth, card.offsetHeight, view.width, view.height, 12, step.placement, dir));
  }, [ref, rect, index, step.placement, step.target, dir, docked, bandTick]);

  const awaitsTarget = ((step.awaitClick || step.awaitInput) && step.target && rect) || awaitsRelease;

  return (
    <div
      ref={ref}
      // Focusable but not tabbable: the trap above focuses the card itself rather than
      // its first button, so a screen reader reads the step's title and body before it
      // reads "Next" — and without this the container cannot take focus at all and the
      // trap silently does nothing.
      tabIndex={-1}
      style={style}
      data-tour-card=""
      data-tour-docked={edge ?? undefined}
      className={cn(
        "pointer-events-auto fixed z-[61] w-80 max-w-[calc(100vw-1.5rem)] rounded-lg border border-subtle bg-surface p-4 shadow-xl outline-none transition-all duration-200 ease-out",
        // Docked, the height is capped: the body scrolls, the title and buttons stay.
        docked && "flex flex-col",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-primary">
        <span>{step.title}</span>
        {step.optional && (
          <span className="rounded-full border border-subtle px-1.5 py-px text-xs font-normal text-muted">
            {labels.optional}
          </span>
        )}
      </div>
      <div
        id={bodyId}
        className={cn("mt-1 text-sm leading-relaxed text-secondary", docked && "min-h-0 shrink overflow-y-auto")}
      >
        {step.body}
      </div>
      {step.action && <div className="mt-3">{step.action}</div>}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={onSkip} className="text-xs text-placeholder hover:text-secondary">
            {labels.skip}
          </button>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-xs tabular-nums text-placeholder">
              {labels.step(position, total)}
            </span>
            {!isFirst && (
              <Button variant="secondary" onClick={onBack} className="px-2.5 py-1 text-xs">
                {labels.back}
              </Button>
            )}
            {/* On an awaitClick step the Next button is replaced by a hint on its
                own row below, so it doesn't cram the counter + buttons and wrap.
                Only when the target was actually FOUND, though — `rect` is null
                when the finder gave up, and the click listener early-returns on
                the same absence. Keyed on `step.target` alone this hid the only
                way forward on any step whose anchor happens not to be rendered
                for this user (a guest sees no "add account" button), leaving the
                undocumented ArrowRight key as the sole escape. */}
            {/* "Leave empty" (§11.2): an optional field may stay empty, so the step can
                move on without it. Gone once the field is filled. */}
            {step.optional && locked && !awaitsTarget && (
              <Button variant="secondary" onClick={onLeaveEmpty} className="px-2.5 py-1 text-xs">
                {labels.leaveEmpty}
              </Button>
            )}
            {!awaitsTarget && (
              <Button
                variant="accent"
                onClick={onNext}
                // Locked, not disabled (§11.1): it stays focusable, and a press focuses the
                // field and reads the hint again.
                aria-disabled={locked || undefined}
                aria-describedby={locked ? hintId : undefined}
                className={cn("px-2.5 py-1 text-xs", locked && "opacity-60")}
              >
                {isLast ? labels.done : labels.next}
              </Button>
            )}
          </div>
        </div>
        {awaitsTarget && (
          <div className="text-center text-xs italic text-placeholder">
            {awaitsRelease
              ? (step.awaitGateHint ?? labels.awaitGateHint)
              : step.awaitInput && !step.awaitClick
                ? labels.awaitInputHint
                : labels.awaitClickHint}
          </div>
        )}
        {/* Always mounted on an awaitGate step, so a refusal is read out (assertively)
            the moment it lands. */}
        {awaitsRelease && (
          <div aria-live="assertive" aria-atomic="true" className="space-y-1">
            {refusal && (
              <p data-tour-refused="" className="text-xs text-danger">
                {refusal.reason ?? labels.awaitGateRefused}
                {refusal.seq % 2 === 0 ? "\u200b" : ""}
              </p>
            )}
            {refusal && backTo && (
              <Button variant="link" onClick={backTo.go} className="text-xs">
                {labels.backToStep(backTo.title)}
              </Button>
            )}
          </div>
        )}
        {locked && !awaitsTarget && (
          <div id={hintId} className="text-center text-xs italic text-placeholder">
            {gateHint}
          </div>
        )}
      </div>
    </div>
  );
}
