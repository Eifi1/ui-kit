import { useState } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReauthDialog } from "../reauth-dialog";

/**
 * Kurvenschmiede's "current password before adding a passkey": the app verifies, a
 * wrong password stays in the dialog with the app's message, a right one closes it.
 */

function Harness({ check }: { check: (pw: string) => Promise<void> }) {
  const [open, setOpen] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [log, setLog] = useState<string[]>([]);
  return (
    <>
      <p data-testid="log">{log.join(",")}</p>
      {open && (
        <ReauthDialog
          error={error}
          onSubmit={(pw) =>
            check(pw).catch((e: unknown) => {
              setError("Wrong password");
              throw e;
            })
          }
          onClose={(confirmed) => {
            setOpen(false);
            setLog((l) => [...l, `closed:${confirmed}`]);
          }}
        />
      )}
    </>
  );
}

describe("ReauthDialog", () => {
  it("is a current-password field, focused, and submit waits for a password", async () => {
    render(<ReauthDialog onSubmit={() => {}} onClose={() => {}} />);
    const dialog = await screen.findByRole("dialog", { name: "Confirm it’s you" });
    expect(dialog).toHaveAccessibleDescription("Enter your current password to continue.");
    const field = screen.getByLabelText("Current password");
    expect(field).toHaveAttribute("type", "password");
    expect(field).toHaveAttribute("autocomplete", "current-password");
    expect(field).toHaveFocus();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("a rejection stays open with the error, the field invalid; editing hides it; success closes true", async () => {
    const user = userEvent.setup();
    const check = vi.fn(async (pw: string) => {
      if (pw !== "right") throw new Error("400");
    });
    render(<Harness check={check} />);
    const field = await screen.findByLabelText<HTMLInputElement>("Current password");
    await user.type(field, "wrong{Enter}");
    expect(check).toHaveBeenCalledWith("wrong");
    expect(await screen.findByText("Wrong password")).toBeInTheDocument();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Wrong password");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Still focused, and selected for the retry, so typing replaces it.
    expect(field).toHaveFocus();
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, 5]);
    await user.keyboard("right");
    expect(field).toHaveFocus();
    expect(field).toHaveValue("right");
    expect(screen.queryByText("Wrong password")).toBeNull();
    expect(field).not.toHaveAttribute("aria-invalid");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(screen.getByTestId("log")).toHaveTextContent("closed:true"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is busy while the check runs: read-only field, Cancel disabled, Escape held", async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const onClose = vi.fn();
    render(
      <ReauthDialog onSubmit={() => new Promise<void>((r) => (resolve = r))} onClose={onClose} submitLabel="Add passkey" />,
    );
    const field = await screen.findByLabelText("Current password");
    await user.type(field, "pw{Enter}");
    expect(field).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add passkey" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => resolve());
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(true));
  });

  it("Cancel answers false and never calls onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<ReauthDialog onSubmit={onSubmit} onClose={onClose} labels={{ cancel: "Abbrechen" }} />);
    await user.type(await screen.findByLabelText("Current password"), "pw");
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(false));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("a void onSubmit leaves closing to the app, and busy is honoured", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(<ReauthDialog onSubmit={onSubmit} onClose={onClose} />);
    await user.type(await screen.findByLabelText("Current password"), "pw{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("pw");
    rerender(<ReauthDialog onSubmit={onSubmit} onClose={onClose} busy />);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
