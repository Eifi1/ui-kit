import { Switch } from "../components/switch";
import type { CommitScope } from "../components/write-lock";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { FEEDBACK_AUTHOR_EDITABLE_STATUSES, type FeedbackRecord } from "./feedback-record";
import { DEFAULT_FEEDBACK_PUBLIC_LABELS, type FeedbackPublicLabels } from "./feedback-public-labels";

/** What the switch reads off a report: {@link FeedbackRecord}'s fields (§9.3). */
export type FeedbackPublicSwitchRow = Pick<
  FeedbackRecord,
  "user_id" | "category" | "status" | "public" | "filed_private" | "mine"
>;

/** Who is looking: the app's admin check, and the signed-in user's id. */
export interface FeedbackPublicSwitchViewer {
  isAdmin: boolean;
  viewerId?: number | null;
}

/** The viewer filed the row — `mine` when the server sent it, else the ids (never for an
 *  erased author, `user_id: null`). */
function isAuthorOf(row: FeedbackPublicSwitchRow, viewerId: number | null | undefined): boolean {
  if (row.mine !== undefined) return row.mine;
  return row.user_id !== null && viewerId !== undefined && viewerId !== null && row.user_id === viewerId;
}

/**
 * Whether the viewer may flip a report's `public` flag — the server's rule (§9.3), so the
 * switch never offers what the `PATCH {public}` would refuse with a 403:
 *
 * - never on a CRASH (decision 9: a crash is private whatever its flag);
 * - an admin, at any status;
 * - the author while the status is OPEN, READY or IN_PROGRESS
 *   (`FEEDBACK_AUTHOR_EDITABLE_STATUSES`), and on a `filed_private` report — one the
 *   0.38 migration made public — at any status: that is the opt-out the notice offers.
 */
export function feedbackPublicSwitchAllowed(
  row: FeedbackPublicSwitchRow,
  { isAdmin, viewerId }: FeedbackPublicSwitchViewer,
): boolean {
  if (row.category === "CRASH") return false;
  if (isAdmin) return true;
  if (!isAuthorOf(row, viewerId)) return false;
  return row.filed_private === true || FEEDBACK_AUTHOR_EDITABLE_STATUSES.includes(row.status);
}

export interface FeedbackPublicSwitchProps extends FeedbackPublicSwitchViewer {
  row: FeedbackPublicSwitchRow;
  /** `PATCH /feedback/{id} {"public": next}` — the app's mutation. */
  onChange: (next: boolean) => void;
  /** The PATCH is in flight: the switch holds still. */
  pending?: boolean;
  /** Flipping it SAVES: pass `true` to put it under the page's `WriteLockProvider`
   *  (Switch's `commit`). Off by default, as on the inbox's status buttons. */
  commit?: CommitScope;
  /** Over the `feedbackPublic` namespace (`visibleToOthers`, `visibleHint`,
   *  `visibleLocked`). */
  labels?: LabelOverride<FeedbackPublicLabels>;
  className?: string;
}

/**
 * **Visible to others** — a report's `public` flag (round 0.38, docs/feedback-harmonization.md
 * §9.3, decision 6), for the row detail (`FeedbackRowDetail`'s `onPublicChange`) or an
 * app's own page.
 *
 * - Drawn for the admin and the author only: nobody else is sent `public` (§9.10). Not
 *   drawn on a CRASH, and not when the row carries no `public` at all (a server before
 *   0.38, or an app without public parts — kastlan).
 * - The author past the open window sees it **locked with the reason** ("Only while the
 *   report is open"), focusable, so the reason reaches a keyboard; a `filed_private`
 *   report is never locked for its author ({@link feedbackPublicSwitchAllowed}).
 * - The line under it says what "visible" means: the title and the text, never the
 *   screenshots or files (decision 1).
 */
export function FeedbackPublicSwitch({
  row,
  isAdmin,
  viewerId,
  onChange,
  pending = false,
  commit,
  labels: labelsProp,
  className,
}: FeedbackPublicSwitchProps) {
  const labels = useKitLabels("feedbackPublic", DEFAULT_FEEDBACK_PUBLIC_LABELS, labelsProp);
  if (row.category === "CRASH" || row.public === undefined) return null;
  if (!isAdmin && !isAuthorOf(row, viewerId)) return null;
  const allowed = feedbackPublicSwitchAllowed(row, { isAdmin, viewerId });
  return (
    <Switch
      className={className}
      label={labels.visibleToOthers}
      description={labels.visibleHint}
      checked={row.public}
      disabled={pending}
      disabledReason={allowed ? undefined : labels.visibleLocked}
      commit={commit}
      onCheckedChange={(next) => onChange(next)}
      data-feedback-public={row.public ? "on" : "off"}
    />
  );
}
