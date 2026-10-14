import { createContext } from "react";

/**
 * `true` inside `FeedbackRowDetail`'s Comments section (0.38.1, Kurvenschmiede): the
 * detail's own Replies section draws the report's replies already, so a
 * `FeedbackCommentThread` there draws the comments alone — whatever `replies` it was
 * handed. Internal: not re-exported.
 */
export const FeedbackRepliesDrawnAboveContext = createContext(false);
