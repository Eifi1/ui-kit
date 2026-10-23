import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { Button } from "../components/button";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { sameRect } from "../hooks/use-anchored-rect";
import { dirOf, horizontalStep } from "../lib/direction";
import type { Direction } from "../lib/direction";
import { DEFAULT_TOUR_LABELS } from "./tour-labels";
import type { TourInfo } from "./tour-info";
import { completeStored, rememberAccount, rememberMigrate, type UseTourProgressOptions } from "./use-tour-progress";

/**
 * `start`/`end` follow the reading direction (`end` is the right side in LTR and the
 * left side in RTL) and are what a translated app wants. `left`/`right` stay physical
 * for the steps that genuinely mean a screen side.
 */
export type TourPlacement = "top" | "right" | "bottom" | "left" | "start" | "end" | "center";

export interface TourStep {
  /** CSS selector for the element to spotlight. Omit for a centered step
   *  (welcome/finish). If the target isn't found/visible, the step centers. */
  target?: string;
  title: string;
  body: ReactNode;
  /** Extra footer content, e.g. a "load sample data" shortcut. */
  action?: ReactNode;
  /** Spotlight padding around the target, px (default 8). */
  padding?: number;
  /** Where the card sits relative to the target. Omit for auto placement
   *  (below → above → centered). "center" ignores the target and centers on
   *  screen. "start"/"end" are the logical sides and flip in RTL; "left"/"right"
   *  are physical. An explicit side flips to the opposite side if it would
   *  overflow, then clamps into the viewport. */
  placement?: TourPlacement;
  /** Advance only when the user clicks the spotlighted target itself (not the
   *  card's Next button). Requires `target`: the real control's own handler runs
   *  first, then the tour steps forward on a microtask. The spotlight hole stays
   *  click-through to the target; the rest of the page does not. */
  awaitClick?: boolean;
  /**
   * The spotlighted control is for USING, not only for looking at (0.46, keksdose live
   * #436): the layers it opens sit above the scrim and work. A plain step's overlay is
   * `z-[60]`, over every kit layer, so a field whose number pad (`NumberPadSheet`), a
   * select's menu or a popover opens at `z-50` opened UNDER the shields, where nothing
   * could be tapped. Here the overlay drops to `z-[45]`: still over the top bar and the
   * page (`z-40` and below, still dimmed and shielded), under every `z-50` layer the
   * target opens — so an app's own layer wants `z-50` or more to clear it. Keys pressed
   * in the target or in such a layer are theirs (Escape closes the pad, arrows walk a
   * list); from the card the tour's keys work as on any step. The overlay is not
   * `aria-modal` then, and carries `data-tour-interactive`.
   *
   * The card is in the same layer as the scrim, so an open pad or sheet may cover it
   * until it closes. Requires `target`. A `HoverMenu` (`z-40`, the top bar's menus) stays
   * under the scrim: point an `awaitClick` step at its trigger instead.
   */
  interactive?: boolean;
  /**
   * Advance once a value was ENTERED in the spotlighted control (0.46, keksdose live
   * #436) — `awaitClick` for a field. Implies `interactive`. Counted when focus leaves
   * the target (the number pad's Done, a Tab, a tap elsewhere), or Enter is pressed in
   * it, and one of its fields (`input`, `textarea`, `select`: the target itself or
   * inside it) then holds another value than when the step began; a native `change`
   * (a select, a checkbox) counts at once. The card swaps Next for `awaitInputHint`,
   * as for `awaitClick`. A picker whose value is not a field's (the kit's `Select`
   * button) has nothing to compare: call `useTour().next()` from its `onChange`.
   */
  awaitInput?: boolean;
  /** Runs before the step is shown — e.g. navigate to a route, open a panel.
   *  May be async; the step waits for it, then locates the target. */
  beforeStep?: () => void | Promise<void>;
}

