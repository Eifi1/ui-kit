import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { toast } from "../../components/toast";
import { DESKTOP_WIDTH, stubPhone, stubViewportWidth } from "../../test/viewport";
import { FeedbackInbox, useFeedbackInbox, type FeedbackInboxProps } from "../feedback-inbox-page";
import type { FeedbackRecord } from "../feedback-record";
import type { FeedbackDetailPatch } from "../feedback-row-detail";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { undo: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

/**
 * The inbox's multi-select and bulk edit (0.57, keksdose dev #663; feedback §13.6): the
 * admin's boxes and long press, and a bulk bar that loops the page's ONE `update` —
 * `PATCH /feedback/{id}` per report, no bulk endpoint — with one Undo putting each report
 * back to its own previous value. Synthetic rows only.
 */

const ADMIN = 1;

function record(over: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: 1,
    user_id: 7,
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

// Newest first: 3, 4, 2 — each at a different status, so the Undo has three to put back.
const ROWS: FeedbackRecord[] = [
  record({ id: 2, title: "Typo in the footer", category: "OTHER", status: "DONE", created_at: "2026-10-03T08:00:00Z" }),
  record({ id: 3, title: "Export button missing", category: "IDEA", status: "IN_EVALUATION" }),
  record({
    id: 4,
    title: "Where is the currency?",
    category: "QUESTION",
    status: "READY",
    created_at: "2026-10-03T15:00:00Z",
  }),
];

type Update = { mutateAsync: Mock<(patch: FeedbackDetailPatch) => Promise<unknown>> };

/** A PATCH that lands at once — or, for the ids in `refuse`, is refused (the app's
 *  `onError` has toasted why). */
function updateMutation(refuse: number[] = []): Update {
  return {
    mutateAsync: vi.fn(async (patch: FeedbackDetailPatch) => {
      if (refuse.includes(patch.id)) throw new Error("403");
      return undefined;
    }),
  };
}

function renderInbox(props: Partial<FeedbackInboxProps<FeedbackRecord>> = {}, url = "/feedback") {
  const update = (props.update as Update | undefined) ?? updateMutation();
  const tree = (over: Partial<FeedbackInboxProps<FeedbackRecord>> = {}) => (
    <MemoryRouter initialEntries={[url]}>
      <FeedbackInbox rows={ROWS} canEdit viewerId={ADMIN} update={update} {...props} {...over} />
    </MemoryRouter>
  );
  const view = render(tree());
  return {
    ...view,
    update,
    rerenderWith: (over: Partial<FeedbackInboxProps<FeedbackRecord>>) => view.rerender(tree(over)),
  };
}

const desktopRow = (title: string) => screen.getAllByText(title)[0].closest("tr") as HTMLElement;
const tick = (title: string) =>
  fireEvent.click(within(desktopRow(title)).getByRole("checkbox", { name: "Select row" }));
const card = (title: string) => screen.getByText(title).closest("li") as HTMLElement;
const bar = () => screen.getByRole("toolbar");

/** Every PATCH of a batch answered: the pool's awaits, then the toasts. */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

/** Open one of the bar's lists and pick a value. */
async function bulkSet(menu: string, choice: string) {
  fireEvent.click(within(bar()).getByRole("button", { name: menu }));
  fireEvent.click(within(screen.getByRole("dialog", { name: menu })).getByRole("button", { name: choice }));
  await settle();
}

/** The Undo of the last bulk toast, pressed. */
async function pressUndo() {
  const [, options] = vi.mocked(toast.undo).mock.calls.at(-1)!;
  act(() => options.onUndo());
  await settle();
}

let restore: (() => void) | undefined;
beforeEach(() => {
  vi.mocked(toast.undo).mockClear();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});
afterEach(() => {
  restore?.();
  restore = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("the selection", () => {
  beforeEach(() => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
  });

  it("is the admin's on the inbox: a box per row and a select-all", () => {
    renderInbox();
    expect(screen.getByRole("checkbox", { name: "Select all rows" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox", { name: "Select row" })).toHaveLength(3);
    // On a desktop the strip is there before the first box is ticked — the SAME element
    // after it — so ticking a row moves no row (it appearing above the table pushed them
    // all down by its height, under the pointer reaching for the next box). Its lists wait.
    const strip = bar();
    expect(strip).toHaveAccessibleName("0 selected");
    expect(within(strip).getByRole("button", { name: "Set status" })).toBeDisabled();
    expect(within(strip).getByRole("button", { name: "Set category" })).toBeDisabled();
    tick("Export button missing");
    expect(bar()).toBe(strip);
    expect(bar()).toHaveAccessibleName("1 selected");
    expect(within(strip).getByRole("button", { name: "Set status" })).toBeEnabled();
  });

  it("draws no strip on a phone until a card is selected: the floating card moves nothing", () => {
    restore?.();
    restore = stubPhone();
    renderInbox();
    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it.each([
    ["/my-feedback, for an admin too", { mine: true }],
    ["a reader who may not triage", { canEdit: false }],
    ["an app that turns it off", { selectable: false }],
  ] as const)("is not drawn on %s", (_, props) => {
    renderInbox(props);
    // (The column panel's boxes are the table's own, and stay.)
    expect(screen.queryByRole("checkbox", { name: "Select all rows" })).toBeNull();
    expect(screen.queryAllByRole("checkbox", { name: "Select row" })).toHaveLength(0);
    const { result } = renderHook(
      () => useFeedbackInbox({ rows: ROWS, canEdit: true, update: updateMutation(), ...props }),
      { wrapper: ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter> },
    );
    expect(result.current.bulk).toBeUndefined();
    expect(result.current.table.selection).toBeUndefined();
  });

  it("selects all of what the table's filters keep — never a row a filter hides", async () => {
    const { update } = renderInbox({}, "/feedback?f.status=READY,IN_EVALUATION");
    expect(screen.queryByText("Typo in the footer")).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    expect(bar()).toHaveAccessibleName("2 selected");
    expect(screen.getByRole("checkbox", { name: "Select all rows" })).toBeChecked();
    await bulkSet("Set status", "Won't do");
    expect(update.mutateAsync.mock.calls.map(([patch]) => patch)).toEqual([
      { id: 3, status: "WONT_DO" },
      { id: 4, status: "WONT_DO" },
    ]);
  });

  it("lets go of a row that leaves the list", () => {
    const { rerenderWith } = renderInbox();
    tick("Export button missing");
    tick("Typo in the footer");
    expect(bar()).toHaveAccessibleName("2 selected");
    rerenderWith({ rows: ROWS.filter((row) => row.id !== 2) });
    expect(bar()).toHaveAccessibleName("1 selected");
  });
});

describe("a bulk status change", () => {
  beforeEach(() => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
  });

  it("sends the page's PATCH once per report, with each report's own patch", async () => {
    const { update } = renderInbox();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    await bulkSet("Set status", "Won't do");
    expect(update.mutateAsync.mock.calls.map(([patch]) => patch)).toEqual([
      { id: 3, status: "WONT_DO" },
      { id: 4, status: "WONT_DO" },
      { id: 2, status: "WONT_DO" },
    ]);
    expect(toast.undo).toHaveBeenCalledTimes(1);
    expect(toast.undo).toHaveBeenCalledWith(
      "Set 3 reports to “Won't do”",
      expect.objectContaining({ label: "Undo", duration: 8000 }),
    );
    // Done: the selection empties; the desktop's strip stays where it is, at "0 selected",
    // its lists waiting again — nothing under the pointer moves.
    expect(
      screen.getAllByRole("checkbox", { name: "Select row" }).filter((box) => (box as HTMLInputElement).checked),
    ).toHaveLength(0);
    expect(bar()).not.toHaveAttribute("inert");
    expect(bar()).toHaveAccessibleName("0 selected");
    expect(within(bar()).getByRole("button", { name: "Set status" })).toBeDisabled();
  });

  it("puts each report back to ITS previous status with the one Undo", async () => {
    const { update } = renderInbox();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    await bulkSet("Set status", "Won't do");
    update.mutateAsync.mockClear();
    await pressUndo();
    expect(update.mutateAsync.mock.calls.map(([patch]) => patch)).toEqual([
      { id: 3, status: "IN_EVALUATION" },
      { id: 4, status: "READY" },
      { id: 2, status: "DONE" },
    ]);
    expect(toast.success).toHaveBeenCalledWith("3 reports are back as they were");
  });

  it("sends nothing for a report already there, and offers no value that would change none", async () => {
    const { update } = renderInbox();
    tick("Typo in the footer");
    fireEvent.click(within(bar()).getByRole("button", { name: "Set status" }));
    expect(
      within(screen.getByRole("dialog", { name: "Set status" })).getByRole("button", { name: "Done" }),
    ).toBeDisabled();
    fireEvent.click(within(bar()).getByRole("button", { name: "Set status" }));
    tick("Where is the currency?");
    await bulkSet("Set status", "Done");
    expect(update.mutateAsync.mock.calls.map(([patch]) => patch)).toEqual([{ id: 4, status: "DONE" }]);
    expect(toast.undo).toHaveBeenCalledWith("Set 1 report to “Done”", expect.anything());
  });

  it("says how many failed, keeps those selected, and leaves them out of the Undo", async () => {
    const update = updateMutation([4]);
    renderInbox({ update });
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    await bulkSet("Set status", "Won't do");
    expect(toast.undo).toHaveBeenCalledWith("Set 2 reports to “Won't do”", expect.anything());
    expect(toast.error).toHaveBeenCalledWith("1 report could not be changed and stays selected.");
    // The one that failed is still ticked, ready for a second try.
    expect(bar()).toHaveAccessibleName("1 selected");
    expect(within(desktopRow("Where is the currency?")).getByRole("checkbox")).toBeChecked();
    expect(within(desktopRow("Export button missing")).getByRole("checkbox")).not.toBeChecked();

    update.mutateAsync.mockClear();
    await pressUndo();
    expect(update.mutateAsync.mock.calls.map(([patch]) => patch)).toEqual([
      { id: 3, status: "IN_EVALUATION" },
      { id: 2, status: "DONE" },
    ]);
  });

  it("says none changed when every PATCH failed, and offers no Undo", async () => {
    renderInbox({ update: updateMutation([2, 3]) });
    tick("Export button missing");
    tick("Typo in the footer");
    await bulkSet("Set status", "Won't do");
    expect(toast.undo).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("2 reports could not be changed and stay selected.");
    expect(bar()).toHaveAccessibleName("2 selected");
  });

  it("keeps three PATCHes in flight, not the whole batch", async () => {
    const answers: (() => void)[] = [];
    const update = {
      mutateAsync: vi.fn(
        (_: FeedbackDetailPatch) =>
          new Promise<unknown>((resolve) => {
            answers.push(() => resolve(undefined));
          }),
      ),
    };
    const rows = [1, 2, 3, 4, 5].map((id) =>
      record({ id, title: `Report ${id}`, created_at: `2026-10-0${id}T09:00:00Z` }),
    );
    renderInbox({ update, rows });
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    fireEvent.click(within(bar()).getByRole("button", { name: "Set status" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Set status" })).getByRole("button", { name: "Done" }));
    await settle();
    expect(update.mutateAsync).toHaveBeenCalledTimes(3);
    // A second press while the batch is out starts nothing.
    expect(within(bar()).getByRole("button", { name: "Set category" })).toBeDisabled();
    answers[0]();
    await settle();
    expect(update.mutateAsync).toHaveBeenCalledTimes(4);
    for (const answer of answers.slice(1)) answer();
    await settle();
    answers.at(-1)!();
    await settle();
    expect(update.mutateAsync).toHaveBeenCalledTimes(5);
    expect(toast.undo).toHaveBeenCalledWith("Set 5 reports to “Done”", expect.anything());
  });
});

describe("the other two bulk changes", () => {
  beforeEach(() => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
  });

  it("sets the category through the same PATCH — never to CRASH", async () => {
    const { update } = renderInbox();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    fireEvent.click(within(bar()).getByRole("button", { name: "Set category" }));
    const list = screen.getByRole("dialog", { name: "Set category" });
    expect(
      within(list)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Bug", "Idea", "Question", "Other"]);
    fireEvent.click(within(list).getByRole("button", { name: "Idea" }));
    await settle();
    // #3 is an IDEA already.
    expect(update.mutateAsync.mock.calls.map(([patch]) => patch)).toEqual([
      { id: 4, category: "IDEA" },
      { id: 2, category: "IDEA" },
    ]);
    update.mutateAsync.mockClear();
    await pressUndo();
    expect(update.mutateAsync.mock.calls.map(([patch]) => patch)).toEqual([
      { id: 4, category: "QUESTION" },
      { id: 2, category: "OTHER" },
    ]);
  });

  it("switches Visible to others with `publicSwitch` — not on a CRASH, nor a row without the flag", async () => {
    const rows = [
      ...ROWS.map((row) => ({ ...row, public: row.id === 3 })),
      record({ id: 5, title: "It crashed", category: "CRASH", public: false, created_at: "2026-10-01T09:00:00Z" }),
      record({ id: 6, title: "From an old server", created_at: "2026-10-01T08:00:00Z" }),
    ];
    const { update } = renderInbox({ rows, publicSwitch: true });
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    await bulkSet("Visibility", "Visible to others");
    expect(update.mutateAsync.mock.calls.map(([patch]) => patch)).toEqual([
      { id: 4, public: true },
      { id: 2, public: true },
    ]);
    expect(toast.undo).toHaveBeenCalledWith("Set 2 reports to “Visible to others”", expect.anything());
    update.mutateAsync.mockClear();
    await pressUndo();
    expect(update.mutateAsync.mock.calls.map(([patch]) => patch)).toEqual([
      { id: 4, public: false },
      { id: 2, public: false },
    ]);
  });

  it("offers no Visibility without `publicSwitch` (kastlan has no public parts)", () => {
    renderInbox();
    tick("Export button missing");
    expect(within(bar()).queryByRole("button", { name: "Visibility" })).toBeNull();
  });

  it("speaks the provider's words: a bulk label is the app's to translate", () => {
    renderInbox({ labels: { bulkStatus: "Statut…" } });
    tick("Export button missing");
    expect(within(bar()).getByRole("button", { name: "Statut…" })).toBeInTheDocument();
  });
});

describe("the phone", () => {
  const longPress = (title: string) => {
    fireEvent.pointerDown(screen.getByText(title), { pointerId: 1, button: 0, clientX: 50, clientY: 50 });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 50, clientY: 50 });
    fireEvent.click(screen.getByText(title));
  };

  it("selects with a long press; the swipes rest and the toggle steps aside while it lasts", async () => {
    vi.useFakeTimers();
    stubPhone();
    const { update } = renderInbox();
    expect(within(card("Where is the currency?")).getByRole("group", { name: "Row actions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Only what is waiting for you" })).toBeInTheDocument();

    longPress("Where is the currency?");
    expect(bar()).toHaveAccessibleName("1 selected");
    // A sideways drag would be a second meaning for a selecting touch.
    expect(within(card("Where is the currency?")).queryByRole("group", { name: "Row actions" })).toBeNull();
    // The floating bar takes the bottom of the screen; the toggle's group waits.
    expect(screen.queryByRole("button", { name: "Only what is waiting for you" })).toBeNull();
    // A tap adds a card in the mode: the card itself is the toggle.
    fireEvent.click(screen.getByText("Export button missing").closest("[data-card-selecting]")!);
    expect(bar()).toHaveAccessibleName("2 selected");

    vi.useRealTimers();
    await bulkSet("Set status", "Done");
    expect(update.mutateAsync.mock.calls.map(([patch]) => patch)).toEqual([
      { id: 3, status: "DONE" },
      { id: 4, status: "DONE" },
    ]);
    // Out of the mode: the swipes and the toggle are back.
    expect(within(card("Where is the currency?")).getByRole("group", { name: "Row actions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Only what is waiting for you" })).toBeInTheDocument();
  });
});
