import { useState } from "react";
import type { ReactNode } from "react";

import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { hasContent } from "../lib/presence";
import { AlertBanner } from "../components/alert-banner";
import { DEFAULT_NOTIFICATIONS_LABELS } from "./notifications-labels";
import type { NotificationsLabels } from "./notifications-labels";

/**
 * What the notification cards share: their words, the failure line under a card, and
 * the overlay a card shows while its write runs.
 *
 * @internal Not part of the barrel; the cards are.
 */

/** The `notifications` namespace: English, then the provider, then the card's prop. */
export function useNotificationsLabels(prop?: LabelOverride<NotificationsLabels>): NotificationsLabels {
  return useKitLabels("notifications", DEFAULT_NOTIFICATIONS_LABELS, prop);
}

/** The app's words for a failure, else `fallback` — in lib/ since 0.52, for the auth forms
 *  too (refactor audit 2026-10-30, DUP-14). */
export { describeFailure } from "../lib/describe-failure";

/** A failure, said under the card's controls — nothing toasts (§4.2). */
export function FailureLine({ children }: { children: ReactNode }) {
  if (!hasContent(children)) return null;
  return (
    <AlertBanner tone="danger" size="sm" role="alert">
      {children}
    </AlertBanner>
  );
}

/** What {@link useWriteOverlay} answers. */
export interface WriteOverlay<V> {
  has: (key: string) => boolean;
  get: (key: string) => V | undefined;
  pending: (key: string) => boolean;
  set: (key: string, value: V) => void;
  settle: (key: string, ok: boolean) => void;
}

/**
 * Values a card shows while its write runs, over what the server last answered.
 *
 * `set(key, value)` shows `value` at once; `settle(key, ok)` drops it again when the
 * write failed (the server's value comes back) and keeps it when it succeeded, until the
 * app hands the card a new `source` — the PATCH's answer, or a refetch — which clears
 * every settled entry, so a card whose app does not update its query on success does not
 * flick back to the old value in between. `pending(key)` says whether a write for `key`
 * is still running.
 *
 * The reset on a new `source` is React's "adjust state while rendering" pattern, not an
 * effect: the overlay is gone in the same render that shows the new value.
 */
export function useWriteOverlay<V>(source: unknown): WriteOverlay<V> {
  const [entries, setEntries] = useState<ReadonlyMap<string, { value: V; running: boolean }>>(new Map());
  const [seen, setSeen] = useState(source);
  if (seen !== source) {
    setSeen(source);
    const kept = new Map([...entries].filter(([, entry]) => entry.running));
    if (kept.size !== entries.size) setEntries(kept);
  }
  return {
    has: (key: string) => entries.has(key),
    get: (key: string) => entries.get(key)?.value,
    pending: (key: string) => entries.get(key)?.running === true,
    set: (key: string, value: V) => setEntries((current) => new Map(current).set(key, { value, running: true })),
    settle: (key: string, ok: boolean) =>
      setEntries((current) => {
        const entry = current.get(key);
        if (!entry) return current;
        const next = new Map(current);
        if (ok) next.set(key, { value: entry.value, running: false });
        else next.delete(key);
        return next;
      }),
  };
}