export interface TourLabels {
  next: string;
  back: string;
  skip: string;
  done: string;
  /** Shown in place of the Next button on an `awaitClick` step. */
  awaitClickHint: string;
  /** Shown in place of the Next button on an `awaitInput` step (0.46). */
  awaitInputHint: string;
  /** Step counter, e.g. (2, 7) => "2 / 7". Counts the steps the run shows (0.50). */
  step: (current: number, total: number) => string;
  /** 0.50: an `optional` gate step's button while the field is empty. */
  leaveEmpty: string;
  /** 0.50: the chip beside an `optional` step's title. */
  optional: string;
  /** 0.50: under a `gate` step's locked Next (`TourStep.gateHint` overrides it). */
  gateHint: string;
  /** 0.50: announced (screen readers only) when a gate step's field is filled. */
  gateReady: string;
  /** 0.50: in place of Next on an `awaitGate` step (`TourStep.awaitGateHint` overrides it). */
  awaitGateHint: string;
  /** 0.50: the warning when the app `refuse`s an `awaitGate` step without a reason. */
  awaitGateRefused: string;
  /** 0.50: the link to an earlier step whose field was emptied, after a refused save. */
  backToStep: (title: string) => string;
}

// Defined in ./tour-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_TOUR_LABELS };

interface StartOptions {
  /** Stable id of the tour, surfaced as `activeId` so the app can mirror it to
   *  the URL (deep-link / evaluation tracking) and record completion. Defaults to
   *  `tour.id`. */
  id?: string;
  /** The tour being started, as the app lists it (docs/tours-harmonization.md §9.6.1).
   *  When its last step is finished, the provider records the completion in its
   *  `progress` and hands this to `onComplete`. */
  tour?: TourInfo;
  /** Start at this step index instead of 0 (clamped) — for URL/deep-link resume. */
  startIndex?: number;
  /** Fires synchronously when the tour starts (e.g. enable a mock interceptor). */
  onStart?: () => void;
  /** After the last step: runs after the provider's progress write and `onComplete`. */
  onFinish?: () => void;
  onSkip?: () => void;
}

/** What `TourProvider`'s `onComplete` learns besides the tour (§9.1, §9.6). */
export interface TourCompletion {
  /**
   * `true` when the completion counts anew (the first time, or the first time after the
   * tour's update, §8): the moment for the app's points toast. `false` for a replay, and
   * when the stored text is in an old shape no `migrate` reads: nothing is overwritten
   * then, and the error goes to `console.error` (keksdose B-1). `undefined` when the provider has no `progress` or the start carried no `tour`, so
   * nothing was recorded.
   */
  awarded: boolean | undefined;
}

interface TourContextValue {
  active: boolean;
  /** Id of the running tour (from {@link StartOptions.id}), else null. */
  activeId: string | null;
  /** Start a tour with the given steps. */
  start: (steps: TourStep[], opts?: StartOptions) => void;
  /** End the current tour (no callbacks fire). */
  stop: () => void;
  /** Advance one step; past the last step it finishes the tour (fires onFinish). */
  next: () => void;
  /** Go back one step (no-op on the first). */
  prev: () => void;
  /** Jump to a step by index, clamped to range — e.g. for URL/deep-link resume. */
  goToStep: (index: number) => void;
  /** Current step (0-based; 0 while inactive). */
  index: number;
  /** Total steps (0 while inactive). */
  total: number;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within <TourProvider>");
  return ctx;
}

/**
 * The tour engine if it is there, `null` if it is not — for a control that is a
 * DECORATION rather than a participant.
 *
 * {@link useTour}'s throw is correct and stays: a component that runs a tour cannot do
 * its job without the provider, and failing loudly is how that gets fixed. But the
 * throw's blast radius is whatever error boundary is above it, and for a launcher in
 * the app shell that is the whole app.
 *
 * Keksdose feedback dev#524 is what that costs: an `@hb/ui` module was edited while a
 * dev server was running, vite re-evaluated it, and the module's freshly created
 * context object was no longer the one the mounted provider was providing. React's
 * `useContext` then answers `null` for a provider that is, structurally, right there —
 * and the top bar's tour menu took the entire shell down with it. **Build-time module
 * graphs cannot produce that**, so it is a development-only failure; a menu that
 * disappears for a second is the proportionate response to it either way.
 *
 * Only for controls that can honestly render nothing. If a component would show a
 * broken half of itself without the tour, it wants {@link useTour}.
 */
export function useTourOptional(): TourContextValue | null {
  return useContext(TourContext);
}

