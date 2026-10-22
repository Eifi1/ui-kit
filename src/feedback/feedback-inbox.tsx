import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Button } from "../components/button";
import { Textarea } from "../components/textarea";
import type { ButtonSize, ButtonVariant } from "../components/button-look";
import { Tooltip } from "../components/tooltip";
import { useCommitReason, useWriteLock, type CommitScope } from "../components/write-lock";
import { FeedbackAttachmentField, type FeedbackAttachmentErrorInfo } from "./feedback-attachment";
import type { FeedbackAttachmentLabels } from "./feedback-dialog";
import { useFeedbackCategoryLabels, useFeedbackStatusLabels } from "./feedback-labels";
import {
  FEEDBACK_CATEGORY_META,
  FEEDBACK_STATUS_META,
  type FeedbackCategory,
  type FeedbackStatus,
} from "./feedback-vocabulary";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
// The words module, not ./feedback-row-detail: that one imports this file.
import { DEFAULT_FEEDBACK_DETAIL_LABELS } from "./feedback-row-detail-labels";

/**
 * The feedback **inbox**, as the parts two apps were each writing separately.
 *
 * `feedback-dialog.tsx` next door is the other half — the form somebody files a
 * report with — and the split between them is the same one: the kit owns the
 * *vocabulary*, the *policy* about how a report moves (both in
 * feedback-vocabulary.ts since 0.34, re-exported below), and the *look* (here);
 * the app owns the data, the API and every string.
 *
 * It exists because both apps had grown their own copy. Keksdose's is the one
 * this is lifted from, comments and all, because it is the one that had been
 * argued with users for a year — the glyph per status, the two sizes of the
 * status control, what a row offers from where it currently stands. Steering
 * Design's was thinner in every one of those places and read as a different
 * product for no reason anyone chose.
 *
 * **The report itself lives next door (0.27.0).** This file used to say there
 * was deliberately no `Feedback` type here: the apps stored a report differently
 * (a context JSON column and an object store in one, a `page_path` and the bytes
 * in the row in another). Marcel's feedback round (2026-10-04,
 * docs/feedback-harmonization.md §5) gave all three apps one contract, so the
 * shape is now shared — `FeedbackRecord` / `FeedbackContext` in
 * feedback-record.ts, with the constants and body helpers. The components HERE
 * still take the values they draw rather than a row, which keeps them usable
 * from any surface; the detail panel stays a *shell* the row detail fills.
 *
 * **The words are the kit's too (0.27.0).** The status and category names are
 * the `feedbackStatus` / `feedbackCategory` namespaces (feedback-labels.ts,
 * keksdose's wording), read by default by the badges and the transitions below;
 * a `label` the caller passes still wins.
 */

// The vocabulary — statuses, categories, their glyphs and orders, the transitions — is
// feedback-vocabulary.ts since 0.34 (MOD-1): data the top bar's feedback menu imports
// without this file's components. Re-exported, so every name is still found here.
export {
  FEEDBACK_CATEGORY_META,
  FEEDBACK_CATEGORY_ORDER,
  FEEDBACK_STATUS_META,
  FEEDBACK_STATUS_ORDER,
  feedbackCategoryRank,
  nextFeedbackStatus,
  selectableFeedbackStatuses,
  visibleFeedbackStatuses,
} from "./feedback-vocabulary";
export type { FeedbackCategory, FeedbackStatus } from "./feedback-vocabulary";

/**
 * The category as a badge.
 *
 * Falls back to OTHER's treatment for a category this build has never heard of,
 * so an older client against a newer API degrades to a readable neutral pill
 * instead of throwing on `meta.icon` — a crash report must not be able to cause
 * one. The *label* gets the same guard: by default the `feedbackCategory`
 * namespace's word (0.27.0), and for a value it has no word for, what OTHER is
 * called.
 */
