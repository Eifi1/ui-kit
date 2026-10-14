import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "../../components/confirm-dialog";
import { FeedbackCommentThread } from "../feedback-comment-thread";
import type { FeedbackComment, FeedbackReply } from "../feedback-public-types";

/** §9.8 of docs/feedback-harmonization.md: comments as rows, hide, delete. Synthetic data. */

const NOW = Date.parse("2026-10-14T12:00:00Z");

const comment = (over: Partial<FeedbackComment> = {}): FeedbackComment => ({
  id: 9,
  author_name: "Anna",
  mine: false,
  staff: false,
  body: "Same here on the iPad.",
  hidden: false,
  created_at: "2026-10-14T10:00:00Z",
  ...over,
});

const reply = (over: Partial<FeedbackReply> = {}): FeedbackReply => ({
  id: 31,
  author_name: null,
  body: "Fixed in 0.4.27.",
  status_to: "DONE",
  created_at: "2026-10-14T11:00:00Z",
  ...over,
});

const wrap = (node: ReactNode) => render(<ConfirmProvider>{node}</ConfirmProvider>);
const rows = () => within(screen.getByRole("list", { name: "Comments" })).getAllByRole("article");

describe("FeedbackCommentThread", () => {
  it("merges replies and comments by time, a reply as a staff post with its status", () => {
    wrap(
      <FeedbackCommentThread
        now={NOW}
        isAdmin={false}
        replies={[reply()]}
        comments={[comment(), comment({ id: 10, body: "Thanks!", created_at: "2026-10-14T11:30:00Z", mine: true })]}
      />,
    );
    const [first, second, third] = rows();
    expect(first).toHaveTextContent("Same here on the iPad.");
    expect(second).toHaveTextContent("Fixed in 0.4.27.");
    expect(second).toHaveTextContent("Admin");
    expect(second).toHaveTextContent("Staff");
    expect(second.querySelector("[data-feedback-reply-status]")).toHaveAttribute("data-feedback-reply-status", "DONE");
    expect(third).toHaveTextContent("You");
  });

  it("draws a null name as A user", () => {
    wrap(<FeedbackCommentThread now={NOW} isAdmin={false} replies={[]} comments={[comment({ author_name: null })]} />);
    expect(rows()[0]).toHaveTextContent("A user");
  });

  it("hidden: others see the line and no name or text; the writer their text with it", () => {
    const hidden = comment({ hidden: true, body: null });
    const { unmount } = wrap(<FeedbackCommentThread now={NOW} isAdmin={false} replies={[]} comments={[hidden]} />);
    expect(rows()[0]).toHaveTextContent("Hidden by an admin");
    expect(rows()[0]).not.toHaveTextContent("Anna");
    unmount();
    wrap(
      <FeedbackCommentThread
        now={NOW}
        isAdmin={false}
        replies={[]}
        comments={[comment({ hidden: true, mine: true, body: "My words" })]}
      />,
    );
    expect(rows()[0]).toHaveTextContent("My words");
    expect(rows()[0]).toHaveTextContent("Hidden by an admin");
  });

  it("the admin sees a hidden comment struck through, with Unhide; Hide on a visible one", async () => {
    const onHide = vi.fn();
    wrap(
      <FeedbackCommentThread
        now={NOW}
        isAdmin
        onHide={onHide}
        replies={[]}
        comments={[comment({ id: 1, hidden: true }), comment({ id: 2 })]}
      />,
    );
    const [hidden, visible] = rows();
    expect(within(hidden).getByText("Same here on the iPad.")).toHaveClass("line-through");
    fireEvent.click(within(hidden).getByRole("button", { name: "Unhide" }));
    expect(onHide).toHaveBeenLastCalledWith(expect.objectContaining({ id: 1 }), false);
    fireEvent.click(within(visible).getByRole("button", { name: "Hide" }));
    expect(onHide).toHaveBeenLastCalledWith(expect.objectContaining({ id: 2 }), true);
  });

  it("no Hide for anyone but the admin", () => {
    wrap(<FeedbackCommentThread now={NOW} isAdmin={false} onHide={vi.fn()} replies={[]} comments={[comment()]} />);
    expect(screen.queryByRole("button", { name: "Hide" })).toBeNull();
  });

  it("Delete is the writer's, behind a confirm", async () => {
    const onDelete = vi.fn();
    wrap(
      <FeedbackCommentThread
        now={NOW}
        isAdmin={false}
        onDelete={onDelete}
        replies={[]}
        comments={[comment({ id: 1, mine: true }), comment({ id: 2 })]}
      />,
    );
    expect(within(rows()[1]).queryByRole("button", { name: "Delete" })).toBeNull();
    fireEvent.click(within(rows()[0]).getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete this comment?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(within(rows()[0]).getByRole("button", { name: "Delete" }));
    const again = await screen.findByRole("alertdialog", { name: "Delete this comment?" });
    await act(async () => fireEvent.click(within(again).getByRole("button", { name: "Delete" })));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("the composer only with onComment, bounded at 4000, trimmed", async () => {
    const onComment = vi.fn(() => Promise.resolve());
    const { rerender } = render(<FeedbackCommentThread now={NOW} isAdmin={false} replies={[]} comments={[]} />);
    expect(screen.queryByRole("textbox")).toBeNull();
    rerender(<FeedbackCommentThread now={NOW} isAdmin={false} replies={[]} comments={[]} onComment={onComment} />);
    const box = screen.getByRole("textbox", { name: "Write a comment" });
    expect(box).toHaveAttribute("maxLength", "4000");
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(onComment).not.toHaveBeenCalled();
    fireEvent.change(box, { target: { value: "  Me too  " } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Comment" })));
    expect(onComment).toHaveBeenCalledWith("Me too");
  });

  it("renders without a ConfirmProvider when nothing can be deleted", () => {
    render(<FeedbackCommentThread now={NOW} isAdmin={false} replies={[]} comments={[comment()]} />);
    expect(rows()).toHaveLength(1);
  });
});
