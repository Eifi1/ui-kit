import { act, fireEvent, render as rtlRender, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { translationRows } from "../../lib/translation-review";
import type { TranslationReview } from "../../lib/translation-review";
import { toast } from "../toast";
import { TranslationReviewPanel } from "../translation-review";
import type { TranslationReviewPanelProps } from "../translation-review";
import { WriteLockProvider } from "../write-lock";

/**
 * 0.25 — keksdose live #377, Marcel reviewing on a phone: *"Add swiping. And also grouping
 * to the translation review entries for faster reviewing."* What has to hold: a swipe is a
 * shortcut to exactly what the buttons do (and never the only way), Approve can be taken
 * back, "Needs a change" never goes out blind, and a group's bulk approve obeys every rule a
 * single approval does.
 */

vi.mock("../toast", () => ({
  toast: Object.assign(vi.fn(), { undo: vi.fn(), success: vi.fn() }),
}));

const render = (ui: ReactElement) => rtlRender(ui, { wrapper: MemoryRouter });

function review(overrides: Partial<TranslationReview>): TranslationReview {
  return {
    locale: "fr",
    key: "common.save",
    text: "Enregistrer",
    referenceText: "Save",
    verdict: "APPROVED",
    note: null,
    suggestion: null,
    reviewerName: "Example Reviewer",
    reviewedAt: "2026-10-02T10:00:00Z",
    ...overrides,
  };
}

// budget.rta: changed since review · budget.goal: missing · common.save: approved ·
// common.items, common.cancel: unreviewed · legal.terms: unreviewed.
const ROWS = translationRows({
  locale: "fr",
  strings: {
    "budget.rta": "À attribuer",
    "common.save": "Enregistrer",
    "common.items": "{{count}} éléments",
    "common.cancel": "Annuler",
    "legal.terms": "Conditions d’utilisation",
  },
  reference: {
    "budget.rta": "Ready to Assign",
    "budget.goal": "Set a goal",
    "common.save": "Save",
    "common.items": "{{count}} items",
    "common.cancel": "Cancel",
    "legal.terms": "Terms of Service",
  },
  reviews: [
    review({}),
    review({ key: "budget.rta", text: "A attribuer", referenceText: "Ready to Assign", note: "accent" }),
  ],
});

function setup(props: Partial<TranslationReviewPanelProps> = {}, wrap?: (ui: ReactElement) => ReactElement) {
  const onSave = vi.fn();
  const onClear = vi.fn();
  const panel = (
    <TranslationReviewPanel
      rows={ROWS}
      localeLabel="Français"
      referenceLabel="English"
      onSave={onSave}
      onClear={onClear}
      {...props}
    />
  );
  const utils = render(wrap ? wrap(panel) : panel);
  return { onSave, onClear, ...utils };
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

const undoMock = () => vi.mocked(toast.undo);
const successMock = () => vi.mocked(toast.success);

beforeEach(() => {
  undoMock().mockClear();
  successMock().mockClear();
});
afterEach(() => vi.unstubAllGlobals());

/** A phone card: the `<li>` holding the text (the first, not an open editor's copy). */
const card = (text: string) => screen.getAllByText(text)[0].closest("li") as HTMLElement;
/** The card's keyboard path: SwipeableRow's buttons, one per swipe. */
const swipeButtons = (text: string) => {
  const group = within(card(text)).queryByRole("group", { name: "Row actions" });
  return group ? within(group).getAllByRole("button").map((b) => b.textContent) : [];
};
/** The sliding part of a card — the one that takes the pointer. */
const slider = (text: string) => screen.getAllByText(text)[0].closest<HTMLElement>('[style*="pan-y"]')!;

function drag(text: string, dx: number) {
  const el = slider(text);
  fireEvent.pointerDown(el, { pointerId: 1, clientX: 200, clientY: 0, button: 0, pointerType: "touch" });
  fireEvent.pointerMove(el, { pointerId: 1, clientX: 200 + dx / 2, clientY: 0, pointerType: "touch" });
  fireEvent.pointerMove(el, { pointerId: 1, clientX: 200 + dx, clientY: 0, pointerType: "touch" });
  fireEvent.pointerUp(el, { pointerId: 1, clientX: 200 + dx, clientY: 0, pointerType: "touch" });
}

describe("TranslationReviewPanel swipe (phone)", () => {
  beforeEach(stubPhone);

  it("is opt-in: no swipe on the cards without it", () => {
    setup();
    expect(swipeButtons("Annuler")).toEqual([]);
  });

  it("offers Approve toward the end and 'Needs a change' toward the start — as buttons too", () => {
    setup({ swipe: true });
    expect(swipeButtons("Annuler")).toEqual(["Approve", "Needs a change"]);
    // Nothing to approve on an approved string or a missing one; it can still be sent back.
    expect(swipeButtons("Enregistrer")).toEqual(["Needs a change"]);
    expect(swipeButtons("Missing in this language")).toEqual(["Suggest translation"]);
  });

  it("gives no swipe where nothing may be changed: a read-only locale, a write lock", () => {
    const { unmount } = setup({ swipe: true, readOnly: true });
    expect(swipeButtons("Annuler")).toEqual([]);
    unmount();
    setup({ swipe: true }, (ui) => (
      <WriteLockProvider locked reason="Read-only demo">
        {ui}
      </WriteLockProvider>
    ));
    expect(swipeButtons("Annuler")).toEqual([]);
  });

  it("approves on a swipe toward the end, and the Undo toast clears the verdict again", async () => {
    const { onSave, onClear } = setup({ swipe: true });
    drag("Annuler", 150);
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        [
          {
            locale: "fr",
            key: "common.cancel",
            text: "Annuler",
            referenceText: "Cancel",
            verdict: "APPROVED",
            note: null,
            suggestion: null,
          },
        ],
        { origin: "swipe", toasted: true },
      ),
    );
    await waitFor(() => expect(undoMock()).toHaveBeenCalledTimes(1));
    const [message, options] = undoMock().mock.calls[0];
    expect(message).toBe("String approved");
    expect(options.description).toBe("common.cancel");
    act(() => options.onUndo());
    await waitFor(() =>
      expect(onClear).toHaveBeenCalledWith([{ locale: "fr", key: "common.cancel" }], { origin: "undo", toasted: false }),
    );
  });

  it("puts a row's earlier verdict back on Undo, on the wording it was given on", async () => {
    const { onSave } = setup({ swipe: true });
    drag("À attribuer", 150);
    await waitFor(() => expect(undoMock()).toHaveBeenCalledTimes(1));
    act(() => undoMock().mock.calls[0][1].onUndo());
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave.mock.calls[1]).toEqual([
      [
        {
          locale: "fr",
          key: "budget.rta",
          text: "A attribuer",
          referenceText: "Ready to Assign",
          verdict: "APPROVED",
          note: "accent",
          suggestion: null,
        },
      ],
      { origin: "undo", toasted: false },
    ]);
  });

  it("opens the editor on a swipe toward the start, with the cursor in the wording — and writes nothing", () => {
    const { onSave } = setup({ swipe: true });
    drag("Annuler", -150);
    const wording = screen.getByLabelText("Better wording");
    expect(wording).toHaveFocus();
    expect(onSave).not.toHaveBeenCalled();
    // The open row does not swipe: its editor owns the width.
    expect(swipeButtons("common.cancel")).toEqual([]);
  });

  it("mirrors the sides in a right-to-left page", async () => {
    const { onSave } = setup({ swipe: true }, (ui) => <div dir="rtl">{ui}</div>);
    // Physically right is toward the START in RTL: the editor, not an approval.
    drag("Annuler", 150);
    expect(screen.getByLabelText("Better wording")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    drag("Conditions d’utilisation", -150);
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith([expect.objectContaining({ key: "legal.terms", verdict: "APPROVED" })], {
        origin: "swipe",
        toasted: true,
      }),
    );
  });

  it("queues a swipe made while another write is out, rather than overlapping or dropping it", async () => {
    let answer: () => void = () => {};
    const onSave = vi.fn(() => new Promise<void>((resolve) => (answer = resolve)));
    setup({ swipe: true, onSave });
    drag("Annuler", 150);
    drag("Conditions d’utilisation", 150);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    // The second waits for the first.
    await act(async () => {
      await Promise.resolve();
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    await act(async () => answer());
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave.mock.calls.map((c) => (c as unknown as [{ key: string }[]])[0][0].key)).toEqual([
      "common.cancel",
      "legal.terms",
    ]);
  });

  it("reports an approval it cannot take back, without an Undo, when the app has no onClear", async () => {
    setup({ swipe: true, onClear: undefined });
    drag("Annuler", 150);
    await waitFor(() => expect(successMock()).toHaveBeenCalledWith("String approved", { description: "common.cancel" }));
    expect(undoMock()).not.toHaveBeenCalled();
  });
});

