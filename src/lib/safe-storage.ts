/**
 * `localStorage` that cannot take the page down with it.
 *
 * Accessing `window.localStorage` **throws** — rather than returning null — when a
 * browser has site data blocked: Safari private browsing, Chrome with third-party
 * site data disabled, a partitioned webview. Three places in this package already
 * knew that and wrapped their calls in try/catch (`logger.ts`, and the DataTable's
 * `loadPersisted`/`savePersisted`). One did not: `AppShell` read the sidebar's
 * collapse flag straight out of a `useState` initialiser, so the throw happened
 * during render of the application's top-level shell. That is not a lost preference
 * — nothing mounts, in every consumer of this package at once.
 *
 * So the guard lives here, once, and the next storage-backed preference cannot
 * forget it. A read that cannot happen is indistinguishable from a key that was
 * never set, which is the right answer for every caller: the default.
 */

/** The stored string for `key`, or null when absent, unreadable, or blocked. */
export function readStored(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Store `value` under `key`, silently doing nothing when storage is unavailable
 *  or full. A preference that cannot be persisted is not worth an exception. */
export function writeStored(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore (private mode, quota, partitioned storage)
  }
}
