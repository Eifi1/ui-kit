import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Combobox } from "../combobox";
import { InlineEntityCombobox } from "../inline-entity-combobox";
import { stubPhone } from "../../test/viewport";

/**
 * The two TYPED comboboxes tell a screen reader what ComboboxPanel and Autocomplete
 * already do (refactor audit 2026-10-30, INP-6):
 *
 * - (a) `aria-expanded` is what is SHOWN: a query that matches nothing said "expanded"
 *   with no listbox in the document;
 * - (b) a kept-mounted status says how many rows the query left, or "No results" — focus
 *   stays in the field, and the list changing under it was silent;
 * - (c) their phone sheets take the list's keys in their search box (0.34's BUG-5 fix
 *   reached only the panel pickers): arrows and Enter there did nothing at all.
 */

afterEach(() => vi.unstubAllGlobals());

const PAYEES = ["Migros", "Coop", "Denner"];
const ACCOUNTS = [
  { value: 1, label: "Cash" },
  { value: 2, label: "Bank" },
  { value: 3, label: "Savings" },
];

function Payee({ onChange }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <Combobox
      label="Payee"
      searchPlaceholder="Search payees"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      options={PAYEES}
    />
  );
}

function Account({ onChange }: { onChange?: (v: number | null) => void }) {
  const [value, setValue] = useState<number | null>(null);
  return (
    <InlineEntityCombobox<number>
      label="Account"
      searchPlaceholder="Search accounts"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      options={ACCOUNTS}
    />
  );
}

/** The field's live region — outside the list, so it survives the list going away. */
const status = (container: HTMLElement) => container.querySelector('[role="status"]');

describe.each([
  ["Combobox", () => <Payee />, "Payee", "mi"],
  ["InlineEntityCombobox", () => <Account />, "Account", "ca"],
] as const)("%s on a desktop", (_name, ui, label, hit) => {
  it("says expanded only while a list shows", () => {
    render(ui());
    const field = screen.getByRole("combobox", { name: label });
    act(() => field.focus());
    fireEvent.change(field, { target: { value: "zzz" } });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(field).toHaveAttribute("aria-expanded", "false");
    fireEvent.change(field, { target: { value: hit } });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(field).toHaveAttribute("aria-expanded", "true");
  });

  it("announces the count, and No results, in a status kept mounted", () => {
    const { container } = render(ui());
    const region = status(container);
    expect(region).not.toBeNull();
    const field = screen.getByRole("combobox", { name: label });
    act(() => field.focus());
    fireEvent.change(field, { target: { value: hit } });
    expect(region).toHaveTextContent("1 result");
    fireEvent.change(field, { target: { value: "zzz" } });
    // The same node: a live region announces changes, not its own arrival.
    expect(status(container)).toBe(region);
    expect(region).toHaveTextContent("No results");
  });
});

describe("the phone sheets take the list's keys", () => {
  it("Combobox: arrows name the row on the search box, Enter takes it", () => {
    stubPhone();
    const onChange = vi.fn();
    render(<Payee onChange={onChange} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Payee" }));
    const sheet = screen.getByRole("dialog");
    const search = within(sheet).getByRole("textbox", { name: "Search payees" });
    const list = within(sheet).getByRole("listbox");
    expect(search).toHaveAttribute("aria-controls", list.id);
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    const active = search.getAttribute("aria-activedescendant");
    expect(active).toBeTruthy();
    expect(document.getElementById(active!)).toHaveTextContent("Coop");
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("Coop");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("InlineEntityCombobox: arrows name the row on the search box, Enter takes it", () => {
    stubPhone();
    const onChange = vi.fn();
    render(<Account onChange={onChange} />);
    fireEvent.focus(screen.getByRole("combobox", { name: "Account" }));
    const sheet = screen.getByRole("dialog");
    const search = within(sheet).getByRole("textbox", { name: "Search accounts" });
    const list = within(sheet).getByRole("listbox");
    expect(search).toHaveAttribute("aria-controls", list.id);
    fireEvent.change(search, { target: { value: "sav" } });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    const active = search.getAttribute("aria-activedescendant");
    expect(active).toBeTruthy();
    expect(document.getElementById(active!)).toHaveTextContent("Savings");
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("the sheet's status says the count of what its search left", () => {
    stubPhone();
    render(<Account />);
    fireEvent.focus(screen.getByRole("combobox", { name: "Account" }));
    const sheet = screen.getByRole("dialog");
    fireEvent.change(within(sheet).getByRole("textbox", { name: "Search accounts" }), { target: { value: "a" } });
    // In the sheet, not behind it: a modal sheet hides what lies outside it.
    expect(within(sheet).getByRole("status")).toHaveTextContent("3 results");
  });
});
