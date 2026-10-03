import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useKitLabels } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { useKitFormat } from "../lib/format";
import { placeholderTokens, reviewWrite } from "../lib/translation-review";
import type {
  TranslationReviewKey,
  TranslationReviewWrite,
  TranslationRow,
  TranslationVerdict,
} from "../lib/translation-review";
import { AlertBanner } from "./alert-banner";
import { Caption, SectionLabel } from "./text";
import { DEFAULT_TRANSLATION_REVIEW_LABELS } from "./translation-review-labels";
import type { TranslationReviewLabels } from "./translation-review-labels";
import { Button, Textarea } from "./ui";

/** A callback may return a promise: resolve and the editor closes, reject and it stays
 *  open with the error. */
type MaybePromise = void | Promise<unknown>;

export interface TranslationReviewEditorProps {
  row: TranslationRow;
  /** The reference language's own name ("English", "Deutsch") — the app's choice of
   *  reference, so the app's word for it. */
  referenceLabel: ReactNode;
  /** The reviewed language's own name ("Français"). */
  localeLabel: ReactNode;
  /** Store a verdict. Left out (or `readOnly`): the editor shows the row and its last
   *  verdict, with no fields and no actions. */
  onSave?: (write: TranslationReviewWrite) => MaybePromise;
  /** Clear the verdict — back to unreviewed. Left out: no reset button. */
  onClear?: (key: TranslationReviewKey) => MaybePromise;
  /** The Cancel button — and called after a save or a reset resolves, so the panel
   *  that opened the editor closes it. */
  onClose?: () => void;
  /** Look, do not touch: a locale the viewer may read but not review. */
  readOnly?: boolean;
  /**
   * 0.25: put the cursor in the wording field when the editor opens, at the end of the
   * text. The panel sets it when a phone card is swiped toward "Needs a change" (keksdose
   * live #377): that swipe opens the editor to be written in, and a reviewer who has just
   * said "this is wrong" should not have to find the field first. Not for an editor
   * opened by a tap — that one may only be opened to read.
   */
  focusWording?: boolean;
  /** How the verdict's date reads. Default: the kit's `formatDate`, medium, in the
   *  provider's locale. */
  formatDate?: (iso: string) => string;
  /** Turns a rejection into words. Default {@link TranslationReviewLabels.failed}. */
  formatError?: (error: unknown) => ReactNode;
  className?: string;
  labels?: Partial<TranslationReviewLabels>;
}

/** The wording a verdict was given on, under the line that says it changed. */
function Then({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-1.5 min-w-0">
      <span className="text-xs font-medium">{label}</span>
      <p className="whitespace-pre-line break-words text-[var(--text-secondary)]">{text}</p>
    </div>
  );
}

/**
 * One string, opened: the reference beside the translation, what changed since the last
 * verdict, what a machine can see is wrong (the placeholders), and the two things a
 * reviewer can say about it — keksdose's and kastlan's `translation-review-editor.tsx`.
 *
 * "Better wording" opens on the CURRENT text rather than empty, because the usual
 * correction is a word or an ending, and retyping a sentence to change one word is how
 * new mistakes get in. It is sent only with "Needs a change" — approving says the text is
 * fine as it stands. A "Needs a change" with neither a note nor a different wording tells
 * whoever fixes it nothing, so it takes one of the two.
 *
 * A MISSING string (kastlan: the locale lacks the key) cannot be approved — there is
 * nothing to approve. Its field starts empty and is the translation to add; the verdict
 * is NEEDS_CHANGE on the empty text, which the export hands a developer as the string to
 * add.
 *
 * Every action waits for its callback: the buttons hold while the promise is out, a
 * resolution closes the editor through `onClose`, and a rejection keeps it open with what
 * was typed and the error under the buttons.
 */
