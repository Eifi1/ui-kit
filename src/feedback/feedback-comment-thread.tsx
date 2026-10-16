import { useContext } from "react";
import type { ReactNode } from "react";
import { EyeOff } from "lucide-react";
import { Button } from "../components/button";
import { useConfirm } from "../components/confirm-dialog";
import type { CommitScope } from "../components/write-lock";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { FeedbackStatusBadge } from "./feedback-inbox";
import type { FeedbackComment, FeedbackReply } from "./feedback-public-types";
import { DEFAULT_FEEDBACK_PUBLIC_LABELS } from "./feedback-public-labels";
import { FEEDBACK_COMMENT_MAX, attachmentName } from "./feedback-record";
import { useFeedbackRepliesLabels } from "./feedback-replies";
import { FeedbackRepliesDrawnAboveContext } from "./feedback-replies-context";
import { FeedbackReworkEntryChip } from "./feedback-rework-entry-chip";
import { ChatComposer, FeedbackThread } from "./feedback-thread";
import type { FeedbackThreadMessage } from "./feedback-thread";
import { DEFAULT_FEEDBACK_COMMENTS_LABELS } from "./feedback-thread-parts-labels";

/**
 * A report's conversation as everyone who may read it sees it
 * (docs/feedback-harmonization.md §9.8): the admin's replies and other people's
 * comments, each its own row, oldest first — merged by time, on the
 * {@link FeedbackThread} look — and the box to add one.
 *
 * - **Replies** are drawn as staff posts with the status they set ("→ Done"); a reply
 *   without an author is "Admin" (§9.7).
 * - **Reworks** (0.40, §10.3, `kind: "rework"`) are the report's author's: the
 *   **Rework** chip, "→ status" when the entry moved one (a migrated one did not), the
 *   file when the view carries it; at the reading end for the author ({@link
 *   FeedbackCommentThreadProps.isAuthor}), and a `null` name is "A user", never "Admin".
 * - **Comments**: the viewer's own at the reading end ("You"); someone else's under the
 *   first name the server sent, `null` as "A user" (§9.5, `feedbackPublic.anonymous`).
 * - **Hidden** (§9.8): others see "Hidden by an admin" and no name, no text; the writer
 *   sees their text with that line; the admin sees it struck through, with **Unhide**.
 *   An admin has **Hide** on every visible comment; the writer **Delete** on their own,
 *   after a confirm (it is a hard delete). Nobody edits a comment.
 * - **The composer** (1–4 000 characters, no files) only with `onComment`: left out for
 *   a reader who may not write (a demo, a CRASH report — the app knows).
 *
 * Delete asks through `useConfirm`, so a thread with `onDelete` and a comment of the
 * viewer's needs the app's `ConfirmProvider` (each app mounts one already).
 */

/* ── Labels ───────────────────────────────────────────────────────────────── */

/** The `feedbackComments` namespace of `<UiKitProvider labels>`. A `null` name is
 *  `feedbackPublic.anonymous`, the public pages' word, so the two say the same. */
export interface FeedbackCommentsLabels {
  /** The thread's accessible name. de-CH: "Kommentare" */
  comments: string;
  /** Nothing yet. de-CH: "Noch keine Kommentare" */
  empty: string;
  /** In place of a hidden comment. de-CH: "Von einem Admin ausgeblendet" */
  hidden: string;
  /** The admin's button. de-CH: "Ausblenden" */
  hide: string;
  /** The admin's button on a hidden comment. de-CH: "Einblenden" */
  unhide: string;
  /** The writer's button. de-CH: "Löschen" */
  delete: string;
  /** The confirm's question. de-CH: "Diesen Kommentar löschen?" */
  deleteTitle: string;
  /** The confirm's line. de-CH: "Er wird für alle entfernt. Das kann nicht rückgängig
   *  gemacht werden." */
  deleteBody: string;
  /** The box's accessible name. de-CH: "Kommentar schreiben" */
  field: string;
  /** de-CH: "Kommentar schreiben…" */
  placeholder: string;
  /** The send button. de-CH: "Kommentieren" */
  send: string;
}

export { DEFAULT_FEEDBACK_COMMENTS_LABELS };

