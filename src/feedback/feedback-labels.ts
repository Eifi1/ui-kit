import { useKitLabels } from "../i18n/kit-labels";
import type { FeedbackCategory, FeedbackStatus } from "./feedback-inbox";

/**
 * The words of a report's status and category, and the toasts a feedback page shows —
 * three `<UiKitProvider labels>` namespaces (0.27.0).
 *
 * Until 0.27 every app kept its own map from the enum to a translation key (keksdose
 * `STATUS_LABEL` and `categoryLabelKey`, "the package has no translations"), and the
 * three German maps had drifted apart: Kurvenschmiede said "In Arbeit", "In Prüfung",
 * "Test auf der Live-Umgebung" where keksdose and kastlan said "In Bearbeitung",
 * "Zur Prüfung", "Live testen". Marcel's feedback round (2026-10-04,
 * docs/feedback-harmonization.md §2.4) made keksdose's wording the canon and the kit its
 * owner, in all seven languages. The English defaults below are keksdose's
 * `frontend/src/shared/i18n/locales/en.json` (`feedback.*`); the de-CH canon for the
 * catalogues is noted on each key (keksdose `de-CH.json` — ss, never ß).
 *
 * `FeedbackStatusBadge`, `FeedbackCategoryBadge` and `FeedbackStatusTransitions` read
 * the first two by default, so an app drops its own maps; a `label` passed to them still
 * wins.
 */

/**
 * `feedbackStatus` — one word per status, keyed by the enum value so
 * `labels[row.status]` is the whole lookup.
 *
 * de-CH canon: OPEN "Offen" · IN_PROGRESS "In Bearbeitung" · IN_EVALUATION "Zur Prüfung"
 * · NEEDS_LIVE_TEST "Live testen" · POSTPONED "Zurückgestellt" · DONE "Erledigt" ·
 * WONT_DO "Wird nicht umgesetzt".
 */
export type FeedbackStatusLabels = Record<FeedbackStatus, string>;

export const DEFAULT_FEEDBACK_STATUS_LABELS: FeedbackStatusLabels = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  IN_EVALUATION: "In evaluation",
  NEEDS_LIVE_TEST: "Test when live",
  POSTPONED: "Postponed",
  DONE: "Done",
  WONT_DO: "Won't do",
};

/**
 * `feedbackCategory` — one word per category, keyed by the enum value. `CRASH` is never
 * pickable, but it is shown: on the badge, in the filter, in a row's detail.
 *
 * de-CH canon: CRASH "Absturz" · BUG "Fehler" · IDEA "Idee" · QUESTION "Frage" ·
 * OTHER "Sonstiges".
 */
export type FeedbackCategoryLabels = Record<FeedbackCategory, string>;

export const DEFAULT_FEEDBACK_CATEGORY_LABELS: FeedbackCategoryLabels = {
  CRASH: "Crash",
  BUG: "Bug",
  IDEA: "Idea",
  QUESTION: "Question",
  OTHER: "Other",
};

/**
 * `feedbackToast` — what the submit dialog, a failed save and a status change say in a
 * toast (§4.2, §4.4, §4.5 of the contract). A server's `detail` sentence, when it sent
 * one, wins over `submitFailed` and `updateFailed` (§3.7); that choice is the caller's.
 */
export interface FeedbackToastLabels {
  /** A report was filed. de-CH: "Danke für Ihr Feedback!" */
  submitted: string;
  /** `POST /feedback` failed with no `detail` of its own.
   *  de-CH: "Feedback konnte nicht gesendet werden" */
  submitFailed: string;
  /** A picked file is not an image, a PDF or a text file (§3.5).
   *  de-CH: "Nur Bilder, PDF- oder Textdateien sind erlaubt" */
  attachmentUnsupported: string;
  /** A picked file is over the 10 MB the contract allows (§3.5).
   *  de-CH: "Datei ist grösser als 10 MB" */
  attachmentTooLarge: string;
  /** More files were picked than fit; `count` is how many fit.
   *  de-CH: "Es passen nur {{count}} Anhänge – die übrigen wurden weggelassen." */
  attachmentTooMany: (count: number) => string;
  /** The screenshot capture failed (or its optional peer is not installed).
   *  de-CH: "Screenshot konnte nicht aufgenommen werden" */
  captureFailed: string;
  /** A `PATCH /feedback/{id}` failed with no `detail` of its own (§4.4).
   *  de-CH: "Änderung konnte nicht gespeichert werden." */
  updateFailed: string;
  /** A status change landed — the 8 s Undo toast (§4.5). `status` is the NEW status's
   *  label, `title` the report's title. de-CH: "Auf „{{status}}“ gesetzt: {{title}}" */
  statusChanged: (status: string, title: string) => string;
  /** That toast's action. de-CH: "Rückgängig" */
  statusUndo: string;
  /** The Undo landed — `status` is the RESTORED status's label.
   *  de-CH: "Zurück auf „{{status}}“: {{title}}" */
  statusRestored: (status: string, title: string) => string;
}

export const DEFAULT_FEEDBACK_TOAST_LABELS: FeedbackToastLabels = {
  submitted: "Thanks for the feedback!",
  submitFailed: "Could not submit feedback",
  attachmentUnsupported: "Only images, PDF or text files are allowed",
  attachmentTooLarge: "File is larger than 10 MB",
  attachmentTooMany: (count) =>
    count === 1
      ? "Only 1 attachment fits — the rest were left out."
      : `Only ${count} attachments fit — the rest were left out.`,
  captureFailed: "Could not capture a screenshot",
  updateFailed: "Could not save that change.",
  statusChanged: (status, title) => `Set to “${status}”: ${title}`,
  statusUndo: "Undo",
  statusRestored: (status, title) => `Back to “${status}”: ${title}`,
};

/** `feedbackStatus` resolved: English, then `<UiKitProvider labels>`, then `labels`. For
 *  the places that need a status's name outside the kit's own parts — a filter's options,
 *  `feedbackSwipePlan`'s panels, an app's overview tile. */
export function useFeedbackStatusLabels(labels?: Partial<FeedbackStatusLabels>): FeedbackStatusLabels {
  return useKitLabels("feedbackStatus", DEFAULT_FEEDBACK_STATUS_LABELS, labels);
}

/** `feedbackCategory` resolved: English, then the provider, then `labels`. */
export function useFeedbackCategoryLabels(labels?: Partial<FeedbackCategoryLabels>): FeedbackCategoryLabels {
  return useKitLabels("feedbackCategory", DEFAULT_FEEDBACK_CATEGORY_LABELS, labels);
}

/** `feedbackToast` resolved: English, then the provider, then `labels`. */
export function useFeedbackToastLabels(labels?: Partial<FeedbackToastLabels>): FeedbackToastLabels {
  return useKitLabels("feedbackToast", DEFAULT_FEEDBACK_TOAST_LABELS, labels);
}
