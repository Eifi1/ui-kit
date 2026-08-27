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
