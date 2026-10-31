import { fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { InlineConfirm } from "../inline-confirm";
import { WriteLockProvider } from "../write-lock";
import { COMMIT_EXCEPT_BILLING } from "../write-lock";

/** One "confirm in place" for passkeys, push devices and the inbox (refactor audit 2026-10-30, DUP-10). */

function Row({ onConfirm = vi.fn(), busy = false }: { onConfirm?: () => void; busy?: boolean }) {
  const [asking, setAsking] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return asking ? (
    <InlineConfirm
      prompt="Remove this device?"
      confirmLabel="Remove"
      confirmName="Remove Chrome"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onLeave={() => setAsking(false)}
      busy={busy}
      commit={COMMIT_EXCEPT_BILLING}
      returnFocusRef={trigger}
      data-row=""
    />
  ) : (
    <button ref={trigger} type="button" onClick={() => setAsking(true)}>
      Remove…
    </button>
  );
}

describe("InlineConfirm", () => {
  it("asks with an alert and puts focus on Cancel, so the Enter that opened it cannot answer it", () => {
    render(<Row />);
    fireEvent.click(screen.getByRole("button", { name: "Remove…" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Remove this device?");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(document.querySelector("[data-row]")).not.toBeNull();
  });

  it("Cancel, or Escape on either button, leaves and gives focus back to the trigger", () => {
    render(<Row />);
    fireEvent.click(screen.getByRole("button", { name: "Remove…" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Remove…" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Remove…" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "Remove Chrome" }), { key: "Escape" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove…" })).toHaveFocus();
  });

  it("the action confirms, is pending while busy, and is held by a lock in its scope", () => {
    const onConfirm = vi.fn();
    const { unmount } = render(<Row onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove…" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Chrome" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    unmount();

    render(
      <WriteLockProvider locked kind="demo">
        <Row onConfirm={onConfirm} />
      </WriteLockProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove…" }));
    const action = screen.getByRole("button", { name: "Remove Chrome" });
    expect(action).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(action);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("busy: the action is pending", () => {
    render(<Row busy />);
    fireEvent.click(screen.getByRole("button", { name: "Remove…" }));
    expect(screen.getByRole("button", { name: "Remove Chrome" })).toHaveAttribute("aria-busy", "true");
  });
});
