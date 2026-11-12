import { useCallback, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CloudOff, RefreshCw } from "lucide-react";
import { Button } from "../components/button";
import { EmptyState } from "../components/empty-state";
import { DEFAULT_ERROR_BOUNDARY_LABELS } from "../components/error-boundary-labels";
import { PageHeader } from "../components/page-header";
import { Skeleton } from "../components/skeleton";
import { toast } from "../components/toast";
import type { CommitScope } from "../components/write-lock";
import type { AuthedFetcher } from "../hooks/use-authed-src";
import { useDebounce } from "../hooks/use-debounce";
import { useSearchParamState } from "../hooks/use-search-param-state";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { FILL_HEIGHT_CLASS } from "../shell/fill-height";
import { captureAppScreenshot } from "./feedback-capture";
import { useFeedbackComments, type FeedbackCommentsApi, type FeedbackCommentsState } from "./feedback-comments";
import type { FeedbackEntryUploadOptions } from "./feedback-entry-file";
import { parseRowId } from "./feedback-inbox-page";
import { useFeedbackToastLabels } from "./feedback-labels";
import { useFeedbackPageFrameHeader } from "./feedback-page-frame";
import type { FeedbackPublicLabels } from "./feedback-public-labels";
import {
  FeedbackPublicDetail,
  FeedbackPublicList,
  useFeedbackPublicLabels,
  type FeedbackPublicDetailProps,
} from "./feedback-public-list";
import type {
  FeedbackPublicListItem,
  FeedbackPublicRecord,
  FeedbackPublicSort,
  FeedbackVoteState,
} from "./feedback-public-types";
import type { FeedbackPageLabels, FeedbackRenderDate } from "./feedback-table";

/**
 * **Feedback discussion**, ASSEMBLED ONCE (0.61; Marcel 2026-11-12: Kurvenschmiede's
 * feedback area should look and work exactly like keksdose's; docs/feedback-harmonization.md
 * §14).
 *
 * Since 0.38 the list, the detail, the vote and the thread of `/all-feedback` are the kit's
 * (`FeedbackPublicList`, `FeedbackPublicDetail`, feedback-public-list.tsx). The page around
 * them was not, and the two apps that have one had drifted: keksdose
 * (`frontend/src/features/feedback/all-feedback-page.tsx`, the canon) keeps the sort, the
 * page, the search and the open row in the URL, says a failed read with a Try again and an
 * offline device as offline, and toasts a link it cannot open; Kurvenschmiede
 * (`frontend/src/features/feedback/all-feedback-page.tsx`) kept the sort and the page in
 * component state — a reload or a shared link started over on page one, newest first —
 * and drew a failed report as a red line with no way to ask again.
 *
 * Here that page is the kit's. {@link useFeedbackPublicPage} holds what is in the URL and
 * what the server is to be asked; the app's queries read it; {@link FeedbackPublicPage}
 * draws the page from it and from their answers. What stays the app's is what differs
 * between them: the API client and its queries (TanStack in both, keyed the app's way —
 * the kit sends no request of its own beyond the vote and the thread's, through the
 * client it is handed), who the viewer is (`isAdmin`, and who may open the page at all),
 * whether titles can be searched (`search`), and the date writer, the upload, the capture
 * and the file fetcher.
 *
 * Why two calls, where the inbox is one: the app's list query is keyed on the sort, the
 * search and the page, so it has to read them before the page can be drawn from its
 * answer. The hook goes first, the queries in the middle, the component last.
 */

/* ── The URL ─────────────────────────────────────────────────────────────────── */

/** The sort toggle's values, the server's default first (§9.6). */
const SORTS: readonly FeedbackPublicSort[] = ["newest", "votes", "updated"];

/** `?p=`: a page index from 0, in digits. Anything else is the first page. */
function parsePageIndex(raw: string): number | undefined {
  if (!/^(0|[1-9]\d*)$/.test(raw)) return undefined;
  const page = Number(raw);
  return Number.isSafeInteger(page) ? page : undefined;
}

