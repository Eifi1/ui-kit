import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  Button,
  DEFAULT_FEEDBACK_SWIPE,
  DataTable,
  FeedbackAwaitingToggle,
  FeedbackCommentThread,
  FeedbackEmptyState,
  FeedbackInbox,
  FeedbackMobileCard,
  FeedbackSubject,
  ToggleGroup,
  feedbackMobileGroupBy,
  feedbackSwipeOmitShown,
  feedbackSwipePlan,
  isFeedbackAwaiting,
  useFeedbackColumns,
  useFeedbackPageLabels,
  useFeedbackRenderDate,
  useFeedbackStatusLabels,
  useFeedbackStatusUndo,
} from "@eifi1/ui-kit";
import type {
  FeedbackComment,
  FeedbackDetailPatch,
  FeedbackInboxMutation,
  FeedbackRecord,
  FeedbackReplyPost,
  FeedbackReworkPost,
  FeedbackStatus,
  FeedbackStatusMutateAsync,
} from "@eifi1/ui-kit";
import { Example, Note, code } from "../../lib/section";

/**
 * The Feedback inbox page, part 1 of 4 (refactor audit 2026-10, DOC-8): the two lists —
 * `FeedbackInbox`, the pages assembled whole, and the parts it is built from:
 * `useFeedbackColumns`, the phone card and the awaiting toggle. The page's other parts are
 * feedback-inbox.tsx (the vocabulary, transitions and note editor), composer.tsx, detail.tsx
 * and record.tsx beside this file.
 */

/* ── The inbox, assembled (docs/feedback-harmonization.md §13) ───────────────────── */

/** The demo's viewer of the assembled inbox: an admin, so both pages make sense. */
const VIEWER = 1;

const inboxBase = {
  user_email: null,
  screenshot_url: null,
  attachment_urls: null,
  outcome: null,
  resolved_at: null,
} as const;

const SEED: FeedbackRecord[] = [
  {
    ...inboxBase,
    id: 58,
    user_id: 2,
    user_email: "user@example.test",
    title: "Chart jumps on save",
    body: "The chart jumps to the top when I save a transaction.",
    category: "BUG",
    status: "OPEN",
    context: {
      user_display_name: "Example User",
      user_email: "user@example.test",
      environment: "dev",
      url: "https://dev.example.test/reports?tab=chart",
    },
    public: true,
    votes: 4,
    replies: [],
    created_at: "2026-11-03T09:12:00Z",
    updated_at: "2026-11-03T09:12:00Z",
  },
  {
    ...inboxBase,
    id: 57,
    user_id: VIEWER,
    user_email: "admin@example.test",
    title: "Export the register as CSV",
    body: "One file per month would do.",
    category: "IDEA",
    status: "IN_EVALUATION",
    context: { user_display_name: "Example Admin", url: "/register?month=2026-10" },
    public: true,
    votes: 9,
    replies: [
      {
        id: 1,
        author_name: "Example Admin",
        body: "Built — try it on the register's ⋯ menu.",
        status_to: "IN_EVALUATION",
        status_from: "IN_PROGRESS",
        created_at: "2026-11-03T08:00:00Z",
      },
    ],
    created_at: "2026-11-02T16:30:00Z",
    updated_at: "2026-11-03T08:00:00Z",
  },
  {
    ...inboxBase,
    id: 56,
    user_id: 2,
    user_email: "user@example.test",
    title: "[crash] TypeError: Cannot read properties of undefined (reading 'map') in ImportReviewTable",
    body: "",
    category: "CRASH",
    status: "IN_PROGRESS",
    context: { route: "/imports", boundary: "page", occurrences: 3, auto_reported: true },
    votes: 0,
    replies: [],
    created_at: "2026-11-02T11:00:00Z",
    updated_at: "2026-11-02T11:00:00Z",
  },
  {
    ...inboxBase,
    id: 55,
    user_id: VIEWER,
    user_email: "admin@example.test",
    title: "Where do I change the currency?",
    body: "",
    category: "QUESTION",
    status: "DONE",
    context: { user_display_name: "Example Admin", url: "/settings?tab=currency" },
    public: false,
    votes: 1,
    resolved_at: "2026-11-02T10:00:00Z",
    replies: [
      {
        id: 2,
        author_name: "Example Admin",
        body: "Settings ▸ Currency.",
        status_to: "DONE",
        status_from: "OPEN",
        created_at: "2026-11-02T10:00:00Z",
      },
    ],
    created_at: "2026-11-01T18:45:00Z",
    updated_at: "2026-11-02T10:00:00Z",
  },
];

