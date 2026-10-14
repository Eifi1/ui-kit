import { useMemo } from "react";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import type { NotificationTypeEntry } from "./notification-types";
import {
  DEFAULT_FEEDBACK_NOTIFICATION_TYPES_LABELS,
  type FeedbackNotificationTypesLabels,
} from "./feedback-notification-types-labels";

export { DEFAULT_FEEDBACK_NOTIFICATION_TYPES_LABELS };
export type { FeedbackNotificationTypesLabels };

/** The two feedback notification ids (§9.11), as server-kit's `FEEDBACK_ANSWERED` and
 *  `FEEDBACK_COMMENT` name them. */
export type FeedbackNotificationTypeId = "feedback_answered" | "feedback_comment";

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
 * Both entries are always returned: the card draws a type only when the server answered
 * it (notifications §2.1), so kastlan, which does not declare `feedback_comment` while its
 * public parts are off, shows the first alone. Words: `<UiKitProvider labels={{
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
    ],
    [words],
  );
}
