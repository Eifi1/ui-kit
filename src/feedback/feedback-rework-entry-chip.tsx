import { Chip } from "../components/chip";
import { useKitLabels } from "../i18n/kit-labels";
import { DEFAULT_FEEDBACK_PAGE_LABELS } from "./feedback-table-labels";

/**
 * The **Rework** chip on an author's rework entry (0.40, docs/feedback-harmonization.md
 * §10.3) — the table's own `feedbackPage.reworkChip(1)` and tone, so the entry and the
 * row's chip say the same. Drawn by `FeedbackReplyTimeline` and `FeedbackCommentThread`.
 * Internal: not re-exported.
 */
export function FeedbackReworkEntryChip({ className }: { className?: string }) {
  const pageLabels = useKitLabels("feedbackPage", DEFAULT_FEEDBACK_PAGE_LABELS);
  return (
    <Chip size="sm" tone="warning" caps className={className} data-feedback-entry-rework="">
      {pageLabels.reworkChip(1)}
    </Chip>
  );
}
