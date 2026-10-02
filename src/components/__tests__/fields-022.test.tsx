import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { FieldHint, Input, Textarea } from "../ui";
import { TimeInput } from "../time-input";
import { Combobox, InlineEntityCombobox } from "../combobox";
import { EntityCombobox } from "../entity-combobox";
import { Autocomplete } from "../autocomplete";
import { MultiSelect } from "../multi-select";
import { UiKitProvider } from "../../i18n/kit-labels";
import type { UiKitLabels } from "../../i18n/kit-labels";

/**
 * 0.22.0 field anatomy: kastlan 8 (a labelled field kept the caller's placeholder),
 * keksdose K4 (`hint` on Input, Textarea, TimeInput and the combobox family, the way
 * Select has it) and K11 (`showCount`).
 */

const described = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
const descriptions = (el: Element) =>
  described(el).map((id) => document.getElementById(id)?.textContent ?? `#${id} MISSING`);

describe("kastlan 8: a labelled field keeps the caller's placeholder", () => {
  it("Input shows it on focus, once the label has floated out of its way", () => {
    render(<Input label="Note" placeholder="Anything the tenant should know" />);
    const input = screen.getByRole("textbox", { name: "Note" });
    expect(input).toHaveAttribute("placeholder", "Anything the tenant should know");
    // Transparent at rest (the label sits where it would be), visible on focus.
    expect(input.className).toContain("placeholder:text-transparent");
    expect(input.className).toContain("focus:placeholder:text-[var(--text-placeholder)]");
  });

  it("Input without a placeholder keeps the float trick's single space", () => {
    render(<Input label="Name" />);
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toHaveAttribute("placeholder", " ");
    expect(input.className).not.toContain("focus:placeholder:");
  });

  it("a blank placeholder is the float trick's, not a hint", () => {
    render(<Input label="Name" placeholder="" />);
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveAttribute("placeholder", " ");
  });

  it("Textarea keeps it the same way", () => {
    render(<Textarea label="Note" placeholder="Pick up at the back door" />);
    const area = screen.getByRole("textbox", { name: "Note" });
    expect(area).toHaveAttribute("placeholder", "Pick up at the back door");
    expect(area.className).toContain("focus:placeholder:text-[var(--text-placeholder)]");
  });

  it("an unlabelled field is untouched", () => {
    render(<Input aria-label="Search" placeholder="Search…" />);
    const input = screen.getByRole("textbox", { name: "Search" });
    expect(input).toHaveAttribute("placeholder", "Search…");
    expect(input.className).not.toContain("focus:placeholder:");
  });
});