// Replace, every one: a sort, a page or a report looked at is not a step for Back.
const SORT_PARAM = {
  parse: (raw: string) => SORTS.find((sort) => sort === raw),
  history: "replace",
} as const;
const SEARCH_PARAM = { history: "replace" } as const;
const PAGE_PARAM = { parse: parsePageIndex, history: "replace" } as const;
const ROW_PARAM = { parse: parseRowId, history: "replace" } as const;

/** One server page — both apps' `limit`. */
const PAGE_SIZE = 50;
/** The search box follows every keystroke; the server is asked once typing pauses this long
 *  (keksdose's 300 ms, its users panel's). */
const SEARCH_SETTLE_MS = 300;

export interface UseFeedbackPublicPageOptions {
  /**
   * The search box and `?q=` — titles only (§9.9). Off by default: where the titles are
   * sealed at rest (server-kit `FeedbackDeps.public_search=False`) there is nothing to
   * search and the server answers `q` with a 422, so the box is not drawn and `q` is never
   * sent, whatever the address says. keksdose and Kurvenschmiede, whose titles are plain
   * text, pass `search`.
   */
  search?: boolean;
  /** One server page, the `limit`. Default 50, both apps'. */
  pageSize?: number;
}

/** What `GET /feedback/public` is asked (§9.9): `q` only when the settled search has text,
 *  so a client may put the object on the wire as it is. */
export interface FeedbackPublicRequest {
  sort: FeedbackPublicSort;
  q?: string;
  limit: number;
  offset: number;
}

/** What {@link useFeedbackPublicPage} returns: the page's state, all of it in the URL. */
export interface FeedbackPublicPageState {
  /** `?sort=`: `newest` (the clean URL), `votes` or `updated`. A notice about several
   *  reports a person follows links `?sort=updated` (§13.7). */
  sort: FeedbackPublicSort;
  /** A new sort, back on the first page. */
  setSort: (sort: FeedbackPublicSort) => void;
  /** {@link UseFeedbackPublicPageOptions.search}: the box is drawn. */
  searchable: boolean;
  /** `?q=`: the box's text, keystroke by keystroke (`""` without `search`). */
  search: string;
  /** New text in the box, back on the first page. */
  setSearch: (text: string) => void;
  /** The search the server is asked: the box's text, trimmed, once typing has paused
   *  300 ms. `""` for none. */
  query: string;
  /** `?p=`: the server's page, from 0. */
  page: number;
  setPage: (page: number) => void;
  /** The `limit`. */
  pageSize: number;
  /** `?row=`: the open report — digits only, as the inbox reads it (§13.2). A notice about
   *  one report links `/all-feedback?row=<id>`. */
  openId: number | null;
  /** Open a report or close it (`null`), replacing the history entry. */
  setOpenId: (id: number | null) => void;
  /** What the list query sends — `{ sort, q?, limit, offset }`. The same object until one
   *  of them changes, so it can key the query as it is. */
  request: FeedbackPublicRequest;
}

/**
 * The public page's state (§14.2), in the URL as keksdose keeps it: `?sort=`, `?q=` (with
 * `search`), `?p=` and `?row=`, every one replacing the history entry. A new sort or a new
 * search goes back to the first page. Needs a react-router Router.
 *
 * ```tsx
 * const view = useFeedbackPublicPage({ search: true });
 * const list = useQuery({ queryKey: keys.feedback.public(view.request), queryFn: () => api.listPublic(view.request),
 *   placeholderData: keepPreviousData });
 * const record = useQuery({ queryKey: keys.feedback.publicOne(view.openId ?? 0),
 *   queryFn: () => api.getPublic(view.openId ?? 0), enabled: view.openId !== null });
 * <FeedbackPublicPage view={view} list={list} record={record} api={api} … />
 * ```
 */
