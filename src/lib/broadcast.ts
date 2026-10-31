/*
 * The cross-tab messages of the sync engine (the copy's new epoch after `forget()`) and of the
 * query copy (`clear`), refactor audit 2026-10-30 FLW-1. 0.52 code review
 * (src/sync/engine.ts, src/offline/query-persistence.ts): both wrote the open, the feature
 * check, the try/catch and the close by hand, the listening side twice too — and the two
 * listeners had drifted (only the query copy's let go of Node's worker).
 */

/**
 * Tell this origin's other tabs one thing over a `BroadcastChannel`, and let go of the
 * channel at once.
 *
 * Best-effort by design: the message makes another tab stop sooner, and each caller has a
 * fallback that holds without it (the epoch in `meta`, the key deleted from storage).
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

/**
 * Hear what this origin's other tabs post on `name` until the returned function is called.
 * Nothing is heard (and closing is a no-op) where there is no BroadcastChannel or none can be
 * opened (an opaque origin): each caller has a fallback that holds without it.
 */
export function listenOn(name: string, onMessage: (data: unknown) => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => undefined;
  let channel: BroadcastChannel;
  try {
    channel = new BroadcastChannel(name);
  } catch {
    return () => undefined;
  }
  // Node's channel (an app's tests) holds its worker open while it listens, and a test that
  // never stops the listener would keep it listening. Browsers have no `unref`.
  (channel as BroadcastChannel & { unref?: () => void }).unref?.();
  channel.onmessage = ({ data }: MessageEvent<unknown>) => onMessage(data);
  return () => channel.close();
}
