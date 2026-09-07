import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Ban,
  Bug,
  CheckCircle2,
  CloudUpload,
  Eye,
  HelpCircle,
  Inbox,
  Lightbulb,
  MoreHorizontal,
  OctagonAlert,
  PauseCircle,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { Button, Textarea } from "../components/ui";
import { Tooltip } from "../components/tooltip";
import { FeedbackAttachmentField } from "./feedback-attachment";
import type { FeedbackAttachmentLabels } from "./feedback-dialog";

/**
 * The feedback **inbox**, as the parts two apps were each writing separately.
 *
 * `feedback-dialog.tsx` next door is the other half — the form somebody files a
 * report with — and the split between them is the same one: this owns the
 * *vocabulary*, the *policy* about how a report moves, and the *look*; the app
 * owns the data, the API and every string.
 *
 * It exists because both apps had grown their own copy. Keksdose's is the one
 * this is lifted from, comments and all, because it is the one that had been
 * argued with users for a year — the glyph per status, the two sizes of the
 * status control, what a row offers from where it currently stands. Steering
 * Design's was thinner in every one of those places and read as a different
 * product for no reason anyone chose.
 *
 * **What is deliberately NOT here.** The two apps store a report differently and
 * are meant to: one keeps the reporter's context in a JSON column and the
 * screenshot in an object store, the other keeps a `page_path` and the bytes in
 * the row. So there is no `Feedback` type in this file and nothing here takes
 * one. Every component takes the values it draws, and the detail panel is a
 * *shell* the app fills — which is what lets each keep the shape that suits it
 * without either of them inventing a second look for a status pill.
 */

/** The seven states a report can be in.
 *
 *  Shared value for value across both apps on purpose: it is what lets one habit,
 *  and one agent prompt, work on either repo. Four are a chain and three sit off
 *  it — see {@link visibleFeedbackStatuses} for what that buys. */
export type FeedbackStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "IN_EVALUATION"
  | "NEEDS_LIVE_TEST"
  | "POSTPONED"
  | "DONE"
  | "WONT_DO";

/** What a report is about. `CRASH` is filed by an error boundary and never
 *  chosen, which is exactly why it is loud below and absent from every picker. */
export type FeedbackCategory = "CRASH" | "BUG" | "IDEA" | "QUESTION" | "OTHER";

/**
 * A glyph and a tone per status.
 *
 * Colour alone is not a label — two of these are a violet and an indigo apart —
 * so every status carries its own shape as well. Declaration order is chain
 * order, and {@link FEEDBACK_STATUS_ORDER} is derived from it rather than
 * restated, because a restated list cannot be checked for exhaustiveness: an
 * eighth status would break the build here and leave a literal seven long.
 */
export const FEEDBACK_STATUS_META: Record<
  FeedbackStatus,
  { icon: LucideIcon; activeBg: string; activeText: string }
> = {
  OPEN: {
    icon: Inbox,
    activeBg: "bg-slate-200 dark:bg-slate-700",
    activeText: "text-slate-900 dark:text-white",
  },
  IN_PROGRESS: {
    icon: Wrench,
    activeBg: "bg-amber-100 dark:bg-amber-500/20",
    activeText: "text-amber-700 dark:text-amber-300",
  },
  // Where solved work is parked, waiting on the person who reported it. Its own
  // colour, because "somebody has to check this" is a state you want to find by
  // scanning rather than by reading.
  IN_EVALUATION: {
    icon: Eye,
    activeBg: "bg-sky-100 dark:bg-sky-500/20",
    activeText: "text-sky-700 dark:text-sky-300",
  },
  // Resolved but only checkable on a deployed build — indigo, so it reads as
  // "waiting on something" rather than as a done or a refusal.
  NEEDS_LIVE_TEST: {
    icon: CloudUpload,
    activeBg: "bg-indigo-100 dark:bg-indigo-500/20",
    activeText: "text-indigo-700 dark:text-indigo-300",
  },
  // Parked on purpose. Muted, not red: it is not a refusal.
  POSTPONED: {
    icon: PauseCircle,
    activeBg: "bg-slate-200 dark:bg-slate-700",
    activeText: "text-slate-600 dark:text-slate-300",
  },
  DONE: {
    icon: CheckCircle2,
    activeBg: "bg-emerald-100 dark:bg-emerald-500/20",
    activeText: "text-emerald-700 dark:text-emerald-300",
  },
  WONT_DO: {
    icon: Ban,
    activeBg: "bg-rose-100 dark:bg-rose-500/20",
    activeText: "text-rose-700 dark:text-rose-300",
  },
};