const SETTLED: readonly FeedbackStatus[] = ["DONE", "WONT_DO"];

/** The server's `resolved_at` rule (§3.4), played here. */
function moved(row: FeedbackRecord, status: FeedbackStatus): FeedbackRecord {
  const settles = SETTLED.includes(status);
  const was = SETTLED.includes(row.status);
  return { ...row, status, resolved_at: settles ? (was ? row.resolved_at : new Date().toISOString()) : null };
}

/** A TanStack `useMutation` result as far as the inbox reads one — `mutateAsync`, and
 *  `isPending` while the request is out — answered in memory. */
function useInMemoryMutation<V>(apply: (variables: V) => void): FeedbackInboxMutation<V> {
  const [isPending, setPending] = useState(false);
  const mutateAsync = useCallback(
    async (variables: V) => {
      setPending(true);
      await new Promise((resolve) => setTimeout(resolve, 250));
      apply(variables);
      setPending(false);
    },
    [apply],
  );
  return { mutateAsync, isPending };
}

/** An app's comments component: its queries are hooks, so the slot renders one per row. */
function InboxComments({ id, canComment }: { id: number; canComment: boolean }) {
  const [comments, setComments] = useState<FeedbackComment[]>(() =>
    id === 58
      ? [
          {
            id: 1,
            author_name: "Anna",
            mine: false,
            staff: false,
            body: "Same here on the iPad.",
            hidden: false,
            created_at: "2026-11-03T10:00:00Z",
          },
        ]
      : [],
  );
  return (
    <FeedbackCommentThread
      comments={comments}
      isAdmin
      onComment={
        canComment
          ? async (body) =>
              setComments((prev) => [
                ...prev,
                {
                  id: prev.length + 10,
                  author_name: null,
                  mine: true,
                  staff: false,
                  body,
                  hidden: false,
                  created_at: new Date().toISOString(),
                },
              ])
          : undefined
      }
      onHide={async (comment, hidden) =>
        setComments((prev) => prev.map((c) => (c.id === comment.id ? { ...c, hidden } : c)))
      }
      onDelete={async (comment) => setComments((prev) => prev.filter((c) => c.id !== comment.id))}
    />
  );
}

