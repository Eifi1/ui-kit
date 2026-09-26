import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MiniCalendar } from "../mini-calendar";

/**
 * `showOutsideDays`: the neighbouring months' days in the leading and trailing cells,
 * muted — what kastlan's hand-built month grid showed before the kit's calendar.
 * September 2026 starts on a Tuesday and ends on a Wednesday; weeks start on Monday.
 */
const LOCALE = "en-GB";
const draw = (props: Partial<Parameters<typeof MiniCalendar>[0]> = {}) => {
  const onSelect = vi.fn();
  const utils = render(
    <MiniCalendar
      mode="single"
      from="2026-09-14"
      to="2026-09-14"
      weekStartsOn={1}
      locale={LOCALE}
      onSelect={onSelect}
      {...props}
    />,
  );
  return { ...utils, onSelect };
};
const outside = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>("[data-outside]")].map((b) => b.dataset.iso);

describe("MiniCalendar showOutsideDays", () => {
  it("leaves the cells empty by default", () => {
    const { container } = draw();
    expect(outside(container)).toEqual([]);
  });

  it("fills the first and last rows with the neighbouring months' days", () => {
    const { container } = draw({ showOutsideDays: true });
    expect(outside(container)).toEqual([
      "2026-08-31",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    const first = container.querySelector<HTMLElement>('[data-iso="2026-08-31"]')!;
    expect(first).toHaveTextContent("31");
    expect(first).toHaveClass("text-[var(--text-placeholder)]");
  });

  it("keeps the grid whole: seven cells a row, each a named gridcell", () => {
    draw({ showOutsideDays: true });
    const rows = screen.getAllByRole("row").slice(1);
    for (const row of rows) expect(within(row).getAllByRole("gridcell")).toHaveLength(7);
    expect(screen.getByRole("gridcell", { name: /Monday,? 31 August 2026/ })).toBeInTheDocument();
  });

  it("keeps them out of the roving tab order: one tab stop, still in the month", () => {
    const { container } = draw({ showOutsideDays: true });
    const stops = container.querySelectorAll('[role="gridcell"][tabindex="0"]');
    expect(stops).toHaveLength(1);
    expect(stops[0]).toHaveAttribute("data-iso", "2026-09-14");
    for (const el of container.querySelectorAll("[data-outside]")) {
      expect(el).toHaveAttribute("tabindex", "-1");
    }
  });

  it("selects an outside day on click and moves the grid to its month, focus with it", () => {
    const onMonthChange = vi.fn();
    const { container, onSelect } = draw({ showOutsideDays: true, onMonthChange });
    fireEvent.click(container.querySelector('[data-iso="2026-10-02"]')!);
    expect(onSelect).toHaveBeenCalledWith("2026-10-02", "2026-10-02");
    expect(onMonthChange).toHaveBeenCalledWith("2026-10");
    expect(screen.getByRole("grid")).toHaveAccessibleName("October 2026");
    const now = container.querySelector('[data-iso="2026-10-02"]')!;
    expect(now).not.toHaveAttribute("data-outside");
    expect(document.activeElement).toBe(now);
  });

  it("refuses an outside day beyond min/max", () => {
    const { container, onSelect } = draw({ showOutsideDays: true, max: "2026-09-30" });
    const beyond = container.querySelector('[data-iso="2026-10-01"]')!;
    expect(beyond).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(beyond);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("does not call renderDay for them: a day's content is drawn in its own month", () => {
    const renderDay = vi.fn(() => null);
    draw({ showOutsideDays: true, renderDay });
    const drawn = renderDay.mock.calls.map((c) => (c as unknown as [Date])[0].getMonth());
    expect(new Set(drawn)).toEqual(new Set([8]));
  });

  it("works in the month view as well", () => {
    const { container } = draw({ showOutsideDays: true, size: "lg" });
    expect(outside(container)).toHaveLength(5);
  });
});