/** The kit's dev switch (as number-input's): a development build, never under vitest. */
function devWarnings(): boolean {
  return Boolean(import.meta.env?.DEV) && !import.meta.env?.VITEST;
}

/**
 * Provides the guided-tour engine: a dimmed spotlight overlay + step card driven
 * by a list of {@link TourStep}s. Domain-free — the app supplies the steps (copy,
 * selectors, per-step navigation, placement) and the translated {@link TourLabels}.
 * Mount once inside the router; start a tour from anywhere via {@link useTour},
 * which also exposes step control (`next`/`prev`/`goToStep`) and the current
 * `index`/`total` for URL mirroring, `awaitClick` and deep-link resume.
 *
 * **Completion in one place** (docs/tours-harmonization.md §9.6): give the provider the
 * app's `progress` (the same `{storageKey, migrate}` as `useTourProgress`) and start each
 * tour with `start(steps, {tour})`. When the last step is finished the provider writes the
 * completion ONCE, through the store every `useTourProgress` reader of the key shares
 * (never a second copy), then calls `onComplete(tour, {awarded})`, then the start's own
 * `onFinish`. A skip or `stop()` records nothing and calls neither. The app removes its
 * own `complete()` from `onFinish`, or that second write answers `false`.
 *
 * Both props are optional: without `progress` or a `tour` on the start, `onComplete`
 * still fires, with `awarded: undefined` (and `tour` as given, possibly `undefined`). A
 * new `storageKey` (an account switch on a shared PC) is followed on the next
 * completion, without a remount.
 */
export function TourProvider({
  children,
  labels,
  progress,
  onComplete,
}: {
  children: ReactNode;
  labels?: LabelOverride<TourLabels>;
  /** The app's tour progress: the same options its `useTourProgress` readers use. */
  progress?: UseTourProgressOptions;
  /** A tour's last step was finished; see {@link TourCompletion}. */
  onComplete?: (tour: TourInfo | undefined, completion: TourCompletion) => void;
}) {
  // `labels` over the provider's `tour` over English. Resolved once here and handed
  // down: the step card is portalled, but context crosses portals anyway — this is
  // simply the one place that already owned the merge.
  const merged = useKitLabels("tour", DEFAULT_TOUR_LABELS, labels);
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const optsRef = useRef<StartOptions>({});
  // The latest props, read at the finish: a new `storageKey` or callback needs no remount.
  const progressRef = useRef(progress);
  const onCompleteRef = useRef(onComplete);
  useLayoutEffect(() => {
    progressRef.current = progress;
    onCompleteRef.current = onComplete;
  });
  // The provider's migrate becomes the key's, for readers that pass none (keksdose B-2).
  const storageKey = progress?.storageKey;
  const migrate = progress?.migrate;
  // 0.45: and its `account` (§10.3), so a finish on an account key is sent as readers' are.
  const account = progress?.account;
  useLayoutEffect(() => {
    if (storageKey !== undefined) rememberMigrate(storageKey, migrate);
    if (storageKey !== undefined) rememberAccount(storageKey, account);
  }, [storageKey, migrate, account]);
  const warnedNoTourRef = useRef(false);
  // Live mirrors so the step-control callbacks can stay stable (identity-safe for
  // consumers) while still reading the current steps/index. Synced in a layout
  // effect — after the commit, before paint and before any passive effect or event
  // can call them — rather than written during render.
  const stepsRef = useRef<TourStep[] | null>(null);
  const indexRef = useRef(0);
  useLayoutEffect(() => {
    stepsRef.current = steps;
    indexRef.current = index;
  }, [steps, index]);
  const active = !!steps && steps.length > 0;
  const total = steps?.length ?? 0;

  const start = useCallback((s: TourStep[], opts?: StartOptions) => {
    optsRef.current = opts ?? {};
    optsRef.current.onStart?.();
    setIndex(Math.min(Math.max(0, opts?.startIndex ?? 0), Math.max(0, s.length - 1)));
    setActiveId(opts?.id ?? opts?.tour?.id ?? null);
    setSteps(s);
  }, []);
  const stop = useCallback(() => {
    setSteps(null);
    setActiveId(null);
  }, []);
  const finish = useCallback(() => {
    // Once per tour: a second "Done" before the overlay unmounts records nothing more.
    if (!stepsRef.current) return;
    stepsRef.current = null;
    const { tour, onFinish } = optsRef.current;
    const store = progressRef.current;
    // Exactly one write per completion (§9.6.2), so `awarded` is what `complete(tour)` answered.
    let awarded: boolean | undefined;
    if (store && tour) {
      try {
        awarded = completeStored(store.storageKey, store.migrate, tour);
      } catch (error) {
        // A stored text no migrate reads is left as it is (keksdose B-1); the tour still ends.
        console.error(error);
        awarded = false;
      }
    } else if (store && !tour && devWarnings() && !warnedNoTourRef.current) {
      warnedNoTourRef.current = true;
      console.warn(
        "[ui-kit] TourProvider has `progress`, but a finished tour's start carried no `tour`: " +
          "nothing was recorded and `awarded` is undefined. Start it with `start(steps, { tour })`.",
      );
    }
    onCompleteRef.current?.(tour, { awarded });
    onFinish?.();
    setSteps(null);
    setActiveId(null);
  }, []);
  const skip = useCallback(() => {
    optsRef.current.onSkip?.();
    setSteps(null);
    setActiveId(null);
  }, []);

  const goToStep = useCallback((i: number) => {
    const len = stepsRef.current?.length ?? 0;
    if (len === 0) return;
    setIndex(Math.min(Math.max(0, i), len - 1));
  }, []);
  const next = useCallback(() => {
    const len = stepsRef.current?.length ?? 0;
    if (len === 0) return;
    if (indexRef.current >= len - 1) finish();
    else setIndex(indexRef.current + 1);
  }, [finish]);
  const prev = useCallback(() => {
    if (indexRef.current > 0) setIndex(indexRef.current - 1);
  }, []);

  return (
    <TourContext.Provider value={{ active, activeId, start, stop, next, prev, goToStep, index, total }}>
      {children}
      {active && (
        <TourOverlay
          steps={steps!}
          index={index}
          labels={merged}
          onNext={next}
          onPrev={prev}
          onSkip={skip}
        />
      )}
    </TourContext.Provider>
  );
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
}

