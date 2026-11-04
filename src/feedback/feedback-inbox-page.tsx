import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useHref, useLocation } from "react-router";
import { cn } from "../lib/cn";
import { DataTable, type DataTableColumn, type DataTableProps } from "../components/data-table";
import { FloatingActionGroup } from "../components/floating-panel";
import { LoadingState } from "../components/loading-state";
import { PageHeader } from "../components/page-header";
import type { CommitScope } from "../components/write-lock";
import type { AuthedFetcher } from "../hooks/use-authed-src";
import { useSearchParamState } from "../hooks/use-search-param-state";
import type { LabelOverride } from "../i18n/kit-labels";
import type { PathPattern } from "../landing/routing";
import { FILL_HEIGHT_CLASS } from "../shell/fill-height";
import { captureAppScreenshot } from "./feedback-capture";
import { useFeedbackStatusLabels } from "./feedback-labels";
import { runMutation } from "./feedback-mutation";
import type { FeedbackRecord } from "./feedback-record";
import {
  FeedbackRowDetail,
  type FeedbackDetailPatch,
  type FeedbackRowDetailProps,
  type FeedbackUpload,
} from "./feedback-row-detail";
import { useFeedbackStatusUndo, type FeedbackStatusChange } from "./feedback-status-undo";
import {
  DEFAULT_FEEDBACK_SWIPE,
  feedbackSwipeOmitShown,
  feedbackSwipePlan,
  type FeedbackSwipeBinding,
} from "./feedback-swipe";
import {
  FeedbackAwaitingToggle,
  FeedbackEmptyState,
  FeedbackMobileCard,
  feedbackMobileGroupBy,
  isFeedbackAwaiting,
  useFeedbackColumns,
  useFeedbackPageLabels,
  useFeedbackRenderDate,
  type FeedbackPageLabels,
  type FeedbackRenderDate,
} from "./feedback-table";
import type { FeedbackStatus } from "./feedback-vocabulary";

/**
 * The feedback inbox, ASSEMBLED ONCE (0.55; kastlan reuse audit 2026-11-02, proposal 2;
 * docs/feedback-harmonization.md §13).
 *
 * Since 0.27 every part of `/feedback` and `/my-feedback` has been the kit's — the columns,
 * the phone card and its day headers, the detail, the Undo, the swipes, the awaiting toggle
 * (feedback-table.tsx, feedback-row-detail.tsx, feedback-swipe.tsx). What was not the kit's
 * was the WIRING between them, and each app wrote the same ~150 lines of it:
 * kastlan `frontend/src/features/feedback/pages/feedback-page.tsx:40-205`, keksdose
 * `frontend/src/features/feedback/feedback-page.tsx:51-303`, Kurvenschmiede
 * `frontend/src/features/feedback/feedback-page.tsx:88-245`. The open row in `?row=` with
 * its numeric parse and its `rowHref`, `useFeedbackStatusUndo` over the page's PATCH, the
 * `DataTable` with a dozen props, `FeedbackRowDetail` with a dozen more, the phone's
 * grouping, card and swipe plan, the awaiting filter and its toggle. So every rename the
 * parts took (0.52's `mutateAsync`, 0.53's removals) was made three times, and three
 * times reviewed.
 *
 * Here that wiring is the kit's: {@link useFeedbackInbox} holds it and returns what the
 * table, the detail and the phone cards need; {@link FeedbackInbox} draws the page from
 * it. What stays the app's is what differs between the three, each a slot: where the rows
 * come from and the three mutations (its API client, TanStack Query in all three — the kit
 * sends no request), who may triage, the votes, the public switch, the comments (the app's
 * `FeedbackCommentThread` over its own queries), its own columns, its swipe binding, its
 * date writer, the page's header and frame, and whatever else `DataTable` takes.
 *
 * Additive: every part it is built from stays exported and unchanged, for a page that
 * wants its own layout — call the hook and spread `inbox.table` into a `DataTable`.
 */

/* ── The mutations ──────────────────────────────────────────────────────────── */

