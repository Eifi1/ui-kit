import { useCallback, useMemo, useState } from "react";
import {
  FeedbackMenu,
  FeedbackPublicDetail,
  FeedbackPublicList,
  FeedbackPublicSwitch,
  NotificationTypesSetting,
  ToggleGroup,
  useFeedbackNotificationTypes,
  useFeedbackSubmit,
} from "@eifi1/ui-kit";
import type {
  FeedbackComment,
  FeedbackCreatePayload,
  FeedbackPublicListItem,
  FeedbackPublicRecord,
  FeedbackPublicSort,
  FeedbackRecord,
  FeedbackVoteState,
  NotificationTypesValue,
} from "@eifi1/ui-kit";
import { Example, Note, beat, code } from "../../lib/section";

/**
 * Round 0.38's public feedback pages (docs/feedback-harmonization.md §9.15): the list every
 * user reads, one report opened, the "Visible to others" switch, the menu's "All
 * feedback" row, the dialog's notice and the two notification types. A pretend server
 * answers; the people are synthetic. The thread parts themselves (vote, comments,
 * replies) are thread-038.tsx's.
 */

/** The viewer: Ada, id 7, an ordinary user unless the demo says admin. */
const ME = 7;

const REPORTS: FeedbackPublicRecord[] = [
  {
    id: 52,
    title: "Chart jumps on save",
    category: "BUG",
    status: "IN_PROGRESS",
    author_name: "Anna",
    mine: false,
    votes: 4,
    voted: false,
    comment_count: 2,
    created_at: "2026-10-12T09:12:00Z",
    updated_at: "2026-10-13T16:40:00Z",
    resolved_at: null,
    body: "The chart scrolls back to January whenever I save a transaction.\n\n--- REWORK 2026-10-13 08:00 ---\nStill happens on the phone.",
    replies: [
      {
        id: 1,
        author_name: "Marcel",
        body: "Reproduced on Safari. Fix is on its way.",
        status_to: "IN_PROGRESS",
        created_at: "2026-10-13T10:00:00Z",
      },
    ],
  },
  {
    id: 51,
    title: "Export the register as CSV",
    category: "IDEA",
    status: "OPEN",
    author_name: "Ada",
    mine: true,
    votes: 6,
    voted: true,
    comment_count: 1,
    created_at: "2026-10-11T14:30:00Z",
    updated_at: "2026-10-12T08:00:00Z",
    resolved_at: null,
    body: "One file per month, with the categories in their own column.",
    replies: [],
  },
  {
    id: 49,
    title: "Typo in the footer",
    category: "OTHER",
    status: "DONE",
    // An incomplete or erased account: no name to show (§9.5).
    author_name: null,
    mine: false,
    votes: 1,
    voted: false,
    comment_count: 0,
    created_at: "2026-10-08T18:45:00Z",
    updated_at: "2026-10-09T07:00:00Z",
    resolved_at: "2026-10-09T07:00:00Z",
    body: "“Privacy” is spelt “Privasy”.",
    // A migrated outcome: no author, no status change (§9.7).
    replies: [{ id: 2, author_name: null, body: "Fixed in 0.4.27.", status_to: "DONE", created_at: "2026-10-09T07:00:00Z" }],
  },
];

const COMMENTS: Record<number, FeedbackComment[]> = {
  52: [
    { id: 11, author_name: "Ben", mine: false, staff: false, body: "Same on the iPad.", hidden: false, created_at: "2026-10-12T11:00:00Z" },
    { id: 12, author_name: null, mine: false, staff: false, body: null, hidden: true, created_at: "2026-10-12T12:00:00Z" },
  ],
  51: [
    { id: 13, author_name: "Ada", mine: true, staff: false, body: "Totals per account would help too.", hidden: false, created_at: "2026-10-12T08:00:00Z" },
  ],
  49: [],
};

const SORTERS: Record<FeedbackPublicSort, (a: FeedbackPublicListItem, b: FeedbackPublicListItem) => number> = {
  newest: (a, b) => b.created_at.localeCompare(a.created_at),
  votes: (a, b) => b.votes - a.votes || b.created_at.localeCompare(a.created_at),
  updated: (a, b) => b.updated_at.localeCompare(a.updated_at),
};