export function FeedbackInboxDemo() {
  const [page, setPage] = useState<"inbox" | "mine">("inbox");
  const [parts, setParts] = useState<"public" | "private">("public");
  const [rows, setRows] = useState(SEED);
  const mine = page === "mine";
  const publicParts = parts === "public";
  // A notice's link (§13.7): `?ids=` on the page's own address, as a notification opens it.
  const [params, setParams] = useSearchParams();
  const openNotice = () =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("ids", "57,55");
        return next;
      },
      { replace: true },
    );

  const patch = useCallback(
    (id: number, change: (row: FeedbackRecord) => FeedbackRecord) =>
      setRows((prev) => prev.map((row) => (row.id === id ? change(row) : row))),
    [],
  );
  const update = useInMemoryMutation<FeedbackDetailPatch>(
    useCallback(
      ({ id, status, body, public: visible, category }: FeedbackDetailPatch) =>
        patch(id, (row) => {
          let next = status ? moved(row, status) : row;
          if (body !== undefined) next = { ...next, body };
          if (visible !== undefined) next = { ...next, public: visible };
          // The bulk bar's category: the same PATCH, one report at a time.
          if (category !== undefined) next = { ...next, category };
          return next;
        }),
      [patch],
    ),
  );
  const reply = useInMemoryMutation<FeedbackReplyPost>(
    useCallback(
      ({ id, body, status, attachmentUrl }: FeedbackReplyPost) =>
        patch(id, (row) => ({
          ...(status ? moved(row, status) : row),
          replies: [
            ...(row.replies ?? []),
            {
              id: Date.now(),
              author_name: "Example Admin",
              body,
              status_to: status ?? null,
              status_from: status ? row.status : null,
              attachment_url: attachmentUrl ?? null,
              created_at: new Date().toISOString(),
            },
          ],
        })),
      [patch],
    ),
  );
  const rework = useInMemoryMutation<FeedbackReworkPost>(
    useCallback(
      ({ id, note, attachmentUrl }: FeedbackReworkPost) =>
        // The server moves it (§10.3): REWORK on an admin's own report.
        patch(id, (row) => ({
          ...moved(row, "REWORK"),
          replies: [
            ...(row.replies ?? []),
            {
              id: Date.now(),
              kind: "rework" as const,
              author_name: null,
              body: note,
              status_to: "REWORK" as const,
              attachment_url: attachmentUrl ?? null,
              created_at: new Date().toISOString(),
            },
          ],
        })),
      [patch],
    ),
  );

  // `GET /feedback/my` sends the viewer's own rows and no joined email (§3.1).
  const list = useMemo(
    () => (mine ? rows.filter((r) => r.user_id === VIEWER).map((r) => ({ ...r, user_email: null })) : rows),
    [mine, rows],
  );

  return (
    <Example
      label="FeedbackInbox — the two feedback pages, assembled"
      hint="open a row (it is ?row= in the address), change a status and take it back, reply; tick a few rows (or long-press a card) and set them all at once; narrow the window for the cards, swipes and the toggle"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <ToggleGroup
            aria-label="Inbox page"
            value={page}
            onChange={(v) => setPage(v as "inbox" | "mine")}
            options={[
              { value: "inbox", label: "/feedback" },
              { value: "mine", label: "/my-feedback" },
            ]}
          />
          <ToggleGroup
            aria-label="Public parts"
            value={parts}
            onChange={(v) => setParts(v as "public" | "private")}
            options={[
              { value: "public", label: "With public parts" },
              { value: "private", label: "Without" },
            ]}
          />
          <Button variant="secondary" size="sm" onClick={openNotice} disabled={params.has("ids")}>
            Open a notice&apos;s link (?ids=57,55)
          </Button>
        </div>
        <FeedbackInbox
          rows={list}
          mine={mine}
          canEdit
          viewerId={VIEWER}
          update={update}
          reply={reply}
          rework={rework}
          votes={publicParts}
          publicSwitch={publicParts}
          comments={(row) =>
            publicParts && row.category !== "CRASH" ? <InboxComments id={row.id} canComment={mine} /> : null
          }
          // No upload server here: a rework and a reply are text alone.
          onCaptureScreenshot={null}
          header={(title) => <h3 className="mb-1 text-base font-semibold">{title}</h3>}
          // Inside a card here, not a page's fill-height column.
          table={{ fillHeight: false }}
        />
        <Note>
          {code("<FeedbackInbox rows update reply rework … />")} is the whole of {code("/feedback")} and{" "}
          {code("/my-feedback")}. {code("useFeedbackInbox")} holds the wiring: the open row in {code("?row=")} (digits
          only — a link naming no id opens nothing) and each row&apos;s link to it, keeping the table&apos;s filters,
          sort and page; the Undo over {code("update.mutateAsync")} for the status cell, the pills and the swipes; the
          detail with its reply composer and rework; the phone&apos;s day headers, cards and swipes; the awaiting
          toggle. The three mutations are the app&apos;s TanStack {code("useMutation")} results, passed as they are —
          the kit sends no request. What differs between apps is a slot: {code("votes")}, {code("publicSwitch")},{" "}
          {code("comments={(row) => …}")} (the app&apos;s thread over its own queries), {code("columns")},{" "}
          {code("swipe")}, {code("renderDate")}, {code("renderDetail")}, {code("header")}, {code("phoneActions")}, and{" "}
          {code("table")} and {code("detail")} for the rest of the two parts&apos; props. For a layout of its own, a
          page calls the hook and spreads {code("inbox.table")} into a {code("DataTable")}.
        </Note>
        <Note>
          <strong>Bulk edit</strong>, the admin&apos;s on {code("/feedback")}: tick rows (Shift-click for a range; the
          header box takes every row the filters keep, on every page) or, on a phone, long-press a card — its swipes
          rest while selecting. The bar sets the status, the category (never Crash) or, with {code("publicSwitch")}, the
          visibility of all of them: the page&apos;s {code("update")}, once per report, so each goes through the
          server&apos;s own rules — no bulk endpoint. It notifies nobody: a status alone never does, only a reply. One
          Undo puts each report back to what it was. A report whose change fails stays ticked, to try again;{" "}
          {code("selectable={false}")} turns it off. At &ldquo;0 selected&rdquo; the desktop strip&apos;s Clear
          selection is refused: there it would clear nothing.
        </Note>
        <Note>
          <strong>A notice&apos;s reports</strong>: {code("?ids=57,55")} — what a notification about several reports
          opens — shows exactly those, as the # column&apos;s filter (&ldquo;Only these 2 reports&rdquo;; on a phone, in
          the Filters sheet; with the # column hidden, on a line above the table). Its Clear filter, or the sheet&apos;s
          Clear all, takes {code("ids")} out of the address. The view keeps the filters the list saved out of the way —
          neither applied nor overwritten — and gives them back once the set goes; the sort, the page size and the
          columns stay the person&apos;s. One report is a set of one.
        </Note>
      </div>
    </Example>
  );
}

