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
 * the demo banner each wrote that guard again by hand.
 *
 * Since 0.52 all of it but {@link storedKeys} is public, with a JSON pair beside it
 * (DUP-8, refactor audit 2026-10-30). Kept package-private, the guard was written again
 * four times in the kit's showcase and in 16 files across the three apps, some of them
 * without it: a token read that throws where storage is blocked takes every request
 * down with it. (The kit's own DevMenu, 0.51, wrote the session pair a second time too.)
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
 *  or full. A preference that cannot be persisted is not worth an exception. `null`
 *  removes the key, as {@link writeSessionStored}'s does (0.52; the two pairs wrote
 *  differently, and `null` past the types stored the string "null" — 0.52 code review). */
export function writeStored(key: string, value: string | null): void {
  guarded("localStorage", undefined, (storage) =>
    value === null ? storage.removeItem(key) : storage.setItem(key, value),
  );
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
 * The JSON stored under `key`, when it parses and `isShape` accepts it; else `null`. Absent,
 * blocked, malformed and another shape all read as "never set" — the caller's default —
 * which is what the six hand-written `JSON.parse(readStored(key))` reads in the kit each
 * answered in their own try/catch (DUP-8). `isShape` gets the parsed value as `unknown`:
 * the shape check is the one part that is the caller's. A shape check that throws reads
 * as another shape: null.
 */
export function readStoredJson<T>(key: string, isShape: (value: unknown) => value is T): T | null {
  const text = readStored(key);
  if (text === null) return null;
  try {
    const value: unknown = JSON.parse(text);
    return isShape(value) ? value : null;
  } catch {
    // not JSON, or a shape check that read past what is there
    return null;
  }
}

/** Store `value` as JSON under `key`, silently doing nothing when storage is unavailable
 *  or full, or the value has no JSON form (a cycle, a BigInt) — {@link writeStored}'s rule. */
export function writeStoredJson(key: string, value: unknown): void {
  let text: string | undefined;
  try {
    text = JSON.stringify(value);
  } catch {
    return;
  }
  // `undefined` (and a function) has no JSON form either: stringify answers undefined.
  if (text !== undefined) writeStored(key, text);
}

/**
 * Every key in `area` that starts with `prefix`, or `[]` where storage refuses — for the
 * reset of this device's settings, which removes a table's views by their prefix
 * (docs/settings-harmonization.md §11.4). Package-private: the reset's alone.
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
