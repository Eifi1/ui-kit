import { useMemo } from "react";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import type { NotificationTypeEntry } from "./notification-types";
import {
  DEFAULT_FEEDBACK_NOTIFICATION_TYPES_LABELS,
  type FeedbackNotificationTypesLabels,
} from "./feedback-notification-types-labels";

export { DEFAULT_FEEDBACK_NOTIFICATION_TYPES_LABELS };
export type { FeedbackNotificationTypesLabels };

/** The feedback notification ids (§9.11, §11), as server-kit's `FEEDBACK_ANSWERED`,
 *  `FEEDBACK_COMMENT` and `FEEDBACK_RECEIVED` (0.46: an admin's alert) name them. */
export type FeedbackNotificationTypeId = "feedback_answered" | "feedback_comment" | "feedback_received";

/**
 * The setting words of the two feedback notification types (round 0.38,
 * docs/feedback-harmonization.md §9.11), for `NotificationTypesSetting`'s `types`:
 *
 * ```tsx
 * const feedbackTypes = useFeedbackNotificationTypes();
 * <NotificationTypesSetting types={[...appTypes, ...feedbackTypes]} … />
 * ```
 *
 * - **"Answers to your reports"** (`feedback_answered`): a reply from the admin or a
 *   loop, to the author and every earlier commenter.
 * - **"Comments on reports you follow"** (`feedback_comment`): a visible comment, to the
 *   author and the earlier commenters.
 *
 * - **"New feedback and reworks"** (`feedback_received`, 0.46, feedback §11): to the
 *   admins, when someone files a report or sends one back for rework. (A crash is mailed
 *   only inside the bundle where an app runs the queue, so the text names no crash.)
 *   `labels.adminGroup` ("Admin") is a heading an app may put over it.
 *
 * Every entry is always returned: the card draws a type only when the server answered
 * it (notifications §2.1), so kastlan, which does not declare `feedback_comment` while its
 * public parts are off, shows the first alone, and a person who is no admin is never
 * answered `feedback_received`. Words: `<UiKitProvider labels={{
 * feedbackNotificationTypes }}>` over English, `labels` over both.
 */
export function useFeedbackNotificationTypes(
  labels?: LabelOverride<FeedbackNotificationTypesLabels>,
): NotificationTypeEntry<FeedbackNotificationTypeId>[] {
  const words = useKitLabels("feedbackNotificationTypes", DEFAULT_FEEDBACK_NOTIFICATION_TYPES_LABELS, labels);
  return useMemo(
    () => [
      { id: "feedback_answered", label: words.answered, description: words.answeredDescription },
      { id: "feedback_comment", label: words.comment, description: words.commentDescription },
      { id: "feedback_received", label: words.received, description: words.receivedDescription },
    ],
    [words],
  );
}
