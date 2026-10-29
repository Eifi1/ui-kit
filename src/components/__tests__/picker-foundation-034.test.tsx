import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CurrencySelect } from "../currency-select";
import { AmountInput } from "../amount-input";
import { MultiSelect } from "../multi-select";
import { GroupedPicker, type PickerGroup } from "../grouped-picker";
import { Autocomplete } from "../autocomplete";
import { PHONE_WIDTH, stubViewportWidth } from "../../test/viewport";

/**
 * DUP-4 + BUG-12 (refactor audit 2026-10, Wave 2): one picker foundation.
 *
 * The picker family stood on three foundations and every fix landed on one of them.
 * `useComboboxCore` + `ComboboxPanel` had the phone sheet (live #200), portal anchoring
 * (dev#548: an `overflow` ancestor clipped an absolute panel), the live result count and
 * disabled rows; CurrencySelect, MultiSelect and GroupedPicker had none of them, and
 * AmountInput's currency chip was a hand copy of CurrencySelect's list that had drifted.
 * CurrencySelect and GroupedPicker also announced roles they did not implement: a
 * combobox with a listbox popup over a list of plain buttons, and a "dialog" popup that
 * was no dialog, the choice shown by colour alone.
 */

function asPhone() {
  stubViewportWidth(PHONE_WIDTH, { coarse: true, reducedMotion: true });
}

const original = window.matchMedia;
afterEach(() => {
  window.matchMedia = original;
});

const activeOption = (box: HTMLElement) => {
  const id = box.getAttribute("aria-activedescendant");
  return id ? document.getElementById(id) : null;
};

describe("CurrencySelect is a real listbox (BUG-12)", () => {
  function Host({ onChange = vi.fn() }: { onChange?: (code: string) => void }) {
    const [code, setCode] = useState("CHF");
    return (
      <div data-testid="wrapper" style={{ overflow: "hidden" }}>
        <CurrencySelect
          label="Currency"
          value={code}
          options={["EUR", "CHF", "USD"]}
          onChange={(c) => {
            onChange(c);
            setCode(c);
          }}
        />
      </div>
    );
  }

  it("the trigger's listbox holds options, the chosen one selected", () => {
    render(<Host />);
    const trigger = screen.getByRole("combobox", { name: /Currency/ });
    fireEvent.click(trigger);
    const list = screen.getByRole("listbox");
    expect(trigger).toHaveAttribute("aria-controls", list.id);
    const options = within(list).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining("EUR"),
      expect.stringContaining("CHF"),
      expect.stringContaining("USD"),
    ]);
    expect(options.map((o) => o.getAttribute("aria-selected"))).toEqual(["false", "true", "false"]);
  });

  it("the arrow keys move the highlight and Enter takes it", () => {
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Currency/ }));
    const search = screen.getByRole("textbox");
    expect(search).toHaveAttribute("aria-controls", screen.getByRole("listbox").id);
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(activeOption(search)).toHaveTextContent("CHF");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(activeOption(search)).toHaveTextContent("USD");
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("USD");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("is portalled out of an overflow ancestor (dev#548), and says how many rows it holds", () => {
    render(<Host />);
    fireEvent.click(screen.getByRole("combobox", { name: /Currency/ }));
    expect(screen.getByTestId("wrapper")).not.toContainElement(screen.getByRole("listbox"));
    expect(screen.getByRole("status")).toHaveTextContent("3 results");
  });

  it("is a full-screen sheet on a phone", () => {
    asPhone();
    render(<Host />);
    fireEvent.click(screen.getByRole("combobox", { name: /Currency/ }));
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByRole("listbox")).toBeInTheDocument();
    expect(within(sheet).getByText("Currency")).toBeInTheDocument();
  });
});

describe("AmountInput's currency chip renders CurrencySelect's list (DUP-4)", () => {
  function chip() {
    return screen.getByRole("button", { name: /^Currency/ });
  }

  it("a listbox with the chosen currency selected and checked, its name wrapping from Large up", () => {
    render(<AmountInput label="Amount" value="" onChange={vi.fn()} currency="CHF" onCurrencyChange={vi.fn()} />);
    fireEvent.click(chip());
    const list = screen.getByRole("listbox");
    expect(chip()).toHaveAttribute("aria-haspopup", "listbox");
    expect(chip()).toHaveAttribute("aria-expanded", "true");
    expect(chip()).toHaveAttribute("aria-controls", list.id);
    const chf = within(list).getByRole("option", { name: /CHF/ });
    expect(chf).toHaveAttribute("aria-selected", "true");
    expect(chf.querySelector("svg")).not.toBeNull();
    expect(within(chf).getByText("Swiss Franc")).toHaveClass("truncate-until-large");
  });

  it("takes the subset CurrencySelect takes, and picks with the keyboard", () => {
    const onCurrencyChange = vi.fn();
    render(
      <AmountInput
        label="Amount"
        value=""
        onChange={vi.fn()}
        currency="EUR"
        currencyOptions={["EUR", "CHF"]}
        onCurrencyChange={onCurrencyChange}
      />,
    );
    fireEvent.click(chip());
    expect(screen.getAllByRole("option")).toHaveLength(2);
    const search = screen.getByRole("textbox", { name: /Search/ });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onCurrencyChange).toHaveBeenCalledWith("CHF");
  });

  it("is a full-screen sheet on a phone", () => {
    asPhone();
    render(<AmountInput label="Amount" value="" onChange={vi.fn()} currency="CHF" onCurrencyChange={vi.fn()} />);
    fireEvent.click(chip());
    expect(within(screen.getByRole("dialog")).getByRole("listbox")).toBeInTheDocument();
  });
});

