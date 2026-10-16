import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, MessageSquare, ThumbsUp } from "lucide-react";
import { DataTable, type DataTableColumn } from "../components/data-table";
import { DEFAULT_DATA_TABLE_LABELS } from "../components/data-table-labels";
import { IconButton } from "../components/icon-button";
import { SearchField } from "../components/search-field";
import { ToggleGroup } from "../components/toggle-group";
import type { CommitScope } from "../components/write-lock";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { EMPTY_FORMATTED_VALUE } from "../lib/format";
import { FeedbackCategoryBadge, FeedbackDetail, FeedbackDetailSection, FeedbackProse, FeedbackStatusBadge } from "./feedback-inbox";
import { useFeedbackCategoryLabels } from "./feedback-labels";
import { FeedbackCommentThread, type FeedbackCommentsLabels } from "./feedback-comment-thread";
import { DEFAULT_FEEDBACK_PUBLIC_LABELS, type FeedbackPublicLabels } from "./feedback-public-labels";
import type {
  FeedbackComment,
  FeedbackPublicListItem,
  FeedbackPublicRecord,
  FeedbackPublicSort,
  FeedbackVoteState,
} from "./feedback-public-types";
import {
  useFeedbackPageLabels,
  useFeedbackRenderDate,
  type FeedbackPageLabels,
  type FeedbackRenderDate,
} from "./feedback-table";
import { FeedbackVoteButton } from "./feedback-vote-button";

export { DEFAULT_FEEDBACK_PUBLIC_LABELS };
export type { FeedbackPublicLabels };

/** `feedbackPublic` resolved: English, then `<UiKitProvider labels>`, then `labels`. */
export function useFeedbackPublicLabels(labels?: LabelOverride<FeedbackPublicLabels>): FeedbackPublicLabels {
  return useKitLabels("feedbackPublic", DEFAULT_FEEDBACK_PUBLIC_LABELS, labels);
}

/** The sort toggle's order: the server's default first (§9.6). */
const SORTS: readonly FeedbackPublicSort[] = ["newest", "votes", "updated"];

/** A date in a cell, as the inbox writes it: `<time>`, nowrap, tabular figures. */
function PublicDate({ value, renderDate }: { value: string | null | undefined; renderDate: FeedbackRenderDate }) {
  if (!value) return <span className="text-placeholder">{EMPTY_FORMATTED_VALUE}</span>;
  return (
    <time dateTime={value} className="whitespace-nowrap tabular-nums text-muted">
      {renderDate(value)}
    </time>
  );
}

/** The visible comments as a small chip beside the title — the count in figures, the
 *  words for a screen reader. Nothing at 0. */
function CommentCount({ count, labels }: { count: number; labels: FeedbackPublicLabels }) {
  if (!count) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted" data-feedback-comment-count={count}>
      <MessageSquare className="size-3.5" aria-hidden />
      <span aria-hidden className="tabular-nums">
        {count}
      </span>
      <span className="sr-only">{labels.comments(count)}</span>
    </span>
  );
}

/** The votes on a phone card: the thumb and the count, in the brand colour when the
 *  viewer's own. */
function VoteCount({ count, voted, labels }: { count: number; voted: boolean; labels: FeedbackPublicLabels }) {
  return (
    <span
      className={cn("ms-auto inline-flex shrink-0 items-center gap-1 text-xs", voted ? "text-brand" : "text-muted")}
      data-feedback-vote-count={count}
    >
      <ThumbsUp className="size-3.5" aria-hidden />
      <span aria-hidden className="tabular-nums">
        {count}
      </span>
      <span className="sr-only">{labels.votes(count)}</span>
    </span>
  );
}

/** 0.38.1: previous / next over the server's pages when it answers no total
 *  (`GET /feedback/public` — Kurvenschmiede): "Page 3" between two arrows. The arrows'
 *  names are `dataTable`'s, the strip's; the page's is `feedbackPublic.page`. */
function PublicPager({
  page,
  hasMore,
  onPageChange,
  labels,
}: {
  page: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  labels: FeedbackPublicLabels;
}) {
  const tableLabels = useKitLabels("dataTable", DEFAULT_DATA_TABLE_LABELS);
  const name = labels.page(page + 1);
  return (
    <div
      role="group"
      aria-label={name}
      className="flex items-center justify-end gap-2 text-sm text-secondary"
      data-feedback-public-pager={page}
    >
      <IconButton
        size="sm"
        variant="secondary"
        label={tableLabels.prevPage}
        disabled={page <= 0}
        onClick={() => onPageChange(page - 1)}
      >
        {/* "Previous" points back along the line — left in LTR, right in RTL. */}
        <ChevronLeft className="rtl:-scale-x-100" />
      </IconButton>
      <span className="tabular-nums" aria-hidden>
        {name}
      </span>
      <IconButton
        size="sm"
        variant="secondary"
        label={tableLabels.nextPage}
        disabled={!hasMore}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="rtl:-scale-x-100" />
      </IconButton>
    </div>
  );
}