/** Chain order, then the three off it. The order a picker offers, and the rank a
 *  status column sorts by — so a list sorted by status reads as a queue rather
 *  than as an alphabet. */
export const FEEDBACK_STATUS_ORDER = Object.keys(FEEDBACK_STATUS_META) as FeedbackStatus[];

/** States that sit OFF the linear chain: reachable from anywhere, leading
 *  nowhere by themselves. `WONT_DO` has always worked this way; `POSTPONED`
 *  ("not now") and `NEEDS_LIVE_TEST` ("resolved, but only provable on a deployed
 *  build") are the same shape — a row can be parked or handed to the next deploy
 *  from any point, and comes back to the chain when somebody picks a real state
 *  for it.
 *
 *  Kept out of the forward chain deliberately: putting them in it would mean an
 *  "advance" gesture could park an item, and every row would have to pass
 *  through them to reach `DONE`. */
const OFF_CHAIN: FeedbackStatus[] = ["NEEDS_LIVE_TEST", "POSTPONED", "WONT_DO"];

const FORWARD_CHAIN: FeedbackStatus[] = ["OPEN", "IN_PROGRESS", "IN_EVALUATION", "DONE"];

/** The next status along the chain, or null at the end (or off it, as `WONT_DO`
 *  is). What a swipe-to-advance gesture commits. */
export function nextFeedbackStatus(current: FeedbackStatus): FeedbackStatus | null {
  const at = FORWARD_CHAIN.indexOf(current);
  return at !== -1 && at < FORWARD_CHAIN.length - 1 ? FORWARD_CHAIN[at + 1] : null;
}

/**
 * The steps that make sense from where a row currently stands.
 *
 * For the compact control in a table cell: it is a glanceable triage affordance,
 * and a row of seven icons in a cell is noise. One step forward, one step back
 * (so an item can be sent back for rework), and any of the three off-chain
 * verdicts — which is what makes those usable as verdicts at all.
 *
 * The two parking states are not dead ends: each offers the step that resumes
 * work and the ones that close it, but deliberately **not each other** —
 * "postponed" and "waiting on a deploy" are different answers to different
 * questions, and a row moving between them directly is a re-triage, which starts
 * by picking the work back up.
 */
export function visibleFeedbackStatuses(current: FeedbackStatus): FeedbackStatus[] {
  const set = new Set<FeedbackStatus>([current]);
  const at = FORWARD_CHAIN.indexOf(current);
  if (at !== -1) {
    if (at < FORWARD_CHAIN.length - 1) set.add(FORWARD_CHAIN[at + 1]);
    if (at > 0) set.add(FORWARD_CHAIN[at - 1]);
    for (const off of OFF_CHAIN) set.add(off);
  } else if (current !== "WONT_DO") {
    set.add("IN_PROGRESS");
    set.add("DONE");
    set.add("WONT_DO");
  }
  // WONT_DO falls through with nothing added: it stays terminal, reopened by a
  // note from its author rather than by a status pill.
  return FEEDBACK_STATUS_ORDER.filter((status) => set.has(status));
}

/**
 * Every status, in chain order — what an EXPANDED row offers.
 *
 * {@link visibleFeedbackStatuses} narrows the choice to the steps that make
 * sense from where a row is, which is right for a table cell. Once the row is
 * open in front of you, that same narrowing turns every non-adjacent move into a
 * walk: OPEN to DONE meant three round trips, and WONT_DO could not be left at
 * all except through a rework note.
 *
 * Takes a `current` it does not use, so the two policies read as one pair at the
 * call sites and a future rule ("terminal rows still cannot jump to X") has a
 * place to live.
 */
export function selectableFeedbackStatuses(_current: FeedbackStatus): FeedbackStatus[] {
  return [...FEEDBACK_STATUS_ORDER];
}

