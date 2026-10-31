import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Combobox } from "../combobox";
import { CountrySelect } from "../country-select";
import { EntityCombobox } from "../entity-combobox";
import { GroupedPicker } from "../grouped-picker";

/**
 * A picker's query is its words, every one of which must appear in a row (0.51.4,
 * keksdose's /prices shop picker): "Migros Zürich" found nothing while the filter wanted
 * the whole query as one substring of one text.
 */

const SHOPS = [
  { value: "m-8004", label: "8004 Zürich", sublabel: "Migros", group: "Migros" },
  { value: "m-3011", label: "3011 Bern", sublabel: "Migros", group: "Migros" },
  { value: "c-8004", label: "8004 Zürich", sublabel: "Coop", group: "Coop" },
];

describe("multi-word search in the pickers", () => {
  it("EntityCombobox: each word in the label or the sublabel", () => {
    render(<EntityCombobox<string> label="Shop" value={null} onChange={() => {}} options={SHOPS} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Shop/ }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "migros zurich" } });
    const names = screen.getAllByRole("option").map((o) => o.textContent);
    expect(names).toHaveLength(1);
    expect(names[0]).toContain("8004 Zürich");
    expect(names[0]).toContain("Migros");
  });

  it("GroupedPicker: a word in the group's name and one in the item's label", () => {
    render(
      <GroupedPicker
        aria-label="Shop"
        buttonLabel="Shop"
        selected={null}
        onSelect={() => {}}
        filterPlaceholder="Filter"
        groups={[
          {
            key: "migros",
            label: "Migros",
            items: [
              { key: "m-8004", label: "8004 Zürich" },
              { key: "m-3011", label: "3011 Bern" },
            ],
          },
          { key: "coop", label: "Coop", items: [{ key: "c-8004", label: "8004 Zürich" }] },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /Shop/ }));
    const search = screen.getByPlaceholderText("Filter");
    fireEvent.change(search, { target: { value: "Migros 8004" } });
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["8004 Zürich"]);
    // The group's name alone still keeps the whole group.
    fireEvent.change(search, { target: { value: "migros" } });
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  // Refactor audit 2026-10-30, DUP-4: 0.51.4 named Combobox among the lists that took
  // words, but it ranked with `rankMatch`, which wants the whole query as one substring.
  it("Combobox: every word somewhere, the whole query's hits ranked first", () => {
    function Payee() {
      const [value, setValue] = useState("");
      return (
        <Combobox
          label="Payee"
          value={value}
          onChange={setValue}
          options={["Zürich Migros", "Coop Bern", "Migros Zürich Altstetten"]}
        />
      );
    }
    render(<Payee />);
    const field = screen.getByRole("combobox", { name: "Payee" });
    act(() => field.focus());
    fireEvent.change(field, { target: { value: "migros zurich" } });
    // "Migros Zürich Altstetten" starts with the whole query; "Zürich Migros" holds both
    // words the other way round, so it follows.
    expect(
      within(screen.getByRole("listbox"))
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Migros Zürich Altstetten", "Zürich Migros"]);
  });

  it("CountrySelect: words in any order", () => {
    render(<CountrySelect label="Country" locale="en" value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Country/ }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "kinshasa congo" } });
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Congo - Kinshasa"]);
    // The code still answers first ("ch" is Switzerland before it is Chad).
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "ch" } });
    expect(screen.getAllByRole("option")[0]).toHaveTextContent("Switzerland");
  });
});
