import { useSyncExternalStore } from "react";

import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { serverWake } from "../lib/server-wake";
import type { ServerWakeStage, ServerWakeWatcher } from "../lib/server-wake";
import { AlertBanner } from "./alert-banner";
import { Spinner } from "./spinner";
import { DEFAULT_SERVER_WAKE_LABELS } from "./server-wake-labels";

/**
 * The visible half of the cold-start watchdog (`lib/server-wake.ts`), keksdose's
 * `app/server-wake-notice.tsx` lifted into the kit: after a couple of seconds of an
 * unanswered read it says the app is still loading, and after seven it says WHY — the
 * server sleeps when nobody is using it, and the first request has to start it again.
 *
 * Non-blocking on purpose. The pages underneath already show their own skeletons; what
 * was missing is the explanation, not another overlay.
 *
 * **At the top, centred, and it takes no taps** (0.34, round C13; keksdose live #399:
 * *"Move the notification to the top where it can be better seen and not block any
 * sticky elements."*). Until 0.34 it sat in the bottom-start corner above the phone's
 * nav — exactly where a phone keeps what floats: a register's action group, a
 * FloatingActionButton, a dialog's sticky Create/Cancel footer — and a cold start is
 * when that Create is wanted first. It rose above a FloatingActionButton it measured,
 * but a sticky footer is not one. The top bar is the one band whose contents nobody
 * needs while the server is still waking, and `pointer-events-none` lets a tap through
 * to whatever the notice does cover: it is a status line with nothing in it to press.
 * Below the status bar and inside the side insets of a notched phone (`safe-area-inset-*`);
 * its width is in rem, so at the Large text size it is wider and wraps less, and the
 * screen's edges still stop it. The toasts stay readable: a phone shows them at the
 * bottom, and a desktop `TOASTER_OFFSET_TOP` (4rem) down, where they draw over a long
 * notice rather than under it (`--z-toast` is above this `z-50`).
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

// Defined in ./server-wake-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_SERVER_WAKE_LABELS };

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
  labels?: LabelOverride<ServerWakeLabels>;
  /**
   * @deprecated 0.34 — drop it; removed in 0.35. The notice sits at the TOP of the
   * screen since 0.34, so there is no bottom nav to clear and this does nothing. It was
   * the height kept clear at the bottom (AppShell's `--app-nav-h`).
   */
  navOffset?: string | number;
  /** Extra classes on the fixed anchor — a different width (`max-w-*`), or another
   *  `top-*` for an app that wants it under its top bar rather than over it. Merged, so
   *  a class given here replaces the kit's of the same kind. */
  className?: string;
}

/**
 * Renders nothing visible while idle. The LIVE REGION, though, is always mounted: a
 * `role="status"` element inserted together with its text is announced unreliably
 * (several screen readers only speak changes to a region they already knew about),
 * so the region waits empty and the banner appears inside it. keksdose's notice
 * mounted the region and the words at once.
 */
export function ServerWakeNotice({ watcher, appName, labels: labelsProp, className }: ServerWakeNoticeProps) {
  const labels = useKitLabels("serverWake", DEFAULT_SERVER_WAKE_LABELS, labelsProp);
  const stage = useServerWakeStage(watcher);
  const waking = stage === "waking";

  return (
    <div
      role="status"
      aria-live="polite"
      data-stage={stage}
      className={cn(
        // Centred at the top (keksdose live #399): `left`/`right` hold it inside the
        // side insets of a notched phone held sideways, `w-fit` + `mx-auto` centre it
        // between them, and `top` puts it under the status bar.
        "fixed z-50 mx-auto w-fit max-w-[24rem]",
        "top-[calc(env(safe-area-inset-top,0px)+0.375rem)]",
        "left-[max(1rem,env(safe-area-inset-left,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]",
        // No taps, ever: a status line has nothing in it to press, and whatever it
        // covers — the top bar's buttons, a page's own header — must still answer
        // underneath it. A link or button inside would take its taps back (none today:
        // the labels are text), so the rule cannot quietly disable a control later.
        "pointer-events-none [&_:is(a,button)]:pointer-events-auto",
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