/* ── The thread ───────────────────────────────────────────────────────────── */

export interface FeedbackCommentThreadProps {
  /** The report's replies (§9.7), oldest first. Left out or `[]`: none.
   *
   *  Inside `FeedbackRowDetail`'s `comments` they are dropped (0.38.1): the detail's
   *  Replies section draws them already, and the thread there is the comments alone —
   *  so passing them there cannot draw them twice. */
  replies?: readonly FeedbackReply[];
  /** `GET /feedback/{id}/comments`, oldest first. */
  comments: readonly FeedbackComment[];
  /** The viewer is the app's admin: Hide / Unhide, the hidden text struck through. */
  isAdmin: boolean;
  /** 0.40: the viewer filed the report (the record's `mine`) — its rework entries are
   *  theirs, drawn at the reading end as "You". Default `false`. */
  isAuthor?: boolean;
  /** `POST /feedback/{id}/comments`. Return the promise: the box clears when it
   *  resolves, and keeps the draft when it rejects. A failure is the app's to toast —
   *  the server's `detail`, else `feedbackToast.commentFailed` (0.38.1). Left out, no
   *  composer. */
  onComment?: (body: string) => void | Promise<unknown>;
  /** `PATCH /feedback/{id}/comments/{comment_id} {hidden}` — the admin's. A rejection
   *  is caught (0.38.1) and is the app's to toast (`feedbackToast.updateFailed`). Left
   *  out, no Hide / Unhide. */
  onHide?: (comment: FeedbackComment, hidden: boolean) => void | Promise<unknown>;
  /** `DELETE /feedback/{id}/comments/{comment_id}` — the writer's own, after the
   *  confirm. Left out, no Delete. */
  onDelete?: (comment: FeedbackComment) => void | Promise<unknown>;
  /** A comment is being sent. */
  pending?: boolean;
  /** The comments are loading. */
  loading?: boolean;
  /** Comment, Hide and Delete COMMIT — see Button's `commit`. */
  commit?: CommitScope;
  /** "Now" for the relative times — pin it in tests and stories. */
  now?: Date | number;
  labels?: LabelOverride<FeedbackCommentsLabels>;
  className?: string;
}

type Entry = { at: number; order: number; message: FeedbackThreadMessage };

/** The admin's Hide / Unhide as a promise — a sync throw or a `void` return included —
 *  so the click can catch it as Delete's does. */
const hideComment = async (
  onHide: NonNullable<FeedbackCommentThreadProps["onHide"]>,
  comment: FeedbackComment,
) => {
  await onHide(comment, !comment.hidden);
};

const instant = (iso: string) => {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
};

