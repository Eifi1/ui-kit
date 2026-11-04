import type { UseMutationResult } from "@tanstack/react-query";
import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { toast } from "../../components/toast";
import { DESKTOP_WIDTH, stubPhone, stubViewportWidth } from "../../test/viewport";
import {
  FeedbackInbox,
  useFeedbackInbox,
  type FeedbackInboxMutation,
  type FeedbackInboxProps,
  type FeedbackReplyPost,
  type FeedbackReworkPost,
  type UseFeedbackInboxOptions,
} from "../feedback-inbox-page";
import type { FeedbackRecord } from "../feedback-record";
import type { FeedbackDetailPatch } from "../feedback-row-detail";
import type { FeedbackStatus } from "../feedback-vocabulary";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { undo: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

/**
 * §13 of the feedback contract (docs/feedback-harmonization.md): the inbox assembled once
 * — kastlan reuse audit 2026-11-02, proposal 2. The wiring kastlan, keksdose and
 * Kurvenschmiede each wrote around the kit's parts: `?row=` and its link, the Undo, the
 * detail's props, the phone's grouping and swipes, the awaiting toggle; and the slots for
 * what differs. Synthetic rows only.
 */

const ADMIN = 1;
const AUTHOR = 7;

function record(over: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: 1,
    user_id: AUTHOR,
    user_email: "author@example.test",
    title: "Chart jumps on save",
    body: "It jumps.",
    category: "BUG",
    status: "OPEN",
    context: { user_display_name: "Example Author", url: "https://app.example.test/accounts" },
    screenshot_url: null,
    attachment_urls: null,
    outcome: null,
    resolved_at: null,
    created_at: "2026-10-04T09:12:00Z",
    updated_at: "2026-10-04T09:12:00Z",
    ...over,
  };
}

// Out of order on purpose: the inbox shows them newest first.
const ROWS: FeedbackRecord[] = [
  record({ id: 2, title: "Typo in the footer", category: "OTHER", status: "DONE", created_at: "2026-10-03T08:00:00Z" }),
  record({ id: 3, title: "Export button missing", category: "IDEA", status: "IN_EVALUATION", replies: [] }),
  record({
    id: 4,
    title: "Where is the currency?",
    category: "QUESTION",
    status: "READY",
    created_at: "2026-10-03T15:00:00Z",
  }),
];

/** A day key that is the same everywhere — the tests' own date writer. */
const isoDay = (iso: string) => iso.slice(0, 10);

/** A mutation that lands at once, as TanStack's `mutateAsync` would. */
function mutation<V>(isPending = false): FeedbackInboxMutation<V> & { mutateAsync: ReturnType<typeof vi.fn> } {
  return { mutateAsync: vi.fn(async (_: V) => undefined), isPending };
}

let location: ReturnType<typeof useLocation> | null = null;
function Where() {
  const here = useLocation();
  useEffect(() => {
    location = here;
  });
  return null;
}
const param = (key: string) => new URLSearchParams(location!.search).get(key);

function renderInbox(props: Partial<FeedbackInboxProps<FeedbackRecord>> = {}, url = "/feedback") {
  const update = mutation<FeedbackDetailPatch>();
  const view = render(
    <MemoryRouter initialEntries={[url]}>
      <FeedbackInbox rows={ROWS} canEdit viewerId={ADMIN} update={update} renderDate={isoDay} {...props} />
      <Where />
    </MemoryRouter>,
  );
  return { ...view, update: (props.update as typeof update | undefined) ?? update };
}

/** The desktop row with this title — the first match: the open detail, in the row after
 *  it, names the report too. */
const desktopRow = (title: string) => screen.getAllByText(title)[0].closest("tr") as HTMLElement;
/** The phone card with this title. */
const card = (title: string) => screen.getByText(title).closest("li") as HTMLElement;
/** The open detail, by its Subject section's line. */
const detail = () => document.querySelector<HTMLElement>("[data-feedback-subject]");

let restore: (() => void) | undefined;
beforeEach(() => {
  vi.mocked(toast.undo).mockClear();
  vi.mocked(toast.success).mockClear();
});
afterEach(() => {
  restore?.();
  restore = undefined;
  vi.unstubAllGlobals();
  // `storageKey="feedback"`: the table keeps its layout per browser.
  localStorage.clear();
});