/* ── since 0.27 ─────────────────────────────────────────────────────────── */

/**
 * 0.27's feedback TABLE (docs/feedback-harmonization.md §4.3): the nine columns, the
 * phone card with its chips, day headers, swipes, the awaiting toggle and the empty
 * state — an app's page, as kit parts. Synthetic data only.
 */

/** The demo's viewer: an admin, so both pages make sense. */
const ME = 1;

const base = {
  user_email: null,
  body: "",
  screenshot_url: null,
  attachment_urls: null,
  outcome: null,
  resolved_at: null,
} as const;

const me = { user_display_name: "Example Admin", user_email: "admin@example.test" };

const them = { user_display_name: "Example User", user_email: "user@example.test" };

const ROWS: FeedbackRecord[] = [
  {
    ...base,
    id: 47,
    user_id: 2,
    user_email: "user@example.test",
    title: "Chart jumps on save",
    body: "It jumps.\n\n--- REWORK 2026-10-04 07:40 ---\nStill jumps on a phone.",
    category: "BUG",
    status: "OPEN",
    context: { ...them, environment: "dev", url: "https://dev.example.test/reports?tab=chart#june" },
    created_at: "2026-10-04T09:12:00Z",
    updated_at: "2026-10-04T09:12:00Z",
  },
  {
    ...base,
    id: 46,
    user_id: ME,
    user_email: "admin@example.test",
    title: "Export the register as CSV, with the account names and the categories in their own columns",
    body: "One file per month would do.\n\n--- REWORK 2026-10-03 10:00 ---\nAnd the totals.\n\n--- REWORK 2026-10-04 08:00 ---\nPer account.",
    category: "IDEA",
    status: "IN_EVALUATION",
    context: { ...me, environment: "local", url: "http://localhost:4170/register?month=2026-09" },
    created_at: "2026-10-04T07:30:00Z",
    updated_at: "2026-10-04T08:00:00Z",
  },
  {
    ...base,
    id: 45,
    user_id: 2,
    user_email: "user@example.test",
    // Long, as a real crash title is (0.48): the Subject column grows
    // into the rest of the row and ellipsises it rather than widening the table.
    title:
      "[crash] TypeError: Cannot read properties of undefined (reading 'map') in ImportReviewTable while rendering the statement review after an upload",
    category: "CRASH",
    status: "IN_PROGRESS",
    context: { route: "/imports", boundary: "page", occurrences: 3, auto_reported: true },
    created_at: "2026-10-03T15:00:00Z",
    updated_at: "2026-10-03T15:00:00Z",
  },
  {
    ...base,
    id: 44,
    user_id: ME,
    user_email: "admin@example.test",
    title: "Where do I change the currency?",
    category: "QUESTION",
    status: "NEEDS_LIVE_TEST",
    // A path-only URL, as an app backfills its old rows.
    context: { ...me, environment: "prod", url: "/settings?tab=currency" },
    created_at: "2026-10-03T08:20:00Z",
    updated_at: "2026-10-03T08:20:00Z",
  },
  {
    ...base,
    id: 43,
    user_id: null,
    title: "Typo in the footer",
    category: "OTHER",
    status: "DONE",
    // An erased account keeps only the allow-list (§3.2).
    context: { route: "/" },
    resolved_at: "2026-10-03T07:00:00Z",
    created_at: "2026-10-02T18:45:00Z",
    updated_at: "2026-10-03T07:00:00Z",
  },
  {
    ...base,
    id: 42,
    user_id: 2,
    user_email: "user@example.test",
    title: "Dark mode for the print view",
    category: "IDEA",
    status: "WONT_DO",
    context: { ...them, url: "https://app.example.test/print" },
    outcome: "Print stays light: paper is.",
    resolved_at: "2026-10-02T12:00:00Z",
    created_at: "2026-10-02T09:00:00Z",
    updated_at: "2026-10-02T12:00:00Z",
  },
];

