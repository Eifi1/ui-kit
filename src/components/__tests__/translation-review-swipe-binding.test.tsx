import { act, fireEvent, render as rtlRender, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_TRANSLATION_REVIEW_SWIPE, translationRows } from "../../lib/translation-review";
import type { TranslationReview, TranslationReviewSwipeAction } from "../../lib/translation-review";
import { toast } from "../toast";
import { TranslationReviewPanel } from "../translation-review";
import type { TranslationReviewPanelProps } from "../translation-review";
import { WriteLockProvider } from "../write-lock";
import { stubPhone } from "../../test/viewport";

/**
 * keksdose — Marcel's live #377 rework, 2026-10-03: *"Add the swipe options to be shown also
 * to the settings /settings#interaction area where the other swipe options are defined."*
 * `swipe` takes a binding — per logical side an ordered ladder, the first stage and the
 * longer drag — so the app's settings can reach it. What has to hold: `true` is 0.25
 * exactly, an action a row cannot offer drops out and the ladder closes up, `clear` comes
 * only with `onClear` and is taken back by Undo, and the sides mirror in RTL.
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

// common.save: approved · budget.rta: changed since review (an approval on older wording) ·
// legal.terms: needs a change · budget.goal: missing · common.cancel: unreviewed.
const ROWS = translationRows({
  locale: "fr",
  strings: {
    "budget.rta": "À attribuer",
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "legal.terms": "Conditions d’utilisation",
  },
  reference: {
    "budget.rta": "Ready to Assign",
    "budget.goal": "Set a goal",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "legal.terms": "Terms of Service",
  },
  reviews: [
    review({}),
    review({ key: "budget.rta", text: "A attribuer", referenceText: "Ready to Assign" }),
    review({
      key: "legal.terms",
      text: "Conditions d’utilisation",
      referenceText: "Terms of Service",
      verdict: "NEEDS_CHANGE",
      note: "« générales »",
      suggestion: "Conditions générales d’utilisation",
    }),
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

const undoMock = () => vi.mocked(toast.undo);
const successMock = () => vi.mocked(toast.success);

beforeEach(() => {
  stubPhone();
  undoMock().mockClear();
  successMock().mockClear();
});
afterEach(() => vi.unstubAllGlobals());

const card = (text: string) => screen.getAllByText(text)[0].closest("li") as HTMLElement;
/** The card's keyboard path: SwipeableRow's buttons — the physically-right ladder first
 *  (the END in left-to-right), each nearest threshold first. */
const swipeButtons = (text: string) => {
  const group = within(card(text)).queryByRole("group", { name: "Row actions" });
  return group ? within(group).getAllByRole("button").map((b) => b.textContent) : [];
};
const slider = (text: string) => screen.getAllByText(text)[0].closest<HTMLElement>('[style*="pan-y"]')!;

/** jsdom measures the card 0px wide, so SwipeableRow drags over 200px: one stage arms at
 *  100px, two at 67px and 133px. */
function drag(text: string, dx: number) {
  const el = slider(text);
  fireEvent.pointerDown(el, { pointerId: 1, clientX: 200, clientY: 0, button: 0, pointerType: "touch" });
  fireEvent.pointerMove(el, { pointerId: 1, clientX: 200 + dx / 2, clientY: 0, pointerType: "touch" });
  fireEvent.pointerMove(el, { pointerId: 1, clientX: 200 + dx, clientY: 0, pointerType: "touch" });
  fireEvent.pointerUp(el, { pointerId: 1, clientX: 200 + dx, clientY: 0, pointerType: "touch" });
}
const FIRST_STAGE = 90;
const SECOND_STAGE = 160;

const TEXTS = ["Annuler", "Enregistrer", "À attribuer", "Conditions d’utilisation", "Missing in this language"];
const everyCard = () => TEXTS.map(swipeButtons);

