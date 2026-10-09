import { fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "../../components/data-table";
import type { DataTableColumn, DataTableProps } from "../../components/data-table";
import { UiKitProvider, type KitLinkProps, type UiKitLabelOverrides } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { FEEDBACK_STATUS_ORDER } from "../feedback-inbox";
import {
  DEFAULT_FEEDBACK_CATEGORY_LABELS,
  DEFAULT_FEEDBACK_STATUS_LABELS,
  useFeedbackStatusLabels,
} from "../feedback-labels";
import type { FeedbackRecord } from "../feedback-record";
import { DEFAULT_FEEDBACK_SWIPE, feedbackSwipePlan } from "../feedback-swipe";
import {
  DEFAULT_FEEDBACK_PAGE_LABELS,
  FeedbackAwaitingToggle,
  FeedbackEmptyState,
  FeedbackMobileCard,
  feedbackColumns,
  feedbackEnvironment,
  feedbackMobileGroupBy,
  feedbackSubmitter,
  feedbackSubmitterEmail,
  isFeedbackAwaiting,
  useFeedbackColumns,
  useFeedbackRenderDate,
  type FeedbackRenderDate,
  type UseFeedbackColumnsOptions,
} from "../feedback-table";

/**
 * §4.3 of the feedback contract: the two pages' table as kit parts — keksdose's nine
 * columns (feedback-page.tsx:711–963), its phone card with the chips it lost to
 * `mobileCard` (data-table.tsx `cardInner`), the awaiting toggle, the §7.13 empty state.
 * Synthetic rows only.
 */

const row = (over: Partial<FeedbackRecord> = {}): FeedbackRecord => ({
  id: 1,
  user_id: 7,
  user_email: null,
  title: "Chart jumps on save",
  body: "",
  category: "BUG",
  status: "OPEN",
  context: null,
  screenshot_url: null,
  attachment_urls: null,
  outcome: null,
  resolved_at: null,
  created_at: "2026-10-04T09:12:00Z",
  updated_at: "2026-10-04T09:12:00Z",
  ...over,
});

const REWORKED = "It jumps.\n\n--- REWORK 2026-10-03 10:00 ---\nStill.\n\n--- REWORK 2026-10-04 08:00 ---\nAgain.";

const ROWS: FeedbackRecord[] = [
  row({
    id: 3,
    title: "Export button missing",
    category: "IDEA",
    status: "IN_EVALUATION",
    body: REWORKED,
    context: { environment: "dev", user_display_name: "Example Admin", url: "https://dev.example.test/accounts?p=2#top" },
    created_at: "2026-10-04T09:12:00Z",
  }),
  row({
    id: 2,
    user_id: null,
    title: "Crash on import",
    category: "CRASH",
    status: "IN_PROGRESS",
    context: { route: "/imports", user_display_name: "Should not show" },
    created_at: "2026-10-03T15:00:00Z",
  }),
  row({
    id: 1,
    user_id: 9,
    user_email: "joined@example.test",
    title: "Typo in the footer",
    category: "OTHER",
    status: "DONE",
    context: { environment: "prod", user_email: "snapshot@example.test", url: "/settings?tab=profile" },
    resolved_at: "2026-10-04T10:00:00Z",
    created_at: "2026-10-03T08:00:00Z",
  }),
];

/** A day key that is the same everywhere — the tests' own date writer. */
const isoDay: FeedbackRenderDate = (iso) => iso.slice(0, 10);

const resolved = {
  labels: DEFAULT_FEEDBACK_PAGE_LABELS,
  statusLabels: DEFAULT_FEEDBACK_STATUS_LABELS,
  categoryLabels: DEFAULT_FEEDBACK_CATEGORY_LABELS,
};

function Table({
  options,
  extra,
}: {
  options: Partial<UseFeedbackColumnsOptions>;
  extra?: Partial<DataTableProps<FeedbackRecord>>;
}) {
  const columns = useFeedbackColumns<FeedbackRecord>({
    canEdit: true,
    onStatus: () => {},
    renderDate: isoDay,
    ...options,
  });
  return <DataTable rows={ROWS} columns={columns} rowKey={(r) => r.id} {...extra} />;
}

function renderTable(
  options: Partial<UseFeedbackColumnsOptions> = {},
  extra?: Partial<DataTableProps<FeedbackRecord>>,
  wrap: (node: ReactNode) => ReactNode = (node) => node,
) {
  return render(<MemoryRouter>{wrap(<Table options={options} extra={extra} />)}</MemoryRouter>);
}

/** jsdom has no matchMedia, so the desktop table renders unless a phone is stubbed. */
function stubPhone() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("width <"), // the phone layout's `(width < 768px)`
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}
afterEach(() => vi.unstubAllGlobals());