/**
 * One of the page's mutations, as the inbox calls it: **TanStack Query's `useMutation`
 * result, passed as it is** — `update={update}`. The inbox reads `mutateAsync` (whose
 * promise settles for every call, refactor audit 2026-10-30 FLW-3) and `isPending`, and
 * nothing else. Any object with those two fits, so a page on another data layer hands
 * `{ mutateAsync: api.update, isPending }`.
 *
 * Taking the mutation rather than a callback per control is the point of the round: how
 * the parts call it (0.52 moved them from `mutate` to `mutateAsync`) is then the kit's to
 * change, once. Failure is the mutation's own: its `onError` toasts the server's sentence
 * (§4.4), and the inbox catches the rejection.
 */
export interface FeedbackInboxMutation<V> {
  mutateAsync: (variables: V) => Promise<unknown>;
  /** In flight: the editors' and the composer's buttons wait for it. */
  isPending?: boolean;
}

/** What the reply mutation is sent: `POST /feedback/{id}/replies` (§9.7, §12) — the
 *  body, the status picked (absent: "No change") and the uploaded file's URL (absent:
 *  none). Keys that carry nothing are left out, so a `mutationFn` may spread them onto
 *  the wire. kastlan's `useFeedbackReply` takes exactly this. */
export interface FeedbackReplyPost {
  id: number;
  body: string;
  status?: FeedbackStatus;
  attachmentUrl?: string;
}

/** What the rework mutation is sent: `POST /feedback/{id}/rework` (§10.3) — the author's
 *  trimmed note and the uploaded file's URL (absent: none). kastlan's `useFeedbackRework`
 *  takes exactly this. */
export interface FeedbackReworkPost {
  id: number;
  note: string;
  attachmentUrl?: string;
}

/* ── The hook ───────────────────────────────────────────────────────────────── */

