import { readSessionStored, readStored, removeStored, writeSessionStored, writeStored } from "../lib/safe-storage";

// The choice's storage half of ./shared-computer, in a module without its checkbox (refactor
// audit 2026-11-22, MOD-1): the accounts client reads `isSharedComputer` at once, the sign-in
// page draws the checkbox late. A bundler splits by module, so while the two shared one, the
// sign-in's chunk and the client's entry shared it, and the checkbox, the tooltip and the
// field parts came along in the entry (Rollup, the public-site set of check-module-graph.mjs:
// 56.6 kB minified, 20.7 kB gzip, with them; 29.0 kB, 10.7 kB gzip, without).
// ./shared-computer re-exports all of it.

const KEY = "eifi1-shared-computer";

/** Where the choice is held: `"session"` (this tab, the default) or `"local"` (as long as
 *  a session kept in `localStorage`, until `setSharedComputer(false)`). */
export type SharedComputerStorage = "session" | "local";

/** Whether this session was signed in as on a shared computer, the choice held in either
 *  place. `false` when storage is unavailable. */
export function isSharedComputer(): boolean {
  return readSessionStored(KEY) === "1" || readStored(KEY) === "1";
}

/** Records the choice in `options.storage` (default `"session"`), and only there; `false`
 *  forgets it in both places. */
export function setSharedComputer(on: boolean, options: { storage?: SharedComputerStorage } = {}): void {
  const local = options.storage === "local";
  writeSessionStored(KEY, on && !local ? "1" : null);
  if (on && local) writeStored(KEY, "1");
  else removeStored(KEY);
}
