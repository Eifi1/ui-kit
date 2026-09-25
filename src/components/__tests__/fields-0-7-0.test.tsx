import { createRef, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { Button, IconButton, Input, Select, Textarea } from "../ui";
import { MultiSelect } from "../multi-select";
import { CurrencySelect } from "../currency-select";
import { EntityCombobox } from "../entity-combobox";
import { Combobox, InlineEntityCombobox } from "../combobox";
import { NumberInput } from "../number-input";
import { AmountInput } from "../amount-input";
import { SearchField } from "../search-field";
import { FieldSyncRow, useFieldSync } from "../field-sync";
import { ChoiceCard, ChoiceCardGroup } from "../choice-card";
import { DropdownPanel, useDropdown } from "../dropdown";
import type { ComboOption } from "../combobox-core";

/**
 * The 0.7.0 field pass: the RTL audit, the list-box Select, ChoiceCard's `required`,
 * InlineEntityCombobox's disabled look, EntityCombobox's loading-with-rows,
 * MultiSelect's `error`/`disabled`, the entity pickers' `clearValue`, and Button's ref.
 */

const OPTIONS: ComboOption<string>[] = [
  { value: "a", label: "Checking" },
  { value: "b", label: "Savings" },
];

/** A physical side in a class list — what the RTL audit removed from the fields. */
const PHYSICAL =
  /(^|\s|:)(-?(ml|mr|pl|pr|left|right)-\S+|text-left|text-right|rounded-[lr](-\S+)?|rounded-[tb][lr](-\S+)?|border-[lr](-\S+)?)(?=\s|$)/;

function physicalClasses(root: ParentNode): string[] {
  const hits: string[] = [];
  for (const el of root.querySelectorAll("[class]")) {
    const cls = el.getAttribute("class") ?? "";
    if (PHYSICAL.test(cls)) hits.push(cls);
  }
  return hits;
}

function rtl(ui: React.ReactNode) {
  return render(<div dir="rtl">{ui}</div>);
}

describe("RTL: no physical sides in the field chrome", () => {
  it("Input — floating label, password reveal, error row", () => {
    const { container } = rtl(
      <>
        <Input label="Name" error="Required" />
        <Input label="Password" type="password" />
        <Input type="password" aria-label="Unlabelled password" />
        <Textarea label="Notes" />
      </>,
    );
    expect(physicalClasses(container)).toEqual([]);
    const toggle = screen.getAllByRole("button", { name: "Show password" })[0];
    expect(toggle.className).toMatch(/(^|\s)end-0(\s|$)/);
    expect(toggle.className).toContain("rounded-e-md");
    expect(screen.getByText("Name").className).toContain("start-3");
  });

  it("Select — chevron and padding at the end, small and labelled", () => {
    const { container } = rtl(
      <>
        <Select label="Kind">
          <option>One</option>
        </Select>
        <Select size="sm" aria-label="Compact">
          <option>One</option>
        </Select>
      </>,
    );
    expect(physicalClasses(container)).toEqual([]);
    const chevrons = container.querySelectorAll("svg");
    expect(chevrons[0].getAttribute("class")).toMatch(/(^|\s)end-2\.5(\s|$)/);
    expect(chevrons[1].getAttribute("class")).toMatch(/(^|\s)end-1\.5(\s|$)/);
    expect(screen.getByRole("combobox", { name: "Compact" }).className).toContain("pe-7");
  });

  it("the dropdown pickers — MultiSelect, CurrencySelect", () => {
    const { container } = rtl(
      <>
        <MultiSelect label="Tags" options={[{ value: 1, label: "One" }]} values={[]} onChange={() => {}} error="Pick one" />
        <CurrencySelect label="Currency" value="EUR" onChange={() => {}} />
      </>,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /Tags/ }));
    expect(physicalClasses(container)).toEqual([]);
    fireEvent.click(screen.getByRole("combobox", { name: /Currency/ }));
    expect(physicalClasses(container)).toEqual([]);
  });

  it("the comboboxes — chevron and clear at the end", () => {
    const { container } = rtl(
      <>
        <EntityCombobox label="Account" value="a" options={OPTIONS} clearable onChange={() => {}} />
        <InlineEntityCombobox label="Category" value="a" options={OPTIONS} clearable onChange={() => {}} />
        <InlineEntityCombobox label="Other" value={null} options={OPTIONS} onChange={() => {}} />
        <Combobox label="Payee" value="" options={["Shop"]} onChange={() => {}} groupBy={() => "G"} />
      </>,
    );
    expect(physicalClasses(container)).toEqual([]);
    for (const clear of screen.getAllByLabelText("Clear")) {
      expect(clear.getAttribute("class")).toMatch(/(^|\s)end-2(\s|$)/);
    }
  });

  it("the entity combobox's portalled panel carries the form's direction and hangs from the start edge", () => {
    rtl(<EntityCombobox label="Account" value={null} options={OPTIONS} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Account/ }));
    const panel = screen.getByRole("listbox").closest("[dir]") as HTMLElement;
    expect(panel).toHaveAttribute("dir", "rtl");
    expect(panel.style.left).toBe("");
    expect(panel.style.right).not.toBe("");
    expect(physicalClasses(document.body)).toEqual([]);
  });

  it("NumberInput and AmountInput — adornments and their padding at the end", () => {
    const { container } = rtl(
      <>
        <NumberInput label="Rate" value="1" suffix="%" onChange={() => {}} />
        <AmountInput label="Amount" value="1" currency="EUR" onChange={() => {}} onCurrencyChange={() => {}} />
      </>,
    );
    expect(physicalClasses(container)).toEqual([]);
    const [rate, amount] = container.querySelectorAll("input");
    expect(rate.className).toContain("pe-16");
    expect(amount.className).toContain("pe-24");
    expect(screen.getByText("%").parentElement!.className).toMatch(/(^|\s)end-0(\s|$)/);
  });

  it("SearchField and FieldSyncRow", () => {
    function Synced() {
      const sync = useFieldSync({ value: "x", onSave: () => {} });
      return (
        <FieldSyncRow sync={sync}>
          <Input aria-label="Synced" value={sync.value} onChange={(e) => sync.setValue(e.target.value)} />
        </FieldSyncRow>
      );
    }
    const { container } = rtl(
      <>
        <SearchField aria-label="Search" value="q" onChange={() => {}} clearLabel="Clear search" />
        <Synced />
      </>,
    );
    fireEvent.change(screen.getByLabelText("Synced"), { target: { value: "y" } });
    expect(physicalClasses(container)).toEqual([]);
    expect(screen.getByRole("button", { name: "Clear search" }).className).toMatch(/(^|\s)end-2(\s|$)/);
  });

  it("ChoiceCard", () => {
    const { container } = rtl(<ChoiceCard title="Rent" description="Monthly" required error="Wrong" />);
    expect(physicalClasses(container)).toEqual([]);
  });
});

