import type { ReviewStatus } from "../lib/translation-review";

/**
 * The `translationReview` namespace: every word of the translation-review parts
 * (`ReviewStatusChip`, `TranslationProgress`, `TranslationLocaleTabs`,
 * `TranslationExportButton`, `TranslationReviewEditor`, `TranslationReviewPanel`).
 *
 * Its own module, like `data-table-labels.ts`: `kit-labels.tsx` and `defaults.ts` import
 * it, and neither has to load the components to get the words. The English is keksdose's
 * and kastlan's own (`translation_review.*`, `translations:*`), British.
 */
export interface TranslationReviewLabels {
  /** The five statuses — the chip, the filter, the progress legend. */
  statusMissing: string;
  statusUnreviewed: string;
  statusChanged: string;
  statusNeedsChange: string;
  statusApproved: string;
  /** Accessible name of the status filter. */
  statusFilter: string;
  /** The status filter's first option. */
  all: string;
  /** A status filter option with its count: "Unreviewed · 12". */
  filterCount: (label: string, count: number) => string;
  /** The source filter's label — shown only when the rows come from several sources
   *  (kastlan's screen texts and documents). */
  source: string;
  allSources: string;
  /** The namespace filter's label and its "every one" option. */
  namespace: string;
  allNamespaces: string;
  search: string;
  /** The placeholder filter, with how many rows it would show. */
  placeholdersOnly: (count: number) => string;
  /** The chip on a row whose placeholders differ from the reference's. */
  placeholderChip: string;
  /** The key column, and the key's caption in the editor. */
  key: string;
  statusColumn: string;
  /** No row matches the filters. */
  empty: string;
  /** In place of the text of a string the locale lacks. */
  missingText: string;
  /** The progress bar's label. */
  progress: (approved: number, total: number) => string;
  /** A locale tab's badge. */
  localeProgress: (approved: number, total: number) => string;
  /** Accessible name of the locale tabs. */
  locales: string;
  approve: string;
  /** Send a string back: "Needs a change". */
  flag: string;
  /** "Needs a change" for a MISSING string: the suggestion is the translation to add. */
  suggest: string;
  /** Clear a verdict: back to unreviewed. */
  reset: string;
  /** The editor's way out without saving. */
  cancel: string;
  approveSelected: string;
  resetSelected: string;
  /** Selects every row the filters show — the phone's way into the bulk actions, where
   *  the table has no checkboxes. */
  selectShown: string;
  /** Over the old wording of a row that changed since its verdict. */
  changedSince: string;
  reviewedWording: string;
  reviewedReference: string;
  /** The placeholders differ: the reference's and the text's, each a list. */
  placeholderMismatch: (reference: string, text: string) => string;
  lastApproved: (name: string, date: string) => string;
  lastFlagged: (name: string, date: string) => string;
  /** The reviewer's name once the account is gone — what `name` above becomes. */
  erasedReviewer: string;
  /** The editor's wording field, opened on the current text. */
  suggestion: string;
  /** The same field for a missing string. */
  translation: string;
  note: string;
  notePlaceholder: string;
  /** The viewer may read this locale but not review it. */
  readOnly: string;
  /** The reviewer is limited to some areas — `areas` is their names, joined. */
  scope: (areas: string) => string;
  exportCorrections: (count: number) => string;
  /** A callback rejected and no `formatError` says better. */
  failed: string;
  /** 0.25: the Undo toast after an approval (`undo`) — one string, or a batch of them. */
  approvedToast: (count: number) => string;
  /** 0.25: a group's header under `groupBy` — how many of its rows nobody has read yet,
   *  of how many the filters show in it. */
  groupCount: (unreviewed: number, total: number) => string;
  /** 0.25: a group's bulk action — approve its unreviewed rows. */
  approveGroup: (count: number) => string;
  /** 0.25: asked first when a group's bulk approve is larger than a page — more than the
   *  reviewer can have had on screen. `group` is the group's name. */
  confirmGroup: (count: number, group: string) => string;
  /** The Undo toast after a swipe bound to `clear` took a verdict back (keksdose, live
   *  #377 rework: the swipes bound in its settings) — one string, or a batch of them.
   *  The swipe itself is named by {@link reset}. */
  clearedToast: (count: number) => string;
}

export const DEFAULT_TRANSLATION_REVIEW_LABELS: TranslationReviewLabels = {
  statusMissing: "Missing",
  statusUnreviewed: "Unreviewed",
  statusChanged: "Changed since review",
  statusNeedsChange: "Needs a change",
  statusApproved: "Approved",
  statusFilter: "Status",
  all: "All",
  filterCount: (label, count) => `${label} · ${count}`,
  source: "Texts",
  allSources: "All texts",
  namespace: "Area",
  allNamespaces: "All areas",
  search: "Search keys and text",
  placeholdersOnly: (count) => `Only placeholder problems (${count})`,
  placeholderChip: "Placeholders",
  key: "Key",
  statusColumn: "Status",
  empty: "No strings match these filters.",
  missingText: "Missing in this language",
  progress: (approved, total) => `${approved} of ${total} approved`,
  localeProgress: (approved, total) => `${approved}/${total}`,
  locales: "Languages",
  approve: "Approve",
  flag: "Needs a change",
  suggest: "Suggest translation",
  reset: "Mark unreviewed",
  cancel: "Cancel",
  approveSelected: "Approve selected",
  resetSelected: "Mark selected unreviewed",
  selectShown: "Select all shown",
  changedSince: "This string changed after it was reviewed. Please read it again.",
  reviewedWording: "Wording when reviewed",
  reviewedReference: "Reference when reviewed",
  placeholderMismatch: (reference, text) =>
    `The placeholders differ from the reference — reference: ${reference}; this text: ${text}. The app fills these in, so they must stay exactly as they are.`,
  lastApproved: (name, date) => `Approved by ${name} on ${date}`,
  lastFlagged: (name, date) => `Marked as needing a change by ${name} on ${date}`,
  erasedReviewer: "a deleted account",
  suggestion: "Better wording",
  translation: "Translation",
  note: "Note (optional)",
  notePlaceholder: "What is wrong, or what to keep in mind",
  readOnly: "You can read this language but not review it.",
  scope: (areas) => `Your review is limited to: ${areas}.`,
  exportCorrections: (count) => `Export corrections (${count})`,
  failed: "That did not work. Please try again.",
  approvedToast: (count) => (count === 1 ? "String approved" : `${count} strings approved`),
  groupCount: (unreviewed, total) => `${unreviewed} unreviewed / ${total}`,
  approveGroup: (count) => `Approve unreviewed (${count})`,
  confirmGroup: (count, group) =>
    count === 1
      ? `Approve the unreviewed string in ${group}?`
      : `Approve all ${count} unreviewed strings in ${group}, including those not on screen?`,
  clearedToast: (count) => (count === 1 ? "String marked unreviewed" : `${count} strings marked unreviewed`),
};

/** A status's word, from the namespace's five. */
export function reviewStatusLabel(labels: TranslationReviewLabels, status: ReviewStatus): string {
  switch (status) {
    case "missing":
      return labels.statusMissing;
    case "unreviewed":
      return labels.statusUnreviewed;
    case "changed":
      return labels.statusChanged;
    case "needs_change":
      return labels.statusNeedsChange;
    case "approved":
      return labels.statusApproved;
  }
}
