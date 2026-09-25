import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { DateRangePicker } from "../date-picker";
import type { DateRangePickerPreset, DateRangePickerProps } from "../date-picker";
import { cn } from "../../lib/cn";

/**
 * The two gaps keksdose's report range field (report-range-field.tsx, "Why this is
 * app-level") still named after 0.8: no phone presentation, and a trigger that can
 * only show two dates.
 */

const PRESETS: DateRangePickerPreset[] = [
  { id: "last_month", label: "Last month", from: "2026-08-01", to: "2026-08-31" },
  { id: "this_month", label: "This month", from: "2026-09-01", to: "2026-09-30" },
];

function Harness(
  props: Partial<DateRangePickerProps> & { onCommit?: DateRangePickerProps["onChange"] },
) {
  const { onCommit, ...rest } = props;
  const [range, setRange] = useState({ from: "2026-08-01", to: "2026-08-31" });
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

/** A phone: PHONE_QUERY matches, and reduced motion so the sheet closes at once. */
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

describe("DateRangePicker on a phone", () => {
  it("opens a full-screen sheet with Apply in its footer, and commits from there", () => {
    mockPhone();
    const onCommit = vi.fn();
    render(<Harness commit="apply" onCommit={onCommit} />);
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);

    const sheet = screen.getByRole("dialog", { name: "Choose a date range" });
    expect(sheet).toHaveAttribute("aria-modal", "true");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger.getAttribute("aria-controls")).toBe(sheet.id);
    // The preset grid, with thumb-sized rows.
    const thisMonth = within(sheet).getByRole("button", { name: "This month" });
    expect(thisMonth.className).toContain("min-h-11");
    fireEvent.click(thisMonth);
    expect(onCommit).not.toHaveBeenCalled();

    const footer = sheet.querySelector("[data-full-bleed-footer]")!;
    fireEvent.click(within(footer as HTMLElement).getByRole("button", { name: "Apply" }));
    expect(onCommit).toHaveBeenCalledWith("2026-09-01", "2026-09-30", "this_month");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes from its X without committing, and re-seeds the draft on the next open", () => {
    mockPhone();
    const onCommit = vi.fn();
    render(<Harness commit="apply" preset="last_month" onCommit={onCommit} />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("button", { name: "This month" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("button", { name: "Last month" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "This month" })).toHaveAttribute("aria-pressed", "false");
  });

  it("immediate mode commits a preset and closes, with no footer", () => {
    mockPhone();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    fireEvent.click(screen.getByRole("combobox"));
    const sheet = screen.getByRole("dialog");
    expect(sheet.querySelector("[data-full-bleed-footer]")).toBeNull();
    fireEvent.click(within(sheet).getByRole("button", { name: "This month" }));
    expect(onCommit).toHaveBeenCalledWith("2026-09-01", "2026-09-30", "this_month");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stays a popover on desktop", () => {
    render(<Harness commit="apply" />);
    fireEvent.click(screen.getByRole("combobox"));
    const panel = screen.getByRole("dialog", { name: "Choose a date range" });
    expect(panel).not.toHaveAttribute("aria-modal");
    expect(panel.querySelector("[data-full-bleed-footer]")).toBeNull();
    expect(within(panel).getByRole("button", { name: "Apply" })).toBeInTheDocument();
  });
});

describe("DateRangePicker renderTrigger", () => {
  const renderTrigger: DateRangePickerProps["renderTrigger"] = ({
    triggerProps,
    valueProps,
    preset,
    text,
  }) => (
    <button {...triggerProps} className={cn(triggerProps.className, "rounded-e-none")}>
      <span {...valueProps}>{preset ? preset.label : text}</span>
    </button>
  );

  it("keeps the kit's aria and names the active preset", () => {
    render(<Harness commit="apply" preset="last_month" renderTrigger={renderTrigger} />);
    const trigger = screen.getByRole("combobox", { name: "Period Last month" });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger.className).toContain("rounded-e-none");
    // The kit's field height classes are still there to merge over.
    expect(trigger.className).toContain("pe-9");

    fireEvent.click(trigger);
    const panel = screen.getByRole("dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
    fireEvent.click(within(panel).getByRole("button", { name: "This month" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Apply" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    // The harness holds `preset` at "last_month", which no longer matches the dates,
    // so nothing is marked and the trigger falls back to the kit's own text.
    expect(trigger).toHaveTextContent("9/1/2026 – 9/30/2026");
    // Focus came back through the ref in `triggerProps`.
    expect(trigger).toHaveFocus();
  });

  it("routes an external id and aria-describedby to the custom trigger", () => {
    render(
      <>
        <span id="hint">Reports use this window</span>
        <Harness id="range" aria-describedby="hint" renderTrigger={renderTrigger} />
      </>,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("id", "range");
    expect(trigger).toHaveAttribute("aria-describedby", "hint");
  });

  it("works with the phone sheet", () => {
    mockPhone();
    render(<Harness renderTrigger={renderTrigger} />);
    const trigger = screen.getByRole("combobox", { name: /Period/ });
    expect(trigger).toHaveTextContent("Last month");
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