describe("DropdownPanel alignment follows the trigger's direction", () => {
  function Harness() {
    const { panelRef } = useDropdown();
    const anchor = useRef<HTMLButtonElement>(null);
    return (
      <>
        <button ref={anchor} type="button">
          trigger
        </button>
        <DropdownPanel anchorRef={anchor} panelRef={panelRef} width={256}>
          <li>row</li>
        </DropdownPanel>
      </>
    );
  }
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: 600, right: 700, width: 100, top: 10, bottom: 40, height: 30, x: 600, y: 10, toJSON: () => ({}),
    } as DOMRect);
  });
  afterEach(() => vi.restoreAllMocks());

  it("end-aligns to the trigger's right edge in LTR", () => {
    render(<Harness />);
    const panel = screen.getByText("row").closest("[dir]") as HTMLElement;
    expect(panel).toHaveAttribute("dir", "ltr");
    expect(panel.style.left).toBe(`${700 - 256}px`);
  });

  it("end-aligns to the trigger's LEFT edge in RTL", () => {
    rtl(<Harness />);
    const panel = screen.getByText("row").closest("[dir]") as HTMLElement;
    expect(panel).toHaveAttribute("dir", "rtl");
    expect(panel.style.left).toBe("600px");
  });
});

describe("Select with a numeric size (list box)", () => {
  it("drops the chevron and the dropdown dress above 1", () => {
    const { container } = render(
      <Select label="Pick" size={4}>
        <option>One</option>
        <option>Two</option>
      </Select>,
    );
    const select = screen.getByRole("listbox");
    expect(select).toHaveAttribute("size", "4");
    expect(container.querySelector("svg")).toBeNull();
    expect(select.className).not.toContain("appearance-none");
    expect(select.className).not.toContain("pe-9");
  });

  it("treats `multiple` as a list box too", () => {
    const { container } = render(
      <Select aria-label="Pick" multiple>
        <option>One</option>
      </Select>,
    );
    expect(container.querySelector("svg")).toBeNull();
  });

  it("keeps the dropdown look at size 1", () => {
    const { container } = render(
      <Select aria-label="Pick" size={1}>
        <option>One</option>
      </Select>,
    );
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByLabelText("Pick").className).toContain("pe-9");
  });
});

