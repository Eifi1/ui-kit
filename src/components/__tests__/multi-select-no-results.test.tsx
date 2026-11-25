import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MultiSelect } from "../multi-select";

/**
 * MultiSelect's list when a query matches nothing, and its outside press. Lifted from
 * keksdose's own suite (FS-7 of its 2026-11-22 audit); the rest of what that file held
 * is pinned beside this: filtering (search-fold-034), a toggle on mousedown
 * (multi-select.api), Select all (multi-select-toolbar-keyboard).
 */

const OPTIONS = [
  { value: "a", label: "Apple" },
  { value: "b", label: "Banana" },
  { value: "c", label: "Cherry" },
];

function open() {
  render(
    <>
      <MultiSelect label="Fruit" options={OPTIONS} value={[]} onChange={vi.fn()} />
      <button type="button">outside</button>
    </>,
  );
  fireEvent.click(screen.getByRole("combobox", { name: /Fruit/ }));
  return screen.getByRole("textbox", { name: /Search/ });
}

describe("MultiSelect with nothing matching", () => {
  it("lists no option and says so in its status, in words", () => {
    const search = open();
    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent("No results");
  });

  it("closes on a press outside, not on one in its search box", () => {
    const search = open();
    fireEvent.pointerDown(search);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByRole("textbox", { name: /Search/ })).toBeNull();
  });
});
