import { useState, type ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Combobox, InlineEntityCombobox } from "../combobox";
import { EntityCombobox } from "../entity-combobox";
import { MultiSelect } from "../multi-select";
import { GroupedPicker } from "../grouped-picker";
import { CurrencySelect } from "../currency-select";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * DUP-5 (refactor audit 2026-10): "zurich" found Zürich in CountrySelect and the command
 * palette, and in none of the lists below — Swiss-German payees and categories in
 * keksdose, kastlan's eighteen EntityComboboxes. And "İ" folded by the locale in
 * GroupedPicker but not in the combobox family. Every kit list folds by
 * `foldForSearch` now (lib/text-match.ts).
 */

const CITIES = [
  { value: "zh", label: "Zürich" },
  { value: "bs", label: "Basel" },
  { value: "ir", label: "IRMAK" },
];

/** A Combobox holds the caller's text: without state the typed query never lands. */
function TextCombobox({ options }: { options: string[] }) {
  const [value, setValue] = useState("");
  return <Combobox label="City" value={value} onChange={setValue} options={options} />;
}

const optionNames = () => screen.queryAllByRole("option").map((o) => o.textContent);

function search(text: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: text } });
}

describe('"zurich" finds Zürich', () => {
  it("in an EntityCombobox", () => {
    render(<EntityCombobox<string> label="City" value={null} onChange={vi.fn()} options={CITIES} />);
    fireEvent.click(screen.getByRole("combobox", { name: /City/ }));
    search("zurich");
    expect(optionNames()).toEqual(["Zürich"]);
  });

  it("in a Combobox", () => {
    render(<TextCombobox options={["Zürich", "Basel"]} />);
    const field = screen.getByRole("combobox", { name: "City" });
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "zurich" } });
    expect(optionNames()).toEqual(["Zürich"]);
  });

  it("in an InlineEntityCombobox", () => {
    render(<InlineEntityCombobox<string> label="City" value={null} onChange={vi.fn()} options={CITIES} />);
    const field = screen.getByRole("combobox", { name: "City" });
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "zurich" } });
    expect(optionNames()).toEqual(["Zürich"]);
  });

  it("in a MultiSelect", () => {
    render(<MultiSelect label="Cities" options={CITIES} value={[]} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Cities/ }));
    search("zurich");
    expect(optionNames()).toEqual(["Zürich"]);
  });

  it("in a GroupedPicker", () => {
    render(
      <GroupedPicker
        aria-label="City"
        buttonLabel="Pick"
        groups={[{ key: "ch", label: "Schweiz", items: [{ key: "zh", label: "Zürich" }, { key: "bs", label: "Basel" }] }]}
        selected={null}
        onSelect={vi.fn()}
        filterPlaceholder="Filter"
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /City/ }));
    fireEvent.change(screen.getByPlaceholderText("Filter"), { target: { value: "zurich" } });
    expect(optionNames()).toEqual(["Zürich"]);
  });

  it("in a CurrencySelect, by a translated name", () => {
    render(
      <CurrencySelect value="EUR" onChange={vi.fn()} currencyNames={{ CHF: "Schweizer Fränkli" }} />,
    );
    fireEvent.click(screen.getByRole("combobox"));
    search("frankli");
    expect(optionNames()).toEqual([expect.stringContaining("CHF")]);
  });
});

describe("the combobox family folds case by the locale", () => {
  const inTurkish = ({ children }: { children: ReactNode }) => <UiKitProvider locale="tr">{children}</UiKitProvider>;

  it("EntityCombobox: ı finds IRMAK in Turkish", () => {
    render(<EntityCombobox<string> label="City" value={null} onChange={vi.fn()} options={CITIES} />, {
      wrapper: inTurkish,
    });
    fireEvent.click(screen.getByRole("combobox", { name: /City/ }));
    search("ırm");
    expect(optionNames()).toEqual(["IRMAK"]);
  });

  it("Combobox: ı finds IRMAK in Turkish", () => {
    render(<TextCombobox options={["IRMAK", "Basel"]} />, {
      wrapper: inTurkish,
    });
    const field = screen.getByRole("combobox", { name: "City" });
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "ırm" } });
    const list = screen.getByRole("listbox");
    expect(within(list).getAllByRole("option").map((o) => o.textContent)).toEqual(["IRMAK"]);
  });
});
