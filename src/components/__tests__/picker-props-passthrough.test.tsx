import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Combobox, InlineEntityCombobox } from "../combobox";
import { ComboboxPanel, useComboboxCore } from "../combobox-core";
import { EntityCombobox } from "../entity-combobox";
import { MultiEntityCombobox } from "../multi-entity-combobox";
import { MultiSelect } from "../multi-select";
import { GroupedPicker } from "../grouped-picker";
import { PickerSheet } from "../picker-sheet";
import { CurrencySelect } from "../currency-select";
import { DropdownPanel, DropdownSearchHeader, useDropdownSearch } from "../dropdown";

/**
 * The audit's §api-design, on the nine pickers: *"~35 components accept no ...rest, so
 * the package's own tour cannot anchor to them"* and *"Three different prop names for
 * the accessible name"*.
 *
 * Both findings are about what a CONSUMER can do from outside. A closed prop list is
 * not a smaller API, it is an API with a wall around it: keksdose's rule editor wraps
 * `ToggleGroup` in a div purely to have something to hang an attribute on, and a
 * `data-tour` anchor, a test id or an `aria-describedby` pointing at a form-level hint
 * had no way in at all. So these assert the two things a wrapper needs and nothing
 * about how a component is built:
 *
 *   (a) an arbitrary `data-*` attribute reaches the DOM — written as `data-tour`,
 *       because the kit's own guided tour is the first caller that needs it;
 *   (b) `"aria-label"` — the DOM spelling, which every one of these now takes — names
 *       the CONTROL, not the positioning wrapper it happens to sit in, and beats the
 *       name the component would otherwise compose from `label` + value.
 *
 * `GroupedPicker` additionally keeps its old `ariaLabel` spelling working, and only
 * when `"aria-label"` is absent: three apps are on it, and removing it is a later
 * minor. Everything else in this file already spoke the DOM spelling or had no
 * accessible-name prop at all, so nothing else grew a deprecated alias.
 *
 * The queries are `getByRole(..., { name })`, i.e. the accessible name as a reader
 * computes it — never the attribute — so a component is free to move where it hangs
 * the label as long as the announcement stays the same.
 */
const OPTIONS = [
  { value: "a", label: "Checking" },
  { value: "b", label: "Savings" },
];

/** What the tour would anchor to, found the way a tour finds it. */
const tourAnchor = () => document.querySelector("[data-tour='payee']");

describe("Combobox passes DOM props through", () => {
  it("puts an arbitrary data-* attribute on its root", () => {
    render(
      <Combobox value="" onChange={vi.fn()} options={["Rewe"]} label="Payee" data-tour="payee" />,
    );
    expect(tourAnchor()).not.toBeNull();
  });

  it("names the field from aria-label, over the floating label", () => {
    render(
      <Combobox
        value=""
        onChange={vi.fn()}
        options={["Rewe"]}
        label="Payee"
        aria-label="Payee, free text"
      />,
    );
    expect(screen.getByRole("combobox", { name: "Payee, free text" })).toBeInTheDocument();
  });
});

describe("InlineEntityCombobox passes DOM props through", () => {
  it("puts an arbitrary data-* attribute on its root", () => {
    render(
      <InlineEntityCombobox<string>
        value={null}
        onChange={vi.fn()}
        options={OPTIONS}
        label="Account"
        data-tour="payee"
      />,
    );
    expect(tourAnchor()).not.toBeNull();
  });

  it("names the field from aria-label, over the floating label", () => {
    render(
      <InlineEntityCombobox<string>
        value={null}
        onChange={vi.fn()}
        options={OPTIONS}
        label="Account"
        aria-label="Account, searchable"
      />,
    );
    expect(screen.getByRole("combobox", { name: "Account, searchable" })).toBeInTheDocument();
  });
});

