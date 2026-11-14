import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

import { LoadingState } from "../components/loading-state";
import { toast } from "../components/toast";
import { captureAppScreenshot } from "../feedback/feedback-capture";
import { FeedbackCommentThread } from "../feedback/feedback-comment-thread";
import { FeedbackInbox } from "../feedback/feedback-inbox-page";
import type { FeedbackInboxProps, FeedbackReplyPost, FeedbackReworkPost } from "../feedback/feedback-inbox-page";
import { useFeedbackToastLabels } from "../feedback/feedback-labels";
import { FeedbackPageFrame } from "../feedback/feedback-page-frame";
import { FeedbackPublicPage, useFeedbackPublicPage } from "../feedback/feedback-public-page";
import type { FeedbackVoteState } from "../feedback/feedback-public-types";
import type { FeedbackRecord } from "../feedback/feedback-record";
import type { FeedbackDetailPatch } from "../feedback/feedback-row-detail";
import { useFeedbackSubmit } from "../feedback/feedback-submit";
import type { FeedbackSubmit, UseFeedbackSubmitOptions } from "../feedback/feedback-submit";
import { useFeedbackRenderDate } from "../feedback/feedback-table";
import { useKitLocale } from "../i18n/kit-labels";
import { useFeedbackCommentsQuery } from "../offline/feedback-comments-query";
import { personLabel } from "../admin/admin-parts";
import { useDescribeAccountFailure } from "./account-failure";
import { accountFeedbackApi } from "./account-feedback-api";
import type { AccountFeedbackApi } from "./account-feedback-api";
import type { AccountMe } from "./accounts-api";
import { accountQueryKeys, useAccountsClient } from "./accounts-context";
import { useCurrentUser } from "./accounts-hooks";

/**
 * The feedback pages, wired (docs/auth-harmonization.md §12.9 "The feedback pages"): the kit's
 * feedback parts on server-kit 0.31's `feedback_router`, through the account client's session.
 * Kurvenschmiede's `FeedbackPage`, `AllFeedbackPage` and `useAppFeedbackSubmit`, about 400
 * lines with their requests, once.
 *
 * Almost nothing on these screens is written here: the inbox, the row's detail with its
 * replies and rework, the status change with its Undo, the public list with its votes and
 * comments, the submit dialog are `@eifi1/ui-kit/feedback`'s, in its words. What is here is the
 * wiring every app wrote: where the rows come from, the three mutations every control goes
 * through, whose the inbox is, and where a vote's answer goes.
 */

/** Who is the admin, by default: the account's `role` is `ADMIN`, server-kit's `admin_role`. */
const roleIsAdmin = (user: AccountMe) => user.role === "ADMIN";
/** Who reads the public parts, by default: everybody signed in but a demo, as server-kit's
 *  `public_viewer` is never true for one. */
const notADemo = (user: AccountMe) => !(user as { is_demo?: boolean }).is_demo;

/** The feedback routes on the account client's session, one per client. */
export function useAccountFeedbackApi<T extends FeedbackRecord = FeedbackRecord>(): AccountFeedbackApi<T> {
  const client = useAccountsClient();
  return useMemo(() => accountFeedbackApi<T>(client.http), [client]);
}

/** A refusal in the account words where its code is known, else the part's own fallback. */
function useErrorMessage(): (error: unknown, fallback: string) => string {
  const describe = useDescribeAccountFailure();
  const unknown = describe(undefined);
  return (error, fallback) => {
    const said = describe(error);
    return said === unknown ? fallback : said;
  };
}

/** What {@link AccountFeedbackPage} takes. */
export interface AccountFeedbackPageProps extends Pick<
  FeedbackInboxProps<FeedbackRecord>,
  "swipe" | "pageLinkParams" | "pageLinkExclude" | "table" | "header"
> {
  /** The caller's own reports (`/my-feedback`, an admin's too), or the admin's inbox. */
  mine: boolean;
  /** Who is the admin. Default: `role` is `ADMIN`. */
  isAdmin?: (user: AccountMe) => boolean;
  /** Who reads the public parts — the votes column and a report's comments — as the server's
   *  `public_viewer` admits them. Default: everybody signed in but a demo; `false` for an app
   *  that mounts no public feedback. */
  publicReader?: boolean | ((user: AccountMe) => boolean);
  /** Where anybody but an admin is sent from the inbox, the address's query (`?row=`) kept.
   *  Default `/my-feedback`. */
  myPath?: string;
}

/**
 * `/feedback`, the admin's inbox, and `/my-feedback`, everybody's own reports — one page, two
 * routes, as the feedback contract has them (§4.3). The inbox shows every report with its
 * author; an admin edits, answers and moves it. Anybody else who opens the inbox is sent to
 * their own reports. A report is a link (`?row=<id>`).
 */
