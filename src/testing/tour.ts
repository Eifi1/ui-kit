/**
 * 0.50.1 (keksdose N4): a `TourStepContext` for a test that calls a step's `beforeStep` or
 * `when` itself. 0.50 gave both the context, so `beforeStep!()` is a type error;
 * `beforeStep!(tourStepContext())` is the drop-in.
 *
 * Spelled out here rather than imported from the tour module, so `@eifi1/ui-kit/testing`
 * still reaches no package (the tour module reaches React); the kit's own test pins that it
 * is assignable to `TourStepContext`.
 */

/** How a step is entered: `TourStepContext["via"]`. */
export type TourStepVia = "start" | "at" | "next" | "back" | "goto";

/** The shape of `TourStepContext` (`@eifi1/ui-kit/tour`). */
export interface TestTourStepContext {
  gate(key: string): boolean | undefined;
  via: TourStepVia;
}

export interface TourStepContextOptions {
  /** How the step is entered. Default `"start"`. */
  via?: TourStepVia;
  /**
   * The published gates, as the form would publish them: `{ "txn.transfer": true }`. A key
   * left out answers `undefined` (nobody publishes it). Default: none.
   */
  gates?: Readonly<Record<string, boolean | undefined>>;
}

/**
 * A valid step context: `via: "start"` and no gates published, unless `options` say
 * otherwise. `step.beforeStep!(tourStepContext())`, `step.when!(tourStepContext({ gates:
 * { "txn.transfer": true } }))`, `tourStepContext({ via: "at" })` for a "Guide me" entry.
 */
export function tourStepContext(options: TourStepContextOptions = {}): TestTourStepContext {
  const gates = options.gates ?? {};
  return {
    gate: (key) => (Object.prototype.hasOwnProperty.call(gates, key) ? gates[key] : undefined),
    via: options.via ?? "start",
  };
}
