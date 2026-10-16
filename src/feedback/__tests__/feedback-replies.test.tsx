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

/** 0.40 (§10.3): the author's rework entries among the replies. */
describe("FeedbackReplyTimeline — rework entries (0.40)", () => {
  const items = () => within(screen.getByRole("list", { name: "Replies" })).getAllByRole("listitem");

  it("draws a rework as the author's: their name, the Rework chip, the status it set, its file", () => {
    render(
      <FeedbackReplyTimeline
        replies={[
          reply({
            id: 5,
            kind: "rework",
            author_name: "Ada",
            body: "Still cut off.",
            status_from: "DONE",
            status_to: "OPEN",
            attachment_url: "/api/v1/feedback/attachments/0123456789ab.png",
          }),
        ]}
      />,
    );
    const [item] = items();
    expect(item).toHaveAttribute("data-feedback-entry-kind", "rework");
    expect(item).toHaveTextContent("Ada");
    expect(item.querySelector("[data-feedback-entry-rework]")).toHaveTextContent("Rework");
    expect(item.querySelector("[data-feedback-reply-status]")).toHaveAttribute("data-feedback-reply-status", "OPEN");
    expect(item.querySelector("[data-feedback-entry-file]")).toHaveTextContent("0123456789ab.png");
  });

  it("draws a migrated rework without the arrow, and a null author as A user — never Admin", () => {
    render(<FeedbackReplyTimeline replies={[reply({ id: 6, kind: "rework", author_name: null, body: "Old block." })]} />);
    const [item] = items();
    expect(item.querySelector("[data-feedback-reply-status]")).toBeNull();
    expect(item).not.toHaveTextContent("→");
    expect(item).toHaveTextContent("A user");
    expect(item).not.toHaveTextContent("Admin");
  });

  it("draws an admin's REWORK reply as a reply with the status", () => {
    render(<FeedbackReplyTimeline replies={[reply({ id: 7, author_name: null, status_from: "DONE", status_to: "REWORK" })]} />);
    const [item] = items();
    expect(item).not.toHaveAttribute("data-feedback-entry-kind");
    expect(item).toHaveTextContent("Admin");
    expect(item).toHaveTextContent("Rework requested");
    expect(item.querySelector("[data-feedback-entry-rework]")).toBeNull();
  });

  it("hands the file to renderAttachment when given", () => {
    render(
      <FeedbackReplyTimeline
        replies={[reply({ id: 8, kind: "rework", attachment_url: "/api/v1/feedback/attachments/a.pdf" })]}
        renderAttachment={(url) => <a href={url}>the file</a>}
      />,
    );
    expect(screen.getByRole("link", { name: "the file" })).toHaveAttribute("href", "/api/v1/feedback/attachments/a.pdf");
  });
});

describe("FeedbackReplyComposer", () => {
  it("offers No change first, then every status; No change sends no status", async () => {
    const onReply = vi.fn(() => Promise.resolve());
    render(<FeedbackReplyComposer status="OPEN" onReply={onReply} />);
    const pick = screen.getByRole("combobox", { name: "Status with the reply" });
    const options = within(pick).getAllByRole("option");
    expect(options[0]).toHaveTextContent("No change");
    // Nine statuses since 0.40: REWORK is how an admin sends a report back (§10.2 decision 6).
    expect(options).toHaveLength(10);
    expect(options.map((option) => option.getAttribute("value"))).toContain("REWORK");
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

  // keksdose live #417 (run 78 #2, Android, dark): the status pick was a 28 px `sm`
  // select beside the 38 px Reply. Marcel: the kit's standard Select at field height,
  // aligned with Reply — on phones too.
  it("the status pick is the standard Select at field height, one height with Reply", () => {
    const { container } = render(<FeedbackReplyComposer status="OPEN" onReply={vi.fn()} />);
    const pick = screen.getByRole("combobox", { name: "Status with the reply" });
    // The field's own height: FIELD_BASE's padding, not SELECT_SM's fixed 28 px box.
    expect(pick).toHaveClass("py-2", "text-sm");
    expect(pick).not.toHaveClass("h-7");
    expect(pick).not.toHaveClass("text-xs");
    // The action row stretches its two halves to one height and Reply fills it, so a
    // field that grows on a touch screen (16 px type) takes the button with it.
    const composer = container.querySelector("[data-feedback-reply-composer]")!;
    expect(composer).toHaveClass(
      "[&_[data-chat-composer-actions]]:items-stretch",
      "[&_[data-chat-composer-send]]:self-stretch",
      "pointer-coarse:[&_[data-chat-composer-hint]]:sr-only",
    );
    const row = composer.querySelector("[data-chat-composer-actions]")!;
    const reply = screen.getByRole("button", { name: "Reply" });
    expect(reply).toHaveAttribute("data-chat-composer-send");
    expect(row).toContainElement(pick);
    expect(row).toContainElement(reply);
    expect(row.querySelector("[data-chat-composer-hint]")).not.toBeNull();
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