export function FeedbackCategoryBadge({
  category,
  label,
  compact = false,
  className,
}: {
  category: FeedbackCategory;
  /** Over the `feedbackCategory` label (0.27.0: optional — before, every app passed
   *  its own translation). */
  label?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const names = useFeedbackCategoryLabels();
  // Annotated `| undefined` because the Record's index signature promises a hit
  // for every FeedbackCategory, and at runtime the API can hand us one that is not.
  const known: (typeof FEEDBACK_CATEGORY_META)["OTHER"] | undefined = FEEDBACK_CATEGORY_META[category];
  const meta = known ?? FEEDBACK_CATEGORY_META.OTHER;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded font-medium",
        compact ? "px-1.5 py-0.5 text-caption" : "px-2 py-0.5 text-xs",
        meta.badgeBg,
        meta.badgeText,
        className,
      )}
    >
      <Icon className={compact ? "size-3" : "size-3.5"} aria-hidden />
      {label ?? (known ? names[category] : names.OTHER)}
    </span>
  );
}

/** Where a report stands, as a badge — for the places that only *report* the
 *  status rather than offering to change it. Named by the `feedbackStatus`
 *  namespace unless `label` says otherwise (0.27.0); a status this build has never
 *  heard of shows OPEN's look and its own raw value, never OPEN's name. */
export function FeedbackStatusBadge({
  status,
  label,
  className,
}: {
  status: FeedbackStatus;
  /** Over the `feedbackStatus` label (0.27.0: optional). */
  label?: ReactNode;
  className?: string;
}) {
  const names = useFeedbackStatusLabels();
  const meta = FEEDBACK_STATUS_META[status] ?? FEEDBACK_STATUS_META.OPEN;
  const name: string | undefined = names[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-caption font-medium",
        meta.activeBg,
        meta.activeText,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label ?? name ?? status}
    </span>
  );
}

/**
 * A row of statuses to switch a report to — either a table column's icon row or
 * an expanded panel's labelled pills.
 *
 * One component for both, because everything except the class strings is the
 * same decision: which one is current, and when the buttons are disabled. Two
 * copies had already drifted — only the icon variant carried `aria-label` and
 * `aria-pressed`, so the pill row was unlabelled for a screen reader.
 *
 * WHICH statuses to offer is the caller's, not this component's:
 * {@link visibleFeedbackStatuses} for a compact column,
 * {@link selectableFeedbackStatuses} for an expanded row. Passing the list keeps
 * that policy readable at the two call sites instead of hiding it behind
 * `variant`.
 */