export function FeedbackPublic038Demo() {
  const [reports, setReports] = useState(REPORTS);
  const [comments, setComments] = useState(COMMENTS);
  const [sort, setSort] = useState<FeedbackPublicSort>("newest");
  const [search, setSearch] = useState("");
  const [titles, setTitles] = useState<"plain" | "sealed">("plain");
  const [role, setRole] = useState<"user" | "admin">("user");
  const isAdmin = role === "admin";

  // What `GET /feedback/public?sort=&q=` answers, sorted and searched on the server —
  // played here (the real list item has no body and no replies; the list reads neither).
  const rows = useMemo<FeedbackPublicListItem[]>(() => {
    const q = titles === "plain" ? search.trim().toLowerCase() : "";
    return reports
      .filter((r) => !q || r.title.toLowerCase().includes(q))
      .sort(SORTERS[sort]);
  }, [reports, search, sort, titles]);

  const vote = useCallback(async (id: number, next: boolean): Promise<FeedbackVoteState> => {
    await beat(300);
    let answer: FeedbackVoteState = { votes: 0, voted: next };
    setReports((all) =>
      all.map((r) => {
        if (r.id !== id) return r;
        answer = { votes: r.votes + (next === r.voted ? 0 : next ? 1 : -1), voted: next };
        return { ...r, ...answer };
      }),
    );
    return answer;
  }, []);

  const addComment = async (id: number, body: string) => {
    await beat(300);
    setComments((all) => ({
      ...all,
      [id]: [
        ...(all[id] ?? []),
        { id: Date.now(), author_name: "Ada", mine: true, staff: false, body, hidden: false, created_at: new Date().toISOString() },
      ],
    }));
  };
  const patchComment = (id: number, commentId: number, change: Partial<FeedbackComment> | null) =>
    setComments((all) => ({
      ...all,
      [id]: change
        ? (all[id] ?? []).map((c) => (c.id === commentId ? { ...c, ...change } : c))
        : (all[id] ?? []).filter((c) => c.id !== commentId),
    }));

  return (
    <Example
      label="FeedbackPublicList + FeedbackPublicDetail — All feedback"
      hint="sort, search (only where titles are plain), vote from the row; open one to read and comment"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <ToggleGroup
            aria-label="Signed in as"
            value={role}
            onChange={(v) => setRole(v as "user" | "admin")}
            options={[
              { value: "user", label: "User" },
              { value: "admin", label: "Admin" },
            ]}
          />
          <ToggleGroup
            aria-label="The app's titles"
            value={titles}
            onChange={(v) => setTitles(v as "plain" | "sealed")}
            options={[
              { value: "plain", label: "Plain titles" },
              { value: "sealed", label: "Sealed titles" },
            ]}
          />
        </div>
        <FeedbackPublicList
          rows={rows}
          total={rows.length}
          sort={sort}
          onSortChange={setSort}
          search={search}
          onSearchChange={titles === "plain" ? setSearch : undefined}
          onVote={(row, next) => vote(row.id, next)}
          renderDetail={(row) => {
            const record = reports.find((r) => r.id === row.id)!;
            return (
              <FeedbackPublicDetail
                row={record}
                comments={comments[row.id]}
                isAdmin={isAdmin}
                onVote={(next) => vote(row.id, next)}
                onComment={(body) => addComment(row.id, body)}
                onHide={(comment, hidden) => patchComment(row.id, comment.id, { hidden })}
                onDelete={(comment) => patchComment(row.id, comment.id, null)}
              />
            );
          }}
        />
        <Note>
          {code("GET /feedback/public")} carries titles only — no body, no submitter, no file (§9.10) — and the
          server sorts: {code("newest")}, {code("votes")} (most, then newest) or {code("updated")}. The search box is
          drawn only with {code("onSearchChange")}; an app that seals its titles passes none. The
          viewer&apos;s own report counts as their vote and is locked. The detail names people by first name, or
          &quot;A user&quot;, and merges the admin&apos;s replies with the comments, oldest first.
        </Note>
      </div>
    </Example>
  );
}

/* ── The switch ─────────────────────────────────────────────────────────── */

const SWITCH_ROW: Pick<FeedbackRecord, "user_id" | "category" | "status" | "public" | "filed_private"> = {
  user_id: ME,
  category: "IDEA",
  status: "OPEN",
  public: true,
  filed_private: false,
};

