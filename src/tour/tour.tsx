import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { DEFAULT_TOUR_LABELS } from "./tour-labels";
import type { TourInfo } from "./tour-info";
import { completeStored, rememberAccount, rememberMigrate, type UseTourProgressOptions } from "./use-tour-progress";
import { createGateRegistry, devWarnings, isShown, stepContext, TourInternalContext } from "./tour-gates";
import { liveEngine } from "./tour-engine";
// Types only, gone from the built module: the overlay's modules load with the overlay.
import type { Refusal, TourOverlay } from "./tour-overlay";

/**
 * The overlay — the card, the spotlight and its shields, the placement, the dock — loaded
 * when a tour first starts, not with the provider every app mounts above its routes
 * (refactor audit 2026-10-30, MOD-1: about 28.5 kB minified, 10.3 kB gzip of each app's
 * first load at 0.51.6). A LITERAL relative `import()`, as feedback-submit.tsx's dialog
 * is (0.34, MOD-1): the library build keeps the module its own (`bundle: false`), and a
 * path an app's bundler can read is a chunk it can split off.
 *
 * A fetch that fails — a tab left open across a deploy, a local-first app offline — ends
 * the run and leaves the page (0.52 code review, tour.tsx). The dialog and the search
 * palette throw theirs to the app's error boundary, as a lazy route does; the provider
 * cannot: it sits above the routes, in keksdose and Kurvenschmiede above the app's own
 * boundary, and the rejected import unmounted the whole app — for a tour, whose start
 * fetched nothing before 0.52. `React.lazy` keeps what its import settled to, so a
 * failure leaves a fresh one behind and the next start fetches again.
 */
let LazyTourOverlay = lazyTourOverlay();

function lazyTourOverlay() {
  return lazy<typeof TourOverlay>(() =>
    import("./tour-overlay").then(
      (module) => ({ default: module.TourOverlay }),
      (error: unknown) => {
        console.error(error);
        LazyTourOverlay = lazyTourOverlay();
        return { default: TourOverlayUnavailable };
      },
    ),
  );
}

/** Stands in for an overlay whose chunk did not arrive: ends the run with `stop` — not
 *  a skip, the reader saw no step — and draws nothing. */
function TourOverlayUnavailable() {
  const { stop } = useTour();
  useLayoutEffect(stop, [stop]);
  return null;
}

export { useTourGate, useTourGateRelease } from "./tour-gates";
export type { TourGateRelease } from "./tour-gates";

/**
 * `start`/`end` follow the reading direction (`end` is the right side in LTR and the
 * left side in RTL) and are what a translated app wants. `left`/`right` stay physical
 * for the steps that genuinely mean a screen side.
 */
export type TourPlacement = "top" | "right" | "bottom" | "left" | "start" | "end" | "center" | "dock";

