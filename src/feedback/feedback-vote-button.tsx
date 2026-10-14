import { useRef, useState } from "react";
import { ThumbsUp } from "lucide-react";
import { Button } from "../components/button";
import { Tooltip } from "../components/tooltip";
import type { CommitScope } from "../components/write-lock";
import { useKitLabels, useKitLocale, type LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { formatNumber } from "../lib/format";
import type { FeedbackVoteState } from "./feedback-public-types";
import { DEFAULT_FEEDBACK_VOTE_LABELS } from "./feedback-thread-parts-labels";

/**
 * "I want this too" — the one rating a report has (docs/feedback-harmonization.md §9.6,
 * decision 2): an upvote, one per person, a count. No down-vote, no stars.
 *
 * - **A toggle** (`aria-pressed`): the thumb, the count, and "I want this too" as its
 *   name — written out at `size="md"`, the Tooltip and the accessible name at `"sm"`
 *   (a list row's cell).
 * - **Optimistic with rollback:** the press shows the new state at once, `onVote(next)`
 *   sends `PUT` (`true`) or `DELETE` (`false`) and its answer — the server's count —
 *   replaces the guess; a rejection puts back what was there. The error is the app's
 *   to toast (its mutation's `onError`), as with every kit part that takes a promise.
 * - **The author's own report** counts as their vote (§9.6, decision 20): `own` shows it
 *   pressed and `aria-disabled` with "Your report" as the reason (the server would
 *   answer 409).
 * - A new `votes` / `voted` from the app (a refetch) wins over the last answer.
 */

/** The `feedbackVote` namespace of `<UiKitProvider labels>`. */
export interface FeedbackVoteLabels {
  /** The button's name. de-CH: "Will ich auch" */
  vote: string;
  /** Why the author's own button is disabled. de-CH: "Ihr Bericht" */
  own: string;
}

export { DEFAULT_FEEDBACK_VOTE_LABELS };

export interface FeedbackVoteButtonProps {
  /** People who want this — the author's own vote included. */
  votes: number;
  /** The viewer has voted. */
  voted: boolean;
  /** The viewer filed it: pressed, disabled, "Your report". */
  own?: boolean;
  /** `PUT` (`next` true) or `DELETE` (`false`) `/feedback/{id}/vote`; resolve with the
   *  answer, reject to roll back. */
  onVote: (next: boolean) => Promise<FeedbackVoteState>;
  /** Not now (e.g. a demo): plain `disabled`. A string is the reason, as Button's. */
  disabled?: boolean | string;
  /** The vote COMMITS — see Button's `commit`. */
  commit?: CommitScope;
  /** `"sm"`: the count alone, for a table cell. Default `"md"`. */
  size?: "sm" | "md";
  labels?: LabelOverride<FeedbackVoteLabels>;
  className?: string;
}

export function FeedbackVoteButton({
  votes,
  voted,
  own = false,
  onVote,
  disabled = false,
  commit,
  size = "md",
  labels: labelsProp,
  className,
}: FeedbackVoteButtonProps) {
  const labels = useKitLabels("feedbackVote", DEFAULT_FEEDBACK_VOTE_LABELS, labelsProp);
  const locale = useKitLocale();
  // The last press's state, valid only while the app's props are still the ones it was
  // pressed against: a refetch that brings new numbers is the truth.
  const [shown, setShown] = useState<{ base: FeedbackVoteState; state: FeedbackVoteState } | null>(null);
  const busy = useRef(false);
  const current =
    shown && shown.base.votes === votes && shown.base.voted === voted ? shown.state : { votes, voted };
  const pressed = own || current.voted;

  const press = () => {
    if (own || disabled || busy.current) return;
    const base = { votes, voted };
    const before = current;
    const next = !before.voted;
    busy.current = true;
    setShown({ base, state: { votes: Math.max(0, before.votes + (next ? 1 : -1)), voted: next } });
    onVote(next).then(
      (answer) => setShown({ base, state: { votes: answer.votes, voted: answer.voted } }),
      () => setShown({ base, state: before }),
    ).finally(() => {
      busy.current = false;
    });
  };

  const count = formatNumber(current.votes, { locale });
  const button = (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      pressed={pressed}
      commit={own ? undefined : commit}
      disabled={disabled === true}
      disabledReason={own ? labels.own : typeof disabled === "string" ? disabled : undefined}
      onClick={(event) => {
        // A row around it may expand on a click.
        event.stopPropagation();
        press();
      }}
      data-feedback-vote=""
      className={cn("gap-1.5", className)}
    >
      <ThumbsUp className="size-3.5 shrink-0" aria-hidden />
      <span className={size === "sm" ? "sr-only" : undefined}>{labels.vote}</span>
      <span className="tabular-nums" data-feedback-votes="">
        {count}
      </span>
    </Button>
  );
  // At "sm" the name is not on screen: the Tooltip shows it (the own reason has its own).
  return size === "sm" && !own ? <Tooltip label={labels.vote}>{button}</Tooltip> : button;
}