describe("the open row in ?row=", () => {
  beforeEach(() => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
  });

  it("writes ?row= when a row opens, keeps the table's own params, and clears it on close", () => {
    renderInbox({}, "/feedback?f.status=IN_EVALUATION&p=0");
    expect(detail()).toBeNull();
    fireEvent.click(within(desktopRow("Export button missing")).getByText("Export button missing"));
    expect(param("row")).toBe("3");
    expect(param("f.status")).toBe("IN_EVALUATION");
    expect(detail()).toHaveTextContent("Export button missing");
    // The open row's second click closes it, and the clean URL has no `row`.
    fireEvent.click(within(desktopRow("Export button missing")).getAllByText("Export button missing")[0]);
    expect(param("row")).toBeNull();
    expect(detail()).toBeNull();
  });

  it("opens the row a link names, on arrival", () => {
    renderInbox({}, "/feedback?row=4");
    expect(detail()).toHaveTextContent("Where is the currency?");
  });

  // Each but the first three is #3 to `Number()`, which the apps parsed with.
  it.each(["abc", "0", "", "3.0", "3e0", "0x3", "+3", " 3", "03"])("ignores ?row=%j", (raw) => {
    renderInbox({}, `/feedback?row=${encodeURIComponent(raw)}`);
    expect(detail()).toBeNull();
  });

  it("gives every row its own address: this view with that row open", () => {
    const { result } = renderHook(
      () => useFeedbackInbox({ rows: ROWS, canEdit: true, update: mutation<FeedbackDetailPatch>() }),
      { wrapper: routerAt("/feedback?sort=date&row=2") },
    );
    // The open row's link still opens it — a link copied off an open row is that row.
    expect(result.current.rowHref(ROWS[0])).toBe("/feedback?sort=date&row=2");
    expect(result.current.rowHref(ROWS[1])).toBe("/feedback?sort=date&row=3");
    expect(result.current.openId).toBe(2);
    // The table's link is that address (feedback #451).
    renderInbox({}, "/feedback?sort=date");
    expect(within(desktopRow("Typo in the footer")).getByRole("link", { name: /Typo in the footer/ })).toHaveAttribute(
      "href",
      "/feedback?sort=date&row=2",
    );
  });
});

function routerAt(url: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>;
  };
}

describe("the rows", () => {
  it("are shown newest first, whatever order the query answered in", () => {
    const { result } = renderHook(
      () => useFeedbackInbox({ rows: ROWS, canEdit: true, update: mutation<FeedbackDetailPatch>() }),
      { wrapper: routerAt("/feedback") },
    );
    expect(result.current.table.rows.map((r) => r.id)).toEqual([3, 4, 2]);
  });

  it("narrow to what waits on the triager behind the toggle — the inbox only", () => {
    const { result, rerender } = renderHook(
      ({ mine }: { mine: boolean }) =>
        useFeedbackInbox({ rows: ROWS, mine, canEdit: true, update: mutation<FeedbackDetailPatch>() }),
      { wrapper: routerAt("/feedback"), initialProps: { mine: false } },
    );
    act(() => result.current.setAwaiting(true));
    expect(result.current.table.rows.map((r) => r.id)).toEqual([3]);
    // On /my-feedback the author is not waiting on their own verdict: no narrowing there.
    rerender({ mine: true });
    expect(result.current.table.rows.map((r) => r.id)).toEqual([3, 4, 2]);
  });
});