export function FeedbackCommentThread({
  replies: repliesProp = [],
  comments,
  isAdmin,
  isAuthor = false,
  onComment,
  onHide,
  onDelete,
  pending = false,
  loading = false,
  commit,
  now,
  labels: labelsProp,
  className,
}: FeedbackCommentThreadProps) {
  const labels = useKitLabels("feedbackComments", DEFAULT_FEEDBACK_COMMENTS_LABELS, labelsProp);
  const anonymous = useKitLabels("feedbackPublic", DEFAULT_FEEDBACK_PUBLIC_LABELS).anonymous;
  const replyLabels = useFeedbackRepliesLabels();
  const repliesDrawnAbove = useContext(FeedbackRepliesDrawnAboveContext);
  const replies = repliesDrawnAbove ? [] : repliesProp;

  const entries: Entry[] = [];
  replies.forEach((reply, order) => {
    if (reply.kind === "rework") {
      entries.push({
        at: instant(reply.created_at),
        order,
        message: {
          id: `reply-${reply.id}`,
          own: isAuthor,
          author: isAuthor ? undefined : (reply.author_name ?? anonymous),
          createdAt: reply.created_at,
          body: reply.body,
          attachments: reply.attachment_url
            ? [{ name: attachmentName(reply.attachment_url), url: reply.attachment_url }]
            : undefined,
          badge: (
            <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1" data-feedback-entry-kind="rework">
              <FeedbackReworkEntryChip />
              {reply.status_to && (
                <span className="inline-flex items-center gap-1" data-feedback-reply-status={reply.status_to}>
                  <span className="sr-only">{replyLabels.statusChanged}</span>
                  <span aria-hidden>→</span>
                  <FeedbackStatusBadge status={reply.status_to} />
                </span>
              )}
            </span>
          ),
        },
      });
      return;
    }
    entries.push({
      at: instant(reply.created_at),
      order,
      message: {
        id: `reply-${reply.id}`,
        author: reply.author_name ?? replyLabels.admin,
        createdAt: reply.created_at,
        body: reply.body,
        staff: true,
        badge: reply.status_to ? (
          <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1" data-feedback-reply-status={reply.status_to}>
            <span className="sr-only">{replyLabels.statusChanged}</span>
            <span aria-hidden>→</span>
            <FeedbackStatusBadge status={reply.status_to} />
          </span>
        ) : undefined,
      },
    });
  });
  comments.forEach((comment, index) => {
    // Shown as hidden — no name, no text — to anyone but its writer and an admin.
    const veiled = comment.hidden && !comment.mine && !isAdmin;
    const actions: ReactNode[] = [];
    if (comment.hidden) {
      actions.push(
        <span key="hidden" className="inline-flex items-center gap-1" data-feedback-comment-hidden="">
          <EyeOff className="size-3" aria-hidden />
          {labels.hidden}
        </span>,
      );
    }
    if (isAdmin && onHide) {
      actions.push(
        <Button
          key="hide"
          type="button"
          variant="link"
          tone="muted"
          size="sm"
          commit={commit}
          // Caught as Delete's is (0.38.1): a rejection is the app's to toast — its
          // mutation's `onError` — and must not surface as an unhandled one.
          onClick={() => void hideComment(onHide, comment).catch(() => {})}
        >
          {comment.hidden ? labels.unhide : labels.hide}
        </Button>,
      );
    }
    if (comment.mine && onDelete) {
      actions.push(
        <DeleteCommentButton key="delete" comment={comment} onDelete={onDelete} commit={commit} labels={labels} />,
      );
    }
    entries.push({
      at: instant(comment.created_at),
      // Replies first on a tie, then the comments in their order.
      order: replies.length + index,
      message: {
        id: `comment-${comment.id}`,
        own: comment.mine,
        author: veiled ? undefined : comment.mine ? undefined : (comment.author_name ?? anonymous),
        createdAt: comment.created_at,
        body: veiled ? "" : (comment.body ?? ""),
        staff: !veiled && comment.staff,
        struck: comment.hidden && isAdmin && !veiled,
        footer: actions.length > 0 ? actions : undefined,
      },
    });
  });
  entries.sort((a, b) => a.at - b.at || a.order - b.order);

  return (
    <div className={className} data-feedback-comment-thread="">
      <FeedbackThread
        messages={entries.map((entry) => entry.message)}
        loading={loading}
        now={now}
        labels={{ thread: labels.comments, empty: labels.empty }}
      />
      {onComment && (
        <ChatComposer
          className="mt-3"
          onSend={(body) => onComment(body)}
          pending={pending}
          commit={commit}
          maxLength={FEEDBACK_COMMENT_MAX}
          showCount
          labels={{ field: labels.field, placeholder: labels.placeholder, send: labels.send }}
        />
      )}
    </div>
  );
}

/** The writer's Delete: a confirm (danger tone, focus on Cancel), then `onDelete`. Its
 *  own component, so `useConfirm` — which needs a `ConfirmProvider` — is only called
 *  where there is something to delete. */
function DeleteCommentButton({
  comment,
  onDelete,
  commit,
  labels,
}: {
  comment: FeedbackComment;
  onDelete: (comment: FeedbackComment) => void | Promise<unknown>;
  commit?: CommitScope;
  labels: FeedbackCommentsLabels;
}) {
  const confirm = useConfirm();
  const remove = async () => {
    const ok = await confirm({
      title: labels.deleteTitle,
      body: labels.deleteBody,
      confirmLabel: labels.delete,
      tone: "danger",
      commit,
    });
    if (ok) await onDelete(comment);
  };
  return (
    <Button
      type="button"
      variant="link"
      tone="danger"
      size="sm"
      commit={commit}
      onClick={() => void remove().catch(() => {})}
    >
      {labels.delete}
    </Button>
  );
}
