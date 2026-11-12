import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "../components/toast";
import { useFeedbackToastLabels } from "./feedback-labels";
import type { FeedbackComment } from "./feedback-public-types";

/**
 * One report's comment thread, read and written (0.61; docs/feedback-harmonization.md
 * §9.8, §14.3): the list, and the three writes `FeedbackCommentThread` offers — a comment,
 * an admin's hide or unhide, the writer's delete.
 *
 * keksdose (`frontend/src/features/feedback/use-feedback-comments.ts`) and Kurvenschmiede
 * (`frontend/src/features/feedback/use-feedback-conversation.ts`, `useReportConversation`)
 * each wrote it, over the same four calls of their API client, and the two had drifted in
 * what they told the reader:
 *
 * - **`pending`** — keksdose's was true while a comment, a hide OR a delete was out, so an
 *   admin's Hide set the composer's Send spinning (`aria-busy`) and locked its file field,
 *   as if a comment were being sent. Kurvenschmiede's is the comment alone, which is what
 *   the thread's `pending` means ("A comment is being sent"). Kurvenschmiede's, here.
 * - **The failure's words** — keksdose toasted "Could not post the comment." for a hide and
 *   a delete too. Kurvenschmiede says `feedbackToast.updateFailed` ("Could not save that
 *   change.") for those two, as the thread's own `onHide` documents. Kurvenschmiede's, here.
 *
 * No TanStack in here, as `useFeedbackSubmit`: the four calls are plain promises — the
 * app's API client, `feedbackApi` in both apps, whose methods already have these names —
 * so the hook runs in any app, and the kit's feature areas import no optional peer
 * (packaging-contract.test.ts). The thread is held here, in memory, for as long as the
 * report is open: nothing of it reaches a persisted cache (keksdose kept an admin's
 * thread, with hidden bodies and full names, out of its persister by hand).
 */

/** The four requests the thread makes — the app's API client (`feedbackApi`), passed as it
 *  is. Hide and Delete are optional: without one, the thread offers no such button. */
export interface FeedbackCommentsApi {
  /** `GET /feedback/{id}/comments`, oldest first. */
  comments: (id: number) => Promise<readonly FeedbackComment[]>;
  /** `POST /feedback/{id}/comments`. `attachmentUrl` (§12) is passed only with a file, so
   *  a text comment calls with two arguments. */
  comment: (id: number, body: string, attachmentUrl?: string) => Promise<unknown>;
  /** `PATCH /feedback/{id}/comments/{commentId} {hidden}` — the admin's. */
  hideComment?: (id: number, commentId: number, hidden: boolean) => Promise<unknown>;
  /** `DELETE /feedback/{id}/comments/{commentId}` — the writer's own. */
  deleteComment?: (id: number, commentId: number) => Promise<unknown>;
}

export interface UseFeedbackCommentsOptions {
  /**
   * A write landed: the place to refresh the app's feedback lists. A comment moves the
   * report's `comment_count` wherever it is listed, and a hide moves it for everyone but
   * the admin — keksdose and Kurvenschmiede invalidate their whole feedback prefix here.
   * The thread itself is read again by the hook.
   */
  onChanged?: (id: number) => void;
  /**
   * The failure toast's text from what a write rejected with — the app's own
   * `extractApiErrorMessage(err, fallback)` (keksdose) / `apiErrorMessage` (Kurvenschmiede),
   * so the server's `detail` wins (§3.7). Without it: `feedbackToast.commentFailed` for a
   * comment, `feedbackToast.updateFailed` for a hide or a delete.
   */
  errorMessage?: (error: unknown, fallback: string) => string;
}

/** What {@link useFeedbackComments} returns — `FeedbackPublicDetail`'s and
 *  `FeedbackCommentThread`'s props, and the read's state for a page that draws it. */
export interface FeedbackCommentsState {
  /** The thread, oldest first; `undefined` until the first answer (the thread's loading
   *  state — `FeedbackPublicDetail`'s `comments`), and for no report. A later read that
   *  fails keeps what is on screen. */
  comments: readonly FeedbackComment[] | undefined;
  /** The first read is out (or a Try again after a failed one). */
  loading: boolean;
  /** The read failed, and there is no answer of this try to show. */
  failed: boolean;
  /** …and the browser said it was offline when it did. The hook reads again by itself
   *  once the browser is back online. */
  offline: boolean;
  /** Read the thread again — a Try again's. */
  retry: () => void;
  /** A comment is being sent — the composer's Send waits. Not a hide or a delete. */
  pending: boolean;
  /** Send a comment; resolves once it is on the thread (the box then clears), rejects —
   *  after the toast — when the server refused it (the box keeps the draft). */
  onComment: (body: string, attachmentUrl?: string) => Promise<unknown>;
  /** Hide or unhide — with the api's `hideComment`. Give it to the admin only. */
  onHide?: (comment: FeedbackComment, hidden: boolean) => Promise<unknown>;
  /** Delete one's own comment — with the api's `deleteComment`. */
  onDelete?: (comment: FeedbackComment) => Promise<unknown>;
}

/** One settled read: the report it answered, the try it belongs to, and what came back. */
interface Read {
  id: number;
  attempt: number;
  comments: readonly FeedbackComment[] | undefined;
  failed: boolean;
  offline: boolean;
}

