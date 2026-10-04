import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_FEEDBACK_SWIPE,
  DataTable,
  FeedbackAwaitingToggle,
  FeedbackEmptyState,
  FeedbackMobileCard,
  ToggleGroup,
  feedbackMobileGroupBy,
  feedbackSwipePlan,
  isFeedbackAwaiting,
  useFeedbackColumns,
  useFeedbackPageLabels,
  useFeedbackRenderDate,
  useFeedbackStatusLabels,
  useFeedbackStatusUndo,
  type FeedbackRecord,
  type FeedbackStatusMutate,
} from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * 0.27's feedback TABLE (docs/feedback-harmonization.md §4.3): the nine columns, the
 * phone card with its chips, day headers, swipes, the awaiting toggle and the empty
 * state — keksdose's page, as kit parts. Synthetic data only.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

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
    title: "[crash] TypeError: x is undefined",
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
    // A path-only URL, as Kurvenschmiede backfills its old rows.
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

  // Stands in for the page's TanStack mutation: the PATCH "lands" at once, and the
  // server's resolved_at rule (§3.4) is played here.
  const mutate = useCallback<FeedbackStatusMutate>((patch, { onSuccess }) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== patch.id) return r;
        const settles = patch.status === "DONE" || patch.status === "WONT_DO";
        const was = r.status === "DONE" || r.status === "WONT_DO";
        const resolved_at = settles ? (was ? r.resolved_at : new Date().toISOString()) : null;
        return { ...r, status: patch.status, resolved_at };
      }),
    );
    onSuccess();
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
      label="feedbackColumns, FeedbackMobileCard, FeedbackAwaitingToggle — the two feedback pages"
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
          // §7.13: keksdose's one word, on both pages — also when a filter leaves nothing.
          empty={<FeedbackEmptyState />}
          mobileGroupBy={feedbackMobileGroupBy(renderDate)}
          mobileCard={(row) => <FeedbackMobileCard row={row} showSubmitter={canEdit} renderDate={renderDate} />}
          // Admin inbox only (§4.5) — and every swipe goes through the same Undo.
          mobileSwipeActions={
            canEdit
              ? (row) => feedbackSwipePlan(DEFAULT_FEEDBACK_SWIPE, row, { change: changeStatus, labels: statusLabels })
              : undefined
          }
        />
        {canEdit && <FeedbackAwaitingToggle pressed={awaitingOnly} onPressedChange={setAwaitingOnly} />}
        <Note>
          {code("useFeedbackColumns({ mine, canEdit, onStatus, renderDate })")} is §4.3's nine columns in the
          contract's order, with both select filters listing the whole vocabulary. The subject carries the
          environment chip (non-prod {code("context.environment")}) and {code("Rework ×n")} from{" "}
          {code("reworkCount(body)")}. {code("onStatus")} is {code("useFeedbackStatusUndo(update.mutate)")} — the
          same change the row detail and the swipes use, so every one of them offers Undo. On a phone,{" "}
          {code("FeedbackMobileCard")} draws both chips itself: {code("DataTable")} never renders the{" "}
          {code("mobilePrimary")} cell when {code("mobileCard")} is set, which is how keksdose&apos;s cards lost
          them. The eye at the bottom corner (phone, inbox only) narrows to In evaluation + Test when live. An app
          adds {code('urlSync storageKey="feedback"')}, its {code("?row=")} deep link and the row detail.
        </Note>
      </div>
    </Example>
  );
}
