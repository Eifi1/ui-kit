import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EntityCombobox } from "../entity-combobox";
import { MultiEntityCombobox } from "../multi-entity-combobox";

/**
 * Round 0.34 Wave 2, BUG-5: in the phone layout the picker sheet ignored the keyboard.
 * Arrows and Enter did nothing, no row showed as active, and the search box pointed at
 * no listbox and no option. ComboboxPanel's key handler sat on a div around the LIST;
 * the sheet's search box is in the sheet's header, outside it, so the keys never got
 * there. The phone layout is not only phones: a desktop at Large below 960 px, at
 * Extra large below 1152 px, and a tablet with a keyboard all get the sheet.
 */

const OPTIONS = [
  { value: "a1", label: "Checking" },
  { value: "a2", label: "Savings" },
  { value: "a3", label: "Cash" },
];

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("width <"), // the phone layout's `(width < 768px)`
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

async function openSheet(field: React.ReactNode) {
  const user = userEvent.setup();
  render(field);
  await user.click(screen.getByRole("combobox", { name: /Account/ }));
  const sheet = await screen.findByRole("dialog");
  const search = within(sheet).getByRole("textbox");
  await waitFor(() => expect(search).toHaveFocus());
  return { user, sheet, search };
}

describe("the phone picker sheet takes the keyboard (BUG-5)", () => {
  it("EntityCombobox: ArrowDown ×2 and Enter choose the third row", async () => {
    const onChange = vi.fn();
    const { user, search } = await openSheet(
      <EntityCombobox<string> label="Account" value={null} onChange={onChange} options={OPTIONS} />,
    );
    const listbox = screen.getByRole("listbox");
    expect(search).toHaveAttribute("aria-controls", listbox.id);

    await user.keyboard("{ArrowDown}{ArrowDown}");
    const cash = screen.getByRole("option", { name: "Cash" });
    expect(search).toHaveAttribute("aria-activedescendant", cash.id);
    // The row the arrows are on shows it, as it does in the desktop panel.
    expect(cash.className).toContain("bg-active");
    expect(screen.getByRole("option", { name: "Checking" }).className).not.toContain("bg-active");

    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("a3");
  });

  it("MultiEntityCombobox: Enter toggles the row the arrows are on", async () => {
    const onChange = vi.fn();
    const { user, search } = await openSheet(
      <MultiEntityCombobox<string> label="Accounts" value={[]} onChange={onChange} options={OPTIONS} />,
    );
    await user.keyboard("{ArrowDown}");
    expect(search).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "Savings" }).id);
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(["a2"]);
  });
});