describe("ChoiceCard required", () => {
  it("requires the input and draws the mark outside the name", () => {
    render(<ChoiceCard title="I accept" required />);
    const input = screen.getByRole("checkbox", { name: "I accept" });
    expect(input).toBeRequired();
    expect((input as HTMLInputElement).validity.valueMissing).toBe(true);
    const mark = screen.getByText("*");
    expect(mark).toHaveAttribute("aria-hidden", "true");
  });

  it("radio group: every radio required, one star on the legend, none on the cards", () => {
    render(
      <ChoiceCardGroup
        legend="Plan"
        required
        value={null}
        onChange={() => {}}
        options={[
          { value: "a", title: "A" },
          { value: "b", title: "B" },
        ]}
      />,
    );
    for (const r of screen.getAllByRole("radio")) expect(r).toBeRequired();
    const stars = screen.getAllByText("*");
    expect(stars).toHaveLength(1);
    expect(stars[0].closest("legend")).not.toBeNull();
    expect(screen.getByRole("group", { name: "Plan" })).toBeInTheDocument();
  });

  it("checkbox group: required while empty, not once one is ticked", () => {
    function Harness() {
      const [value, setValue] = useState<string[]>([]);
      return (
        <ChoiceCardGroup
          legend="Features"
          multiple
          required
          value={value}
          onChange={setValue}
          options={[
            { value: "a", title: "A" },
            { value: "b", title: "B" },
          ]}
        />
      );
    }
    render(<Harness />);
    const [a, b] = screen.getAllByRole("checkbox");
    expect(a).toBeRequired();
    expect(b).toBeRequired();
    fireEvent.click(a);
    expect(a).not.toBeRequired();
    expect(b).not.toBeRequired();
  });
});

describe("disabled comboboxes are visibly dimmed", () => {
  it("InlineEntityCombobox", () => {
    render(<InlineEntityCombobox label="Category" value="a" options={OPTIONS} onChange={() => {}} disabled />);
    const input = screen.getByRole("combobox");
    expect(input).toBeDisabled();
    expect(input.parentElement!.className).toContain("opacity-50");
    expect(screen.getByText("Category").className).toContain("opacity-50");
  });

  it("Combobox", () => {
    render(<Combobox label="Payee" value="" options={[]} onChange={() => {}} disabled />);
    expect(screen.getByRole("combobox").parentElement!.className).toContain("opacity-50");
  });
});

describe("EntityCombobox loading with rows already showing", () => {
  it("says it is loading, marks the list busy, and keeps the rows", () => {
    const { rerender } = render(
      <EntityCombobox label="Account" value={null} options={OPTIONS} onChange={() => {}} loading />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /Account/ }));
    const list = screen.getByRole("listbox");
    expect(list).toHaveAttribute("aria-busy", "true");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");

    rerender(<EntityCombobox label="Account" value={null} options={OPTIONS} onChange={() => {}} />);
    expect(screen.getByRole("listbox")).not.toHaveAttribute("aria-busy");
    expect(screen.getByRole("status")).not.toHaveTextContent("Loading…");
  });
});

