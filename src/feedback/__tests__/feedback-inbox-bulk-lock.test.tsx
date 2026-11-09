import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OFFLINE_LOCK, WriteLockProvider, type CommitScope } from "../../components/write-lock";
import { applyTextSize } from "../../theme/text-size";
import { stubDesktop, stubPhone } from "../../test/viewport";
import { FeedbackInbox } from "../feedback-inbox-page";
import type { FeedbackRecord } from "../feedback-record";

/**
 * The bulk bar under a write lock (kastlan's 0.57 adoption): its three lists refuse with the
 * lock's reason, and each drew that reason as a LINE under itself wherever a line is due
 * (`disabledReasonDisplay` "auto": at Large and on a touch screen). On the phone's floating
 * card the same sentence three times grew it to about three rows, over a card and a half of
 * the list. The bar says it once now, under its row; each button keeps it in its tooltip and
 * its description. Synthetic rows only.
 */

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  act(() => applyTextSize("normal"));
  localStorage.clear();
});

const REASON = "Read-only demo — saving is disabled.";
const MENUS = ["Set status", "Set category", "Visibility"];

function record(over: Partial<FeedbackRecord>): FeedbackRecord {
  return {
    id: 1,
    user_id: 7,
    user_email: "author@example.test",
    title: "Chart jumps on save",
    body: "It jumps.",
    category: "BUG",
    status: "OPEN",
    public: false,
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

const ROWS: FeedbackRecord[] = [
  record({ id: 3, title: "Export button missing", category: "IDEA", status: "IN_EVALUATION" }),
  record({ id: 4, title: "Where is the currency?", category: "QUESTION", status: "READY" }),
];

function renderLocked({ commit = true, kind }: { commit?: CommitScope; kind?: string } = {}) {
  return render(
    <MemoryRouter initialEntries={["/feedback"]}>
      <WriteLockProvider locked reason={REASON} kind={kind}>
        <FeedbackInbox
          rows={ROWS}
          canEdit
          viewerId={1}
          update={{ mutateAsync: vi.fn(async () => undefined) }}
          publicSwitch
          commit={commit}
        />
      </WriteLockProvider>
    </MemoryRouter>,
  );
}

const bar = () => screen.getByRole("toolbar");

/** The reason as a reader SEES it in the bar: not a button's `hidden` description, not a
 *  tooltip's bubble (closed it is `display: none`; open, it is the one being hovered). */
const reasonLines = () =>
  within(bar())
    .queryAllByText(REASON)
    .filter((el) => !el.closest("[hidden], [role=tooltip]"));

/** Each list's button refuses, says why to a screen reader, and draws no line of its own. */
function expectEachButtonRefusesQuietly() {
  for (const name of MENUS) {
    const button = within(bar()).getByRole("button", { name });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription(REASON);
    expect(button.closest("[data-slot=disabled-reason]"), `${name} sits in a reason line of its own`).toBeNull();
  }
}

describe("the bulk bar under a write lock", () => {
  it("on a phone: says the reason once, under the card's row — not under each of its three buttons", () => {
    vi.useFakeTimers();
    stubPhone({ coarse: true });
    renderLocked();
    // Selection is not a commit: the long press still enters it.
    fireEvent.pointerDown(screen.getByText("Where is the currency?"), {
      pointerId: 1,
      button: 0,
      clientX: 50,
      clientY: 50,
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 50, clientY: 50 });
    fireEvent.click(screen.getByText("Where is the currency?"));
    expect(bar()).toHaveAccessibleName("1 selected");

    expect(reasonLines()).toHaveLength(1);
    expectEachButtonRefusesQuietly();
  });

  it("on a desktop at Large: the same one line under the strip", () => {
    stubDesktop();
    act(() => applyTextSize("large"));
    renderLocked();
    expect(reasonLines()).toHaveLength(1);
    expectEachButtonRefusesQuietly();
  });

  it("on a desktop at Normal: no line, the reason in each button's tooltip, as before", () => {
    stubDesktop();
    renderLocked();
    expect(reasonLines()).toHaveLength(0);
    expectEachButtonRefusesQuietly();
  });

  it("follows the buttons' scope: a lock they are exempt from draws no line", () => {
    stubDesktop();
    act(() => applyTextSize("large"));
    renderLocked({ commit: { except: [OFFLINE_LOCK] }, kind: OFFLINE_LOCK });
    expect(within(bar()).queryAllByText(REASON)).toHaveLength(0);
    // Not refused: at "0 selected" they wait for a row, natively disabled, with nothing to say.
    for (const name of MENUS) expect(within(bar()).getByRole("button", { name })).toBeDisabled();
  });
});
