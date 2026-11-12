import type { ReactElement } from "react";
import { cloneElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { SeriesChart, oneAxis, type SeriesChartProps } from "../series-chart";

/**
 * The zoom and the tooltip, drawn by REAL recharts at a fixed 800x300 (see
 * `series-chart.test.tsx` for why that works in jsdom) — Kurvenschmiede's production
 * feedback of 2026-11 on phones: a reset left the tooltip standing, one finger drew a
 * zoom band instead of reading the curve, and nothing zoomed with two.
 *
 * recharts moves its tooltip on the frame after a pointer move (`throttleDelay: "raf"`),
 * so every reading waits for one.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

const ROWS = Array.from({ length: 21 }, (_, x) => ({ x, a: (x * 7) % 11 }));

function draw(props: Partial<SeriesChartProps> = {}) {
  return render(
    <SeriesChart rows={ROWS} series={[{ key: "a", label: "A" }]} axes={oneAxis(undefined, "A")} {...props} />,
  );
}

/** One frame: recharts applies a pointer move on the next. */
const frame = () =>
  act(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }),
  );

const surface = () => {
  const rect = document.querySelector<SVGRectElement>("rect[data-zoom-surface]")! as unknown as HTMLElement;
  // jsdom has no layout: the overlay's box is put where the plot is in the chart, whose
  // own box starts at 0, so a client position is a position in the chart — what both
  // the layer and recharts' wrapper read back.
  const left = Number(rect.getAttribute("x"));
  const top = Number(rect.getAttribute("y"));
  rect.getBoundingClientRect = () => ({ left, top, width: 0, height: 0 }) as DOMRect;
  return rect;
};
const plot = () => {
  const rect = surface();
  return {
    x: Number(rect.getAttribute("x")),
    y: Number(rect.getAttribute("y")),
    width: Number(rect.getAttribute("width")),
    height: Number(rect.getAttribute("height")),
  };
};
/** What the floating tooltip says: nothing while it is hidden (`ChartTooltipContent`
 *  draws nothing for an inactive tooltip). */
const tooltip = () => document.querySelector(".recharts-tooltip-wrapper")?.textContent ?? "";

/** A mouse over the plot, as recharts' own wrapper hears it. */
function hover(x: number, y: number) {
  fireEvent.mouseMove(document.querySelector(".recharts-wrapper")!, { clientX: x, clientY: y });
}

/** jsdom has no `PointerEvent`; a `MouseEvent` under the pointer event's name carries what
 *  the handlers read — position, button — with the pointer's id and type put on it. */
function pointer(type: string, x: number, y: number, init: { id?: number; kind?: string } = {}) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(event, "pointerId", { value: init.id ?? 1 });
  Object.defineProperty(event, "pointerType", { value: init.kind ?? "mouse" });
  Object.defineProperty(event, "isPrimary", { value: (init.id ?? 1) === 1 });
  fireEvent(surface(), event);
}

/** A mouse band across the middle fifth of the plot. */
function bandZoom() {
  const { x, width } = plot();
  pointer("pointerdown", x + width * 0.4, 100);
  pointer("pointermove", x + width * 0.6, 104);
  pointer("pointerup", x + width * 0.6, 104);
}

describe("a reset clears the tooltip", () => {
  it("hides the tooltip when Reset zoom is pressed", async () => {
    draw();
    bandZoom();
    const { x, width, y, height } = plot();
    hover(x + width / 2, y + height / 2);
    await frame();
    expect(tooltip()).toContain("A");
    fireEvent.click(screen.getByRole("button", { name: /reset zoom/i }));
    await frame();
    expect(tooltip()).toBe("");
  });

  it("hides it on a double click's reset too", async () => {
    draw();
    bandZoom();
    const { x, width, y, height } = plot();
    hover(x + width / 2, y + height / 2);
    await frame();
    expect(tooltip()).toContain("A");
    fireEvent.doubleClick(surface());
    await frame();
    expect(screen.queryByRole("button", { name: /reset zoom/i })).toBeNull();
    expect(tooltip()).toBe("");
  });

  it("leaves the tooltip alone while the chart stays zoomed", async () => {
    draw();
    bandZoom();
    const { x, width, y, height } = plot();
    hover(x + width / 2, y + height / 2);
    await frame();
    expect(tooltip()).toContain("A");
  });
});

/** Where the row at `value` is drawn, unzoomed: the domain is the rows' 0…20 with 4 % air
 *  either side (`paddedDomain`). */
function pxOf(value: number) {
  const { x, width } = plot();
  return x + ((value + 0.8) / 21.6) * width;
}
const xTicks = () =>
  [...document.querySelectorAll(".recharts-xAxis-tick-labels tspan")].map((t) => Number(t.textContent));

describe("one finger reads", () => {
  it("shows the value under the finger from touch-down, follows it, and keeps it once lifted", async () => {
    const { container } = draw();
    pointer("pointerdown", pxOf(5), 150, { kind: "touch" });
    await frame();
    // The row's x, the series, its value: (5 × 7) mod 11 = 2.
    expect(tooltip()).toBe("5A2");
    pointer("pointermove", pxOf(15), 150, { kind: "touch" });
    await frame();
    expect(tooltip()).toBe("15A6");
    // No band while the finger moves, and none to zoom into once it is lifted.
    expect(container.querySelector("rect[stroke-dasharray]")).toBeNull();
    pointer("pointerup", pxOf(15), 150, { kind: "touch" });
    await frame();
    expect(screen.queryByRole("button", { name: /reset zoom/i })).toBeNull();
    expect(tooltip()).toBe("15A6");
  });

  it("leaves the mouse's band as it was", () => {
    draw();
    const before = xTicks();
    bandZoom();
    expect(screen.getByRole("button", { name: /reset zoom/i })).toBeInTheDocument();
    expect(Math.min(...xTicks())).toBeGreaterThan(Math.min(...before));
  });
});

describe("two fingers zoom", () => {
  it("narrows the abscissa through the real scales as two fingers spread, and the one left down reads on", async () => {
    draw();
    const before = xTicks();
    pointer("pointerdown", pxOf(9), 150, { id: 1, kind: "touch" });
    pointer("pointerdown", pxOf(11), 150, { id: 2, kind: "touch" });
    pointer("pointermove", pxOf(6), 150, { id: 1, kind: "touch" });
    pointer("pointermove", pxOf(14), 150, { id: 2, kind: "touch" });
    pointer("pointerup", pxOf(14), 150, { id: 2, kind: "touch" });
    expect(screen.getByRole("button", { name: /reset zoom/i })).toBeInTheDocument();
    const zoomed = xTicks();
    expect(Math.min(...zoomed)).toBeGreaterThan(Math.min(...before));
    expect(Math.max(...zoomed)).toBeLessThan(Math.max(...before));
    // Four times the spread about the value 10: a window about 5.4 wide round it.
    expect(Math.min(...zoomed)).toBeGreaterThanOrEqual(7);
    expect(Math.max(...zoomed)).toBeLessThanOrEqual(13);
    // Finger 1 is still down, and reads where it is: the plot's middle is now 10.
    const { x, width } = plot();
    pointer("pointermove", x + width / 2, 150, { id: 1, kind: "touch" });
    await frame();
    expect(tooltip()).toBe("10A4");
  });
});
