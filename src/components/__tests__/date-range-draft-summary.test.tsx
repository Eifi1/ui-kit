import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { DateRangePicker } from "../date-picker";
import type { DateRangeDraftSummary, DateRangePickerPreset, DateRangePickerProps } from "../date-picker";

/**
 * `renderDraftSummary` — the "Custom · from – to" line keksdose's report range field
 * (report-range-field.tsx) drew above its hand-rolled calendar, and the last thing it
 * needed before it could be the kit's `DateRangePicker`.
 */

const PRESETS: DateRangePickerPreset[] = [
  { id: "last_month", label: "Last month", from: "2026-08-01", to: "2026-08-31" },
  { id: "this_month", label: "This month", from: "2026-09-01", to: "2026-09-30" },
];

const summary = ({ from, to, preset }: DateRangeDraftSummary) =>
  `${preset ? preset.label : "Custom"} · ${from} – ${to || "…"}`;

function Harness(props: Partial<DateRangePickerProps>) {
  const [range, setRange] = useState({ from: "2026-08-01", to: "2026-08-31" });
  return (
    <DateRangePicker
      label="Period"
      locale="en"
      presets={PRESETS}
      commit="apply"
      preset="last_month"
      renderDraftSummary={summary}
      {...props}
      from={range.from}
      to={range.to}
      onChange={(from, to) => setRange({ from, to })}
    />
  );
}

const line = () => document.querySelector("[data-draft-summary]");

function mockPhone() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("max-width: 767px") || query.includes("reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
});

describe("DateRangePicker renderDraftSummary", () => {
  it("states the draft above the calendar, and follows it as presets and days are picked", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("combobox"));
    const panel = screen.getByRole("dialog");
    // Seeded from the committed value, which is the last-month preset.
    expect(line()).toHaveTextContent("Last month · 2026-08-01 – 2026-08-31");
    expect(line()).toHaveAttribute("aria-live", "polite");
    expect(panel.contains(line())).toBe(true);

    fireEvent.click(within(panel).getByRole("button", { name: "This month" }));
    expect(line()).toHaveTextContent("This month · 2026-09-01 – 2026-09-30");

    // A hand-picked day turns it into "Custom", with the missing end still missing.
    fireEvent.click(within(screen.getByRole("grid")).getByText("3"));
    expect(line()?.textContent).toMatch(/^Custom · 2026-\d\d-03 – …$/);
  });

  it("is called with the draft, not the committed value", () => {
    const render$ = vi.fn(summary);
    render(<Harness renderDraftSummary={render$} />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("button", { name: "This month" }));
    expect(render$).toHaveBeenLastCalledWith({ from: "2026-09-01", to: "2026-09-30", preset: PRESETS[1] });
  });

  it("draws in the phone sheet too", () => {
    mockPhone();
    render(<Harness />);
    fireEvent.click(screen.getByRole("combobox"));
    const sheet = screen.getByRole("dialog", { name: "Choose a date range" });
    expect(sheet).toHaveAttribute("aria-modal", "true");
    expect(within(sheet).getByText("Last month · 2026-08-01 – 2026-08-31")).toBeInTheDocument();
  });

  it("is not drawn in immediate mode, where there is no draft", () => {
    const render$ = vi.fn(summary);
    render(<Harness commit="immediate" renderDraftSummary={render$} />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(line()).toBeNull();
    expect(render$).not.toHaveBeenCalled();
  });

  it("draws nothing for a summary of null", () => {
    render(<Harness renderDraftSummary={() => null} />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(line()).toBeNull();
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("works without presets", () => {
    render(<Harness presets={undefined} />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(line()).toHaveTextContent("Custom · 2026-08-01 – 2026-08-31");
  });
});
