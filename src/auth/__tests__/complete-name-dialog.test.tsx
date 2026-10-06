import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CompleteNameDialog } from "../complete-name-dialog";
import type { CompleteNameDialogProps } from "../complete-name-dialog";

/**
 * §3.3: a migrated user (the old display name in `first_name`, `last_name` empty) is
 * asked once after sign-in; "Later" only defers it.
 */

function Harness(props: Partial<CompleteNameDialogProps> & { onSave: CompleteNameDialogProps["onSave"] }) {
  const [open, setOpen] = useState(true);
  const [log, setLog] = useState<string[]>([]);
  return (
    <>
      <p data-testid="log">{log.join(",")}</p>
      {open && (
        <CompleteNameDialog
          firstName="Ada Example"
          {...props}
          onClose={(saved) => {
            setOpen(false);
            setLog((l) => [...l, `closed:${saved}`]);
          }}
        />
      )}
    </>
  );
}

describe("CompleteNameDialog", () => {
  it("prefills what is there, focuses the empty field, and saves both names trimmed", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(<Harness onSave={onSave} />);
    const dialog = await screen.findByRole("dialog", { name: "Complete your name" });
    expect(dialog).toHaveAccessibleDescription(/First and last name are now asked for separately/);
    const first = screen.getByLabelText("First name");
    const last = screen.getByLabelText("Last name");
    expect(first).toHaveValue("Ada Example");
    await waitFor(() => expect(last).toHaveFocus());

    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    await user.clear(first);
    await user.type(first, " Ada ");
    await user.type(last, "Example ");
    expect(save).toBeEnabled();
    await user.click(save);
    expect(onSave).toHaveBeenCalledWith({ firstName: "Ada", lastName: "Example" });
    await waitFor(() => expect(screen.getByTestId("log")).toHaveTextContent("closed:true"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Later closes without saving — the app asks again next sign-in", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(<Harness onSave={onSave} />);
    await user.click(await screen.findByRole("button", { name: "Later" }));
    await waitFor(() => expect(screen.getByTestId("log")).toHaveTextContent("closed:false"));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("a rejected save stays open with the names and says so; an edit hides it; the app's words win", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => Promise.reject(new Error("500")));
    const { rerender } = render(<Harness onSave={onSave} lastName="Example" />);
    await user.click(await screen.findByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your name could not be saved. Please try again.");
    expect(screen.getByLabelText("Last name")).toHaveValue("Example");
    expect(screen.getByTestId("log")).toHaveTextContent("");

    await user.type(screen.getByLabelText("Last name"), "s");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    rerender(<Harness onSave={onSave} lastName="Example" error="The server is asleep." />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The server is asleep.");
  });

  it("Save is a commit control: a write lock above it holds it", async () => {
    const { WriteLockProvider } = await import("../../components/write-lock");
    render(
      <WriteLockProvider locked reason="Read-only demo">
        <CompleteNameDialog firstName="Ada" lastName="Example" onSave={async () => undefined} onClose={() => {}} />
      </WriteLockProvider>,
    );
    const save = await screen.findByRole("button", { name: "Save" });
    expect(save).toHaveAttribute("aria-disabled", "true");
    expect(save).toHaveAccessibleDescription("Read-only demo");
  });
});
