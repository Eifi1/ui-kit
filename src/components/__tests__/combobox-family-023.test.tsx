import { useState } from "react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Combobox, InlineEntityCombobox } from "../combobox";
import { EntityCombobox } from "../entity-combobox";
import { MultiEntityCombobox } from "../multi-entity-combobox";
import { FieldHint } from "../ui";
import { WriteLockProvider } from "../write-lock";

/**
 * The Combobox family in 0.23 (keksdose G2, G9, and the kit's later list):
 *
 *   - the write lock — `commit` / `disabledReason` — on all four, as Button, Select and
 *     CountrySelect have it: focusable and `aria-disabled`, the reason in the kit
 *     Tooltip and on `aria-describedby`, no list, and nothing reaching `onChange`;
 *   - a create row on InlineEntityCombobox (`onCreate`, `createEmptyLabel`,
 *     `createCommit`), and the last two on the panel pickers;
 *   - MultiEntityCombobox's `hint`, and the 0.22 rule that a hint coming and going
 *     never rebuilds the control.
 */

const OPTIONS = [
  { value: "a1", label: "Example Ltd" },
  { value: "a2", label: "Sample Cash" },
  { value: "a3", label: "Petty cash" },
];

/** Every id on `aria-describedby`, resolved to its text — what a reader hears. */
function described(el: HTMLElement): (string | null | undefined)[] {
  return (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);
}

function asPhone() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

type Lock = { commit?: boolean; disabledReason?: string };

/** One row per family member: how to render it locked, and how a pick would be tried. */
const FAMILY: Array<[string, (lock: Lock, onChange: (v: unknown) => void) => ReactElement]> = [
  [
    "Combobox",
    (lock, onChange) => (
      <Combobox label="Payee" value="Example Ltd" onChange={onChange} options={["Example Ltd", "Sample"]} {...lock} />
    ),
  ],
  [
    "InlineEntityCombobox",
    (lock, onChange) => (
      <InlineEntityCombobox<string> label="Account" value="a1" onChange={onChange} options={OPTIONS} clearable {...lock} />
    ),
  ],
  [
    "EntityCombobox",
    (lock, onChange) => (
      <EntityCombobox<string> label="Account" value="a1" onChange={onChange} options={OPTIONS} clearable {...lock} />
    ),
  ],
  [
    "MultiEntityCombobox",
    (lock, onChange) => (
      <MultiEntityCombobox<string> label="Accounts" value={["a1"]} onChange={onChange} options={OPTIONS} clearable {...lock} />
    ),
  ],
];

