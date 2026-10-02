import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { InlineEditField } from "../inline-edit-field";
import { WriteLockProvider } from "../write-lock";
import { DataTable } from "../data-table";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * keksdose K9: the assigned cell, the invoice line's value cells and the budget rename,
 * once — display button ↔ field, Enter and blur save, Escape cancels, the write lock
 * shows the value as a disabled button with the reason (dev#496).
 */

function Rename({ onCommit }: { onCommit: (next: string) => void | Promise<unknown> }) {
  const [name, setName] = useState("Household");
  return (
    <InlineEditField
      label="Budget name"
      value={name}
      onCommit={(next) => {
        const result = onCommit(next);
        if (result instanceof Promise) return result.then(() => setName(next));
        setName(next);
        return result;
      }}
    />
  );
}

describe("InlineEditField", () => {
  it("shows the value as a quiet button named by the value, described as an edit on focus", async () => {
    render(<InlineEditField label="Budget name" value="Household" onCommit={() => {}} />);
    const button = screen.getByRole("button", { name: "Household" });
    act(() => button.focus());
    await waitFor(() => expect(button).toHaveAccessibleDescription("Edit Budget name"));
  });

  it("opens on click with the text selected, saves on Enter and hands focus back", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Rename onCommit={onCommit} />);
    await user.click(screen.getByRole("button", { name: "Household" }));
    const field = screen.getByRole("textbox", { name: "Budget name" });
    expect(field).toHaveFocus();
    expect(field).toHaveValue("Household");
    expect([field as HTMLInputElement].map((f) => [f.selectionStart, f.selectionEnd])[0]).toEqual([0, 9]);
    await user.keyboard("Holiday{Enter}");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith("Holiday");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Holiday" })).toHaveFocus();
  });

  it("opens from the keyboard too", async () => {
    const user = userEvent.setup();
    render(<Rename onCommit={() => {}} />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("textbox", { name: "Budget name" })).toHaveFocus();
  });

  it("does not write an unchanged value", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Rename onCommit={onCommit} />);
    await user.click(screen.getByRole("button", { name: "Household" }));
    await user.keyboard("{Enter}");
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Household" })).toHaveFocus();
  });

  it("compares with isEqual — a number that only reads differently is unchanged", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <InlineEditField
        label="Assigned"
        value="1100.0000"
        isEqual={(a, b) => Number(a) === Number(b)}
        onCommit={onCommit}
      />,
    );
    await user.click(screen.getByRole("button", { name: "1100.0000" }));
    await user.keyboard("{Control>}a{/Control}1100{Enter}");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("cancels on Escape: the draft goes, nothing is saved, and the Escape stays its own", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const outer = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- a stand-in for a dialog's own Escape
      <div onKeyDown={(e) => outer(e.key)}>
        <Rename onCommit={onCommit} />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Household" }));
    await user.keyboard("Gone{Escape}");
    expect(onCommit).not.toHaveBeenCalled();
    expect(outer).not.toHaveBeenCalledWith("Escape");
    expect(screen.getByRole("button", { name: "Household" })).toHaveFocus();
    // Re-opened, it starts from the saved value again.
    await user.click(screen.getByRole("button", { name: "Household" }));
    expect(screen.getByRole("textbox")).toHaveValue("Household");
  });

  it("saves when focus leaves, and leaves focus where it went", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <>
        <Rename onCommit={onCommit} />
        <button type="button">Next</button>
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Household" }));
    await user.keyboard("Holiday");
    await user.tab();
    await waitFor(() => expect(onCommit).toHaveBeenCalledExactlyOnceWith("Holiday"));
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Holiday" })).toBeInTheDocument();
  });

  it("waits for a returned promise — read-only and busy — and closes when it resolves", async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const onCommit = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<Rename onCommit={onCommit} />);
    await user.click(screen.getByRole("button", { name: "Household" }));
    await user.keyboard("Holiday{Enter}");
    const field = screen.getByRole("textbox");
    expect(field).toHaveAttribute("readonly");
    expect(field.closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
    // A second Enter while it runs is not a second write; nor is Escape a cancel.
    await user.keyboard("{Enter}{Escape}");
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    await act(async () => resolve());
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Holiday" })).toHaveFocus();
  });

  it("stays open with the failure when the save rejects, says it, and clears it on the next keystroke", async () => {
    const user = userEvent.setup();
    let reject!: (e: Error) => void;
    render(
      <InlineEditField
        label="Budget name"
        value="Household"
        formatError={(e) => (e as Error).message}
        onCommit={() => new Promise((_, r) => (reject = r))}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Household" }));
    await user.keyboard("Taken{Enter}");
    await act(async () => reject(new Error("That name is taken.")));
    const field = screen.getByRole("textbox", { name: "Budget name" });
    expect(field).toHaveValue("Taken");
    expect(field).not.toHaveAttribute("readonly");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("That name is taken.");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("That name is taken."));
    await user.type(field, "!");
    expect(field).not.toHaveAttribute("aria-invalid");
    expect(field).not.toHaveAccessibleDescription();
  });

  it("treats a throw like a rejection, worded by labels.failed without formatError", async () => {
    const user = userEvent.setup();
    render(
      <InlineEditField
        label="Budget name"
        value="Household"
        onCommit={() => {
          throw new Error("nope");
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Household" }));
    await user.keyboard("x{Enter}");
    expect(screen.getByRole("textbox")).toHaveAccessibleDescription("The change could not be saved.");
  });

  it("does not save on Enter mid-composition (an IME candidate)", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Rename onCommit={onCommit} />);
    await user.click(screen.getByRole("button", { name: "Household" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "東京" } });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", isComposing: true });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("shows the placeholder for an empty value", () => {
    const { rerender } = render(<InlineEditField label="Memo" value="" onCommit={() => {}} />);
    expect(screen.getByRole("button", { name: "Empty" })).toBeInTheDocument();
    rerender(<InlineEditField label="Memo" value="" placeholder="Add a memo" onCommit={() => {}} />);
    expect(screen.getByRole("button", { name: "Add a memo" })).toBeInTheDocument();
  });

  it("is plain text when readOnly", () => {
    render(<InlineEditField label="Budget name" value="Household" readOnly onCommit={() => {}} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Household")).toBeInTheDocument();
  });

  it("tags the display and the editor data-private with redact", async () => {
    const user = userEvent.setup();
    render(<InlineEditField label="Assigned" value="1100" redact onCommit={() => {}} />);
    expect(screen.getByRole("button", { name: "1100" })).toHaveAttribute("data-private");
    await user.click(screen.getByRole("button", { name: "1100" }));
    expect(screen.getByRole("textbox").closest("[data-private]")).not.toBeNull();
  });

  it("takes its words from the provider's inlineEdit namespace, a prop winning", async () => {
    render(
      <UiKitProvider labels={{ inlineEdit: { edit: (l) => `${l} bearbeiten`, empty: "Leer" } }}>
        <InlineEditField label="Notiz" value="" labels={{ empty: "—" }} onCommit={() => {}} />
      </UiKitProvider>,
    );
    const button = screen.getByRole("button", { name: "—" });
    act(() => button.focus());
    await waitFor(() => expect(button).toHaveAccessibleDescription("Notiz bearbeiten"));
  });
});

