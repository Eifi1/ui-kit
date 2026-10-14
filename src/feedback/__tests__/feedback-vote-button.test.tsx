import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedbackVoteButton } from "../feedback-vote-button";
import type { FeedbackVoteState } from "../feedback-public-types";

/** §9.6 of docs/feedback-harmonization.md: the upvote, optimistic with rollback. */

function deferred() {
  let resolve!: (value: FeedbackVoteState) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<FeedbackVoteState>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const button = () => screen.getByRole("button", { name: /I want this too/ });

describe("FeedbackVoteButton", () => {
  it("is a toggle: aria-pressed follows `voted`, the count is shown", () => {
    const { rerender } = render(<FeedbackVoteButton votes={3} voted={false} onVote={vi.fn()} />);
    expect(button()).toHaveAttribute("aria-pressed", "false");
    expect(button()).toHaveTextContent("3");
    rerender(<FeedbackVoteButton votes={4} voted onVote={vi.fn()} />);
    expect(button()).toHaveAttribute("aria-pressed", "true");
    expect(button()).toHaveTextContent("4");
  });

  it("shows the press at once and takes the server's answer", async () => {
    const answer = deferred();
    const onVote = vi.fn(() => answer.promise);
    render(<FeedbackVoteButton votes={3} voted={false} onVote={onVote} />);
    fireEvent.click(button());
    expect(onVote).toHaveBeenCalledWith(true);
    expect(button()).toHaveAttribute("aria-pressed", "true");
    expect(button()).toHaveTextContent("4");
    // A second press while the first is in flight sends nothing.
    fireEvent.click(button());
    expect(onVote).toHaveBeenCalledTimes(1);
    await act(async () => answer.resolve({ votes: 7, voted: true }));
    expect(button()).toHaveTextContent("7");
  });

  it("rolls back when the vote fails", async () => {
    const answer = deferred();
    render(<FeedbackVoteButton votes={4} voted onVote={() => answer.promise} />);
    fireEvent.click(button());
    expect(button()).toHaveAttribute("aria-pressed", "false");
    expect(button()).toHaveTextContent("3");
    await act(async () => answer.reject(new Error("429")));
    expect(button()).toHaveAttribute("aria-pressed", "true");
    expect(button()).toHaveTextContent("4");
  });

  it("on one's own report: pressed, disabled with the reason, never sends", () => {
    const onVote = vi.fn();
    render(<FeedbackVoteButton votes={1} voted own onVote={onVote} />);
    expect(button()).toHaveAttribute("aria-pressed", "true");
    expect(button()).toHaveAttribute("aria-disabled", "true");
    expect(button()).toHaveAccessibleDescription("Your report");
    fireEvent.click(button());
    expect(onVote).not.toHaveBeenCalled();
  });

  it("a new count from the app wins over the last answer", async () => {
    const onVote = vi.fn(() => Promise.resolve({ votes: 4, voted: true }));
    const { rerender } = render(<FeedbackVoteButton votes={3} voted={false} onVote={onVote} />);
    await act(async () => fireEvent.click(button()));
    expect(button()).toHaveTextContent("4");
    rerender(<FeedbackVoteButton votes={9} voted={false} onVote={onVote} />);
    expect(button()).toHaveTextContent("9");
    expect(button()).toHaveAttribute("aria-pressed", "false");
  });

  it("size sm keeps the name for assistive tech", () => {
    render(<FeedbackVoteButton votes={2} voted={false} onVote={vi.fn()} size="sm" />);
    expect(button()).toHaveAccessibleName(/I want this too/);
  });
});