export function TranslationReviewEditor({
  row,
  referenceLabel,
  localeLabel,
  onSave,
  onClear,
  onClose,
  readOnly = false,
  focusWording = false,
  formatDate: formatDateProp,
  formatError,
  className,
  labels: labelsProp,
}: TranslationReviewEditorProps) {
  const labels = useKitLabels("translationReview", DEFAULT_TRANSLATION_REVIEW_LABELS, labelsProp);
  const { formatDate } = useKitFormat();
  const review = row.review;
  const missing = row.text === "";
  const editable = !readOnly && onSave !== undefined;
  const [suggestion, setSuggestion] = useState(review?.suggestion ?? row.text);
  const [note, setNote] = useState(review?.note ?? "");
  const [busy, setBusy] = useState<"approve" | "flag" | "clear" | null>(null);
  const [failure, setFailure] = useState<ReactNode>(null);
  const wordingRef = useRef<HTMLTextAreaElement>(null);
  // On mount only: the prop says how the editor was OPENED, not where focus belongs
  // for the rest of its life.
  const focusOnOpen = useRef(focusWording && editable);
  useEffect(() => {
    const field = wordingRef.current;
    if (!focusOnOpen.current || !field) return;
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }, []);

  const canFlag = note.trim() !== "" || suggestion.trim() !== row.text.trim();
  const changed = row.status === "changed" ? review : null;
  const date = (iso: string) => (formatDateProp ? formatDateProp(iso) : formatDate(iso, "medium"));

  const run = async (kind: "approve" | "flag" | "clear", action: () => MaybePromise) => {
    setBusy(kind);
    setFailure(null);
    try {
      await action();
      onClose?.();
    } catch (caught) {
      setFailure(formatError ? formatError(caught) : labels.failed);
    } finally {
      setBusy(null);
    }
  };

  const save = (verdict: TranslationVerdict) => {
    if (!onSave) return;
    const trimmedNote = note.trim() || null;
    // Approving says the text is right as it stands: there is no wording to suggest.
    const sent = verdict === "APPROVED" ? null : suggestion.trim() || null;
    void run(verdict === "APPROVED" ? "approve" : "flag", () =>
      onSave(reviewWrite(row, verdict, trimmedNote, sent)),
    );
  };

  return (
    <div className={cn("min-w-0 space-y-3 text-sm", className)}>
      <code className="block break-all text-xs text-[var(--text-muted)]">{row.key}</code>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="min-w-0">
          <SectionLabel as="span" size="xs">
            {referenceLabel}
          </SectionLabel>
          <p className="mt-1 whitespace-pre-line break-words text-[var(--text-secondary)]">{row.reference}</p>
        </div>
        <div className="min-w-0">
          <SectionLabel as="span" size="xs">
            {localeLabel}
          </SectionLabel>
          {missing ? (
            <p className="mt-1 italic text-[var(--text-muted)]">{labels.missingText}</p>
          ) : (
            <p lang={row.locale} className="mt-1 whitespace-pre-line break-words">
              {row.text}
            </p>
          )}
        </div>
      </div>

      {changed && (
        <AlertBanner tone="warning" variant="inline" size="sm" block live={false}>
          <div className="min-w-0">
            <p>{labels.changedSince}</p>
            {changed.text !== row.text && <Then label={labels.reviewedWording} text={changed.text || "—"} />}
            {changed.referenceText != null && changed.referenceText !== row.reference && (
              <Then label={labels.reviewedReference} text={changed.referenceText} />
            )}
          </div>
        </AlertBanner>
      )}

      {row.placeholderMismatch && (
        <AlertBanner tone="danger" variant="inline" size="sm" block live={false}>
          <span className="min-w-0 break-words">
            {labels.placeholderMismatch(
              placeholderTokens(row.reference).join(" ") || "—",
              placeholderTokens(row.text).join(" ") || "—",
            )}
          </span>
        </AlertBanner>
      )}

      {review && (
        <Caption>
          {(review.verdict === "APPROVED" ? labels.lastApproved : labels.lastFlagged)(
            review.reviewerName ?? labels.erasedReviewer,
            date(review.reviewedAt),
          )}
        </Caption>
      )}

      {/* Read-only: what the reviewer said, as text — the fields are for saying it. */}
      {!editable && review?.verdict === "NEEDS_CHANGE" && (review.suggestion || review.note) && (
        <div className="space-y-2">
          {review.suggestion && <Then label={missing ? labels.translation : labels.suggestion} text={review.suggestion} />}
          {review.note && <Then label={labels.note} text={review.note} />}
        </div>
      )}

      {editable && (
        <>
          <Textarea
            ref={wordingRef}
            label={missing ? labels.translation : labels.suggestion}
            lang={row.locale}
            rows={Math.min(8, Math.max(2, Math.ceil(Math.max(row.text.length, row.reference.length) / 80)))}
            value={suggestion}
            disabled={busy !== null}
            onChange={(e) => setSuggestion(e.target.value)}
          />
          <Textarea
            label={labels.note}
            rows={2}
            value={note}
            placeholder={labels.notePlaceholder}
            disabled={busy !== null}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {!missing && (
              <Button
                variant="primary"
                commit
                pending={busy === "approve"}
                disabled={busy !== null}
                onClick={() => save("APPROVED")}
              >
                {labels.approve}
              </Button>
            )}
            <Button
              variant={missing ? "primary" : "danger"}
              commit
              pending={busy === "flag"}
              disabled={busy !== null || !canFlag}
              onClick={() => save("NEEDS_CHANGE")}
            >
              {missing ? labels.suggest : labels.flag}
            </Button>
            {review && onClear && (
              <Button
                variant="ghost"
                commit
                pending={busy === "clear"}
                disabled={busy !== null}
                onClick={() => void run("clear", () => onClear({ locale: row.locale, key: row.key }))}
              >
                {labels.reset}
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" disabled={busy !== null} onClick={onClose}>
                {labels.cancel}
              </Button>
            )}
          </div>
        </>
      )}

      {failure && (
        <AlertBanner tone="danger" size="sm" role="alert">
          {failure}
        </AlertBanner>
      )}
    </div>
  );
}
