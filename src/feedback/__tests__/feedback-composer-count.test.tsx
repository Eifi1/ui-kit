import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { ChatComposer, FeedbackComposer } from "../feedback-thread";
import type { FeedbackComposerHandle } from "../feedback-thread";

/**
 * keksdose G6 (0.23.0): the support reply box is capped at the server's 4,000 and
 * should count against it like the app's other text fields (Textarea `maxLength` +
 * `showCount`, 0.22) — the same counter, not a copy, and without breaking `size="sm"`
 * or the send hint kept as the box's description there.
 */

const box = () => screen.getByRole("textbox", { name: "Write a comment" }) as HTMLTextAreaElement;
const send = () => screen.getByRole("button", { name: /Send/ });
const descriptions = (el: HTMLElement) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);

describe("FeedbackComposer maxLength / showCount", () => {
  it("caps the box and counts under it, the count in the box's description", () => {
    render(<FeedbackComposer onSend={vi.fn()} maxLength={80} showCount />);
    expect(box()).toHaveAttribute("maxlength", "80");
    expect(screen.getByText("0/80")).toHaveAttribute("aria-hidden", "true");
    fireEvent.change(box(), { target: { value: "Hello" } });
    expect(screen.getByText("5/80")).toBeInTheDocument();
    expect(descriptions(box())).toEqual(["5 of 80 characters"]);
  });

  it("sm: the hidden send hint stays the description, the count after it", () => {
    render(<FeedbackComposer onSend={vi.fn()} sendOn="enter" size="sm" maxLength={80} showCount />);
    expect(screen.getByText("Enter to send, Shift + Enter for a new line")).toHaveClass("sr-only");
    expect(descriptions(box())).toEqual(["Enter to send, Shift + Enter for a new line", "0 of 80 characters"]);
    expect(screen.getByText("0/80")).toBeInTheDocument();
  });

  it("speaks only on entering the last stretch and at the limit — Textarea's live region", () => {
    render(<FeedbackComposer onSend={vi.fn()} maxLength={20} showCount />);
    const live = screen.getByRole("status");
    fireEvent.change(box(), { target: { value: "a".repeat(5) } });
    expect(live).toBeEmptyDOMElement();
    fireEvent.change(box(), { target: { value: "a".repeat(18) } });
    expect(live).toHaveTextContent("2 characters left");
  });

  it("maxLength alone caps without a counter; neither keeps the DOM it had", () => {
    const { container, rerender } = render(<FeedbackComposer onSend={vi.fn()} maxLength={80} />);
    expect(box()).toHaveAttribute("maxlength", "80");
    expect(screen.queryByText("0/80")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    // The textarea is still the root's own child — no field wrapper appeared.
    expect(box().parentElement).toBe(container.firstElementChild);
    rerender(<FeedbackComposer onSend={vi.fn()} />);
    expect(box()).not.toHaveAttribute("maxlength");
    expect(box().parentElement).toBe(container.firstElementChild);
  });

  it("showCount without maxLength is ignored, as on Textarea", () => {
    render(<FeedbackComposer onSend={vi.fn()} showCount />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(box()).not.toHaveAttribute("aria-describedby");
  });

  it("a canned reply that runs past the limit is kept whole, and holds Send back until trimmed", () => {
    const ref = createRef<FeedbackComposerHandle>();
    const onSend = vi.fn();
    render(<FeedbackComposer ref={ref} onSend={onSend} maxLength={10} showCount canSend />);
    act(() => ref.current!.insertText("Thanks, fixed in the next release"));
    expect(box()).toHaveValue("Thanks, fixed in the next release");
    expect(screen.getByText("33/10")).toHaveClass("text-[var(--danger)]");
    // Over the limit wins over `canSend`, as `pending` does.
    expect(send()).toBeDisabled();
    fireEvent.keyDown(box(), { key: "Enter", ctrlKey: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.change(box(), { target: { value: "Thanks!" } });
    expect(send()).toBeEnabled();
    fireEvent.click(send());
    expect(onSend).toHaveBeenCalledWith("Thanks!", null);
  });

  it("reads the counter's words from `characterCount` and from `countLabels`", () => {
    const { unmount } = render(
      <UiKitProvider labels={{ characterCount: { count: (used, max) => `${used} von ${max} Zeichen` } }}>
        <FeedbackComposer onSend={vi.fn()} maxLength={80} showCount />
      </UiKitProvider>,
    );
    expect(descriptions(box())).toEqual(["0 von 80 Zeichen"]);
    unmount();
    render(<ChatComposer onSend={vi.fn()} maxLength={80} showCount countLabels={{ count: (u, m) => `${u}|${m}` }} />);
    expect(descriptions(box())).toEqual(["0|80"]);
  });
});