describe("TranslationReviewPanel undo (desktop)", () => {
  it("stays off by default: a row's approve shows no kit toast", async () => {
    const { onSave } = setup();
    fireEvent.click(within(screen.getByText("Annuler").closest("tr")!).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(undoMock()).not.toHaveBeenCalled();
  });

  it("answers the editor's Approve too, and tells the app it toasted", async () => {
    const { onSave } = setup({ undo: true });
    fireEvent.click(screen.getByText("Annuler").closest("tr")!);
    const editor = screen.getByLabelText("Better wording").closest("td")!;
    fireEvent.click(within(editor).getByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith([expect.objectContaining({ key: "common.cancel" })], {
        origin: "editor",
        toasted: true,
      }),
    );
    await waitFor(() => expect(undoMock()).toHaveBeenCalledWith("String approved", expect.anything()));
  });
});

describe("TranslationReviewPanel groupBy", () => {
  const section = (name: string) =>
    screen.getByRole("heading", { name: new RegExp(`^${name}`) }).closest<HTMLElement>("[data-review-group]")!;

  it("puts a heading over each area, in the reference's order, with its counts", () => {
    setup({ groupBy: "namespace" });
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual([
      "budget0 unreviewed / 2",
      "common2 unreviewed / 3",
      "legal1 unreviewed / 1",
    ]);
    // One table per area, named by it.
    expect(screen.getByRole("table", { name: "common" })).toBeInTheDocument();
    expect(within(screen.getByRole("table", { name: "legal" })).getByText("Conditions d’utilisation")).toBeInTheDocument();
  });

  it("approves an area's unreviewed rows in one write, with one Undo for the batch", async () => {
    const { onSave, onClear } = setup({ groupBy: "namespace" });
    // Nothing nobody has read in budget: no button.
    expect(within(section("budget")).queryByRole("button", { name: /Approve unreviewed/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Approve unreviewed (2)" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].map((w: { key: string }) => w.key)).toEqual(["common.items", "common.cancel"]);
    expect(onSave.mock.calls[0][1]).toEqual({ origin: "group", toasted: true });
    await waitFor(() => expect(undoMock()).toHaveBeenCalledTimes(1));
    const [message, options] = undoMock().mock.calls[0];
    expect(message).toBe("2 strings approved");
    expect(options.description).toBe("common");
    act(() => options.onUndo());
    await waitFor(() =>
      expect(onClear).toHaveBeenCalledWith(
        [
          { locale: "fr", key: "common.items" },
          { locale: "fr", key: "common.cancel" },
        ],
        { origin: "undo", toasted: false },
      ),
    );
  });

  it("says which area a group's button approves", () => {
    setup({ groupBy: "namespace" });
    expect(screen.getByRole("button", { name: "Approve unreviewed (1)" })).toHaveAccessibleDescription("legal");
  });

  it("asks first when the batch is larger than a page, inside the opened area", async () => {
    const { onSave } = setup({ groupBy: "namespace", pageSize: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Approve unreviewed (2)" }));
    expect(onSave).not.toHaveBeenCalled();
    const question = screen.getByText("Approve all 2 unreviewed strings in common, including those not on screen?");
    const confirm = screen.getAllByRole("button", { name: "Approve unreviewed (2)" })[1];
    expect(confirm).toHaveFocus();
    expect(confirm).toHaveAccessibleDescription(question.textContent!);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText(/Approve all 2/)).toBeNull();
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Approve unreviewed (2)" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Approve unreviewed (2)" })[1]);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toHaveLength(2);
  });

  it("obeys the write lock and a read-only locale like a single approval", () => {
    const { onSave, unmount } = setup({ groupBy: "namespace" }, (ui) => (
      <WriteLockProvider locked reason="Read-only demo">
        {ui}
      </WriteLockProvider>
    ));
    const button = screen.getByRole("button", { name: "Approve unreviewed (2)" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);
    expect(onSave).not.toHaveBeenCalled();
    unmount();
    setup({ groupBy: "namespace", readOnly: true });
    expect(screen.queryByRole("button", { name: /Approve unreviewed/ })).toBeNull();
  });

  it("groups what the filters leave, and counts only that", () => {
    setup({ groupBy: "namespace", filter: { status: "unreviewed" } });
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "common2 unreviewed / 2",
      "legal1 unreviewed / 1",
    ]);
  });

  it("folds a group, and sorts every group's rows alike", () => {
    setup({ groupBy: "namespace" });
    const toggle = within(screen.getByRole("heading", { name: /^legal/ })).getByRole("button");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("table", { name: "legal" })).toBeNull();

    const common = screen.getByRole("table", { name: "common" });
    fireEvent.click(within(common).getByRole("button", { name: "Key" }));
    const budget = screen.getByRole("table", { name: "budget" });
    expect(within(budget).getByRole("columnheader", { name: /Key/ })).toHaveAttribute("aria-sort", "ascending");
  });

  it("pages each area on its own", () => {
    setup({ groupBy: "namespace", pageSize: 2 });
    const common = screen.getByRole("table", { name: "common" });
    expect(within(common).getAllByRole("row").filter((r) => r.closest("tbody"))).toHaveLength(2);
    const legal = screen.getByRole("table", { name: "legal" });
    expect(within(legal).getAllByRole("row").filter((r) => r.closest("tbody"))).toHaveLength(1);
  });

  it("names a source group by sourceLabels, or by groupLabel", () => {
    const rows = ROWS.map((r) => ({ ...r, source: r.key.startsWith("legal") ? "documents" : "screen" }));
    const { unmount } = setup({ rows, groupBy: "source", sourceLabels: { documents: "PDFs and emails" } });
    expect(screen.getByRole("heading", { name: /^PDFs and emails/ })).toBeInTheDocument();
    unmount();
    setup({ groupBy: "namespace", groupLabel: (g) => g.toUpperCase() });
    expect(screen.getByRole("heading", { name: /^LEGAL/ })).toBeInTheDocument();
  });

  describe("on a phone", () => {
    beforeEach(stubPhone);

    it("starts folded when there are several areas — and open when there is one", () => {
      const { unmount } = setup({ groupBy: "namespace" });
      for (const heading of screen.getAllByRole("heading", { level: 2 })) {
        expect(within(heading).getByRole("button")).toHaveAttribute("aria-expanded", "false");
      }
      unmount();
      setup({ groupBy: "namespace", filter: { namespace: "legal" } });
      expect(within(screen.getByRole("heading", { level: 2 })).getByRole("button")).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    });

    it("'Select all shown' takes the open areas' rows only", () => {
      setup({ groupBy: "namespace" });
      fireEvent.click(within(screen.getByRole("heading", { name: /^legal/ })).getByRole("button"));
      fireEvent.click(screen.getByRole("button", { name: "Select all shown" }));
      expect(screen.getByText("1 selected")).toBeInTheDocument();
    });
  });
});
