import type { StateCreator, StoreMutatorIdentifier } from "zustand";

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

function storeLogEnabled(): boolean {
  try {
    const override = localStorage.getItem("store_log");
    if (override === "0") return false;
    if (override === "1") return true;
  } catch {
    // ignore (private mode, etc.)
  }
  return Boolean(import.meta.env.DEV);
}

const loggerImpl: LoggerImpl = (f, name) => (set, get, store) => {
  const loggedSet = ((...args: unknown[]) => {
    const prev = get();
    (set as (...a: unknown[]) => void)(...args);
    if (storeLogEnabled()) {
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
