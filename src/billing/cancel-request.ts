import { useCallback, useState } from "react";

/**
 * What the payer asked for in the app (0.43, kastlan `18bf4c0`): `"cancel"` after
 * `POST /billing/cancel` answered 204, `"resume"` after `POST /billing/resume` — while the
 * overview still shows the old `cancel_at_period_end`, until the provider's
 * `subscription.updated` has landed (§16.3). `null`: nothing asked, or the row has moved.
 */
export type CancelRequested = "cancel" | "resume" | null;

export interface CancelRequest {
  /** For `SubscriptionActions`' `cancelRequested`. */
  requested: CancelRequested;
  /** What the plan line says — the asked-for state until the row moves, then the row's:
   *  "Cancels on …" at once after a cancel, "Renews on …" after "Keep subscription". */
  cancelScheduled: boolean;
  /** Read the overview again every few seconds while this is true (a query's
   *  `refetchInterval`), so the page follows the provider. */
  waiting: boolean;
  /** Call on the 204 of a cancel or of a resume. A cancel and its undo both asked before
   *  the row moved cancel out. */
  noteAsked: () => void;
}

/**
 * The in-app cancel's follow-up (0.43, kastlan's derivation in `18bf4c0`): after "Cancel
 * subscription now" or "Keep subscription" the server answers 204 at once, but the row's
 * `cancel_at_period_end` only changes when the provider's webhook lands. Until then the
 * page shows what was asked for, and a second press would ask the provider again.
 *
 *     const request = useCancelRequest(data?.cancel_at_period_end ?? false);
 *     const overview = useBillingOverview({ refetchInterval: request.waiting ? 3000 : false });
 *     <p>{standingLine({ ...data, cancel_at_period_end: request.cancelScheduled })}</p>
 *     <SubscriptionActions
 *       cancelAtPeriodEnd={data.cancel_at_period_end}
 *       cancelRequested={request.requested}
 *       onResume={() => resume.mutate(undefined, { onSuccess: request.noteAsked })}
 *       …
 *     />
 *
 * `cancelAtPeriodEnd` is the overview's `cancel_at_period_end`, as read now.
 */
export function useCancelRequest(cancelAtPeriodEnd: boolean): CancelRequest {
  // What was asked, kept with the row's state it was asked against.
  const [asked, setAsked] = useState<{ scheduled: boolean } | null>(null);
  // The row has moved: it says the rest. Adjusted during render, React's pattern for
  // state that follows a prop.
  if (asked !== null && asked.scheduled !== cancelAtPeriodEnd) setAsked(null);
  const open = asked !== null && asked.scheduled === cancelAtPeriodEnd;
  const noteAsked = useCallback(
    () => setAsked((a) => (a !== null && a.scheduled === cancelAtPeriodEnd ? null : { scheduled: cancelAtPeriodEnd })),
    [cancelAtPeriodEnd],
  );
  return {
    requested: open ? (cancelAtPeriodEnd ? "resume" : "cancel") : null,
    cancelScheduled: open ? !cancelAtPeriodEnd : cancelAtPeriodEnd,
    waiting: open,
    noteAsked,
  };
}
