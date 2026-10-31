import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Combobox } from "../combobox";
import { InlineEntityCombobox } from "../inline-entity-combobox";
import { stubDesktop, stubPhone } from "../../test/viewport";

/**
 * Enter in a typed combobox's phone sheet acts on what the SHEET shows — its query and a
 * highlight the person placed — never on the field's text from before the sheet opened or
 * a highlight left over from an earlier list (0.52 code review, inline-entity-combobox.tsx
 * and combobox.tsx). 0.52 gave the sheets the list's keys (INP-6), and with them two ways
 * to lose an answer:
 *
 * - InlineEntityCombobox judged the field's text — the label it had at focus — and closed:
 *   the typed search was thrown away, and a name typed out in full was not committed;
 * - Combobox kept the arrows' row across a close, so the reopened sheet showed row 0 of
 *   the whole pool highlighted, and Enter overwrote the typed value with it.
 */

afterEach(() => vi.unstubAllGlobals());

const ACCOUNTS = [
  { value: 1, label: "Cash" },
  { value: 2, label: "Groceries" },
  { value: 3, label: "Savings" },
];

function Account({ initial = 1, onChange }: { initial?: number | null; onChange: (v: number | null) => void }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <InlineEntityCombobox<number>
      label="Account"
      searchPlaceholder="Search accounts"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
      options={ACCOUNTS}
    />
  );
}

function openAccountSheet() {
  fireEvent.focus(screen.getByRole("combobox", { name: "Account" }));
  return within(screen.getByRole("dialog")).getByRole("textbox", { name: "Search accounts" });
}

describe("InlineEntityCombobox's phone sheet: Enter with no row highlighted", () => {
  it("commits a name typed out in full, as the desktop field does", () => {
    stubPhone();
    const onChange = vi.fn();
    render(<Account onChange={onChange} />);
    const search = openAccountSheet();
    fireEvent.change(search, { target: { value: "groceries" } });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(2);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the sheet and its search for a query that names nothing", () => {
    stubPhone();
    const onChange = vi.fn();
    render(<Account onChange={onChange} />);
    const search = openAccountSheet();
    fireEvent.change(search, { target: { value: "sav" } });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(search).toHaveValue("sav");
  });

  it("never judges the field's text: a value whose option is not loaded is kept", () => {
    stubPhone();
    const onChange = vi.fn();
    // The field shows "" (no option for 9 yet), so its text at focus is "" — which, judged,
    // reads as "the user emptied the field".
    render(<Account initial={9} onChange={onChange} />);
    const search = openAccountSheet();
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closing the sheet does not judge the field's text either", () => {
    stubPhone();
    const onChange = vi.fn();
    render(<Account initial={9} onChange={onChange} />);
    openAccountSheet();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});

const POOL = ["Aldi", "Migros", "Coop"];

function Payee({ onChange }: { onChange: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <Combobox
      label="Payee"
      searchPlaceholder="Search payees"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
      options={POOL}
    />
  );
}

describe("Combobox: a highlight does not outlive the list it was placed in", () => {
  it("phone: closing the sheet drops the arrows' row, so Enter on reopen keeps the typed value", () => {
    stubPhone();
    const onChange = vi.fn();
    render(<Payee onChange={onChange} />);
    const field = screen.getByRole("combobox", { name: "Payee" });
    fireEvent.click(field);
    const search = within(screen.getByRole("dialog")).getByRole("textbox", { name: "Search payees" });
    fireEvent.change(search, { target: { value: "mig" } });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(field);
    const again = within(screen.getByRole("dialog")).getByRole("textbox", { name: "Search payees" });
    expect(again).not.toHaveAttribute("aria-activedescendant");
    fireEvent.keyDown(again, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("mig");
  });

  it("desktop: a list closed by a press outside reopens with no row highlighted", () => {
    stubDesktop();
    const onChange = vi.fn();
    render(<Payee onChange={onChange} />);
    const field = screen.getByRole("combobox", { name: "Payee" });
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "mig" } });
    fireEvent.keyDown(field, { key: "ArrowDown" });
    expect(field).toHaveAttribute("aria-activedescendant");
    fireEvent.mouseDown(document.body);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();

    fireEvent.click(field);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(field).not.toHaveAttribute("aria-activedescendant");
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("mig");
  });

  it("desktop: a click that puts the whole pool back drops the typed list's row", () => {
    stubDesktop();
    const onChange = vi.fn();
    render(<Payee onChange={onChange} />);
    const field = screen.getByRole("combobox", { name: "Payee" });
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "mig" } });
    fireEvent.keyDown(field, { key: "ArrowDown" });
    fireEvent.click(field);
    expect(screen.getAllByRole("option")).toHaveLength(POOL.length);
    expect(field).not.toHaveAttribute("aria-activedescendant");
  });
});