export function useFeedbackPublicPage({
  search: searchable = false,
  pageSize = PAGE_SIZE,
}: UseFeedbackPublicPageOptions = {}): FeedbackPublicPageState {
  const [sort, writeSort] = useSearchParamState<FeedbackPublicSort>("sort", "newest", SORT_PARAM);
  const [q, writeSearch] = useSearchParamState<string>("q", "", SEARCH_PARAM);
  const [page, setPage] = useSearchParamState<number>("p", 0, PAGE_PARAM);
  const [openId, setOpenId] = useSearchParamState<number | null>("row", null, ROW_PARAM);
  const search = searchable ? q : "";
  // One request per pause in the typing, not per character; the app's query keeps the rows
  // on screen meanwhile (`placeholderData: keepPreviousData`).
  const query = useDebounce(search.trim(), SEARCH_SETTLE_MS);
  const request = useMemo<FeedbackPublicRequest>(
    () => ({ sort, ...(query ? { q: query } : {}), limit: pageSize, offset: page * pageSize }),
    [sort, query, page, pageSize],
  );
  // The setters compose (useSearchParamState, 0.25): both params land in one navigation.
  const setSort = (next: FeedbackPublicSort) => {
    writeSort(next);
    setPage(0);
  };
  const setSearch = (next: string) => {
    writeSearch(next);
    setPage(0);
  };
  return {
    sort,
    setSort,
    searchable,
    search,
    setSearch,
    query,
    page,
    setPage,
    pageSize,
    openId,
    setOpenId,
    request,
  };
}

/* ── What the page takes ─────────────────────────────────────────────────────── */

/**
 * One of the page's reads, as the page reads it: **TanStack Query's `useQuery` result,
 * passed as it is** — `list={list}`. The page reads these fields and nothing else; any
 * object with them fits (`isPaused` and `isPlaceholderData` may be left out).
 *
 * The page draws from `data` whenever there is any, so a refetch that fails keeps what is
 * on screen (keksdose audit 2026-10-30 FM-R3). Without data: `isPaused` is the offline card
 * (under `networkMode: "offlineFirst"` a read retries into a pause, and only a pause means
 * the device is offline), `isError` the failed card with a Try again (`refetch`), and
 * otherwise it is loading.
 */
export interface FeedbackPublicRead<D> {
  data: D | undefined;
  isPending: boolean;
  isError: boolean;
  /** Waiting for the network. */
  isPaused?: boolean;
  /** `data` is the page before's, kept on screen while this one loads (`keepPreviousData`):
   *  the pager's Next waits for the real page. */
  isPlaceholderData?: boolean;
  refetch: () => unknown;
}

/** The requests the page makes itself: the vote, and the thread's four
 *  (`FeedbackCommentsApi`) — the app's API client, `feedbackApi` in both apps, as it is. */
export interface FeedbackPublicApi extends FeedbackCommentsApi {
  /** `PUT` (`next`) / `DELETE /feedback/{id}/vote`, answering the server's count (§9.6). */
  vote: (id: number, next: boolean) => Promise<FeedbackVoteState>;
}

