import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NumberPadSheet } from "../numpad-sheet";
import { DropdownSearchHeader } from "../dropdown";
import { FilterPopover } from "../data-table-filter-popover";
import type { DataTableColumn } from "../data-table";

/**
 * The audit's §a11y, `numpad-sheet.tsx:66`: *"Focus indicator removed with no
 * replacement on numpad keys and every dropdown search box."*
 *
 * `focus:outline-none` on its own is not a style choice, it is the deletion of the
 * only thing that tells a keyboard user where they are. On a 4×4 keypad of identical
 * tiles that leaves no way at all to tell which key Enter will press.
 *
 * ⚠️ **What a jsdom test can hold here is the class contract, not the pixels.** No CSS
 * is compiled in this environment, so the ring cannot be measured — but the defect was
 * never a measurement either. It was the absence of any request for an indicator, and
 * that is exactly what these assertions pin: every focusable control still ASKS for a
 * visible ring, in a colour that comes from a token rather than a palette literal.
 * {@link ToggleGroup} is the shape being copied — `focus-visible`, so the ring belongs
 * to the keyboard and does not flash on every tap of a touch control.
 */
const RING = /focus-visible:ring-2/;
const TOKEN_RING = /focus-visible:ring-\[var\(--[a-z-]+\)\]/;
const noop = () => {};

describe("the numpad's keys show where the keyboard is", () => {
  it("gives every key a visible focus ring built from a token", () => {
    render(<NumberPadSheet value="12" onChange={noop} onDone={noop} />);
    const keys = screen.getAllByRole("button");
    expect(keys.length).toBeGreaterThan(16);
    for (const key of keys) {
      const name = key.getAttribute("aria-label") ?? key.textContent ?? "?";
      expect(key.className, `the ${name} key has no focus ring`).toMatch(RING);
      expect(key.className, `the ${name} key's ring is not a token`).toMatch(TOKEN_RING);
    }
  });

  it("rings the primary key against its own fill, not in it", () => {
    // "Done" is the one key wearing `bg-[var(--brand)]`, so a --brand ring on it is a
    // ring painted in the colour it sits on: present in the DOM, invisible on screen.
    render(<NumberPadSheet value="12" onChange={noop} onDone={noop} />);
    const done = screen.getByRole("button", { name: "Done" });
    expect(done.className).toMatch(/focus-visible:ring-\[var\(--brand-contrast\)\]/);
  });
});

describe("the dropdown search box shows where the keyboard is", () => {
  it("rings the input every searchable dropdown shares", () => {
    render(
      <DropdownSearchHeader
        query=""
        onQueryChange={noop}
        inputRef={{ current: null }}
        placeholder="Search"
      />,
    );
    const input = screen.getByRole("textbox");
    expect(input.className).toMatch(RING);
    expect(input.className).toMatch(TOKEN_RING);
  });
});

describe("the column filter's fields show where the keyboard is", () => {
  const column: DataTableColumn<{ name: string }> = {
    key: "name",
    header: "Name",
    cell: (row) => row.name,
    filterBy: (row) => row.name,
  };

  it("rings the filter input", () => {
    render(
      <FilterPopover
        column={column}
        state={{ type: "text", q: "" }}
        onChange={noop}
        onClear={noop}
        selectOptions={[]}
      />,
    );
    expect(screen.getByRole("textbox").className).toMatch(RING);
  });
});
