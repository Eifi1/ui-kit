import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DatePicker } from "../date-picker";
import { MonthPicker, type MonthPickerProps } from "../month-picker";
import { Lightbox, type ImageItem } from "../lightbox";

/**
 * A control pressed to its limit keeps the focus (refactor audit 2026-10-30, INP-4).
 *
 * DatePicker's ‹ › and Today, MonthPicker's year arrows, page arrows and stepper, and
 * Lightbox's previous/next turned natively `disabled` on the press that took them to
 * their end — while focused, so the browser's focus fixup put the focus on <body>, and
 * a keyboard user was back at the top of the page mid-form. keksdose reaches the date
 * row in 14 files (its shared date field always passes `step` and `today`) and its
 * budget MonthPicker passes `min`; kastlan's ImageGrid and keksdose's invoice review
 * open the Lightbox. They now follow JumpCalendar's rule: `aria-disabled`, and a click
 * that does nothing.
 *
 * jsdom does not run the focus fixup, so {@link focused} applies it: a natively
 * disabled control is not where the focus is.
 */
function focused(): Element | null {
  const el = document.activeElement;
  return el instanceof HTMLButtonElement && el.disabled ? document.body : el;
}

/** Focus the control and press it, as Enter on a focused button does. */
function press(button: HTMLElement) {
  button.focus();
  fireEvent.click(button);
}

/** Pressed at its limit, it stays where it was, focused, and says it is unavailable. */
function expectHeldAtLimit(button: HTMLElement) {
  expect(focused()).toBe(button);
  expect(button).toHaveAttribute("aria-disabled", "true");
}

afterEach(() => {
  cleanup();
});

describe("DatePicker's step row at its limits", () => {
  function Row({ start, ...props }: { start: string; min?: string; max?: string; today?: string; step?: boolean }) {
    const [value, setValue] = useState(start);
    return (
      <>
        <DatePicker value={value} onChange={setValue} locale="en-GB" aria-label="Booking date" {...props} />
        <output data-testid="value">{value}</output>
      </>
    );
  }
  const value = () => screen.getByTestId("value").textContent;

  it("keeps the focus on › when it reaches `max`", () => {
    render(<Row start="2026-10-30" max="2026-10-31" step />);
    const next = screen.getByRole("button", { name: "Next day" });
    press(next);
    expect(value()).toBe("2026-10-31");
    expectHeldAtLimit(next);
    // Refused, not just dressed as refused.
    press(next);
    expect(value()).toBe("2026-10-31");
  });

  it("keeps the focus on ‹ when it reaches `min`", () => {
    render(<Row start="2026-10-02" min="2026-10-01" step />);
    const previous = screen.getByRole("button", { name: "Previous day" });
    press(previous);
    expect(value()).toBe("2026-10-01");
    expectHeldAtLimit(previous);
    press(previous);
    expect(value()).toBe("2026-10-01");
  });

  it("keeps the focus on Today once the value is today", () => {
    render(<Row start="2026-10-20" today="2026-10-31" step />);
    const today = screen.getByRole("button", { name: "Today" });
    press(today);
    expect(value()).toBe("2026-10-31");
    expectHeldAtLimit(today);
  });
});

describe("MonthPicker's arrows at their limits", () => {
  function Picker(props: Partial<MonthPickerProps>) {
    const [value, setValue] = useState(props.value ?? "2026-08");
    return (
      <MonthPicker
        locale="en-GB"
        currentMonth="2026-09"
        aria-label="Month"
        {...props}
        value={value}
        onChange={setValue}
      />
    );
  }

  it("keeps the focus on the grid's › year when the year after is out of bounds", () => {
    render(<Picker value="2025-08" max="2026-10" />);
    fireEvent.click(screen.getByRole("combobox"));
    const next = screen.getByRole("button", { name: "Next year" });
    press(next);
    expect(screen.getByText("2026")).toBeInTheDocument();
    expectHeldAtLimit(next);
    press(next);
    expect(screen.getByText("2026")).toBeInTheDocument();
  });

  it("keeps the focus on the grid's ‹ year when the year before is out of bounds", () => {
    render(<Picker value="2026-08" min="2025-03" />);
    fireEvent.click(screen.getByRole("combobox"));
    const previous = screen.getByRole("button", { name: "Previous year" });
    press(previous);
    expect(screen.getByText("2025")).toBeInTheDocument();
    expectHeldAtLimit(previous);
  });

  it("keeps the focus on the year grid's page arrows at the bounds", () => {
    render(<Picker mode="year" value="2020" min="2000" max="2030" currentMonth="2020-01" />);
    fireEvent.click(screen.getByRole("combobox"));
    const later = screen.getByRole("button", { name: "Later years" });
    // 2000–2011, 2012–2023, 2024–2030: two pages on from 2020's.
    press(later);
    expectHeldAtLimit(later);
    const earlier = screen.getByRole("button", { name: "Earlier years" });
    press(earlier);
    press(earlier);
    expectHeldAtLimit(earlier);
  });

  it("keeps the focus on the stepper's › and ‹ at the bounds", () => {
    render(<Picker variant="stepper" value="2026-08" min="2026-07" max="2026-09" />);
    const next = screen.getByRole("button", { name: "Next month" });
    press(next);
    expect(screen.getByText("September 2026")).toBeInTheDocument();
    expectHeldAtLimit(next);
    press(next);
    expect(screen.getByText("September 2026")).toBeInTheDocument();

    const previous = screen.getByRole("button", { name: "Previous month" });
    press(previous);
    press(previous);
    expect(screen.getByText("July 2026")).toBeInTheDocument();
    expectHeldAtLimit(previous);
  });
});

describe("Lightbox's arrows at the ends of the set", () => {
  const ITEMS: ImageItem[] = [
    { src: "/a.jpg", alt: "Kitchen" },
    { src: "/b.jpg", alt: "Hallway" },
  ];
  function Viewer() {
    const [index, setIndex] = useState(0);
    return <Lightbox open onClose={() => {}} items={ITEMS} index={index} onIndexChange={setIndex} />;
  }

  afterEach(async () => {
    // The viewer's history entry unwinds a task or two after it unmounts.
    for (let i = 0; i < 4; i += 1) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }
  });

  it("keeps the focus on › at the last picture and on ‹ at the first", () => {
    render(<Viewer />);
    const next = screen.getByRole("button", { name: "Next image" });
    press(next);
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Hallway");
    expectHeldAtLimit(next);
    press(next);
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Hallway");

    const previous = screen.getByRole("button", { name: "Previous image" });
    press(previous);
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Kitchen");
    expectHeldAtLimit(previous);
  });
});