export interface FeedbackPublicPageProps {
  /** {@link useFeedbackPublicPage}'s state — what the queries below were keyed on. */
  view: FeedbackPublicPageState;
  /** `GET /feedback/public` with `view.request` — the app's list query. Keep the page on
   *  screen while the next one loads (`placeholderData: keepPreviousData`). */
  list: FeedbackPublicRead<readonly FeedbackPublicListItem[]>;
  /**
   * `GET /feedback/public/{id}` for `view.openId` — the app's query of the open report,
   * enabled while one is open. It is the opened detail's body and replies, AND the row drawn
   * above the page when a `?row=` link names a report this page does not list (`openRow`).
   * An answer for another id (a placeholder) is not drawn.
   */
  record: FeedbackPublicRead<FeedbackPublicRecord>;
  /** The vote and the thread go through it ({@link FeedbackPublicApi}). */
  api: FeedbackPublicApi;
  /**
   * A write landed on report `id` — a vote (with the server's answer) or a comment, a hide,
   * a delete: the place to refresh the app's caches, so every list showing the report says
   * the new count. keksdose invalidates its feedback prefix; Kurvenschmiede writes a vote's
   * answer in place (`putVote`) and invalidates for the rest.
   */
  onChanged?: (id: number, vote?: FeedbackVoteState) => void;
  /** A failed write's toast from what it rejected with — the app's
   *  `extractApiErrorMessage` / `apiErrorMessage`, so the server's sentence wins (§3.7).
   *  Without it: `feedbackToast.voteFailed`, `.commentFailed`, `.updateFailed`. */
  errorMessage?: (error: unknown, fallback: string) => string;
  /**
   * The open report's thread from the app's own source instead of the kit's
   * {@link useFeedbackComments} (0.61): keksdose keeps its threads in the TanStack cache it
   * persists for offline reading, so a member offline still sees the last comments where the
   * kit's hook, which holds the thread in memory, would show the offline card. Its
   * {@link FeedbackCommentsState} for `view.openId`; left out, the page reads the thread over
   * `api` itself.
   */
  thread?: FeedbackCommentsState;
  /** The viewer is the app's admin: Hide / Unhide on the comments. */
  isAdmin?: boolean;
  /** `POST /feedback/attachments` (§12): a comment's one file. Left out, text only. */
  onUpload?: FeedbackEntryUploadOptions["onUpload"];
  /** "Capture screenshot" beside the comment's file field. Default: the kit's
   *  `captureAppScreenshot()`; `null` for no button. */
  onCaptureScreenshot?: (() => Promise<File | null>) | null;
  /** The app's authenticated GET for the comments' pictures (§3.5). */
  fetcher?: AuthedFetcher | null;
  /** The app's date writer, for the list and the detail alike. */
  renderDate?: FeedbackRenderDate;
  /** The vote and the thread's buttons COMMIT — see Button's `commit`. */
  commit?: CommitScope;
  /** Over the detail's props the page sets (`voteDisabled` for a demo, `now` in a story);
   *  merged last. */
  detail?: Partial<Omit<FeedbackPublicDetailProps, "row" | "comments" | "commentsError">>;
  /** Over `feedbackPublic`, for the list, the detail and the page's own words. */
  labels?: LabelOverride<FeedbackPublicLabels>;
  /** Over `feedbackPage`: the list's shared column names. */
  pageLabels?: LabelOverride<FeedbackPageLabels>;
  /**
   * Above the list. Default: `<PageHeader title={title} className="mb-4 md:shrink-0" />` —
   * and inside a `FeedbackPageFrame`, the frame's header with this title (none when the frame
   * was given a `title` of its own). A function gets the page's title
   * (`feedbackPublic.title`). `null` for none. Given, it wins over the frame's.
   */
  header?: ReactNode | ((title: string) => ReactNode);
  /** On the page's root — the fill-height column (`FILL_HEIGHT_CLASS`). The feedback pages'
   *  padding and header are `FeedbackPageFrame`'s: wrap the page in it. */
  className?: string;
}

/* ── The read states ─────────────────────────────────────────────────────────── */

/**
 * A read with nothing to draw (keksdose's `QueryState`, shared/components/query-state.tsx):
 * offline, or failed with a Try again — never the empty state, which would tell the reader
 * there is nothing there. `box` stands in for the opened report; `inline` sits in the
 * table's empty row and in the conversation, inside frames of their own.
 */
function ReadState({
  offline,
  onRetry,
  variant,
  labels,
}: {
  offline: boolean;
  onRetry: () => void;
  variant: "box" | "inline";
  labels: FeedbackPublicLabels;
}) {
  const words = useKitLabels("errorBoundary", DEFAULT_ERROR_BOUNDARY_LABELS);
  if (offline) {
    // No button: it loads by itself once the connection is back.
    return (
      <EmptyState
        variant={variant}
        icon={<CloudOff />}
        title={words.offlineTitle}
        hint={labels.offlineHint}
        data-feedback-public-read="offline"
      />
    );
  }
  return (
    <EmptyState
      variant={variant}
      icon={<AlertTriangle />}
      title={labels.loadFailed}
      data-feedback-public-read="failed"
      action={
        <Button type="button" variant="secondary" size={variant === "inline" ? "sm" : undefined} onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden />
          {words.retry}
        </Button>
      }
    />
  );
}

