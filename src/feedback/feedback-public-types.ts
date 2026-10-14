import type { FeedbackCategory, FeedbackStatus } from "./feedback-vocabulary";

/**
 * The shapes of round 0.38's public feedback (docs/feedback-harmonization.md §9): the
 * admin's replies as a list (§9.7), other people's comments as rows (§9.8), the upvote
 * (§9.6) and the two public views of a report (§9.3). Types only: what the server
 * answers, as the three apps' clients receive it.
 *
 * A name is always the server's (§9.5): `author_name` is a first name for others, the
 * full name for an admin, and `null` when there is none to show (an erased or incomplete
 * account, a loop's reply). The client never builds one from an id.
 */

/** One answer of the admin's — `FeedbackReplyResponse`, §9.7. Oldest first. */
export interface FeedbackReply {
  id: number;
  /** `null`: a loop's reply, a migrated `outcome`, or an erased admin — drawn as the
   *  app's word for its admin ("Admin"). */
  author_name: string | null;
  body: string;
  /** The status this reply moved the report to; `null` = no status change. */
  status_to: FeedbackStatus | null;
  /** Where it moved from — the admin view only. */
  status_from?: FeedbackStatus | null;
  /** ISO 8601. */
  created_at: string;
}

/** One comment by someone who reads the report — `FeedbackCommentResponse`, §9.8. */
export interface FeedbackComment {
  id: number;
  /** First name for others, the full name for an admin; `null` → "A user". */
  author_name: string | null;
  /** The viewer wrote it (they may delete it). */
  mine: boolean;
  /** keksdose's migrated rows whose writer was an admin (K2): drawn as a staff post. */
  staff: boolean;
  /** `null` when hidden, but for its writer and an admin. */
  body: string | null;
  hidden: boolean;
  /** ISO 8601. */
  created_at: string;
}

/** What `PUT` / `DELETE /feedback/{id}/vote` answer — `FeedbackVoteResponse`, §9.6. */
export interface FeedbackVoteState {
  votes: number;
  voted: boolean;
}

/** The public list's server-side sort (§9.6): newest first (default), most votes (then
 *  newest), or most recently updated. */
export type FeedbackPublicSort = "newest" | "votes" | "updated";

/** One row of `GET /feedback/public` — `FeedbackPublicListItem`, §9.3, §9.9: titles
 *  only, no body, no files, no account. */
export interface FeedbackPublicListItem extends FeedbackVoteState {
  id: number;
  title: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  /** First name, or `null` → "A user". */
  author_name: string | null;
  /** The viewer filed it. */
  mine: boolean;
  /** Visible comments. */
  comment_count: number;
  /** ISO 8601. */
  created_at: string;
  /** ISO 8601. */
  updated_at: string;
  /** ISO 8601, or `null`. */
  resolved_at: string | null;
}

/** `GET /feedback/public/{id}` — `FeedbackPublicResponse`, §9.3: the list row plus the
 *  public body (every attachment URL stripped by the server, §9.4) and the replies. The
 *  comments are fetched beside it (`GET /feedback/{id}/comments`). */
export interface FeedbackPublicRecord extends FeedbackPublicListItem {
  body: string;
  replies: FeedbackReply[];
}
