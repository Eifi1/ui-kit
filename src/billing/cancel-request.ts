import { useState } from "react";

/**
 * What the payer asked for in the app (0.43, kastlan `18bf4c0`): `"cancel"` after
 * `POST /billing/cancel` answered 204, `"resume"` after `POST /billing/resume` — while the
 * overview still shows the old `cancel_at_period_end`, until the provider's
 * `subscription.updated` has landed (§16.3). `null`: nothing asked, or the row has moved.
 */
export type CancelRequested = "cancel" | "resume" | null;

/** What the page shows for the row as read now — `CancelRequest.view(rowScheduled)`. */
export interface CancelRequestView {
  /** For `SubscriptionActions`' `cancelRequested`. */
  requested: CancelRequested;
  /** What the plan line says — the asked-for state until the row moves, then the row's:
   *  "Cancels on …" at once after a cancel, "Renews on …" after "Keep subscription". */
  cancelScheduled: boolean;
  /** Call on the 204 of a cancel or of a resume. A cancel and its undo both asked before
   *  the row moved cancel out. */
  noteAsked: () => void;
}

export interface CancelRequest {
  /** Read the overview again every few seconds while this is true — the overview query's
   *  `waiting` (kastlan's `useBillingOverview({ waiting })`, a `refetchInterval` inside) —
   *  so the page follows the provider. Needs no overview data: pass it to the query. */
  waiting: boolean;
  /**
   * The row as read now (the overview's `cancel_at_period_end`; `undefined` while it
   * loads) → what the page shows. Call it during render, after the query: when the row
   * has moved past what was asked, it drops the request (React's "adjust state while
   * rendering" pattern), so `waiting` turns false and the query stops polling.
   */
  view: (rowScheduled: boolean | null | undefined) => CancelRequestView;
}

/**
 * The in-app cancel's follow-up (0.43, kastlan's derivation in `18bf4c0`): after "Cancel
 * subscription now" or "Keep subscription" the server answers 204 at once, but the row's
 * `cancel_at_period_end` only changes when the provider's webhook lands. Until then the
 * page shows what was asked for, and a second press would ask the provider again.
 *
 * The state lives in the hook and needs no overview at construction, so it goes BEFORE
 * the overview query, which reads `waiting`, and the view comes after it — the overview
 * read once (build review 0.43, kastlan B2; kastlan `subscription-section.tsx:74-92`):
 *
 *     const request = useCancelRequest();
 *     const { data } = useBillingOverview({ waiting: request.waiting });
 *     const view = request.view(data?.cancel_at_period_end);
 *     <p>{standingLine({ ...data, cancel_at_period_end: view.cancelScheduled })}</p>
 *     <SubscriptionActions
 *       cancelAtPeriodEnd={data.cancel_at_period_end}
 *       cancelRequested={view.requested}
 *       onResume={() => resume.mutate(undefined, { onSuccess: view.noteAsked })}
 *       …
 *     />
 */
export function useCancelRequest(): CancelRequest {
  // What was asked, kept with the row's state it was asked against.
  const [asked, setAsked] = useState<{ scheduled: boolean } | null>(null);
  const view = (row: boolean | null | undefined): CancelRequestView => {
    // Not read yet: nothing to show against, and nothing to drop.
    if (row === undefined || row === null) return { requested: null, cancelScheduled: false, noteAsked: () => {} };
    // The row has moved: it says the rest. Adjusted during render, React's pattern for
    // state that follows a prop.
    if (asked !== null && asked.scheduled !== row) setAsked(null);
    const open = asked !== null && asked.scheduled === row;
    return {
      requested: open ? (row ? "resume" : "cancel") : null,
      cancelScheduled: open ? !row : row,
      noteAsked: () => setAsked((a) => (a !== null && a.scheduled === row ? null : { scheduled: row })),
    };
  };
  return { waiting: asked !== null, view };
}
