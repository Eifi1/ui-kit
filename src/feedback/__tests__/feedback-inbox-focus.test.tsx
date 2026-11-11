import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DESKTOP_WIDTH, stubPhone, stubViewportWidth } from "../../test/viewport";
import {
  FeedbackInbox,
  parseFeedbackIds,
  useFeedbackInbox,
  type FeedbackInboxMutation,
  type FeedbackInboxProps,
  type FeedbackInboxState,
} from "../feedback-inbox-page";
import type { FeedbackRecord } from "../feedback-record";
import type { FeedbackDetailPatch } from "../feedback-row-detail";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { undo: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

/**
 * 0.59, §13.7 (keksdose live #500, dev #678): the inbox shows the SET of reports `?ids=`
 * names — a notice's "4 of your feedback reports have answers" — as the # column's filter.
 * Marcel, #678: *"Url shows …/feedback?ids=675&row=675. But nowhere in the table columns is
 * a filter set (should be in the # column) and the Clear selection also does not revert the
 * url to without filtering."* keksdose narrowed the rows above the table (a Chip, and
 * `storageKey: undefined` so the filter he had left on — live #500 — would not hide them),
 * and turned one id into `f.id=N..N`.
 */

function record(over: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: 1,
    user_id: 7,
    user_email: "author@example.test",
    title: "Chart jumps on save",
    body: "It jumps.",
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
  };
}

const ROWS: FeedbackRecord[] = [
  record({ id: 1, title: "Chart jumps on save", status: "OPEN", created_at: "2026-10-05T09:00:00Z" }),
  record({ id: 2, title: "Typo in the footer", status: "DONE", created_at: "2026-10-04T09:00:00Z" }),
  record({ id: 3, title: "Export button missing", status: "IN_EVALUATION", created_at: "2026-10-03T09:00:00Z" }),
  record({ id: 4, title: "Where is the currency?", status: "DONE", created_at: "2026-10-02T09:00:00Z" }),
];

function mutation<V>(): FeedbackInboxMutation<V> {
  return { mutateAsync: vi.fn(async (_: V) => undefined) };
}

let location: ReturnType<typeof useLocation> | null = null;
function Where() {
  const here = useLocation();
  useEffect(() => {
    location = here;
  });
  return null;
}
const params = () => new URLSearchParams(location!.search);

function renderInbox(url: string, props: Partial<FeedbackInboxProps<FeedbackRecord>> = {}) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <FeedbackInbox rows={ROWS} canEdit viewerId={1} update={mutation<FeedbackDetailPatch>()} {...props} />
      <Where />
    </MemoryRouter>,
  );
}

/** The titles of the desktop rows, top to bottom. */
const titles = () =>
  Array.from(document.querySelectorAll("tbody tr[data-row-index]")).map(
    (tr) => ROWS.find((r) => tr.textContent?.includes(r.title))?.title,
  );