/**
 * Per-category badge treatment, the counterpart to the status meta above.
 *
 * A category cell that is one grey pill holding the raw enum makes a CRASH —
 * filed automatically, by somebody staring at a broken page right now — read
 * exactly like a QUESTION, and sit unnoticed in the queue. Red plus its own
 * glyph is what makes that impossible; the hand-filed categories stay
 * deliberately quiet so that the loud one means something.
 *
 * Declaration order is triage order, CRASH first.
 */
export const FEEDBACK_CATEGORY_META: Record<
  FeedbackCategory,
  { icon: LucideIcon; badgeBg: string; badgeText: string }
> = {
  CRASH: {
    icon: OctagonAlert,
    badgeBg: "bg-red-100 dark:bg-red-500/20",
    badgeText: "text-red-700 dark:text-red-300",
  },
  BUG: {
    icon: Bug,
    badgeBg: "bg-amber-100 dark:bg-amber-500/20",
    badgeText: "text-amber-700 dark:text-amber-300",
  },
  IDEA: {
    icon: Lightbulb,
    badgeBg: "bg-slate-100 dark:bg-slate-800",
    badgeText: "text-slate-700 dark:text-slate-300",
  },
  QUESTION: {
    icon: HelpCircle,
    badgeBg: "bg-slate-100 dark:bg-slate-800",
    badgeText: "text-slate-700 dark:text-slate-300",
  },
  OTHER: {
    icon: MoreHorizontal,
    badgeBg: "bg-slate-100 dark:bg-slate-800",
    badgeText: "text-slate-700 dark:text-slate-300",
  },
};

/** Triage order, CRASH first — also a category column's sort key and the option
 *  order in its filter. Sorting by the raw enum is alphabetical, which parks
 *  CRASH between BUG and IDEA. */
export const FEEDBACK_CATEGORY_ORDER = Object.keys(FEEDBACK_CATEGORY_META) as FeedbackCategory[];

/** A category's rank for a column sort. Anything this build has never heard of —
 *  an older client against a newer API — sorts LAST rather than to `indexOf`'s
 *  −1, which would rank it above CRASH. */
export function feedbackCategoryRank(category: FeedbackCategory): number {
  const at = FEEDBACK_CATEGORY_ORDER.indexOf(category);
  return at === -1 ? FEEDBACK_CATEGORY_ORDER.length : at;
}

/**
 * The category as a badge.
 *
 * Falls back to OTHER's treatment for a category this build has never heard of,
 * so an older client against a newer API degrades to a readable neutral pill
 * instead of throwing on `meta.icon` — a crash report must not be able to cause
 * one. The *label* is the caller's, and for the same reason it needs the same
 * guard: pass what OTHER is called if you cannot name the value you were given.
 */
export function FeedbackCategoryBadge({
  category,
  label,
  compact = false,
  className,
}: {
  category: FeedbackCategory;
  label: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  // Annotated `| undefined` because the Record's index signature promises a hit
  // for every FeedbackCategory, and at runtime the API can hand us one that is not.
  const known: (typeof FEEDBACK_CATEGORY_META)["OTHER"] | undefined = FEEDBACK_CATEGORY_META[category];
  const meta = known ?? FEEDBACK_CATEGORY_META.OTHER;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded font-medium",
        compact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs",
        meta.badgeBg,
        meta.badgeText,
        className,
      )}
    >
      <Icon className={compact ? "size-3" : "size-3.5"} aria-hidden />
      {label}
    </span>
  );
}

/** Where a report stands, as a badge — for the places that only *report* the
 *  status rather than offering to change it. */
