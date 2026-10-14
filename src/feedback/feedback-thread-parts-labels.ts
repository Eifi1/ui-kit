// The English words of round 0.38's thread parts — ./feedback-vote-button,
// ./feedback-comment-thread and ./feedback-replies — in a module with no component code:
// the English catalogue (src/i18n/defaults.ts) imports them without the components, so
// `en` loads as one chunk like the other languages (0.34, KS U8). Each component module
// re-exports its own.

import type { FeedbackCommentsLabels } from "./feedback-comment-thread";
import type { FeedbackRepliesLabels } from "./feedback-replies";
import type { FeedbackVoteLabels } from "./feedback-vote-button";

export const DEFAULT_FEEDBACK_VOTE_LABELS: FeedbackVoteLabels = {
  vote: "I want this too",
  own: "Your report",
};

export const DEFAULT_FEEDBACK_REPLIES_LABELS: FeedbackRepliesLabels = {
  replies: "Replies",
  empty: "No reply yet",
  admin: "Admin",
  statusChanged: "Status changed to",
  field: "Write a reply",
  placeholder: "Write a reply…",
  reply: "Reply",
  status: "Status with the reply",
  noChange: "No change",
  nudge: "The author has not been told. Add a reply.",
};

export const DEFAULT_FEEDBACK_COMMENTS_LABELS: FeedbackCommentsLabels = {
  comments: "Comments",
  empty: "No comments yet",
  hidden: "Hidden by an admin",
  hide: "Hide",
  unhide: "Unhide",
  delete: "Delete",
  deleteTitle: "Delete this comment?",
  deleteBody: "It is removed for everyone. This cannot be undone.",
  field: "Write a comment",
  placeholder: "Write a comment…",
  send: "Comment",
};
