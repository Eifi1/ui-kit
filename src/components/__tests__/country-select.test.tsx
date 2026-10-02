import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { CountrySelect, DEFAULT_COUNTRY_SELECT_LABELS, type CountrySelectProps } from "../country-select";
import { FieldHint } from "../ui";
import { WriteLockProvider } from "../write-lock";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * CountrySelect — kastlan (addresses, its six neighbours on top) and keksdose (the
 * bank picker's fifteen countries). The value is the alpha-2 code; the names are the
 * runtime's, in the provider's locale.
 */

const KEKSDOSE_BANKS = ["DE", "AT", "CH", "FR", "IT", "ES", "NL", "BE", "PT", "PL", "SE", "DK", "FI", "GB", "IE"];
const KASTLAN_PREFERRED = ["CH", "LI", "DE", "AT", "FR", "IT"];

function Host({ initial = null, ...props }: Partial<CountrySelectProps> & { initial?: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <CountrySelect
      label="Country"
      {...props}
      value={value}
      onChange={(code) => {
        setValue(code);
        props.onChange?.(code);
      }}
    />
  );
}

const trigger = () => screen.getByRole("combobox", { name: /Country|Land/ });

function openList() {
  fireEvent.click(trigger());
  return screen.getByRole("listbox");
}

/** The option names in list order. */
function optionNames(list: HTMLElement) {
  return within(list)
    .getAllByRole("option")
    .map((o) => o.textContent ?? "");
}

/** Headings and options, as a reader walks the list. */
function rows(list: HTMLElement) {
  return Array.from(list.querySelectorAll("li")).map((li) => li.textContent ?? "");
}

/** The sheet only exists on a phone; jsdom has no matchMedia (the desktop fallback). */
function asPhone() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("CountrySelect: value and names", () => {
  it("shows the code's name and is named 'label: country'", () => {
    render(<Host initial="CH" />);
    expect(screen.getByRole("combobox", { name: "Country: Switzerland" })).toHaveTextContent("Switzerland");
  });

  it("names the countries in the provider's locale", () => {
    render(
      <UiKitProvider locale="de-CH">
        <Host label="Land" initial="AT" />
      </UiKitProvider>,
    );
    expect(screen.getByRole("combobox", { name: "Land: Österreich" })).toBeInTheDocument();
  });

  it("takes the value in either case and emits the code upper-case", () => {
    const onChange = vi.fn();
    render(<Host initial="ch" onChange={onChange} />);
    expect(trigger()).toHaveTextContent("Switzerland");
    const list = openList();
    fireEvent.mouseDown(within(list).getByRole("option", { name: "Liechtenstein" }));
    expect(onChange).toHaveBeenCalledWith("LI");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger()).toHaveTextContent("Liechtenstein");
  });

  it("shows a value outside `countries` by name — the list restricts picking, not showing", () => {
    render(<Host initial="JP" countries={KEKSDOSE_BANKS} />);
    expect(trigger()).toHaveTextContent("Japan");
  });

  it("is never nameless: no label falls back to the `country` word", () => {
    render(<CountrySelect value={null} onChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Country" })).toHaveTextContent("Country");
  });

  it("an explicit aria-label wins", () => {
    render(<CountrySelect aria-label="Bank country" value="DE" onChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Bank country" })).toBeInTheDocument();
  });
});

describe("CountrySelect: the list", () => {
  it("offers every ISO country by default, sorted by the locale's collation", () => {
    render(
      <UiKitProvider locale="de-CH">
        <Host label="Land" />
      </UiKitProvider>,
    );
    const names = optionNames(openList());
    expect(names).toHaveLength(249);
    const collated = [...names].sort(new Intl.Collator("de-CH").compare);
    expect(names).toEqual(collated);
    // Collation, not code points: Ö files under O, not after Z.
    expect(names.indexOf("Österreich")).toBeLessThan(names.indexOf("Panama"));
  });

  it("`countries` restricts the list (keksdose's fifteen bank countries), sorted by name", () => {
    render(<Host countries={[...KEKSDOSE_BANKS, "de", "nonsense"]} />);
    const names = optionNames(openList());
    expect(names).toHaveLength(15);
    expect(names[0]).toBe("Austria");
    expect(names).toContain("United Kingdom");
    expect(names).not.toContain("Japan");
  });

  it("`preferred` goes first, in the order given, and the rest below a heading — each country once", () => {
    render(
      <UiKitProvider locale="de-CH">
        <Host label="Land" preferred={KASTLAN_PREFERRED} />
      </UiKitProvider>,
    );
    const list = openList();
    const walk = rows(list);
    expect(walk.slice(0, 7)).toEqual([
      "Schweiz",
      "Liechtenstein",
      "Deutschland",
      "Österreich",
      "Frankreich",
      "Italien",
      DEFAULT_COUNTRY_SELECT_LABELS.others,
    ]);
    const names = optionNames(list);
    expect(names).toHaveLength(249);
    expect(names.filter((n) => n === "Schweiz")).toHaveLength(1);
  });

  it("`preferred` codes outside `countries` are dropped", () => {
    render(<Host countries={["DE", "AT"]} preferred={["CH", "AT"]} />);
    expect(rows(openList())).toEqual(["Austria", "Other countries", "Germany"]);
  });

  it("flags are flag-icons spans when asked for, in the rows and on the trigger", () => {
    const { container } = render(<Host initial="CH" flags countries={["CH", "DE"]} />);
    expect(container.querySelector(".fi.fi-ch")).not.toBeNull();
    const list = openList();
    expect(list.querySelector(".fi.fi-de")).not.toBeNull();
  });

  it("draws no flags by default — the kit ships no flag stylesheet", () => {
    const { container } = render(<Host initial="CH" />);
    openList();
    expect(container.querySelector(".fi")).toBeNull();
    expect(document.querySelector(".fi")).toBeNull();
  });
});

describe("CountrySelect: search", () => {
  const typeQuery = (q: string) => fireEvent.change(screen.getByRole("textbox"), { target: { value: q } });

  it("ignores accents and case", () => {
    render(
      <UiKitProvider locale="de-CH">
        <Host label="Land" />
      </UiKitProvider>,
    );
    const list = openList();
    typeQuery("osterreich");
    expect(optionNames(list)).toEqual(["Österreich"]);
  });

  it("an exact code ranks first, then names that start with the query, then the rest", () => {
    render(<Host />);
    const list = openList();
    typeQuery("ch");
    const names = optionNames(list);
    expect(names[0]).toBe("Switzerland");
    expect(names.indexOf("Chad")).toBeLessThan(names.indexOf("Czechia"));
  });

  it("keeps preferred matches on top, and drops the heading when none match", () => {
    render(<Host preferred={KASTLAN_PREFERRED} />);
    const list = openList();
    typeQuery("land");
    // Switzerland is preferred; the others are below the heading.
    expect(rows(list).slice(0, 2)).toEqual(["Switzerland", "Other countries"]);
    typeQuery("japan");
    expect(rows(list)).toEqual(["Japan"]);
  });

  it("Enter takes the highlighted row", () => {
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    openList();
    typeQuery("liech");
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("LI");
  });

  it("the search box takes the label", () => {
    render(<Host labels={{ search: "Land suchen" }} />);
    openList();
    expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "Land suchen");
  });
});

describe("CountrySelect: field anatomy", () => {
  it("a text hint is a caption under the field, describing the trigger", () => {
    render(<Host hint="Where the bank is registered" />);
    const caption = screen.getByText("Where the bank is registered");
    expect(trigger()).toHaveAttribute("aria-describedby", expect.stringContaining(caption.id));
  });

  it("a FieldHint rides the label line", () => {
    render(<Host hint={<FieldHint label="ISO 3166 country" />} />);
    const help = screen.getByRole("button", { name: "ISO 3166 country" });
    // The row the label and the "?" share, inside the field's own box.
    const row = help.closest("div");
    expect(row?.querySelector("label")).toHaveTextContent("Country");
  });

  it("an error is shown, described and marks the field invalid; the hint stays first", () => {
    render(<Host hint="Required" error="Pick a country" />);
    const t = trigger();
    expect(t).toHaveAttribute("aria-invalid", "true");
    const ids = (t.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual(["Required", "Pick a country"]);
  });

  it("the label is a <label for> pointing at the trigger", () => {
    render(<Host />);
    expect(screen.getByLabelText("Country")).toBe(trigger());
  });

  it("disabled: no list, out of the tab order", () => {
    render(<Host disabled />);
    expect(trigger()).toBeDisabled();
    fireEvent.click(trigger());
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

describe("CountrySelect: the write lock", () => {
  it("a disabledReason keeps the trigger focusable, opens nothing and says why", () => {
    const onChange = vi.fn();
    render(<Host disabledReason="Signed handovers cannot change" onChange={onChange} />);
    const t = trigger();
    expect(t).not.toBeDisabled();
    expect(t).toHaveAttribute("aria-disabled", "true");
    t.focus();
    expect(t).toHaveFocus();
    fireEvent.click(t);
    fireEvent.keyDown(t, { key: "ArrowDown" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    const described = (t.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent);
    expect(described).toContain("Signed handovers cannot change");
  });

  it("`commit` locks under a locked WriteLockProvider, with the lock's reason", () => {
    render(
      <WriteLockProvider locked reason="Shared with you to read.">
        <Host commit />
      </WriteLockProvider>,
    );
    expect(trigger()).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(trigger());
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    const ids = (trigger().getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toContain("Shared with you to read.");
  });

  it("without `commit` the field stays editable under the lock — its form's Save is the commit", () => {
    render(
      <WriteLockProvider locked>
        <Host />
      </WriteLockProvider>,
    );
    expect(trigger()).not.toHaveAttribute("aria-disabled");
    expect(openList()).toBeInTheDocument();
  });

  it("a lock arriving while the list is open closes it", () => {
    const { rerender } = render(<CountrySelect value={null} onChange={() => {}} />);
    fireEvent.click(trigger());
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    rerender(<CountrySelect value={null} onChange={() => {}} disabledReason="Locked" />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });
});

describe("CountrySelect on a phone", () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it("opens the full-screen sheet, titled by the label, with the whole list to search", () => {
    asPhone();
    const onChange = vi.fn();
    render(<Host label="Bank country" countries={KEKSDOSE_BANKS} preferred={["CH"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Bank country" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Bank country")).toBeInTheDocument();
    const list = within(dialog).getByRole("listbox");
    expect(optionNames(list)).toHaveLength(15);
    expect(rows(list).slice(0, 2)).toEqual(["Switzerland", "Other countries"]);
    fireEvent.mouseDown(within(list).getByRole("option", { name: "Ireland" }));
    expect(onChange).toHaveBeenCalledWith("IE");
  });
});