export function FeedbackStatusBadge({
  status,
  label,
  className,
}: {
  status: FeedbackStatus;
  label: ReactNode;
  className?: string;
}) {
  const meta = FEEDBACK_STATUS_META[status] ?? FEEDBACK_STATUS_META.OPEN;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium",
        meta.activeBg,
        meta.activeText,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
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
  className,
}: {
  status: FeedbackStatus;
  statuses: FeedbackStatus[];
  canEdit: boolean;
  onPick: (status: FeedbackStatus) => void;
  variant: "icon" | "pill";
  /** What each status is called, translated by the app. */
  label: (status: FeedbackStatus) => string;
  className?: string;
}) {
  return (
    <div
      className={cn(variant === "icon" ? "flex items-center gap-0.5" : "flex flex-wrap gap-1.5", className)}
      // A status control inside a clickable row must not also open the row.
      onClick={(event) => event.stopPropagation()}
    >
      {statuses.map((value) => {
        const meta = FEEDBACK_STATUS_META[value];
        const Icon = meta.icon;
        const active = status === value;
        const name = label(value);
        const button = (
          <button
            key={value}
            type="button"
            disabled={!canEdit || active}
            onClick={() => onPick(value)}
            aria-label={name}
            aria-pressed={active}
            className={cn(
              "transition-colors",
              variant === "icon"
                ? cn(
                    "flex size-7 items-center justify-center rounded",
                    active
                      ? cn(meta.activeBg, meta.activeText)
                      : "text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200",
                  )
                : cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
                    active
                      ? cn(meta.activeBg, meta.activeText, "border-transparent")
                      : "border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]",
                  ),
              // Both stay unclickable, but only the read-only case is DIMMED: the
              // current status is the one thing in the row that has to be legible
              // at a glance, and among seven pills a faded active one reads as
              // "unavailable" rather than as "this is where the row stands".
              (!canEdit || active) && "cursor-default",
              !canEdit && "opacity-60",
            )}
          >
            <Icon className={variant === "icon" ? "size-4" : "size-3.5"} aria-hidden />
            {variant === "pill" && name}
          </button>
        );
        // The icon row has no visible label, so it needs the tooltip; the pills
        // carry theirs inline.
        return variant === "icon" ? (
          <Tooltip key={value} label={name} side="bottom">
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
 */
export function FeedbackNoteEditor({
  initial,
  pending,
  onSave,
  onCancel,
  saveLabel,
  cancelLabel,
  placeholder,
  rows = 3,
  attachment,
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
  rows?: number;
  /** Offer a picture with the note (Steering Design feedback #128). Omitted,
   *  the editor is exactly the text box it always was — which is what the
   *  *outcome* editor beside it wants, since an outcome is the answer rather
   *  than the evidence. */
  attachment?: FeedbackNoteAttachment;
}) {
  const [draft, setDraft] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    // Re-seed when the editor is reopened with different content.
    setDraft(initial);
    setFile(null);
  }, [initial]);
  const submit = () => onSave(draft, file);
  return (
    <div
      className="space-y-2"
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !pending) {
          event.preventDefault();
          submit();
        }
      }}
    >
      {placeholder && <p className="text-xs text-slate-500 dark:text-slate-400">{placeholder}</p>}
      <Textarea rows={rows} value={draft} onChange={(event) => setDraft(event.target.value)} />
      {attachment && (
        <FeedbackAttachmentField
          value={file}
          onChange={setFile}
          labels={attachment.labels}
          accept={attachment.accept}
          maxBytes={attachment.maxBytes}
          onError={attachment.onError}
          onCaptureScreenshot={attachment.onCaptureScreenshot}
          // Within its own subtree, not on `document`: this editor sits inline
          // on a page that has other fields, so a paste made in one of them is
          // meant for that one. The textarea above is where the caret already
          // is, and the event bubbles here from it.
        />
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="brand" disabled={pending} onClick={submit}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

/** What {@link FeedbackNoteEditor} needs in order to offer a picture with the
 *  note: the same four things {@link FeedbackAttachmentField} takes, so the
 *  reply path is held to the app's own limits rather than to the defaults. */
export interface FeedbackNoteAttachment {
  labels: FeedbackAttachmentLabels;
  accept?: string[];
  maxBytes?: number;
  onError?: (kind: "type" | "size") => void;
  onCaptureScreenshot?: () => Promise<File | null>;
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
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
export function FeedbackDetail({ children }: { children: ReactNode }) {
  return <div className="space-y-3 text-sm">{children}</div>;
}

/** Prose inside a section — a body, an outcome, a note.
 *
 *  `whitespace-pre-wrap` is the whole component: a report is written in
 *  paragraphs, and a note appended to it later is separated by blank lines that
 *  carry the entire "this arrived after the answer" reading. */
export function FeedbackProse({ children, empty }: { children?: string; empty?: ReactNode }) {
  if (!children) return <p className="text-slate-400 dark:text-slate-600">{empty ?? "—"}</p>;
  return (
    <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">{children}</p>
  );
}