describe.each(FAMILY)("%s: the write lock (keksdose G2)", (name, field) => {
  const control = () => screen.getByRole("combobox");

  it("a disabledReason keeps it focusable, opens nothing, changes nothing and says why", () => {
    const onChange = vi.fn();
    render(field({ disabledReason: "Signed statements cannot change" }, onChange));
    const c = control();
    expect(c).not.toBeDisabled();
    expect(c).toHaveAttribute("aria-disabled", "true");
    act(() => c.focus());
    expect(c).toHaveFocus();

    fireEvent.click(c);
    fireEvent.keyDown(c, { key: "ArrowDown" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(c).toHaveAttribute("aria-expanded", "false");
    // Typing (the two inputs) and clearing (the "×") are gone with it.
    if (c.tagName === "INPUT") {
      expect(c).toHaveAttribute("readonly");
      fireEvent.change(c, { target: { value: "Sample Cash" } });
      fireEvent.blur(c);
    }
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    expect(described(c)).toContain("Signed statements cannot change");
    // The reason is in the kit Tooltip too, not only in a hidden description.
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("Signed statements cannot change");
    expect(name).toBeTruthy();
  });

  it("`commit` locks under a locked WriteLockProvider, with the lock's reason", () => {
    const onChange = vi.fn();
    render(
      <WriteLockProvider locked reason="Read-only demo — saving is disabled">
        {field({ commit: true, disabledReason: "its own reason" }, onChange)}
      </WriteLockProvider>,
    );
    expect(control()).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(control());
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    // The lock's sentence wins over the control's own.
    expect(described(control())).toContain("Read-only demo — saving is disabled");
    expect(described(control())).not.toContain("its own reason");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("without `commit` it stays live under the lock — the form's Save is the commit", () => {
    render(
      <WriteLockProvider locked>
        {field({}, vi.fn())}
      </WriteLockProvider>,
    );
    expect(control()).not.toHaveAttribute("aria-disabled");
    expect(control()).not.toHaveAttribute("readonly");
    fireEvent.click(control());
    if (control().tagName === "INPUT") fireEvent.focus(control());
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });
});

describe("the lock on the typed fields", () => {
  it("a locked Combobox swallows Enter and calls no onSubmit", () => {
    const onSubmit = vi.fn();
    render(
      <Combobox label="Payee" value="Example Ltd" onChange={vi.fn()} options={[]} onSubmit={onSubmit} disabledReason="Locked" />,
    );
    const notPrevented = fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    expect(notPrevented).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("a lock arriving mid-edit closes the list and drops the loose text unjudged", () => {
    const onChange = vi.fn();
    const ui = (reason?: string) => (
      <InlineEntityCombobox<string> label="Account" value="a1" onChange={onChange} options={OPTIONS} disabledReason={reason} />
    );
    const { rerender } = render(ui());
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Sample Cash" } });
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    rerender(ui("Locked"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("Example Ltd");
    fireEvent.blur(screen.getByRole("combobox"));
    // "Sample Cash" is an exact label — unlocked, the blur would have picked it.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("a locked picker opens no phone sheet", () => {
    const original = window.matchMedia;
    asPhone();
    try {
      render(<InlineEntityCombobox<string> label="Account" value="a1" onChange={vi.fn()} options={OPTIONS} disabledReason="Locked" />);
      fireEvent.focus(screen.getByRole("combobox"));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });
});

/** InlineEntityCombobox with a create row, controlled as every caller has it. */
function CreateHost({
  onCreate,
  ...props
}: {
  onCreate: (q: string) => void;
  createEmptyLabel?: string;
  createCommit?: boolean;
  createLabel?: (q: string) => string;
}) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <InlineEntityCombobox<string>
      label="Cash account"
      value={value}
      onChange={setValue}
      options={OPTIONS}
      onCreate={onCreate}
      {...props}
    />
  );
}

const field = () => screen.getByRole("combobox", { name: "Cash account" });
const activeOption = () => {
  const id = field().getAttribute("aria-activedescendant");
  return id ? document.getElementById(id) : null;
};

describe("InlineEntityCombobox: the create row (keksdose G9)", () => {
  it("offers “Create …” as the LAST row for a query that names no option", async () => {
    const user = userEvent.setup();
    render(<CreateHost onCreate={vi.fn()} />);
    await user.click(field());
    // Nothing typed and no `createEmptyLabel`: no row.
    expect(screen.queryByRole("option", { name: /Create/ })).not.toBeInTheDocument();

    await user.keyboard("cash");
    const rows = screen.getAllByRole("option");
    expect(rows.map((r) => r.textContent)).toEqual(["Sample Cash", "Petty cash", "Create “cash”"]);
    expect(rows.at(-1)).toHaveAttribute("aria-selected", "false");
  });

  it("is not offered for an exact (case-insensitive) match — that record exists", async () => {
    const user = userEvent.setup();
    render(<CreateHost onCreate={vi.fn()} />);
    await user.click(field());
    await user.keyboard("petty CASH");
    expect(screen.queryByRole("option", { name: /Create/ })).not.toBeInTheDocument();
  });

  it("is reached by the arrows like an option, and Enter creates with the query as typed", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<CreateHost onCreate={onCreate} />);
    await user.click(field());
    await user.keyboard("Wallet");
    // The only row: one Down lands on it.
    await user.keyboard("{ArrowDown}");
    expect(activeOption()).toHaveTextContent("Create “Wallet”");
    await user.keyboard("{Enter}");
    expect(onCreate).toHaveBeenCalledWith("Wallet");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    // The field shows the selection, not the typed text, until the caller passes the
    // new record's id.
    expect(field()).toHaveValue("");
  });

  it("past the last option, Down steps onto the create row and Up back off it", async () => {
    const user = userEvent.setup();
    render(<CreateHost onCreate={vi.fn()} />);
    await user.click(field());
    await user.keyboard("cash{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(activeOption()).toHaveTextContent("Create “cash”");
    await user.keyboard("{ArrowUp}");
    expect(activeOption()).toHaveTextContent("Petty cash");
  });

  it("a click creates and closes", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<CreateHost onCreate={onCreate} createLabel={(q) => `Add ${q} as account`} />);
    await user.click(field());
    await user.keyboard("Wallet");
    await user.click(screen.getByRole("option", { name: "Add Wallet as account" }));
    expect(onCreate).toHaveBeenCalledWith("Wallet");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("`createEmptyLabel` offers the row with nothing typed, and creates with \"\"", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<CreateHost onCreate={onCreate} createEmptyLabel="Create cash account" />);
    await user.click(field());
    const rows = screen.getAllByRole("option");
    expect(rows.at(-1)).toHaveTextContent("Create cash account");
    await user.keyboard("{End}"); // the caret, not the list — End stays with the input
    await user.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}");
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(activeOption()).toHaveTextContent("Create cash account");
    await user.keyboard("{Enter}");
    expect(onCreate).toHaveBeenCalledWith("");
  });

  it("a typed label is never a way into the create row: blur only picks or reverts", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(
      <>
        <CreateHost onCreate={onCreate} />
        <button type="button">after</button>
      </>,
    );
    await user.click(field());
    await user.keyboard("Wallet");
    await user.tab();
    expect(onCreate).not.toHaveBeenCalled();
    expect(field()).toHaveValue("");
  });

  it("`createCommit` under a locked provider: the row stays, says why, and cannot be taken", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(
      <WriteLockProvider locked reason="Read-only demo — saving is disabled">
        <CreateHost onCreate={onCreate} createCommit createEmptyLabel="Create cash account" />
      </WriteLockProvider>,
    );
    // The picker itself is draft state and stays live.
    expect(field()).not.toHaveAttribute("aria-disabled");
    await user.click(field());
    const row = screen.getByRole("option", { name: /Create cash account/ });
    expect(row).toHaveAttribute("aria-disabled", "true");
    expect(row).toHaveTextContent("Read-only demo — saving is disabled");
    // Passed over by the arrows: three options, and Down stops on the last of them.
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(activeOption()).toHaveTextContent("Petty cash");
    // A press on it does nothing, and leaves the list where it was.
    await user.click(screen.getByRole("option", { name: /Create cash account/ }));
    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    // Picking still works.
    await user.click(screen.getByRole("option", { name: "Sample Cash" }));
    expect(field()).toHaveValue("Sample Cash");
  });

  it("on a phone the sheet ends in the create row, and “No results” gives way to it", () => {
    const original = window.matchMedia;
    asPhone();
    try {
      const onCreate = vi.fn();
      render(<CreateHost onCreate={onCreate} />);
      fireEvent.focus(field());
      const sheet = screen.getByRole("dialog");
      fireEvent.change(within(sheet).getByRole("textbox"), { target: { value: "Wallet" } });
      expect(within(sheet).queryByText("No results")).not.toBeInTheDocument();
      fireEvent.click(within(sheet).getByRole("option", { name: "Create “Wallet”" }));
      expect(onCreate).toHaveBeenCalledWith("Wallet");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });
});

describe("the panel pickers: createEmptyLabel and createCommit", () => {
  it("EntityCombobox offers the named row on an empty query and creates with \"\"", () => {
    const onCreate = vi.fn();
    render(
      <EntityCombobox<string>
        label="Account"
        value={null}
        onChange={vi.fn()}
        options={OPTIONS}
        onCreate={onCreate}
        createEmptyLabel="Create cash account"
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /Account/ }));
    const row = screen.getByRole("option", { name: /Create cash account/ });
    fireEvent.mouseDown(row);
    expect(onCreate).toHaveBeenCalledWith("");
  });

  it("without createEmptyLabel an empty query still offers nothing (unchanged)", () => {
    render(<EntityCombobox<string> label="Account" value={null} onChange={vi.fn()} options={OPTIONS} onCreate={vi.fn()} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Account/ }));
    expect(screen.queryByRole("option", { name: /Create/ })).not.toBeInTheDocument();
  });

  it("MultiEntityCombobox's create row is locked on its own under createCommit", () => {
    const onCreate = vi.fn();
    const onChange = vi.fn();
    render(
      <WriteLockProvider locked reason="Shared with you to read">
        <MultiEntityCombobox<string>
          label="Accounts"
          value={[]}
          onChange={onChange}
          options={OPTIONS}
          onCreate={onCreate}
          createCommit
          createEmptyLabel="New account"
        />
      </WriteLockProvider>,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /Accounts/ }));
    const row = screen.getByRole("option", { name: /New account/ });
    expect(row).toHaveAttribute("aria-disabled", "true");
    expect(row).toHaveTextContent("Shared with you to read");
    fireEvent.mouseDown(row);
    expect(onCreate).not.toHaveBeenCalled();
    // The toggles themselves stay live.
    fireEvent.mouseDown(screen.getByRole("option", { name: /Example Ltd/ }));
    expect(onChange).toHaveBeenCalledWith(["a1"]);
  });
});