export function FeedbackTable027Demo() {
  const [page, setPage] = useState<"inbox" | "mine">("inbox");
  const [data, setData] = useState<"rows" | "none">("rows");
  const [rows, setRows] = useState(ROWS);
  const [awaitingOnly, setAwaitingOnly] = useState(false);
  const mine = page === "mine";
  // The admin on /feedback; on /my-feedback nobody edits a status, an admin neither.
  const canEdit = !mine;

  // Stands in for the page's TanStack `mutateAsync`: the PATCH "lands" at once, and the
  // server's resolved_at rule (§3.4) is played here.
  const mutate = useCallback<FeedbackStatusMutateAsync>(async (patch) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== patch.id) return r;
        const settles = patch.status === "DONE" || patch.status === "WONT_DO";
        const was = r.status === "DONE" || r.status === "WONT_DO";
        const resolved_at = settles ? (was ? r.resolved_at : new Date().toISOString()) : null;
        return { ...r, status: patch.status, resolved_at };
      }),
    );
  }, []);
  const changeStatus = useFeedbackStatusUndo(mutate);
  const statusLabels = useFeedbackStatusLabels();
  const labels = useFeedbackPageLabels();
  const renderDate = useFeedbackRenderDate();
  const columns = useFeedbackColumns<FeedbackRecord>({ mine, canEdit, onStatus: changeStatus, renderDate });

  // `GET /feedback/my` sends the viewer's own rows and no joined email (§3.1).
  const all = useMemo(() => {
    if (data === "none") return [];
    return mine ? rows.filter((r) => r.user_id === ME).map((r) => ({ ...r, user_email: null })) : rows;
  }, [data, mine, rows]);
  const visible = canEdit && awaitingOnly ? all.filter((r) => isFeedbackAwaiting(r.status)) : all;

  return (
    <Example
      label="useFeedbackColumns, FeedbackMobileCard, FeedbackAwaitingToggle — the two feedback pages"
      hint="/feedback (admin) and /my-feedback; narrow the window for the phone cards, swipes and the awaiting toggle"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <ToggleGroup
            aria-label="Page"
            value={page}
            onChange={(v) => setPage(v as "inbox" | "mine")}
            options={[
              { value: "inbox", label: "/feedback" },
              { value: "mine", label: "/my-feedback" },
            ]}
          />
          <ToggleGroup
            aria-label="Rows"
            value={data}
            onChange={(v) => setData(v as "rows" | "none")}
            options={[
              { value: "rows", label: "Rows" },
              { value: "none", label: "None yet" },
            ]}
          />
        </div>
        <h3 className="text-base font-semibold">{mine ? labels.myTitle : labels.title}</h3>
        <DataTable
          rows={visible}
          columns={columns}
          rowKey={(r) => r.id}
          // §7.13: one word, on both pages — also when a filter leaves nothing.
          empty={<FeedbackEmptyState />}
          mobileGroupBy={feedbackMobileGroupBy(renderDate)}
          mobileCard={(row) => <FeedbackMobileCard row={row} showSubmitter={canEdit} renderDate={renderDate} />}
          // Admin inbox only (§4.5) — and every swipe goes through the same Undo.
          mobileSwipeActions={
            canEdit
              ? (row) => feedbackSwipePlan(DEFAULT_FEEDBACK_SWIPE, row, { change: changeStatus, labels: statusLabels })
              : undefined
          }
          // The same swipes as the desktop's last column (0.46), minus what the
          // status cell already offers as its own icons.
          desktopSwipeActions={{ omit: feedbackSwipeOmitShown, name: (row) => row.title }}
        />
        {canEdit && <FeedbackAwaitingToggle pressed={awaitingOnly} onPressedChange={setAwaitingOnly} />}
        <Note>
          {code("useFeedbackColumns({ mine, canEdit, onStatus, renderDate })")} is §4.3's nine columns in the contract's
          order, with both select filters listing the whole vocabulary. The subject carries the environment chip
          (non-prod {code("context.environment")}) and {code("Rework ×n")} from {code("reworkCount(body)")}.{" "}
          {code("onStatus")} is {code("useFeedbackStatusUndo(update.mutateAsync)")} — the same change the row detail and
          the swipes use, so every one of them offers Undo. On a wide screen the swipes are also the row&apos;s last
          column ({code("desktopSwipeActions")}), and {code("feedbackSwipeOmitShown")} leaves out the steps the status
          cell already shows — “Done” stays where DONE is more than one step away. On a phone,{" "}
          {code("FeedbackMobileCard")} draws both chips itself: {code("DataTable")} never renders the{" "}
          {code("mobilePrimary")} cell when {code("mobileCard")} is set. The eye at the bottom corner (phone, inbox
          only) narrows to In evaluation + Test when live. An app adds {code('urlSync storageKey="feedback"')}, its{" "}
          {code("?row=")} deep link and the row detail. The table fits its own width: Subject {code("grow")}s and
          ellipsises, and a narrow table leaves out URL, then Email, then Resolved ({code("fitPriority")}) — the Columns
          rail counts what is drawn and marks those “hidden for width”.
        </Note>
      </div>
    </Example>
  );
}

/** The table's subject cell on its own (§4.3, column 4) — round 0.34: it had no specimen
 *  (refactor audit 2026-10, DOC-9). */
export function FeedbackSubjectDemo() {
  return (
    <Example
      label="FeedbackSubject — the title with its environment and rework chips"
      hint="one line in a table cell; wrap on a phone card"
    >
      <div className="max-w-sm space-y-3">
        <div className="rounded-md border border-subtle p-2">
          <FeedbackSubject row={ROWS[1]} />
        </div>
        <div className="rounded-md border border-subtle p-2">
          <FeedbackSubject row={ROWS[1]} wrap />
        </div>
      </div>
      <Note>
        The chips are facts read off the record: {code("context.environment")} when it is not production, and{" "}
        {code("Rework ×n")} from the body&apos;s rework rounds. Without {code("wrap")} the title truncates and the chips
        stay whole; with it the title wraps and the chips follow its last word.
      </Note>
    </Example>
  );
}
