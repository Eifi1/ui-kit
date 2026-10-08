import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MeasuredGrid } from "../measured-grid";
import { applyTextSize } from "../../theme/text-size";

/**
 * MeasuredGrid follows the windowed rows (docs/text-size-harmonization.md §10.9): its
 * rows are at least the scaled estimate tall, measured as they render, and positioned
 * from the measured heights; its small type is rem (§3.2) and its rings the kit's frame
 * (§5).
 */

class FakeResizeObserver {
  static all: FakeResizeObserver[] = [];
  observed = new Set<Element>();
  constructor(private callback: ResizeObserverCallback) {
    FakeResizeObserver.all.push(this);
  }
  observe(el: Element) {
    this.observed.add(el);
  }
  unobserve(el: Element) {
    this.observed.delete(el);
  }
  disconnect() {
    this.observed.clear();
  }
  static resize(el: Element, height: number) {
    for (const observer of FakeResizeObserver.all) {
      if (!observer.observed.has(el)) continue;
      observer.callback(
        [{ target: el, borderBoxSize: [{ blockSize: height, inlineSize: 400 }] }] as unknown as ResizeObserverEntry[],
        observer as never,
      );
    }
  }
}

beforeEach(() => {
  FakeResizeObserver.all = [];
});

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
  vi.unstubAllGlobals();
});

const COLUMNS = [{ label: "x" }, { label: "y", unit: "N" }];
const CELLS = [
  ["1", "2"],
  ["3", "4"],
  ["5", "6"],
];

function grid() {
  return render(<MeasuredGrid label="Table" columns={COLUMNS} cells={CELLS} onCells={() => {}} />);
}

/** The body rows (aria-rowindex 2…), in order. */
const rows = () =>
  screen.getAllByRole("row").filter((row) => Number(row.getAttribute("aria-rowindex")) >= 2);

describe("MeasuredGrid rows (§10.9)", () => {
  it("are 28 px at Normal, as a minimum rather than a fixed height", () => {
    grid();
    const [first, second] = rows();
    expect(first.style.minHeight).toBe("28px");
    expect(first.style.height).toBe("");
    expect(second.style.top).toBe("28px");
  });

  it("grow with the text size: 35 px at Large, 42 px at Extra large", () => {
    applyTextSize("large");
    grid();
    expect(rows()[1].style.top).toBe("35px");
    act(() => applyTextSize("xlarge"));
    expect(rows()[0].style.minHeight).toBe("42px");
    expect(rows()[2].style.top).toBe("84px");
  });

  it("are positioned from their measured heights", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    grid();
    act(() => FakeResizeObserver.resize(rows()[0], 50));
    expect(rows()[1].style.top).toBe("50px");
    expect(rows()[2].style.top).toBe("78px");
  });
});

describe("MeasuredGrid's type and rings (§3.2, §5)", () => {
  it("sets its small type in rem", () => {
    const { container } = grid();
    expect(container.innerHTML).not.toMatch(/text-\[1[01]px\]/);
    expect(screen.getByText("Table").className).toContain("text-caption");
    expect(screen.getByText("N").className).toContain("text-micro");
  });

  it("rings a cell and a remove button with the kit's focus frame", () => {
    grid();
    const input = screen.getByRole("textbox", { name: "x, row 1" });
    expect(input.className).toContain("focus-visible:ring-[length:var(--focus-ring-width)]");
    expect(input.className).toContain("focus-visible:ring-inset");
    expect(input.className).not.toContain("ring-2");
    const remove = screen.getByRole("button", { name: "Remove row 1" });
    expect(remove.className).toContain("focus-visible:ring-[length:var(--focus-ring-width)]");
  });
});
