import { act, fireEvent, render as rtlRender, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { axeViolations } from "../../test/axe";
import { DESKTOP_WIDTH, PHONE_WIDTH, stubViewportWidth } from "../../test/viewport";
import { FeedbackPublicDetail, FeedbackPublicList, type FeedbackPublicListProps } from "../feedback-public-list";
import type { FeedbackComment, FeedbackPublicListItem, FeedbackPublicRecord } from "../feedback-public-types";

/**
 * docs/feedback-harmonization.md §9.3, §9.9, §9.10, §9.15: the list every user reads —
 * titles only, sorted by the server, searchable only where the app says so — and one
 * report opened: the first name or "A user", the public body, the conversation, the vote.
 */

// DataTable keeps its view in the URL: it needs a router, as in an app.
const render = (ui: ReactElement) => rtlRender(ui, { wrapper: MemoryRouter });

let restore: (() => void) | undefined;
afterEach(() => {
  restore?.();
  restore = undefined;
});

const ROWS: FeedbackPublicListItem[] = [
  {
    id: 12,
    title: "Chart jumps on save",
    category: "BUG",
    status: "OPEN",
    author_name: "Anna",
    mine: false,
    votes: 3,
    voted: false,
    comment_count: 2,
    created_at: "2026-10-04T09:12:00Z",
    updated_at: "2026-10-05T09:12:00Z",
    resolved_at: null,
  },
  {
    id: 11,
    title: "Export as CSV",
    category: "IDEA",
    status: "DONE",
    author_name: null,
    mine: true,
    votes: 1,
    voted: true,
    comment_count: 0,
    created_at: "2026-10-03T09:12:00Z",
    updated_at: "2026-10-03T10:12:00Z",
    resolved_at: "2026-10-03T10:12:00Z",
  },
];

function renderList(props: Partial<FeedbackPublicListProps> = {}) {
  const onSortChange = vi.fn();
  const onVote = vi.fn(async (_row: FeedbackPublicListItem, next: boolean) => ({ votes: next ? 4 : 3, voted: next }));
  const utils = render(
    <FeedbackPublicList
      rows={ROWS}
      sort="newest"
      onSortChange={onSortChange}
      onVote={onVote}
      renderDetail={(row) => <div data-testid="detail">Detail of #{row.id}</div>}
      {...props}
    />,
  );
  return { ...utils, onSortChange, onVote };
}

describe("FeedbackPublicList — desktop", () => {
  it("shows titles only: #, Date, Category, Subject, Votes, Status — no submitter, no body", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    renderList();
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent?.trim());
    expect(headers).toEqual(expect.arrayContaining(["#", "Date", "Category", "Subject", "Votes", "Status"]));
    expect(headers).not.toContain("User");
    expect(headers).not.toContain("Email");
    expect(screen.getByText("Chart jumps on save")).toBeInTheDocument();
    // The visible comments beside the title, in words for a screen reader.
    expect(screen.getByText("2 comments")).toBeInTheDocument();
  });

  it("sorts on the server: the toggle says which way, Newest first", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    const { onSortChange } = renderList({ total: 2 });
    const group = screen.getByRole("radiogroup", { name: "Sort" });
    const options = within(group).getAllByRole("radio").map((r) => r.textContent);
    expect(options).toEqual(["Newest", "Most wanted", "Recently updated"]);
    fireEvent.click(within(group).getByRole("radio", { name: "Most wanted" }));
    expect(onSortChange).toHaveBeenCalledWith("votes");
    expect(screen.getByText("2 reports")).toBeInTheDocument();
  });

  it("has no search box without onSearchChange (sealed titles), and one with it", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    const { unmount } = renderList();
    expect(screen.queryByRole("searchbox")).toBeNull();
    unmount();
    const onSearchChange = vi.fn();
    renderList({ search: "", onSearchChange });
    fireEvent.change(screen.getByRole("searchbox", { name: "Search titles" }), { target: { value: "chart" } });
    expect(onSearchChange).toHaveBeenCalledWith("chart");
  });

  it("votes from the row without opening it; the viewer's own report is locked", async () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    const { onVote } = renderList();
    const buttons = screen.getAllByRole("button", { name: /I want this too|Your report/ });
    const first = buttons.find((b) => b.closest("tr")?.textContent?.includes("Chart jumps"))!;
    await act(async () => fireEvent.click(first));
    expect(onVote).toHaveBeenCalledWith(ROWS[0], true);
    expect(screen.queryByTestId("detail")).toBeNull();
    const own = buttons.find((b) => b.closest("tr")?.textContent?.includes("Export as CSV"))!;
    expect(own).toHaveAttribute("aria-disabled", "true");
  });

  it("opens a row in place with renderDetail, and closes it again", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    renderList();
    fireEvent.click(screen.getByText("Chart jumps on save"));
    expect(screen.getByTestId("detail")).toHaveTextContent("Detail of #12");
    fireEvent.click(screen.getByText("Chart jumps on save"));
    expect(screen.queryByTestId("detail")).toBeNull();
  });

  it("says when it is loading, and when there is nothing", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    const { rerender } = renderList({ rows: [], loading: true });
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    rerender(
      <FeedbackPublicList rows={[]} sort="newest" onSortChange={() => {}} onVote={vi.fn()} renderDetail={() => null} />,
    );
    expect(screen.getByText("No reports yet")).toBeInTheDocument();
  });

  it("passes axe", async () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    const { container } = renderList({ total: 2, onSearchChange: () => {} });
    expect(await axeViolations(container)).toEqual([]);
  });

  it("speaks the provider's language", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <FeedbackPublicList rows={ROWS} sort="votes" onSortChange={() => {}} onVote={vi.fn()} renderDetail={() => null} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("radio", { name: "Meistgewünscht" })).toBeChecked();
    expect(screen.getByRole("columnheader", { name: "Stimmen" })).toBeInTheDocument();
  });
});

