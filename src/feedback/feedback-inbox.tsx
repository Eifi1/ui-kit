import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Ban,
  Bug,
  CheckCircle2,
  ClipboardCheck,
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
import type { ButtonSize, ButtonVariant } from "../components/ui";
import { Tooltip } from "../components/tooltip";
import { useCommitReason, useWriteLock } from "../components/write-lock";
import { FeedbackAttachmentField, type FeedbackAttachmentErrorInfo } from "./feedback-attachment";
import type { FeedbackAttachmentLabels } from "./feedback-dialog";
import { useFeedbackCategoryLabels, useFeedbackStatusLabels } from "./feedback-labels";

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

/** The eight states a report can be in.
 *
 *  Shared value for value across the apps on purpose: it is what lets one habit,
 *  and one agent prompt, work on any repo. Five are a chain and three sit off
 *  it — see {@link visibleFeedbackStatuses} for what that buys. `READY` joined in 0.31
 *  (feedback contract §8.2): OPEN is "filed, not yet triaged", READY "released for
 *  implementation", and nobody works an OPEN row. */
export type FeedbackStatus =
  | "OPEN"
  | "READY"
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
 * Colour alone is not a label — two of these sit a hue apart, and a consumer who
 * moves `--brand` can park it beside any of the others — so every status carries
 * its own shape as well. Declaration order is chain order, and
 * {@link FEEDBACK_STATUS_ORDER} is derived from it rather than restated, because
 * a restated list cannot be checked for exhaustiveness: an eighth status would
 * break the build here and leave a literal eight long (as READY did in 0.31).
 */
export const FEEDBACK_STATUS_META: Record<
  FeedbackStatus,
  { icon: LucideIcon; activeBg: string; activeText: string }
> = {
  OPEN: {
    icon: Inbox,
    activeBg: "bg-[var(--bg-active)]",
    activeText: "text-[var(--text-primary)]",
  },
  // Triaged and released for implementation (feedback contract §8.2, keksdose live
  // #396): OPEN is "filed, nobody has looked yet", READY is "go". The brand tint at full
  // strength, so it reads as the go-ahead beside OPEN's neutral fill and
  // NEEDS_LIVE_TEST's muted brand.
  READY: {
    icon: ClipboardCheck,
    activeBg: "bg-[var(--brand-bg)]",
    activeText: "text-[var(--brand)]",
  },
  IN_PROGRESS: {
    icon: Wrench,
    activeBg: "bg-[var(--warning-bg)]",
    activeText: "text-[var(--warning)]",
  },
  // Where solved work is parked, waiting on the person who reported it. Its own
  // colour, because "somebody has to check this" is a state you want to find by
  // scanning rather than by reading.
  IN_EVALUATION: {
    icon: Eye,
    activeBg: "bg-[var(--info-bg)]",
    activeText: "text-[var(--info)]",
  },
  // Resolved but only checkable on a deployed build — the SOFT brand tint, so it
  // reads as "waiting on something" rather than as a done or a refusal, and it
  // follows whatever the consumer's brand is instead of pinning an indigo island
  // beside it.
  NEEDS_LIVE_TEST: {
    icon: CloudUpload,
    activeBg: "bg-[var(--brand-bg)]",
    activeText: "text-[var(--brand-muted)]",
  },
  // Parked on purpose. Muted, not `--danger`: it is not a refusal.
  POSTPONED: {
    icon: PauseCircle,
    activeBg: "bg-[var(--bg-active)]",
    activeText: "text-[var(--text-secondary)]",
  },
  // The one status with nowhere to move to: the vocabulary has a brand, an info, a
  // warning and a danger, and nothing that means "succeeded". Deliberately NOT
  // borrowed from a family that means something else — `--status-synced` is a
  // FIELD's trip to the database rather than an outcome, and tokens.css says so in
  // as many words. Green beside WONT_DO's red is the classic CVD-unsafe pair, which
  // is why both carry a glyph and neither leans on colour alone.
  DONE: {
    icon: CheckCircle2,
    activeBg: "bg-[var(--success-bg)]",
    activeText: "text-[var(--success)]",
  },
  WONT_DO: {
    icon: Ban,
    activeBg: "bg-[var(--danger-bg)]",
    activeText: "text-[var(--danger)]",
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

const FORWARD_CHAIN: FeedbackStatus[] = ["OPEN", "READY", "IN_PROGRESS", "IN_EVALUATION", "DONE"];

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
 * and a row of eight icons in a cell is noise. One step forward, one step back
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
 * exactly like a QUESTION, and sit unnoticed in the queue. `--danger` plus its own
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
    badgeBg: "bg-[var(--danger-bg)]",
    badgeText: "text-[var(--danger)]",
  },
  BUG: {
    icon: Bug,
    badgeBg: "bg-[var(--warning-bg)]",
    badgeText: "text-[var(--warning)]",
  },
  IDEA: {
    icon: Lightbulb,
    badgeBg: "bg-[var(--bg-surface-2)]",
    badgeText: "text-[var(--text-secondary)]",
  },
  QUESTION: {
    icon: HelpCircle,
    badgeBg: "bg-[var(--bg-surface-2)]",
    badgeText: "text-[var(--text-secondary)]",
  },
  OTHER: {
    icon: MoreHorizontal,
    badgeBg: "bg-[var(--bg-surface-2)]",
    badgeText: "text-[var(--text-secondary)]",
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
  commit?: boolean;
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
                      : "text-[var(--text-placeholder)] hover:text-[var(--text-secondary)]",
                  )
                : cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
                    active
                      ? cn(meta.activeBg, meta.activeText, "border-transparent")
                      : "border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]",
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
  commit?: boolean;
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
  const lock = useWriteLock();
  const blank = required && !draft.trim();
  // The shortcut obeys what the button shows: no save while one is in flight, while the
  // note a `required` editor needs is missing, or while a `commit` save is locked.
  const canSubmit = !pending && !blank && !(commit && lock.locked);
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
        <p id={hintId} className="text-xs text-[var(--text-muted)]">
          {placeholder}
        </p>
      )}
      <Textarea
        rows={rows}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        aria-labelledby={placeholder ? hintId : undefined}
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
        <Button variant="brand" disabled={pending || blank} commit={commit} onClick={submit}>
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
  labels?: Partial<FeedbackAttachmentLabels>;
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
        <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
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
  if (!children) return <p className="text-[var(--text-placeholder)]">{empty ?? "—"}</p>;
  return (
    <p className="whitespace-pre-wrap text-[var(--text-secondary)]">{children}</p>
  );
}
