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
//
// Named, not `*`, for six of its modules: 0.53 took the slice's share of the 55 names no app
// reads off the surface (deprecated in 0.52, refactor audit 2026-10-30, API-4) —
// `feedbackAttachmentLine`, `FEEDBACK_UNDO_DURATION`, `FEEDBACK_SWIPE_ACTIONS`,
// `feedbackColumns`, `feedbackSubmitter`, `feedbackSubmitterEmail`, `feedbackEnvironment`,
// `feedbackPagePath`, `feedbackAttachmentUrls`, `feedbackRowAccess`, `useFeedbackDetailLabels`
// and `feedbackPublicSwitchAllowed`, which their modules keep for the kit's own use.
// `feedbackPageHref` and `feedbackPageUrl` went whole: nothing read them.
// `FEEDBACK_SWIPE_ACTIONS` is back since 0.60.1: keksdose's swipe settings take the
// feedback list's ids from it, as they take `TRANSLATION_REVIEW_SWIPE_ACTIONS` (0.60 added
// `postpone`, and an app copy of the list would miss the next id).
export {
  DEFAULT_ATTACHMENT_ACCEPT,
  DEFAULT_MAX_ATTACHMENT_BYTES,
  DEFAULT_MAX_ATTACHMENTS,
  FEEDBACK_ATTACHMENT_ACCEPT,
  FEEDBACK_PICKABLE_CATEGORIES,
  FEEDBACK_REWORKABLE_STATUSES,
  FEEDBACK_QUEUE_STATUSES,
  FEEDBACK_AUTHOR_EDITABLE_STATUSES,
  FEEDBACK_AWAITING_STATUSES,
  FEEDBACK_DECIDED_STATUSES,
  FEEDBACK_COMMENT_MAX,
  FEEDBACK_REPLY_MAX,
  appendRework,
  reworkCount,
  feedbackReworkCount,
  splitBodyAttachments,
  splitDescription,
  replaceDescription,
  isImageAttachment,
  attachmentName,
  type FeedbackEnvironment,
  type FeedbackContext,
  type FeedbackRecord,
} from "./feedback/feedback-record";
export * from "./feedback/feedback-labels";
export {
  useFeedbackStatusUndo,
  type FeedbackStatusPatch,
  type FeedbackStatusMutateAsync,
  type FeedbackStatusRow,
  type FeedbackStatusChange,
  type FeedbackStatusUndoOptions,
} from "./feedback/feedback-status-undo";
export {
  DEFAULT_FEEDBACK_SWIPE,
  FEEDBACK_SWIPE_ACTIONS,
  feedbackSwipePlan,
  feedbackSwipeOmitShown,
  type FeedbackSwipeAction,
  type FeedbackSwipeBinding,
  type FeedbackSwipeOptions,
} from "./feedback/feedback-swipe";
export * from "./feedback/feedback-menu";
export * from "./feedback/feedback-context";
export * from "./feedback/feedback-capture";
export * from "./feedback/feedback-submit";
export {
  DEFAULT_FEEDBACK_PAGE_LABELS,
  useFeedbackPageLabels,
  isFeedbackAwaiting,
  useFeedbackRenderDate,
  FeedbackSubject,
  useFeedbackColumns,
  feedbackMobileGroupBy,
  FeedbackMobileCard,
  FeedbackAwaitingToggle,
  FeedbackEmptyState,
  type FeedbackPageLabels,
  type FeedbackTableRow,
  type FeedbackRenderDate,
  type FeedbackSubjectProps,
  type FeedbackColumnsOptions,
  type UseFeedbackColumnsOptions,
  type FeedbackMobileCardProps,
  type FeedbackAwaitingToggleProps,
  type FeedbackEmptyStateProps,
} from "./feedback/feedback-table";
export {
  DEFAULT_FEEDBACK_DETAIL_LABELS,
  FeedbackReworkSection,
  FeedbackRowDetail,
  type FeedbackDetailLabels,
  type FeedbackRowAccess,
  type FeedbackDetailPatch,
  type FeedbackDetailUpdateAsync,
  type FeedbackUpload,
  type FeedbackReworkSend,
  type FeedbackReworkSectionProps,
  type FeedbackRowDetailProps,
} from "./feedback/feedback-row-detail";
export * from "./feedback/feedback-crash";
// 0.61: which copy of the app a report and a crash come from, off the host (keksdose's
// rule; Kurvenschmiede read a build flag, which a deployment's production build defeats).
export { deployEnvironment, type DeployEnvironmentHosts } from "./feedback/deploy-environment";
// 0.38.0: the public pages (§9.15) — the "Visible to others" switch, the list every user
// reads and one report opened.
export {
  FeedbackPublicSwitch,
  type FeedbackPublicSwitchRow,
  type FeedbackPublicSwitchViewer,
  type FeedbackPublicSwitchProps,
} from "./feedback/feedback-public-switch";
export * from "./feedback/feedback-public-list";
// 0.38.0: public feedback (docs/feedback-harmonization.md §9) — the shapes, the vote, the
// comment thread, the replies' timeline and composer.
export * from "./feedback/feedback-public-types";
export * from "./feedback/feedback-vote-button";
export * from "./feedback/feedback-comment-thread";
export * from "./feedback/feedback-replies";
export * from "./feedback/feedback-entry-file";
// 0.55.0: the inbox assembled once (kastlan reuse audit 2026-11-02, proposal 2;
// docs/feedback-harmonization.md §13) — the wiring the three pages each wrote, as a hook
// and the component that draws it.
export {
  useFeedbackInbox,
  FeedbackInbox,
  type FeedbackInboxMutation,
  type FeedbackReplyPost,
  type FeedbackReworkPost,
  type UseFeedbackInboxOptions,
  type FeedbackInboxState,
  type FeedbackInboxProps,
  // 0.57 (keksdose dev #663): `inbox.bulk`, the admin's selection and bulk edit (§13.6).
  type FeedbackInboxBulk,
} from "./feedback/feedback-inbox-page";
// 0.61: the feedback pages' frame (Marcel 2026-11-12) — keksdose's padding and header
// around the inbox and the public page, which every app wrote itself. Named: the hook a
// kit page reads the frame's header with stays the kit's.
export {
  FeedbackPageFrame,
  type FeedbackPageFrameProps,
  type FeedbackPageFrameHeaderProps,
} from "./feedback/feedback-page-frame";
// 0.61: one report's comment thread through the app's API client — keksdose's
// `use-feedback-comments.ts` and Kurvenschmiede's `use-feedback-conversation.ts`, once
// (docs/feedback-harmonization.md §14.3).
export {
  useFeedbackComments,
  type FeedbackCommentsApi,
  type UseFeedbackCommentsOptions,
  type FeedbackCommentsState,
} from "./feedback/feedback-comments";
// 0.61: the public page, assembled once (Marcel 2026-11-12: Kurvenschmiede's feedback area
// as keksdose's; docs/feedback-harmonization.md §14) — the URL state the app's queries read,
// and the page drawn from their answers.
export {
  useFeedbackPublicPage,
  FeedbackPublicPage,
  type UseFeedbackPublicPageOptions,
  type FeedbackPublicRequest,
  type FeedbackPublicPageState,
  type FeedbackPublicRead,
  type FeedbackPublicApi,
  type FeedbackPublicPageProps,
} from "./feedback/feedback-public-page";
