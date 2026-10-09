import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldLabel, Input, Select, Textarea } from "../ui";
import { DatePicker } from "../date-picker";
import { FieldStrip } from "../field-strip";

/**
 * The floating label at Large is a static label ABOVE the field
 * (docs/text-size-harmonization.md §10.17): the phone card's "label above value", not
 * a two-line label in the field. It stops being absolute, so it wraps like any text,
 * and the field's top strip no longer reserves its height. Normal keeps the floating
 * label. All `large:` classes — no render — so jsdom pins the class contract; the size
 * sweep (scripts/screenshot-sizes.mjs) measures the layout.
 */

const classes = (el: Element) => (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);

/** A label above at Large: in flow, in the grid's first row, wrapping, taking the pointer. */
const ABOVE = ["large:static", "large:row-start-1", "large:block", "large:pointer-events-auto", "truncate-until-large"];

/** The box it stands in at Large: one column, the field's absolute parts in the second row. */
const BOX = [
  "large:grid",
  "large:grid-cols-[minmax(0,1fr)]",
  "large:[&>.absolute:not([data-field-label])]:row-start-2",
];

const labelOf = (text: string) => screen.getByText(text).closest("label, [data-field-label]")!;

describe("the floating label above the field at Large (§10.17)", () => {
  it("Input: Normal keeps the floating label; at Large it stands above, in its floated look", () => {
    render(<Input label="Payment reference" />);
    const label = labelOf("Payment reference");
    // Normal: absolute in the top strip, as before.
    expect(classes(label)).toEqual(expect.arrayContaining(["absolute", "top-2.5", "peer-focus:top-1"]));
    expect(classes(label)).toEqual(expect.arrayContaining(ABOVE));
    expect(classes(label)).toEqual(
      expect.arrayContaining(["large:text-caption", "large:text-secondary", "large:transition-none"]),
    );
    expect(label).toHaveAttribute("data-field-label");
    expect(classes(label)).not.toContain("truncate");
    // The box is a grid at Large; the input loses the strip.
    expect(classes(label.parentElement!)).toEqual(expect.arrayContaining(["relative", ...BOX]));
    expect(classes(screen.getByRole("textbox", { name: "Payment reference" }))).toEqual(
      expect.arrayContaining(["pt-4", "pb-1", "large:py-2"]),
    );
  });

  it("Select: the static label stands above too, and the select drops its strip", () => {
    render(
      <Select label="Account">
        <option>Savings</option>
      </Select>,
    );
    const label = labelOf("Account");
    expect(classes(label)).toEqual(expect.arrayContaining(["absolute", "top-1", ...ABOVE]));
    expect(classes(label.parentElement!)).toEqual(expect.arrayContaining(BOX));
    expect(classes(screen.getByRole("combobox", { name: "Account" }))).toContain("large:py-2");
  });

  it("a label with its '?' stands above as one row", () => {
    render(<Input label="IBAN" hint={<span>?</span>} />);
    const row = screen.getByText("IBAN").parentElement!;
    expect(row).toHaveAttribute("data-field-label");
    expect(classes(row)).toEqual(expect.arrayContaining(["absolute", "large:static", "large:row-start-1"]));
    expect(classes(screen.getByText("IBAN"))).toContain("truncate-until-large");
  });

  it("a field with no visible label keeps its box as it was", () => {
    const { container } = render(<Input aria-label="Search" />);
    expect(container.querySelector(".large\\:grid")).toBeNull();
  });

  it("Textarea: the strip that hides scrolled text never shows at Large", () => {
    const { container } = render(<Textarea label="Notes" />);
    const strip = container.querySelector('[data-slot="label-strip"]')!;
    expect(classes(strip)).toEqual(
      expect.arrayContaining(["hidden", "not-large:peer-focus:block", "not-large:peer-[:not(:placeholder-shown)]:block"]),
    );
    expect(classes(strip)).not.toContain("peer-focus:block");
  });

  it("FieldLabel (the trigger pickers): above at Large, marked as the box's label", () => {
    render(<FieldLabel>Currency</FieldLabel>);
    const label = screen.getByText("Currency");
    expect(label).toHaveAttribute("data-field-label");
    expect(classes(label)).toEqual(expect.arrayContaining(["absolute", "top-1", ...ABOVE]));
  });

  it("DatePicker: a labelled box is a grid at Large, so the glyph measures the trigger's row", () => {
    const { container, rerender } = render(
      <DatePicker label="Booking date" value="2026-09-07" onChange={() => {}} />,
    );
    const label = screen.getByText("Booking date", { selector: "[data-field-label]" });
    expect(classes(label.parentElement!)).toEqual(expect.arrayContaining(BOX));
    rerender(<DatePicker aria-label="Booking date" value="2026-09-07" onChange={() => {}} />);
    expect(container.querySelector(".large\\:grid")).toBeNull();
  });

  it("FieldStrip: the label row stands above the group and the strip's padding goes", () => {
    render(
      <FieldStrip label="Location">
        <button type="button">Locate me</button>
      </FieldStrip>,
    );
    const group = screen.getByRole("group", { name: "Location" });
    expect(classes(group)).toEqual(expect.arrayContaining(["pt-5", "large:pt-0"]));
    const row = screen.getByText("Location").parentElement!;
    expect(classes(row)).toEqual(expect.arrayContaining(["absolute", "large:static", "large:mb-1"]));
    // The label inside the row stays level with its "?": no margin of its own there.
    expect(classes(screen.getByText("Location"))).toContain("large:mb-0");
  });
});