describe("MultiEntityCombobox: hint, like the rest of the family", () => {
  it("text is a caption under the field on the trigger's description, before the error", () => {
    render(
      <MultiEntityCombobox<string>
        label="Tenants"
        value={[]}
        onChange={vi.fn()}
        options={OPTIONS}
        hint="Everyone who signs the lease"
        error="Pick at least one"
      />,
    );
    const trigger = screen.getByRole("combobox", { name: /Tenants/ });
    expect(described(trigger)).toEqual(["Everyone who signs the lease", "Pick at least one"]);
    expect(trigger).toHaveAttribute("aria-invalid", "true");
  });

  it("a FieldHint rides the label line; with no label it sits at the end edge", () => {
    const { rerender } = render(
      <MultiEntityCombobox<string>
        label="Tenants"
        value={[]}
        onChange={vi.fn()}
        options={OPTIONS}
        hint={<FieldHint label="Everyone who signs" />}
      />,
    );
    const hintButton = screen.getByRole("button", { name: "Everyone who signs" });
    expect(screen.getByText("Tenants").parentElement).toContainElement(hintButton);
    rerender(
      <MultiEntityCombobox<string>
        aria-label="Tenants"
        value={[]}
        onChange={vi.fn()}
        options={OPTIONS}
        hint={<FieldHint label="Everyone who signs" />}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "Tenants" });
    const row = trigger.parentElement!.parentElement!;
    expect(row).toContainElement(screen.getByRole("button", { name: "Everyone who signs" }));
  });
});