export interface UseFeedbackInboxOptions<T extends FeedbackRecord> {
  /** The list as the app's query answered it (`GET /feedback`, `GET /feedback/my`) —
   *  `list.data ?? []`. Shown newest first and, behind the awaiting toggle, narrowed. */
  rows: readonly T[];
  /** `/my-feedback`: the viewer's own reports — no triage there, for an admin too (§4.3). */
  mine?: boolean;
  /** The viewer may triage: the admin. Only on the inbox — `mine` wins — so `isAdmin`
   *  is enough. The status cell, the pills, the reply composer, the swipes, the submitter
   *  on the card and the awaiting toggle. */
  canEdit: boolean;
  /** The signed-in user's id: who the AUTHOR is (the description editor, Rework, the
   *  public switch's window). */
  viewerId?: number | null;
  /**
   * `PATCH /feedback/{id}` (§3.4): every edit of the report itself — a status change from
   * the cell, the pills or a swipe (with the Undo, `useFeedbackStatusUndo`), the
   * description, the legacy rework append and, with {@link publicSwitch}, the flip. ONE
   * mutation for all of them, the page's, so its observer outlives a row a status filter
   * removes (§4.5).
   */
  update: FeedbackInboxMutation<FeedbackDetailPatch>;
  /** `POST /feedback/{id}/replies` — the admin's answer (§9.7) with its one file (§12).
   *  Without it no composer is drawn. */
  reply?: FeedbackInboxMutation<FeedbackReplyPost>;
  /** `POST /feedback/{id}/rework` — the author's rework entry (§10.3). Without it a rework
   *  goes through {@link update} as the legacy body append (§3.4). */
  rework?: FeedbackInboxMutation<FeedbackReworkPost>;
  /**
   * The **Visible to others** switch in the detail (§9.3), its flip sent through
   * {@link update} as `{ id, public }` — as keksdose and Kurvenschmiede send it. Off by
   * default: an app without public parts (kastlan) has no switch.
   */
  publicSwitch?: boolean;
  /** The **Votes** column and the card's count (§9.6). Off by default (kastlan); keksdose
   *  always, Kurvenschmiede for a reader of the public parts. */
  votes?: boolean;
  /**
   * The report's comments, in a section of their own under the replies (§9.8): the app's
   * `FeedbackCommentThread` over its own queries — a component of its own, since its
   * queries are hooks. Return `null` for a row without a thread (a CRASH, a reader who
   * does not see the public parts; `false` is read as `null`). Called only for the open
   * row.
   *
   * ```tsx
   * comments={(row) => <RowComments id={row.id} isAdmin={isAdmin} canComment={!canEdit} />}
   * ```
   */
  comments?: (row: T) => ReactNode;
  /** The detail as drawn, to wrap or extend — kastlan's tour anchor:
   *  `(row, detail) => <div data-tour="feedback-row-detail">{detail}</div>`. */
  renderDetail?: (row: T, detail: ReactNode) => ReactNode;
  /**
   * The app's own columns over the kit's (§4.3's nine, and Votes): add, drop, reorder —
   * the keys are stable (`columns.filter((c) => c.key !== "email")`). A column brings its
   * filter with it. Keep it stable (module scope or `useCallback`): it is a memo's
   * dependency.
   */
  columns?: (columns: readonly DataTableColumn<T>[]) => readonly DataTableColumn<T>[];
  /** Which swipe does what on the phone (§4.5) — keksdose's Settings → Interaction binding,
   *  `{ end: prefs.right, start: prefs.left }`. Default `DEFAULT_FEEDBACK_SWIPE`. */
  swipe?: FeedbackSwipeBinding;
  /** The status writes the TABLE offers — the status cell and the desktop's actions
   *  column — commit: under a locked `WriteLockProvider` they stay and say why
   *  (`FeedbackStatusTransitions`' `commit`). Off by default. The detail's own saves:
   *  `detail={{ commit }}`. */
  commit?: CommitScope;
  /** `POST /feedback/attachments` (§3.3): the rework's file and the reply's. */
  onUpload?: FeedbackUpload;
  /** The app's authenticated GET for the pictures and the downloads (§3.5). */
  fetcher?: AuthedFetcher | null;
  /** "Capture screenshot" beside the rework's and the reply's file field. Default: the
   *  kit's `captureAppScreenshot()`; `null` for no button. */
  onCaptureScreenshot?: (() => Promise<File | null>) | null;
  /**
   * The app's date writer (keksdose's `useDateCell()`, the date-format setting): the date
   * and resolved columns, the card, the phone's day headers AND the detail's "Resolved:",
   * so all five say the same. Left out, the kit's date with the weekday in the table and
   * on the phone, and in the detail its sentence date — as the parts draw them alone.
   */
  renderDate?: FeedbackRenderDate;
  /** The app's one-shot routes, on top of the kit's (0.52, FLW-7) — for the URL column and
   *  the detail's URL section alike. Keep it stable (module scope). */
  pageLinkExclude?: readonly PathPattern[];
  /** The list is still loading (`list.isPending`): the table says "Loading…" where its
   *  rows will be, not "None". */
  loading?: boolean;
  /** Over the detail's props the inbox sets — `commit`, `showSubject`,
   *  `reworkAttachment`, `replyAttachments` (on here), `labels`, `className`. Merged last,
   *  so it wins. */
  detail?: Partial<Omit<FeedbackRowDetailProps, "row">>;
  /** Over the `feedbackPage` namespace: the columns, the card, the empty state, the toggle
   *  and the title. Keep it stable: it is a memo's dependency. */
  labels?: LabelOverride<FeedbackPageLabels>;
}

/** What {@link useFeedbackInbox} returns: the state, and the props of the parts. */
export interface FeedbackInboxState<T extends FeedbackRecord> {
  /** `canEdit && !mine`: the admin on the inbox. */
  editable: boolean;
  /** The page's title, `feedbackPage.title` — or `.myTitle` on `/my-feedback`. */
  title: string;
  /** The open row's id, from `?row=`; `null` when none is open or the param named no
   *  id (`?row=abc`, `?row=1.5`, `?row=0`). */
  openId: number | null;
  /** Open a row by its id, or close it with `null`: rewrites `?row=`, replacing the
   *  history entry rather than stacking one per report looked at. */
  setOpenId: (id: number | null) => void;
  /** A row's own address: this view — the table's page, sort and filters — with the row
   *  open. The row's link (a new tab, a copied address); a plain click opens it in place. */
  rowHref: (row: T) => string;
  /** The undoable status change (§4.5): the status cell's, the pills', the swipes'. */
  changeStatus: FeedbackStatusChange;
  /** The phone's "Only what is waiting for you" — page state, not the URL (§4.3). */
  awaiting: boolean;
  setAwaiting: (next: boolean) => void;
  /** The one date writer the columns, the card and the day headers use. */
  renderDate: FeedbackRenderDate;
  /** `FeedbackRowDetail`'s props for a row, slots included. */
  detailProps: (row: T) => FeedbackRowDetailProps;
  /** `DataTable`'s props, ready to spread: the rows (newest first, narrowed by
   *  `awaiting`), the columns, the open row, the detail, the phone's card, day headers and
   *  swipes, the desktop's actions column, the empty state, `urlSync`,
   *  `storageKey="feedback"`, `fillHeight`. */
  table: DataTableProps<T>;
}