export function FeedbackPublicSwitch038Demo() {
  const [row, setRow] = useState(SWITCH_ROW);
  const [viewer, setViewer] = useState<"author" | "admin">("author");
  const [pending, setPending] = useState(false);
  return (
    <Example label="FeedbackPublicSwitch — Visible to others" hint="the author while the report is open; the admin always">
      <div className="flex max-w-md flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <ToggleGroup
            aria-label="Who is looking"
            value={viewer}
            onChange={(v) => setViewer(v as "author" | "admin")}
            options={[
              { value: "author", label: "The author" },
              { value: "admin", label: "Admin" },
            ]}
          />
          <ToggleGroup
            aria-label="Status"
            value={row.status === "OPEN" ? "OPEN" : "DONE"}
            onChange={(v) => setRow((r) => ({ ...r, status: v as "OPEN" | "DONE" }))}
            options={[
              { value: "OPEN", label: "Open" },
              { value: "DONE", label: "Done" },
            ]}
          />
          <ToggleGroup
            aria-label="How it became public"
            value={row.filed_private ? "yes" : "no"}
            onChange={(v) => setRow((r) => ({ ...r, filed_private: v === "yes" }))}
            options={[
              { value: "no", label: "Filed public" },
              { value: "yes", label: "Made public by the migration" },
            ]}
          />
        </div>
        <FeedbackPublicSwitch
          row={row}
          isAdmin={viewer === "admin"}
          viewerId={viewer === "admin" ? 1 : ME}
          pending={pending}
          onChange={async (next) => {
            setPending(true);
            await beat(400);
            setRow((r) => ({ ...r, public: next }));
            setPending(false);
          }}
        />
        <Note>
          {code("PATCH /feedback/{id} {public}")}. The author flips it while the report is OPEN, READY or
          IN_PROGRESS, and at any status on a report the migration made public ({code("filed_private")}, the
          opt-out the notice offers); past that it is locked with the reason. Never drawn on a CRASH, nor for anyone
          but the author and an admin. {code("feedbackPublicSwitchAllowed(row, {isAdmin, viewerId})")} is the rule
          on its own.
        </Note>
      </div>
    </Example>
  );
}

/* ── The menu and the dialog ────────────────────────────────────────────── */

const ADA = { id: ME, email: "ada@example.test", display_name: "Ada Example" };

export function FeedbackPublicCompose038Demo() {
  const [last, setLast] = useState<FeedbackCreatePayload | null>(null);
  const feedback = useFeedbackSubmit({
    upload: async () => {
      await beat(200);
      return "/api/v1/feedback/attachments/000000000001.png";
    },
    create: async (payload) => {
      await beat(400);
      setLast(payload);
      return { id: 413 };
    },
    user: ADA,
    environment: "local",
    version: "0.38.0",
    capture: false,
    publicNotice: true,
  });
  return (
    <Example
      label="FeedbackMenu publicHref + useFeedbackSubmit publicNotice — reports others read"
      hint="All feedback above the list link; the dialog says who will read the report"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-end gap-1 rounded-lg border border-subtle bg-surface px-3 py-1.5">
          <span className="me-auto text-sm font-semibold text-primary">Example Ltd</span>
          <FeedbackMenu onFile={feedback.open} publicHref="/feedback-inbox" myFeedbackHref="/feedback-compose" />
        </div>
        {feedback.dialog}
        {last && (
          <pre className="max-h-48 overflow-auto rounded-md bg-surface-2 p-3 text-xs text-secondary">
            {JSON.stringify({ title: last.title, body: last.body, category: last.category }, null, 2)}
          </pre>
        )}
        <Note>
          {code('<FeedbackMenu publicHref="/all-feedback" />')} adds <strong>All feedback</strong> above the list
          link, for everyone; &quot;My feedback&quot; stays. {code("useFeedbackSubmit({ publicNotice: true })")}{" "}
          writes &quot;Other users will see the title and text (never your screenshots or files)&quot; under the
          body. Leave both out where the app has no public parts or the viewer may not read them.
        </Note>
      </div>
    </Example>
  );
}

/* ── The notification types ─────────────────────────────────────────────── */

export function FeedbackNotificationTypes038Demo() {
  const types = useFeedbackNotificationTypes();
  const [value, setValue] = useState<NotificationTypesValue>({
    feedback_answered: { app: true, email: true },
    feedback_comment: { app: true, email: false },
  });
  return (
    <Example
      label="useFeedbackNotificationTypes — answers and comments"
      hint="the kit's words for the two feedback types, on by default"
    >
      <div className="max-w-md">
        <NotificationTypesSetting
          types={types}
          value={value}
          onChange={async (patch) => {
            await beat(300);
            setValue((current) => {
              const next = { ...current };
              for (const [id, change] of Object.entries(patch.types ?? {})) {
                if (change && next[id]) next[id] = { app: change.app ?? next[id].app, email: change.email ?? next[id].email };
              }
              return next;
            });
          }}
        />
      </div>
      <Note>
        {code("feedback_answered")} fires on a reply, {code("feedback_comment")} on a visible comment, to the author
        and the earlier commenters, never the writer; no content in the mail or the push. Spread the entries into
        the app&apos;s own {code("types")}: the card draws only what the server answered, so an app that declares{" "}
        {code("feedback_answered")} alone shows one.
      </Note>
    </Example>
  );
}
