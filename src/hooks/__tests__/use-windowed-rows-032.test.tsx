import { act, render, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WINDOWED_ROW_INDEX, useWindowedRows } from "../use-windowed-rows";
import { applyTextSize } from "../../theme/text-size";

/**
 * Windowed lists with measured rows (docs/text-size-harmonization.md §10.9): "nothing
 * truncates" needs rows that grow with their text, so `useWindowedRows` measures each
 * rendered row and estimates the rest at `rowHeight × scale`.
 */

/** A ResizeObserver the test drives: `resize(el, h)` reports `el` at `h` px. */
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
  static resize(heights: [Element, number][]) {
    for (const observer of FakeResizeObserver.all) {
      const entries = heights
        .filter(([el]) => observer.observed.has(el))
        .map(([el, h]) => ({ target: el, borderBoxSize: [{ blockSize: h, inlineSize: 100 }] }));
      if (entries.length) observer.callback(entries as unknown as ResizeObserverEntry[], observer as never);
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

/** A scroller ref with no element: the hook falls back to a 600 px screenful. */
function useNoScroller() {
  return useRef<HTMLElement | null>(null);
}

describe("the estimate follows the text size", () => {
  it("is rowHeight at Normal — the fixed-height list of before", () => {
    const { result } = renderHook(() => useWindowedRows(100, 30, useNoScroller()));
    expect(result.current.estimate).toBe(30);
    expect(result.current.totalHeight).toBe(3000);
    expect(result.current.offsetOf(10)).toBe(300);
    expect(result.current).toMatchObject({ first: 0, last: 32 });
  });

  it("is rowHeight × 1.25 at Large and × 1.5 at Extra large", () => {
    applyTextSize("large");
    const { result } = renderHook(() => useWindowedRows(100, 28, useNoScroller()));
    expect(result.current.estimate).toBe(35);
    expect(result.current.totalHeight).toBe(3500);
    act(() => applyTextSize("xlarge"));
    expect(result.current.estimate).toBe(42);
    expect(result.current.offsetOf(3)).toBe(126);
    expect(result.current.heightOf(3)).toBe(42);
  });
});

/** A list rendering its window with `measureRef`, exposing the hook's answer. */
type RowsWindow = Omit<ReturnType<typeof useWindowedRows>, "measureRef">;

function List({ count, onWindow }: { count: number; onWindow: (w: RowsWindow) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { first, last, totalHeight, offsetOf, heightOf, estimate, measureRef } = useWindowedRows(count, 20, scrollRef);
  onWindow({ first, last, totalHeight, offsetOf, heightOf, estimate });
  const rows = [];
  for (let index = first; index < last; index += 1) {
    rows.push(
      <div
        key={index}
        ref={measureRef}
        {...{ [WINDOWED_ROW_INDEX]: index }}
        data-testid={`row-${index}`}
        style={{ position: "absolute", top: offsetOf(index), minHeight: estimate }}
      >
        Row {index}
      </div>,
    );
  }
  return (
    <div ref={scrollRef}>
      <div style={{ position: "relative", height: totalHeight }}>{rows}</div>
    </div>
  );
}

describe("measured rows (§10.9)", () => {
  it("places rows after a tall one at its measured height", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    let latest!: RowsWindow;
    const { getByTestId } = render(<List count={50} onWindow={(w) => (latest = w)} />);
    expect(latest.offsetOf(3)).toBe(60);
    // Row 1 wrapped to three lines: 52 px instead of 20.
    act(() => FakeResizeObserver.resize([[getByTestId("row-1"), 52]]));
    expect(latest.heightOf(1)).toBe(52);
    expect(latest.offsetOf(1)).toBe(20);
    expect(latest.offsetOf(2)).toBe(72);
    expect(latest.offsetOf(3)).toBe(92);
    expect(latest.totalHeight).toBe(50 * 20 + 32);
    expect(getByTestId("row-3").style.top).toBe("92px");
  });

  it("observes each rendered row while it is mounted", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const { getByTestId, rerender } = render(<List count={5} onWindow={() => {}} />);
    const rowObserver = FakeResizeObserver.all.find((o) => o.observed.has(getByTestId("row-0")))!;
    expect(rowObserver.observed.size).toBe(5);
    rerender(<List count={2} onWindow={() => {}} />);
    expect(rowObserver.observed.size).toBe(2);
  });

  it("drops the measurements when the text size changes", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    let latest!: RowsWindow;
    const { getByTestId } = render(<List count={10} onWindow={(w) => (latest = w)} />);
    act(() => FakeResizeObserver.resize([[getByTestId("row-0"), 40]]));
    expect(latest.offsetOf(1)).toBe(40);
    act(() => applyTextSize("xlarge"));
    // Every row is the new estimate until it measures again.
    expect(latest.offsetOf(1)).toBe(30);
    act(() => FakeResizeObserver.resize([[getByTestId("row-0"), 61]]));
    expect(latest.offsetOf(1)).toBe(61);
  });

  it("ignores a row that is not laid out (0 px) and keeps the estimate", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    let latest!: RowsWindow;
    const { getByTestId } = render(<List count={10} onWindow={(w) => (latest = w)} />);
    act(() => FakeResizeObserver.resize([[getByTestId("row-2"), 0]]));
    expect(latest.offsetOf(3)).toBe(60);
  });

  it("windows by the measured offsets", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    let latest!: RowsWindow;
    const { getByTestId } = render(<List count={1000} onWindow={(w) => (latest = w)} />);
    // Every rendered row turns out 100 px tall: the window narrows to fit the screenful.
    const rendered: [Element, number][] = [];
    for (let i = latest.first; i < latest.last; i += 1) rendered.push([getByTestId(`row-${i}`), 100]);
    const before = latest.last;
    act(() => FakeResizeObserver.resize(rendered));
    expect(latest.last).toBeLessThan(before);
    // 600 px fallback screen / 100 px rows = rows 0–6, plus the overscan.
    expect(latest.last).toBe(6 + 1 + 6);
  });

  it("works without a ResizeObserver: the estimate for every row", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    let latest!: RowsWindow;
    render(<List count={10} onWindow={(w) => (latest = w)} />);
    expect(latest.totalHeight).toBe(200);
    expect(latest.offsetOf(4)).toBe(80);
  });
});
