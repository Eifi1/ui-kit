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
import { useKitLabels } from "../i18n/kit-labels";
import { Button } from "../components/ui";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { dirOf, horizontalStep } from "../lib/direction";
import type { Direction } from "../lib/direction";

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
  /** Step counter, e.g. (2, 7) => "2 / 7". */
  step: (current: number, total: number) => string;
}

export const DEFAULT_TOUR_LABELS: TourLabels = {
  next: "Next",
  back: "Back",
  skip: "Skip",
  done: "Done",
  awaitClickHint: "Click the highlighted element to continue",
  step: (c, t) => `${c} / ${t}`,
};

interface StartOptions {
  /** Stable id of the tour, surfaced as `activeId` so the app can mirror it to
   *  the URL (deep-link / evaluation tracking) and record completion. */
  id?: string;
  /** Start at this step index instead of 0 (clamped) — for URL/deep-link resume. */
  startIndex?: number;
  /** Fires synchronously when the tour starts (e.g. enable a mock interceptor). */
  onStart?: () => void;
  onFinish?: () => void;
  onSkip?: () => void;
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

/**
 * Provides the guided-tour engine: a dimmed spotlight overlay + step card driven
 * by a list of {@link TourStep}s. Domain-free — the app supplies the steps (copy,
 * selectors, per-step navigation, placement) and the translated {@link TourLabels}.
 * Mount once inside the router; start a tour from anywhere via {@link useTour},
 * which also exposes step control (`next`/`prev`/`goToStep`) and the current
 * `index`/`total` for URL mirroring, `awaitClick` and deep-link resume.
 */
export function TourProvider({
  children,
  labels,
}: {
  children: ReactNode;
  labels?: Partial<TourLabels>;
}) {
  // `labels` over the provider's `tour` over English. Resolved once here and handed
  // down: the step card is portalled, but context crosses portals anyway — this is
  // simply the one place that already owned the merge.
  const merged = useKitLabels("tour", DEFAULT_TOUR_LABELS, labels);
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const optsRef = useRef<StartOptions>({});
  // Live mirrors so the step-control callbacks can stay stable (identity-safe for
  // consumers) while still reading the current steps/index.
  const stepsRef = useRef<TourStep[] | null>(null);
  stepsRef.current = steps;
  const indexRef = useRef(0);
  indexRef.current = index;
  const active = !!steps && steps.length > 0;
  const total = steps?.length ?? 0;

  const start = useCallback((s: TourStep[], opts?: StartOptions) => {
    optsRef.current = opts ?? {};
    optsRef.current.onStart?.();
    setIndex(Math.min(Math.max(0, opts?.startIndex ?? 0), Math.max(0, s.length - 1)));
    setActiveId(opts?.id ?? null);
    setSteps(s);
  }, []);
  const stop = useCallback(() => {
    setSteps(null);
    setActiveId(null);
  }, []);
  const finish = useCallback(() => {
    optsRef.current.onFinish?.();
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

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
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
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  // The overlay is portalled to <body>, out of whatever `dir` subtree the app set, so it
  // takes the direction of the element it spotlights (the document's for a centered
  // step). Arrow keys and start/end placement read it.
  const [dir, setDir] = useState<Direction>(() => dirOf(null));
  const rootRef = useRef<HTMLDivElement>(null);

  // Run beforeStep, then locate the target (retrying across route/render lag).
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    setReady(false);
    setRect(null);
    void (async () => {
      await step.beforeStep?.();
      if (cancelled) return;
      if (!step.target) {
        setDir(dirOf(null));
        setReady(true);
        return;
      }
      let tries = 0;
      const find = () => {
        if (cancelled) return;
        const el = queryVisibleTarget(step.target!);
        if (el) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          const r = el.getBoundingClientRect();
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
          setDir(dirOf(el));
          setReady(true);
          return;
        }
        if (tries++ < 45) raf = requestAnimationFrame(find);
        else {
          setDir(dirOf(null));
          setReady(true); // give up → render centered
        }
      };
      find();
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [index, step]);

  // Follow the target as the page scrolls / reflows.
  useEffect(() => {
    if (!step.target) return;
    const update = () => {
      const el = queryVisibleTarget(step.target!);
      if (el) {
        const r = el.getBoundingClientRect();
        const next = { top: r.top, left: r.left, width: r.width, height: r.height };
        setRect((prev) => (sameRect(prev, next) ? prev : next));
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
  useEffect(() => {
    if (!ready || !step.awaitClick || !step.target) return;
    const el = queryVisibleTarget(step.target);
    if (!el) return;
    const onClick = () => window.setTimeout(() => onNext(), 0);
    el.addEventListener("click", onClick, { once: true });
    return () => el.removeEventListener("click", onClick);
  }, [ready, index, step, onNext]);

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
      if (e.key === "Escape") {
        onSkip();
        return;
      }
      if (e.key === "Enter") {
        if (step.awaitClick || ownsKey(e.target, "Enter")) return;
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
  }, [isFirst, step, onNext, onPrev, onSkip]);

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
      className="pointer-events-none fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
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
      className="pointer-events-auto fixed z-[61] w-80 max-w-[calc(100vw-1.5rem)] rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-xl outline-none transition-all duration-200 ease-out"
    >
      <div className="text-sm font-semibold text-[var(--text-primary)]">{step.title}</div>
      <div className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{step.body}</div>
      {step.action && <div className="mt-3">{step.action}</div>}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-[var(--text-placeholder)] hover:text-[var(--text-secondary)]"
          >
            {labels.skip}
          </button>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-xs tabular-nums text-[var(--text-placeholder)]">
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
            {!(step.awaitClick && step.target && rect) && (
              <Button variant="brand" onClick={onNext} className={cn("px-2.5 py-1 text-xs")}>
                {isLast ? labels.done : labels.next}
              </Button>
            )}
          </div>
        </div>
        {step.awaitClick && step.target && rect && (
          <div className="text-center text-xs italic text-[var(--text-placeholder)]">
            {labels.awaitClickHint}
          </div>
        )}
      </div>
    </div>
  );
}