describe("feedbackPage labels", () => {
  it("says Rework once and Rework ×n after, and upper-cases the environment", () => {
    expect(DEFAULT_FEEDBACK_PAGE_LABELS.reworkChip(1)).toBe("Rework");
    expect(DEFAULT_FEEDBACK_PAGE_LABELS.reworkChip(3)).toBe("Rework ×3");
    expect(DEFAULT_FEEDBACK_PAGE_LABELS.environment("local")).toBe("LOCAL");
    // A context is untyped JSON: a stored non-string is printed, never thrown on.
    const environment = DEFAULT_FEEDBACK_PAGE_LABELS.environment as (value: unknown) => string;
    expect(environment(undefined)).toBe("");
    expect(environment(42)).toBe("42");
    expect(DEFAULT_FEEDBACK_PAGE_LABELS.userFallback(7)).toBe("user #7");
  });
});

describe("reading a row", () => {
  it("shows a non-production environment only", () => {
    expect(feedbackEnvironment(null)).toBeNull();
    expect(feedbackEnvironment({})).toBeNull();
    expect(feedbackEnvironment({ environment: "prod" })).toBeNull();
    expect(feedbackEnvironment({ environment: " PROD " })).toBeNull();
    expect(feedbackEnvironment({ environment: "dev" })).toBe("dev");
    // An environment nobody recognises is exactly when triage needs to see one.
    expect(feedbackEnvironment({ environment: "staging" })).toBe("staging");
  });

  it("names the submitter: erased first, then name, joined email, snapshot email, id", () => {
    const labels = DEFAULT_FEEDBACK_PAGE_LABELS;
    expect(feedbackSubmitter(row({ user_id: null, context: { user_display_name: "Kept" } }), labels)).toBe(
      "<deleted user>",
    );
    expect(feedbackSubmitter(row({ context: { user_display_name: "Example User" } }), labels)).toBe("Example User");
    // A cleared display name is "", which must fall through (keksdose's `||` vs `??`).
    expect(
      feedbackSubmitter(
        row({ user_email: "joined@example.test", context: { user_display_name: "", user_email: "old@example.test" } }),
        labels,
      ),
    ).toBe("joined@example.test");
    expect(feedbackSubmitter(row({ context: { user_email: "old@example.test" } }), labels)).toBe("old@example.test");
    expect(feedbackSubmitter(row(), labels)).toBe("user #7");
  });

  it("prefers the joined email, falls back to the snapshot, and names nobody erased", () => {
    expect(feedbackSubmitterEmail(row({ user_email: "a@example.test", context: { user_email: "b@example.test" } }))).toBe(
      "a@example.test",
    );
    expect(feedbackSubmitterEmail(row({ context: { user_email: "b@example.test" } }))).toBe("b@example.test");
    expect(feedbackSubmitterEmail(row({ user_id: null, user_email: "a@example.test" }))).toBe("");
  });

  it("keeps exactly the three statuses that wait on the triager", () => {
    expect(FEEDBACK_STATUS_ORDER.filter(isFeedbackAwaiting)).toEqual(["OPEN", "IN_EVALUATION", "NEEDS_LIVE_TEST"]);
  });
});

