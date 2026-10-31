import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PasskeysSetting } from "../passkeys-setting";
import type { PasskeyItem } from "../passkeys-setting";
import { WriteLockProvider } from "../../components/write-lock";

/**
 * The passkeys card's inline confirm was the one of three without `commit`: under a locked
 * `WriteLockProvider` (the demo) a passkey could be deleted, renamed or added (refactor
 * audit 2026-10-30, DUP-10). A lapsed plan's lock still lets the account manage how it
 * signs in.
 */

const KEYS: PasskeyItem<number>[] = [{ id: 1, name: "Laptop", createdAt: "2026-01-02", lastUsedAt: null }];

function card(kind: "demo" | "billing") {
  const props = { onAdd: vi.fn(), onRename: vi.fn(), onDelete: vi.fn() };
  render(
    <WriteLockProvider locked kind={kind} reason="Not in the demo.">
      <PasskeysSetting passkeys={KEYS} {...props} />
    </WriteLockProvider>,
  );
  return props;
}

describe("PasskeysSetting under a write lock", () => {
  it("the demo's lock holds Add, Rename and Delete, and the name field's Enter", () => {
    const props = card("demo");
    for (const name of [/Add passkey/, "Rename Laptop", "Delete Laptop"]) {
      const button = screen.getByRole("button", { name });
      expect(button).toHaveAttribute("aria-disabled", "true");
      fireEvent.click(button);
    }
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "New name for Laptop" })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("textbox", { name: /Name/ }), { key: "Enter" });
    expect(props.onAdd).not.toHaveBeenCalled();
    expect(props.onDelete).not.toHaveBeenCalled();
    expect(props.onRename).not.toHaveBeenCalled();
  });

  it("a lapsed plan's lock does not: deleting still asks and goes", () => {
    const props = card("billing");
    fireEvent.click(screen.getByRole("button", { name: "Delete Laptop" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete passkey" }));
    expect(props.onDelete).toHaveBeenCalledWith(1);
  });
});
