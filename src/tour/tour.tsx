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
  /** Runs before the step is shown — e.g. navigate to a route, open a panel.
   *  May be async; the step waits for it, then locates the target. */
  beforeStep?: () => void | Promise<void>;
}

export interface TourLabels {
  next: string;
  back: string;
  skip: string;
  done: string;
  /** Step counter, e.g. (2, 7) => "2 / 7". */
  step: (current: number, total: number) => string;
}

const DEFAULT_LABELS: TourLabels = {
  next: "Next",
  back: "Back",
  skip: "Skip",
  done: "Done",
  step: (c, t) => `${c} / ${t}`,
};

interface StartOptions {
  onFinish?: () => void;
  onSkip?: () => void;
}

interface TourContextValue {
  active: boolean;
  /** Start a tour with the given steps. */
  start: (steps: TourStep[], opts?: StartOptions) => void;
  /** End the current tour (no callbacks fire). */
  stop: () => void;
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
 * selectors, per-step navigation) and the translated {@link TourLabels}. Mount
 * once inside the router; start a tour from anywhere via {@link useTour}.
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
  const optsRef = useRef<StartOptions>({});
  const active = !!steps && steps.length > 0;

  const start = useCallback((s: TourStep[], opts?: StartOptions) => {
    optsRef.current = opts ?? {};
    setIndex(0);
    setSteps(s);
  }, []);
  const stop = useCallback(() => setSteps(null), []);
  const finish = useCallback(() => {
    optsRef.current.onFinish?.();
    setSteps(null);
  }, []);
  const skip = useCallback(() => {
    optsRef.current.onSkip?.();
    setSteps(null);
  }, []);

  return (
    <TourContext.Provider value={{ active, start, stop }}>
      {children}
      {active && (
        <TourOverlay
          steps={steps!}
          index={index}
          labels={merged}
          onIndex={setIndex}
          onFinish={finish}
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
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && (el as HTMLElement).offsetParent !== null;
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
  onIndex,
  onFinish,
  onSkip,
}: {
  steps: TourStep[];
  index: number;
  labels: TourLabels;
  onIndex: (i: number) => void;
  onFinish: () => void;
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
        const el = document.querySelector(step.target!);
        if (el && isVisible(el)) {
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
      const el = document.querySelector(step.target!);
      if (el && isVisible(el)) {
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

  // Keyboard: Esc skips, →/Enter advance, ← goes back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
      else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        if (isLast) onFinish();
        else onIndex(index + 1);
      } else if (e.key === "ArrowLeft") {
        if (!isFirst) onIndex(index - 1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, isFirst, isLast, onFinish, onSkip, onIndex]);

  if (!ready) return null;

  const pad = step.padding ?? 8;
  const spot: Rect | null = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={step.title}>
      {spot ? (
        <div
          className="pointer-events-none fixed rounded-lg ring-2 ring-white/80 transition-all duration-200 ease-out"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: "0 0 0 9999px rgba(15,23,42,0.55)",
          }}
        />
      ) : (
        <div className="pointer-events-auto fixed inset-0 bg-slate-900/55" />
      )}
      <TourCard
        step={step}
        index={index}
        total={steps.length}
        labels={labels}
        isFirst={isFirst}
        isLast={isLast}
        rect={spot}
        onBack={() => onIndex(index - 1)}
        onNext={() => onIndex(index + 1)}
        onFinish={onFinish}
        onSkip={onSkip}
      />
    </div>,
    document.body,
  );
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
  onFinish,
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
  onFinish: () => void;
  onSkip: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });

  useLayoutEffect(() => {
    const card = ref.current;
    if (!card) return;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const m = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!rect) {
      setStyle({ top: Math.max(m, (vh - ch) / 2), left: Math.max(m, (vw - cw) / 2) });
      return;
    }
    const below = rect.top + rect.height + m;
    const above = rect.top - ch - m;
    let top: number;
    if (below + ch <= vh) top = below;
    else if (above >= m) top = above;
    else top = Math.max(m, (vh - ch) / 2);
    let left = rect.left + rect.width / 2 - cw / 2;
    left = Math.min(Math.max(m, left), vw - cw - m);
    setStyle({ top, left });
  }, [rect, index]);

  return (
    <div
      ref={ref}
      style={style}
      className="pointer-events-auto fixed z-[61] w-80 max-w-[calc(100vw-1.5rem)] rounded-lg border border-slate-200 bg-white p-4 shadow-xl transition-all duration-200 ease-out dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{step.title}</div>
      <div className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.body}</div>
      {step.action && <div className="mt-3">{step.action}</div>}
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          {labels.skip}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
            {labels.step(index + 1, total)}
          </span>
          {!isFirst && (
            <Button variant="secondary" onClick={onBack} className="px-2.5 py-1 text-xs">
              {labels.back}
            </Button>
          )}
          <Button
            variant="brand"
            onClick={isLast ? onFinish : onNext}
            className={cn("px-2.5 py-1 text-xs")}
          >
            {isLast ? labels.done : labels.next}
          </Button>
        </div>
      </div>
    </div>
  );
}
