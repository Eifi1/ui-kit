import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChatComposer, FeedbackComposer, type ChatComposerProps } from "../feedback-thread";

/**
 * keksdose K17: the assistant's tour points at its chat box with
 * `[data-tour="assistant-ask"]`, so the composer has to carry `data-*` and `id` on its
 * root; and a chat should not have to import something called "Feedback".
 */

describe("ChatComposer root attributes (keksdose K17)", () => {
  it("puts id and data-* on its root", () => {
    const { container } = render(
      <ChatComposer onSend={() => {}} id="ask" data-tour="assistant-ask" data-testid="composer" />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("id", "ask");
    expect(root).toHaveAttribute("data-tour", "assistant-ask");
    expect(root).toHaveAttribute("data-testid", "composer");
    expect(root).toContainElement(screen.getByRole("textbox"));
    expect(document.querySelector('[data-tour="assistant-ask"]')).toBe(root);
  });

  it("keeps them on the line that replaces the box when the thread is closed", () => {
    render(<ChatComposer onSend={() => {}} disabledReason="Closed." data-tour="assistant-ask" id="ask" />);
    const line = screen.getByText("Closed.");
    expect(line).toHaveAttribute("data-tour", "assistant-ask");
    expect(line).toHaveAttribute("id", "ask");
  });

  // DUP-11 (refactor audit 2026-10): its own `!= null && !== false` took `""` — what a
  // `closed && reason` gives with an empty reason — for a reason, and replaced the box
  // with an empty line. The kit's one presence rule: `""` says nothing.
  it("keeps the box for an empty reason, as every other `disabledReason` does", () => {
    for (const nothing of ["", null, false, undefined]) {
      const { unmount } = render(<ChatComposer onSend={() => {}} disabledReason={nothing} />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
      unmount();
    }
  });

  it("passes on data-* only, nothing else a caller spreads in", () => {
    const props = { onSend: () => {}, "data-x": "1", onClick: vi.fn() } as unknown as ChatComposerProps;
    const { container } = render(<ChatComposer {...props} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("data-x", "1");
    fireEvent.click(root);
    expect((props as unknown as { onClick: () => void }).onClick).not.toHaveBeenCalled();
  });
});

describe("ChatComposer", () => {
  it("is the same function as FeedbackComposer, its old name (deprecated 0.34, removed in 0.35)", () => {
    expect(FeedbackComposer).toBe(ChatComposer);
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} sendOn="enter" data-tour="assistant-ask" />);
    const box = screen.getByRole("textbox");
    fireEvent.change(box, { target: { value: "How much did I spend?" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("How much did I spend?", null);
  });
});
