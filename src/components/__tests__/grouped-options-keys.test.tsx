import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Autocomplete } from "../autocomplete";
import { Combobox } from "../combobox";
import { EntityCombobox } from "../entity-combobox";
import { InlineEntityCombobox } from "../inline-entity-combobox";

/**
 * A grouped list keeps its rows mounted while a query narrows it (0.52 code review,
 * combobox-core.tsx). A group was keyed by the index of its first row, so a keystroke that
 * dropped a row from an earlier group re-keyed every later group, and React rebuilt it —
 * all its rows, per keystroke, in the four lists that head groups (the panel pickers,
 * Combobox, InlineEntityCombobox, Autocomplete). One renderer draws the runs now, keyed
 * by the group and how many runs of it came before.
 */

const FRUIT = ["Grape", "Grapefruit", "Lime"];
const OPTIONS = [
  ...FRUIT.map((label) => ({ value: label, label, group: "Fruit" })),
  { value: "Grape leaves", label: "Grape leaves", group: "Vegetables" },
];
const groupOf = (o: string) => (FRUIT.includes(o) ? "Fruit" : "Vegetables");

/** The later group's row, typed "e" (every row) and then "ape" (Lime goes). */
function laterRowSurvives(type: (q: string) => void) {
  type("e");
  const before = screen.getByRole("option", { name: "Grape leaves" });
  expect(screen.queryByRole("option", { name: "Lime" })).not.toBeNull();
  type("ape");
  expect(screen.queryByRole("option", { name: "Lime" })).toBeNull();
  expect(screen.getByRole("option", { name: "Grape leaves" })).toBe(before);
}

describe("a grouped list narrowed by a query keeps its later groups mounted", () => {
  it("ComboboxPanel (EntityCombobox)", () => {
    render(<EntityCombobox<string> label="Item" value={null} onChange={() => {}} options={OPTIONS} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Item/ }));
    laterRowSurvives((q) => fireEvent.change(screen.getByRole("textbox"), { target: { value: q } }));
  });

  it("Combobox", () => {
    function Host() {
      const [value, setValue] = useState("");
      return (
        <Combobox
          label="Item"
          value={value}
          onChange={setValue}
          options={OPTIONS.map((o) => o.label)}
          groupBy={groupOf}
        />
      );
    }
    render(<Host />);
    const field = screen.getByRole("combobox", { name: "Item" });
    act(() => field.focus());
    laterRowSurvives((q) => fireEvent.change(field, { target: { value: q } }));
  });

  it("InlineEntityCombobox", () => {
    render(<InlineEntityCombobox<string> label="Item" value={null} onChange={() => {}} options={OPTIONS} />);
    const field = screen.getByRole("combobox", { name: "Item" });
    act(() => field.focus());
    laterRowSurvives((q) => fireEvent.change(field, { target: { value: q } }));
  });

  it("Autocomplete", () => {
    function Host() {
      const [value, setValue] = useState("");
      return <Autocomplete<string> label="Item" value={value} onChange={setValue} options={OPTIONS} />;
    }
    render(<Host />);
    const field = screen.getByRole("combobox", { name: "Item" });
    act(() => field.focus());
    laterRowSurvives((q) => fireEvent.change(field, { target: { value: q } }));
  });
});