/** `?row=`'s value: a report's id is a positive integer, written in digits. Anything
 *  else — a hand-edited link, `1e2`, `0x10`, `-3`, `1.5` — opens no row (and the URL
 *  keeps it until a row is opened or closed). The three apps parsed with `Number()`, so
 *  `?row=1e2` opened #100 in all three. */
function parseRowId(raw: string): number | undefined {
  if (!/^[1-9]\d*$/.test(raw)) return undefined;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : undefined;
}

const ROW_PARAM = { parse: parseRowId, history: "replace" } as const;

/** Newest first, as `GET /feedback` sends it (§3.3) — the phone's day headers group runs
 *  of equal days, so an older row between two of today's would split the day in two.
 *  ISO strings from one server sort as their instants; the sort is stable. */
const newestFirst = (a: FeedbackRecord, b: FeedbackRecord) =>
  a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;

const rowId = (row: FeedbackRecord) => row.id;
const rowTitle = (row: FeedbackRecord) => row.title;
const captureScreenshot = () => captureAppScreenshot();
const ignore = () => {};
/** A slot's "nothing": `cond && <Thread />` answers `false`, which the detail would draw
 *  as an empty Comments section (it draws one for anything but `null`). */
const threadOf = (node: ReactNode): ReactNode => (node === false || node === "" ? undefined : node);

/**
 * The inbox's wiring, once (§13): from the app's rows and mutations to what the table,
 * the detail and the phone cards take.
 *
 * ```tsx
 * const list = useQuery({ queryKey: keys.feedback.all, queryFn: api.listFeedback });
 * const update = useMutation({ mutationFn: ({ id, ...patch }: FeedbackDetailPatch) => api.update(id, patch), … });
 * const inbox = useFeedbackInbox({ rows: list.data ?? [], canEdit: isAdmin, viewerId: user?.id, update });
 * <DataTable {...inbox.table} edgeFade />
 * ```
 *
 * {@link FeedbackInbox} is this hook drawn — use the hook alone for a layout of your own.
 * Needs a react-router Router (`?row=`, `urlSync`).
 */
