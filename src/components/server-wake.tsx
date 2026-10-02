import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, RefObject } from "react";

import { useKitLabels } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { clearanceAbove, subscribeFloating } from "../lib/floating-stack";
import { serverWake } from "../lib/server-wake";
import type { ServerWakeStage, ServerWakeWatcher } from "../lib/server-wake";
import { AlertBanner } from "./alert-banner";
import { Spinner } from "./ui";

/**
 * The visible half of the cold-start watchdog (`lib/server-wake.ts`), keksdose's
 * `app/server-wake-notice.tsx` lifted into the kit: after a couple of seconds of an
 * unanswered read it says the app is still loading, and after seven it says WHY — the
 * server sleeps when nobody is using it, and the first request has to start it again.
 *
 * Corner-anchored and non-blocking on purpose. The pages underneath already show their
 * own skeletons; what was missing is the explanation, not another overlay. Start
 * corner, above the phone's bottom nav, so it collides with neither the centred toasts
 * nor the nav bar — and above any FloatingActionButton it would otherwise cover
 * (kastlan's offline pill shares the corner; on a phone the notice spans both).
 *
 * Mount it next to the router, not inside the app layout, so it also covers the login
 * screen and the landing page — a cold start is at its most confusing exactly there,
 * before anything of the app is on screen.
 */

// ── Labels ────────────────────────────────────────────────────────────────────

export interface ServerWakeLabels {
  /** Past `slowMs` (2 s): a warm server would have answered by now. */
  slow: string;
  /** Past `wakingMs` (7 s): the explanation. `appName` is the notice's prop; without
   *  one the sentence says "the app". */
  waking: (appName?: string) => string;
}

export const DEFAULT_SERVER_WAKE_LABELS: ServerWakeLabels = {
  slow: "Still loading — this is taking longer than usual.",
  waking: (appName) =>
    `The server goes to sleep when nobody is using ${appName ?? "the app"}, so the first request after a break has to start it again. That can take a moment — nothing is lost, the page fills in by itself.`,
};

// ── Hook ──────────────────────────────────────────────────────────────────────

/** The watcher's current stage, re-rendering on every change. Default: the shared
 *  {@link serverWake} instance. */
export function useServerWakeStage(watcher: ServerWakeWatcher = serverWake): ServerWakeStage {
  // The server snapshot is `idle`: nothing is in flight while the HTML is rendered.
  return useSyncExternalStore(watcher.subscribe, watcher.getStage, () => "idle");
}

// ── Notice ────────────────────────────────────────────────────────────────────

export interface ServerWakeNoticeProps {
  /** Default: the shared {@link serverWake} instance. Pass the app's own when it was
   *  made with {@link createServerWake} (e.g. to watch the login POST too). */
  watcher?: ServerWakeWatcher;
  /** Named in the `waking` sentence ("…when nobody is using Keksdose…"). Default: the
   *  label says "the app". */
  appName?: string;
  labels?: Partial<ServerWakeLabels>;
  /**
   * The height to keep clear at the bottom — AppShell's bottom nav. Default: its
   * measured `--app-nav-h` (0px from `md` up and on pages without a shell, such as the
   * login screen), so nothing has to be passed under an AppShell. The safe area is
   * respected either way, and a 1rem gap is added. Numbers are px.
   */
  navOffset?: string | number;
  /** Extra classes on the fixed anchor — a different width or `start-*`. The bottom
   *  offset is an inline style, so move it vertically with {@link navOffset}. Either
   *  way it rises above a visible FloatingActionButton under it. */
  className?: string;
}

const px = (v: string | number) => (typeof v === "number" ? `${v}px` : v);

/** Gap between the notice and a floating control it stacks above. */
const STACK_GAP = "0.5rem";

/**
 * How far off the bottom the notice must sit to clear the FloatingActionButtons under
 * it (`lib/floating-stack.ts`), re-measured when one appears, goes, resizes or the
 * viewport does — or `null` while it is idle or nothing is under it. kastlan 0.18.
 */
function useFloatingClearance(anchor: RefObject<HTMLDivElement | null>, stage: ServerWakeStage): number | null {
  const [clearance, setClearance] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (stage === "idle") return;
    const measure = () => setClearance(clearanceAbove(anchor.current));
    measure();
    const unsubscribe = subscribeFloating(measure);
    window.addEventListener("resize", measure);
    return () => {
      unsubscribe();
      window.removeEventListener("resize", measure);
    };
  }, [anchor, stage]);
  // Idle, the last measurement is stale and nothing shows anyway.
  return stage === "idle" ? null : clearance;
}

/**
 * Renders nothing visible while idle. The LIVE REGION, though, is always mounted: a
 * `role="status"` element inserted together with its text is announced unreliably
 * (several screen readers only speak changes to a region they already knew about),
 * so the region waits empty and the banner appears inside it. keksdose's notice
 * mounted the region and the words at once.
 */
export function ServerWakeNotice({ watcher, appName, labels: labelsProp, navOffset, className }: ServerWakeNoticeProps) {
  const labels = useKitLabels("serverWake", DEFAULT_SERVER_WAKE_LABELS, labelsProp);
  const stage = useServerWakeStage(watcher);
  const waking = stage === "waking";
  const anchor = useRef<HTMLDivElement>(null);
  const clearance = useFloatingClearance(anchor, stage);
  const base = `calc(max(${navOffset === undefined ? "var(--app-nav-h, 0px)" : px(navOffset)}, env(safe-area-inset-bottom, 0px)) + 1rem)`;
  const style: CSSProperties = {
    bottom: clearance === null ? base : `max(${base}, calc(${clearance}px + ${STACK_GAP}))`,
  };

  return (
    <div
      ref={anchor}
      role="status"
      aria-live="polite"
      data-stage={stage}
      style={style}
      // `pointer-events-none` on the empty anchor: a fixed box, even an empty one, is not
      // allowed to swallow a tap on what it sits over.
      className={cn(
        "fixed start-4 z-50 max-w-[min(24rem,calc(100vw-2rem))]",
        stage === "idle" && "pointer-events-none",
        className,
      )}
    >
      {stage !== "idle" && (
        // `elevated`: OPAQUE in both themes (keksdose live #209) — the notice that
        // explains a stall is read over whatever stalled, and a translucent dark tint
        // let the page's own text show through it. A box banner is role-less, so the
        // wrapper above stays the one live region.
        <AlertBanner
          tone={waking ? "warning" : "neutral"}
          size="sm"
          elevated
          // `label={null}`: a Spinner is its own `role="status"` saying "Loading…" —
          // nested here, a second live region and a second announcement ahead of the
          // words that actually explain the wait. Here it is decoration.
          icon={<Spinner label={null} className="h-3.5 w-3.5" />}
        >
          {waking ? labels.waking(appName) : labels.slow}
        </AlertBanner>
      )}
    </div>
  );
}
