/**
 * 0.50.1 (keksdose N1): the tour engine a launcher is handed as its fourth argument — one
 * object for the life of the provider (or of `useTourUrlSync`) whose fields always read the
 * engine's LATEST render: `engine.active`, `engine.index` after an `await` are current, and
 * `engine.stop()` mid-run stops the run that is up now. Internal: the type is `TourEngine`.
 *
 * `set` is called from a layout effect with each render's engine; `engine` reads it.
 */
export function liveEngine<T extends object>(
  keys: readonly (keyof T & string)[],
  initial: T | null = null,
): { engine: T; set: (current: T) => void } {
  let current = initial;
  const read = () => {
    if (!current)
      throw new Error(
        "[ui-kit] The tour engine was read before its provider rendered.",
      );
    return current;
  };
  const engine = {} as T;
  for (const key of keys) {
    Object.defineProperty(engine, key, {
      enumerable: true,
      get: () => {
        const value = read()[key];
        // A method is looked up when it is CALLED, so a kept `engine.stop` is the latest too.
        return typeof value === "function"
          ? (...args: unknown[]) =>
              (read()[key] as (...a: unknown[]) => unknown)(...args)
          : value;
      },
    });
  }
  return {
    engine,
    set: (next) => {
      current = next;
    },
  };
}