export function useFeedbackInbox<T extends FeedbackRecord>({
  rows,
  mine = false,
  canEdit,
  viewerId,
  update,
  reply,
  rework,
  publicSwitch = false,
  votes = false,
  comments,
  renderDetail,
  columns: ownColumns,
  swipe = DEFAULT_FEEDBACK_SWIPE,
  commit,
  onUpload,
  fetcher,
  onCaptureScreenshot = captureScreenshot,
  renderDate: renderDateProp,
  pageLinkExclude,
  loading = false,
  detail,
  labels,
}: UseFeedbackInboxOptions<T>): FeedbackInboxState<T> {
  // An admin on /my-feedback reads as any author does (§4.3), as `feedbackColumns` has it.
  const editable = canEdit && !mine;
  const pageLabels = useFeedbackPageLabels(labels);
  const statusLabels = useFeedbackStatusLabels();
  const renderDate = useFeedbackRenderDate(renderDateProp);

  // TanStack's `mutateAsync` is stable, so the Undo and the columns' memo hold across
  // renders; the mutation object around it is not.
  const updateAsync = update.mutateAsync;
  const changeStatus = useFeedbackStatusUndo(updateAsync);

  // The open row IS the URL (§4.3: `?row=<id>`, every app) — which is what makes a row a
  // real link at all (keksdose feedback #451). Replace, not push: looking through ten
  // reports is not ten steps for Back.
  const [openId, setOpenId] = useSearchParamState<number | null>("row", null, ROW_PARAM);
  const { pathname, search } = useLocation();
  // Through the router, so a basename (and a hash router's `#`) is in the address.
  const here = useHref({ pathname });
  // Built from the CURRENT query, not a bare `?row=`: the table keeps its `f.*`, `sort`
  // and `p` in the URL, and dropping them would open the new tab on an unfiltered list
  // where the row may not be on the first page (keksdose feedback-page.tsx:145).
  const rowHref = useCallback(
    (row: T) => {
      const params = new URLSearchParams(search);
      params.set("row", String(row.id));
      return `${here}?${params.toString()}`;
    },
    [here, search],
  );

  // A thumb gesture on one screen, not a view worth linking to (§4.3; keksdose live #330).
  const [awaiting, setAwaiting] = useState(false);
  const shown = useMemo(
    () => (editable && awaiting ? rows.filter((row) => isFeedbackAwaiting(row.status)) : [...rows]).sort(newestFirst),
    [rows, editable, awaiting],
  );

  const kitColumns = useFeedbackColumns<T>({
    mine,
    canEdit,
    onStatus: changeStatus,
    renderDate,
    commit,
    votes,
    pageLinkExclude,
    labels,
  });
  const columns = useMemo(() => (ownColumns ? ownColumns(kitColumns) : kitColumns), [ownColumns, kitColumns]);
  const mobileGroupBy = useMemo(() => feedbackMobileGroupBy(renderDate), [renderDate]);

  // The rework's sending is the detail's too (keksdose, Kurvenschmiede): its editors and
  // the public switch wait for whichever write is out.
  const pending = Boolean(update.isPending || rework?.isPending);
  const capture = onCaptureScreenshot ?? undefined;

  const detailProps = (row: T): FeedbackRowDetailProps => ({
    row,
    canEdit: editable,
    viewerId,
    onUpdate: updateAsync,
    pending,
    // The page's change, not one the detail would build: the same Undo as the cell's.
    statusChange: changeStatus,
    onUpload,
    fetcher,
    onCaptureScreenshot: capture,
    // Only the app's own: left out, the detail's "Resolved:" is the kit's sentence date,
    // no weekday — as kastlan's has always been.
    renderDate: renderDateProp,
    pageLinkExclude,
    onReply: reply
      ? (body, status, attachmentUrl) =>
          reply.mutateAsync({
            id: row.id,
            body,
            ...(status ? { status } : {}),
            ...(attachmentUrl ? { attachmentUrl } : {}),
          })
      : undefined,
    // The reply's one file (§12): all three apps are on server-kit 0.18, and the reply
    // mutation's `attachmentUrl` is in its type from the start (the B1 risk the detail's
    // default guards against — an `onReply` that drops the file — cannot arise here).
    replyAttachments: true,
    replying: reply?.isPending ?? false,
    onRework: rework
      ? (note, attachmentUrl) => rework.mutateAsync({ id: row.id, note, ...(attachmentUrl ? { attachmentUrl } : {}) })
      : undefined,
    comments: threadOf(comments?.(row)),
    onPublicChange: publicSwitch ? (next) => runMutation(updateAsync, { id: row.id, public: next }, ignore) : undefined,
    ...detail,
  });

  const table: DataTableProps<T> = {
    rows: shown,
    columns,
    rowKey: rowId,
    storageKey: "feedback",
    urlSync: true,
    fillHeight: true,
    rowHref,
    // The link covers the row's first cell; a click anywhere on the row opens it — or,
    // on the open one, closes it.
    onRowClick: (row) => setOpenId((id) => (id === row.id ? null : row.id)),
    isExpanded: (row) => row.id === openId,
    expandedRow: (row) => {
      const node = <FeedbackRowDetail {...detailProps(row)} />;
      return renderDetail ? renderDetail(row, node) : node;
    },
    // §7.13: one word, also when a filter or the toggle leaves nothing; and while the
    // first answer is out, what is happening instead.
    empty: loading ? <LoadingState size="sm" inline /> : <FeedbackEmptyState labels={labels} />,
    mobileGroupBy,
    mobileCard: (row) => (
      <FeedbackMobileCard row={row} showSubmitter={editable} renderDate={renderDate} votes={votes} labels={labels} />
    ),
    // The admin inbox only — /my-feedback is read-only by design (keksdose #331) — and
    // every swipe through the same Undo as a tap (§4.5, §7.10).
    mobileSwipeActions: editable
      ? (row) => feedbackSwipePlan(swipe, row, { change: changeStatus, labels: statusLabels })
      : undefined,
    // The swipes as the desktop's last column (0.46, keksdose dev#598), less what the
    // status cell already offers.
    desktopSwipeActions: { omit: feedbackSwipeOmitShown, name: rowTitle, ...(commit === undefined ? {} : { commit }) },
  };

  return {
    editable,
    title: mine ? pageLabels.myTitle : pageLabels.title,
    openId,
    setOpenId,
    rowHref,
    changeStatus,
    awaiting,
    setAwaiting,
    renderDate,
    detailProps,
    table,
  };
}

