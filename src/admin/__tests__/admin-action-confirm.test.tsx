import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AdminActionConfirm } from "../admin-action-confirm";
import type { AdminActionConfirmProps } from "../admin-action-confirm";

/**
 * §4.2: the server states the level — none, acknowledge, type_email — and the dialog asks
 * for exactly that; §4.1/§9.6: the coded refusals stay in the dialog.
 */

const ADA = { email: "ada@example.com", first: "Ada", last: "Example" };

/** What axios throws for `409 {code}`. */
const refusal = (code: string) =>
  Object.assign(new Error("Request failed with status code 409"), { response: { status: 409, data: { code } } });

function Harness(props: Partial<AdminActionConfirmProps> & Pick<AdminActionConfirmProps, "level" | "onConfirm">) {
  const [open, setOpen] = useState(true);
  const [log, setLog] = useState<string[]>([]);
  return (
    <>
      <output data-testid="log">{log.join(",")}</output>
      {open && (
        <AdminActionConfirm
          target={ADA}
          confirmLabel="Deactivate"
          title="Deactivate Ada Example?"
          consequence="They are signed out everywhere at once."
          {...props}
          onClose={(done) => {
            setOpen(false);
            setLog((l) => [...l, `closed:${done}`]);
          }}
        />
      )}
    </>
  );
}

const log = () => screen.getByTestId("log");

describe("AdminActionConfirm", () => {
  it("none: draws nothing, confirms once, and closes when it lands", async () => {
    const onConfirm = vi.fn(async () => undefined);
    render(<Harness level="none" onConfirm={onConfirm} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(log()).toHaveTextContent("closed:true"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({});
  });

  it("none: a refusal opens a dialog of its own to say it", async () => {
    const user = userEvent.setup();
    render(<Harness level="none" onConfirm={async () => Promise.reject(refusal("self_action"))} />);
    const dialog = await screen.findByRole("alertdialog", { name: "Deactivate Ada Example?" });
    expect(dialog).toHaveTextContent("You can’t do this to your own account.");
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(log()).toHaveTextContent("closed:false"));
  });

  it("acknowledge: the tick holds the confirm, and says so", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => undefined);
    render(<Harness level="acknowledge" confirmLabel="Require" title="Require a new password?" onConfirm={onConfirm} />);
    const dialog = await screen.findByRole("alertdialog", { name: "Require a new password?" });
    expect(dialog).toHaveAccessibleDescription(/Ada Example · ada@example\.com/);
    expect(dialog).toHaveTextContent("They are signed out everywhere at once.");
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
    const confirm = within(dialog).getByRole("button", { name: "Require" });
    expect(confirm).toHaveAttribute("aria-disabled", "true");
    expect(confirm).toHaveAccessibleDescription("Tick the box to confirm");
    await user.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("checkbox", { name: "I have read what this does and want to continue." }));
    // Queried again: a held button sits in its reason's tooltip, a free one does not.
    await user.click(within(dialog).getByRole("button", { name: "Require" }));
    expect(onConfirm).toHaveBeenCalledWith({ acknowledged: true });
    await waitFor(() => expect(log()).toHaveTextContent("closed:true"));
  });

  it("type_email: the target's address, caseless, and the typed text goes to the server", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => undefined);
    render(<Harness level="type_email" onConfirm={onConfirm} />);
    const dialog = await screen.findByRole("alertdialog", { name: "Deactivate Ada Example?" });
    expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument();
    const field = within(dialog).getByLabelText("Type “ada@example.com” to confirm");
    await waitFor(() => expect(field).toHaveFocus());
    const confirm = within(dialog).getByRole("button", { name: "Deactivate" });
    await user.type(field, "ada@example.org");
    expect(confirm).toHaveAccessibleDescription("Type “ada@example.com” to confirm");
    await user.clear(field);
    await user.type(field, " ADA@example.com ");
    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    expect(onConfirm).toHaveBeenCalledWith({ confirmEmail: "ADA@example.com", acknowledged: true });
    await waitFor(() => expect(log()).toHaveTextContent("closed:true"));
  });

  it.each([
    ["last_admin", "This is the last active administrator. Make someone else an administrator first."],
    ["self_action", "You can’t do this to your own account."],
    ["confirmation_mismatch", "The address doesn’t match this account. Check which account you are on."],
  ])("keeps the dialog open with the %s refusal", async (code, text) => {
    const user = userEvent.setup();
    render(<Harness level="acknowledge" onConfirm={async () => Promise.reject(refusal(code))} />);
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    expect(await within(dialog).findByText(text)).toBeInTheDocument();
    expect(log()).toHaveTextContent("");
  });

  it("offers Remove from company with kastlan's other_companies", async () => {
    const user = userEvent.setup();
    const onRemoveFromCompany = vi.fn(async () => undefined);
    render(
      <Harness
        level="type_email"
        onConfirm={async () => Promise.reject(refusal("other_companies"))}
        onRemoveFromCompany={onRemoveFromCompany}
      />,
    );
    const dialog = await screen.findByRole("alertdialog");
    await user.type(within(dialog).getByRole("textbox"), "ada@example.com");
    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    expect(await within(dialog).findByText(/also belongs to other companies/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Remove from company" }));
    expect(onRemoveFromCompany).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(log()).toHaveTextContent("closed:true"));
  });

  it("says anything else in describeError's words, else its own", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <Harness
        level="acknowledge"
        onConfirm={async () => Promise.reject(refusal("customer_owns_work"))}
        describeError={() => "Ada owns work: hand it on first."}
      />,
    );
    let dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    expect(await within(dialog).findByText("Ada owns work: hand it on first.")).toBeInTheDocument();
    unmount();

    render(<Harness level="acknowledge" onConfirm={async () => Promise.reject(new Error("network"))} />);
    dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    expect(await within(dialog).findByText("That didn’t work. Please try again.")).toBeInTheDocument();
  });

  it("Cancel answers false and sends nothing", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Harness level="type_email" onConfirm={onConfirm} />);
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(log()).toHaveTextContent("closed:false"));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("holds the confirm for the action's own field first", async () => {
    render(
      <Harness level="type_email" onConfirm={() => undefined} confirmDisabledReason="Choose who receives the work">
        <label>
          Recipient
          <select>
            <option>—</option>
          </select>
        </label>
      </Harness>,
    );
    const dialog = await screen.findByRole("alertdialog");
    await waitFor(() => expect(within(dialog).getByRole("combobox", { name: "Recipient" })).toHaveFocus());
    expect(within(dialog).getByRole("button", { name: "Deactivate" })).toHaveAccessibleDescription(
      "Choose who receives the work",
    );
  });
});
