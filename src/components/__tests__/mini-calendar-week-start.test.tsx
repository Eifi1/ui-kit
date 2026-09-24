import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MiniCalendar } from "../mini-calendar";
import { DateRangePicker } from "../date-picker";
import { UiKitProvider, useKitWeekStart } from "../../i18n/kit-labels";

/**
 * `<UiKitProvider weekStartsOn>` (keksdose): a German-built app running in English
 * pins Monday without switching to en-GB. Order: prop > provider > locale > Monday.
 */

const noop = () => {};
const firstHead = () => screen.getAllByRole("columnheader")[0];

describe("week start from the provider", () => {
  it("beats the locale's week info", () => {
    render(
      <UiKitProvider locale="en-US" weekStartsOn={1}>
        <MiniCalendar from="2026-09-14" to="2026-09-14" mode="single" onSelect={noop} />
      </UiKitProvider>,
    );
    expect(firstHead()).toHaveAttribute("aria-label", "Monday");
  });

  it("loses to the component's own prop", () => {
    render(
      <UiKitProvider locale="en-GB" weekStartsOn={1}>
        <MiniCalendar from="2026-09-14" to="2026-09-14" mode="single" weekStartsOn={6} onSelect={noop} />
      </UiKitProvider>,
    );
    expect(firstHead()).toHaveAttribute("aria-label", "Saturday");
  });

  it("is inherited by a nested provider that does not restate it", () => {
    render(
      <UiKitProvider weekStartsOn={1}>
        <UiKitProvider locale="en-US">
          <MiniCalendar from="2026-09-14" to="2026-09-14" mode="single" onSelect={noop} />
        </UiKitProvider>
      </UiKitProvider>,
    );
    expect(firstHead()).toHaveAttribute("aria-label", "Monday");
  });

  it("reaches the calendar inside a date picker", () => {
    render(
      <UiKitProvider locale="en-US" weekStartsOn={1}>
        <DateRangePicker from="2026-09-14" to="2026-09-16" onChange={noop} />
      </UiKitProvider>,
    );
    fireEvent.click(screen.getByRole("combobox"));
    expect(firstHead()).toHaveAttribute("aria-label", "Monday");
  });

  it("is readable through useKitWeekStart", () => {
    function Probe() {
      return <span>{String(useKitWeekStart())}</span>;
    }
    const { rerender } = render(<Probe />);
    expect(screen.getByText("undefined")).toBeInTheDocument();
    rerender(
      <UiKitProvider weekStartsOn={0}>
        <Probe />
      </UiKitProvider>,
    );
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