/* ── The component ──────────────────────────────────────────────────────────── */

export interface FeedbackInboxProps<T extends FeedbackRecord> extends UseFeedbackInboxOptions<T> {
  /**
   * Above the table. Default: `<PageHeader title={title} className="mb-4 md:shrink-0" />`.
   * A function gets the page's title (`feedbackPage.title` / `.myTitle`) — the app's own
   * header: `(title) => <PageHeader size="compact" title={title} data-tour="feedback-header" />`.
   * `null` for none.
   */
  header?: ReactNode | ((title: string) => ReactNode);
  /** Over the inbox's `DataTable` props — `edgeFade`, `locale`, `mobileExpandAsDialog`,
   *  `className`, another `storageKey`. Merged last, so it wins. */
  table?: Partial<DataTableProps<T>>;
  /** Further `FloatingAction`s on the phone: after the awaiting toggle on the inbox, in a
   *  group of their own on `/my-feedback`. */
  phoneActions?: ReactNode;
  /** On the page's frame — the fill-height column (`FILL_HEIGHT_CLASS`); the app's page
   *  padding goes here. */
  className?: string;
}

/**
 * The feedback inbox (§13): `/feedback` and `/my-feedback` drawn whole from
 * {@link useFeedbackInbox} — the header, the table with its detail, phone cards and swipes,
 * and the phone's awaiting toggle, in the fill-height frame (page layout §1.3) — so a page
 * is its queries and this:
 *
 * ```tsx
 * export function FeedbackPage({ mine = false }: { mine?: boolean }) {
 *   const { user, isAdmin } = useAuth();
 *   const list = useQuery({ queryKey: mine ? keys.mine : keys.all, queryFn: mine ? api.mine : api.all });
 *   const update = useFeedbackUpdate();
 *   const reply = useFeedbackReply();
 *   const rework = useFeedbackRework();
 *   if (!mine && !isAdmin) return <Navigate to="/my-feedback" replace />;
 *   return (
 *     <FeedbackInbox
 *       rows={list.data ?? []} loading={list.isPending} mine={mine} canEdit={isAdmin} viewerId={user?.id}
 *       update={update} reply={reply} rework={rework}
 *       onUpload={api.upload} fetcher={api.file}
 *     />
 *   );
 * }
 * ```
 *
 * Every slot is {@link UseFeedbackInboxOptions}' or one of the four below. The redirect of
 * a non-admin, the routes and the queries stay the app's.
 */
export function FeedbackInbox<T extends FeedbackRecord>({
  header,
  table,
  phoneActions,
  className,
  ...options
}: FeedbackInboxProps<T>) {
  const inbox = useFeedbackInbox<T>(options);
  const pageLabels = useFeedbackPageLabels(options.labels);
  const head =
    header === undefined ? (
      <PageHeader title={inbox.title} className="mb-4 md:shrink-0" />
    ) : typeof header === "function" ? (
      header(inbox.title)
    ) : (
      header
    );
  return (
    // A plain element on the way to the table carries the fill (page layout §1.3).
    <div className={cn(FILL_HEIGHT_CLASS, className)} aria-busy={options.loading || undefined} data-feedback-inbox="">
      {head}
      <DataTable {...inbox.table} {...table} />
      {inbox.editable ? (
        // The phone's floating action (keksdose feedback #58): only on the inbox — on
        // /my-feedback the author is not waiting on their own verdict.
        <FeedbackAwaitingToggle pressed={inbox.awaiting} onPressedChange={inbox.setAwaiting} labels={options.labels}>
          {phoneActions}
        </FeedbackAwaitingToggle>
      ) : (
        phoneActions && (
          <FloatingActionGroup aria-label={pageLabels.phoneActions} className="md:hidden">
            {phoneActions}
          </FloatingActionGroup>
        )
      )}
    </div>
  );
}