describe("the mutations", () => {
  it("are TanStack Query's useMutation results, passed as they are (checked by tsc)", () => {
    // kastlan's three, as its page declares their variables; a page whose PATCH takes
    // fewer keys (keksdose's has no `outcome`) fits too.
    expectTypeOf<UseMutationResult<FeedbackRecord, Error, FeedbackDetailPatch>>().toExtend<
      FeedbackInboxMutation<FeedbackDetailPatch>
    >();
    expectTypeOf<
      UseMutationResult<unknown, Error, { id: number; status?: FeedbackStatus; body?: string; public?: boolean }>
    >().toExtend<FeedbackInboxMutation<FeedbackDetailPatch>>();
    expectTypeOf<
      UseMutationResult<
        FeedbackRecord,
        Error,
        { id: number; body: string; status?: FeedbackStatus; attachmentUrl?: string }
      >
    >().toExtend<FeedbackInboxMutation<FeedbackReplyPost>>();
    expectTypeOf<UseMutationResult<void, Error, { id: number; note: string; attachmentUrl?: string }>>().toExtend<
      FeedbackInboxMutation<FeedbackReworkPost>
    >();
  });
});

describe("a status change", () => {
  it("goes through the page's PATCH and offers Undo — from the status cell", async () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    const { update } = renderInbox();
    await act(async () => {
      fireEvent.click(within(desktopRow("Where is the currency?")).getByRole("button", { name: "Won't do" }));
    });
    expect(update.mutateAsync).toHaveBeenCalledWith({ id: 4, status: "WONT_DO" });
    expect(toast.undo).toHaveBeenCalledWith(
      "Set to “Won't do”: Where is the currency?",
      expect.objectContaining({ label: "Undo" }),
    );
  });

  it("is the one change the cell, the detail's pills and the swipes share", () => {
    const update = mutation<FeedbackDetailPatch>();
    const { result } = renderHook(() => useFeedbackInbox({ rows: ROWS, canEdit: true, update }), {
      wrapper: routerAt("/feedback"),
    });
    const { changeStatus } = result.current;
    expect(result.current.detailProps(ROWS[0]).statusChange).toBe(changeStatus);
    const plan = result.current.table.mobileSwipeActions?.(ROWS[2]);
    plan?.end?.[0].onCommit();
    expect(update.mutateAsync).toHaveBeenCalledWith({ id: 4, status: "IN_PROGRESS" });
  });
});