describe("InlineEditField — the write lock (keksdose dev#496)", () => {
  it("locked: the value as a focusable, aria-disabled button with the reason, opening nothing", async () => {
    const user = userEvent.setup();
    render(
      <WriteLockProvider locked reason="Read-only demo — saving is disabled.">
        <InlineEditField commit label="Assigned" value="1100" onCommit={() => {}} />
      </WriteLockProvider>,
    );
    const button = screen.getByRole("button", { name: "1100" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription("Read-only demo — saving is disabled.");
    await user.click(button);
    expect(screen.queryByRole("textbox")).toBeNull();
    await user.tab();
    await user.tab({ shift: true });
    expect(button).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Read-only demo — saving is disabled.");
  });

  it("closes an open editor when the lock arrives, dropping the draft and saving nothing", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const tree = (locked: boolean) => (
      <WriteLockProvider locked={locked} reason="Locked">
        <InlineEditField commit label="Assigned" value="1100" onCommit={onCommit} />
      </WriteLockProvider>
    );
    const { rerender } = render(tree(false));
    await user.click(screen.getByRole("button", { name: "1100" }));
    await user.keyboard("5");
    rerender(tree(true));
    expect(screen.queryByRole("textbox")).toBeNull();
    // Unlocked again, it does not come back on its own.
    rerender(tree(false));
    expect(screen.queryByRole("textbox")).toBeNull();
    await waitFor(() => expect(onCommit).not.toHaveBeenCalled());
  });

  it("takes its own disabledReason without a provider, and ignores a lock without `commit`", () => {
    const { rerender } = render(<InlineEditField label="Total" value="9" disabledReason="Period closed" onCommit={() => {}} />);
    expect(screen.getByRole("button", { name: "9" })).toHaveAccessibleDescription("Period closed");
    rerender(
      <WriteLockProvider locked reason="Locked">
        <InlineEditField label="Total" value="9" onCommit={() => {}} />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("button", { name: "9" })).not.toHaveAttribute("aria-disabled");
  });
});

describe("InlineEditField — editors", () => {
  it("renders a custom editor for a non-string value and saves what it hands over, once", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <InlineEditField
        label="Quantity"
        value={3}
        display={(n) => `${n} pcs`}
        onCommit={onCommit}
        editor={(p) => (
          <input
            {...p.inputProps}
            value={String(p.value)}
            onChange={(e) => p.onChange(Number(e.target.value))}
            // The editor's own Enter commits a resolved value; the field's Enter that
            // follows is the second ending, and does nothing.
            onKeyDown={(e) => {
              if (e.key === "Enter") p.commit(p.value * 2);
            }}
          />
        )}
      />,
    );
    await user.click(screen.getByRole("button", { name: "3 pcs" }));
    const field = screen.getByRole("textbox", { name: "Quantity" });
    expect(field).toHaveFocus();
    await user.clear(field);
    await user.type(field, "4{Enter}");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(8);
  });

  it("can be opened from outside (controlled), seeded from the value", async () => {
    const onEditingChange = vi.fn();
    const { rerender } = render(
      <InlineEditField label="Assigned" value="50" editing={false} onEditingChange={onEditingChange} onCommit={() => {}} />,
    );
    rerender(<InlineEditField label="Assigned" value="50" editing onEditingChange={onEditingChange} onCommit={() => {}} />);
    const field = screen.getByRole("textbox", { name: "Assigned" });
    expect(field).toHaveValue("50");
    await waitFor(() => expect(field).toHaveFocus());
    fireEvent.keyDown(field, { key: "Escape" });
    expect(onEditingChange).toHaveBeenCalledWith(false);
  });

  it("passes the default editor's inputProps through", async () => {
    const user = userEvent.setup();
    render(<InlineEditField label="Budget name" value="Household" inputProps={{ maxLength: 120 }} onCommit={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Household" }));
    expect(screen.getByRole("textbox")).toHaveAttribute("maxlength", "120");
  });

  it("works in a DataTable cell without opening the row", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const onCommit = vi.fn();
    render(
      <MemoryRouter>
        <DataTable
          rows={[{ id: 1, name: "Rent" }]}
          rowKey={(r) => r.id}
          onRowClick={onRowClick}
          columns={[
            {
              key: "name",
              header: "Name",
              cell: (r) => <InlineEditField label="Name" value={r.name} onCommit={onCommit} />,
            },
          ]}
        />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Rent" }));
    await user.keyboard("Lease{Enter}");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith("Lease");
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