/** The panel is only rendered while the core is open, and it anchors to the trigger. */
function PanelHarness({ tour, name }: { tour?: string; name?: string }) {
  const core = useComboboxCore<string>({ options: OPTIONS });
  return (
    <div>
      {/* The two ref reads below are what every caller of this panel does — the kit's
          own `EntityCombobox` hands the core straight to it — and the rule's backlog
          is recorded in eslint.config.js, so a harness must not pad it. */}
      {/* eslint-disable-next-line react-hooks/refs -- the core's trigger ref, attached exactly as EntityCombobox attaches it */}
      <button type="button" ref={core.triggerRef} onClick={() => core.setOpen(true)}>
        open
      </button>
      <ComboboxPanel
        // eslint-disable-next-line react-hooks/refs -- the core carries refs by design; this is the component's documented API
        core={core}
        listboxId="lb"
        emptyLabel="No results"
        isSelected={() => false}
        onChoose={vi.fn()}
        showCreate={false}
        onCreate={vi.fn()}
        createContent={null}
        data-tour={tour}
        aria-label={name}
      />
    </div>
  );
}

describe("ComboboxPanel passes DOM props through", () => {
  it("puts an arbitrary data-* attribute on the panel", () => {
    render(<PanelHarness tour="payee" />);
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    expect(tourAnchor()).not.toBeNull();
  });

  it("takes an aria-label", () => {
    render(<PanelHarness name="Account options" />);
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    expect(screen.getByLabelText("Account options")).toBeInTheDocument();
  });
});

describe("EntityCombobox passes DOM props through", () => {
  it("puts an arbitrary data-* attribute on its root", () => {
    render(
      <EntityCombobox<string>
        value={null}
        onChange={vi.fn()}
        options={OPTIONS}
        label="Account"
        data-tour="payee"
      />,
    );
    expect(tourAnchor()).not.toBeNull();
  });

  it("names the trigger from aria-label, over the composed label + value", () => {
    render(
      <EntityCombobox<string>
        value="a"
        onChange={vi.fn()}
        options={OPTIONS}
        label="Account"
        aria-label="Account, from"
      />,
    );
    expect(screen.getByRole("combobox", { name: "Account, from" })).toBeInTheDocument();
  });
});

describe("MultiEntityCombobox passes DOM props through", () => {
  it("puts an arbitrary data-* attribute on its root", () => {
    render(
      <MultiEntityCombobox<string>
        value={[]}
        onChange={vi.fn()}
        options={OPTIONS}
        label="Accounts"
        data-tour="payee"
      />,
    );
    expect(tourAnchor()).not.toBeNull();
  });

  it("names the trigger from aria-label, over the composed label + summary", () => {
    render(
      <MultiEntityCombobox<string>
        value={["a"]}
        onChange={vi.fn()}
        options={OPTIONS}
        label="Accounts"
        aria-label="Accounts, included"
      />,
    );
    expect(screen.getByRole("combobox", { name: "Accounts, included" })).toBeInTheDocument();
  });
});

describe("MultiSelect passes DOM props through", () => {
  it("puts an arbitrary data-* attribute on its root", () => {
    render(
      <MultiSelect
        options={[{ value: "a", label: "Checking" }]}
        values={[]}
        onChange={vi.fn()}
        label="Accounts"
        data-tour="payee"
      />,
    );
    expect(tourAnchor()).not.toBeNull();
  });

  it("names the trigger from aria-label, over the composed label + summary", () => {
    render(
      <MultiSelect
        options={[{ value: "a", label: "Checking" }]}
        values={["a"]}
        onChange={vi.fn()}
        label="Accounts"
        aria-label="Accounts, filtered"
      />,
    );
    expect(screen.getByRole("combobox", { name: "Accounts, filtered" })).toBeInTheDocument();
  });
});

const GROUPS = [{ key: "food", label: "Food", items: [{ key: "rewe", label: "Rewe" }] }];