describe("the detail", () => {
  const options = () => {
    const update = mutation<FeedbackDetailPatch>(true);
    const reply = mutation<FeedbackReplyPost>(true);
    const rework = mutation<FeedbackReworkPost>();
    const onUpload = vi.fn(async () => "/api/v1/feedback/attachments/000000000001.png");
    const fetcher = vi.fn();
    return { update, reply, rework, onUpload, fetcher };
  };

  it("gets the props the three apps passed it", async () => {
    const { update, reply, rework, onUpload, fetcher } = options();
    const { result } = renderHook(
      () =>
        useFeedbackInbox({
          rows: ROWS,
          canEdit: true,
          viewerId: ADMIN,
          update,
          reply,
          rework,
          onUpload,
          fetcher,
          publicSwitch: true,
          renderDate: isoDay,
        }),
      { wrapper: routerAt("/feedback") },
    );
    const props = result.current.detailProps(ROWS[1]);
    expect(props).toMatchObject({
      row: ROWS[1],
      canEdit: true,
      viewerId: ADMIN,
      // The promise form, as the detail's editors close on it (0.52).
      onUpdate: update.mutateAsync,
      pending: true,
      onUpload,
      fetcher,
      renderDate: isoDay,
      // The admin's reply takes a file (feedback §12) — all three pass it.
      replyAttachments: true,
      replying: true,
    });
    // The kit's capture, as kastlan and Kurvenschmiede passed it.
    expect(props.onCaptureScreenshot).toEqual(expect.any(Function));

    await props.onReply?.("Looking.", "IN_EVALUATION", "/api/v1/feedback/attachments/000000000002.png");
    expect(reply.mutateAsync).toHaveBeenLastCalledWith({
      id: 3,
      body: "Looking.",
      status: "IN_EVALUATION",
      attachmentUrl: "/api/v1/feedback/attachments/000000000002.png",
    });
    // What carries nothing is left out, so a mutationFn may spread it onto the wire.
    await props.onReply?.("Thanks.");
    expect(reply.mutateAsync).toHaveBeenLastCalledWith({ id: 3, body: "Thanks." });
    await props.onRework?.("Still cut off.");
    expect(rework.mutateAsync).toHaveBeenLastCalledWith({ id: 3, note: "Still cut off." });
    props.onPublicChange?.(false);
    expect(update.mutateAsync).toHaveBeenLastCalledWith({ id: 3, public: false });
  });

  it("is read-only on /my-feedback, for an admin too, and takes the kit's date there unless given one", () => {
    const { update } = options();
    const { result } = renderHook(
      () => useFeedbackInbox({ rows: ROWS, mine: true, canEdit: true, viewerId: ADMIN, update }),
      { wrapper: routerAt("/my-feedback") },
    );
    const props = result.current.detailProps(ROWS[0]);
    expect(result.current.editable).toBe(false);
    expect(props.canEdit).toBe(false);
    // kastlan's detail never had the table's date: the "Resolved:" stays a sentence's.
    expect(props.renderDate).toBeUndefined();
    expect(props.onReply).toBeUndefined();
    expect(props.onRework).toBeUndefined();
    expect(props.onPublicChange).toBeUndefined();
    expect(result.current.table.mobileSwipeActions).toBeUndefined();
    expect(result.current.title).toBe("My feedback");
  });

  it("lets the app's own settings win, and turns the capture off with null", () => {
    const { update } = options();
    const { result } = renderHook(
      () =>
        useFeedbackInbox({
          rows: ROWS,
          canEdit: true,
          update,
          onCaptureScreenshot: null,
          detail: { showSubject: false, replyAttachments: false, commit: true },
        }),
      { wrapper: routerAt("/feedback") },
    );
    expect(result.current.detailProps(ROWS[0])).toMatchObject({
      showSubject: false,
      replyAttachments: false,
      commit: true,
      onCaptureScreenshot: undefined,
    });
  });

  it("draws the composer, the switch and the comments for the admin", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    const reply = mutation<FeedbackReplyPost>();
    renderInbox(
      {
        reply,
        publicSwitch: true,
        rows: ROWS.map((r) => (r.id === 3 ? { ...r, public: true } : r)),
        comments: (row) => <p>Thread of #{row.id}</p>,
      },
      "/feedback?row=3",
    );
    expect(screen.getByRole("textbox", { name: "Write a reply" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Visible to others" })).toBeInTheDocument();
    expect(screen.getByText("Comments")).toBeInTheDocument();
    expect(screen.getByText("Thread of #3")).toBeInTheDocument();
  });

  it("draws no Comments section where the slot answers nothing", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    renderInbox({ comments: (row) => row.category !== "IDEA" && <p>Thread</p> }, "/feedback?row=3");
    expect(detail()).toHaveTextContent("Export button missing");
    expect(screen.queryByText("Comments")).toBeNull();
  });
});

describe("the phone", () => {
  beforeEach(() => {
    stubPhone();
  });

  it("groups the cards under the day headers the cards' dates say", () => {
    renderInbox();
    const headers = screen.getAllByText(/^2026-10-0\d$/).filter((el) => !el.closest("time"));
    expect(headers.map((h) => h.textContent)).toEqual(["2026-10-04", "2026-10-03"]);
    // The submitter on the admin's cards (the short form).
    expect(within(card("Export button missing")).getByText("· Example Author")).toBeInTheDocument();
  });

  it("swipes on the inbox, through the same Undo as a tap", async () => {
    const { update } = renderInbox();
    const actions = within(card("Where is the currency?")).getByRole("group", { name: "Row actions" });
    await act(async () => {
      fireEvent.click(within(actions).getByRole("button", { name: "In progress" }));
    });
    expect(update.mutateAsync).toHaveBeenCalledWith({ id: 4, status: "IN_PROGRESS" });
    expect(toast.undo).toHaveBeenCalledWith("Set to “In progress”: Where is the currency?", expect.anything());
  });

  it("takes the app's binding (keksdose's Settings → Interaction)", () => {
    renderInbox({ swipe: { end: ["wont_do"], start: [] } });
    const actions = within(card("Where is the currency?")).getByRole("group", { name: "Row actions" });
    expect(
      within(actions)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Won't do"]);
  });

  it("neither swipes nor offers the toggle on /my-feedback", () => {
    renderInbox({ mine: true }, "/my-feedback");
    expect(within(card("Where is the currency?")).queryByRole("group", { name: "Row actions" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Only what is waiting for you" })).toBeNull();
    expect(screen.queryByText(/Example Author/)).toBeNull();
  });

  it("narrows to what is waiting with the toggle", () => {
    renderInbox();
    fireEvent.click(screen.getByRole("button", { name: "Only what is waiting for you" }));
    expect(screen.getByText("Export button missing")).toBeInTheDocument();
    expect(screen.queryByText("Typo in the footer")).toBeNull();
  });
});

describe("the slots", () => {
  beforeEach(() => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
  });

  it("draws the kit's header with the page's title, the app's, or none", () => {
    const { unmount } = renderInbox();
    expect(screen.getByRole("heading", { level: 1, name: "Feedback inbox" })).toBeInTheDocument();
    unmount();
    const second = renderInbox({ mine: true, header: (title) => <h2 data-tour="feedback-header">{title}!</h2> });
    expect(screen.getByRole("heading", { level: 2, name: "My feedback!" })).toBeInTheDocument();
    second.unmount();
    renderInbox({ header: null });
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("wraps the detail (kastlan's tour anchor)", () => {
    renderInbox({ renderDetail: (row, node) => <div data-testid={`anchor-${row.id}`}>{node}</div> }, "/feedback?row=2");
    expect(screen.getByTestId("anchor-2")).toContainElement(detail());
    expect(detail()).toHaveTextContent("Typo in the footer");
  });

  it("adds the votes column and the card's count", () => {
    renderInbox({ votes: true, rows: ROWS.map((r) => ({ ...r, votes: r.id })) });
    expect(screen.getByRole("columnheader", { name: /Votes/ })).toBeInTheDocument();
    expect(desktopRow("Where is the currency?").querySelector('[data-feedback-vote-count="4"]')).not.toBeNull();
  });

  it("takes the app's own columns over the kit's", () => {
    const columns: NonNullable<UseFeedbackInboxOptions<FeedbackRecord>["columns"]> = (kit) => [
      ...kit.filter((c) => c.key !== "email"),
      { key: "team", header: "Team", cell: (row) => `Team ${row.id}` },
    ];
    renderInbox({ columns });
    expect(screen.queryByRole("columnheader", { name: /Email/ })).toBeNull();
    expect(screen.getByRole("columnheader", { name: /Team/ })).toBeInTheDocument();
    expect(within(desktopRow("Where is the currency?")).getByText("Team 4")).toBeInTheDocument();
  });

  it("passes the app's DataTable props through", () => {
    renderInbox({ table: { empty: <span>Nothing here</span> }, rows: [] });
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("says None when empty, and Loading while the first answer is out", () => {
    const { unmount, container } = renderInbox({ rows: [] });
    expect(screen.getByText("None")).toBeInTheDocument();
    unmount();
    renderInbox({ rows: [], loading: true });
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("None")).toBeNull();
    expect(container.ownerDocument.querySelector("[data-feedback-inbox]")).toHaveAttribute("aria-busy", "true");
  });

  it("puts the app's phone actions after the toggle, and alone on /my-feedback", () => {
    stubPhone();
    const { unmount } = renderInbox({ phoneActions: <button type="button">Export</button> });
    const group = screen.getByRole("group", { name: "Feedback actions" });
    expect(
      within(group)
        .getAllByRole("button")
        .map((b) => b.textContent || b.getAttribute("aria-label")),
    ).toEqual(["Only what is waiting for you", "Export"]);
    unmount();
    renderInbox({ mine: true, phoneActions: <button type="button">Export</button> }, "/my-feedback");
    expect(
      within(screen.getByRole("group", { name: "Feedback actions" }))
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Export"]);
  });

  it("puts the table's status writes under the page's lock with `commit`", () => {
    const { result } = renderHook(
      () => useFeedbackInbox({ rows: ROWS, canEdit: true, update: mutation<FeedbackDetailPatch>(), commit: true }),
      { wrapper: routerAt("/feedback") },
    );
    const actions = result.current.table.desktopSwipeActions;
    expect(typeof actions === "object" && actions.commit).toBe(true);
  });
});
