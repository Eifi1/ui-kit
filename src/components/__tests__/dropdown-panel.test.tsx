import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DropdownPanel, useDropdown } from "../dropdown";

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

  it("still counts a click on the portalled panel as inside", () => {
    // The half of the fix that is easy to miss: `useDropdown` closes on any click
    // outside its wrapper, and a portalled panel is outside it by construction — so
    // without `panelRef` the first option a user pressed closed the list instead of
    // choosing from it, which is a worse bug than the clipping.
    render(<Harness anchored />);
    fireEvent.click(screen.getByRole("button", { name: "open" }));

    fireEvent.mouseDown(screen.getByRole("button", { name: "CHF" }));
    expect(screen.queryByRole("button", { name: "CHF" })).toBeInTheDocument();

    // …while a click anywhere else still closes it.
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("button", { name: "CHF" })).toBeNull();
  });
});
