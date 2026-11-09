import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LineItems, type LineItemsColumn, type LineItemsProps } from "../line-items";
import { Combobox, InlineEntityCombobox } from "../combobox";
import { Input } from "../input";
import { stubPhone } from "../../test/viewport";

/**
 * LineItems moves the focus after Add, and after a remove, into a row's first field. With a
 * kit picker there — the split editor's category, keksdose live #495 — a plain `focus()`
 * opened its list (on a phone the full-screen sheet) over the row just asked for. The move
 * is `focusQuietly` now: the picker has the focus and its list stays shut until the person
 * opens it.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

interface Line {
  id: string;
  category: string;
  amount: string;
}

let next = 0;
const blank = (): Line => ({ id: `q${++next}`, category: "", amount: "" });

type Picker = (label: string) => ReactNode;

const COMBOBOX: Picker = (label) => (
  <Combobox aria-label={label} value="" onChange={() => {}} options={["Groceries", "Household"]} />
);
const INLINE_ENTITY: Picker = (label) => (
  <InlineEntityCombobox<string>
    aria-label={label}
    value={null}
    onChange={() => {}}
    options={[
      { value: "g", label: "Groceries" },
      { value: "h", label: "Household" },
    ]}
  />
);

function Lines({
  picker,
  initial = [blank()],
  ...rest
}: Partial<LineItemsProps<Line>> & { picker: Picker; initial?: Line[] }) {
  const [lines, setLines] = useState(initial);
  const columns: LineItemsColumn<Line>[] = [
    { key: "category", header: "Category", render: ({ label }) => picker(label) },
    {
      key: "amount",
      header: "Amount",
      width: "7rem",
      render: ({ item, label }) => <Input aria-label={label} defaultValue={item.amount} />,
    },
  ];
  return (
    <LineItems
      items={lines}
      columns={columns}
      onAdd={() => setLines((l) => [...l, blank()])}
      onRemove={(i) => setLines((l) => l.filter((_, j) => j !== i))}
      {...rest}
    />
  );
}

const field = (name: string) => screen.getByRole("combobox", { name });

describe("LineItems' focus with a picker as the first field", () => {
  it.each([
    ["Combobox", COMBOBOX],
    ["InlineEntityCombobox", INLINE_ENTITY],
  ] as const)("Add focuses the new row's %s and opens no list", async (_, picker) => {
    render(<Lines picker={picker} />);
    await userEvent.click(screen.getByRole("button", { name: "Add row" }));
    const added = field("Category, row 2");
    expect(added).toHaveFocus();
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(added).toHaveAttribute("aria-expanded", "false");
    // The person opens it as ever.
    fireEvent.keyDown(added, { key: "ArrowDown" });
    expect(screen.queryByRole("listbox")).not.toBeNull();
  });

  it("on a phone: Add puts up no full-screen sheet", async () => {
    stubPhone();
    render(<Lines picker={COMBOBOX} />);
    await userEvent.click(screen.getByRole("button", { name: "Add row" }));
    expect(field("Category, row 2")).toHaveFocus();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("a remove that leaves the focus on the next row's picker opens nothing either", async () => {
    // At `minItems` the remaining row's remove is disabled, so the focus falls to its first
    // field — the picker.
    render(<Lines picker={COMBOBOX} initial={[blank(), blank()]} minItems={1} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove row 1" }));
    expect(field("Category, row 1")).toHaveFocus();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("a plain field is focused as before", async () => {
    render(<Lines picker={(label) => <Input aria-label={label} />} />);
    await userEvent.click(screen.getByRole("button", { name: "Add row" }));
    expect(screen.getByRole("textbox", { name: "Category, row 2" })).toHaveFocus();
  });
});