describe("TranslationReviewPanel swipe binding", () => {
  it("`true` is 0.25's mapping exactly — the default binding, card by card", () => {
    const { unmount } = setup({ swipe: true });
    const fromTrue = everyCard();
    unmount();
    setup({ swipe: { ...DEFAULT_TRANSLATION_REVIEW_SWIPE } });
    expect(everyCard()).toEqual(fromTrue);
    expect(fromTrue).toEqual([
      ["Approve", "Needs a change"],
      ["Needs a change"],
      ["Approve", "Needs a change"],
      ["Approve", "Needs a change"],
      ["Suggest translation"],
    ]);
  });

  it("`false` is no swipe, as leaving it out is", () => {
    setup({ swipe: false });
    expect(everyCard()).toEqual([[], [], [], [], []]);
  });

  it("binds one stage: `clear` toward the end, only where there is a verdict to take back", () => {
    setup({ swipe: { end: ["clear"] } });
    expect(everyCard()).toEqual([
      // Unreviewed and missing-without-a-suggestion have nothing to clear — and no other
      // swipe bound, so no swipe at all.
      [],
      ["Mark unreviewed"],
      ["Mark unreviewed"],
      ["Mark unreviewed"],
      [],
    ]);
  });

  it("binds two stages: the first threshold commits index 0, the longer drag index 1", async () => {
    const { onSave, onClear } = setup({ swipe: { end: ["approve", "clear"], start: ["edit"] } });
    expect(swipeButtons("À attribuer")).toEqual(["Approve", "Mark unreviewed", "Needs a change"]);
    drag("À attribuer", FIRST_STAGE);
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith([expect.objectContaining({ key: "budget.rta", verdict: "APPROVED" })], {
        origin: "swipe",
        toasted: true,
      }),
    );
    expect(onClear).not.toHaveBeenCalled();
    drag("Conditions d’utilisation", SECOND_STAGE);
    await waitFor(() =>
      expect(onClear).toHaveBeenCalledWith([{ locale: "fr", key: "legal.terms" }], { origin: "swipe", toasted: true }),
    );
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("drops what a row cannot offer and closes the ladder up behind it", async () => {
    const { onSave, onClear } = setup({ swipe: { end: ["approve", "clear"], start: ["clear", "edit"] } });
    // Approved: no approve, so `clear` is the end's FIRST stage.
    expect(swipeButtons("Enregistrer")).toEqual(["Mark unreviewed", "Mark unreviewed", "Needs a change"]);
    // Unreviewed: nothing to clear on either side.
    expect(swipeButtons("Annuler")).toEqual(["Approve", "Needs a change"]);
    // Missing: neither approve nor (with no suggestion stored) clear.
    expect(swipeButtons("Missing in this language")).toEqual(["Suggest translation"]);

    // The end is one stage now, so it arms where a lone stage does — and it is the clear.
    drag("Enregistrer", 110);
    await waitFor(() =>
      expect(onClear).toHaveBeenCalledWith([{ locale: "fr", key: "common.save" }], { origin: "swipe", toasted: true }),
    );
    // On the unreviewed row the start is `edit` alone now: the editor opens.
    drag("Annuler", -110);
    expect(screen.getByLabelText("Better wording")).toHaveFocus();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("drops an id bound twice on one side, and one it does not know", () => {
    setup({
      swipe: { end: ["approve", "approve"], start: ["needsChange" as TranslationReviewSwipeAction, "edit"] },
    });
    expect(swipeButtons("Annuler")).toEqual(["Approve", "Needs a change"]);
  });

  it("offers no `clear` without onClear — the side closes up, or goes quiet", () => {
    setup({ swipe: { end: ["clear", "approve"], start: ["clear"] }, onClear: undefined });
    expect(swipeButtons("Enregistrer")).toEqual([]);
    expect(swipeButtons("À attribuer")).toEqual(["Approve"]);
  });

  it("answers a swiped clear with Undo, which stores the verdict again", async () => {
    const { onSave } = setup({ swipe: { end: ["clear"] } });
    drag("Conditions d’utilisation", 150);
    await waitFor(() => expect(undoMock()).toHaveBeenCalledTimes(1));
    const [message, options] = undoMock().mock.calls[0];
    expect(message).toBe("String marked unreviewed");
    expect(options.description).toBe("legal.terms");
    act(() => options.onUndo());
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        [
          {
            locale: "fr",
            key: "legal.terms",
            text: "Conditions d’utilisation",
            referenceText: "Terms of Service",
            verdict: "NEEDS_CHANGE",
            note: "« générales »",
            suggestion: "Conditions générales d’utilisation",
          },
        ],
        { origin: "undo", toasted: false },
      ),
    );
  });

  it("toasts nothing for a clear with `undo` off, and says so to the app", async () => {
    const { onClear } = setup({ swipe: { end: ["clear"] }, undo: false });
    drag("Enregistrer", 150);
    await waitFor(() =>
      expect(onClear).toHaveBeenCalledWith([{ locale: "fr", key: "common.save" }], { origin: "swipe", toasted: false }),
    );
    expect(undoMock()).not.toHaveBeenCalled();
    expect(successMock()).not.toHaveBeenCalled();
  });

  it("keeps every 0.25 rule for a binding: no swipe read-only or under a write lock", () => {
    const binding = { end: ["approve", "clear"], start: ["edit", "clear"] } as const;
    const { unmount } = setup({ swipe: binding, readOnly: true });
    expect(everyCard()).toEqual([[], [], [], [], []]);
    unmount();
    setup({ swipe: binding }, (ui) => (
      <WriteLockProvider locked reason="Read-only demo">
        {ui}
      </WriteLockProvider>
    ));
    expect(everyCard()).toEqual([[], [], [], [], []]);
  });

  it("mirrors the logical sides in a right-to-left page", async () => {
    const { onSave, onClear } = setup({ swipe: { end: ["approve"], start: ["clear"] } }, (ui) => (
      <div dir="rtl">{ui}</div>
    ));
    // Physically right is the START in RTL: on the approved row, its clear.
    drag("Enregistrer", 150);
    await waitFor(() =>
      expect(onClear).toHaveBeenCalledWith([{ locale: "fr", key: "common.save" }], { origin: "swipe", toasted: true }),
    );
    expect(onSave).not.toHaveBeenCalled();
    // Physically left is the END: the unreviewed row's approval.
    drag("Annuler", -150);
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith([expect.objectContaining({ key: "common.cancel", verdict: "APPROVED" })], {
        origin: "swipe",
        toasted: true,
      }),
    );
  });
});