function TourOverlay({
  steps,
  index,
  labels,
  onNext,
  onPrev,
  onSkip,
}: {
  steps: TourStep[];
  index: number;
  labels: TourLabels;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;
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

  // Run beforeStep, then locate the target (retrying across route/render lag).
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    // `null` = untargeted, or the finder gave up → the card centres, with no hole.
    const settle = (el: Element | null) =>
      setLocated({ index, step, rect: el ? rectOf(el) : null, dir: dirOf(el) });
    void (async () => {
      await step.beforeStep?.();
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
          el.scrollIntoView({ block: "center", behavior: "smooth" });
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
  }, [index, step]);

  // Follow the target as the page scrolls / reflows — only once THIS step is located,
  // and only into this step's result.
  useEffect(() => {
    if (!step.target) return;
    const update = () => {
      const el = queryVisibleTarget(step.target!);
      if (el) {
        const next = rectOf(el);
        setLocated((prev) =>
          prev && prev.index === index && prev.step === step && !sameRect(prev.rect, next)
            ? { ...prev, rect: next }
            : prev,
        );
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

  // An interactive step (see `TourStep.interactive`): only while the target is lit — a
  // step whose target is missing centres its card over a full scrim, modal as ever.
  const interactive = spotted && !!step.target && !!(step.interactive || step.awaitInput);

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

  // Keyboard: Esc skips, Enter and the reading-direction arrow advance (→ in LTR,
  // ← in RTL), the other arrow goes back. On awaitClick steps Enter is ignored (it
  // would fire the target's click AND advance) — the forward arrow stays as an escape
  // hatch.
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
      if (interactive && e.target instanceof Node && e.target !== document.body && !rootRef.current?.contains(e.target)) {
        return;
      }
      if (e.key === "Escape") {
        onSkip();
        return;
      }
      if (e.key === "Enter") {
        if (step.awaitClick || step.awaitInput || ownsKey(e.target, "Enter")) return;
        e.preventDefault();
        onNext();
        return;
      }
      if (ownsKey(e.target, e.key)) return;
      // The overlay root carries `dir`; before it paints, the document's answers.
      const delta = horizontalStep(e.key, rootRef.current);
      if (delta === 1) {
        e.preventDefault();
        onNext();
      } else if (delta === -1) {
        if (!isFirst) onPrev();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isFirst, step, interactive, onNext, onPrev, onSkip]);

  if (!ready) return null;

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
      // z-[45] on an interactive step: over the top bar (z-40), under the z-50 layers the
      // target opens. See `TourStep.interactive`.
      className={cn("pointer-events-none fixed inset-0", interactive ? "z-[45]" : "z-[60]")}
      role="dialog"
      aria-modal={interactive ? undefined : "true"}
      // A stable marker for the overlay, on every step (0.48, keksdose dev#611–613): an
      // app that hides its floating help launcher while a modal is open excepts the
      // tour, which may spotlight that launcher — `[aria-modal="true"]:not([data-tour-overlay])`.
      // keksdose matched the `pointer-events-none` class until now, which is the kit's to change.
      data-tour-overlay=""
      data-tour-interactive={interactive ? "" : undefined}
      aria-label={step.title}
      dir={dir}
    >
      {spot && <SpotlightShields spot={spot} />}
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
              "0 0 0 9999px rgba(15,23,42,0.70)",
            ].join(", "),
          }}
        />
      ) : (
        <div className="pointer-events-auto fixed inset-0 bg-black/70" />
      )}
      <TourCard
        step={step}
        index={index}
        total={steps.length}
        labels={labels}
        isFirst={isFirst}
        isLast={isLast}
        rect={spot}
        dir={dir}
        onBack={onPrev}
        onNext={onNext}
        onSkip={onSkip}
      />
    </div>,
    document.body,
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
      <div data-tour-shield="" className={shield} style={{ top: 0, left: 0, right: 0, height: Math.max(0, spot.top) }} />
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
  if (!rect || placement === "center") {
    return { top: Math.max(m, (vh - ch) / 2), left: Math.max(m, (vw - cw) / 2) };
  }
  const clampX = (x: number) => Math.min(Math.max(m, x), Math.max(m, vw - cw - m));
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
  step,
  index,
  total,
  labels,
  isFirst,
  isLast,
  rect,
  dir,
  onBack,
  onNext,
  onSkip,
}: {
  step: TourStep;
  index: number;
  total: number;
  labels: TourLabels;
  isFirst: boolean;
  isLast: boolean;
  rect: Rect | null;
  dir: Direction;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
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
   */
  useFocusTrap(ref, { active: true });

  useLayoutEffect(() => {
    const card = ref.current;
    if (!card) return;
    setStyle(
      placeCard(rect, card.offsetWidth, card.offsetHeight, window.innerWidth, window.innerHeight, 12, step.placement, dir),
    );
  }, [rect, index, step.placement, dir]);

  return (
    <div
      ref={ref}
      // Focusable but not tabbable: the trap above focuses the card itself rather than
      // its first button, so a screen reader reads the step's title and body before it
      // reads "Next" — and without this the container cannot take focus at all and the
      // trap silently does nothing.
      tabIndex={-1}
      style={style}
      className="pointer-events-auto fixed z-[61] w-80 max-w-[calc(100vw-1.5rem)] rounded-lg border border-subtle bg-surface p-4 shadow-xl outline-none transition-all duration-200 ease-out"
    >
      <div className="text-sm font-semibold text-primary">{step.title}</div>
      <div className="mt-1 text-sm leading-relaxed text-secondary">{step.body}</div>
      {step.action && <div className="mt-3">{step.action}</div>}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-placeholder hover:text-secondary"
          >
            {labels.skip}
          </button>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-xs tabular-nums text-placeholder">
              {labels.step(index + 1, total)}
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
            {!((step.awaitClick || step.awaitInput) && step.target && rect) && (
              <Button variant="accent" onClick={onNext} className={cn("px-2.5 py-1 text-xs")}>
                {isLast ? labels.done : labels.next}
              </Button>
            )}
          </div>
        </div>
        {(step.awaitClick || step.awaitInput) && step.target && rect && (
          <div className="text-center text-xs italic text-placeholder">
            {step.awaitInput && !step.awaitClick ? labels.awaitInputHint : labels.awaitClickHint}
          </div>
        )}
      </div>
    </div>
  );
}