/* ── The list ─────────────────────────────────────────────────────────────── */

export interface FeedbackPublicListProps<T extends FeedbackPublicListItem = FeedbackPublicListItem> {
  /** `GET /feedback/public?sort=&q=` — the server's page, in the server's order. */
  rows: T[];
  /** How many the query has in all — the line beside the sort. Left out, no line. */
  total?: number;
  /** The server sorts (§9.6): the toggle only says which way. */
  sort: FeedbackPublicSort;
  onSortChange: (sort: FeedbackPublicSort) => void;
  /** The search box's text (`q`, titles only). */
  search?: string;
  /**
   * The search box is drawn ONLY with this handler: where the app's titles are sealed
   * (Kurvenschmiede, `FeedbackDeps.public_search=False`, §9.9) there is nothing to search
   * on and the server answers `q` with a 422 — so it passes none.
   */
  onSearchChange?: (search: string) => void;
  /** The opened row: the app's {@link FeedbackPublicDetail} with the row's
   *  `GET /feedback/public/{id}` and its comments. */
  renderDetail: (row: T) => ReactNode;
  /** `PUT` / `DELETE /feedback/{id}/vote` for a row's button (`next`: the new state);
   *  resolve with the answer, reject to roll back. */
  onVote: (row: T, next: boolean) => Promise<FeedbackVoteState>;
  /** The page is loading: the table says so where its rows would be. */
  loading?: boolean;
  /** The opened row's id, when the app keeps it (a `?row=` param). Left out, the list
   *  keeps it itself. */
  openId?: number | null;
  onOpenChange?: (id: number | null) => void;
  /**
   * 0.38.1: the opened report when it is NOT on this page — a `?row=` link to an older
   * one (Kurvenschmiede). The app fetches it (`GET /feedback/public/{id}`, a list item's
   * fields and more) and passes it with `openId`; while `openId` is its id it is drawn
   * first, above the page's rows, and opened with `renderDetail` (on the phone, in the
   * full-screen dialog). Closed, it is gone. A row the page has already is never drawn
   * twice: the page's own is opened instead.
   */
  openRow?: T | null;
  /**
   * 0.38.1: the server's page, from 0 — for a pager where `/feedback/public` answers no
   * total (Kurvenschmiede). With {@link onPageChange} a **Previous / Page n / Next**
   * strip stands under the table; Next is off without {@link hasMore}. Left out, no
   * pager: the server's `limit` is all there is.
   */
  page?: number;
  /** 0.38.1: there is a page after this one (e.g. the page came back full). */
  hasMore?: boolean;
  /** 0.38.1: go to another page (`page ± 1`); the app fetches it. Draws the pager. */
  onPageChange?: (page: number) => void;
  /** A vote COMMITS — see Button's `commit`. */
  commit?: CommitScope;
  /** See {@link FeedbackRenderDate}. Default: the kit's, with the weekday. */
  renderDate?: FeedbackRenderDate;
  /** Over the `feedbackPublic` namespace. The shared column names (#, Date, Category,
   *  Subject, Status) are `feedbackPage`'s: pass `pageLabels` for those. */
  labels?: LabelOverride<FeedbackPublicLabels>;
  pageLabels?: LabelOverride<FeedbackPageLabels>;
  className?: string;
}

/**
 * **All feedback** — the reports every user the app lets in may read (round 0.38,
 * docs/feedback-harmonization.md §9.3, §9.9; keksdose's `/all-feedback`).
 *
 * - **Titles only** (decision 23): #, Date, Category, Subject (with the visible
 *   comments), Votes, Status. No body, no submitter, no file — the list item carries
 *   none of them (§9.10).
 * - **The server sorts**: the toggle **Newest / Most wanted / Recently updated** sets
 *   `sort`, and the columns themselves do not sort (a page of 50 sorted in the browser
 *   would not be the 50 the sort asks for).
 * - **The search box only with `onSearchChange`**: an app whose titles are sealed
 *   passes none (§9.9).
 * - **Votes** are `FeedbackVoteButton`s, optimistic, the viewer's own report pressed
 *   and locked ("Your report", §9.6).
 * - A row opens in place with `renderDetail` — on the phone, in a full-screen dialog.
 *   The phone cards carry the title, the status, the category, the date and the two
 *   counts; the vote itself is in the opened report (a button inside the card, which is
 *   the row's own button, would be two controls in one).
 *
 * No client paging: the server's `limit` is the page, and `total` says how many there
 * are. For more than one page, `page` / `hasMore` / `onPageChange` draw a previous /
 * next strip that needs no total (0.38.1); `openRow` shows a `?row=` report from
 * another page. Needs a router, as every `DataTable` does.
 */
