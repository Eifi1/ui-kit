import { useKitLabels } from "../i18n/kit-labels";

/**
 * The demo's words (docs/landing-demo-harmonization.md §5) — the `demo` namespace of
 * `<UiKitProvider labels>`: `DemoStart`'s progress and refusals, `DemoBanner`'s
 * countdown and model line, `DemoEnded`, and the reason of the read-only lock.
 *
 * "Demo" means the demo session and the shared demo data it shows (§2.10) — never
 * keksdose's blur toggle, which is "Presentation mode" now. "Request access" and "Sign
 * in" are the `landing` namespace's, so they read the same on every public page.
 */
export interface DemoLabels {
  /** `DemoStart` while the demo is being created. */
  starting: string;
  /** `demo_rate_limited`: too many demos from one network, given the wait in whole
   *  minutes from `Retry-After` — or `undefined` without one. */
  rateLimited: (minutes?: number) => string;
  /** `demo_capacity`: the live cap is reached. */
  capacity: string;
  /** `demo_disabled` and `demo_not_ready`: the demo is off, or its data isn't there. */
  unavailable: string;
  /** Any other failure — the network, a 500. */
  failed: string;
  /** `DemoStart`'s way out after a refusal, to the landing. */
  backToStart: string;
  /** The banner's countdown with an hour or more left: "Demo · 23 h 12 min left". */
  hoursLeft: (hours: number, minutes: number) => string;
  /** …and in the last hour, minutes only: "Demo · 50 min left". */
  minutesLeft: (minutes: number) => string;
  /** The banner's word when the end is unknown (no readable `expiresAt`). */
  badge: string;
  /** The banner's line for model R, shared read-only data. */
  readOnly: string;
  /** The banner's line for model S, a sandbox of one's own. */
  sandbox: string;
  /** The name of the banner's show/hide toggle (`aria-expanded` says which). */
  details: string;
  /** The reason a locked commit shows in a read-only demo (model R) — for the app's
   *  `<WriteLockProvider locked reason={…}>` (§5.4). */
  writeLocked: string;
  /** `DemoEnded`'s heading; also the banner's text at zero. */
  endedTitle: string;
  /** `DemoEnded`'s line for model R. */
  endedReadOnly: string;
  /** `DemoEnded`'s line for model S. */
  endedSandbox: string;
  /** `DemoEnded`'s first action, to `/demo`. */
  restart: string;
}

export const DEFAULT_DEMO_LABELS: DemoLabels = {
  starting: "Starting the demo…",
  rateLimited: (minutes) =>
    minutes
      ? `Too many demos from this network. Try again in ${minutes} min.`
      : "Too many demos from this network. Try again later.",
  capacity: "The demo is full right now. Try again later.",
  unavailable: "The demo isn’t available right now.",
  failed: "The demo could not be started. Please try again.",
  backToStart: "Back to the start page",
  hoursLeft: (hours, minutes) => `Demo · ${hours} h ${minutes} min left`,
  minutesLeft: (minutes) => `Demo · ${minutes} min left`,
  badge: "Demo",
  readOnly: "You’re looking at sample data. Changes aren’t possible.",
  sandbox: "Your own work is deleted when the demo ends.",
  details: "Demo details",
  writeLocked: "Not possible in the demo.",
  endedTitle: "The demo has ended",
  endedReadOnly: "Sample data is reset regularly.",
  endedSandbox: "Sample data is reset regularly; your own work from the demo is deleted.",
  restart: "Start a new demo",
};

/** The `demo` namespace, resolved: English, then the provider, then `labels`. The app
 *  reads `writeLocked` from here for its `WriteLockProvider`. */
export function useDemoLabels(labels?: Partial<DemoLabels>): DemoLabels {
  return useKitLabels("demo", DEFAULT_DEMO_LABELS, labels);
}
