import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { InlineEntityCombobox } from "../combobox";

/**
 * The clear affordance (Keksdose live #236, filed from a phone).
 *
 * The component has always cleared on an emptied field — but only where the field
 * can be emptied. On a phone, touching it opens the full-screen sheet over the very
 * input the text would have been deleted from, so an answered field could not be
 * unanswered at all. These pin the "×" that both shells share.
 */
const options = [
  { value: "c1", label: "Groceries" },
  { value: "c2", label: "Fuel" },
];

function setup(value: string | null, onChange = vi.fn()) {
  render(
    <InlineEntityCombobox<string>
      label="Category"
      value={value}
      onChange={onChange}
      options={options}
      clearable
      clearLabel="Clear category"
    />,
  );
  return onChange;
}

describe("InlineEntityCombobox clearable", () => {
  it("clears the selection without opening the list", () => {
    const onChange = setup("c1");
    expect(screen.getByRole("combobox")).toHaveValue("Groceries");

    fireEvent.click(screen.getByRole("button", { name: "Clear category" }));

    expect(onChange).toHaveBeenCalledWith(null);
    // The press must not focus the input: on a phone that focus is what opens the
    // sheet, so a clear would leave the picker open over an empty field.
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("offers nothing to clear on an empty field", () => {
    setup(null);
    expect(screen.queryByRole("button", { name: "Clear category" })).not.toBeInTheDocument();
  });

  it("is opt-in — a field without the prop keeps only its chevron", () => {
    render(
      <InlineEntityCombobox<string>
        label="Category"
        value="c1"
        onChange={vi.fn()}
        options={options}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

/**
 * The suggestion list is PORTALLED (Keksdose live #295: *"Category select inside the
 * list is not readable. Some sort of z indexes issue?"*).
 *
 * It was not z-index. The list was an `absolute` `<ul>` inside the field's own
 * wrapper, and the receipt's line table sits in a card carrying `overflow-clip` — so a
 * list opened from a row near the bottom was cut off at the card's edge (measured in
 * the browser: a 256px panel with 150px of it painted). A stacking context can be
 * out-ranked; `overflow` cannot be argued with, and the only fix is to leave the
 * subtree.
 *
 * jsdom has no layout, so what is asserted here is the structural property that made
 * the clip impossible — the list is a child of `document.body` and not of the field —
 * plus the thing portalling is most likely to break: an outside-click handler that
 * measures "inside" against the wrapper now answers no for the list itself, so the
 * first option a user picks would close the dropdown having picked nothing.
 */
describe("the desktop suggestion list", () => {
  it("renders outside the field's own subtree, so no ancestor can clip it", () => {
    const { container } = render(
      <InlineEntityCombobox<string>
        label="Category"
        value={null}
        onChange={vi.fn()}
        options={options}
      />,
    );
    fireEvent.focus(screen.getByRole("combobox"));

    const list = screen.getByRole("listbox");
    expect(container.contains(list)).toBe(false);
    expect(document.body.contains(list)).toBe(true);
  });

  it("still commits the option that is clicked in it", () => {
    const onChange = vi.fn();
    render(
      <InlineEntityCombobox<string>
        label="Category"
        value={null}
        onChange={onChange}
        options={options}
      />,
    );
    fireEvent.focus(screen.getByRole("combobox"));
    fireEvent.mouseDown(screen.getByRole("option", { name: "Fuel" }));

    expect(onChange).toHaveBeenCalledWith("c2");
  });
});