/** A read's state with no data to draw: offline, failed, or `null` while it loads. */
function stateOf(read: FeedbackPublicRead<unknown>): "offline" | "failed" | null {
  if (read.isPaused) return "offline";
  return read.isError ? "failed" : null;
}

const NO_ROWS: readonly FeedbackPublicListItem[] = [];
const captureScreenshot = () => captureAppScreenshot();

/* ── The page ────────────────────────────────────────────────────────────────── */

/**
 * The public feedback page (§14): `/all-feedback` drawn whole — the header, the list with
 * its sort, search and pager, the vote, the opened report with its conversation, and every
 * state a read can be in — from {@link useFeedbackPublicPage}'s state and the app's two
 * queries:
 *
 * ```tsx
 * export function AllFeedbackPage() {
 *   const qc = useQueryClient();
 *   const view = useFeedbackPublicPage({ search: true });
 *   const list = useQuery({ … view.request …, placeholderData: keepPreviousData });
 *   const record = useQuery({ … view.openId …, enabled: view.openId !== null });
 *   return (
 *     <FeedbackPageFrame>
 *       <FeedbackPublicPage view={view} list={list} record={record} api={feedbackApi} isAdmin={isAdmin}
 *         errorMessage={extractApiErrorMessage} onChanged={() => qc.invalidateQueries({ queryKey: keys.feedback.all })}
 *         onUpload={feedbackApi.uploadAttachment} fetcher={authedImageFetcher} renderDate={renderDate} />
 *     </FeedbackPageFrame>
 *   );
 * }
 * ```
 *
 * - **Loading**: the list's "Loading…" in the table, its frame kept; the opened report as a
 *   Skeleton.
 * - **A read with nothing to show**: offline — "You’re offline" — or failed — "That didn’t
 *   load." with **Try again** — in the table's empty row (the sort and the search stay, to
 *   change what is asked), in the opened report, and in its conversation.
 * - **A `?row=` link to a report not on this page** is drawn above the page's rows from
 *   `record`, open; one that cannot be read is said in a toast — "Report #52 could not be
 *   opened…" — once per report, rather than the link seeming to do nothing.
 * - **The vote**: `api.vote`; a refusal toasts (`errorMessage`) and the button rolls back;
 *   a landing calls `onChanged(id, answer)`.
 * - **The conversation**: {@link useFeedbackComments} over `api` for the open report, or
 *   the app's own `thread` (keksdose's offline-cached one).
 */
