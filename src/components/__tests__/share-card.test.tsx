import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmProvider } from "../confirm-dialog";
import { ShareCard, ShareDialog } from "../share-card";
import { WriteLockProvider } from "../write-lock";
import type { ShareCandidate, ShareCardProps, ShareGrantee, ShareRole } from "../share-card";

/**
 * Kurvenschmiede's share dialog and keksdose's budget share card on one component.
 * What has to hold is the contract with the app: the kit asks before every removal,
 * checks only an address's SHAPE, hands every decision to a callback, and keeps the
 * field when that callback refuses.
 */

const ROLES: ShareRole[] = [
  { key: "viewer", label: "Viewer" },
  { key: "editor", label: "Editor", description: "Can change it." },
];

const ANNA: ShareGrantee = { id: 1, name: "Anna", email: "anna@example.com", role: "viewer" };

const CANDIDATES: ShareCandidate[] = [
  { id: "t1", name: "Chassis team", kind: "team" },
  { id: "u2", name: "Jonas Weber", email: "jonas@example.com" },
];

function setup(props: Partial<ShareCardProps> = {}) {
  return render(
    <ConfirmProvider>
      <ShareCard grantees={[ANNA]} roles={ROLES} {...props} />
    </ConfirmProvider>,
  );
}

const field = () => screen.getByRole("combobox", { name: "Email address" });

describe("ShareCard", () => {
  it("lists grantees with a role choice and reports a change", async () => {
    const onRoleChange = vi.fn();
    setup({ onRoleChange });
    const group = screen.getByRole("radiogroup", { name: "Role of Anna" });
    fireEvent.click(within(group).getByRole("radio", { name: "Editor" }));
    await waitFor(() => expect(onRoleChange).toHaveBeenCalledWith(ANNA, "editor"));
  });

  it("shows a role chip instead of a choice when there is nothing to choose", () => {
    const { container } = setup({
      roles: [{ key: "guest", label: "Guest", tone: "warning" }],
      grantees: [{ ...ANNA, role: "guest" }],
      onRoleChange: vi.fn(),
    });
    expect(screen.queryByRole("radiogroup")).toBeNull();
    // Drawn by the roster's RoleChip, so a role looks the same on both screens.
    const chip = container.querySelector('[data-role="guest"]');
    expect(chip?.textContent).toBe("Guest");
  });

  it("asks before removing, and only a yes calls onRemove", async () => {
    const onRemove = vi.fn();
    setup({ onRemove });
    fireEvent.click(screen.getByRole("button", { name: "Remove access" }));
    let dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Remove access for Anna?")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onRemove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Remove access" }));
    dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove access" }));
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith(ANNA));
  });

  it("refuses an address that is not shaped like one, without asking the app", () => {
    const onAdd = vi.fn();
    setup({ onAdd });
    fireEvent.change(field(), { target: { value: "not-an-address" } });
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a complete email address.")).toBeTruthy();
    expect(field().getAttribute("aria-invalid")).toBe("true");
  });

  it("adds an address with the chosen role and clears the field once it resolves", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    setup({ onAdd });
    fireEvent.click(screen.getByRole("radio", { name: "Editor" }));
    expect(screen.getByText("Can change it.")).toBeTruthy();
    fireEvent.change(field(), { target: { value: " new@example.com " } });
    fireEvent.keyDown(field(), { key: "Enter" });
    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith({ email: "new@example.com", candidate: null, role: "editor" }),
    );
    await waitFor(() => expect((field() as HTMLInputElement).value).toBe(""));
  });

  it("keeps the field and shows the error when the app rejects", async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error("nope"));
    setup({ onAdd, formatError: (e) => `Refused: ${(e as Error).message}` });
    fireEvent.change(field(), { target: { value: "fail@example.com" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Share" }));
    });
    expect(await screen.findByText("Refused: nope")).toBeTruthy();
    expect((field() as HTMLInputElement).value).toBe("fail@example.com");
  });

  it("grants a taken team as a candidate, and a taken person by address", async () => {
    const onAdd = vi.fn();
    setup({ onAdd, candidates: CANDIDATES });
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "team" } });
    fireEvent.click(await screen.findByRole("option", { name: /Chassis team/ }));
    expect((field() as HTMLInputElement).value).toBe("Chassis team");
    expect(screen.getByText("Everyone in Chassis team gets access.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() =>
      expect(onAdd).toHaveBeenLastCalledWith({ email: null, candidate: CANDIDATES[0], role: "viewer" }),
    );

    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "jonas" } });
    fireEvent.click(await screen.findByRole("option", { name: /Jonas Weber/ }));
    expect((field() as HTMLInputElement).value).toBe("jonas@example.com");
  });

  it("opens no 'No results' list for an address that matches no candidate", () => {
    setup({ onAdd: vi.fn(), candidates: CANDIDATES });
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "someone.new@example.com" } });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByText("No results")).toBeNull();
  });

  it("lists pending grants with their link, and withdraws one after a yes", async () => {
    const onRevokePending = vi.fn();
    setup({
      onRevokePending,
      pending: [
        { id: 7, email: "later@example.com", role: "editor", link: "https://x/7" },
        { id: 8, email: null, link: "https://x/8" },
      ],
    });
    expect(screen.getAllByText("Pending")).toHaveLength(2);
    expect(screen.getByText("Open invite link")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Copy link" })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Withdraw invitation" })[0]);
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Withdraw the invitation for later@example.com?")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Withdraw invitation" }));
    await waitFor(() => expect(onRevokePending).toHaveBeenCalledWith(expect.objectContaining({ id: 7 })));
  });

  it("lets an empty field through under addWithoutEmail (an open invite)", async () => {
    const onAdd = vi.fn();
    setup({ onAdd, addWithoutEmail: true });
    expect(screen.getByRole("combobox", { name: "Email address (optional)" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith({ email: null, candidate: null, role: "viewer" }));
  });

  it("is read-only on request: no form, no controls, a chip per role", () => {
    setup({ readOnly: true, onAdd: vi.fn(), onRemove: vi.fn(), onRoleChange: vi.fn() });
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove access" })).toBeNull();
    expect(screen.getByText("Viewer")).toBeTruthy();
  });

  it("leaves a locked row alone", () => {
    setup({ grantees: [{ ...ANNA, locked: true }], onRemove: vi.fn(), onRoleChange: vi.fn() });
    expect(screen.queryByRole("button", { name: "Remove access" })).toBeNull();
    expect(screen.queryByRole("radiogroup", { name: "Role of Anna" })).toBeNull();
  });

  it("says so when nobody has access, in the caller's words", () => {
    setup({ grantees: [], labels: { nobodyYet: "Noch niemand." } });
    expect(screen.getByText("Noch niemand.")).toBeTruthy();
  });
});

