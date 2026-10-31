import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Autocomplete } from "../autocomplete";
import { Combobox } from "../combobox";
import { EntityCombobox } from "../entity-combobox";
import { InlineEntityCombobox } from "../inline-entity-combobox";
import { stubPhone } from "../../test/viewport";

/**
 * A group's heading in a picker list names a `role="group"` around its options, so a
 * reader moving through the list hears which group a row is in (refactor audit
 * 2026-10-30, INP-8). It was loose text in the listbox: focus stays in the search box
 * and a row is announced through `aria-activedescendant`, so keksdose's "Groceries"
 * under Recent and again under its own group were two identical names, and an account
 * grouped by its type never said the type. ComboboxPanel's column mode already did this.
 */

afterEach(() => vi.unstubAllGlobals());

const GROUPED = [
  { value: "r-groc", label: "Groceries", group: "Recent" },
  { value: "groc", label: "Groceries", group: "Household" },
  { value: "rent", label: "Rent", group: "Household" },
];

/** The option named `name` in the group named `group`, found the way a reader goes. */
function optionIn(group: string, name: string) {
  const list = screen.getByRole("listbox");
  return within(within(list).getByRole("group", { name: group })).getByRole("option", { name });
}

function expectGroups() {
  expect(optionIn("Recent", "Groceries")).toBeInTheDocument();
  expect(optionIn("Household", "Groceries")).toBeInTheDocument();
  expect(optionIn("Household", "Rent")).toBeInTheDocument();
  // No loose heading text left in the listbox: every row it owns is an option or a group.
  const list = screen.getByRole("listbox");
  expect(within(list).getAllByRole("group")).toHaveLength(2);
}

function Inline() {
  const [value, setValue] = useState<string | null>(null);
  return <InlineEntityCombobox<string> label="Category" value={value} onChange={setValue} options={GROUPED} />;
}

function Payee() {
  const [value, setValue] = useState("");
  return (
    <Combobox
      label="Payee"
      value={value}
      onChange={setValue}
      options={["Migros", "Coop", "SBB"]}
      groupBy={(o) => (o === "SBB" ? "Travel" : "Groceries")}
    />
  );
}

function expectPayeeGroups() {
  expect(optionIn("Groceries", "Migros")).toBeInTheDocument();
  expect(optionIn("Groceries", "Coop")).toBeInTheDocument();
  expect(optionIn("Travel", "SBB")).toBeInTheDocument();
}

describe("group headings name their groups", () => {
  it("ComboboxPanel's list (EntityCombobox)", () => {
    render(<EntityCombobox<string> label="Category" value={null} onChange={() => {}} options={GROUPED} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Category/ }));
    expectGroups();
  });

  it("ComboboxPanel's phone sheet", () => {
    stubPhone();
    render(<EntityCombobox<string> label="Category" value={null} onChange={() => {}} options={GROUPED} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Category/ }));
    expectGroups();
  });

  it("InlineEntityCombobox's list", () => {
    render(<Inline />);
    fireEvent.focus(screen.getByRole("combobox", { name: "Category" }));
    expectGroups();
  });

  it("InlineEntityCombobox's phone sheet", () => {
    stubPhone();
    render(<Inline />);
    fireEvent.focus(screen.getByRole("combobox", { name: "Category" }));
    expectGroups();
  });

  it("Combobox's list", () => {
    render(<Payee />);
    fireEvent.focus(screen.getByRole("combobox", { name: "Payee" }));
    expectPayeeGroups();
  });

  it("Combobox's phone sheet", () => {
    stubPhone();
    render(<Payee />);
    fireEvent.click(screen.getByRole("combobox", { name: "Payee" }));
    expectPayeeGroups();
  });

  // Not in the finding's list, and the same loose heading: Autocomplete's own list.
  it("Autocomplete's list", () => {
    function Address() {
      const [value, setValue] = useState("");
      return <Autocomplete<string> label="Category" value={value} onChange={setValue} options={GROUPED} />;
    }
    render(<Address />);
    const field = screen.getByRole("combobox", { name: "Category" });
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "r" } });
    expect(optionIn("Recent", "Groceries")).toBeInTheDocument();
    expect(optionIn("Household", "Rent")).toBeInTheDocument();
  });
});
