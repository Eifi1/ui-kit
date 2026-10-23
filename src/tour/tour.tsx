import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { Button } from "../components/button";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { useDismissLayer } from "../hooks/use-dismiss";
import { sameRect } from "../hooks/use-anchored-rect";
import { dirOf, horizontalStep } from "../lib/direction";
import { isComposing } from "../lib/ime";
import type { Direction } from "../lib/direction";
import { DEFAULT_TOUR_LABELS } from "./tour-labels";
import type { TourInfo } from "./tour-info";
import { completeStored, rememberAccount, rememberMigrate, type UseTourProgressOptions } from "./use-tour-progress";
import { createGateRegistry, devWarnings, TourInternalContext, type GateRegistry } from "./tour-gates";

export { useTourGate, useTourGateRelease } from "./tour-gates";
export type { TourGateRelease } from "./tour-gates";

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
  /**
   * 0.50 (docs/tours-harmonization.md §11.1): Next stays locked until the gate `key` is
   * satisfied — the form publishes it with `useTourGate(key, satisfied)` beside the field.
   * Implies `interactive`. The locked Next is `aria-disabled` with {@link gateHint} under
   * it; pressing it focuses the field. Once satisfied the tour does NOT advance by itself:
   * Next, Enter in the field, or focus leaving the field to nowhere or to the card (the
   * number pad's Done) moves on. A key nobody publishes is not enforced (the form closed
   * under the tour): Next opens. A step may have a `gate` and no `target`.
   */
  gate?: string;
  /** Overrides `labels.gateHint` for this step. */
  gateHint?: string;
  /**
   * 0.50 (§11.4): wait for the app to RELEASE this key — `useTourGateRelease().release(key)`
   * from the save's `onSuccess`. Implies `interactive`; usually it targets the Save button,
   * whose hole stays click-through. Next is replaced by {@link awaitGateHint}, and a click
   * does not advance: only `release` does. A release that arrives on an earlier step (Enter
   * in the last field submitted the form) jumps past the first later step awaiting the key.
   * `refuse(key, reason)` keeps the step and shows the reason, with a "Back to …" link to the
   * first earlier field whose gate is now unsatisfied; the kit never jumps there itself.
   * A viewer who cannot save gets `awaitGate: undefined`, so a plain Next.
   */
  awaitGate?: string;
  /** Overrides `labels.awaitGateHint` for this step. */
  awaitGateHint?: string;
  /**
   * 0.50 (§11.2): the field may stay empty. While the `gate` is unsatisfied the card
   * offers "Leave empty" beside the locked Next, which moves on without touching the field
   * (the kit never writes app values); the title carries an "Optional" chip. Not a skip:
   * the run continues and can complete. Without a `gate`, only the chip.
   */
  optional?: boolean;
  /**
   * 0.50 (§11.3): shown only if this returns true on ARRIVAL (evaluated before
   * `beforeStep`, so a skipped step never navigates). Next walks forward to the first step
   * shown, Back to the nearest earlier one shown now. Branch facts are gates:
   * `when: (c) => c.gate("txn.transfer") === true`. Keep it pure and cheap: the counter
   * evaluates every step's `when` on each arrival. A throw counts as skipped.
   */
  when?: (ctx: TourStepContext) => boolean;
  /** Runs before the step is shown — e.g. navigate to a route, open a panel.
   *  May be async; the step waits for it, then locates the target. Receives the
   *  {@link TourStepContext} (0.50); a step entered by "Guide me" sees `via: "at"` and
   *  should leave an open form alone. */
  beforeStep?: (ctx: TourStepContext) => void | Promise<void>;
}

