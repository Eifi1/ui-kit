// The English words of `useFeedbackNotificationTypes` (round 0.38), in a module with no
// component code, as every `*-labels.ts`: the English catalogue imports them alone.

/**
 * `feedbackNotificationTypes` — the setting words of the two feedback notification types
 * (docs/feedback-harmonization.md §9.11). In the kit, not in each app, because two apps
 * declare them (keksdose, Kurvenschmiede; kastlan `feedback_answered` alone). The mail and
 * push texts stay the app's.
 */
export interface FeedbackNotificationTypesLabels {
  /** `feedback_answered`: a reply on a report the person wrote or commented on. */
  answered: string;
  answeredDescription: string;
  /** `feedback_comment`: a visible comment on such a report. */
  comment: string;
  commentDescription: string;
}

export const DEFAULT_FEEDBACK_NOTIFICATION_TYPES_LABELS: FeedbackNotificationTypesLabels = {
  answered: "Answers to your reports",
  answeredDescription: "When a report you wrote or commented on gets an answer.",
  comment: "Comments on reports you follow",
  commentDescription: "When someone comments on a report you wrote or commented on.",
};
