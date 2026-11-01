import { useCallback } from "react";
import { toast } from "../components/toast";
import type { FeedbackStatus } from "./feedback-vocabulary";
import {
  useFeedbackStatusLabels,
  useFeedbackToastLabels,
  type FeedbackStatusLabels,
  type FeedbackToastLabels,
} from "./feedback-labels";
import type { FeedbackRecord } from "./feedback-record";
import type { LabelOverride } from "../i18n/kit-labels";
import { runMutation } from "./feedback-mutation";

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
 * The page's status mutation (0.52): **TanStack Query's `mutateAsync`** — pass
 * `update.mutateAsync`. The toast comes when the promise resolves, which it does for every
 * call (refactor audit 2026-10-30, FLW-3). A hand-written one returns a promise that
 * resolves once the PATCH has landed and rejects when it failed.
 *
 * Failure is the mutation's own business: its `onError` toasts the server's `detail`,
 * else `feedbackToast.updateFailed` (§4.4) — this hook adds no second error toast, and
 * catches the rejection.
 */
export type FeedbackStatusMutateAsync = (patch: FeedbackStatusPatch) => Promise<unknown>;

/** What the change needs to know about the row: which one, what it is called in the
 *  toast, and where it stood (the status Undo goes back to). */
export type FeedbackStatusRow = Pick<FeedbackRecord, "id" | "title" | "status">;

/** Set `row` to `status`, with the Undo toast. A no-op when it is already there. */
export type FeedbackStatusChange = (row: FeedbackStatusRow, status: FeedbackStatus) => void;

export interface FeedbackStatusUndoOptions {
  /** Over the `feedbackToast` namespace (the toast's words). */
  labels?: LabelOverride<FeedbackToastLabels>;
  /** Over the `feedbackStatus` namespace (the status names inside them). */
  statusLabels?: Partial<FeedbackStatusLabels>;
}

/** How long the Undo stays reachable: 8 s, keksdose's window (feedback #184). */
export const FEEDBACK_UNDO_DURATION = 8000;

/**
 * The undoable status change — for the table's status cell, the row detail's pills and
 * the phone swipes alike (§4.5, §7.10: swipes included, Marcel 2026-10-04 — keksdose's
 * swipe commits go through its `changeStatusUndoably` too). Wire every one of them
 * through the function this returns:
 *
 * ```tsx
 * const update = useMutation({ mutationFn: api.updateFeedback, onError: … });
 * const changeStatus = useFeedbackStatusUndo(update.mutateAsync);
 * <FeedbackStatusTransitions … onPick={(status) => changeStatus(row, status)} />
 * ```
 *
 * Give it the PAGE's mutation, not one a row owns: a row the new status filters out
 * unmounts before the PATCH answers.
 *
 * The flow: PATCH `{ id, status }` → once it has landed a success toast
 * `statusChanged(newName, title)` with the action `statusUndo`, 8 s → Undo PATCHes
 * `{ id, status: previous }` → once that has landed `statusRestored(previousName, title)`.
 * Each change waits for its OWN answer, so two changes in flight each get their toast.
 *
 * `update.mutate`, the callback form, went in 0.53 (deprecated in 0.52): with it a second
 * change before the first answered lost the first one's Undo.
 */
export function useFeedbackStatusUndo(
  mutate: FeedbackStatusMutateAsync,
  { labels, statusLabels }: FeedbackStatusUndoOptions = {},
): FeedbackStatusChange {
  const words = useFeedbackToastLabels(labels);
  const names = useFeedbackStatusLabels(statusLabels);
  return useCallback<FeedbackStatusChange>(
    (row, status) => {
      const { id, title, status: previous } = row;
      if (status === previous) return;
      const nameOf = (value: FeedbackStatus) => names[value] ?? value;
      runMutation(mutate, { id, status }, () => {
        toast.undo(words.statusChanged(nameOf(status), title), {
          label: words.statusUndo,
          duration: FEEDBACK_UNDO_DURATION,
          onUndo: () =>
            runMutation(mutate, { id, status: previous }, () => {
              toast.success(words.statusRestored(nameOf(previous), title));
            }),
        });
      });
    },
    [mutate, words, names],
  );
}
