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
 *
 * Since 0.34 (DUP-11, refactor audit 2026-10) it also removes, and guards
 * `sessionStorage` the same way: `landing/routing`, `billing/checkout-processing` and
 * the demo banner each wrote that guard again by hand. `removeStored` and the session
 * pair are package-private — the barrel exports `readStored` / `writeStored` only.
 */

/** `access` on the storage area, or `fallback` where there is none (SSR) or it throws. */
function guarded<T>(area: "localStorage" | "sessionStorage", fallback: T, access: (storage: Storage) => T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return access(window[area]);
  } catch {
    // private mode, quota, partitioned or blocked storage
    return fallback;
  }
}

/** The stored string for `key`, or null when absent, unreadable, or blocked. */
export function readStored(key: string): string | null {
  return guarded("localStorage", null, (storage) => storage.getItem(key));
}

/** Store `value` under `key`, silently doing nothing when storage is unavailable
 *  or full. A preference that cannot be persisted is not worth an exception. */
export function writeStored(key: string, value: string): void {
  guarded("localStorage", undefined, (storage) => storage.setItem(key, value));
}

/** Forget `key`, silently doing nothing when storage is blocked — there is nothing to
 *  forget then. */
export function removeStored(key: string): void {
  guarded("localStorage", undefined, (storage) => storage.removeItem(key));
}

/** {@link readStored} for `sessionStorage`: this tab's value, or null. */
export function readSessionStored(key: string): string | null {
  return guarded("sessionStorage", null, (storage) => storage.getItem(key));
}

/** {@link writeStored} for `sessionStorage`; `null` removes the key. */
export function writeSessionStored(key: string, value: string | null): void {
  guarded("sessionStorage", undefined, (storage) =>
    value === null ? storage.removeItem(key) : storage.setItem(key, value),
  );
}

/**
 * Every key in `area` that starts with `prefix`, or `[]` where storage refuses — for the
 * reset of this device's settings, which removes a table's views by their prefix
 * (docs/settings-harmonization.md §11.4). Package-private, like {@link removeStored}.
 */
export function storedKeys(prefix: string, area: "local" | "session" = "local"): string[] {
  return guarded(area === "session" ? "sessionStorage" : "localStorage", [], (storage) => {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key !== null && key.startsWith(prefix)) keys.push(key);
    }
    return keys;
  });
}