/**
 * The 0.22 rule (see hint-toggle-keeps-control.test.tsx, which covers Combobox):
 * passed at all, even as `undefined`, a hint keeps the field's box — the focused
 * control survives its hint coming and going. Here for the three entity pickers, and
 * for the "?" on a field with no label line, whose end-edge row used to come and go
 * with it.
 */
const HINTED: Array<[string, (hint: ReactElement | string | undefined) => ReactElement]> = [
  [
    "InlineEntityCombobox",
    (hint) => <InlineEntityCombobox<string> label="Account" value="a1" onChange={vi.fn()} options={OPTIONS} hint={hint} />,
  ],
  [
    "InlineEntityCombobox, unlabelled",
    (hint) => <InlineEntityCombobox<string> aria-label="Account" value="a1" onChange={vi.fn()} options={OPTIONS} hint={hint} />,
  ],
  [
    "EntityCombobox",
    (hint) => <EntityCombobox<string> label="Account" value="a1" onChange={vi.fn()} options={OPTIONS} hint={hint} />,
  ],
  [
    "EntityCombobox, unlabelled",
    (hint) => <EntityCombobox<string> aria-label="Account" value="a1" onChange={vi.fn()} options={OPTIONS} hint={hint} />,
  ],
  [
    "MultiEntityCombobox",
    (hint) => <MultiEntityCombobox<string> label="Accounts" value={["a1"]} onChange={vi.fn()} options={OPTIONS} hint={hint} />,
  ],
  [
    "MultiEntityCombobox, unlabelled",
    (hint) => <MultiEntityCombobox<string> aria-label="Accounts" value={["a1"]} onChange={vi.fn()} options={OPTIONS} hint={hint} />,
  ],
  [
    "Combobox, unlabelled",
    (hint) => <Combobox aria-label="Payee" value="" onChange={vi.fn()} options={["A"]} hint={hint} />,
  ],
];