const idHeader = () => screen.getByRole("columnheader", { name: /^#/ });

/** What `storageKey="feedback"` keeps: the list left filtered to OPEN — what Marcel's phone
 *  had when he tapped the notice (live #500). */
const SAVED = { filters: { status: { type: "select", values: ["OPEN"] } } };
const STORE = "hbui-table:feedback";

let restore: (() => void) | undefined;
afterEach(() => {
  restore?.();
  restore = undefined;
  vi.unstubAllGlobals();
  localStorage.clear();
  location = null;
});

describe("parseFeedbackIds", () => {
  it("reads report ids as ?row= reads one, each once", () => {
    expect(parseFeedbackIds("492,493,494")).toEqual([492, 493, 494]);
    expect(parseFeedbackIds("7,7,8")).toEqual([7, 8]);
    expect(parseFeedbackIds("675")).toEqual([675]);
  });

  it("names no set for anything else", () => {
    for (const raw of ["", "1,,2", "1,", "0", "01", "1e2", "-3", "1.5", "a", "1, 2", "99999999999999999"])
      expect(parseFeedbackIds(raw)).toBeUndefined();
  });
});

describe("the inbox's ?ids= set (0.59, §13.7)", () => {
  it("shows exactly the named reports, as the # column's filter", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    renderInbox("/feedback?ids=2,4");
    expect(titles()).toEqual(["Typo in the footer", "Where is the currency?"]);
    fireEvent.click(within(idHeader()).getByRole("button", { name: "Filter # (active)" }));
    expect(screen.getByText("Only these 2 reports")).toBeInTheDocument();
  });

  it("takes ids out of the address with the column's Clear filter, the open row kept", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    renderInbox("/feedback?ids=2,4&row=4");
    fireEvent.click(within(idHeader()).getByRole("button", { name: "Filter # (active)" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear filter" }));
    expect(params().has("ids")).toBe(false);
    expect(params().get("row")).toBe("4");
    expect(titles()).toHaveLength(4);
    expect(within(idHeader()).getByRole("button", { name: "Filter #" })).toBeInTheDocument();
  });

  it("keeps the saved filter out of the view and gives it back after (live #500)", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    localStorage.setItem(STORE, JSON.stringify(SAVED));
    renderInbox("/feedback?ids=2,4");
    // Both are DONE: the saved OPEN filter would have hidden them both.
    expect(titles()).toEqual(["Typo in the footer", "Where is the currency?"]);
    expect(JSON.parse(localStorage.getItem(STORE)!).filters).toEqual(SAVED.filters);
    fireEvent.click(within(idHeader()).getByRole("button", { name: "Filter # (active)" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear filter" }));
    // The list the person left: OPEN only.
    expect(titles()).toEqual(["Chart jumps on save"]);
    expect(params().get("f.status")).toBe("OPEN");
  });

  it("names one report as a set of one, and wins over a link's f.id beside it", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    renderInbox("/feedback?ids=3&row=3&f.id=1..2");
    expect(titles()).toEqual(["Export button missing"]);
    fireEvent.click(within(idHeader()).getByRole("button", { name: "Filter # (active)" }));
    expect(screen.getByText("Only this report")).toBeInTheDocument();
  });

  it("says the set above the table while the # column is hidden, and its Clear takes ids out (0.60)", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    localStorage.setItem(STORE, JSON.stringify({ hidden: ["id"] }));
    renderInbox("/feedback?ids=2,4&row=4");
    expect(screen.queryByRole("columnheader", { name: /^#/ })).toBeNull();
    expect(titles()).toEqual(["Typo in the footer", "Where is the currency?"]);
    const line = screen.getByRole("group", { name: "Filter # (active)" });
    expect(line).toHaveTextContent("Only these 2 reports");
    fireEvent.click(within(line).getByRole("button", { name: "Clear filter" }));
    expect(params().has("ids")).toBe(false);
    expect(params().get("row")).toBe("4");
    expect(titles()).toHaveLength(4);
    expect(screen.queryByRole("group", { name: "Filter # (active)" })).toBeNull();
  });

  it("shows the whole list for an ?ids= that names no set", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    renderInbox("/feedback?ids=2,,4");
    expect(titles()).toHaveLength(4);
    expect(within(idHeader()).getByRole("button", { name: "Filter #" })).toBeInTheDocument();
  });

  it("hands the set to a page of its own: inbox.focusIds and table.keyFilter", () => {
    const update = mutation<FeedbackDetailPatch>();
    const { result } = renderHook(
      (): FeedbackInboxState<FeedbackRecord> => useFeedbackInbox({ rows: ROWS, canEdit: true, update }),
      { wrapper: ({ children }) => <MemoryRouter initialEntries={["/feedback?ids=4,2"]}>{children}</MemoryRouter> },
    );
    expect(result.current.focusIds).toEqual([4, 2]);
    expect(result.current.table.keyFilter).toMatchObject({ column: "id", keys: [4, 2], label: "Only these 2 reports" });
  });

  it("is a filter in the phone's sheet, whose Clear all takes ids out of the address", () => {
    restore = stubPhone();
    renderInbox("/my-feedback?ids=2,4", { mine: true });
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    const sheet = screen.getByRole("dialog", { name: "Filters" });
    fireEvent.click(within(sheet).getByRole("button", { name: "#" }));
    expect(within(sheet).getByText("Only these 2 reports")).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("button", { name: "Clear all" }));
    expect(params().has("ids")).toBe(false);
  });
});

describe("the desktop strip's Clear selection at 0 selected (0.59, dev #678)", () => {
  it("is refused while nothing is selected, and keeps the focus once pressed", () => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    renderInbox("/feedback?ids=2,4");
    const clear = within(screen.getByRole("toolbar")).getByRole("button", { name: "Clear selection" });
    // Read as the list's clear, it cleared nothing: refused, not hidden — the strip keeps
    // its layout and the focus a press leaves on it.
    expect(clear).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(clear);
    expect(params().get("ids")).toBe("2,4");
    const row = screen.getAllByText("Typo in the footer")[0].closest("tr")!;
    fireEvent.click(within(row).getByRole("checkbox", { name: "Select row" }));
    expect(clear).not.toHaveAttribute("aria-disabled");
    act(() => clear.focus());
    fireEvent.click(clear);
    expect(screen.getByRole("toolbar")).toHaveAccessibleName("0 selected");
    expect(clear).toHaveAttribute("aria-disabled", "true");
    expect(clear).toHaveFocus();
  });
});