/** What a step's `when` and `beforeStep` may ask on arrival (0.50, §11.3). */
export interface TourStepContext {
  /** The gate's current value: true/false, or undefined while nobody publishes it. */
  gate(key: string): boolean | undefined;
  /** How this step is being entered. */
  via: "start" | "at" | "next" | "back" | "goto";
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

/** 0.50 (§11.5): a step index, or the `data-tour` value of the step's anchor. */
export type TourAt = number | string;

/**
 * 0.50 (§11.5): the app's launcher — the shape `useTourUrlSync` already takes, plus `at`.
 * It builds the steps (`prepare()`, `build()`, `tour: tourInfo(def)`) and passes `at` on to
 * `start(steps, { …, at })`. Give the same function to `TourProvider launch` and to
 * `useTourUrlSync`.
 */
export type TourLauncher = (id: string, opts: { startIndex?: number; at?: TourAt }) => void | Promise<unknown>;

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
  /**
   * 0.50 (§11.5): start here AND make it the floor — earlier steps never run (nor their
   * `beforeStep`), Back stops here, `position`/`count` count from here, and the finish
   * records the completion as a full run does (Marcel, Q2). A number is a step index
   * (clamped); a string is the first step whose `target` contains `data-tour="<at>"`
   * verbatim (unknown: 0, with a development warning). The `at` step is entered with
   * `via: "at"`. With `startIndex` too, `startIndex` picks the step and `at` the floor.
   */
  at?: TourAt;
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
  /**
   * Start a tour with the given steps — or, by id (0.50), through the provider's `launch`:
   * `start("create-transaction", { at: "txn-entry-mode" })`. Without a `launch` the id form
   * does nothing (a development build warns).
   */
  start: {
    // The id form first: `Parameters<typeof start>` reads the LAST overload, which stays
    // the 0.49 one.
    (id: string, opts?: { at?: TourAt }): void;
    (steps: TourStep[], opts?: StartOptions): void;
  };
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
  /** 0.50: 1-based position among the steps this run shows, for "3 of 9"; 0 while inactive. */
  position: number;
  /** 0.50: how many steps this run shows, from its first (the `at` floor) to the end; 0 while inactive. */
  count: number;
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
  launch,
}: {
  children: ReactNode;
  labels?: LabelOverride<TourLabels>;
  /**
   * 0.50 (§11.5): lets `start(id)` and `<TourGuideButton>` start a tour by id. Usually the
   * same function the app gives `useTourUrlSync`.
   */
  launch?: TourLauncher;
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
  // Where the run is: the raw index (what `?tourStep=` mirrors), how it got there, and
  // its place among the steps shown (§11.3), computed once on arrival.
  const [nav, setNav] = useState<Nav>(NO_NAV);
  const index = nav.index;
  // The app's last `refuse` on the step awaiting its key; any arrival clears it.
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const optsRef = useRef<StartOptions>({});
  // The latest props, read at the finish: a new `storageKey` or callback needs no remount.
  const progressRef = useRef(progress);
  const onCompleteRef = useRef(onComplete);
  const launchRef = useRef(launch);
  useLayoutEffect(() => {
    progressRef.current = progress;
    onCompleteRef.current = onComplete;
    launchRef.current = launch;
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
  /** The run's first step: earlier steps never run, Back stops here (the `at` floor). */
  const floorRef = useRef(0);
  const active = !!steps && steps.length > 0;
  const total = steps?.length ?? 0;
  // The gate registry (§11.1): one per provider, read by the overlay while a tour runs.
  const [gates] = useState(createGateRegistry);
  useLayoutEffect(() => {
    gates.setActive(active);
  }, [gates, active]);
  const canLaunch = !!launch;
  const internals = useMemo(() => ({ gates, canLaunch }), [gates, canLaunch]);

  /** Is step `i` shown, asked now (§11.3)? */
  const shown = useCallback(
    (s: TourStep[], i: number, via: TourStepContext["via"]) => isShown(s[i], stepContext(gates, via)),
    [gates],
  );
  /** Arrive at `i`: the counter is recomputed from every step's `when`, against the gates now. */
  const arrive = useCallback(
    (s: TourStep[], i: number, via: TourStepContext["via"]) => {
      const ctx = stepContext(gates, via);
      let position = 0;
      let count = 0;
      for (let j = floorRef.current; j < s.length; j++) {
        if (j !== i && !isShown(s[j], ctx)) continue;
        count++;
        if (j <= i) position++;
      }
      indexRef.current = i;
      setRefusal(null);
      setNav({ index: i, floor: floorRef.current, via, position, count });
    },
    [gates],
  );
  /** The first step shown at or after `from`, or -1. */
  const forward = useCallback(
    (s: TourStep[], from: number, via: TourStepContext["via"]) => {
      for (let j = Math.max(from, floorRef.current); j < s.length; j++) if (shown(s, j, via)) return j;
      return -1;
    },
    [shown],
  );
  /** The nearest step shown at or before `from`, not below the floor, or -1. */
  const backward = useCallback(
    (s: TourStep[], from: number, via: TourStepContext["via"]) => {
      for (let j = Math.min(from, s.length - 1); j >= floorRef.current; j--) if (shown(s, j, via)) return j;
      return -1;
    },
    [shown],
  );

  const startSteps = useCallback(
    (s: TourStep[], opts?: StartOptions) => {
      optsRef.current = opts ?? {};
      optsRef.current.onStart?.();
      const last = Math.max(0, s.length - 1);
      floorRef.current = opts?.at === undefined ? 0 : resolveAt(s, opts.at);
      const via: TourStepContext["via"] = opts?.at === undefined ? "start" : "at";
      const wanted = Math.min(Math.max(floorRef.current, opts?.startIndex ?? floorRef.current), last);
      let to = forward(s, wanted, via);
      if (to < 0) to = backward(s, wanted, via);
      // Not one step of the run is shown: there is nothing to tour.
      if (to < 0) return;
      arrive(s, to, via);
      setActiveId(opts?.id ?? opts?.tour?.id ?? null);
      setSteps(s);
    },
    [arrive, forward, backward],
  );
  const start = useCallback(
    (what: TourStep[] | string, opts?: StartOptions | { at?: TourAt }) => {
      if (typeof what !== "string") {
        startSteps(what, opts as StartOptions | undefined);
        return;
      }
      const run = launchRef.current;
      if (!run) {
        if (devWarnings()) console.warn(`[ui-kit] start("${what}") needs TourProvider's \`launch\` prop.`);
        return;
      }
      void Promise.resolve(run(what, { at: opts?.at })).catch((error: unknown) => console.error(error));
    },
    [startSteps],
  ) as TourContextValue["start"];
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

  // A step whose `when` is false is passed over: `goToStep` lands on the next step shown
  // after it, failing that the previous one; Next past the last shown step finishes.
  const goToStep = useCallback(
    (i: number) => {
      const s = stepsRef.current;
      if (!s || s.length === 0) return;
      const wanted = Math.min(Math.max(floorRef.current, i), s.length - 1);
      let to = forward(s, wanted, "goto");
      if (to < 0) to = backward(s, wanted, "goto");
      if (to >= 0) arrive(s, to, "goto");
    },
    [arrive, forward, backward],
  );
  const next = useCallback(() => {
    const s = stepsRef.current;
    if (!s || s.length === 0) return;
    const to = forward(s, indexRef.current + 1, "next");
    if (to < 0) finish();
    else arrive(s, to, "next");
  }, [arrive, forward, finish]);
  const prev = useCallback(() => {
    const s = stepsRef.current;
    if (!s) return;
    const to = backward(s, indexRef.current - 1, "back");
    if (to >= 0) arrive(s, to, "back");
  }, [arrive, backward]);

  // awaitGate (§11.4): `release` and `refuse` are events, heard only while a tour runs.
  useEffect(() => {
    if (!active) return;
    let seq = 0;
    return gates.listen((signal) => {
      const s = stepsRef.current;
      if (!s) return;
      const i = indexRef.current;
      if (signal.kind === "refuse") {
        // On any other step the form's own errors speak.
        if (s[i]?.awaitGate === signal.key) setRefusal({ step: s[i], reason: signal.reason, seq: ++seq });
        return;
      }
      // The step awaiting it, or the first later one: the record is saved, so the fields
      // between are passed over.
      const awaiting = s[i]?.awaitGate === signal.key ? i : s.findIndex((st, k) => k > i && st.awaitGate === signal.key);
      if (awaiting < 0) return;
      const to = forward(s, awaiting + 1, "next");
      if (to < 0) finish();
      else arrive(s, to, "next");
    });
  }, [active, gates, arrive, forward, finish]);

  return (
    <TourInternalContext.Provider value={internals}>
      <TourContext.Provider
        value={{
          active,
          activeId,
          start,
          stop,
          next,
          prev,
          goToStep,
          index,
          total,
          position: active ? nav.position : 0,
          count: active ? nav.count : 0,
        }}
      >
        {children}
        {active && (
          <TourOverlay
            steps={steps!}
            index={index}
            via={nav.via}
            floor={nav.floor}
            position={nav.position}
            count={nav.count}
            refusal={refusal?.step === steps![index] ? refusal : null}
            onGoTo={goToStep}
            labels={merged}
            gates={gates}
            onNext={next}
            onPrev={prev}
            onSkip={skip}
          />
        )}
      </TourContext.Provider>
    </TourInternalContext.Provider>
  );
}

interface Nav {
  index: number;
  /** The run's first step (the `at` floor). */
  floor: number;
  via: TourStepContext["via"];
  position: number;
  count: number;
}

const NO_NAV: Nav = { index: 0, floor: 0, via: "start", position: 0, count: 0 };

/** The app's `refuse` on the step that awaits its key (§11.4). */
interface Refusal {
  step: TourStep;
  reason?: string;
  /** Bumped per refusal, so the same words are announced again. */
  seq: number;
}

const NOOP = () => {};

function stepContext(gates: GateRegistry, via: TourStepContext["via"]): TourStepContext {
  return { gate: (key) => gates.get(key), via };
}

/** `StartOptions.at` as a step index: a number clamped, an anchor's first step, else 0. */
function resolveAt(steps: TourStep[], at: TourAt): number {
  if (typeof at === "number") return Math.min(Math.max(0, Math.floor(at)), Math.max(0, steps.length - 1));
  const anchor = `data-tour="${at}"`;
  const found = steps.findIndex((step) => step.target?.includes(anchor));
  if (found >= 0) return found;
  if (devWarnings()) console.warn(`[ui-kit] A tour was started at "${at}", but no step targets [${anchor}]: it starts at 0.`);
  return 0;
}

/** The first step in [floor, index) shown now whose gate is published and unsatisfied, or -1. */
function firstEmptied(steps: TourStep[], floor: number, index: number, gates: GateRegistry): number {
  const ctx = stepContext(gates, "goto");
  for (let j = floor; j < index; j++) {
    const key = steps[j].gate;
    if (key && gates.get(key) === false && isShown(steps[j], ctx)) return j;
  }
  return -1;
}

/** A step's `when`, asked now; a throw is a skip, and the error goes to the console. */
function isShown(step: TourStep, ctx: TourStepContext): boolean {
  if (!step.when) return true;
  try {
    return step.when(ctx) === true;
  } catch (error) {
    console.error(error);
    return false;
  }
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
  const top = vv?.offsetTop ?? 0;
  const bottom = top + (vv?.height ?? window.innerHeight);
  const width = vv?.width ?? window.innerWidth;
  return r.width > 0 && r.left <= 1 && r.top <= top + 1 && r.right >= width - 1 && r.bottom >= bottom - 1;
}

/** A step whose control is for using: its card joins the layer stack above the field (§11.6). */
function isFieldStep(step: TourStep): boolean {
  return !!(step.interactive || step.awaitInput || step.gate || step.awaitGate);
}

/** The first control in `el` (or `el` itself) a person would type into or press. */
function firstFocusable(el: Element): HTMLElement | null {
  if (el instanceof HTMLElement && el.matches(FOCUSABLE_CONTROL)) return el;
  return el.querySelector<HTMLElement>(FOCUSABLE_CONTROL);
}

/** The tab stops inside `el`, in DOM order (the focus trap's selector). */
function tabStops(el: Element): HTMLElement[] {
  const all = el.matches(FOCUSABLE_CONTROL) ? [el as HTMLElement] : [];
  return all.concat(
    Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_CONTROL)).filter(
      (x) => x.tabIndex >= 0 && !x.closest("[hidden],[inert]"),
    ),
  );
}