describe("MultiSelect error and disabled", () => {
  const opts = [{ value: 1, label: "One" }];

  it("renders the message, points the trigger at it, and paints", () => {
    render(
      <>
        <p id="hint">Pick any</p>
        <MultiSelect label="Tags" options={opts} values={[]} onChange={() => {}} error="Pick at least one" aria-describedby="hint" />
      </>,
    );
    const trigger = screen.getByRole("combobox", { name: /Tags/ });
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAccessibleDescription("Pick any Pick at least one");
    expect(trigger.className).toContain("ring-[var(--danger-border)]");
  });

  it("renders nothing extra for an empty error", () => {
    render(<MultiSelect label="Tags" options={opts} values={[]} onChange={() => {}} error="" />);
    const trigger = screen.getByRole("combobox", { name: /Tags/ });
    expect(trigger).not.toHaveAttribute("aria-invalid");
    expect(trigger).not.toHaveAttribute("aria-describedby");
  });

  it("disabled: no panel, no chevron, dimmed label", () => {
    const { container } = render(
      <MultiSelect label="Tags" options={opts} values={[]} onChange={() => {}} disabled />,
    );
    const trigger = screen.getByRole("combobox", { name: /Tags/ });
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByText("Tags").className).toContain("opacity-50");
  });
});

describe("clearValue on the entity comboboxes", () => {
  it("EntityCombobox emits null by default", () => {
    const onChange = vi.fn();
    render(<EntityCombobox label="Account" value="a" options={OPTIONS} clearable onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Clear"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('EntityCombobox emits "" with clearValue="", and reads "" back as empty', () => {
    const onChange = vi.fn<(v: string) => void>();
    const { rerender } = render(
      <EntityCombobox label="Account" value="a" options={OPTIONS} clearable clearValue="" onChange={onChange} />,
    );
    fireEvent.click(screen.getByLabelText("Clear"));
    expect(onChange).toHaveBeenCalledWith("");

    rerender(
      <EntityCombobox
        label="Account"
        value=""
        placeholder="Choose"
        options={OPTIONS}
        clearable
        clearValue=""
        onChange={onChange}
      />,
    );
    expect(screen.queryByLabelText("Clear")).toBeNull();
    expect(screen.getByRole("combobox", { name: /Account/ })).toHaveTextContent("Choose");
  });

  it('InlineEntityCombobox emits "" from the × and from emptying the text', () => {
    const onChange = vi.fn<(v: string) => void>();
    render(
      <InlineEntityCombobox label="Category" value="a" options={OPTIONS} clearable clearValue="" onChange={onChange} />,
    );
    fireEvent.click(screen.getByLabelText("Clear"));
    expect(onChange).toHaveBeenLastCalledWith("");

    onChange.mockClear();
    const input = screen.getByRole("combobox");
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("types onChange from clearValue", () => {
    // Compile-time half: a `string`-only handler is refused without `clearValue=""`,
    // because the default clear emits `null`.
    render(
      <>
        {/* @ts-expect-error — onChange must accept null when clearValue is the default */}
        <EntityCombobox label="A" value="a" options={OPTIONS} onChange={(v: string) => v} />
        <EntityCombobox label="B" value="a" options={OPTIONS} clearValue="" onChange={(v: string) => v} />
      </>,
    );
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });
});

describe("Button ref", () => {
  it("reaches the <button> on Button and IconButton", () => {
    const a = createRef<HTMLButtonElement>();
    const b = createRef<HTMLButtonElement>();
    render(
      <>
        <Button ref={a}>Save</Button>
        <IconButton ref={b} aria-label="Edit">
          <svg />
        </IconButton>
      </>,
    );
    expect(a.current).toBe(screen.getByRole("button", { name: "Save" }));
    expect(b.current).toBe(screen.getByRole("button", { name: "Edit" }));
    expect(within(document.body).getAllByRole("button")).toHaveLength(2);
  });
});