describe("ShareCard under a write lock", () => {
  function locked(props: Partial<ShareCardProps> = {}) {
    return render(
      <ConfirmProvider>
        <WriteLockProvider locked reason="Shared with you to read">
          <ShareCard grantees={[ANNA]} roles={ROLES} {...props} />
        </WriteLockProvider>
      </ConfirmProvider>,
    );
  }

  it("locks every commit and says why, but leaves the fields editable", () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    const onRoleChange = vi.fn();
    const onRevokePending = vi.fn();
    locked({ onAdd, onRemove, onRoleChange, onRevokePending, pending: [{ id: 7, email: "later@example.com" }] });

    // The field and the new grant's role are not commits: they stay live.
    expect((field() as HTMLInputElement).disabled).toBe(false);
    fireEvent.change(field(), { target: { value: "new@example.com" } });
    expect((field() as HTMLInputElement).value).toBe("new@example.com");
    expect(screen.getByRole("radiogroup", { name: "Role" }).querySelector("button:disabled")).toBeNull();

    const share = screen.getByRole("button", { name: "Share" });
    expect(share.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(share);
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(onAdd).not.toHaveBeenCalled();

    const remove = screen.getByRole("button", { name: "Remove access" });
    const withdraw = screen.getByRole("button", { name: "Withdraw invitation" });
    for (const button of [remove, withdraw]) {
      expect(button.getAttribute("aria-disabled")).toBe("true");
      fireEvent.click(button);
    }
    expect(screen.queryByRole("alertdialog")).toBeNull();

    const roleOfAnna = screen.getByRole("radiogroup", { name: "Role of Anna" });
    for (const radio of within(roleOfAnna).getAllByRole("radio")) expect((radio as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(roleOfAnna).getByRole("radio", { name: "Editor" }));
    expect(onRoleChange).not.toHaveBeenCalled();

    // The reason is the lock's, on the commit controls.
    expect(screen.getAllByText("Shared with you to read").length).toBeGreaterThan(0);
  });

  it("an inner unlocked provider reopens the card", async () => {
    const onAdd = vi.fn();
    render(
      <ConfirmProvider>
        <WriteLockProvider locked>
          <WriteLockProvider locked={false}>
            <ShareCard grantees={[]} roles={ROLES} onAdd={onAdd} />
          </WriteLockProvider>
        </WriteLockProvider>
      </ConfirmProvider>,
    );
    fireEvent.change(field(), { target: { value: "new@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => expect(onAdd).toHaveBeenCalled());
  });
});

describe("ShareDialog", () => {
  it("frames the same panel with a title, a description and Close", () => {
    const onClose = vi.fn();
    render(
      <ConfirmProvider>
        <ShareDialog open onClose={onClose} description="Front wing" grantees={[ANNA]} roles={ROLES} />
      </ConfirmProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: "Share" });
    expect(within(dialog).getByText("Front wing")).toBeTruthy();
    expect(within(dialog).getByText("Anna")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Close" })).toBeTruthy();
  });
});
