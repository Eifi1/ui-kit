import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../components/toast";
import { useFeedbackToastLabels } from "../feedback/feedback-labels";
import type {
  FeedbackCommentsApi,
  FeedbackCommentsState,
  UseFeedbackCommentsOptions,
} from "../feedback/feedback-comments";
import type { FeedbackComment } from "../feedback/feedback-public-types";

/**
 * One report's comment thread through the app's TanStack cache, so a persisted cache keeps it
 * for offline reading (0.61; Marcel 2026-11-12: "add the offline cache … so both can adopt").
 *
 * `useFeedbackComments` (the main barrel's) holds the thread in memory: the kit's feature
 * areas import no optional peer. keksdose kept its threads in the TanStack cache it persists,
 * so a member offline on `/my-feedback` still read the last comments, and the kit's hook would
 * have shown the offline card there. This is that hook, keksdose's, in the one entry point
 * that may import TanStack. Its answer is the same {@link FeedbackCommentsState}: pass it to
 * `FeedbackPublicPage`'s `thread`, or draw it in the inbox's row as the other hook's.
 *
 * **The keys are keksdose's** ({@link feedbackCommentsQueryKey}), so the threads its persister
 * already holds carry over: `["feedback", "comments", id]` for a member, and
 * `["feedback", "admin", "comments", id]` for an admin. An admin's thread carries what others
 * may not read (hidden comments' bodies, full names), so it is keyed apart for the app's
 * persistence to refuse: keksdose's refuses every key whose second segment is `"admin"`; with
 * `createQueryPersistence`, `shouldPersistKey: (key) => key[1] !== "admin"`.
 *
 * The behaviour is `useFeedbackComments`'s: `pending` while a comment is out, never during a
 * hide or a delete; a failed hide or delete says `feedbackToast.updateFailed`, a failed
 * comment `.commentFailed` (both through `errorMessage`). After a write the thread is read
 * again and `onChanged(id)` refreshes the app's lists. Offline, the read waits (TanStack's
 * paused query): with a cached thread the comments stay on screen; with none, `failed` and
 * `offline` say so, and the read runs once the browser is back.
 */
export function useFeedbackCommentsQuery(
  id: number | null,
  api: FeedbackCommentsApi,
  { admin = false, onChanged, errorMessage }: UseFeedbackCommentsQueryOptions = {},
): FeedbackCommentsState {
  const qc = useQueryClient();
  const toastLabels = useFeedbackToastLabels();
  const queryKey = feedbackCommentsQueryKey(id ?? 0, admin);
  const query = useQuery({
    queryKey,
    queryFn: () => api.comments(id ?? 0).then((comments) => [...comments]),
    enabled: id !== null,
  });

  const settled = async () => {
    await qc.invalidateQueries({ queryKey });
    if (id !== null) onChanged?.(id);
  };
  const failure = (fallback: string) => (error: unknown) => {
    toast.error(errorMessage ? errorMessage(error, fallback) : fallback);
  };
  const comment = useMutation({
    // `attachmentUrl` only with a file, so a text comment calls with two arguments, as the
    // other hook does.
    mutationFn: ({ body, attachmentUrl }: { body: string; attachmentUrl?: string }) =>
      attachmentUrl === undefined ? api.comment(id ?? 0, body) : api.comment(id ?? 0, body, attachmentUrl),
    onSuccess: settled,
    onError: failure(toastLabels.commentFailed),
  });
  const { hideComment, deleteComment } = api;
  const hide = useMutation({
    mutationFn: ({ target, hidden }: { target: FeedbackComment; hidden: boolean }) =>
      hideComment ? hideComment(id ?? 0, target.id, hidden) : Promise.resolve(),
    onSuccess: settled,
    onError: failure(toastLabels.updateFailed),
  });
  const remove = useMutation({
    mutationFn: (target: FeedbackComment) => (deleteComment ? deleteComment(id ?? 0, target.id) : Promise.resolve()),
    onSuccess: settled,
    onError: failure(toastLabels.updateFailed),
  });

  const comments = id === null ? undefined : query.data;
  // Nothing to show of this try: a failed read, or one waiting for the network (paused).
  const paused = query.fetchStatus === "paused";
  const failed = id !== null && comments === undefined && (query.isError || paused);
  return {
    comments,
    loading: id !== null && query.isLoading,
    failed,
    offline: failed && (paused || (typeof navigator !== "undefined" && navigator.onLine === false)),
    retry: () => void query.refetch(),
    pending: comment.isPending,
    onComment: (body, attachmentUrl) => comment.mutateAsync({ body, attachmentUrl }),
    onHide: hideComment ? (target, hidden) => hide.mutateAsync({ target, hidden }) : undefined,
    onDelete: deleteComment ? (target) => remove.mutateAsync(target) : undefined,
  };
}

/** What {@link useFeedbackCommentsQuery} takes beside the report and the client. */
export interface UseFeedbackCommentsQueryOptions extends UseFeedbackCommentsOptions {
  /** The viewer is an admin: the thread is read under the admin's key (hidden bodies, full
   *  names), which the app's persistence keeps off the disk. */
  admin?: boolean;
}

/** The thread's query key — keksdose's: `["feedback", "comments", id]`, or
 *  `["feedback", "admin", "comments", id]` for an admin, whose second segment the app's
 *  persistence refuses. Invalidate `["feedback"]` and both go with every other feedback read. */
export function feedbackCommentsQueryKey(id: number, admin: boolean): readonly unknown[] {
  return admin ? ["feedback", "admin", "comments", id] : ["feedback", "comments", id];
}