export function FeedbackPublicList<T extends FeedbackPublicListItem = FeedbackPublicListItem>({
  rows,
  total,
  sort,
  onSortChange,
  search = "",
  onSearchChange,
  renderDetail,
  onVote,
  loading = false,
  openId: openIdProp,
  onOpenChange,
  openRow,
  page: pageIndex = 0,
  hasMore = false,
  onPageChange,
  commit,
  renderDate: renderDateProp,
  labels: labelsProp,
  pageLabels: pageLabelsProp,
  className,
}: FeedbackPublicListProps<T>) {
  const labels = useFeedbackPublicLabels(labelsProp);
  const page = useFeedbackPageLabels(pageLabelsProp);
  const categoryLabels = useFeedbackCategoryLabels();
  const renderDate = useFeedbackRenderDate(renderDateProp);
  const [ownOpenId, setOwnOpenId] = useState<number | null>(null);
  const openId = openIdProp !== undefined ? openIdProp : ownOpenId;
  const setOpen = (id: number | null) => {
    if (openIdProp === undefined) setOwnOpenId(id);
    onOpenChange?.(id);
  };
  // A `?row=` report from another page: first, while it is the open one, and only when
  // the page does not have it itself.
  const shownRows =
    openRow && openId === openRow.id && !rows.some((row) => row.id === openRow.id) ? [openRow, ...rows] : rows;

  const columns = useMemo<DataTableColumn<T>[]>(
    () => [
      {
        key: "id",
        header: page.columnId,
        cell: (row) => <span className="font-mono text-xs text-muted">{row.id}</span>,
        mobileHidden: true,
      },
      {
        key: "date",
        header: page.columnDate,
        cell: (row) => <PublicDate value={row.created_at} renderDate={renderDate} />,
      },
      {
        key: "category",
        header: page.columnCategory,
        cell: (row) => <FeedbackCategoryBadge category={row.category} label={categoryLabels[row.category]} />,
      },
      {
        key: "title",
        header: page.columnSubject,
        cell: (row) => (
          <span className="inline-flex min-w-0 max-w-full items-center gap-2 large:items-start">
            <span className="min-w-0 truncate-until-large font-medium">{row.title}</span>
            <CommentCount count={row.comment_count} labels={labels} />
          </span>
        ),
        mobilePrimary: true,
      },
      {
        key: "votes",
        header: labels.columnVotes,
        className: "whitespace-nowrap",
        // The cell is a button: the row's own link must never wrap it.
        noRowLink: true,
        cell: (row) => (
          <FeedbackVoteButton
            votes={row.votes}
            voted={row.voted}
            own={row.mine}
            onVote={(next) => onVote(row, next)}
            commit={commit}
            size="sm"
          />
        ),
      },
      {
        key: "status",
        header: page.columnStatus,
        className: "whitespace-nowrap",
        cell: (row) => <FeedbackStatusBadge status={row.status} />,
      },
    ],
    [page, labels, categoryLabels, renderDate, onVote, commit],
  );

  return (
    <div className={cn("flex flex-col gap-3", className)} data-feedback-public-list="" aria-busy={loading || undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          aria-label={labels.sort}
          value={sort}
          onChange={(value) => onSortChange(value)}
          options={SORTS.map((value) => ({
            value,
            label: value === "newest" ? labels.sortNewest : value === "votes" ? labels.sortVotes : labels.sortUpdated,
          }))}
        />
        {onSearchChange && (
          <SearchField
            aria-label={labels.search}
            placeholder={labels.search}
            value={search}
            onChange={onSearchChange}
            className="min-w-[12rem] flex-1 md:max-w-xs"
          />
        )}
        {total !== undefined && (
          <span className="ms-auto text-sm text-muted" data-feedback-public-total={total}>
            {labels.total(total)}
          </span>
        )}
      </div>
      <DataTable
        rows={shownRows}
        columns={columns}
        rowKey={(row) => row.id}
        rowName={(row) => row.title}
        onRowClick={(row) => setOpen(openId === row.id ? null : row.id)}
        isExpanded={(row) => row.id === openId}
        expandedRow={(row) => renderDetail(row)}
        mobileExpandAsDialog
        paginated={false}
        empty={loading ? labels.loading : labels.empty}
        mobileCard={(row) => (
          <div className="min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 flex-1 font-medium [overflow-wrap:anywhere]">{row.title}</span>
              <FeedbackStatusBadge status={row.status} className="shrink-0" />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <FeedbackCategoryBadge category={row.category} compact label={categoryLabels[row.category]} />
              <PublicDate value={row.created_at} renderDate={renderDate} />
              <CommentCount count={row.comment_count} labels={labels} />
              {/* A count, not the button: the whole card is the row's button, and a button
                  inside it is two controls in one. The vote is in the opened report. */}
              <VoteCount count={row.votes} voted={row.voted || row.mine} labels={labels} />
            </div>
          </div>
        )}
      />
      {onPageChange && (pageIndex > 0 || hasMore) && (
        <PublicPager page={pageIndex} hasMore={hasMore} onPageChange={onPageChange} labels={labels} />
      )}
    </div>
  );
}

/* ── The detail ───────────────────────────────────────────────────────────── */

export interface FeedbackPublicDetailProps {
  /** `GET /feedback/public/{id}`: the public body (attachment URLs already stripped by
   *  the server, §9.4) and the replies. */
  row: FeedbackPublicRecord;
  /** `GET /feedback/{id}/comments`, oldest first; `undefined` while it loads. */
  comments: readonly FeedbackComment[] | undefined;
  /** `PUT` / `DELETE /feedback/{id}/vote`; resolve with the answer, reject to roll back. */
  onVote: (next: boolean) => Promise<FeedbackVoteState>;
  /** The viewer is the app's admin: Hide / Unhide on the comments. */
  isAdmin?: boolean;
  /** `POST /feedback/{id}/comments`. Left out — a demo, a reader who may not write — no
   *  composer. */
  onComment?: (body: string) => void | Promise<unknown>;
  /** The admin's hide (`PATCH …/comments/{id} {hidden}`). */
  onHide?: (comment: FeedbackComment, hidden: boolean) => void | Promise<unknown>;
  /** The writer's delete (`DELETE …/comments/{id}`), after a confirm. */
  onDelete?: (comment: FeedbackComment) => void | Promise<unknown>;
  /** A comment is being sent. */
  pending?: boolean;
  /** The vote and the thread's buttons COMMIT — see Button's `commit`. */
  commit?: CommitScope;
  /** Voting is off for this viewer (a demo): `true`, or the reason. */
  voteDisabled?: boolean | string;
  /** See {@link FeedbackRenderDate}. */
  renderDate?: FeedbackRenderDate;
  /** "Now" for the thread's relative times — pin it in tests and stories. */
  now?: Date | number;
  /** Over the `feedbackPublic` namespace. */
  labels?: LabelOverride<FeedbackPublicLabels>;
  /** Over the `feedbackComments` namespace, for the thread. */
  commentLabels?: LabelOverride<FeedbackCommentsLabels>;
  className?: string;
}

/**
 * One public report opened (round 0.38, docs/feedback-harmonization.md §9.3, §9.10): who
 * filed it — the first name the server sent, else **"A user"** (§9.5) — and when; the
 * **vote**; the **public body**; and the **conversation**, the admin's replies and other
 * people's comments merged oldest first (§9.8, `FeedbackCommentThread`), with the box to
 * add one.
 *
 * What it never draws, because the public record never carries it (§9.10): an address,
 * a last name, a screenshot, a file, the page the report was filed on. The body is the
 * server's `public_body` — the client strips nothing and adds nothing.
 */
export function FeedbackPublicDetail({
  row,
  comments,
  onVote,
  isAdmin = false,
  onComment,
  onHide,
  onDelete,
  pending,
  commit,
  voteDisabled,
  renderDate: renderDateProp,
  now,
  labels: labelsProp,
  commentLabels,
  className,
}: FeedbackPublicDetailProps) {
  const labels = useFeedbackPublicLabels(labelsProp);
  const renderDate = useFeedbackRenderDate(renderDateProp);
  return (
    <FeedbackDetail className={className}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2" data-feedback-public-detail={row.id}>
        <span className="text-sm text-secondary" data-feedback-author="">
          {labels.filedBy(row.author_name ?? labels.anonymous)}
        </span>
        <PublicDate value={row.created_at} renderDate={renderDate} />
        <FeedbackVoteButton
          votes={row.votes}
          voted={row.voted}
          own={row.mine}
          onVote={onVote}
          disabled={voteDisabled}
          commit={commit}
          className="ms-auto"
        />
      </div>
      <FeedbackDetailSection title={labels.body}>
        {/* Rework rounds stay in it — the author's own words (§9.4) — on a server before
            server-kit 0.13; since then each is an entry in the conversation (§10.3). */}
        <FeedbackProse>{row.body}</FeedbackProse>
      </FeedbackDetailSection>
      <FeedbackDetailSection title={labels.conversation}>
        <FeedbackCommentThread
          replies={row.replies}
          comments={comments ?? []}
          loading={comments === undefined}
          isAdmin={isAdmin}
          // 0.40 (§10.3): the author's rework entries are theirs — at the reading end.
          isAuthor={row.mine}
          onComment={onComment}
          onHide={onHide}
          onDelete={onDelete}
          pending={pending}
          commit={commit}
          now={now}
          labels={commentLabels}
        />
      </FeedbackDetailSection>
    </FeedbackDetail>
  );
}