export function FeedbackPublicPage({
  view,
  list,
  record,
  api,
  onChanged,
  errorMessage,
  thread: ownThread,
  isAdmin = false,
  onUpload,
  onCaptureScreenshot = captureScreenshot,
  fetcher,
  renderDate,
  commit,
  detail,
  labels: labelsProp,
  pageLabels,
  header,
  className,
}: FeedbackPublicPageProps) {
  const labels = useFeedbackPublicLabels(labelsProp);
  const toastLabels = useFeedbackToastLabels();
  const frameHeader = useFeedbackPageFrameHeader();
  const { openId } = view;

  const rows = list.data ?? NO_ROWS;
  // The open report's answer, only for the open id: a placeholder answer for the report
  // before is not this one.
  const report = record.data && record.data.id === openId ? record.data : undefined;
  // Not on this page: a notice's link, an old bookmark. Drawn above the rows from `record`
  // (FeedbackPublicList's `openRow`) — only once the page is in, or every report opened
  // from a link would first be drawn twice.
  const offPage = openId !== null && list.data !== undefined && !rows.some((row) => row.id === openId);

  // That report could not be read — removed, or made private since the link was sent — and
  // the link seemed to do nothing (keksdose). Said once per report: the toast's id replaces
  // rather than stacks it when the effect runs again.
  const unavailable = offPage && !report && record.isError ? openId : null;
  const unavailableText = unavailable === null ? null : labels.rowUnavailable(unavailable);
  useEffect(() => {
    if (unavailable !== null && unavailableText !== null) {
      toast.error(unavailableText, { id: `feedback-row-${unavailable}` });
    }
  }, [unavailable, unavailableText]);

  const vote = useCallback(
    (id: number, next: boolean): Promise<FeedbackVoteState> =>
      api.vote(id, next).then(
        (state) => {
          onChanged?.(id, state);
          return state;
        },
        (error: unknown) => {
          // Rethrown after the toast: the button puts back what was there.
          toast.error(errorMessage ? errorMessage(error, toastLabels.voteFailed) : toastLabels.voteFailed);
          throw error;
        },
      ),
    [api, onChanged, errorMessage, toastLabels],
  );

  // With the app's own thread the kit's reads nothing (`null`): a hook is never skipped.
  const kitThread = useFeedbackComments(ownThread ? null : openId, api, {
    onChanged: onChanged ? (id) => onChanged(id) : undefined,
    errorMessage,
  });
  const thread = ownThread ?? kitThread;

  const listState = list.data === undefined ? stateOf(list) : null;
  const title = labels.title;
  const head =
    header === undefined ? (
      frameHeader === undefined ? (
        <PageHeader title={title} className="mb-4 md:shrink-0" />
      ) : (
        frameHeader?.(title)
      )
    ) : typeof header === "function" ? (
      header(title)
    ) : (
      header
    );

  const renderDetail = (row: FeedbackPublicListItem) => {
    if (row.id !== openId) return null;
    if (!report) {
      const state = stateOf(record);
      // Gated on data, not on the state: a refetch that fails keeps the open report.
      return state === null ? (
        <Skeleton className="h-24 w-full" data-feedback-public-loading="" />
      ) : (
        <ReadState offline={state === "offline"} onRetry={() => void record.refetch()} variant="box" labels={labels} />
      );
    }
    return (
      <FeedbackPublicDetail
        row={report}
        comments={thread.comments}
        commentsError={
          thread.failed && thread.comments === undefined ? (
            <ReadState offline={thread.offline} onRetry={thread.retry} variant="inline" labels={labels} />
          ) : undefined
        }
        onVote={(next) => vote(report.id, next)}
        isAdmin={isAdmin}
        onComment={thread.onComment}
        onHide={isAdmin ? thread.onHide : undefined}
        onDelete={thread.onDelete}
        pending={thread.pending}
        onUpload={onUpload}
        onCaptureScreenshot={onCaptureScreenshot ?? undefined}
        fetcher={fetcher}
        commit={commit}
        renderDate={renderDate}
        labels={labelsProp}
        {...detail}
      />
    );
  };

  return (
    // The list marks itself `aria-busy` while it loads; the root is the fill-height column
    // between the app's frame and the table (page layout §1.3).
    <div className={cn(FILL_HEIGHT_CLASS, className)} data-feedback-public-page="">
      {head}
      <FeedbackPublicList
        fillHeight
        rows={rows}
        loading={list.data === undefined && listState === null}
        empty={
          listState === null ? undefined : (
            <ReadState
              offline={listState === "offline"}
              onRetry={() => void list.refetch()}
              variant="inline"
              labels={labels}
            />
          )
        }
        sort={view.sort}
        onSortChange={view.setSort}
        search={view.search}
        onSearchChange={view.searchable ? view.setSearch : undefined}
        page={view.page}
        // A full page may have another after it; the page before's rows on screen while this
        // one loads (a placeholder) say nothing about this one (Kurvenschmiede).
        hasMore={rows.length >= view.pageSize && !list.isPlaceholderData}
        onPageChange={view.setPage}
        openId={openId}
        onOpenIdChange={view.setOpenId}
        openRow={offPage ? (report ?? null) : null}
        onVote={(row, next) => vote(row.id, next)}
        renderDetail={renderDetail}
        commit={commit}
        renderDate={renderDate}
        labels={labelsProp}
        pageLabels={pageLabels}
      />
    </div>
  );
}