export function FeedbackStatusTransitions({
  status,
  statuses,
  canEdit,
  onPick,
  variant,
  label,
  commit,
  disabledReason: ownDisabledReason,
  className,
}: {
  status: FeedbackStatus;
  statuses: FeedbackStatus[];
  canEdit: boolean;
  onPick: (status: FeedbackStatus) => void;
  variant: "icon" | "pill";
  /** What each status is called. Default (0.27.0): the `feedbackStatus` namespace —
   *  before, every app passed its own translation. */
  label?: (status: FeedbackStatus) => string;
  /**
   * Every button here SAVES the moment it is pressed (0.27.0) — opt in and, under a
   * locked {@link WriteLockProvider}, the row stays as it is and says why: each status
   * the row could move to is `aria-disabled` but focusable, the click does nothing, and
   * the lock's reason is in the kit Tooltip and the button's description — the
   * `disabledReason` path `Button` takes. Off by default: a feedback inbox is not what
   * every app's lock is about (keksdose's shell lock is a read-only demo BUDGET, and a
   * report is not budget data).
   */
  commit?: CommitScope;
  /** Why the statuses cannot be changed right now, the same way (a lock's own reason
   *  wins over it). Only read while `canEdit`: a read-only row is a picture of the
   *  workflow, not a refused action. */
  disabledReason?: ReactNode;
  className?: string;
}) {
  const names = useFeedbackStatusLabels();
  const nameOf = label ?? ((value: FeedbackStatus) => names[value]);
  const reason = useCommitReason(commit, ownDisabledReason);
  const locked = canEdit && reason !== undefined && reason !== null && reason !== false && reason !== "";
  const reasonId = useId();
  return (
    // Not a control: it only stops clicks on the buttons inside from bubbling to
    // the row. The buttons are the keyboard path, and Enter/Space on them fires
    // their own click, which lands here the same way.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- propagation guard around real buttons
    <div
      className={cn(variant === "icon" ? "flex items-center gap-0.5" : "flex flex-wrap gap-1.5", className)}
      // A status control inside a clickable row must not also open the row.
      onClick={(event) => event.stopPropagation()}
    >
      {locked && (
        <span id={reasonId} hidden>
          {reason}
        </span>
      )}
      {statuses.map((value) => {
        const meta = FEEDBACK_STATUS_META[value];
        const Icon = meta.icon;
        const active = status === value;
        const name = nameOf(value);
        // Locked: focusable and described, never firing (see `commit`). The current
        // status stays natively disabled — it was never something to press.
        const refused = locked && !active;
        const button = (
          <button
            key={value}
            type="button"
            disabled={refused ? undefined : !canEdit || active}
            aria-disabled={refused || undefined}
            aria-describedby={refused ? reasonId : undefined}
            onClick={() => {
              if (!refused) onPick(value);
            }}
            aria-label={name}
            aria-pressed={active}
            className={cn(
              "transition-colors",
              variant === "icon"
                ? cn(
                    "flex size-7 items-center justify-center rounded",
                    active
                      ? cn(meta.activeBg, meta.activeText)
                      : "text-placeholder hover:text-secondary",
                  )
                : cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
                    active
                      ? cn(meta.activeBg, meta.activeText, "border-transparent")
                      : // The translucent ink on hover (0.33, B′), as Button's secondary:
                        // the well is the page in light, and these pills sit on either.
                        "border-subtle bg-transparent text-primary hover:bg-[color-mix(in_srgb,var(--text-primary)_7%,transparent)]",
                  ),
              // Both stay unclickable, but only the read-only case is DIMMED: the
              // current status is the one thing in the row that has to be legible
              // at a glance, and among eight pills a faded active one reads as
              // "unavailable" rather than as "this is where the row stands".
              (!canEdit || active) && "cursor-default",
              !canEdit && "opacity-60",
              refused && "cursor-not-allowed opacity-50",
            )}
          >
            <Icon className={variant === "icon" ? "size-4" : "size-3.5"} aria-hidden />
            {variant === "pill" && name}
          </button>
        );
        // Locked, the bubble says WHY in both variants; the icon's name is still its
        // `aria-label`, and the reason its description — the hidden copy above, which
        // stays put, rather than the bubble (as on `Button`: the FRAGMENT keeps Tooltip
        // from adding the bubble as a second, coming-and-going description).
        if (refused) {
          return (
            <Tooltip key={value} label={reason} side="top" portal={variant === "icon" || undefined}>
              <>{button}</>
            </Tooltip>
          );
        }
        // The icon row has no visible label, so it needs the tooltip; the pills
        // carry theirs inline.
        //
        // ⚠️ ABOVE, and portalled (Keksdose live #339). `side="bottom"` put the bubble
        // straight over the NEXT ROW's icons — in a queue you triage by running down it
        // with the pointer, that is the row you are about to reach, and it was covered
        // every time you paused on one. Above covers the row you have just left instead.
        //
        // `portal` is not cosmetic here. An absolutely-positioned bubble is clipped by
        // any ancestor that scrolls — this cell lives inside the DataTable's own
        // scroller — and it cannot flip: `placeTooltip` is what moves the bubble below
        // the icon for the FIRST row, where there is no room above it, instead of
        // painting it off the top of the list.
        return variant === "icon" ? (
          <Tooltip key={value} label={name} side="top" portal>
            {button}
          </Tooltip>
        ) : (
          button
        );
      })}
    </div>
  );
}

/**
 * A textarea and its two buttons — for an outcome, for a note sent back with a
 * report, for a body being corrected.
 *
 * One component because all three are the same gesture: a draft that is not
 * committed until it is saved. Ctrl/⌘+Enter submits, which is the same shortcut
 * the compose dialog next door uses, so the habit carries across the feature.
 *
 * ## `initial` seeds the draft; it does not own it (changed 2026-09-22)
 *
 * This used to re-seed from `initial` in an effect, and that effect threw away
 * whatever was in the box — **and the picture attached to it** — every time the
 * prop arrived with a different value. `initial` is normally the saved note, so
 * the list refreshing under the editor, or the owner re-deriving the same string,
 * was enough: a triager halfway through a reply, with a screenshot picked out,
 * lost both and got the saved text back with no way to undo it.
 *
 * A draft belongs to the thing being edited, so switching to a different note is a
 * different editor — say so with a `key`:
 *
 * ```tsx
 * <FeedbackNoteEditor key={note.id} initial={note.body} … />
 * ```
 *
 * Where the id is not in hand at the call site, pass {@link resetKey} instead and
 * the editor re-seeds when THAT changes. Either way the decision is the caller's,
 * which is the point: the editor cannot tell a new subject from a new render.
 */