describe("FeedbackPublicList — server pages, total unknown (0.38.1, Kurvenschmiede)", () => {
  it("has no pager without onPageChange, nor on a first page with nothing after it", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    const { rerender } = renderList();
    expect(screen.queryByRole("button", { name: "Next page" })).toBeNull();
    rerender(
      <FeedbackPublicList
        rows={ROWS}
        sort="newest"
        onSortChange={() => {}}
        onVote={vi.fn()}
        renderDetail={() => null}
        page={0}
        hasMore={false}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Next page" })).toBeNull();
  });

  it("pages back and forth without a total: Previous off on the first page, Next off without more", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    const onPageChange = vi.fn();
    const { rerender } = renderList({ page: 0, hasMore: true, onPageChange });
    const pager = screen.getByRole("group", { name: "Page 1" });
    expect(within(pager).getByRole("button", { name: "Previous page" })).toBeDisabled();
    fireEvent.click(within(pager).getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
    rerender(
      <FeedbackPublicList
        rows={ROWS}
        sort="newest"
        onSortChange={() => {}}
        onVote={vi.fn()}
        renderDetail={() => null}
        page={2}
        hasMore={false}
        onPageChange={onPageChange}
      />,
    );
    const last = screen.getByRole("group", { name: "Page 3" });
    expect(within(last).getByText("Page 3")).toBeInTheDocument();
    expect(within(last).getByRole("button", { name: "Next page" })).toBeDisabled();
    fireEvent.click(within(last).getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it("speaks the provider's language", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <FeedbackPublicList
          rows={ROWS}
          sort="newest"
          onSortChange={() => {}}
          onVote={vi.fn()}
          renderDetail={() => null}
          page={1}
          hasMore
          onPageChange={vi.fn()}
        />
      </UiKitProvider>,
    );
    expect(screen.getByRole("group", { name: "Seite 2" })).toBeInTheDocument();
  });

  it("passes axe with the pager", async () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    const { container } = renderList({ page: 1, hasMore: true, onPageChange: () => {} });
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("FeedbackPublicList — openRow, a ?row= not on this page (0.38.1, Kurvenschmiede)", () => {
  const ELSEWHERE: FeedbackPublicListItem = { ...ROWS[0], id: 40, title: "Old report, page 4", comment_count: 0 };

  it("draws the opened report above the page, with its detail", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    const onOpenChange = vi.fn();
    renderList({ openId: 40, openRow: ELSEWHERE, onOpenChange });
    expect(screen.getByText("Old report, page 4")).toBeInTheDocument();
    expect(screen.getByTestId("detail")).toHaveTextContent("Detail of #40");
    // It comes first, before the page's own rows.
    const titles = screen.getAllByText(/Old report|Chart jumps|Export as CSV/).map((el) => el.textContent);
    expect(titles[0]).toBe("Old report, page 4");
    fireEvent.click(screen.getByText("Old report, page 4"));
    expect(onOpenChange).toHaveBeenLastCalledWith(null);
  });

  it("is gone once it is closed, and never doubled when the page has it", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    const { rerender } = renderList({ openId: null, openRow: ELSEWHERE });
    expect(screen.queryByText("Old report, page 4")).toBeNull();
    rerender(
      <FeedbackPublicList
        rows={ROWS}
        sort="newest"
        onSortChange={() => {}}
        onVote={vi.fn()}
        renderDetail={(row) => <div data-testid="detail">Detail of #{row.id}</div>}
        openId={12}
        openRow={ROWS[0]}
      />,
    );
    expect(screen.getAllByText("Chart jumps on save")).toHaveLength(1);
    expect(screen.getByTestId("detail")).toHaveTextContent("Detail of #12");
  });

  it("opens in the full-screen dialog on the phone", () => {
    restore = stubViewportWidth(PHONE_WIDTH);
    renderList({ openId: 40, openRow: ELSEWHERE });
    expect(screen.getByRole("dialog")).toHaveTextContent("Detail of #40");
  });
});

describe("FeedbackPublicList — phone", () => {
  it("draws a card per report: title, status, category, date and the two counts", () => {
    restore = stubViewportWidth(PHONE_WIDTH);
    renderList();
    expect(screen.queryByRole("table")).toBeNull();
    const card = screen.getByText("Chart jumps on save").closest("li")!;
    expect(card).toBeTruthy();
    expect(within(card).getByText("Open")).toBeInTheDocument();
    expect(within(card).getByText("Bug")).toBeInTheDocument();
    expect(within(card).getByText("2 comments")).toBeInTheDocument();
    expect(within(card).getByText("3 votes")).toBeInTheDocument();
    // A count, not a second button inside the card's own (the vote is in the opened report).
    expect(within(card).queryByRole("button", { name: /I want this too/ })).toBeNull();
  });

  it("passes axe", async () => {
    restore = stubViewportWidth(PHONE_WIDTH);
    const { container } = renderList();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ── The detail ───────────────────────────────────────────────────────────── */

const RECORD: FeedbackPublicRecord = {
  ...ROWS[0],
  body: "It jumps when I save.\n\n--- REWORK 2026-10-05 08:00 ---\nStill on a phone.",
  replies: [
    { id: 1, author_name: null, body: "Looking into it.", status_to: "IN_PROGRESS", created_at: "2026-10-04T10:00:00Z" },
  ],
};

const COMMENTS: FeedbackComment[] = [
  { id: 5, author_name: "Ben", mine: false, staff: false, body: "Same on the iPad.", hidden: false, created_at: "2026-10-04T11:00:00Z" },
  { id: 6, author_name: null, mine: false, staff: false, body: "Me too.", hidden: false, created_at: "2026-10-04T12:00:00Z" },
];

describe("FeedbackPublicDetail", () => {
  const NOW = new Date("2026-10-06T09:00:00Z");

  it("names the author by first name, shows the public body, the vote and the conversation", () => {
    render(<FeedbackPublicDetail row={RECORD} comments={COMMENTS} onVote={vi.fn()} now={NOW} />);
    expect(screen.getByText("From Anna")).toBeInTheDocument();
    expect(screen.getByText(/It jumps when I save\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /I want this too/ })).toHaveTextContent("3");
    // Replies and comments merged, oldest first; a null reply author is "Admin", a null
    // commenter "A user".
    expect(screen.getByText("Looking into it.")).toBeInTheDocument();
    expect(screen.getByText("Same on the iPad.")).toBeInTheDocument();
    expect(screen.getByText("A user")).toBeInTheDocument();
    const order = ["Looking into it.", "Same on the iPad.", "Me too."].map((t) => screen.getByText(t));
    expect(order[0].compareDocumentPosition(order[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(order[1].compareDocumentPosition(order[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("says 'From A user' without a name", () => {
    render(<FeedbackPublicDetail row={{ ...RECORD, author_name: null }} comments={[]} onVote={vi.fn()} now={NOW} />);
    expect(screen.getByText("From A user")).toBeInTheDocument();
  });

  it("offers the comment box only with onComment, and sends through it", async () => {
    const { unmount } = render(<FeedbackPublicDetail row={RECORD} comments={COMMENTS} onVote={vi.fn()} now={NOW} />);
    expect(screen.queryByRole("textbox")).toBeNull();
    unmount();
    const onComment = vi.fn(async () => {});
    render(<FeedbackPublicDetail row={RECORD} comments={COMMENTS} onVote={vi.fn()} onComment={onComment} now={NOW} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Here too" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Comment" })));
    expect(onComment).toHaveBeenCalledWith("Here too");
  });

  it("locks the vote on the viewer's own report, and for a reason the app gives", () => {
    const { unmount } = render(
      <FeedbackPublicDetail row={{ ...RECORD, mine: true, voted: true }} comments={[]} onVote={vi.fn()} now={NOW} />,
    );
    expect(screen.getByRole("button", { name: /I want this too/ })).toHaveAttribute("aria-disabled", "true");
    unmount();
    render(<FeedbackPublicDetail row={RECORD} comments={[]} onVote={vi.fn()} voteDisabled="Not in the demo" now={NOW} />);
    expect(screen.getByRole("button", { name: /I want this too/ })).toHaveAttribute("aria-disabled", "true");
  });

  it("never draws a file, an address or a page link — the public record has none", () => {
    const { container } = render(<FeedbackPublicDetail row={RECORD} comments={COMMENTS} onVote={vi.fn()} now={NOW} />);
    expect(container.querySelector("img, a[href]")).toBeNull();
  });

  it("passes axe", async () => {
    const { container } = render(
      <FeedbackPublicDetail row={RECORD} comments={COMMENTS} onVote={vi.fn()} onComment={vi.fn()} now={NOW} />,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
