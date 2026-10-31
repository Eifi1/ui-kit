import { useEffect, useState } from "react";

/**
 * What the payer asked for in the app (0.43, kastlan `18bf4c0`): `"cancel"` after
 * `POST /billing/cancel` answered 204, `"resume"` after `POST /billing/resume` — while the
 * overview still shows the old `cancel_at_period_end`, until the provider's
 * `subscription.updated` has landed (§16.3). `null`: nothing asked, or the row has moved.
 */
export type CancelRequested = "cancel" | "resume" | null;

/** How long a request waits for the provider's webhook: `useCheckoutProcessing`'s bound. */
const WAIT_FOR = 10 * 60_000;

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
   *  so the page follows the provider. Needs no overview data: pass it to the query.
   *  False again after `timeoutMs` with no move of the row. */
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
 *
 * **Bounded,** as `useCheckoutProcessing` is (FLW-6): after `timeoutMs` (10 minutes)
 * with no move of the row the request is dropped — the polling stops and the page shows
 * the row as it is. Unbounded, a webhook that never landed kept kastlan re-reading the
 * overview every 3 s for as long as the page was open, which also kept a Cloud Run
 * instance awake, and the plan line said "Cancels on …" for a row that never moved.
 */
export function useCancelRequest({ timeoutMs = WAIT_FOR }: { timeoutMs?: number } = {}): CancelRequest {
  // What was asked, kept with the row's state it was asked against and when.
  const [asked, setAsked] = useState<{ scheduled: boolean; at: number } | null>(null);
  useEffect(() => {
    if (asked === null) return;
    // Only THIS ask: one that a later ask or the row has replaced is not dropped twice.
    const timer = setTimeout(
      () => setAsked((current) => (current === asked ? null : current)),
      Math.max(0, asked.at + timeoutMs - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [asked, timeoutMs]);
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
      noteAsked: () => {
        const at = Date.now();
        setAsked((a) => (a !== null && a.scheduled === row ? null : { scheduled: row, at }));
      },
    };
  };
  return { waiting: asked !== null, view };
}