export function FeedbackNoteEditor({
  initial,
  pending,
  onSave,
  onCancel,
  saveLabel,
  cancelLabel,
  placeholder,
  label,
  rows = 3,
  attachment,
  resetKey,
  required = false,
  commit,
}: {
  initial: string;
  pending: boolean;
  onSave: (value: string, attachment?: File | null) => void;
  onCancel: () => void;
  saveLabel: ReactNode;
  cancelLabel: ReactNode;
  /** A line above the field saying what to write, not an in-field placeholder:
   *  a hint that disappears the moment somebody starts typing is a hint that is
   *  gone exactly when it is being followed. */
  placeholder?: ReactNode;
  /** The box's accessible name (0.34). Without it the `placeholder` line names the
   *  box, and without that the `feedbackDetail` namespace's `note` ("Note") does —
   *  a box with neither was read out as just "edit text" (the showcase's axe check).
   *  Given with a `placeholder`, this names the box and the line describes it. */
  label?: string;
  rows?: number;
  /** Offer a picture with the note (Steering Design feedback #128). Omitted,
   *  the editor is exactly the text box it always was — which is what the
   *  *outcome* editor beside it wants, since an outcome is the answer rather
   *  than the evidence. */
  attachment?: FeedbackNoteAttachment;
  /** Change this to say "the editor is now editing something ELSE", and the draft
   *  and its attachment are dropped and re-seeded from `initial`. For call sites
   *  that cannot put a `key` on the editor (see the note above). Leave it out and
   *  the draft is never thrown away behind the user's back. */
  resetKey?: string | number;
  /**
   * A blank note cannot be saved (0.27.0): Save stays disabled — and Ctrl/⌘+Enter does
   * nothing — until the trimmed text is non-empty, and the box is `aria-required`. For
   * the rework note, which the feedback contract requires (§3.4: a file alone cannot
   * be sent; keksdose `feedback-page.tsx:577` dropped the click silently instead, so a
   * press on Send with an empty box looked like a lost send). Default `false`: an
   * outcome or a description may be cleared on purpose.
   */
  required?: boolean;
  /** Save COMMITS (0.27.0): under a locked `WriteLockProvider` it is disabled the
   *  `disabledReason` way, with the lock's reason, and Ctrl/⌘+Enter saves nothing. The
   *  text box stays editable — nothing in it reaches the server until the save. */
  commit?: CommitScope;
}) {
  const [draft, setDraft] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  // Adjusted during render rather than in an effect: an effect would paint the old
  // draft first and then replace it, and — far worse — it is a second definition of
  // when a draft dies that the caller cannot see. React re-runs this component
  // immediately, before anything is committed to the screen.
  const [seededFor, setSeededFor] = useState(resetKey);
  if (resetKey !== seededFor) {
    setSeededFor(resetKey);
    setDraft(initial);
    setFile(null);
  }
  // The editor's own root, which is where a paste made in the text box bubbles
  // to: the attachment field below is the box's sibling, so a paste in the box
  // never passes through the field's own subtree. It listens here instead
  // (Steering Design feedback #140).
  const root = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const detailText = useKitLabels("feedbackDetail", DEFAULT_FEEDBACK_DETAIL_LABELS);
  // The lock as the save button sees it, with its scope (§12.36): `commit &&
  // lock.locked` read a `{ except }` scope as `true`.
  const lock = useWriteLock(commit ?? false);
  const blank = required && !draft.trim();
  // The shortcut obeys what the button shows: no save while one is in flight, while the
  // note a `required` editor needs is missing, or while a `commit` save is locked.
  const canSubmit = !pending && !blank && !lock.locked;
  const submit = () => onSave(draft, file);
  return (
    // Not a control: a delegated Ctrl/Cmd+Enter shortcut for the textarea inside,
    // which is what holds focus. The save button is the non-shortcut path.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- delegated keyboard shortcut for the focused field
    <div
      ref={root}
      className="space-y-2"
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && canSubmit) {
          event.preventDefault();
          submit();
        }
      }}
    >
      {/* The line names the box (0.27.0): it is the only text that says what to write
          in it, and an unnamed textarea is read out as just "edit text". */}
      {placeholder && (
        <p id={hintId} className="text-xs text-muted">
          {placeholder}
        </p>
      )}
      <Textarea
        rows={rows}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        // Never nameless (round 0.34): the caller's `label`, else the line, else the
        // `feedbackDetail` namespace's `note`. With both, the line describes the box.
        aria-label={label ?? (placeholder ? undefined : detailText.note)}
        aria-labelledby={placeholder && label === undefined ? hintId : undefined}
        aria-describedby={placeholder && label !== undefined ? hintId : undefined}
        aria-required={required || undefined}
      />
      {attachment && (
        <FeedbackAttachmentField
          value={file}
          onChange={setFile}
          // A pause while the save is in flight (the field's G5b `disabled`): the note
          // goes out with the file AS IT WAS at the press, so a chip removed or added
          // mid-send would be a lie about what was sent.
          disabled={pending}
          labels={attachment.labels}
          accept={attachment.accept}
          maxBytes={attachment.maxBytes}
          onError={attachment.onError}
          onCaptureScreenshot={attachment.onCaptureScreenshot}
          buttonVariant={attachment.buttonVariant}
          buttonSize={attachment.buttonSize}
          // Within THIS editor's subtree, not on `document`: the editor sits
          // inline on a page that has other fields, so a paste made in one of
          // them is meant for that one. The textarea above is where the caret
          // already is, and it is the field's sibling — so the field is told
          // to listen on their common parent, where the paste bubbles to.
          pasteFrom={root}
        />
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="accent" disabled={pending || blank} commit={commit} onClick={submit}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

/** What {@link FeedbackNoteEditor} needs in order to offer a picture with the
 *  note: the same things {@link FeedbackAttachmentField} takes, so the reply path is
 *  held to the app's own limits — and drawn in its own look — rather than the
 *  defaults. */
export interface FeedbackNoteAttachment {
  /** Over the field's own `feedbackAttachment` namespace. Optional since 0.27.0 — the
   *  field has read the provider's words since 0.7.0, so an app with a catalogue has
   *  nothing to restate. */
  labels?: LabelOverride<FeedbackAttachmentLabels>;
  accept?: string[];
  maxBytes?: number;
  /** `info` (0.23.0) names the refused file and the limit. */
  onError?: (kind: "type" | "size", info: FeedbackAttachmentErrorInfo) => void;
  onCaptureScreenshot?: () => Promise<File | null>;
  /**
   * The add and capture buttons' look (0.25.0) — the field's `buttonVariant` (0.24.0),
   * Button's own `variant`. Default `"secondary"`, as before.
   *
   * The note editor sits inline in a triage panel, and its buttons end in a ghost
   * Cancel and a brand Save: two bordered full-size attachment buttons above them read
   * as a second form. The field could already be told otherwise; the editor builds it
   * itself and had nowhere to say so.
   */
  buttonVariant?: ButtonVariant;
  /** The add and capture buttons' size (0.25.0) — the field's `buttonSize`. Default
   *  `"md"`; `"sm"` draws their icons at 14px. */
  buttonSize?: ButtonSize;
}

/**
 * One labelled block of an opened report.
 *
 * The detail panel is a stack of these, and it is a stack rather than a
 * component with fixed fields on purpose: the two apps keep a report's context
 * and its screenshot in genuinely different places, and a shell that insisted on
 * both would force one of them to invent a shape it does not have. What is
 * shared is what a section *looks* like — and that is all that made the two
 * panels read as different products.
 */
export function FeedbackDetailSection({
  title,
  action,
  children,
}: {
  title: ReactNode;
  /** Something on the title's own line — an edit button, a resolved-at date. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted">
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** The stack a detail panel is. Here so the spacing between sections is decided
 *  once rather than by whichever app was written second. */
export function FeedbackDetail({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-3 text-sm", className)}>{children}</div>;
}

/** Prose inside a section — a body, an outcome, a note.
 *
 *  `whitespace-pre-wrap` is the whole component: a report is written in
 *  paragraphs, and a note appended to it later is separated by blank lines that
 *  carry the entire "this arrived after the answer" reading. */
export function FeedbackProse({ children, empty }: { children?: string; empty?: ReactNode }) {
  if (!children) return <p className="text-placeholder">{empty ?? "—"}</p>;
  return (
    <p className="whitespace-pre-wrap text-secondary">{children}</p>
  );
}
