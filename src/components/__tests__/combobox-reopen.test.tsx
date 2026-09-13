import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Combobox } from "../combobox";

/**
 * "Opening the list offers the whole pool again" — the free-text combobox's half of
 * Keksdose dev#549.
 *
 * *"Currently it acts kind of a filter and clicking again does not open anything
 * since the previous text is still there likely filtering all other options out."*
 *
 * The row was filed against Keksdose's category-name field, which was its own
 * hand-rolled control at the time and grew its own fix. This one — the PAYEE field,
 * the older and shared control — had the identical bug and no test: `query` was
 * `value.trim().toLowerCase()` unconditionally, so after picking "Migros" the list
 * reopened holding exactly one row, the answer you were trying to change.
 *
 * {@link InlineEntityCombobox} beside it has always had the rule (its `typedQuery`
 * is empty unless the text differs from the selected label), so this was the one
 * control of the three that disagreed.
 *
 * Two faults, one symptom, and fixing either alone leaves it broken: the list also
 * has to REOPEN, and picking a row never blurs the input (the rows suppress
 * `mousedown` on purpose), so a second click fires no `focus` event at all.
 */
const OPTIONS = ["Migros", "Coop", "Denner"];

function Harness() {
  const [value, setValue] = useState("");
  return <Combobox label="Payee" value={value} onChange={setValue} options={OPTIONS} />;
}

const box = () => screen.getByRole("combobox", { name: "Payee" });
const rows = () =>
  within(screen.getByRole("listbox"))
    .getAllByRole("button")
    .map((b) => b.textContent);

describe("reopening a free-text combobox (dev#549)", () => {
  it("offers the whole pool on focus", () => {
    render(<Harness />);
    fireEvent.focus(box());
    expect(rows()).toEqual(OPTIONS);
  });

  it("filters while the value is being typed", () => {
    render(<Harness />);
    fireEvent.focus(box());
    fireEvent.change(box(), { target: { value: "Co" } });
    expect(rows()).toEqual(["Coop"]);
  });

  it("offers the OTHER options again after one was picked", () => {
    render(<Harness />);
    fireEvent.focus(box());
    // mousedown, not click: the rows commit on mousedown so the input's blur cannot
    // close the list before the selection registers.
    fireEvent.mouseDown(screen.getByRole("button", { name: "Migros" }));
    expect(screen.queryByRole("listbox")).toBeNull();

    // The click that reopens — and the whole pool, not a one-row filter of "Migros".
    fireEvent.click(box());
    expect(rows()).toEqual(OPTIONS);
  });

  it("filters again as soon as the value is edited after a pick", () => {
    // The gate is about what the user just DID, not about the string: a picked value
    // that is then typed into has to narrow the list like any other query.
    render(<Harness />);
    fireEvent.focus(box());
    fireEvent.mouseDown(screen.getByRole("button", { name: "Migros" }));
    fireEvent.click(box());
    fireEvent.change(box(), { target: { value: "Den" } });
    expect(rows()).toEqual(["Denner"]);
  });
});
