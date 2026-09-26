import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CalendarHeatmap, heatmapLevel } from "../calendar-heatmap";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE } from "../../i18n/locales/de";

/**
 * The contribution-style day grid keksdose hand-built for its spending report
 * (reports/charts/calendar-heatmap.tsx): a square per day with `data-day`, shaded by
 * value, a redacted tooltip, and a click that drills into the day.
 */

const LOCALE = "en-GB";
const cells = () => Array.from(document.querySelectorAll<HTMLElement>("[data-day]"));
const cellOn = (iso: string) => {
  const el = document.querySelector<HTMLElement>(`[data-day="${iso}"]`);
  if (!el) throw new Error(`no cell for ${iso}`);
  return el;
};
const press = (key: string) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key, bubbles: true });

const DATA = [
  { date: "2026-09-02", value: 10 },
  { date: "2026-09-03", value: 40 },
  { date: "2026-09-03", value: 60 }, // same day twice: added up
];

describe("CalendarHeatmap", () => {
  it("draws one cell per day of the window, each named with its date and value", () => {
    render(<CalendarHeatmap data={DATA} from="2026-09-01" to="2026-09-30" locale={LOCALE} />);
    expect(cells().map((c) => c.dataset.day)).toHaveLength(30);
    expect(screen.getByRole("grid", { name: "Daily values" })).toBeTruthy();
    expect(cellOn("2026-09-03")).toHaveAttribute("aria-label", "Thursday, 3 September 2026: 100");
    expect(cellOn("2026-09-05")).toHaveAttribute("aria-label", "Saturday, 5 September 2026: 0");
  });

  it("shades by the busiest day on screen, in steps", () => {
    render(<CalendarHeatmap data={DATA} from="2026-09-01" to="2026-09-30" locale={LOCALE} />);
    expect(cellOn("2026-09-03").dataset.level).toBe("4");
    expect(cellOn("2026-09-02").dataset.level).toBe("1");
    expect(cellOn("2026-09-05").dataset.level).toBe("0");
    expect(cellOn("2026-09-03").style.background).not.toBe(cellOn("2026-09-05").style.background);
    // Token colours, mixed into the surface — never a literal hue.
    expect(cellOn("2026-09-03").getAttribute("style")).toContain("var(--brand)");
  });

  it("maps values to levels", () => {
    expect(heatmapLevel(0, 100, 4)).toBe(0);
    expect(heatmapLevel(1, 100, 4)).toBe(1);
    expect(heatmapLevel(26, 100, 4)).toBe(2);
    expect(heatmapLevel(100, 100, 4)).toBe(4);
    expect(heatmapLevel(500, 100, 4)).toBe(4);
    expect(heatmapLevel(5, 0, 4)).toBe(0);
  });

  it("tags the tooltip data-private, and formats with formatValue", () => {
    render(
      <CalendarHeatmap
        data={DATA}
        from="2026-09-01"
        to="2026-09-30"
        locale={LOCALE}
        formatValue={(v) => `€${v.toFixed(2)}`}
      />,
    );
    fireEvent.mouseOver(cellOn("2026-09-03").parentElement!);
    const bubble = document.querySelector('[role="tooltip"]');
    expect(bubble).not.toBeNull();
    expect(bubble!.textContent).toContain("€100.00");
    expect(bubble).toHaveAttribute("data-private");
  });

  it("leaves the tooltip untagged with sensitive={false}, and takes a custom tooltip", () => {
    render(
      <CalendarHeatmap
        data={DATA}
        from="2026-09-01"
        to="2026-09-30"
        locale={LOCALE}
        sensitive={false}
        tooltip={(d) => `${d.iso} · ${d.hasData ? d.value : "nothing"}`}
      />,
    );
    fireEvent.mouseOver(cellOn("2026-09-05").parentElement!);
    const bubble = document.querySelector('[role="tooltip"]');
    expect(bubble!.textContent).toBe("2026-09-05 · nothing");
    expect(bubble).not.toHaveAttribute("data-private");
  });

  it("selects a day on click, and marks the selected one", () => {
    const onSelect = vi.fn();
    render(
      <CalendarHeatmap data={DATA} from="2026-09-01" to="2026-09-30" locale={LOCALE} selected="2026-09-02" onSelect={onSelect} />,
    );
    const cell = cellOn("2026-09-03");
    expect(cell.tagName).toBe("BUTTON");
    fireEvent.click(cell);
    expect(onSelect).toHaveBeenCalledWith("2026-09-03");
    expect(cellOn("2026-09-02")).toHaveAttribute("aria-selected", "true");
    expect(cell).toHaveAttribute("aria-selected", "false");
  });

  it("is inert without onSelect, but still reachable", () => {
    render(<CalendarHeatmap data={DATA} from="2026-09-01" to="2026-09-30" locale={LOCALE} />);
    expect(cellOn("2026-09-03").tagName).toBe("DIV");
    expect(cellOn("2026-09-03")).not.toHaveAttribute("aria-selected");
    expect(cells().filter((c) => c.tabIndex === 0).map((c) => c.dataset.day)).toEqual(["2026-09-30"]);
  });

  it("roves by week sideways and by day up/down in the weeks layout", () => {
    render(<CalendarHeatmap data={DATA} from="2026-08-01" to="2026-09-30" locale={LOCALE} selected="2026-09-14" onSelect={() => {}} />);
    cellOn("2026-09-14").focus();
    press("ArrowRight");
    expect(document.activeElement).toBe(cellOn("2026-09-21"));
    press("ArrowUp");
    expect(document.activeElement).toBe(cellOn("2026-09-20"));
    press("PageUp");
    expect(document.activeElement).toBe(cellOn("2026-08-20"));
    press("Home");
    expect(document.activeElement).toBe(cellOn("2026-08-01"));
    press("ArrowLeft"); // clamped to the window
    expect(document.activeElement).toBe(cellOn("2026-08-01"));
    press("End");
    expect(document.activeElement).toBe(cellOn("2026-09-30"));
    expect(cells().filter((c) => c.tabIndex === 0)).toEqual([cellOn("2026-09-30")]);
  });

  it("mirrors the arrows in RTL", () => {
    render(
      <div dir="rtl">
        <CalendarHeatmap data={DATA} from="2026-09-01" to="2026-09-30" locale={LOCALE} layout="month" selected="2026-09-14" />
      </div>,
    );
    cellOn("2026-09-14").focus();
    press("ArrowLeft");
    expect(document.activeElement).toBe(cellOn("2026-09-15"));
    press("ArrowDown");
    expect(document.activeElement).toBe(cellOn("2026-09-22"));
  });

  it("labels weekdays and months, from the week start", () => {
    render(<CalendarHeatmap data={DATA} from="2026-09-01" to="2026-10-31" locale={LOCALE} weekStartsOn={1} />);
    const heads = screen.getAllByRole("rowheader");
    expect(heads.map((h) => h.getAttribute("aria-label"))).toEqual([
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    ]);
    // 1 September 2026 is a Tuesday: the first row's first column is a blank cell.
    expect(screen.getAllByRole("row")[0].querySelectorAll('[role="gridcell"]')[0]).not.toHaveAttribute("data-day");
    const grid = screen.getByRole("grid");
    expect(grid.textContent).toContain("Sept");
    expect(grid.textContent).toContain("Oct");
  });

  it("draws a 7-column month with day numbers in the month layout", () => {
    render(<CalendarHeatmap data={DATA} from="2026-09-01" to="2026-09-30" locale={LOCALE} layout="month" weekStartsOn={1} />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
    expect(cellOn("2026-09-14")).toHaveTextContent("14");
    // 1 blank + 30 days + 4 blanks, in 5 week rows.
    expect(screen.getAllByRole("row")).toHaveLength(6);
  });

  it("keeps the latest maxDays and says how many it left out", () => {
    render(<CalendarHeatmap data={DATA} from="2026-01-01" to="2026-09-30" locale={LOCALE} maxDays={30} />);
    expect(cells()).toHaveLength(30);
    // DOM order is by weekday row in this layout, hence the sort.
    expect(cells().map((c) => c.dataset.day!).sort()[0]).toBe("2026-09-01");
    expect(screen.getByText(/243 earlier days are not shown/)).toBeTruthy();
  });

  it("speaks the provider's language", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE} locale="de-DE">
        <CalendarHeatmap data={DATA} from="2026-09-01" to="2026-09-30" />
      </UiKitProvider>,
    );
    expect(screen.getByRole("grid", { name: "Tageswerte" })).toBeTruthy();
    expect(screen.getByText("Weniger")).toBeTruthy();
  });
});