describe("feedbackColumns", () => {
  const columns = feedbackColumns<FeedbackRecord>({
    canEdit: true,
    onStatus: () => {},
    renderDate: isoDay,
    ...resolved,
  });
  const col = (key: string) => columns.find((c) => c.key === key) as DataTableColumn<FeedbackRecord>;

  it("is the contract's nine, in order, with the phone's hidden ones", () => {
    expect(columns.map((c) => c.key)).toEqual([
      "id",
      "date",
      "category",
      "title",
      "user",
      "email",
      "url",
      "status",
      "resolved",
    ]);
    expect(columns.map((c) => c.header)).toEqual([
      "#",
      "Date",
      "Category",
      "Subject",
      "User",
      "Email",
      "URL",
      "Status",
      "Resolved",
    ]);
    expect(columns.filter((c) => c.mobileHidden).map((c) => c.key)).toEqual(["id", "email", "url", "resolved"]);
    expect(col("title").mobilePrimary).toBe(true);
    expect(col("url").noRowLink).toBe(true);
  });

  it("offers the whole vocabulary in both select filters, translated, in its own order", () => {
    const category = col("category").filter;
    const status = col("status").filter;
    expect(category?.type === "select" && category.options).toEqual([
      { value: "CRASH", label: "Crash" },
      { value: "BUG", label: "Bug" },
      { value: "IDEA", label: "Idea" },
      { value: "QUESTION", label: "Question" },
      { value: "OTHER", label: "Other" },
    ]);
    expect(status?.type === "select" && status.options?.map((o) => o.label)).toEqual([
      "Open",
      "Ready to implement",
      "In progress",
      "In evaluation",
      "Test when live",
      "Postponed",
      "Done",
      "Won't do",
    ]);
  });

  it("sorts category CRASH first, status by the chain, dates by the instant", () => {
    const [idea, crash, other] = ROWS;
    expect(col("category").sortBy!(crash)).toBeLessThan(col("category").sortBy!(idea) as number);
    expect(col("status").sortBy!(crash)).toBeLessThan(col("status").sortBy!(idea) as number);
    expect(col("status").sortBy!(row({ status: "LATER" as never }))).toBe(FEEDBACK_STATUS_ORDER.length);
    expect(col("date").sortBy!(other)).toBe(Date.parse("2026-10-03T08:00:00Z"));
    expect(col("resolved").sortBy!(idea)).toBeNull();
  });

  it("filters the subject by the environment too, and the user by name, email or the erased mark", () => {
    const [idea, crash, other] = ROWS;
    expect(col("title").filterBy!(idea)).toBe("Export button missing DEV");
    expect(col("title").filterBy!(other)).toBe("Typo in the footer");
    expect(col("user").filterBy!(crash)).toBe("<deleted user>");
    expect(col("user").filterBy!(other)).toBe("joined@example.test joined@example.test");
    expect(col("url").filterBy!(idea)).toBe("/accounts");
  });

  it("takes an app's own row type with more fields", () => {
    interface AppFeedback extends FeedbackRecord {
      company_id: number;
    }
    const own = feedbackColumns<AppFeedback>({ canEdit: false, onStatus: () => {}, renderDate: isoDay, ...resolved });
    expect(own).toHaveLength(9);
    // keksdose's generated `FeedbackResponse` types the context as a loose record.
    type GeneratedFeedback = Omit<FeedbackRecord, "context"> & { context: { [key: string]: unknown } | null };
    const generated = feedbackColumns<GeneratedFeedback>({ canEdit: false, onStatus: () => {}, renderDate: isoDay, ...resolved });
    expect(generated).toHaveLength(9);
  });
});