describe("MultiSelect on the shared panel (DUP-4)", () => {
  const OPTIONS = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta", disabled: true },
    { value: "c", label: "Gamma" },
  ];

  it("is portalled, counts its rows, and passes over a disabled row", () => {
    const onChange = vi.fn();
    render(
      <div data-testid="wrapper" style={{ overflow: "hidden" }}>
        <MultiSelect label="Tags" options={OPTIONS} value={[]} onChange={onChange} />
      </div>,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /Tags/ }));
    const list = screen.getByRole("listbox");
    expect(screen.getByTestId("wrapper")).not.toContainElement(list);
    expect(screen.getByRole("status")).toHaveTextContent("3 results");
    expect(within(list).getByRole("option", { name: /Beta/ })).toHaveAttribute("aria-disabled", "true");
    const search = screen.getByRole("textbox", { name: /Search/ });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(activeOption(search)).toHaveTextContent("Gamma");
    fireEvent.mouseDown(within(list).getByRole("option", { name: /Beta/ }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is a full-screen sheet on a phone, with Select all and Clear", () => {
    asPhone();
    const onChange = vi.fn();
    render(<MultiSelect label="Tags" options={OPTIONS} value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Tags/ }));
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByRole("listbox")).toHaveAttribute("aria-multiselectable", "true");
    fireEvent.click(within(sheet).getByRole("button", { name: "Select all" }));
    // The disabled row is not taken by "Select all".
    expect(onChange).toHaveBeenCalledWith(["a", "c"]);
  });
});

describe("GroupedPicker is a listbox of grouped options (BUG-12)", () => {
  const GROUPS: PickerGroup[] = [
    {
      key: "food",
      label: "Food",
      items: [
        { key: "bread", label: "Bread" },
        { key: "milk", label: "Milk" },
      ],
    },
    {
      key: "home",
      label: "Home",
      items: [
        { key: "rent", label: "Rent" },
        { key: "milk", label: "Milk" },
      ],
    },
  ];

  function renderPicker(onSelect = vi.fn()) {
    render(
      <div data-testid="wrapper" style={{ overflow: "hidden" }}>
        <GroupedPicker
          aria-label="Category"
          buttonLabel="Food · Milk"
          groups={GROUPS}
          selected={{ group: "home", item: "milk" }}
          onSelect={onSelect}
          filterPlaceholder="Filter categories"
        />
      </div>,
    );
    return onSelect;
  }

  it("the trigger promises the listbox it opens; the chosen item is selected, not only coloured", () => {
    renderPicker();
    const trigger = screen.getByRole("combobox", { name: /Category/ });
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    fireEvent.click(trigger);
    const list = screen.getByRole("listbox");
    expect(trigger).toHaveAttribute("aria-controls", list.id);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("wrapper")).not.toContainElement(list);
    const home = within(list).getByRole("group", { name: "Home" });
    expect(within(home).getByRole("option", { name: "Milk" })).toHaveAttribute("aria-selected", "true");
    const food = within(list).getByRole("group", { name: "Food" });
    expect(within(food).getByRole("option", { name: "Milk" })).toHaveAttribute("aria-selected", "false");
  });

  it("names its search box, and keeps a whole group whose name matches", () => {
    renderPicker();
    fireEvent.click(screen.getByRole("combobox", { name: /Category/ }));
    const search = screen.getByRole("textbox", { name: "Filter categories" });
    fireEvent.change(search, { target: { value: "home" } });
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Rent", "Milk"]);
  });

  it("picks with the keyboard, reporting the group and the item", () => {
    const onSelect = renderPicker();
    fireEvent.click(screen.getByRole("combobox", { name: /Category/ }));
    const search = screen.getByRole("textbox", { name: "Filter categories" });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("food", "milk");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("is a full-screen sheet on a phone", () => {
    asPhone();
    const onSelect = renderPicker();
    fireEvent.click(screen.getByRole("combobox", { name: /Category/ }));
    const sheet = screen.getByRole("dialog");
    act(() => {
      fireEvent.mouseDown(within(sheet).getAllByRole("option", { name: "Rent" })[0]);
    });
    expect(onSelect).toHaveBeenCalledWith("home", "rent");
  });
});

// DUP-4's last copy: Autocomplete hand-rolled its rows with plain `truncate`, beside the
// `suggestionRowClass` the core exports as "one look for Combobox, InlineEntityCombobox
// and Autocomplete" — so a long address was cut at Large, where every other list wraps.
describe("Autocomplete's rows are the family's suggestion rows (DUP-4)", () => {
  it("wraps a long label from Large up, and highlights as the others do", () => {
    function Harness() {
      const [value, setValue] = useState("");
      return (
        <Autocomplete<string>
          label="Address"
          value={value}
          onChange={setValue}
          options={[
            { value: "1", label: "Bahnhofstrasse 1, 8001 Zürich", sublabel: "Kreis 1" },
            { value: "2", label: "Rue de Lausanne 12, 1201 Genève" },
          ]}
        />
      );
    }
    render(<Harness />);
    const field = screen.getByRole("combobox", { name: "Address" });
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "e" } });
    const first = screen.getAllByRole("option")[0];
    expect(within(first).getByText("Bahnhofstrasse 1, 8001 Zürich")).toHaveClass("truncate-until-large");
    expect(within(first).getByText("Kreis 1")).toHaveClass("truncate-until-large");
    fireEvent.keyDown(field, { key: "ArrowDown" });
    expect(activeOption(field)?.className).toContain("bg-active");
  });
});
