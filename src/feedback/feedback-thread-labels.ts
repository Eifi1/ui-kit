// The English words of ./feedback-thread, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./feedback-thread re-exports them.

import type { ChatComposerLabels, FeedbackThreadLabels } from "./feedback-thread";

export const DEFAULT_FEEDBACK_THREAD_LABELS: FeedbackThreadLabels = {
  thread: "Comments",
  empty: "No comments yet",
  loading: "Loading comments…",
  you: "You",
  staff: "Staff",
  attachments: "Attachments",
};

export const DEFAULT_FEEDBACK_COMPOSER_LABELS: ChatComposerLabels = {
  field: "Write a comment",
  placeholder: "Write a comment…",
  send: "Send",
  sendHint: (modifier) => `${modifier} + Enter to send`,
  sendHintEnter: "Enter to send, Shift + Enter for a new line",
};
