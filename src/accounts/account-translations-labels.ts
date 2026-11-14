// The words of ./account-translation-review — their type and the English — in a module with no
// component code: the catalogues import them without the page, so neither the main barrel
// reaches react-query nor `en` loads the page (0.34, KS U8).

/** The `accountTranslations` namespace: the review page's own words. The panel's are
 *  `translationReview`'s, the refusals `accountFailure`'s. */
export interface AccountTranslationsLabels {
  /** The page's heading. */
  title: string;
  /** The line under it: what a reviewer does here, and what they do not. */
  description: string;
  /** A verdict saved that the panel did not toast itself (a flag, a suggestion). */
  saved: string;
  /** A verdict cleared that the panel did not toast itself. */
  cleared: string;
  /** The empty state for an account with no language to review. */
  noAccess: string;
  noAccessHint: string;
  /** The source filter's words: the app's own strings and the kit's. */
  sourceApp: string;
  sourceKit: string;
}

/** 0.64: the review page's words — Kurvenschmiede's `translations.*` keys, which every app had
 *  in its own catalogue. */
export const DEFAULT_ACCOUNT_TRANSLATIONS_LABELS: AccountTranslationsLabels = {
  title: "Review translations",
  description:
    "Read each text in your language beside the reference, and approve it or say what should change. Corrections are exported for a developer; the texts themselves do not change here.",
  saved: "Saved",
  cleared: "Marked unreviewed",
  noAccess: "No languages to review",
  noAccessHint: "An administrator grants the languages you review. Ask one if you expected some here.",
  sourceApp: "This app’s texts",
  sourceKit: "Shared components",
};
