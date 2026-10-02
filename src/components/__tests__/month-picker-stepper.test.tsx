import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MonthPicker, type MonthPickerProps } from "../month-picker";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";

/**
 * `variant="stepper"`: the header of a month page — kastlan's calendar page built it
 * by hand around the field (calendar-page.tsx), overriding the trigger to look like a
 * heading. Pinned to a fixed "current month".
 */
function renderStepper(props: Partial<MonthPickerProps> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <MonthPicker
      variant="stepper"
      value="2026-08"
      onChange={onChange}
      locale="en-GB"
      currentMonth="2026-09"
      {...props}
    />,
  );
  return { ...utils, onChange };
}

const headingButton = () => screen.getByRole("button", { name: /2026|2025|2027/ });

describe("MonthPicker variant='stepper'", () => {
  it("sets the month as a heading, with a button that opens the grid", () => {
    renderStepper();
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("August 2026");
    const button = headingButton();
    expect(heading).toContainElement(button);
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(button).toHaveAttribute("aria-expanded", "false");
    // Not the field's combobox.
    expect(screen.queryByRole("combobox")).toBeNull();
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Choose a month" })).toBeInTheDocument();
  });

  it("picks from the grid and closes", () => {
    const { onChange } = renderStepper();
    fireEvent.click(headingButton());
    fireEvent.click(screen.getByRole("gridcell", { name: "March 2026" }));
    expect(onChange).toHaveBeenCalledWith("2026-03");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("steps one month back and forth, across the year", () => {
    const { onChange } = renderStepper({ value: "2026-01" });
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(onChange).toHaveBeenLastCalledWith("2025-12");
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-02");
  });

  it("jumps to the current month with Today", () => {
    const { onChange } = renderStepper();
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(onChange).toHaveBeenCalledWith("2026-09");
  });

  it("follows a controlled value, and says where it went", () => {
    function Page() {
      const [month, setMonth] = useState("2026-08");
      return (
        <MonthPicker variant="stepper" value={month} onChange={setMonth} locale="en-GB" currentMonth="2026-09" />
      );
    }
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    const text = screen.getByText("September 2026");
    expect(text).toHaveAttribute("aria-live", "polite");
  });

  it("disables what leads out of bounds", () => {
    renderStepper({ value: "2026-08", min: "2026-08", max: "2026-08-20" });
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
    // "Now" (September) is past `max`.
    expect(screen.getByRole("button", { name: "Today" })).toBeDisabled();
  });

  it("steps from the current month when there is no value", () => {
    const { onChange } = renderStepper({ value: "" });
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(onChange).toHaveBeenCalledWith("2026-10");
  });

  it("takes another heading level, or none, and can leave Today out", () => {
    renderStepper({ headingLevel: 3, showToday: false });
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Today" })).toBeNull();
    renderStepper({ headingLevel: false });
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });

  it("mirrors its arrows in RTL", () => {
    const { container } = render(
      <div dir="rtl">
        <MonthPicker variant="stepper" value="2026-08" onChange={() => {}} currentMonth="2026-09" />
      </div>,
    );
    for (const svg of container.querySelectorAll("button[aria-label] svg")) {
      expect(svg.getAttribute("class")).toContain("rtl:-scale-x-100");
    }
  });

  it("speaks the provider's language", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH} locale="de-CH">
        <MonthPicker variant="stepper" value="2026-08" onChange={() => {}} currentMonth="2026-09" />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Vorheriger Monat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nächster Monat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Heute" })).toBeInTheDocument();
  });

  it("leaves the field variant as it was", () => {
    render(<MonthPicker value="2026-08" onChange={() => {}} locale="en-GB" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("August 2026");
    expect(screen.queryByRole("button", { name: "Next month" })).toBeNull();
  });
});
