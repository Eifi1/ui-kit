import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Combobox, InlineEntityCombobox } from "../combobox";
import { EntityCombobox } from "../entity-combobox";
import { MultiEntityCombobox } from "../multi-entity-combobox";

/**
 * A tap inside a phone {@link PickerSheet} is never an outside click — for ALL FOUR
 * pickers that take the sheet shape, and starting at `pointerdown`.
 *
 * Keksdose dev#477 fixed this once, for the two pickers built on {@link useDropdown},
 * by stopping the sheet's `mousedown` before the document listener could read it as a
 * press outside the field's wrapper. The entity pickers — built on
 * {@link useComboboxCore} instead — were never covered by that guard and did not need
 * to be: their rows commit on `onMouseDown`, so they beat the listener. The comment in
 * `picker-sheet.tsx` said as much and called it "luck, not a design".
 *
 * The luck ran out when {@link useOutsideClick} was hardened from `mousedown` to
 * `pointerdown` (one event for mouse, touch and pen). `pointerdown` PRECEDES
 * `mousedown`, so on a phone the sheet closed at finger-down and the row that would
 * have committed was already unmounted: the picker was unusable on touch, and tapping
 * the search box or the close X was equally fatal. Nothing caught it, because every
 * synthetic tap in both repositories still started at `mousedown`.
 *
 * So this file taps the way a finger does — `pointerdown` first — and asserts the same
 * thing about each of the four, rather than about whichever one is remembered.
 */
const OPTIONS = [
  { value: "a", label: "Checking" },
  { value: "b", label: "Savings" },
];

/** A tap, as the browser delivers it: pointer first, then the mouse events it
 *  synthesises, then the click. */
function tap(el: Element) {
  fireEvent.pointerDown(el);
  fireEvent.mouseDown(el);
  fireEvent.pointerUp(el);
  fireEvent.mouseUp(el);
  fireEvent.click(el);
}

describe("phone picker sheet — a tap starts at pointerdown", () => {
  beforeEach(() => {
    // matchMedia is undefined by default in jsdom (the desktop fallback), so the
    // sheet branch never runs otherwise.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true, // (max-width: 767px) matches → phone
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    // @ts-expect-error jsdom leaves it undefined by default; restore that.
    delete window.matchMedia;
  });

  it("survives the pointerdown that opens it — EntityCombobox", () => {
    const onChange = vi.fn();
    render(
      <EntityCombobox
        label="Account"
        value={null}
        onChange={onChange}
        options={OPTIONS}
        searchPlaceholder="Search"
        closeLabel="Close"
      />,
    );
    tap(screen.getByRole("button", { name: /Account/ }));
    const sheet = screen.getByRole("dialog");
    // The sheet has to still be there after the finger goes down on a row.
    fireEvent.pointerDown(within(sheet).getByRole("button", { name: "Checking" }));
    expect(screen.queryByRole("dialog")).toBeInTheDocument();
    tap(within(screen.getByRole("dialog")).getByRole("button", { name: "Checking" }));
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("survives the pointerdown that opens it — MultiEntityCombobox", () => {
    const onChange = vi.fn();
    render(
      <MultiEntityCombobox
        label="Payees"
        value={[]}
        onChange={onChange}
        options={OPTIONS}
        searchPlaceholder="Search"
        closeLabel="Close"
      />,
    );
    tap(screen.getByRole("button", { name: /Payees/ }));
    const sheet = screen.getByRole("dialog");
    tap(within(sheet).getByRole("button", { name: "Savings" }));
    expect(onChange).toHaveBeenCalledWith(["b"]);
    // Multi-select keeps the sheet up so a second row can be added.
    expect(screen.queryByRole("dialog")).toBeInTheDocument();
  });

  it("survives the pointerdown that opens it — InlineEntityCombobox", () => {
    const onChange = vi.fn();
    render(
      <InlineEntityCombobox
        label="Account"
        value={null}
        onChange={onChange}
        options={OPTIONS}
        searchPlaceholder="Search"
        closeLabel="Close"
      />,
    );
    fireEvent.focus(screen.getByRole("combobox", { name: "Account" }));
    const sheet = screen.getByRole("dialog");
    tap(within(sheet).getByRole("button", { name: "Savings" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("survives the pointerdown that opens it — Combobox", () => {
    const onChange = vi.fn();
    render(
      <Combobox
        label="Payee"
        value=""
        onChange={onChange}
        options={["Bäckerei", "Migros"]}
        searchPlaceholder="Search"
        closeLabel="Close"
      />,
    );
    fireEvent.focus(screen.getByRole("combobox", { name: "Payee" }));
    const sheet = screen.getByRole("dialog");
    tap(within(sheet).getByRole("button", { name: "Migros" }));
    expect(onChange).toHaveBeenCalledWith("Migros");
  });

  // The search box and the close X are inside the sheet too, and a picker whose
  // every touch reads as an outside click cannot be typed in either.
  it("keeps the sheet up when the finger lands on its search box", () => {
    render(
      <EntityCombobox
        label="Account"
        value={null}
        onChange={vi.fn()}
        options={OPTIONS}
        searchPlaceholder="Search"
        closeLabel="Close"
      />,
    );
    tap(screen.getByRole("button", { name: /Account/ }));
    const sheet = screen.getByRole("dialog");
    fireEvent.pointerDown(within(sheet).getByPlaceholderText("Search"));
    expect(screen.queryByRole("dialog")).toBeInTheDocument();
  });
});
