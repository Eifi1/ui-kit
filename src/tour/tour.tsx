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
import { Button } from "../components/ui";

export type TourPlacement = "top" | "right" | "bottom" | "left" | "center";

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
   *  screen. An explicit side flips to the opposite side if it would overflow,
   *  then clamps into the viewport. */
  placement?: TourPlacement;
  /** Advance only when the user clicks the spotlighted target itself (not the
   *  card's Next button). Requires `target`: the real control's own handler runs
   *  first, then the tour steps forward on a microtask. The overlay stays
   *  click-through to the target. */
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

const DEFAULT_LABELS: TourLabels = {
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
  const merged: TourLabels = { ...DEFAULT_LABELS, ...labels };
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
          setReady(true);
          return;
        }
        if (tries++ < 45) raf = requestAnimationFrame(find);
        else setReady(true); // give up → render centered
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

  // awaitClick: advance when the *real* target is clicked. The overlay is
  // click-through (pointer-events-none except the card) so the element's own
  // handler runs first; we step forward on the next macrotask.
  useEffect(() => {
    if (!ready || !step.awaitClick || !step.target) return;
    const el = queryVisibleTarget(step.target);
    if (!el) return;
    const onClick = () => window.setTimeout(() => onNext(), 0);
    el.addEventListener("click", onClick, { once: true });
    return () => el.removeEventListener("click", onClick);
  }, [ready, index, step, onNext]);

  // Keyboard: Esc skips, →/Enter advance, ← goes back. On awaitClick steps Enter
  // is ignored (it would fire the target's click AND advance) — → stays as an
  // escape hatch.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onSkip();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
      } else if (e.key === "Enter") {
        if (step.awaitClick) return;
        e.preventDefault();
        onNext();
      } else if (e.key === "ArrowLeft") {
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

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={step.title}>
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
        <div className="pointer-events-auto fixed inset-0 bg-slate-900/70" />
      )}
      <TourCard
        step={step}
        index={index}
        total={steps.length}
        labels={labels}
        isFirst={isFirst}
        isLast={isLast}
        rect={spot}
        onBack={onPrev}
        onNext={onNext}
        onSkip={onSkip}
      />
    </div>,
    document.body,
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
): { top: number; left: number } {
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
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });

  useLayoutEffect(() => {
    const card = ref.current;
    if (!card) return;
    setStyle(
      placeCard(rect, card.offsetWidth, card.offsetHeight, window.innerWidth, window.innerHeight, 12, step.placement),
    );
  }, [rect, index, step.placement]);

  return (
    <div
      ref={ref}
      style={style}
      className="pointer-events-auto fixed z-[61] w-80 max-w-[calc(100vw-1.5rem)] rounded-lg border border-slate-200 bg-white p-4 shadow-xl transition-all duration-200 ease-out dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{step.title}</div>
      <div className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.body}</div>
      {step.action && <div className="mt-3">{step.action}</div>}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            {labels.skip}
          </button>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-xs tabular-nums text-slate-400 dark:text-slate-500">
              {labels.step(index + 1, total)}
            </span>
            {!isFirst && (
              <Button variant="secondary" onClick={onBack} className="px-2.5 py-1 text-xs">
                {labels.back}
              </Button>
            )}
            {/* On an awaitClick step the Next button is replaced by a hint on its
                own row below, so it doesn't cram the counter + buttons and wrap. */}
            {!(step.awaitClick && step.target) && (
              <Button variant="brand" onClick={onNext} className={cn("px-2.5 py-1 text-xs")}>
                {isLast ? labels.done : labels.next}
              </Button>
            )}
          </div>
        </div>
        {step.awaitClick && step.target && (
          <div className="text-center text-xs italic text-slate-400 dark:text-slate-500">
            {labels.awaitClickHint}
          </div>
        )}
      </div>
    </div>
  );
}
