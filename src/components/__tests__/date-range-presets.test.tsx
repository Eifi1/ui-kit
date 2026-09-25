import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { DateRangePicker } from "../date-picker";
import type { DateRangePickerPreset, DateRangePickerProps } from "../date-picker";

/**
 * Preset identity and the draft/apply mode — the two reasons keksdose's report range
 * field gives for not using this picker (report-range-field.tsx, "Why this is
 * app-level"): anonymous presets could not say WHICH preset was chosen, and the
 * picker committed on the first click.
 */

// Two presets with the SAME days: on a Monday "today" and "this week" are one range,
// which is exactly the case dates alone cannot tell apart.
const PRESETS: DateRangePickerPreset[] = [
  { id: "today", label: "Today", from: "2026-09-21", to: "2026-09-21" },
  { id: "this_week", label: "This week", from: "2026-09-21", to: "2026-09-21" },
  { id: "last_month", label: "Last month", from: "2026-08-01", to: "2026-08-31" },
];

function Harness(props: Partial<DateRangePickerProps> & { onCommit?: DateRangePickerProps["onChange"] }) {
  const { onCommit, ...rest } = props;
  const [range, setRange] = useState({ from: "", to: "" });
  return (
    <DateRangePicker
      label="Period"
      locale="en"
      presets={PRESETS}
      {...rest}
      from={range.from}
      to={range.to}
      onChange={(from, to, id) => {
        setRange({ from, to });
        onCommit?.(from, to, id);
      }}
    />
  );
}

const openPanel = () => fireEvent.click(screen.getByRole("combobox", { name: /^Period/ }));
const presetButton = (name: string) =>
  within(screen.getByRole("group", { name: "Quick ranges" })).getByRole("button", { name });

describe("DateRangePicker preset identity", () => {
  it("reports the chosen preset's id, and marks THAT preset even when another has the same days", () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    openPanel();
    fireEvent.click(presetButton("This week"));
    expect(onCommit).toHaveBeenCalledWith("2026-09-21", "2026-09-21", "this_week");

    openPanel();
    expect(presetButton("This week")).toHaveAttribute("aria-pressed", "true");
    // Same days, different identity: not marked.
    expect(presetButton("Today")).toHaveAttribute("aria-pressed", "false");
  });

  it("stops marking the preset once the range no longer matches it", () => {
    render(<Harness />);
    openPanel();
    fireEvent.click(presetButton("Last month"));
    openPanel();
    expect(presetButton("Last month")).toHaveAttribute("aria-pressed", "true");
    // Nudge the end by hand: two clicks in the calendar make a new, custom range.
    const grid = screen.getByRole("grid");
    fireEvent.click(within(grid).getByText("3"));
    fireEvent.click(within(grid).getByText("10"));
    openPanel();
    expect(presetButton("Last month")).toHaveAttribute("aria-pressed", "false");
  });

  it("controlled `preset`: an id no preset has (\"custom\") marks nothing, even on matching days", () => {
    render(
      <DateRangePicker
        label="Period"
        locale="en"
        presets={PRESETS}
        from="2026-08-01"
        to="2026-08-31"
        preset="custom"
        onChange={() => {}}
      />,
    );
    openPanel();
    for (const p of PRESETS) expect(presetButton(p.label as string)).toHaveAttribute("aria-pressed", "false");
  });

  it("controlled `preset`: marks the named preset while its days match", () => {
    render(
      <DateRangePicker
        label="Period"
        locale="en"
        presets={PRESETS}
        from="2026-09-21"
        to="2026-09-21"
        preset="today"
        onChange={() => {}}
      />,
    );
    openPanel();
    expect(presetButton("Today")).toHaveAttribute("aria-pressed", "true");
    expect(presetButton("This week")).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps the 0.7 two-argument call for a range picked by hand", () => {
    const onChange = vi.fn();
    render(<DateRangePicker label="Period" locale="en" from="2026-09-01" to="2026-09-05" clearable onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenCalledWith("", "");
    expect(onChange.mock.calls[0]).toHaveLength(2);
  });
});

describe('DateRangePicker commit="apply"', () => {
  it("a preset arms the calendar instead of committing; Apply commits it with its id", () => {
    const onCommit = vi.fn();
    render(<Harness commit="apply" onCommit={onCommit} />);
    openPanel();
    fireEvent.click(presetButton("Last month"));
    expect(onCommit).not.toHaveBeenCalled();
    // Still open, and the draft is what the column marks.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(presetButton("Last month")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onCommit).toHaveBeenCalledWith("2026-08-01", "2026-08-31", "last_month");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("never lets a half-made range out: Apply is disabled until both ends exist", () => {
    const onCommit = vi.fn();
    render(<Harness commit="apply" onCommit={onCommit} />);
    openPanel();
    const grid = screen.getByRole("grid");
    fireEvent.click(within(grid).getByText("3"));
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    fireEvent.click(within(grid).getByText("9"));
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onCommit).toHaveBeenCalledTimes(1);
    const [from, to, id] = onCommit.mock.calls[0];
    expect(from.endsWith("-03")).toBe(true);
    expect(to.endsWith("-09")).toBe(true);
    expect(id).toBeUndefined();
  });

  it("Cancel discards the draft, and the next open starts from the committed value", () => {
    const onCommit = vi.fn();
    render(<Harness commit="apply" onCommit={onCommit} />);
    openPanel();
    fireEvent.click(presetButton("Last month"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCommit).not.toHaveBeenCalled();
    openPanel();
    expect(presetButton("Last month")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("the immediate default still commits and closes on the first preset click", () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    openPanel();
    fireEvent.click(presetButton("Last month"));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
  });
});
