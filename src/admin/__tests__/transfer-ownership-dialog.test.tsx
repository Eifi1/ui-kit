import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TransferOwnershipDialog } from "../transfer-ownership-dialog";
import type { TransferCandidate } from "../transfer-ownership-dialog";

/**
 * §4.1, §9.6: the transfer is a typed confirm with a recipient — never a customer, a
 * deactivated account or the account itself; the app marks them, the kit says why.
 */

const FROM = { id: 1, email: "ada@example.com", first: "Ada", last: "Example" };
const CANDIDATES: TransferCandidate[] = [
  { id: 1, email: "ada@example.com", first: "Ada", last: "Example" },
  { id: 2, email: "ben@example.com", first: "Ben", last: "Sample" },
  { id: 3, email: "cy@example.com", first: "Cy", last: "Customer", unavailable: "customer" },
  { id: 4, email: "dee@example.com", first: "Dee", last: "Gone", unavailable: "deactivated" },
  { id: 5, email: "eve@example.com", unavailable: "in another team" },
];

describe("TransferOwnershipDialog", () => {
  it("shows every candidate, the unavailable ones with why", async () => {
    render(<TransferOwnershipDialog from={FROM} candidates={CANDIDATES} onTransfer={() => undefined} onClose={() => undefined} />);
    const dialog = await screen.findByRole("alertdialog", { name: "Hand on Ada Example’s work" });
    const select = within(dialog).getByRole("combobox", { name: "Hand it to" });
    const options = within(select)
      .getAllByRole("option")
      .map((o) => `${o.textContent}${(o as HTMLOptionElement).disabled ? " [x]" : ""}`);
    expect(options).toEqual([
      "Choose an account…",
      "Ada Example — ada@example.com (the same account) [x]",
      "Ben Sample — ben@example.com",
      "Cy Customer — cy@example.com (a customer) [x]",
      "Dee Gone — dee@example.com (deactivated) [x]",
      "eve@example.com (in another team) [x]",
    ]);
  });

  it("waits for a recipient and the typed address, then sends both", async () => {
    const user = userEvent.setup();
    const onTransfer = vi.fn(async () => undefined);
    const onClose = vi.fn();
    render(
      <TransferOwnershipDialog
        from={FROM}
        candidates={CANDIDATES}
        summary="3 sessions · 1 gear"
        onTransfer={onTransfer}
        onClose={onClose}
      />,
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("3 sessions · 1 gear");
    expect(within(dialog).getByRole("button", { name: "Hand it on" })).toHaveAccessibleDescription(
      "Choose who receives the work",
    );
    await user.selectOptions(within(dialog).getByRole("combobox", { name: "Hand it to" }), "2");
    expect(within(dialog).getByRole("button", { name: "Hand it on" })).toHaveAccessibleDescription(
      "Type “ada@example.com” to confirm",
    );
    await user.type(within(dialog).getByLabelText("Type “ada@example.com” to confirm"), "ada@example.com");
    await user.click(within(dialog).getByRole("button", { name: "Hand it on" }));
    expect(onTransfer).toHaveBeenCalledWith({ toUserId: 2, confirmEmail: "ada@example.com" });
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(true));
  });

  it("says so when nobody can receive it", async () => {
    render(
      <TransferOwnershipDialog
        from={FROM}
        candidates={CANDIDATES.filter((c) => c.id !== 2)}
        onTransfer={() => undefined}
        onClose={() => undefined}
      />,
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByRole("button", { name: "Hand it on" })).toHaveAccessibleDescription(
      "No other account can receive it.",
    );
  });
});
