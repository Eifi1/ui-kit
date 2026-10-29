import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { CalculatorButton } from "../calculator";
import { NavPills } from "../nav-pills";
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
// The kit's one focus frame since 0.32 (`FOCUS_RING`, docs/text-size-harmonization.md
// §5): its width is `--focus-ring-width`, 2 px, 3 px under More contrast — the
// `ring-focus` width utility since 0.34 (DOC-7).
const RING = "focus-visible:ring-focus";
// A token: a role utility (`ring-brand`, 0.34) or a `[var(--…)]` where none exists.
const TOKEN_RING =
  /^focus-visible:ring-(?:\[var\(--[a-z-]+\)\]|brand|brand-contrast|subtle|strong|danger-strong|warning-strong|media-ink)$/;
const hasTokenRing = (el: Element) => el.className.split(/\s+/).some((c) => TOKEN_RING.test(c));
const noop = () => {};

describe("the numpad's keys show where the keyboard is", () => {
  it("gives every key a visible focus ring built from a token", () => {
    render(<NumberPadSheet value="12" onChange={noop} onDone={noop} />);
    const keys = screen.getAllByRole("button");
    expect(keys.length).toBeGreaterThan(16);
    for (const key of keys) {
      const name = key.getAttribute("aria-label") ?? key.textContent ?? "?";
      expect(key, `the ${name} key has no focus ring`).toHaveClass(RING);
      expect(hasTokenRing(key), `the ${name} key's ring is not a token`).toBe(true);
    }
  });

  it("rings the primary key against its own fill, not in it", () => {
    // "Done" is the one key wearing `bg-brand`, so a --brand ring on it is a
    // ring painted in the colour it sits on: present in the DOM, invisible on screen.
    render(<NumberPadSheet value="12" onChange={noop} onDone={noop} />);
    const done = screen.getByRole("button", { name: "Done" });
    expect(done).toHaveClass("focus-visible:ring-brand-contrast");
    expect(done).not.toHaveClass("focus-visible:ring-brand");
  });
});

describe("the calculator's keys and the nav pills draw the kit's one focus frame", () => {
  // Both drew it in `ring-strong` — the calculator also on `focus:`, so a pointer click
  // left a ring on the key — where every other control rings in brand on keyboard focus
  // (text-size §5; refactor audit 2026-10, DOC-7).
  const ONE_FRAME = ["focus-visible:outline-none", RING, "focus-visible:ring-brand"];
  const offFrame = (el: Element) => el.className.split(/\s+/).filter((c) => /^focus:ring-|ring-strong$/.test(c));

  it("rings every calculator key in brand, on keyboard focus only", () => {
    render(<CalculatorButton value="" onChange={noop} />);
    fireEvent.click(screen.getByRole("button", { name: "Open calculator" }));
    const keys = within(screen.getByRole("dialog")).getAllByRole("button");
    expect(keys.length).toBeGreaterThan(16);
    for (const key of keys) {
      const name = key.getAttribute("aria-label") ?? key.textContent ?? "?";
      expect(key, name).toHaveClass(...ONE_FRAME);
      expect(offFrame(key), name).toEqual([]);
    }
  });

  it("rings every pill in brand, the current one too", () => {
    render(
      <NavPills
        aria-label="Surface"
        items={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ]}
        current="a"
        onSelect={noop}
      />,
    );
    for (const pill of screen.getAllByRole("button")) {
      expect(pill).toHaveClass(...ONE_FRAME);
      expect(offFrame(pill)).toEqual([]);
    }
  });
});

describe("the dropdown search box shows where the keyboard is", () => {
  it("rings the input every searchable dropdown shares", () => {
    render(<DropdownSearchHeader query="" onQueryChange={noop} inputRef={{ current: null }} placeholder="Search" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass(RING);
    expect(hasTokenRing(input)).toBe(true);
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
    expect(screen.getByRole("textbox")).toHaveClass(RING);
  });
});