describe("GroupedPicker passes DOM props through", () => {
  it("puts an arbitrary data-* attribute on its root", () => {
    render(
      <GroupedPicker
        groups={GROUPS}
        buttonLabel="Pick"
        selected={null}
        onSelect={vi.fn()}
        data-tour="payee"
      />,
    );
    expect(tourAnchor()).not.toBeNull();
  });

  it("names its trigger from aria-label", () => {
    render(
      <GroupedPicker
        groups={GROUPS}
        buttonLabel="Pick"
        selected={null}
        onSelect={vi.fn()}
        aria-label="Category"
      />,
    );
    expect(screen.getByRole("button", { name: "Category" })).toBeInTheDocument();
  });

  it("still names its trigger from the deprecated ariaLabel", () => {
    render(
      <GroupedPicker
        groups={GROUPS}
        buttonLabel="Pick"
        selected={null}
        onSelect={vi.fn()}
        ariaLabel="Category"
      />,
    );
    expect(screen.getByRole("button", { name: "Category" })).toBeInTheDocument();
  });

  it("lets aria-label win when both spellings are given", () => {
    render(
      <GroupedPicker
        groups={GROUPS}
        buttonLabel="Pick"
        selected={null}
        onSelect={vi.fn()}
        ariaLabel="Old"
        aria-label="New"
      />,
    );
    expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();
  });
});

describe("PickerSheet passes DOM props through", () => {
  it("puts an arbitrary data-* attribute on the sheet", () => {
    render(
      <PickerSheet
        open
        onClose={vi.fn()}
        title="Account"
        query=""
        onQueryChange={vi.fn()}
        data-tour="payee"
      >
        <button type="button">Wallet</button>
      </PickerSheet>,
    );
    expect(tourAnchor()).not.toBeNull();
  });

  it("names the dialog from aria-label, over the title", () => {
    render(
      <PickerSheet
        open
        onClose={vi.fn()}
        title="Account"
        query=""
        onQueryChange={vi.fn()}
        aria-label="Choose an account"
      >
        <button type="button">Wallet</button>
      </PickerSheet>,
    );
    expect(screen.getByRole("dialog", { name: "Choose an account" })).toBeInTheDocument();
  });

  it("keeps the visual-viewport correction when a caller also passes a style", () => {
    render(
      <PickerSheet
        open
        onClose={vi.fn()}
        title="Account"
        query=""
        onQueryChange={vi.fn()}
        style={{ zIndex: 99 }}
      >
        <button type="button">Wallet</button>
      </PickerSheet>,
    );
    expect(screen.getByRole("dialog").style.zIndex).toBe("99");
  });
});

describe("CurrencySelect passes DOM props through", () => {
  it("puts an arbitrary data-* attribute on its root", () => {
    render(<CurrencySelect value="CHF" onChange={vi.fn()} data-tour="payee" />);
    expect(tourAnchor()).not.toBeNull();
  });

  it("names its trigger from aria-label", () => {
    render(<CurrencySelect value="CHF" onChange={vi.fn()} aria-label="Currency" />);
    expect(screen.getByRole("combobox", { name: "Currency" })).toBeInTheDocument();
  });
});

function SearchHeaderHarness({ tour, name }: { tour?: string; name?: string }) {
  const { query, setQuery, inputRef } = useDropdownSearch();
  return (
    <DropdownSearchHeader
      query={query}
      onQueryChange={setQuery}
      inputRef={inputRef}
      data-tour={tour}
      aria-label={name}
    />
  );
}

describe("DropdownSearchHeader passes DOM props through", () => {
  it("puts an arbitrary data-* attribute on its root", () => {
    render(<SearchHeaderHarness tour="payee" />);
    expect(tourAnchor()).not.toBeNull();
  });

  it("names the search box from aria-label", () => {
    render(<SearchHeaderHarness name="Filter currencies" />);
    expect(screen.getByRole("textbox", { name: "Filter currencies" })).toBeInTheDocument();
  });
});

describe("DropdownPanel passes DOM props through", () => {
  it("puts an arbitrary data-* attribute on the panel", () => {
    render(
      <DropdownPanel data-tour="payee">
        <li>
          <button type="button">CHF</button>
        </li>
      </DropdownPanel>,
    );
    expect(tourAnchor()).not.toBeNull();
  });

  it("takes an aria-label", () => {
    render(
      <DropdownPanel aria-label="Currencies">
        <li>
          <button type="button">CHF</button>
        </li>
      </DropdownPanel>,
    );
    expect(screen.getByLabelText("Currencies")).toBeInTheDocument();
  });
});
