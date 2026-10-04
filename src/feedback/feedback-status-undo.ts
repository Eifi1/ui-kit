import { useCallback } from "react";
import { toast } from "../components/toast";
import type { FeedbackStatus } from "./feedback-inbox";
import {
  useFeedbackStatusLabels,
  useFeedbackToastLabels,
  type FeedbackStatusLabels,
  type FeedbackToastLabels,
} from "./feedback-labels";
import type { FeedbackRecord } from "./feedback-record";

/**
 * A status change that can be taken back — §4.5 of the feedback contract, lifted from
 * keksdose's `changeStatusUndoably` (`frontend/src/features/feedback/feedback-page.tsx`,
 * dev #587: *"Just clicked somewhere and a feedback row disappeared without knowing what
 * I set as new status."*).
 *
 * An inbox is usually filtered by status, so a row whose new status falls outside the
 * filter leaves the table the moment the change lands, with nothing on screen saying what
 * it became. The toast says it, names the report, and offers the old status back for 8 s
 * (the window keksdose's transactions Undo uses, feedback #184). Undo PATCHes the old
 * status and confirms that too. kastlan and Kurvenschmiede had no Undo at all.
 */

/** The one PATCH a status change is: `PATCH /feedback/{id}` with `{ status }`. */
export interface FeedbackStatusPatch {
  id: number;
  status: FeedbackStatus;
}

/**
 * The page's status mutation. **TanStack Query's `mutate` fits as it stands** — pass
 * `updateMutation.mutate` (stable across renders), not `mutateAsync`. A hand-written
 * one sends the PATCH and calls `onSuccess` once it has landed, and only then.
 *
 * Failure is the mutation's own business: its `onError` toasts the server's `detail`,
 * else `feedbackToast.updateFailed` (§4.4) — this hook adds no second error toast.
 */
export type FeedbackStatusMutate = (
  patch: FeedbackStatusPatch,
  callbacks: { onSuccess: () => void },
) => void;

/** What the change needs to know about the row: which one, what it is called in the
 *  toast, and where it stood (the status Undo goes back to). */
export type FeedbackStatusRow = Pick<FeedbackRecord, "id" | "title" | "status">;

/** Set `row` to `status`, with the Undo toast. A no-op when it is already there. */
export type FeedbackStatusChange = (row: FeedbackStatusRow, status: FeedbackStatus) => void;

export interface FeedbackStatusUndoOptions {
  /** Over the `feedbackToast` namespace (the toast's words). */
  labels?: Partial<FeedbackToastLabels>;
  /** Over the `feedbackStatus` namespace (the status names inside them). */
  statusLabels?: Partial<FeedbackStatusLabels>;
}

/** How long the Undo stays reachable: 8 s, keksdose's window (feedback #184). */
export const FEEDBACK_UNDO_DURATION = 8000;

/**
 * The undoable status change — for the table's status cell, the row detail's pills and
 * the phone swipes alike (§4.5, §7.10: keksdose's swipe commits bypassed Undo, the kit's
 * do not). Wire every one of them through the function this returns:
 *
 * ```tsx
 * const update = useMutation({ mutationFn: api.updateFeedback, onError: … });
 * const changeStatus = useFeedbackStatusUndo(update.mutate);
 * <FeedbackStatusTransitions … onPick={(status) => changeStatus(row, status)} />
 * ```
 *
 * Give it the PAGE's mutation, not one a row owns: TanStack only calls per-call
 * callbacks while the observer that started the mutation is mounted, and a row the new
 * status filters out unmounts before the PATCH answers — the toast would never come.
 *
 * The flow: PATCH `{ id, status }` → on success a success toast
 * `statusChanged(newName, title)` with the action `statusUndo`, 8 s → Undo PATCHes
 * `{ id, status: previous }` → on success `statusRestored(previousName, title)`.
 */
export function useFeedbackStatusUndo(
  mutate: FeedbackStatusMutate,
  { labels, statusLabels }: FeedbackStatusUndoOptions = {},
): FeedbackStatusChange {
  const words = useFeedbackToastLabels(labels);
  const names = useFeedbackStatusLabels(statusLabels);
  return useCallback<FeedbackStatusChange>(
    (row, status) => {
      const { id, title, status: previous } = row;
      if (status === previous) return;
      const nameOf = (value: FeedbackStatus) => names[value] ?? value;
      mutate(
        { id, status },
        {
          onSuccess: () => {
            toast.undo(words.statusChanged(nameOf(status), title), {
              label: words.statusUndo,
              duration: FEEDBACK_UNDO_DURATION,
              onUndo: () =>
                mutate(
                  { id, status: previous },
                  { onSuccess: () => void toast.success(words.statusRestored(nameOf(previous), title)) },
                ),
            });
          },
        },
      );
    },
    [mutate, words, names],
  );
}
