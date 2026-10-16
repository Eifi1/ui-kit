import { useState } from "react";
import { BellOff } from "lucide-react";
import { Select } from "../components/select";
import type { CommitScope } from "../components/write-lock";
import { useKitLabels, useKitLocale, type LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { formatDate } from "../lib/format";
import { FeedbackStatusBadge, selectableFeedbackStatuses, type FeedbackStatus } from "./feedback-inbox";
import { useFeedbackStatusLabels } from "./feedback-labels";
import type { FeedbackReply } from "./feedback-public-types";
import { FEEDBACK_DECIDED_STATUSES, FEEDBACK_REPLY_MAX } from "./feedback-record";
import { ChatComposer } from "./feedback-thread";
import { DEFAULT_FEEDBACK_REPLIES_LABELS } from "./feedback-thread-parts-labels";

/**
 * The admin's answers as a list (docs/feedback-harmonization.md §9.7, decision 5): each
 * reply its own row — who, when, what, and the status it moved the report to — where
 * 0.37 had one `outcome` field that every answer overwrote. {@link FeedbackReplyTimeline}
 * draws them; {@link FeedbackReplyComposer} writes the next one, with the status picker
 * beside it (decision 13: a reply notifies the author, a status alone does not, so the
 * status belongs with the words).
 */

/* ── Labels ───────────────────────────────────────────────────────────────── */

/** The `feedbackReplies` namespace of `<UiKitProvider labels>`. */
export interface FeedbackRepliesLabels {
  /** The timeline's accessible name. de-CH: "Antworten" */
  replies: string;
  /** No reply yet. de-CH: "Noch keine Antwort" */
  empty: string;
  /** A reply without an author — a loop's, a migrated outcome, an erased admin (§9.7).
   *  The app's word for its admin; never "the team". de-CH: "Admin" */
  admin: string;
  /** Read before a reply's status chip ("→ Done"). de-CH: "Status geändert auf" */
  statusChanged: string;
  /** The reply box's accessible name. de-CH: "Antwort schreiben" */
  field: string;
  /** de-CH: "Antwort schreiben…" */
  placeholder: string;
  /** The send button. de-CH: "Antworten" */
  reply: string;
  /** The status picker's accessible name. de-CH: "Status mit der Antwort" */
  status: string;
  /** The picker's first option: the reply changes no status. de-CH: "Keine Änderung" */
  noChange: string;
  /** Above the composer when a decided status was set without a reply (§9.7, B2).
   *  de-CH: "Die meldende Person wurde nicht benachrichtigt. Schreiben Sie eine Antwort." */
  nudge: string;
}

export { DEFAULT_FEEDBACK_REPLIES_LABELS };

/** `feedbackReplies` resolved: English, then `<UiKitProvider labels>`, then `labels`. */
export function useFeedbackRepliesLabels(labels?: LabelOverride<FeedbackRepliesLabels>): FeedbackRepliesLabels {
  return useKitLabels("feedbackReplies", DEFAULT_FEEDBACK_REPLIES_LABELS, labels);
}

/**
 * The status a row detail should nudge toward (§9.7, B2), or `undefined`: the row's
 * status when it is decided ({@link FEEDBACK_DECIDED_STATUSES}) and no reply carries it
 * as its `status_to` — a status-only move from the table, a swipe or the pills told the
 * author nothing. `undefined` too without `replies` (a server before 0.38).
 */
export function feedbackReplyNudge(row: {
  status: FeedbackStatus;
  replies?: readonly Pick<FeedbackReply, "status_to">[] | null;
}): FeedbackStatus | undefined {
  if (!row.replies || !FEEDBACK_DECIDED_STATUSES.includes(row.status)) return undefined;
  return row.replies.some((reply) => reply.status_to === row.status) ? undefined : row.status;
}

/* ── The timeline ─────────────────────────────────────────────────────────── */

export interface FeedbackReplyTimelineProps {
  /** Oldest first, as the server sends them. */
  replies: readonly FeedbackReply[];
  /** How a reply's time reads. Default: the date and time in the provider's locale. */
  renderDate?: (iso: string) => string;
  /** Tag bodies and names `data-private` (a host's screen-share blur). Default true. */
  redact?: boolean;
  labels?: LabelOverride<FeedbackRepliesLabels>;
  className?: string;
}

/**
 * The replies, oldest first, down a rule: each with its author (`null` → "Admin"), its
 * time, the status it set ("→ Done"; the admin view adds where from) and its text. No
 * edit and no delete (§9.7): a correction is a new reply.
 */
export function FeedbackReplyTimeline({
  replies,
  renderDate,
  redact = true,
  labels: labelsProp,
  className,
}: FeedbackReplyTimelineProps) {
  const labels = useFeedbackRepliesLabels(labelsProp);
  const locale = useKitLocale();
  const priv = redact ? "" : undefined;
  if (replies.length === 0) {
    return <p className={cn("text-sm text-placeholder", className)}>{labels.empty}</p>;
  }
  const dateText = (iso: string) =>
    renderDate ? renderDate(iso) : formatDate(iso, { dateStyle: "medium", timeStyle: "short" }, { locale });
  return (
    <ol aria-label={labels.replies} className={cn("space-y-3 border-s-2 border-subtle ps-3", className)}>
      {replies.map((reply) => (
        <li key={reply.id} data-feedback-reply={reply.id} className="min-w-0 text-sm">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted">
            <span data-private={priv} className="font-medium text-secondary">
              {reply.author_name ?? labels.admin}
            </span>
            <time dateTime={reply.created_at} className="tabular-nums">
              {dateText(reply.created_at)}
            </time>
            {reply.status_to && (
              <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1" data-feedback-reply-status={reply.status_to}>
                <span className="sr-only">{labels.statusChanged}</span>
                {reply.status_from && reply.status_from !== reply.status_to && (
                  <>
                    <FeedbackStatusBadge status={reply.status_from} />
                    <span aria-hidden>→</span>
                  </>
                )}
                {!reply.status_from && <span aria-hidden>→</span>}
                <FeedbackStatusBadge status={reply.status_to} />
              </span>
            )}
          </div>
          <p data-private={priv} dir="auto" className="mt-0.5 whitespace-pre-wrap break-words text-start text-primary">
            {reply.body}
          </p>
        </li>
      ))}
    </ol>
  );
}

/* ── The composer ─────────────────────────────────────────────────────────── */

/**
 * The status Select and Reply on one line, one height (keksdose live #417, Android, dark).
 *
 * A field and a button of the same padding are not the same height everywhere: on a touch
 * screen the field's type grows to 16 px (FIELD_TOUCH_TEXT, so iOS does not zoom) and its
 * box with it, while the button keeps its 14 px line — and at Large the button takes its
 * 48 px touch floor, which the field has not. So the composer's action row stretches its
 * two halves to one height and Reply fills it (Button's `stretch`, which is the kit's
 * answer for a button beside a taller field). Scoped to this composer through the marks
 * ChatComposer puts on its row: a host slot with an attachment preview must not drag the
 * send button to the preview's 80 px.
 *
 * On a touch screen the "Ctrl+Enter to send" hint has no keyboard to speak of, and beside
 * a field-height select it pushed Reply onto a line of its own on a phone — it is
 * visually hidden there (still read in order). At Large the button's 48 px floor is
 * taller than any field, here as in every form row of the kit.
 */
const REPLY_ROW_ALIGN = cn(
  "[&_[data-chat-composer-actions]]:items-stretch",
  "[&_[data-chat-composer-send]]:self-stretch",
  "pointer-coarse:[&_[data-chat-composer-hint]]:sr-only",
);

export interface FeedbackReplyComposerProps {
  /** The report's status now — what "No change" keeps. */
  status: FeedbackStatus;
  /**
   * `POST /feedback/{id}/replies` — the body (1–{@link FEEDBACK_REPLY_MAX} after
   * trimming) and the status picked, `undefined` for "No change". Return the promise:
   * the box clears when it resolves, and keeps everything on a rejection.
   */
  onReply: (body: string, status?: FeedbackStatus) => void | Promise<unknown>;
  /** The reply is in flight. */
  pending?: boolean;
  /** Preselect this status and say the author has not been told (§9.7, the nudge) —
   *  {@link feedbackReplyNudge}. */
  suggestedStatus?: FeedbackStatus;
  /** Reply COMMITS — see ChatComposer's `commit`. */
  commit?: CommitScope;
  labels?: LabelOverride<FeedbackRepliesLabels>;
  className?: string;
}

/**
 * The admin's reply box (§9.7): the text, the **status** to set with it ("No change"
 * first, then every status — {@link selectableFeedbackStatuses}), and **Reply**. A
 * {@link ChatComposer} underneath: Ctrl/⌘+Enter sends, the count runs to 8 000, a draft
 * typed while a reply is in flight stays.
 *
 * With `suggestedStatus` the line "The author has not been told. Add a reply." stands
 * above it and that status is picked, so the reply that answers it records the status
 * and the nudge goes away.
 */
export function FeedbackReplyComposer({
  status,
  onReply,
  pending = false,
  suggestedStatus,
  commit,
  labels: labelsProp,
  className,
}: FeedbackReplyComposerProps) {
  const labels = useFeedbackRepliesLabels(labelsProp);
  const statusNames = useFeedbackStatusLabels();
  // The pick, valid for the suggestion it was made under: a new suggestion (another
  // status set from the table) picks itself again.
  const [pick, setPick] = useState<{ under: FeedbackStatus | undefined; value: FeedbackStatus | "" }>({
    under: suggestedStatus,
    value: suggestedStatus ?? "",
  });
  const picked = pick.under === suggestedStatus ? pick.value : (suggestedStatus ?? "");

  const send = (body: string) => {
    const sent = picked;
    return Promise.resolve(onReply(body, sent || undefined)).then(() => {
      setPick((current) => (current.value === sent ? { under: suggestedStatus, value: "" } : current));
    });
  };

  return (
    <div className={cn("space-y-2", REPLY_ROW_ALIGN, className)} data-feedback-reply-composer="">
      {suggestedStatus && (
        <p className="flex items-start gap-1.5 text-xs text-secondary" data-feedback-nudge={suggestedStatus}>
          <BellOff className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
          <span>{labels.nudge}</span>
        </p>
      )}
      <ChatComposer
        onSend={send}
        pending={pending}
        commit={commit}
        maxLength={FEEDBACK_REPLY_MAX}
        showCount
        labels={{ field: labels.field, placeholder: labels.placeholder, send: labels.reply }}
        attachmentSlot={
          // The kit's standard Select at field height (#417: "not invent new things where
          // there are usable ones already") — `size="sm"` was a 28 px box beside the
          // 38 px Reply. See REPLY_ROW_ALIGN for how the two keep one height.
          <Select
            aria-label={labels.status}
            value={picked}
            disabled={pending}
            onChange={(event) =>
              setPick({ under: suggestedStatus, value: event.target.value as FeedbackStatus | "" })
            }
            data-feedback-reply-status-pick=""
          >
            <option value="">{labels.noChange}</option>
            {selectableFeedbackStatuses(status).map((value) => (
              <option key={value} value={value}>
                {statusNames[value]}
              </option>
            ))}
          </Select>
        }
      />
    </div>
  );
}
