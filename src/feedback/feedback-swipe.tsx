import { Ban, Check, ChevronsRight } from "lucide-react";
import type { SwipeAction } from "../components/swipeable-row";
import type { MobileSwipeActions } from "../components/data-table";
import { nextFeedbackStatus, type FeedbackStatus } from "./feedback-inbox";
import type { FeedbackStatusLabels } from "./feedback-labels";
import type { FeedbackStatusChange, FeedbackStatusRow } from "./feedback-status-undo";

/**
 * Swipes on the admin inbox's phone cards — §4.5 of the feedback contract, keksdose's
 * (`feedback-page.tsx:990`, feedback #144 rework item 4: *"it is a queue, and triaging it
 * one tap-into-the-row at a time is the slow way"*), for every app.
 *
 * - `advance` — one step along the chain (`nextFeedbackStatus`: OPEN → READY → IN_PROGRESS →
 *   IN_EVALUATION → DONE), labelled with the status it goes to;
 * - `done` — straight to DONE, for a row that plainly needs no stop on the way;
 * - `wont_do` — dismiss as WONT_DO.
 *
 * The same transitions the status column offers, so nothing is reachable by gesture that
 * is not reachable by tap. keksdose lets the user rebind them (Settings → Interaction,
 * feedback #404) and keeps that storage; kastlan and Kurvenschmiede take the default.
 */
export const FEEDBACK_SWIPE_ACTIONS = ["advance", "done", "wont_do"] as const;

/** One of {@link FEEDBACK_SWIPE_ACTIONS}. */
export type FeedbackSwipeAction = (typeof FEEDBACK_SWIPE_ACTIONS)[number];

/**
 * Which swipe does what — the same shape as 0.26's `TranslationReviewSwipeBinding`: per
 * LOGICAL side an ordered ladder, index 0 at the first threshold, index 1 at the longer
 * drag. `end` is a drag toward the reading end (right in a left-to-right page), `start`
 * the other way. keksdose stores PHYSICAL `right` / `left` ladders and hands
 * `{ end: right, start: left }`, as its translations page does
 * (`translations-page.tsx:280`).
 *
 * The ids are typed loosely on purpose: a stored binding carries keksdose's `"none"`
 * fillers and may carry an id from another version or another surface — they are
 * dropped (see {@link feedbackSwipePlan}), so it is passed in without a cast.
 */
export interface FeedbackSwipeBinding {
  /** A drag toward the reading START, nearest threshold first. */
  start?: readonly (FeedbackSwipeAction | (string & {}))[];
  /** A drag toward the reading END, nearest threshold first. */
  end?: readonly (FeedbackSwipeAction | (string & {}))[];
}

/** keksdose's shipped binding (`swipe-prefs-store.ts:99`): toward the end advance, then
 *  done on the longer drag; toward the start won't do. A settings page's reset goes here. */
export const DEFAULT_FEEDBACK_SWIPE: FeedbackSwipeBinding = Object.freeze({
  start: Object.freeze(["wont_do"] as const),
  end: Object.freeze(["advance", "done"] as const),
});

export interface FeedbackSwipeOptions {
  /** What a swipe commits through: the undoable change from `useFeedbackStatusUndo`, the
   *  same one the status cell and the detail's pills use — so a swipe gets the same 8 s
   *  "Set to …" toast with Undo as a tap (§4.5, §7.10, Marcel 2026-10-04; keksdose's
   *  `changeStatusUndoably` on its swipes too). A swipe is the easiest status change to
   *  make by accident. The plan calls it and nothing else, so the page owns the PATCH. */
  change: FeedbackStatusChange;
  /** The status names the panels show — `useFeedbackStatusLabels()`. The `done` panel
   *  reads DONE's, `wont_do` WONT_DO's, `advance` the next status's. */
  labels: FeedbackStatusLabels;
}

