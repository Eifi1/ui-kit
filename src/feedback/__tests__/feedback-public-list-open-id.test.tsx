import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { DESKTOP_WIDTH, stubViewportWidth } from "../../test/viewport";
import { FeedbackPublicList, type FeedbackPublicListProps } from "../feedback-public-list";
import type { FeedbackPublicListItem } from "../feedback-public-types";

/**
 * API-5 / API-7 (refactor audit 2026-10-30): the opened row's id is reported through
 * `onOpenIdChange` — every other `onOpenChange` in the kit carries a boolean — with
 * `onOpenChange` kept as its deprecated alias for 0.52; `rows` takes a `readonly` page.
 */

let restore: (() => void) | undefined;
afterEach(() => {
  restore?.();
  restore = undefined;
});

const ROWS: readonly FeedbackPublicListItem[] = Object.freeze([
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
]);

function renderList(props: Partial<FeedbackPublicListProps>) {
  restore = stubViewportWidth(DESKTOP_WIDTH);
  return render(
    <FeedbackPublicList
      rows={ROWS}
      sort="newest"
      onSortChange={() => {}}
      onVote={vi.fn()}
      renderDetail={(row) => <div data-testid="detail">Detail of #{row.id}</div>}
      {...props}
    />,
    { wrapper: MemoryRouter },
  );
}

describe("FeedbackPublicList — onOpenIdChange (API-5)", () => {
  it("reports the opened row's id, and null when it closes", () => {
    const onOpenIdChange = vi.fn();
    renderList({ onOpenIdChange });
    fireEvent.click(screen.getByText("Chart jumps on save"));
    expect(onOpenIdChange).toHaveBeenLastCalledWith(12);
    expect(screen.getByTestId("detail")).toHaveTextContent("Detail of #12");
    fireEvent.click(screen.getByText("Chart jumps on save"));
    expect(onOpenIdChange).toHaveBeenLastCalledWith(null);
  });

  it("still calls the deprecated onOpenChange — and only the new name when both are given", () => {
    const onOpenChange = vi.fn();
    const { unmount } = renderList({ onOpenChange });
    fireEvent.click(screen.getByText("Chart jumps on save"));
    expect(onOpenChange).toHaveBeenLastCalledWith(12);
    unmount();
    const onOpenIdChange = vi.fn();
    const old = vi.fn();
    renderList({ onOpenIdChange, onOpenChange: old });
    fireEvent.click(screen.getByText("Chart jumps on save"));
    expect(onOpenIdChange).toHaveBeenCalledWith(12);
    expect(old).not.toHaveBeenCalled();
  });

  it("takes a readonly page (API-7)", () => {
    expectTypeOf(ROWS).toMatchTypeOf<FeedbackPublicListProps["rows"]>();
  });
});
