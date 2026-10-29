import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WriteLockProvider } from "../../components/write-lock";
import { ChatComposer } from "../feedback-thread";

/**
 * kastlan's 0.33 report (ka 3): its assistant read `useWriteLock({ except: ["demo"] })`
 * and fed the composer's `canSend` and a reason by hand, because the composer had no
 * `commit` like the kit's other commit controls. Now it has: under a lock in scope Send
 * is locked the focusable way, the keyboard sends nothing, and the box keeps the draft.
 */

const send = () => screen.getByRole("button", { name: "Send" });

function type(text: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: text } });
}

describe("ChatComposer `commit` (0.33.1)", () => {
  it("locks Send under a lock — focusable, described, refusing the click and both keys", () => {
    const onSend = vi.fn();
    render(
      <WriteLockProvider locked reason="Read-only demo">
        <ChatComposer onSend={onSend} sendOn="enter" commit />
      </WriteLockProvider>,
    );
    type("How much did I spend?");
    // The box stays editable: the draft is the reader's, nothing in it is saved yet.
    expect(screen.getByRole("textbox")).toHaveValue("How much did I spend?");
    expect(screen.getByRole("textbox")).not.toHaveAttribute("readonly");

    expect(send()).toHaveAttribute("aria-disabled", "true");
    expect(send()).not.toBeDisabled();
    expect(send()).toHaveAccessibleDescription("Read-only demo");
    fireEvent.click(send());
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", ctrlKey: true });
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toHaveValue("How much did I spend?");
  });

  it("keeps the box, unlike `disabledReason`, which replaces it", () => {
    render(
      <WriteLockProvider locked reason="Read-only demo">
        <ChatComposer onSend={() => {}} commit />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(send()).toBeInTheDocument();
  });

  it("sends once the lock lifts, with the draft that waited", () => {
    const onSend = vi.fn();
    const { rerender } = render(
      <WriteLockProvider locked reason="Read-only demo">
        <ChatComposer onSend={onSend} sendOn="enter" commit />
      </WriteLockProvider>,
    );
    type("Still here");
    rerender(
      <WriteLockProvider locked={false}>
        <ChatComposer onSend={onSend} sendOn="enter" commit />
      </WriteLockProvider>,
    );
    expect(send()).not.toHaveAttribute("aria-disabled");
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("Still here", null);
  });

  it('follows its scope: `{ except: ["demo"] }` sends under the demo, not under billing', () => {
    const onSend = vi.fn();
    const { rerender } = render(
      <WriteLockProvider locked kind="demo" reason="Read-only demo">
        <ChatComposer onSend={onSend} commit={{ except: ["demo"] }} />
      </WriteLockProvider>,
    );
    type("What is due this month?");
    fireEvent.click(send());
    expect(onSend).toHaveBeenCalledTimes(1);

    rerender(
      <WriteLockProvider locked kind="billing" reason="Your plan has ended.">
        <ChatComposer onSend={onSend} commit={{ except: ["demo"] }} />
      </WriteLockProvider>,
    );
    expect(send()).toHaveAttribute("aria-disabled", "true");
    expect(send()).toHaveAccessibleDescription("Your plan has ended.");
    fireEvent.click(send());
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("without `commit` a lock does not reach it, and without a provider `commit` changes nothing", () => {
    const onSend = vi.fn();
    const { unmount } = render(
      <WriteLockProvider locked reason="Read-only demo">
        <ChatComposer onSend={onSend} />
      </WriteLockProvider>,
    );
    type("A note");
    fireEvent.click(send());
    expect(onSend).toHaveBeenCalledTimes(1);
    unmount();

    render(<ChatComposer onSend={onSend} commit />);
    type("Another");
    expect(send()).not.toHaveAttribute("aria-disabled");
    fireEvent.click(send());
    expect(onSend).toHaveBeenCalledTimes(2);
  });
});
