/**
 * Tell this origin's other tabs one thing over a `BroadcastChannel`, and let go of the
 * channel at once.
 *
 * 0.52 code review (src/sync/engine.ts, src/offline/query-persistence.ts): FLW-1 (refactor
 * audit 2026-10-30) gave both a cross-tab message — the sync engine's new epoch after
 * `forget()`, the query copy's `clear` — and each wrote the same open, post, close, swallow
 * and feature check by hand. Best-effort by design: the message makes another tab stop
 * sooner, and each caller has a fallback that holds without it (the epoch in `meta`, the key
 * deleted from storage).
 *
 * The message goes out on a channel of its own, so a caller that listens on `name` itself
 * hears it too, like every other channel of that name in this tab: it ignores its own.
 */
export function postOnce(name: string, message: unknown): void {
  // Older browsers and some test environments have none: nothing is posted.
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(name);
    try {
      channel.postMessage(message);
    } finally {
      channel.close();
    }
  } catch {
    /* best-effort: a message that cannot be cloned, a channel refused (an opaque origin) */
  }
}
