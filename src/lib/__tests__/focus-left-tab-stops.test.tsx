import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import * as trap from "../../hooks/use-focus-trap";
import { firstTabStop, tabStops, tabStopsAround } from "../focus-left";

/**
 * 0.52 code review, lib/focus-left.ts: the tab-stop rule had three copies — this module,
 * use-focus-trap (refactor audit 2026-10-30, DUP-9) and a combobox panel's toolbar — and
 * the first two each exported a `firstTabStop`: focus-left's left the element itself out,
 * the trap's put it first. One rule now, one `firstTabStop`, and `includeSelf` says which.
 */

function Field() {
  return (
    <div>
      <button type="button">Before</button>
      <div data-testid="field">
        <button type="button" tabIndex={-1}>
          Cell
        </button>
        <div hidden>
          <button type="button">Hidden</button>
        </div>
        <div inert>
          <button type="button">Inert</button>
        </div>
        <button type="button" disabled>
          Disabled
        </button>
        <input aria-label="Amount" />
        <a href="#more">More</a>
      </div>
      <div hidden>
        <button type="button">Hidden after</button>
      </div>
      <button type="button">After</button>
    </div>
  );
}

describe("the kit's one tab-stop rule", () => {
  it("the element itself first by default; includeSelf: false for a control inside it", () => {
    render(<Field />);
    const field = screen.getByTestId("field");
    field.tabIndex = 0;
    const amount = screen.getByRole("textbox", { name: "Amount" });
    const more = screen.getByRole("link", { name: "More" });
    expect(tabStops(field)).toEqual([field, amount, more]);
    expect(firstTabStop(field)).toBe(field);
    expect(tabStops(field, { includeSelf: false })).toEqual([amount, more]);
    expect(firstTabStop(field, { includeSelf: false })).toBe(amount);
    // An element that is not a stop is never its own first, either way.
    field.removeAttribute("tabindex");
    expect(firstTabStop(field)).toBe(amount);
  });

  it("the stops around a frame skip what a Tab never reaches, as the stops inside do", () => {
    render(<Field />);
    const { after, before } = tabStopsAround(screen.getByTestId("field"));
    expect(after).toEqual([screen.getByRole("button", { name: "After" })]);
    expect(before).toEqual([screen.getByRole("button", { name: "Before" })]);
  });

  it("the stops around a frame are read outwards from it, not from every stop on the page (0.52 code review)", () => {
    // A banner under a long table: 2000 stops before it. Each was read — its tab index,
    // its ancestors for `hidden`/`inert` — to keep the last five.
    const page = document.createElement("div");
    for (let i = 0; i < 2000; i++) {
      const b = document.createElement("button");
      b.textContent = `Row ${i}`;
      page.append(b);
    }
    const frame = document.createElement("div");
    frame.innerHTML = '<button type="button">Dismiss</button>';
    const after = document.createElement("a");
    after.href = "#next";
    after.textContent = "Next";
    page.append(frame, after);
    document.body.append(page);
    try {
      const closest = vi.spyOn(Element.prototype, "closest");
      const around = tabStopsAround(frame);
      expect(around.after).toEqual([after]);
      expect(around.before.map((b) => b.textContent)).toEqual([
        "Row 1999",
        "Row 1998",
        "Row 1997",
        "Row 1996",
        "Row 1995",
      ]);
      expect(closest.mock.calls.length).toBeLessThan(50);
    } finally {
      vi.restoreAllMocks();
      page.remove();
    }
  });

  it("the trap's helpers are this module's, not a copy", () => {
    expect(trap.firstTabStop).toBe(firstTabStop);
    expect(trap.tabStops).toBe(tabStops);
  });
});