const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;
const done = async () => undefined;

/**
 * `useFeedbackComments(id, api, options?)` — the thread of report `id`, through the app's
 * API client. `null` reads nothing (no report open; a CRASH report, or a reader the
 * server keeps out of the public parts, whom it would answer 404 — Kurvenschmiede's
 * `enabled: false`).
 *
 * ```tsx
 * const thread = useFeedbackComments(row.id, feedbackApi, {
 *   errorMessage: extractApiErrorMessage,
 *   onChanged: () => qc.invalidateQueries({ queryKey: queryKeys.feedback.all }),
 * });
 * <FeedbackCommentThread comments={thread.comments ?? []} loading={thread.loading} isAdmin={isAdmin}
 *   onComment={thread.onComment} onHide={isAdmin ? thread.onHide : undefined} onDelete={thread.onDelete}
 *   pending={thread.pending} />
 * ```
 *
 * After each write the thread is read again before the write's promise settles, so the
 * composer clears as the new comment appears rather than a beat before it. The api is
 * read through a ref: an inline object does not read the thread again on every render.
 */
export function useFeedbackComments(
  id: number | null,
  api: FeedbackCommentsApi,
  { onChanged, errorMessage }: UseFeedbackCommentsOptions = {},
): FeedbackCommentsState {
  const toastLabels = useFeedbackToastLabels();
  const apiRef = useRef(api);
  useEffect(() => {
    apiRef.current = api;
  });
  const [attempt, setAttempt] = useState(0);
  const [read, setRead] = useState<Read | null>(null);
  // Comments in flight, per report: a send for the report just closed must not set the
  // next one's Send spinning.
  const [sending, setSending] = useState<Readonly<Record<number, number>>>({});
  // Only the newest read lands: a thread read for the report before, or the read a write
  // started before a Try again, must not overwrite the one that came after it.
  const latest = useRef(0);

  // The read answers one report. Another id drops it while rendering (useAuthedSrc's
  // reasoning, BUG-3): a report opened after another must not show the other's thread
  // for a render.
  if (read !== null && read.id !== id) setRead(null);

  const load = useCallback((target: number, tried: number) => {
    const mine = ++latest.current;
    return apiRef.current.comments(target).then(
      (comments) => {
        if (mine === latest.current) setRead({ id: target, attempt: tried, comments, failed: false, offline: false });
      },
      () => {
        if (mine !== latest.current) return;
        // A failed read keeps the thread it had: a write's read again that fails is no
        // reason to blank the comments on screen.
        setRead((prev) => ({
          id: target,
          attempt: tried,
          comments: prev?.id === target ? prev.comments : undefined,
          failed: true,
          offline: isOffline(),
        }));
      },
    );
  }, []);

  // No cleanup: the next report's read (or the Try again's) is the newer one, so whatever
  // the last one had in flight is dropped when it lands; and a read for a report since
  // closed answers an id the render above drops.
  useEffect(() => {
    if (id !== null) void load(id, attempt);
  }, [id, attempt, load]);

  const settled = read !== null && read.id === id && read.attempt === attempt;
  const failed = settled && read.failed;
  // Offline, a read fails at once and would wait for a Try again nobody knows to press;
  // keksdose's TanStack query resumed by itself on reconnect (`networkMode`), and so does
  // this.
  useEffect(() => {
    if (!failed) return;
    const again = () => setAttempt((n) => n + 1);
    window.addEventListener("online", again);
    return () => window.removeEventListener("online", again);
  }, [failed]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (id === null) {
    return {
      comments: undefined,
      loading: false,
      failed: false,
      offline: false,
      retry,
      pending: false,
      onComment: done,
      onHide: api.hideComment ? done : undefined,
      onDelete: api.deleteComment ? done : undefined,
    };
  }
  const target = id;

  /** One write: the toast and the rethrow on a refusal (the thread puts back what it
   *  showed, the composer keeps the draft); on success the app's refresh and this
   *  thread's read again. */
  const write = async (call: () => Promise<unknown>, fallback: string) => {
    try {
      await call();
    } catch (error) {
      toast.error(errorMessage ? errorMessage(error, fallback) : fallback);
      throw error;
    }
    onChanged?.(target);
    await load(target, attempt);
  };
  const { hideComment, deleteComment } = api;
  const comments = read?.id === target ? read.comments : undefined;

  return {
    comments,
    loading: comments === undefined && !failed,
    failed,
    offline: failed && read !== null && read.offline,
    retry,
    pending: (sending[target] ?? 0) > 0,
    onComment: async (body, attachmentUrl) => {
      setSending((all) => ({ ...all, [target]: (all[target] ?? 0) + 1 }));
      try {
        await write(
          () => (attachmentUrl === undefined ? api.comment(target, body) : api.comment(target, body, attachmentUrl)),
          toastLabels.commentFailed,
        );
      } finally {
        setSending((all) => ({ ...all, [target]: (all[target] ?? 1) - 1 }));
      }
    },
    onHide: hideComment
      ? (comment, hidden) => write(() => hideComment(target, comment.id, hidden), toastLabels.updateFailed)
      : undefined,
    onDelete: deleteComment
      ? (comment) => write(() => deleteComment(target, comment.id), toastLabels.updateFailed)
      : undefined,
  };
}
