import { createRef, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedbackComposer } from "../feedback-thread";
import type { FeedbackComposerHandle } from "../feedback-thread";

/**
 * keksdose F9: canned-reply chips above the support composer drop their text in at the
 * caret (`ref.insertText`), a host can own the draft (`value` / `onValueChange`), and
 * the box's hint can be the caller's (`placeholder`) — without losing "a resolved send
 * clears only what was sent".
 */
const box = () => screen.getByRole("textbox", { name: "Write a comment" }) as HTMLTextAreaElement;

describe("FeedbackComposer insertText", () => {
  it("inserts at the caret, replacing the selection, and leaves the caret after it, focused", () => {
    const ref = createRef<FeedbackComposerHandle>();
    render(<FeedbackComposer ref={ref} onSend={vi.fn()} />);
    fireEvent.change(box(), { target: { value: "Hello , bye" } });
    box().setSelectionRange(6, 6);
    act(() => ref.current!.insertText("Anna"));
    expect(box()).toHaveValue("Hello Anna, bye");
    expect(box()).toHaveFocus();
    expect(box().selectionStart).toBe(10);

    box().setSelectionRange(12, 15); // "bye"
    act(() => ref.current!.insertText("thanks"));
    expect(box()).toHaveValue("Hello Anna, thanks");
    expect(box().selectionStart).toBe(18);
  });

  it("two inserts in one tick land in order", () => {
    const ref = createRef<FeedbackComposerHandle>();
    render(<FeedbackComposer ref={ref} onSend={vi.fn()} />);
    box().setSelectionRange(0, 0);
    act(() => {
      ref.current!.insertText("a");
      ref.current!.insertText("b");
    });
    expect(box()).toHaveValue("ab");
  });

  it("is a no-op while disabledReason replaces the box", () => {
    const ref = createRef<FeedbackComposerHandle>();
    render(<FeedbackComposer ref={ref} onSend={vi.fn()} disabledReason="Closed." />);
    expect(() => act(() => ref.current!.insertText("x"))).not.toThrow();
  });
});

describe("FeedbackComposer controlled draft", () => {
  function Host({ onSend, onValue }: { onSend: (b: string) => Promise<void>; onValue?: (v: string) => void }) {
    const [value, setValue] = useState("Draft");
    return (
      <FeedbackComposer
        onSend={onSend}
        value={value}
        onValueChange={(v) => {
          onValue?.(v);
          setValue(v);
        }}
      />
    );
  }

  it("shows the host's value and reports every change", () => {
    const onValue = vi.fn();
    render(<Host onSend={() => Promise.resolve()} onValue={onValue} />);
    expect(box()).toHaveValue("Draft");
    fireEvent.change(box(), { target: { value: "Draft 2" } });
    expect(onValue).toHaveBeenLastCalledWith("Draft 2");
    expect(box()).toHaveValue("Draft 2");
  });

  it("clears through onValueChange when the send resolves, only if nothing was typed since", async () => {
    let resolve!: () => void;
    const onSend = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<Host onSend={onSend} />);
    fireEvent.keyDown(box(), { key: "Enter", ctrlKey: true });
    expect(onSend).toHaveBeenCalledWith("Draft", null);
    await act(async () => resolve());
    expect(box()).toHaveValue("");

    fireEvent.change(box(), { target: { value: "one" } });
    fireEvent.keyDown(box(), { key: "Enter", ctrlKey: true });
    fireEvent.change(box(), { target: { value: "one and two" } });
    await act(async () => resolve());
    expect(box()).toHaveValue("one and two");
  });

  it("inserts into a controlled draft too", () => {
    const ref = createRef<FeedbackComposerHandle>();
    function Controlled() {
      const [value, setValue] = useState("Hi ");
      return <FeedbackComposer ref={ref} onSend={vi.fn()} value={value} onValueChange={setValue} />;
    }
    render(<Controlled />);
    box().setSelectionRange(3, 3);
    act(() => ref.current!.insertText("there"));
    expect(box()).toHaveValue("Hi there");
  });
});

describe("FeedbackComposer placeholder", () => {
  it("takes the caller's hint over the label default", () => {
    const { rerender } = render(<FeedbackComposer onSend={vi.fn()} />);
    expect(box()).toHaveAttribute("placeholder", "Write a comment…");
    rerender(<FeedbackComposer onSend={vi.fn()} placeholder="Reply to Anna…" />);
    expect(box()).toHaveAttribute("placeholder", "Reply to Anna…");
  });
});
