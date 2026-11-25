import { useRef } from "react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DropdownPanel, DropdownSearchHeader, useDropdown } from "../dropdown";

/**
 * Keksdose dev#548: *"Currency select half blocked."*
 *
 * The searchable dropdowns hang an `absolute` panel inside their own relative box,
 * which is correct until an ancestor has `overflow` — and then the panel is silently
 * CLIPPED by that ancestor's edge. No error, no scrollbar, just a list with a third
 * of itself sliced off: in the transaction row editor the app's content scroller
 * starts 280px from the left, the amount field's currency picker opens right-aligned
 * and 256px wide, and what disappeared was the search box's first letter and every
 * row's flag and symbol.
 *
 * The package already had the answer for the calculator — `Popover` portals and pins
 * itself to the viewport for exactly this reason — and the dropdowns simply never
 * used it. `anchorRef` is that treatment, opt-in so the un-anchored form stays
 * byte-for-byte what it was for callers that do not need it.
 */
function Harness({ anchored }: { anchored: boolean }) {
  const { open, setOpen, wrapperRef, panelRef } = useDropdown();
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    // The clipping ancestor, as the app has one.
    <div style={{ overflow: "auto" }} data-testid="scroller">
      <div ref={wrapperRef} style={{ position: "relative" }} data-testid="wrapper">
        <button ref={triggerRef} type="button" onClick={() => setOpen((v) => !v)}>
          open
        </button>
        {open && (
          <DropdownPanel
            className={anchored ? undefined : "right-0 top-full w-64"}
            anchorRef={anchored ? triggerRef : undefined}
            panelRef={anchored ? panelRef : undefined}
          >
            <li>
              <button type="button" onClick={() => setOpen(false)}>
                CHF
              </button>
            </li>
          </DropdownPanel>
        )}
      </div>
    </div>
  );
}

describe("DropdownPanel", () => {
  it("stays inside its wrapper when it is not anchored", () => {
    render(<Harness anchored={false} />);
    fireEvent.click(screen.getByRole("button", { name: "open" }));

    const option = screen.getByRole("button", { name: "CHF" });
    // The old shape, unchanged: absolute, and a child of the relative box — which is
    // what an `overflow` ancestor clips.
    expect(screen.getByTestId("wrapper").contains(option)).toBe(true);
    expect(option.closest("div")?.className).toContain("absolute");
  });

  it("escapes every clipping ancestor when it is anchored", () => {
    render(<Harness anchored />);
    fireEvent.click(screen.getByRole("button", { name: "open" }));

    const option = screen.getByRole("button", { name: "CHF" });
    // Portalled: no longer under the scroller, so nothing can crop it.
    expect(screen.getByTestId("scroller").contains(option)).toBe(false);
    expect(document.body.contains(option)).toBe(true);
    const panel = option.closest("div[style]") as HTMLElement;
    expect(panel.style.position).toBe("fixed");
  });

  it("still counts a press on the portalled panel as inside", () => {
    // The half of the fix that is easy to miss: `useDropdown` closes on any press
    // outside its wrapper, and a portalled panel is outside it by construction — so
    // without `panelRef` the first option a user pressed closed the list instead of
    // choosing from it, which is a worse bug than the clipping.
    render(<Harness anchored />);
    fireEvent.click(screen.getByRole("button", { name: "open" }));

    // `pointerdown`, because `useDropdown` now dismisses through `useOutsideClick`
    // rather than through a second document listener of its own — one event covering
    // mouse, touch and pen, instead of the `mousedown` a touch platform only
    // SYNTHESISES. It is also the first event of a real press, so it is what the
    // hook has to get right.
    fireEvent.pointerDown(screen.getByRole("button", { name: "CHF" }));
    expect(screen.queryByRole("button", { name: "CHF" })).toBeInTheDocument();

    // …while a press anywhere else still closes it.
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("button", { name: "CHF" })).toBeNull();
  });
});

/**
 * The plain parts, lifted from keksdose's own suite (FS-7 of its 2026-11-22 audit): the
 * un-anchored wrapper's outside press, the panel's slots and empty row, the search box.
 */
describe("useDropdown, un-anchored", () => {
  it("toggles, and closes on a press outside the wrapper but not on one inside it", () => {
    render(
      <>
        <Harness anchored={false} />
        <button type="button">outside</button>
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "CHF" }));
    expect(screen.getByRole("button", { name: "CHF" })).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByRole("button", { name: "CHF" })).toBeNull();
    // The trigger toggles it, both ways.
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    expect(screen.getByRole("button", { name: "CHF" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    expect(screen.queryByRole("button", { name: "CHF" })).toBeNull();
  });
});

describe("DropdownPanel's slots", () => {
  it("renders the header above the list, not in it", () => {
    render(
      <DropdownPanel header={<div>Header row</div>}>
        <li>Item</li>
      </DropdownPanel>,
    );
    const header = screen.getByText("Header row");
    const item = screen.getByText("Item");
    expect(header.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(item.closest("ul")).not.toContainElement(header);
  });

  it("shows the empty row only while `empty`, outside the options' semantics", () => {
    const { rerender } = render(<DropdownPanel empty>{null}</DropdownPanel>);
    const row = screen.getByText("—");
    expect(row.tagName).toBe("LI");
    // A caller who made the list a listbox gets no child that is not an option.
    expect(row).toHaveAttribute("role", "presentation");
    rerender(
      <DropdownPanel>
        <li>Item</li>
      </DropdownPanel>,
    );
    expect(screen.queryByText("—")).toBeNull();
  });
});

describe("DropdownSearchHeader", () => {
  it("shows the placeholder and reports each change of the query", () => {
    const onQueryChange = vi.fn();
    render(
      <DropdownSearchHeader
        query=""
        onQueryChange={onQueryChange}
        inputRef={{ current: null }}
        placeholder="Search things"
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Search things"), { target: { value: "ab" } });
    expect(onQueryChange).toHaveBeenCalledExactlyOnceWith("ab");
  });

  it("shows the query it is given", () => {
    render(
      <DropdownSearchHeader query="zur" onQueryChange={() => {}} inputRef={{ current: null }} aria-label="Search" />,
    );
    expect(screen.getByRole("textbox", { name: "Search" })).toHaveValue("zur");
  });
});

describe("DropdownPanel align", () => {
  it("takes no physical edge since 0.35 (round 0.35 R1, API-6e)", () => {
    // @ts-expect-error — `left` / `right` went in 0.35: `start` / `end` follow the reading direction
    const physical: ComponentProps<typeof DropdownPanel>["align"] = "left";
    expect(physical).toBe("left");
  });
});