describe.each(HINTED)("%s: a hint coming and going keeps the control", (_name, field) => {
  afterEach(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });

  it.each([
    ["a caption", "Shown under the field"],
    ["a FieldHint", <FieldHint key="h" label="Why this field" />],
  ] as const)("with %s", (_kind, hint) => {
    const { rerender } = render(field(undefined));
    const control = screen.getByRole("combobox");
    act(() => control.focus());
    expect(control).toHaveFocus();
    rerender(field(hint));
    expect(control.isConnected).toBe(true);
    expect(control).toHaveFocus();
    rerender(field(undefined));
    expect(control.isConnected).toBe(true);
    expect(control).toHaveFocus();
  });
});

/**
 * The clear "×" is a pointer shortcut out of the tab order; the keyboard's clear is
 * Delete or Backspace on the CLOSED trigger (CountrySelect's rule, 0.23).
 */
describe("the trigger pickers' keyboard clear", () => {
  it("EntityCombobox: Delete on the closed trigger emits clearValue", () => {
    const onChange = vi.fn();
    render(<EntityCombobox<string, ""> label="Account" value="a1" onChange={onChange} options={OPTIONS} clearable clearValue="" />);
    const trigger = screen.getByRole("combobox", { name: /Account/ });
    fireEvent.keyDown(trigger, { key: "Delete" });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("MultiEntityCombobox: Backspace on the closed trigger empties the selection", () => {
    const onChange = vi.fn();
    render(<MultiEntityCombobox<string> label="Accounts" value={["a1", "a2"]} onChange={onChange} options={OPTIONS} clearable />);
    fireEvent.keyDown(screen.getByRole("combobox", { name: /Accounts/ }), { key: "Backspace" });
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("not without `clearable`, not with the list open, not while locked", () => {
    const onChange = vi.fn();
    const { rerender } = render(<EntityCombobox<string> label="Account" value="a1" onChange={onChange} options={OPTIONS} />);
    const trigger = () => screen.getByRole("combobox", { name: /Account/ });
    fireEvent.keyDown(trigger(), { key: "Delete" });

    rerender(<EntityCombobox<string> label="Account" value="a1" onChange={onChange} options={OPTIONS} clearable />);
    fireEvent.click(trigger());
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(trigger(), { key: "Backspace" });

    rerender(
      <EntityCombobox<string> label="Account" value="a1" onChange={onChange} options={OPTIONS} clearable disabledReason="Locked" />,
    );
    fireEvent.keyDown(trigger(), { key: "Delete" });
    expect(onChange).not.toHaveBeenCalled();
  });
});
