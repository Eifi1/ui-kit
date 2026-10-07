import { useCallback, useEffect, useEffectEvent, useSyncExternalStore } from "react";

/**
 * The demo's countdown (docs/landing-demo-harmonization.md §5.3, §5.4): the time left to
 * the demo account's end, from `expires_at` (the `TokenResponse`) or `demo_expires_at`
 * (`/auth/me`). The client never decodes the JWT.
 */

/** When the demo ends: an ISO timestamp from the server, epoch milliseconds, or a
 *  `Date`. */
export type DemoExpiry = string | number | Date;

/** The last stretch, in minutes, in which the banner turns to the warning tone (§5.4). */
export const DEMO_WARNING_MINUTES = 10;
/** Below this many minutes the countdown shows minutes only (§5.4). */
export const DEMO_MINUTES_ONLY = 60;

const MINUTE = 60_000;

export interface DemoCountdown {
  /**
   * Whole minutes left, ROUNDED UP — 30 s left is "1 min", and 0 only once the demo has
   * ended. `null` when `expiresAt` cannot be read: the countdown then shows no time and
   * never ends by itself (a parse slip must not throw a visitor out).
   */
  minutesLeft: number | null;
  /** The display split: whole hours, and the minutes past them. In the last hour
   *  (`lastHour`) `hours` is 0 and `minutes` is `minutesLeft`. */
  hours: number;
  minutes: number;
  /** `minutesLeft <= 60`: show minutes only. */
  lastHour: boolean;
  /** `minutesLeft <= 10`: the warning tone. */
  warning: boolean;
  /** The demo's time is up. */
  ended: boolean;
}

/** `expiresAt` as epoch milliseconds, or NaN. */
function expiryMs(expiresAt: DemoExpiry | null | undefined): number {
  if (expiresAt === null || expiresAt === undefined) return Number.NaN;
  if (typeof expiresAt === "number") return expiresAt;
  if (expiresAt instanceof Date) return expiresAt.getTime();
  return Date.parse(expiresAt);
}

/** Whole minutes left at `now`, rounded up, never below 0; null for an unreadable end. */
function minutesAt(expiry: number, now: number): number | null {
  if (!Number.isFinite(expiry)) return null;
  return Math.max(0, Math.ceil((expiry - now) / MINUTE));
}

/**
 * The countdown at `now` — pure, for a test or a server-rendered value. See
 * {@link DemoCountdown} for the rounding and the thresholds.
 */
export function demoCountdown(expiresAt: DemoExpiry | null | undefined, now: number): DemoCountdown {
  return countdownOf(minutesAt(expiryMs(expiresAt), now));
}

function countdownOf(minutesLeft: number | null): DemoCountdown {
  if (minutesLeft === null) {
    return { minutesLeft, hours: 0, minutes: 0, lastHour: false, warning: false, ended: false };
  }
  const lastHour = minutesLeft <= DEMO_MINUTES_ONLY;
  return {
    minutesLeft,
    hours: lastHour ? 0 : Math.floor(minutesLeft / 60),
    minutes: lastHour ? minutesLeft : minutesLeft % 60,
    lastHour,
    warning: minutesLeft <= DEMO_WARNING_MINUTES,
    ended: minutesLeft === 0,
  };
}

export interface DemoCountdownOptions {
  /**
   * The clock, in epoch milliseconds. Default `Date.now`. A test passes its own (or uses
   * fake timers, which move `Date.now` too). Keep it a stable function — a new one each
   * render re-arms the timer each render.
   */
  now?: () => number;
  /** Called once when the countdown reaches zero — also on mount, if it already has.
   *  The app clears the session and replaces to `/demo/ended` (§5.5). */
  onEnded?: () => void;
}

/**
 * The time left to `expiresAt`, re-rendering when the shown minute changes — one timer
 * to the next minute boundary, not a tick a second — and once more when the tab comes
 * back from the background (a hidden tab's timers are throttled).
 *
 * `onEnded` fires at zero (§5.5). The countdown is the client's, from `expires_at`; the
 * server's answer to a request after the end (a 401) ends the demo as well — the app's
 * 401 handler, not this hook.
 */
export function useDemoCountdown(
  expiresAt: DemoExpiry | null | undefined,
  { now = Date.now, onEnded }: DemoCountdownOptions = {},
): DemoCountdown {
  const expiry = expiryMs(expiresAt);
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!Number.isFinite(expiry)) return () => {};
      let timer: ReturnType<typeof setTimeout> | undefined;
      const arm = () => {
        const left = expiry - now();
        if (left <= 0) return;
        // The rounded-up minute changes when `left` crosses the next whole minute below.
        const delay = left - (Math.ceil(left / MINUTE) - 1) * MINUTE;
        timer = setTimeout(() => {
          notify();
          arm();
        }, delay);
      };
      const onVisible = () => {
        if (document.visibilityState !== "visible") return;
        clearTimeout(timer);
        notify();
        arm();
      };
      arm();
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("visibilitychange", onVisible);
      };
    },
    [expiry, now],
  );
  const snapshot = () => minutesAt(expiry, now());
  const minutesLeft = useSyncExternalStore(subscribe, snapshot, snapshot);
  const countdown = countdownOf(minutesLeft);

  const fireEnded = useEffectEvent(() => onEnded?.());
  useEffect(() => {
    if (countdown.ended) fireEnded();
  }, [countdown.ended]);

  return countdown;
}