export interface TourStep {
  /** CSS selector for the element to spotlight. Omit for a centered step
   *  (welcome/finish). If the target isn't found/visible, the step centers. */
  target?: string;
  title: string;
  body: ReactNode;
  /** Extra footer content, e.g. a "load sample data" shortcut. */
  action?: ReactNode;
  /** Spotlight padding around the target, px (default 8). On a field step the spot also
   *  takes in the lines the field's `aria-describedby` names when they sit within the
   *  ring's reach of it (a hint or warning line under the field, keksdose S1, §11.6). */
  padding?: number;
  /** Where the card sits relative to the target. Omit for auto placement
   *  (below → above → centered). "center" ignores the target and centers on
   *  screen. "start"/"end" are the logical sides and flip in RTL; "left"/"right"
   *  are physical. An explicit side flips to the opposite side if it would
   *  overflow, then clamps into the viewport.
   *
   *  `"dock"` (0.50, §11.7): below `sm` (640 px at Normal text, 800 at Large, as
   *  `max-sm:` since 0.52) the card is pinned full-width to the top or bottom edge of the
   *  usable band — the visual viewport less the keyboard and any
   *  `[data-tour-obstruction]` (the number pad) — on the edge away from the field, and the
   *  field's scroll container brings it into the other half. From `sm` up it is auto
   *  placement. On a phone a field step (`interactive`, `awaitInput`, `gate`, `awaitGate`)
   *  with a target and no `placement` docks by default (`TourProvider dockOnPhones`). */
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
   *  should leave an open form alone. One that throws or rejects is logged to the
   *  console, and the step is located and shown anyway. Enter and the arrows wait for
   *  it; Escape does not. */
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

/** `useTour().start`, both forms: what `TourProvider` hands its `launch` as the third argument. */
export type TourStart = TourContextValue["start"];

/**
 * 0.50 (§11.5): the app's launcher — the shape `useTourUrlSync` already takes, plus `at`.
 * It builds the steps (`prepare()`, `build()`, `tour: tourInfo(def)`) and passes `at` on to
 * `start(steps, { …, at })`. Give the same function to `TourProvider launch` and to
 * `useTourUrlSync`.
 *
 * `start` is the provider's own `start` (keksdose N4), so the launcher needs no ref to a
 * component below the provider and may be defined above it. `engine` (0.50.1, keksdose N1)
 * is the rest of the engine — `stop`, `next`, `active`, … — read live, see {@link TourEngine}.
 * `useTourUrlSync` passes both (under a provider). A launcher taking fewer arguments still
 * works.
 */
export type TourLauncher = (
  id: string,
  opts: { startIndex?: number; at?: TourAt },
  start: TourStart,
  engine: TourEngine,
) => void | Promise<unknown>;

/**
 * 0.50.1 (keksdose N1): the whole engine `useTour()` returns, handed to a launcher as its
 * FOURTH argument by `TourProvider` and `useTourUrlSync`, so a tour built above the provider
 * can also `stop`, `next` or read `active` with no `useTour()` registered from below. One
 * object per provider whose fields read the latest render (`engine.active` after an
 * `await` is current); its methods are the provider's own. `start` (the third argument) is
 * `engine.start`.
 */
export type TourEngine = TourContextValue;

const ENGINE_KEYS = [
  "active",
  "activeId",
  "start",
  "stop",
  "next",
  "prev",
  "goToStep",
  "index",
  "total",
  "position",
  "count",
] as const satisfies readonly (keyof TourContextValue)[];

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
  dockOnPhones = true,
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
  /**
   * 0.50 (§11.7, Marcel's Q1): below `sm`, a field step with a target and no `placement`
   * docks. Default `true`; `false` makes docking strictly opt-in (`placement: "dock"`).
   */
  dockOnPhones?: boolean;
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
      // Floored, as `at` is (FLW-9): `steps[1.5]` is undefined, and `forward` threw on
      // its `when` — an edited `?tourStep=2.5` was enough.
      const asked = opts?.startIndex === undefined ? floorRef.current : Math.floor(opts.startIndex);
      const wanted = Math.min(Math.max(floorRef.current, asked), last);
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
  // The provider's own `start` and the live engine, handed to `launch` as its third and
  // fourth arguments (keksdose N4, N1).
  const ownStartRef = useRef<TourContextValue["start"] | null>(null);
  const [live] = useState(() => liveEngine<TourEngine>(ENGINE_KEYS));
  const engine = live.engine;
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
      void Promise.resolve(run(what, { at: opts?.at }, ownStartRef.current!, engine)).catch((error: unknown) =>
        console.error(error),
      );
    },
    [startSteps, engine],
  ) as TourContextValue["start"];
  useLayoutEffect(() => {
    ownStartRef.current = start;
  }, [start]);
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
      const wanted = Math.min(Math.max(floorRef.current, Math.floor(i)), s.length - 1);
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
      const awaiting =
        s[i]?.awaitGate === signal.key ? i : s.findIndex((st, k) => k > i && st.awaitGate === signal.key);
      if (awaiting < 0) return;
      const to = forward(s, awaiting + 1, "next");
      if (to < 0) finish();
      else arrive(s, to, "next");
    });
  }, [active, gates, arrive, forward, finish]);

  const value: TourContextValue = {
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
  };
  // Read by the live engine (`launch`'s fourth argument) after this render commits.
  useLayoutEffect(() => {
    live.set(value);
  });

  return (
    <TourInternalContext.Provider value={internals}>
      <TourContext.Provider value={value}>
        {children}
        {active ? (
          // Its own boundary, so the first start's chunk fetch suspends nothing of the
          // app's; it shows nothing meanwhile, as the overlay itself does until it has
          // located the step. A failed fetch ends the run (`lazyTourOverlay`).
          <Suspense fallback={null}>
            <LazyTourOverlay
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
              dockOnPhones={dockOnPhones}
              onNext={next}
              onPrev={prev}
              onSkip={skip}
            />
          </Suspense>
        ) : null}
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

/** `StartOptions.at` as a step index: a number clamped, an anchor's first step, else 0. */
function resolveAt(steps: TourStep[], at: TourAt): number {
  if (typeof at === "number") return Math.min(Math.max(0, Math.floor(at)), Math.max(0, steps.length - 1));
  const anchor = `data-tour="${at}"`;
  const found = steps.findIndex((step) => step.target?.includes(anchor));
  if (found >= 0) return found;
  if (devWarnings())
    console.warn(`[ui-kit] A tour was started at "${at}", but no step targets [${anchor}]: it starts at 0.`);
  return 0;
}