/** Where an action takes a row, or null when it would do nothing from there. */
function targetOf(id: string, status: FeedbackStatus): FeedbackStatus | null {
  switch (id) {
    case "advance":
      // Null at the chain's end (DONE) and off it (NEEDS_LIVE_TEST, POSTPONED, WONT_DO):
      // "advance" has no meaning there, and a threshold that commits nothing is a trap.
      return nextFeedbackStatus(status);
    case "done":
      return status === "DONE" ? null : "DONE";
    case "wont_do":
      return status === "WONT_DO" ? null : "WONT_DO";
    default:
      // "none", or an id this version does not know: an empty slot.
      return null;
  }
}

/** One action's panel. Each fill carries its text colour (0.26): the fills turn pastel
 *  in dark mode, where SwipeableRow's default white text was unreadable. `--info` has no
 *  contrast token, so `advance` writes in the surface colour — white on sky in light
 *  mode, the dark page on the pale sky in dark (the translation list's reset does the
 *  same on its grey). */
function panel(
  id: FeedbackSwipeAction,
  target: FeedbackStatus,
  row: FeedbackStatusRow,
  { change, labels }: FeedbackSwipeOptions,
): SwipeAction {
  const onCommit = () => change(row, target);
  switch (id) {
    case "advance":
      return {
        onCommit,
        label: labels[target],
        icon: <ChevronsRight className="size-4" aria-hidden />,
        className: "bg-[var(--info)] text-[var(--info-contrast)]",
        armedClassName: "bg-[var(--info)] text-[var(--info-contrast)]",
      };
    case "done":
      return {
        onCommit,
        label: labels.DONE,
        icon: <Check className="size-4" aria-hidden />,
        className: "bg-[var(--success)] text-[var(--success-contrast)]",
        armedClassName: "bg-[var(--success)] text-[var(--success-contrast)]",
      };
    case "wont_do":
      return {
        onCommit,
        label: labels.WONT_DO,
        icon: <Ban className="size-4" aria-hidden />,
        className: "bg-[var(--danger)] text-[var(--danger-contrast)]",
        armedClassName: "bg-[var(--danger-hover)] text-[var(--danger-contrast)]",
      };
  }
}

/**
 * The binding resolved against one row — what DataTable's `mobileSwipeActions` returns
 * for it, or `null` when the row offers no swipe at all:
 *
 * ```tsx
 * const changeStatus = useFeedbackStatusUndo(update.mutate);
 * const statusLabels = useFeedbackStatusLabels();
 * <DataTable
 *   mobileSwipeActions={isAdmin && !mine
 *     ? (row) => feedbackSwipePlan(DEFAULT_FEEDBACK_SWIPE, row, { change: changeStatus, labels: statusLabels })
 *     : undefined}
 * />
 * ```
 *
 * Modelled on 0.26's `translationReviewSwipePlan` (keksdose's `resolveSwipePlan`): an
 * action the row cannot take DROPS OUT and the ladder closes up behind it, so the second
 * stage becomes the first instead of the side going dead behind an unreachable stage:
 *
 * - `advance` on DONE and off the chain (NEEDS_LIVE_TEST, POSTPONED, WONT_DO);
 * - `done` on DONE, `wont_do` on WONT_DO;
 * - `"none"` and any id this version does not know;
 * - a later stage that lands where an earlier one on the same side already does — the id
 *   named twice, or `done` behind `advance` on IN_EVALUATION (both go to DONE): a longer
 *   drag to the same effect would arm a threshold that adds nothing.
 *
 * Only what the ROW decides. Whether the page may write at all — the admin inbox, not
 * `/my-feedback`; no write lock — is the caller's, by passing no `mobileSwipeActions`.
 */
export function feedbackSwipePlan(
  binding: FeedbackSwipeBinding,
  row: FeedbackStatusRow,
  options: FeedbackSwipeOptions,
): MobileSwipeActions | null {
  const side = (ids: FeedbackSwipeBinding["start"]): SwipeAction[] => {
    const reached = new Set<FeedbackStatus>();
    const out: SwipeAction[] = [];
    for (const id of ids ?? []) {
      const target = targetOf(id, row.status);
      if (target === null || reached.has(target)) continue;
      reached.add(target);
      out.push(panel(id as FeedbackSwipeAction, target, row, options));
    }
    return out;
  };
  const start = side(binding.start);
  const end = side(binding.end);
  if (start.length === 0 && end.length === 0) return null;
  return { start, end };
}
