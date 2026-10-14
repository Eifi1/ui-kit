import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedbackReplyComposer, FeedbackReplyTimeline, feedbackReplyNudge } from "../feedback-replies";
import type { FeedbackReply } from "../feedback-public-types";

/** §9.7 of docs/feedback-harmonization.md: the replies as a list, the composer, the nudge. */

const reply = (over: Partial<FeedbackReply> = {}): FeedbackReply => ({
  id: 1,
  author_name: "Marcel",
  body: "Looking into it.",
  status_to: null,
  created_at: "2026-10-04T09:00:00Z",
  ...over,
});

describe("FeedbackReplyTimeline", () => {
  it("lists the replies in the order given, a null author as Admin, the status set", () => {
    render(
      <FeedbackReplyTimeline
        replies={[
          reply({ id: 1, body: "First" }),
          reply({ id: 2, author_name: null, body: "Second", status_to: "DONE" }),
        ]}
        renderDate={(iso) => iso.slice(0, 10)}
      />,
    );
    const items = within(screen.getByRole("list", { name: "Replies" })).getAllByRole("listitem");
    expect(items.map((item) => item.querySelector("p")?.textContent)).toEqual(["First", "Second"]);
    expect(items[0]).toHaveTextContent("Marcel");
    expect(items[1]).toHaveTextContent("Admin");
    expect(items[1]).toHaveTextContent("Status changed to");
    expect(items[1].querySelector("[data-feedback-reply-status]")).toHaveAttribute("data-feedback-reply-status", "DONE");
  });

  it("says so when there is none", () => {
    render(<FeedbackReplyTimeline replies={[]} />);
    expect(screen.getByText("No reply yet")).toBeInTheDocument();
  });
});

describe("FeedbackReplyComposer", () => {
  it("offers No change first, then every status; No change sends no status", async () => {
    const onReply = vi.fn(() => Promise.resolve());
    render(<FeedbackReplyComposer status="OPEN" onReply={onReply} />);
    const pick = screen.getByRole("combobox", { name: "Status with the reply" });
    const options = within(pick).getAllByRole("option");
    expect(options[0]).toHaveTextContent("No change");
    expect(options).toHaveLength(9);
    fireEvent.change(screen.getByRole("textbox", { name: "Write a reply" }), { target: { value: "Thanks" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Reply" })));
    expect(onReply).toHaveBeenCalledWith("Thanks", undefined);
    expect(screen.getByRole("textbox", { name: "Write a reply" })).toHaveValue("");
  });

  it("sends the picked status and resets the pick after the reply landed", async () => {
    const onReply = vi.fn(() => Promise.resolve());
    render(<FeedbackReplyComposer status="OPEN" onReply={onReply} />);
    const pick = screen.getByRole("combobox", { name: "Status with the reply" });
    fireEvent.change(pick, { target: { value: "WONT_DO" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Write a reply" }), { target: { value: "Not planned" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Reply" })));
    expect(onReply).toHaveBeenCalledWith("Not planned", "WONT_DO");
    expect(pick).toHaveValue("");
  });

  it("keeps the draft and the pick when the reply fails", async () => {
    const onReply = vi.fn(() => Promise.reject(new Error("500")));
    render(<FeedbackReplyComposer status="OPEN" onReply={onReply} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Status with the reply" }), { target: { value: "DONE" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Write a reply" }), { target: { value: "Done" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Reply" })));
    expect(screen.getByRole("textbox", { name: "Write a reply" })).toHaveValue("Done");
    expect(screen.getByRole("combobox", { name: "Status with the reply" })).toHaveValue("DONE");
  });

  it("with suggestedStatus: the nudge line, and that status picked", () => {
    render(<FeedbackReplyComposer status="DONE" suggestedStatus="DONE" onReply={vi.fn()} />);
    expect(screen.getByText("The author has not been told. Add a reply.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Status with the reply" })).toHaveValue("DONE");
  });

  it("does not send a blank reply", () => {
    const onReply = vi.fn();
    render(<FeedbackReplyComposer status="OPEN" onReply={onReply} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Write a reply" }), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    expect(onReply).not.toHaveBeenCalled();
  });
});

describe("feedbackReplyNudge", () => {
  it("names a decided status no reply carries; nothing otherwise", () => {
    expect(feedbackReplyNudge({ status: "DONE", replies: [] })).toBe("DONE");
    expect(feedbackReplyNudge({ status: "POSTPONED", replies: [reply({ status_to: "DONE" })] })).toBe("POSTPONED");
    expect(feedbackReplyNudge({ status: "WONT_DO", replies: [reply({ status_to: "WONT_DO" })] })).toBeUndefined();
    expect(feedbackReplyNudge({ status: "IN_PROGRESS", replies: [] })).toBeUndefined();
    expect(feedbackReplyNudge({ status: "DONE" })).toBeUndefined();
  });
});
