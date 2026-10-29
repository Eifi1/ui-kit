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
  RotateCcw,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * The feedback **vocabulary**: the nine statuses and five categories, the glyph and tone
 * of each, their orders, and the policy for how a report moves from status to status.
 *
 * Data and plain functions, no components. Until 0.34 this lived at the top of
 * feedback-inbox.tsx, so the feedback menu every app mounts in its top bar imported the
 * inbox — its components and the attachment field they render — for one constant (a
 * category's glyph), and only tree-shaking kept the rest out of every app's entry chunk.
 * From here the top bar's imports reach none of it (MOD-1, refactor audit 2026-10).
 * feedback-inbox.tsx re-exports every name here, so nothing an app imports has moved.
 */

/** The nine states a report can be in.
 *
 *  Shared value for value across the apps on purpose: it is what lets one habit,
 *  and one agent prompt, work on any repo. Five are a chain and three sit off
 *  it — see {@link visibleFeedbackStatuses} for what that buys. `READY` joined in 0.31
 *  (feedback contract §8.2): OPEN is "filed, not yet triaged", READY "released for
 *  implementation", and nobody works an OPEN row. `REWORK` joined in 0.40 (§10.2
 *  decisions 2, 4): "sent back, released for work again" — a READY that came back. */
export type FeedbackStatus =
  "OPEN" | "READY" | "REWORK" | "IN_PROGRESS" | "IN_EVALUATION" | "NEEDS_LIVE_TEST" | "POSTPONED" | "DONE" | "WONT_DO";

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
export const FEEDBACK_STATUS_META: Record<FeedbackStatus, { icon: LucideIcon; activeBg: string; activeText: string }> =
  {
    OPEN: {
      icon: Inbox,
      activeBg: "bg-active",
      activeText: "text-primary",
    },
    // Triaged and released for implementation (feedback contract §8.2, keksdose live
    // #396): OPEN is "filed, nobody has looked yet", READY is "go". The brand tint at full
    // strength, so it reads as the go-ahead beside OPEN's neutral fill and
    // NEEDS_LIVE_TEST's muted brand.
    READY: {
      icon: ClipboardCheck,
      activeBg: "bg-brand-soft",
      activeText: "text-brand",
    },
    // Sent back by its author or an admin and released for work again (0.40, feedback
    // contract §10.2 decision 4): the Rework button's `RotateCcw`, in the danger tint so the
    // queue shows reworks apart from new reports. Not IN_PROGRESS's warning tint — that is
    // where a REWORK row moves next — and WONT_DO, the only other red, sits at the far end
    // with `Ban`.
    REWORK: {
      icon: RotateCcw,
      activeBg: "bg-danger-soft",
      activeText: "text-danger",
    },
    IN_PROGRESS: {
      icon: Wrench,
      activeBg: "bg-warning-soft",
      activeText: "text-warning",
    },
    // Where solved work is parked, waiting on the person who reported it. Its own
    // colour, because "somebody has to check this" is a state you want to find by
    // scanning rather than by reading.
    IN_EVALUATION: {
      icon: Eye,
      activeBg: "bg-info-soft",
      activeText: "text-info",
    },
    // Resolved but only checkable on a deployed build — the SOFT brand tint, so it
    // reads as "waiting on something" rather than as a done or a refusal, and it
    // follows whatever the consumer's brand is instead of pinning an indigo island
    // beside it.
    NEEDS_LIVE_TEST: {
      icon: CloudUpload,
      activeBg: "bg-brand-soft",
      activeText: "text-brand-muted",
    },
    // Parked on purpose. Muted, not `--danger`: it is not a refusal.
    POSTPONED: {
      icon: PauseCircle,
      activeBg: "bg-active",
      activeText: "text-secondary",
    },
    // The one status with nowhere to move to: the vocabulary has a brand, an info, a
    // warning and a danger, and nothing that means "succeeded". Deliberately NOT
    // borrowed from a family that means something else — `--status-synced` is a
    // FIELD's trip to the database rather than an outcome, and tokens.css says so in
    // as many words. Green beside WONT_DO's red is the classic CVD-unsafe pair, which
    // is why both carry a glyph and neither leans on colour alone.
    DONE: {
      icon: CheckCircle2,
      activeBg: "bg-success-soft",
      activeText: "text-success",
    },
    WONT_DO: {
      icon: Ban,
      activeBg: "bg-danger-soft",
      activeText: "text-danger",
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
 *  is). What a swipe-to-advance gesture commits. `REWORK` (0.40) is not in the chain —
 *  "advance" from READY still goes to IN_PROGRESS — but it leads there too: a reworked
 *  row is READY's twin. */
export function nextFeedbackStatus(current: FeedbackStatus): FeedbackStatus | null {
  if (current === "REWORK") return "IN_PROGRESS";
  const at = FORWARD_CHAIN.indexOf(current);
  return at !== -1 && at < FORWARD_CHAIN.length - 1 ? FORWARD_CHAIN[at + 1] : null;
}

/**
 * The steps that make sense from where a row currently stands.
 *
 * For the compact control in a table cell: it is a glanceable triage affordance,
 * and a row of nine icons in a cell is noise. One step forward, one step back
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
  if (current === "REWORK") {
    // READY's twin (0.40, §10.2 decision 4): the step that picks the work up, and the
    // verdicts a released row can still get.
    set.add("IN_PROGRESS");
    for (const off of OFF_CHAIN) set.add(off);
  } else if (at !== -1) {
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
    badgeBg: "bg-danger-soft",
    badgeText: "text-danger",
  },
  BUG: {
    icon: Bug,
    badgeBg: "bg-warning-soft",
    badgeText: "text-warning",
  },
  IDEA: {
    icon: Lightbulb,
    badgeBg: "bg-surface-2",
    badgeText: "text-secondary",
  },
  QUESTION: {
    icon: HelpCircle,
    badgeBg: "bg-surface-2",
    badgeText: "text-secondary",
  },
  OTHER: {
    icon: MoreHorizontal,
    badgeBg: "bg-surface-2",
    badgeText: "text-secondary",
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