export function AccountFeedbackPage({
  mine,
  isAdmin = roleIsAdmin,
  publicReader = notADemo,
  myPath = "/my-feedback",
  ...inbox
}: AccountFeedbackPageProps) {
  const me = useCurrentUser<AccountMe>();
  const { search } = useLocation();
  if (!me.data) return <LoadingState className="py-16" />;
  const admin = isAdmin(me.data);
  if (!mine && !admin) return <Navigate to={`${myPath}${search}`} replace />;
  const reader = typeof publicReader === "function" ? publicReader(me.data) : publicReader;
  return <FeedbackList mine={mine} admin={admin} reader={reader} viewerId={me.data.id} {...inbox} />;
}

function FeedbackList({
  mine,
  admin,
  reader,
  viewerId,
  ...inbox
}: { mine: boolean; admin: boolean; reader: boolean; viewerId: number } & Pick<
  AccountFeedbackPageProps,
  "swipe" | "pageLinkParams" | "pageLinkExclude" | "table" | "header"
>) {
  const api = useAccountFeedbackApi();
  const queryClient = useQueryClient();
  const toastLabels = useFeedbackToastLabels();
  const errorMessage = useErrorMessage();
  const renderDate = useFeedbackRenderDate(undefined, useKitLocale());
  const reports = useQuery({
    queryKey: mine ? accountQueryKeys.feedbackMine : accountQueryKeys.feedbackAll,
    queryFn: mine ? api.mine : api.all,
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: accountQueryKeys.feedback });

  // Every edit of a report — the status, the pills, a swipe, the description, "Visible to
  // others" — is this one PATCH; the server decides what the caller may send. The page's
  // mutation rather than a row's, so the Undo toast still comes when a filter took the row away.
  const update = useMutation({
    mutationFn: (patch: FeedbackDetailPatch) => api.update(patch),
    onSuccess: refresh,
    onError: (error) => toast.error(errorMessage(error, toastLabels.updateFailed)),
  });
  // A report answered whole, replies and all, goes into the list at once: the reply box clears
  // when the mutation resolves, and a timeline without the reply would read as a lost answer.
  const putInList = (report: FeedbackRecord) => {
    for (const key of [accountQueryKeys.feedbackMine, accountQueryKeys.feedbackAll]) {
      queryClient.setQueryData<FeedbackRecord[]>(key, (rows) =>
        rows?.map((row) => (row.id === report.id ? report : row)),
      );
    }
    refresh();
  };
  const reply = useMutation({
    mutationFn: ({ id, body, status, attachmentUrl }: FeedbackReplyPost) => api.reply(id, body, status, attachmentUrl),
    onSuccess: putInList,
    onError: (error) => toast.error(errorMessage(error, toastLabels.replyFailed)),
  });
  const rework = useMutation({
    mutationFn: ({ id, note, attachmentUrl }: FeedbackReworkPost) => api.rework(id, note, attachmentUrl),
    onSuccess: putInList,
    onError: (error) => toast.error(errorMessage(error, toastLabels.updateFailed)),
  });

  return (
    <FeedbackPageFrame>
      <FeedbackInbox
        rows={reports.data ?? []}
        loading={reports.isPending}
        mine={mine}
        canEdit={admin}
        viewerId={viewerId}
        update={update}
        reply={reply}
        rework={rework}
        publicSwitch={reader}
        votes={reader}
        // A crash report is private, and the server takes no comment on one.
        comments={(row) =>
          reader && row.category !== "CRASH" ? <ReportComments id={row.id} admin={admin} onChanged={refresh} /> : null
        }
        onUpload={api.upload}
        fetcher={api.file}
        onCaptureScreenshot={() => captureAppScreenshot()}
        renderDate={renderDate}
        {...inbox}
      />
    </FeedbackPageFrame>
  );
}

/** The comments under an opened row: the kit's thread on the routes, the comments alone (the
 *  row's detail draws the replies above). Hide is the admin's; Delete the writer's own. */
function ReportComments({ id, admin, onChanged }: { id: number; admin: boolean; onChanged: () => void }) {
  const api = useAccountFeedbackApi();
  const errorMessage = useErrorMessage();
  const thread = useFeedbackCommentsQuery(id, api, { admin, errorMessage, onChanged });
  return (
    <FeedbackCommentThread
      comments={thread.comments ?? []}
      loading={thread.loading}
      isAdmin={admin}
      onComment={thread.onComment}
      onHide={admin ? thread.onHide : undefined}
      onDelete={thread.onDelete}
      pending={thread.pending}
      onUpload={api.upload}
      onCaptureScreenshot={() => captureAppScreenshot()}
      fetcher={api.file}
    />
  );
}

