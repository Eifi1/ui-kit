// `@eifi1/ui-kit/feedback` — the report form and the parts an inbox is built from.
//
// A re-slicing of the main barrel, not a new API. The kit owns the status vocabulary,
// the transition policy and the look; each app still wires its own API, columns,
// strings and permissions — see the note at the top of feedback/feedback-inbox.tsx.
export * from "./feedback/feedback-attachment";
export * from "./feedback/feedback-dialog";
export * from "./feedback/feedback-inbox";
export * from "./feedback/feedback-thread";
// 0.27.0: the feedback harmonization (docs/feedback-harmonization.md) — one record,
// one menu, dialog, table, detail and crash reporter for keksdose, kastlan, Kurvenschmiede.
export * from "./feedback/feedback-record";
export * from "./feedback/feedback-labels";
export * from "./feedback/feedback-status-undo";
export * from "./feedback/feedback-swipe";
export * from "./feedback/feedback-menu";
export * from "./feedback/feedback-context";
export * from "./feedback/feedback-capture";
export * from "./feedback/feedback-submit";
export * from "./feedback/feedback-table";
export * from "./feedback/feedback-row-detail";
export * from "./feedback/feedback-crash";
// 0.38.0: the public pages (§9.15) — the "Visible to others" switch, the list every user
// reads and one report opened.
export * from "./feedback/feedback-public-switch";
export * from "./feedback/feedback-public-list";
// 0.38.0: public feedback (docs/feedback-harmonization.md §9) — the shapes, the vote, the
// comment thread, the replies' timeline and composer.
export * from "./feedback/feedback-public-types";
export * from "./feedback/feedback-vote-button";
export * from "./feedback/feedback-comment-thread";
export * from "./feedback/feedback-replies";
export * from "./feedback/feedback-entry-file";
// 0.52: the slice's share of the 55 names no app reads (refactor audit 2026-10-30, API-4,
// decision 4), tagged on their specifiers as the barrel's are — the modules keep them.
export {
  /** @deprecated 0.52 — `appendRework`, which writes the line (API-4); removed in 0.53 */
  feedbackAttachmentLine,
} from "./feedback/feedback-record";
export {
  /** @deprecated 0.52 — `useFeedbackStatusUndo`, which keeps its Undo that long (API-4); removed in 0.53 */
  FEEDBACK_UNDO_DURATION,
} from "./feedback/feedback-status-undo";
export {
  /** @deprecated 0.52 — `DEFAULT_FEEDBACK_SWIPE` and `feedbackSwipePlan`, which name the actions (API-4); removed in 0.53 */
  FEEDBACK_SWIPE_ACTIONS,
} from "./feedback/feedback-swipe";
export {
  /** @deprecated 0.52 — `useFeedbackColumns`, the same columns in the provider's words (API-4); removed in 0.53 */
  feedbackColumns,
  /** @deprecated 0.52 — `useFeedbackColumns`, whose submitter cell reads it (API-4); removed in 0.53 */
  feedbackSubmitter,
  /** @deprecated 0.52 — `useFeedbackColumns`, whose submitter cell reads it (API-4); removed in 0.53 */
  feedbackSubmitterEmail,
  /** @deprecated 0.52 — `useFeedbackColumns`, whose environment cell reads it (API-4); removed in 0.53 */
  feedbackEnvironment,
} from "./feedback/feedback-table";
export {
  /** @deprecated 0.52 — `FeedbackRowDetail`, which links the page itself (API-4); removed in 0.53 */
  feedbackPageUrl,
  /** @deprecated 0.52 — `FeedbackRowDetail` and the table's URL cell, which link only a page's path and keep one-shot pages as text (the 0.52 code review's guard, which an app has no helper for); removed in 0.53 */
  feedbackPageHref,
  /** @deprecated 0.52 — `FeedbackRowDetail` and the table's URL cell, which show the page themselves; removed in 0.53 */
  feedbackPagePath,
  /** @deprecated 0.52 — `FeedbackRowDetail`, which lists the attachments itself (API-4); removed in 0.53 */
  feedbackAttachmentUrls,
  /** @deprecated 0.52 — `FeedbackRowDetail`, which decides who may edit what (API-4); removed in 0.53 */
  feedbackRowAccess,
  /** @deprecated 0.52 — `FeedbackRowDetail`, which resolves its words itself (API-4); removed in 0.53 */
  useFeedbackDetailLabels,
} from "./feedback/feedback-row-detail";
export {
  /** @deprecated 0.52 — `FeedbackPublicSwitch`, which asks it (API-4); removed in 0.53 */
  feedbackPublicSwitchAllowed,
} from "./feedback/feedback-public-switch";
