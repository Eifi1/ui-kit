import { useEffect, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FullBleedDialog } from "../full-bleed-dialog";

/**
 * The footer slot is what keksdose's `RangeSheet` (reports/report-range-field.tsx) needs
 * to stop being a hand-rolled copy of this dialog: a sticky Apply under a calendar.
 *
 * The sheet also carries its dev#477 fix — `onMouseDown={(e) => e.stopPropagation()}`,
 * so a press inside the portalled sheet never reaches a document-level "outside click"
 * listener, which would unmount the day cell before its `click` arrived. Passed to this
 * dialog, that handler used to be DROPPED: it rode `...rest` and lost to the backdrop's
 * own `onMouseDown` spread after it. These pin that it now arrives, that it does its
 * job, and that the backdrop still closes around it.
 */

/** A document-level mousedown listener — what a Popover's outside-click hook is. */
function useDocumentMouseDown(onOutside: () => void) {
  useEffect(() => {
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [onOutside]);
}

/** A full tap: a `fireEvent.click` alone never fires mousedown, and would pass
 *  against the bug. */
function tap(el: Element) {
  fireEvent.mouseDown(el);
  fireEvent.mouseUp(el);
  fireEvent.click(el);
}

describe("FullBleedDialog footer", () => {
  it("renders the footer outside the scrolling body", () => {
    render(
      <FullBleedDialog open onClose={vi.fn()} closeLabel="Close" header="Range" footer={<button type="button">Apply</button>}>
        <p>calendar</p>
      </FullBleedDialog>,
    );
    const apply = screen.getByRole("button", { name: "Apply" });
    const footer = apply.closest("[data-full-bleed-footer]")!;
    expect(footer).not.toBeNull();
    // Not inside the scroller: the body is the element that holds the children.
    const body = screen.getByText("calendar").parentElement!;
    expect(body.className).toContain("overflow-y-auto");
    expect(body.contains(apply)).toBe(false);
    expect(footer.className).toContain("shrink-0");
  });

  it("renders no footer row when none is given", () => {
    render(
      <FullBleedDialog open onClose={vi.fn()} closeLabel="Close">
        body
      </FullBleedDialog>,
    );
    expect(document.querySelector("[data-full-bleed-footer]")).toBeNull();
  });

  it("keeps a caller's onMouseDown + stopPropagation, so a tap inside never reads as outside (dev#477)", () => {
    const outside = vi.fn();
    const onClose = vi.fn();
    const applied = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(true);
      useDocumentMouseDown(outside);
      return (
        <FullBleedDialog
          open={open}
          onClose={() => {
            onClose();
            setOpen(false);
          }}
          closeLabel="Close"
          header="Range"
          onMouseDown={(e) => e.stopPropagation()}
          footer={
            <button type="button" onClick={applied}>
              Apply
            </button>
          }
        >
          <button type="button">1 Aug</button>
        </FullBleedDialog>
      );
    }
    render(<Harness />);

    tap(screen.getByRole("button", { name: "1 Aug" }));
    tap(screen.getByRole("button", { name: "Apply" }));
    expect(outside).not.toHaveBeenCalled();
    expect(applied).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("lets a stopPropagation INSIDE the footer through to the button's click, without closing", () => {
    const outside = vi.fn();
    const onClose = vi.fn();
    const applied = vi.fn();
    function Harness() {
      useDocumentMouseDown(outside);
      return (
        <FullBleedDialog
          open
          onClose={onClose}
          closeLabel="Close"
          footer={
            <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={applied}>
              Apply
            </button>
          }
        >
          body
        </FullBleedDialog>
      );
    }
    render(<Harness />);
    tap(screen.getByRole("button", { name: "Apply" }));
    expect(applied).toHaveBeenCalledTimes(1);
    expect(outside).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("still closes from its backdrop with a caller's onMouseDown/onMouseUp attached", () => {
    const onClose = vi.fn();
    const down = vi.fn();
    const up = vi.fn();
    render(
      <FullBleedDialog open onClose={onClose} closeLabel="Close" onMouseDown={down} onMouseUp={up}>
        body
      </FullBleedDialog>,
    );
    const backdrop = screen.getByRole("dialog");
    fireEvent.mouseDown(backdrop);
    fireEvent.mouseUp(backdrop);
    expect(down).toHaveBeenCalledTimes(1);
    expect(up).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("FullBleedDialog — caller keys and a stretching header (keksdose B18)", () => {
  it("runs the caller's onKeyDown, and a prevented Escape does not close", () => {
    const onClose = vi.fn();
    const onKeyDown = vi.fn((e: { key: string; preventDefault: () => void }) => {
      if (e.key === "Escape") e.preventDefault();
    });
    render(
      <FullBleedDialog open closeLabel="Close" onClose={onClose} header="Search" onKeyDown={onKeyDown}>
        <p>body</p>
      </FullBleedDialog>,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onKeyDown).toHaveBeenCalledTimes(2);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("lets the header slot take the free width", () => {
    render(
      <FullBleedDialog open closeLabel="Close" onClose={() => {}} header={<span data-testid="h">Search</span>}>
        <p>body</p>
      </FullBleedDialog>,
    );
    expect(screen.getByTestId("h").parentElement).toHaveClass("flex-1");
  });
});