describe("the desktop table", () => {
  it("draws the subject with its environment and rework chips", () => {
    renderTable();
    const cell = screen.getByText("Export button missing").closest("td")!;
    expect(within(cell).getByText("DEV")).toBeInTheDocument();
    expect(within(cell).getByText("Rework ×2")).toBeInTheDocument();
    // Production and no rework: neither chip.
    const plain = screen.getByText("Typo in the footer").closest("td")!;
    expect(plain.querySelector("[data-feedback-env]")).toBeNull();
    expect(plain.querySelector("[data-feedback-rework]")).toBeNull();
  });

  it("links the page on this origin, path as text, with the route as fallback", () => {
    const onRowClick = vi.fn();
    renderTable({}, { onRowClick });
    const link = screen.getByRole("link", { name: "Open page /accounts" });
    expect(link).toHaveAttribute("href", "/accounts?p=2#top");
    fireEvent.click(link);
    expect(onRowClick).not.toHaveBeenCalled();
    // A path-only value (Kurvenschmiede's backfill) and an erased row's route.
    expect(screen.getByRole("link", { name: "Open page /settings" })).toHaveAttribute("href", "/settings?tab=profile");
    expect(screen.getByRole("link", { name: "Open page /imports" })).toHaveAttribute("href", "/imports");
  });

  it("draws the link through the provider's router link", () => {
    const linkComponent = ({ href, children, ...props }: KitLinkProps) => (
      <a data-router="" href={`#${href}`} {...props}>
        {children}
      </a>
    );
    renderTable({}, undefined, (node) => <UiKitProvider linkComponent={linkComponent}>{node}</UiKitProvider>);
    expect(screen.getByRole("link", { name: "Open page /accounts" })).toHaveAttribute("data-router", "");
  });

  it("names erased submitters and falls back to the snapshot email", () => {
    renderTable();
    const crash = screen.getByText("Crash on import").closest("tr")!;
    expect(within(crash).getByText("<deleted user>")).toBeInTheDocument();
    expect(within(crash).queryByText("Should not show")).toBeNull();
    const typo = screen.getByText("Typo in the footer").closest("tr")!;
    expect(within(typo).getAllByText("joined@example.test")).toHaveLength(2);
  });

  it("changes a status through onStatus, with the row", () => {
    const onStatus = vi.fn();
    renderTable({ onStatus });
    const crash = screen.getByText("Crash on import").closest("tr")!;
    fireEvent.click(within(crash).getByRole("button", { name: "In evaluation" }));
    expect(onStatus).toHaveBeenCalledWith(ROWS[1], "IN_EVALUATION");
  });

  it("keeps the status read-only without canEdit, and on /my-feedback even with it", () => {
    for (const options of [{ canEdit: false }, { canEdit: true, mine: true }]) {
      const onStatus = vi.fn();
      const { unmount } = renderTable({ ...options, onStatus });
      const crash = screen.getByText("Crash on import").closest("tr")!;
      const button = within(crash).getByRole("button", { name: "In evaluation" });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(onStatus).not.toHaveBeenCalled();
      unmount();
    }
  });

  it("reads its words from the provider", () => {
    const labels = {
      feedbackPage: { columnSubject: "Betreff", reworkChip: (n: number) => (n === 1 ? "Nacharbeit" : `Nacharbeit ×${n}`) },
      feedbackStatus: { IN_EVALUATION: "Zur Prüfung" },
    } as unknown as UiKitLabelOverrides;
    renderTable({}, undefined, (node) => <UiKitProvider labels={labels}>{node}</UiKitProvider>);
    expect(screen.getByRole("columnheader", { name: /Betreff/ })).toBeInTheDocument();
    expect(screen.getByText("Nacharbeit ×2")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Zur Prüfung" }).length).toBeGreaterThan(0);
  });

  it("dates both date columns with the one renderDate", () => {
    renderTable();
    const typo = screen.getByText("Typo in the footer").closest("tr")!;
    const times = within(typo).getAllByText(/^2026-10-0\d$/);
    expect(times.map((t) => t.textContent)).toEqual(["2026-10-03", "2026-10-04"]);
    expect(times[0]).toHaveAttribute("datetime", "2026-10-03T08:00:00Z");
    // No resolved date: the placeholder.
    const crash = screen.getByText("Crash on import").closest("tr")!;
    expect(within(crash).getAllByText("—").length).toBeGreaterThan(0);
  });
});

describe("useFeedbackRenderDate", () => {
  it("uses the app's renderDate as it is", () => {
    const { result } = renderHook(() => useFeedbackRenderDate(isoDay));
    expect(result.current).toBe(isoDay);
  });

  it("asks the provider's formatDate for the local day, with the weekday", () => {
    const formatDate = vi.fn(() => "Sa., 03.10.2026");
    const { result } = renderHook(() => useFeedbackRenderDate(), {
      wrapper: ({ children }) => (
        <UiKitProvider formatDate={formatDate} locale="de-CH">
          {children}
        </UiKitProvider>
      ),
    });
    // 23:30 UTC on the 3rd is the 4th in Berlin (the suite's TZ): the LOCAL day.
    expect(result.current("2026-10-03T23:30:00Z")).toBe("Sa., 03.10.2026");
    expect(formatDate).toHaveBeenCalledWith("2026-10-04", {
      unit: "day",
      source: "dateMark",
      locale: "de-CH",
      weekday: true,
    });
  });

  it("writes the weekday itself without one", () => {
    const { result } = renderHook(() => useFeedbackRenderDate(), {
      wrapper: ({ children }) => <UiKitProvider locale="en-GB">{children}</UiKitProvider>,
    });
    expect(result.current("2026-10-04T09:12:00Z")).toMatch(/Sun/);
    expect(result.current("not a date")).toBe("not a date");
  });
});

describe("the phone", () => {
  function Phone({ admin = true }: { admin?: boolean }) {
    const change = vi.fn();
    const statusLabels = useFeedbackStatusLabels();
    const columns = useFeedbackColumns<FeedbackRecord>({ canEdit: admin, onStatus: change, renderDate: isoDay });
    return (
      <DataTable
        rows={ROWS}
        columns={columns}
        rowKey={(r) => r.id}
        mobileGroupBy={feedbackMobileGroupBy(isoDay)}
        mobileCard={(r) => <FeedbackMobileCard row={r} showSubmitter={admin} renderDate={isoDay} />}
        mobileSwipeActions={
          admin ? (r) => feedbackSwipePlan(DEFAULT_FEEDBACK_SWIPE, r, { change, labels: statusLabels }) : undefined
        }
      />
    );
  }
  const card = (title: string) => screen.getByText(title).closest("li") as HTMLElement;

  it("draws the chips and the status badge on the card itself", () => {
    stubPhone();
    render(
      <MemoryRouter>
        <Phone />
      </MemoryRouter>,
    );
    const reworked = card("Export button missing");
    expect(within(reworked).getByText("DEV")).toBeInTheDocument();
    expect(within(reworked).getByText("Rework ×2")).toBeInTheDocument();
    expect(within(reworked).getAllByText("In evaluation").length).toBeGreaterThan(0);
    expect(within(reworked).getByText("Idea")).toBeInTheDocument();
  });

  it("groups the cards under day headers that say what the cards say", () => {
    stubPhone();
    render(
      <MemoryRouter>
        <Phone />
      </MemoryRouter>,
    );
    const headers = screen.getAllByText(/^2026-10-0\d$/).filter((el) => !el.closest("time"));
    expect(headers.map((h) => h.textContent)).toEqual(["2026-10-04", "2026-10-03"]);
  });

  it("names the submitter for the admin only, short form", () => {
    stubPhone();
    const { unmount } = render(
      <MemoryRouter>
        <Phone />
      </MemoryRouter>,
    );
    expect(within(card("Export button missing")).getByText("· Example Admin")).toBeInTheDocument();
    expect(within(card("Crash on import")).getByText("· <deleted user>")).toBeInTheDocument();
    unmount();
    render(
      <MemoryRouter>
        <Phone admin={false} />
      </MemoryRouter>,
    );
    expect(within(card("Export button missing")).queryByText(/Example Admin/)).toBeNull();
  });

  it("falls back to #id on the card", () => {
    render(<FeedbackMobileCard row={row({ id: 5, user_id: 42 })} showSubmitter renderDate={isoDay} />);
    expect(screen.getByText("· #42")).toBeInTheDocument();
  });

  it("swipes on the admin inbox only, through feedbackSwipePlan", () => {
    stubPhone();
    const { unmount } = render(
      <MemoryRouter>
        <Phone />
      </MemoryRouter>,
    );
    expect(within(card("Crash on import")).getByRole("group", { name: "Row actions" })).toBeInTheDocument();
    unmount();
    render(
      <MemoryRouter>
        <Phone admin={false} />
      </MemoryRouter>,
    );
    expect(within(card("Crash on import")).queryByRole("group", { name: "Row actions" })).toBeNull();
  });
});

describe("FeedbackAwaitingToggle", () => {
  it("is a named group with one pressed-state toggle", () => {
    const onPressedChange = vi.fn();
    const { rerender } = render(<FeedbackAwaitingToggle pressed={false} onPressedChange={onPressedChange} />);
    const group = screen.getByRole("group", { name: "Feedback actions" });
    expect(group).toHaveClass("md:hidden");
    const toggle = within(group).getByRole("button", { name: "Only what is waiting for you" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(onPressedChange).toHaveBeenCalledWith(true);
    rerender(<FeedbackAwaitingToggle pressed onPressedChange={onPressedChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Only what is waiting for you" }));
    expect(onPressedChange).toHaveBeenLastCalledWith(false);
  });

  it("takes further actions after the toggle", () => {
    render(
      <FeedbackAwaitingToggle pressed={false} onPressedChange={() => {}}>
        <button type="button">Another</button>
      </FeedbackAwaitingToggle>,
    );
    const group = screen.getByRole("group", { name: "Feedback actions" });
    expect(within(group).getAllByRole("button").map((b) => b.textContent || b.getAttribute("aria-label"))).toEqual([
      "Only what is waiting for you",
      "Another",
    ]);
  });
});

describe("FeedbackEmptyState", () => {
  it("is keksdose's one word, the same on both pages — no hint beneath it", () => {
    render(<FeedbackEmptyState />);
    const empty = screen.getByText("None");
    expect(empty.textContent).toBe("None");
    expect(empty.parentElement?.textContent).toBe("None");
  });

  it("reads feedbackPage.empty — Keine in de-CH", () => {
    render(
      <UiKitProvider labels={{ feedbackPage: UI_KIT_LABELS_DE_CH.feedbackPage }}>
        <FeedbackEmptyState />
      </UiKitProvider>,
    );
    expect(screen.getByText("Keine")).toBeInTheDocument();
  });

  it("stands in the table's empty slot", () => {
    render(
      <MemoryRouter>
        <Table options={{}} extra={{ rows: [], empty: <FeedbackEmptyState /> }} />
      </MemoryRouter>,
    );
    expect(screen.getByText("None").closest("td")).not.toBeNull();
  });
});