const FOCUSABLE_CONTROL =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** A touch screen: the card takes focus, so no keyboard or pad opens before the step is read (§11.8). */
function coarsePointer(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(pointer: coarse)").matches
    : false;
}

function TourOverlay({
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

  // The gate (§11.1). Re-rendered on every registry change while the tour runs.
  useSyncExternalStore(gates.subscribe, gates.version, gates.version);
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
      setLocated({ index, step, rect: el ? rectOf(el) : null, dir: dirOf(el), layer, fullScreen });
    };
    void (async () => {
      await step.beforeStep?.(stepContext(gates, via));
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
        const next = rectOf(el);
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

  // A gate nobody publishes is not enforced: Next opens, and a development build says why.
  useEffect(() => {
    if (!ready || !gateKey || gates.has(gateKey) || !devWarnings()) return;
    console.warn(
      `[ui-kit] Tour step "${step.title}" waits for the gate "${gateKey}", which nothing publishes: its Next is open. ` +
        "Publish it with useTourGate beside the field, or the form has closed under the tour.",
    );
  }, [ready, gateKey, gates, step.title]);

  // `optional` means "may stay EMPTY": without a gate there is no value to compare.
  useEffect(() => {
    if (!ready || !step.optional || step.gate || !devWarnings()) return;
    console.warn(
      `[ui-kit] Tour step "${step.title}" is \`optional\` without a \`gate\`: it shows the Optional chip ` +
        "and a plain Next. \"Leave empty\" needs a gate to compare.",
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
    const control = el ? firstFocusable(el) : null;
    if (coarsePointer() || !control) cardRef.current?.focus();
    else if (!el!.contains(document.activeElement)) control.focus();
    if (!control) return;
    const previous = control.getAttribute("aria-describedby");
    control.setAttribute("aria-describedby", previous ? `${previous} ${bodyId}` : bodyId);
    return () => {
      if (previous === null) control.removeAttribute("aria-describedby");
      else control.setAttribute("aria-describedby", previous);
    };
  }, [ready, guided, index, step, bodyId]);

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
    const control = el ? firstFocusable(el) : null;
    control?.focus();
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
      if (interactive && e.target instanceof Node && e.target !== document.body && !rootRef.current?.contains(e.target)) {
        return;
      }
      // Escape is the tour's Escape layer's (above) once the step is shown; while it is
      // still being located there is no layer yet, and the tour takes it here as in 0.49.
      if (e.key === "Escape") {
        if (!ready) onSkip();
        return;
      }
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

  useLayoutEffect(() => {
    const card = ref.current;
    if (!card) return;
    setStyle(
      placeCard(rect, card.offsetWidth, card.offsetHeight, window.innerWidth, window.innerHeight, 12, step.placement, dir),
    );
  }, [ref, rect, index, step.placement, dir]);

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
      className="pointer-events-auto fixed z-[61] w-80 max-w-[calc(100vw-1.5rem)] rounded-lg border border-subtle bg-surface p-4 shadow-xl outline-none transition-all duration-200 ease-out"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-primary">
        <span>{step.title}</span>
        {step.optional && (
          <span className="rounded-full border border-subtle px-1.5 py-px text-xs font-normal text-muted">
            {labels.optional}
          </span>
        )}
      </div>
      <div id={bodyId} className="mt-1 text-sm leading-relaxed text-secondary">
        {step.body}
      </div>
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