/** What {@link AccountPublicFeedbackPage} takes. */
export interface AccountPublicFeedbackPageProps {
  /** Titles a page. Default 50. */
  pageSize?: number;
  /** Who is the admin (hides and shows comments). Default: `role` is `ADMIN`. */
  isAdmin?: (user: AccountMe) => boolean;
  /** Who may read it; anybody else is shown `fallback`, and nothing is asked of the server.
   *  Default: everybody signed in but a demo. */
  publicReader?: (user: AccountMe) => boolean;
  /** For a reader the server would refuse: the app's not-found page. Default nothing. */
  fallback?: ReactNode;
}

/**
 * `/all-feedback`, the reports everybody the server admits may read (§9.9): titles sorted,
 * searched and paged on the server, a report's public body and replies, its votes and its
 * comments. The sort, the search, the page and the open report live in the address.
 */
export function AccountPublicFeedbackPage({
  pageSize = 50,
  isAdmin = roleIsAdmin,
  publicReader = notADemo,
  fallback = null,
}: AccountPublicFeedbackPageProps) {
  const me = useCurrentUser<AccountMe>();
  if (!me.data) return <LoadingState className="py-16" />;
  if (!publicReader(me.data)) return <>{fallback}</>;
  return <PublicFeedback pageSize={pageSize} admin={isAdmin(me.data)} />;
}

function PublicFeedback({ pageSize, admin }: { pageSize: number; admin: boolean }) {
  const api = useAccountFeedbackApi();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const renderDate = useFeedbackRenderDate(undefined, useKitLocale());
  const view = useFeedbackPublicPage({ pageSize, search: true });
  const list = useQuery({
    queryKey: accountQueryKeys.feedbackPublic(view.request),
    queryFn: () => api.publicList(view.request),
    // The page being left stays until the next one is in, rather than blinking "Loading…".
    placeholderData: keepPreviousData,
  });
  const record = useQuery({
    queryKey: accountQueryKeys.feedbackPublicOne(view.openId ?? 0),
    queryFn: () => api.publicOne(view.openId ?? 0),
    enabled: view.openId !== null,
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: accountQueryKeys.feedback });
  const thread = useFeedbackCommentsQuery(view.openId, api, { admin, errorMessage, onChanged: refresh });
  // A vote answers with the server's count, and every cached view of the report takes it at
  // once: the answer IS the new state, so nothing is downloaded again to learn one number.
  const putVote = (id: number, state: FeedbackVoteState) => {
    const patch = <T extends { id: number }>(row: T): T => (row.id === id ? { ...row, ...state } : row);
    queryClient.setQueriesData<{ id: number }[]>({ queryKey: accountQueryKeys.feedbackPublicLists }, (data) =>
      Array.isArray(data) ? data.map(patch) : data,
    );
    queryClient.setQueryData<{ id: number }>(accountQueryKeys.feedbackPublicOne(id), (data) =>
      data ? patch(data) : data,
    );
    for (const key of [accountQueryKeys.feedbackMine, accountQueryKeys.feedbackAll]) {
      queryClient.setQueryData<{ id: number }[]>(key, (data) => data?.map(patch));
    }
  };
  return (
    <FeedbackPageFrame>
      <FeedbackPublicPage
        view={view}
        list={list}
        record={record}
        thread={thread}
        api={api}
        isAdmin={admin}
        errorMessage={errorMessage}
        onChanged={(id, vote) => (vote ? putVote(id, vote) : refresh())}
        renderDate={renderDate}
        onUpload={api.upload}
        fetcher={api.file}
      />
    </FeedbackPageFrame>
  );
}

/** What {@link useAccountFeedbackSubmit} takes: the dialog's options but its requests and
 *  its user, which are the session's. */
export type UseAccountFeedbackSubmitOptions = Omit<
  UseFeedbackSubmitOptions<FeedbackRecord>,
  "upload" | "create" | "user"
>;

/**
 * The submit dialog on the routes: `open(category)` from the app's feedback menu, `dialog`
 * rendered once. Files go up first, then the report; the signed-in account is who files it,
 * and the lists refresh when it lands.
 */
export function useAccountFeedbackSubmit(options: UseAccountFeedbackSubmitOptions = {}): FeedbackSubmit {
  const api = useAccountFeedbackApi();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const me = useCurrentUser<AccountMe>();
  const locale = useKitLocale();
  return useFeedbackSubmit<FeedbackRecord>({
    errorMessage,
    ...options,
    upload: api.upload,
    create: api.create,
    user: me.data
      ? {
          id: me.data.id,
          email: me.data.email,
          display_name: personLabel({ first: me.data.first_name, last: me.data.last_name }, locale) || null,
        }
      : null,
    onSubmitted: (report) => {
      void queryClient.invalidateQueries({ queryKey: accountQueryKeys.feedback });
      options.onSubmitted?.(report);
    },
  });
}
