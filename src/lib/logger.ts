import type { StateCreator, StoreMutatorIdentifier } from "zustand";

import { readStored } from "./safe-storage";

/**
 * zustand logging middleware.
 *
 * Logs every state transition (a store "action") to the DevTools console as a
 * single grouped line showing the prev/next state. Enabled in dev (Vite
 * `import.meta.env.DEV`) by default; override at runtime with
 * `localStorage.setItem("store_log", "0")` to silence or `"1"` to force-on in a
 * production build.
 */
type Logger = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  f: StateCreator<T, Mps, Mcs>,
  name?: string,
) => StateCreator<T, Mps, Mcs>;

type LoggerImpl = <T>(f: StateCreator<T, [], []>, name?: string) => StateCreator<T, [], []>;

/**
 * Read ONCE, at module scope, not on every `set`.
 *
 * This used to run inside the wrapped `set`, which means a synchronous
 * `localStorage.getItem` on every state transition of every logged store — in
 * production builds too, because the override has to stay readable there by design.
 * The stores this middleware wraps include ones that transition per pointer event.
 *
 * The override cannot change without someone opening devtools and reloading, so
 * once per session is the same behaviour at a fraction of the cost. {@link setStoreLog}
 * keeps the ability to flip it live from a console, which is the only thing the
 * per-call read was actually buying.
 */
let storeLog: boolean = (() => {
  const override = readStored("store_log");
  if (override === "0") return false;
  if (override === "1") return true;
  // NOT under vitest. `DEV` distinguishes a dev build from a production one; a test
  // run is neither, and vitest sets `DEV=true` — so every transition of every logged
  // store printed a prev/next object into the suite output. Measured on the consumer's
  // suite: 822 blocks, several thousand lines, in a log whose whole job is to make one
  // real `console.error` findable. `store_log=1` still forces it on.
  return Boolean(import.meta.env.DEV) && !import.meta.env.VITEST;
})();

/** Turn store logging on or off for the rest of the session (devtools escape hatch). */
export function setStoreLog(enabled: boolean): void {
  storeLog = enabled;
}

const loggerImpl: LoggerImpl = (f, name) => (set, get, store) => {
  const loggedSet = ((...args: unknown[]) => {
    const prev = get();
    (set as (...a: unknown[]) => void)(...args);
    if (storeLog) {
      console.debug(
        `%c[store${name ? `:${name}` : ""}]`,
        "color:#0d9488",
        { prev, next: get() },
      );
    }
  }) as typeof set;
  return f(loggedSet, get, store);
};

export const logger = loggerImpl as unknown as Logger;
