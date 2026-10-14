// The English words of the public feedback pages (round 0.38, docs/feedback-harmonization.md
// §9.15) — `FeedbackPublicList`, `FeedbackPublicDetail` and `FeedbackPublicSwitch` — in a
// module with no component code: the English catalogue (src/i18n/defaults.ts) imports
// them without the components, as every `*-labels.ts` (0.34, KS U8).

/**
 * `feedbackPublic` — the words of the pages every user reads (§9.3, §9.9): the list's
 * sort, search and count, the detail's sections and the "Visible to others" switch. The
 * table's column names that the inbox already has (#, Date, Category, Subject, Status)
 * stay `feedbackPage`'s, so the two lists cannot disagree; the vote button's words are
 * `feedbackVote`'s, the thread's `feedbackComments`'.
 *
 * de-CH canon (§9.2, §9.5): `title` "Alle Rückmeldungen", `anonymous` "Eine Person".
 */
export interface FeedbackPublicLabels {
  /** The page's heading — keksdose's `/all-feedback`, the menu's "All feedback". */
  title: string;
  /** The sort toggle's accessible name. */
  sort: string;
  /** `sort=newest`, the server's default. */
  sortNewest: string;
  /** `sort=votes`: most votes, then newest. */
  sortVotes: string;
  /** `sort=updated`. */
  sortUpdated: string;
  /** The search box's accessible name: it searches titles only (§9.9). */
  search: string;
  /** The Votes column's header. */
  columnVotes: string;
  /** How many reports the server has for this query (`total`). */
  total: (count: number) => string;
  /** A row's visible comments, the chip beside its title. */
  comments: (count: number) => string;
  /** A row's votes, the count on a phone card (the button is in the opened report). */
  votes: (count: number) => string;
  /** A `null` name (§9.5): an incomplete or erased account. */
  anonymous: string;
  /** Who filed it, with the server's first name (or {@link anonymous}). */
  filedBy: (name: string) => string;
  /** The detail's public body section. */
  body: string;
  /** The detail's merged replies and comments (§9.8, "Order"). */
  conversation: string;
  /** While the list or the comments load. */
  loading: string;
  /** No public report (yet, or for this search). */
  empty: string;
  /** `FeedbackPublicSwitch`'s label (§9.3, decision 6). */
  visibleToOthers: string;
  /** The line under it: what others see, and what never. */
  visibleHint: string;
  /** Why the author cannot flip it now: the report is past its open window (§9.3). */
  visibleLocked: string;
  /** 0.38.1: the pager's "where am I" — `page` counts from 1. The server answers no
   *  total, so there is no "of N". */
  page: (page: number) => string;
}

export const DEFAULT_FEEDBACK_PUBLIC_LABELS: FeedbackPublicLabels = {
  title: "All feedback",
  sort: "Sort",
  sortNewest: "Newest",
  sortVotes: "Most wanted",
  sortUpdated: "Recently updated",
  search: "Search titles",
  columnVotes: "Votes",
  total: (count) => (count === 1 ? "1 report" : `${count} reports`),
  comments: (count) => (count === 1 ? "1 comment" : `${count} comments`),
  votes: (count) => (count === 1 ? "1 vote" : `${count} votes`),
  anonymous: "A user",
  filedBy: (name) => `From ${name}`,
  body: "Description",
  conversation: "Answers and comments",
  loading: "Loading…",
  empty: "No reports yet",
  visibleToOthers: "Visible to others",
  visibleHint: "Other users see the title and text, never your screenshots or files.",
  visibleLocked: "Only while the report is still open.",
  page: (page) => `Page ${page}`,
};