/**
 * keksdose dev#598 item 2: the desktop table offers what the binding offers — `clear` was
 * reachable only by a swipe. Approve stays on every row that can take it, as before.
 */
describe("TranslationReviewPanel desktop actions from the swipe binding (dev#598)", () => {
  beforeEach(() => vi.unstubAllGlobals());

  const desktopRow = (text: string) => screen.getAllByText(text)[0].closest("tr") as HTMLElement;
  const actionsOf = (text: string) => {
    const box = desktopRow(text).querySelector<HTMLElement>('[data-slot="row-actions"]');
    return box ? within(box).getAllByRole("button").map((b) => b.getAttribute("aria-label")) : [];
  };

  it("draws approve, then the binding's actions, each once and only where the row can take it", () => {
    setup({ swipe: { end: ["approve", "clear"], start: ["edit", "clear"] } });
    expect(actionsOf("Conditions d’utilisation")).toEqual(["Approve", "Mark unreviewed", "Needs a change"]);
    expect(actionsOf("Annuler")).toEqual(["Approve", "Needs a change"]);
    expect(actionsOf("Enregistrer")).toEqual(["Mark unreviewed", "Needs a change"]);
  });

  it("keeps approve on the desktop when the binding leaves it out", () => {
    setup({ swipe: { start: ["edit"] } });
    expect(actionsOf("Annuler")).toEqual(["Approve", "Needs a change"]);
  });

  it("clears from a button, with the row as the origin", async () => {
    const { onClear } = setup({ swipe: { end: ["clear"] } });
    fireEvent.click(within(desktopRow("Enregistrer")).getByRole("button", { name: "Mark unreviewed" }));
    await waitFor(() =>
      expect(onClear).toHaveBeenCalledWith([{ locale: "fr", key: "common.save" }], { origin: "row", toasted: true }),
    );
  });

  it("opens the editor on the wording from edit", () => {
    setup({ swipe: { start: ["edit"] } });
    fireEvent.click(within(desktopRow("Annuler")).getByRole("button", { name: "Needs a change" }));
    expect(screen.getByLabelText("Better wording")).toHaveFocus();
  });

  it("is refused under a write lock rather than hidden", () => {
    const { onSave, onClear } = setup({ swipe: { end: ["approve", "clear"] } }, (ui) => (
      <WriteLockProvider locked reason="Read-only demo">
        {ui}
      </WriteLockProvider>
    ));
    fireEvent.click(within(desktopRow("Conditions d’utilisation")).getByRole("button", { name: "Approve" }));
    fireEvent.click(within(desktopRow("Conditions d’utilisation")).getByRole("button", { name: "Mark unreviewed" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
  });

  it("is the approve column alone without a binding, as before", () => {
    setup({ swipe: false });
    expect(desktopRow("Annuler").querySelector('[data-slot="row-actions"]')).toBeNull();
    expect(within(desktopRow("Annuler")).getAllByRole("button", { name: "Approve" })).toHaveLength(1);
    expect(within(desktopRow("Enregistrer")).queryByRole("button", { name: "Mark unreviewed" })).toBeNull();
  });
});