describe("keksdose K4: hint on Input and Textarea", () => {
  it("text is a caption under the field, described before the error", () => {
    render(
      <Input
        label="IBAN"
        hint="22 characters"
        error="That IBAN has 21 digits"
        aria-describedby="outside"
      />,
    );
    const input = screen.getByRole("textbox", { name: "IBAN" });
    const ids = described(input);
    expect(ids[0]).toBe("outside");
    expect(descriptions(input).slice(1)).toEqual(["22 characters", "That IBAN has 21 digits"]);
  });

  it("a FieldHint rides the animated label's line on a labelled Input", () => {
    render(<Input label="Rate" hint={<FieldHint label="Per year, before tax" />} />);
    const input = screen.getByRole("textbox", { name: "Rate" });
    const hint = screen.getByRole("button", { name: "Per year, before tax" });
    // In the label's row, inside the field's own box — not under it.
    expect(hint.closest("div.relative")).toBe(input.parentElement);
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("a FieldHint on an unlabelled Input sits at the end edge, and className moves to that row", () => {
    const { container } = render(
      <Input aria-label="Code" className="w-40" hint={<FieldHint label="From the letter" />} />,
    );
    const input = screen.getByRole("textbox", { name: "Code" });
    // Passing `hint` keeps the field's plain box (so a hint coming and going never
    // rebuilds the control — keksdose 0.22); the row with className is inside it.
    const box = container.firstElementChild as HTMLElement;
    expect(box.tagName).toBe("DIV");
    expect(box.className).toBe("");
    const row = box.firstElementChild as HTMLElement;
    expect(row).toHaveClass("flex", "w-40");
    expect(input).not.toHaveClass("w-40");
    expect(within(row).getByRole("button", { name: "From the letter" })).toBeInTheDocument();
  });

  it("without a hint an unlabelled Input is still the bare element", () => {
    const { container } = render(<Input aria-label="Code" className="w-40" />);
    expect(container.firstElementChild?.tagName).toBe("INPUT");
    expect(container.firstElementChild).toHaveClass("w-40");
  });

  it("Textarea takes both shapes", () => {
    render(
      <>
        <Textarea label="Message" hint="Markdown is fine" />
        <Textarea label="Reply" hint={<FieldHint label="Sent to the customer" />} />
      </>,
    );
    expect(descriptions(screen.getByRole("textbox", { name: "Message" }))).toEqual(["Markdown is fine"]);
    expect(screen.getByRole("button", { name: "Sent to the customer" })).toBeInTheDocument();
  });

  it("TimeInput passes it through", () => {
    render(<TimeInput label="Start" value="09:00" hint="Local time at the site" />);
    const input = screen.getByLabelText("Start");
    expect(descriptions(input)).toEqual(["Local time at the site"]);
  });
});

describe("keksdose K11: showCount", () => {
  function Counted({ initial = "", max = 20 }: { initial?: string; max?: number }) {
    const [value, setValue] = useState(initial);
    return (
      <Textarea
        label="Note"
        hint="Shown to the tenant"
        maxLength={max}
        showCount
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    );
  }
  const area = () => screen.getByRole("textbox", { name: "Note" });
  const type = (text: string) => fireEvent.change(area(), { target: { value: text } });

  it("shows used/max, and describes the field with the count after the hint", () => {
    render(<Counted initial="Hello" />);
    expect(screen.getByText("5/20")).toHaveAttribute("aria-hidden", "true");
    expect(descriptions(area())).toEqual(["Shown to the tenant", "5 of 20 characters"]);
    type("Hello there");
    expect(screen.getByText("11/20")).toBeInTheDocument();
    expect(descriptions(area())).toContain("11 of 20 characters");
  });

  it("announces once on entering the last stretch and once at the limit — not per keystroke", () => {
    render(<Counted />);
    const live = screen.getByRole("status");
    expect(live).toBeEmptyDOMElement();
    type("a".repeat(5));
    expect(live).toBeEmptyDOMElement();
    // 20 → the last stretch is 2 characters (a tenth).
    type("a".repeat(18));
    expect(live).toHaveTextContent("2 characters left");
    type("a".repeat(19));
    // Same stretch: the text does not change, so nothing new is announced.
    expect(live).toHaveTextContent("2 characters left");
    type("a".repeat(20));
    expect(live).toHaveTextContent("Character limit reached");
    type("a".repeat(10));
    expect(live).toBeEmptyDOMElement();
  });

  it("says nothing on mount, even for a stored value already at the limit", () => {
    render(<Counted initial={"a".repeat(20)} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByText("20/20")).toHaveClass("text-[var(--danger)]");
  });

  it("counts an uncontrolled Input from defaultValue on", () => {
    render(<Input label="Title" maxLength={80} showCount defaultValue="Hi" />);
    expect(screen.getByText("2/80")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Hi there" } });
    expect(screen.getByText("8/80")).toBeInTheDocument();
  });

  it("calls the caller's onChange as before", () => {
    const onChange = vi.fn();
    render(<Input label="Title" maxLength={80} showCount onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "x" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("is ignored without a maxLength", () => {
    render(<Input label="Title" showCount defaultValue="Hi" />);
    expect(screen.queryByText(/\/\d+$/)).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("reads its words from the provider and the prop", () => {
    const labels = {
      characterCount: { count: (used: number, max: number) => `${used} von ${max} Zeichen` },
    } as unknown as Partial<UiKitLabels>;
    render(
      <UiKitProvider labels={labels}>
        <Input label="Titel" maxLength={10} showCount defaultValue="abc" />
        <Input label="Notiz" maxLength={10} showCount defaultValue="ab" countLabels={{ count: (u) => `${u} Z.` }} />
      </UiKitProvider>,
    );
    expect(descriptions(screen.getByRole("textbox", { name: "Titel" }))).toEqual(["3 von 10 Zeichen"]);
    expect(descriptions(screen.getByRole("textbox", { name: "Notiz" }))).toEqual(["2 Z."]);
  });

  it("puts the caption and the counter on one line, the error under both", () => {
    render(
      <Input label="Title" hint="Shown in the inbox" error="Too short" maxLength={30} showCount defaultValue="ab" />,
    );
    const counter = screen.getByText("2/30");
    const caption = screen.getByText("Shown in the inbox");
    expect(counter.parentElement).toBe(caption.parentElement?.parentElement);
    expect(descriptions(screen.getByRole("textbox", { name: "Title" }))).toEqual([
      "Shown in the inbox",
      "2 of 30 characters",
      "Too short",
    ]);
  });
});

describe("keksdose K4: hint on the combobox family", () => {
  const options = [
    { value: "a", label: "Checking" },
    { value: "b", label: "Savings" },
  ];

  it("Combobox: a text caption describes the input, before the error", () => {
    render(
      <Combobox label="Payee" value="" onChange={() => {}} options={["REWE"]} hint="As on the receipt" error="Required" />,
    );
    expect(descriptions(screen.getByRole("combobox", { name: "Payee" }))).toEqual(["As on the receipt", "Required"]);
  });

  it("Combobox: a FieldHint shares the label's strip and follows the input in the tab order", () => {
    render(
      <Combobox label="Payee" value="" onChange={() => {}} options={["REWE"]} hint={<FieldHint label="Who was paid" />} />,
    );
    const input = screen.getByRole("combobox", { name: "Payee" });
    const hint = screen.getByRole("button", { name: "Who was paid" });
    expect(input.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The label is in the row, out of its own absolute slot.
    expect(hint.closest("div")).toBe(screen.getByText("Payee").parentElement);
    expect(screen.getByText("Payee")).toHaveClass("static");
  });

  it("Combobox: unlabelled, a FieldHint sits at the end edge outside the field", () => {
    render(
      <Combobox aria-label="Payee" value="" onChange={() => {}} options={["REWE"]} hint={<FieldHint label="Who was paid" />} />,
    );
    const input = screen.getByRole("combobox", { name: "Payee" });
    const hint = screen.getByRole("button", { name: "Who was paid" });
    expect(input.parentElement?.contains(hint)).toBe(false);
  });

  it("InlineEntityCombobox", () => {
    render(
      <InlineEntityCombobox<string> label="Account" value={null} onChange={() => {}} options={options} hint="The money leaves from here" />,
    );
    expect(descriptions(screen.getByRole("combobox", { name: "Account" }))).toEqual(["The money leaves from here"]);
  });

  it("EntityCombobox: the caption describes the trigger", () => {
    render(<EntityCombobox<string> label="Account" value={null} onChange={() => {}} options={options} hint="Only open accounts" />);
    const trigger = screen.getByRole("combobox");
    expect(descriptions(trigger)).toEqual(["Only open accounts"]);
  });

  it("EntityCombobox: a FieldHint on the label line", () => {
    render(
      <EntityCombobox<string>
        label="Account"
        value={null}
        onChange={() => {}}
        options={options}
        hint={<FieldHint label="Closed accounts are hidden" />}
      />,
    );
    expect(screen.getByRole("button", { name: "Closed accounts are hidden" })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).not.toHaveAttribute("aria-describedby");
  });

  it("Autocomplete", () => {
    render(<Autocomplete label="Address" value="" onChange={() => {}} hint="Street and number" error="Required" />);
    expect(descriptions(screen.getByRole("combobox", { name: "Address" }))).toEqual(["Street and number", "Required"]);
  });

  it("Autocomplete: a FieldHint keeps the label as the field's name", () => {
    render(<Autocomplete label="Address" value="" onChange={() => {}} hint={<FieldHint label="We never store it" />} />);
    expect(screen.getByRole("combobox", { name: "Address" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "We never store it" })).toBeInTheDocument();
  });

  it("MultiSelect", () => {
    render(
      <MultiSelect
        label="Accounts"
        values={[]}
        onChange={() => {}}
        options={[{ value: 1, label: "Checking" }]}
        hint="Leave empty for all"
      />,
    );
    expect(descriptions(screen.getByRole("combobox"))).toEqual(["Leave empty for all"]);
  });

  it("MultiSelect: unlabelled FieldHint at the end edge", async () => {
    render(
      <MultiSelect
        aria-label="Accounts"
        values={[]}
        onChange={() => {}}
        options={[{ value: 1, label: "Checking" }]}
        hint={<FieldHint label="Leave empty for all" />}
      />,
    );
    const hint = screen.getByRole("button", { name: "Leave empty for all" });
    const trigger = screen.getByRole("combobox", { name: "Accounts" });
    expect(trigger.contains(hint)).toBe(false);
    // The trigger still opens its panel from inside the row.
    await act(async () => {
      fireEvent.click(trigger);
    });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });
});
