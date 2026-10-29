import { act, render, screen } from "@testing-library/react";
import { createRef, type ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { NumberInput } from "../number-input";
import { IntegerField, NumberField } from "../number-field";
import { DatePicker, DateRangePicker } from "../date-picker";
import { MonthPicker } from "../month-picker";
import { ToggleGroup } from "../toggle-group";
import { CurrencySelect } from "../currency-select";
import { ChipInput } from "../chip-input";

/**
 * API-3 (refactor audit 2026-10, round 0.34 Wave 3): ten focusable fields took no `ref`
 * at all, so neither an app nor the kit's own /rhf adapter could focus them — /rhf
 * looked each one up by id instead (`useFocusHandle`, "for a control that forwards no
 * ref"), and kastlan's 49 number and date fields went through that. Each takes a React 19
 * `ref` prop now, to the element that takes focus: the `<input>`, the trigger button of a
 * picker, and for ToggleGroup the group, whose `focus()` lands on the option a keyboard
 * would reach. MultiSelect's came with its API-4 rework (round 0.34 Wave 2).
 */

const noop = () => {};
const OPTIONS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/** `ref.current.focus()`, as react-hook-form's focus-on-error calls it. */
function focusThrough(ref: { current: { focus: () => void } | null }) {
  act(() => ref.current?.focus());
}

describe("a ref on every focusable field (API-3)", () => {
  it("NumberInput, NumberField and IntegerField: the <input>", () => {
    const refs = [createRef<HTMLInputElement>(), createRef<HTMLInputElement>(), createRef<HTMLInputElement>()];
    render(
      <>
        <NumberInput ref={refs[0]} aria-label="Ratio" value="" onChange={noop} />
        <NumberField ref={refs[1]} aria-label="Area" value={null} onCommit={noop} />
        <IntegerField ref={refs[2]} aria-label="Rooms" value={null} onCommit={noop} />
      </>,
    );
    for (const [ref, name] of [
      [refs[0], "Ratio"],
      [refs[1], "Area"],
      [refs[2], "Rooms"],
    ] as const) {
      const input = screen.getByRole("textbox", { name });
      expect(ref.current).toBe(input);
      focusThrough(ref);
      expect(input).toHaveFocus();
    }
  });

  it("DatePicker and DateRangePicker: the trigger, in the plain field and in the step row", () => {
    const single = createRef<HTMLButtonElement>();
    const stepped = createRef<HTMLButtonElement>();
    const range = createRef<HTMLButtonElement>();
    render(
      <>
        <DatePicker ref={single} label="Due" value="" onChange={noop} />
        <DatePicker ref={stepped} label="Booked" value="2026-10-12" onChange={noop} step today="2026-10-12" />
        <DateRangePicker ref={range} label="Period" from="" to="" onChange={noop} />
      </>,
    );
    for (const [ref, name] of [
      [single, /Due/],
      [stepped, /Booked/],
      [range, /Period/],
    ] as const) {
      const trigger = screen.getByRole("combobox", { name });
      expect(ref.current).toBe(trigger);
      focusThrough(ref);
      expect(trigger).toHaveFocus();
    }
  });

  it("DateRangePicker's ref reaches a `renderTrigger` button too", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <DateRangePicker
        ref={ref}
        aria-label="Period"
        from=""
        to=""
        onChange={noop}
        renderTrigger={({ triggerProps, valueProps, text }) => (
          <button {...triggerProps}>
            <span {...valueProps}>{text || "Pick"}</span>
          </button>
        )}
      />,
    );
    expect(ref.current).toHaveTextContent("Pick");
    focusThrough(ref);
    expect(ref.current).toHaveFocus();
  });

  it("MonthPicker: the trigger, as a field and as a stepper's heading", () => {
    const field = createRef<HTMLButtonElement>();
    const stepper = createRef<HTMLButtonElement>();
    render(
      <>
        <MonthPicker ref={field} label="Month" value="2026-10" onChange={noop} />
        <MonthPicker ref={stepper} variant="stepper" aria-label="Page month" value="2026-09" onChange={noop} />
      </>,
    );
    const trigger = screen.getByRole("combobox", { name: /Month/ });
    expect(field.current).toBe(trigger);
    focusThrough(field);
    expect(trigger).toHaveFocus();
    expect(stepper.current).toHaveAttribute("aria-haspopup", "dialog");
    expect(stepper.current).not.toBe(trigger);
    focusThrough(stepper);
    expect(stepper.current).toHaveFocus();
  });

  it("CurrencySelect: the trigger, not the wrapper", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<CurrencySelect ref={ref} aria-label="Currency" value="CHF" onChange={noop} />);
    const trigger = screen.getByRole("combobox", { name: /Currency/ });
    expect(ref.current).toBe(trigger);
    focusThrough(ref);
    expect(trigger).toHaveFocus();
  });

  it("ChipInput: the <input>, not the wrapper", () => {
    const ref = createRef<HTMLInputElement>();
    render(<ChipInput ref={ref} aria-label="Tags" value={["a"]} onChange={noop} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    focusThrough(ref);
    expect(ref.current).toHaveFocus();
  });

  it("ToggleGroup: the group, whose focus() lands on the checked option, else the first", () => {
    const checked = createRef<HTMLDivElement>();
    const empty = createRef<HTMLDivElement>();
    const pressed = createRef<HTMLDivElement>();
    render(
      <>
        <ToggleGroup ref={checked} aria-label="Range" options={OPTIONS} value="week" onChange={noop} />
        <ToggleGroup ref={empty} aria-label="Empty" options={OPTIONS} value={null} onChange={noop} allowEmpty />
        <ToggleGroup
          ref={pressed}
          aria-label="Pressed"
          options={OPTIONS}
          value="month"
          onChange={noop}
          semantics="pressed"
        />
      </>,
    );
    expect(checked.current).toBe(screen.getByRole("radiogroup", { name: "Range" }));
    focusThrough(checked);
    expect(screen.getByRole("radio", { name: "Week" })).toHaveFocus();

    focusThrough(empty);
    expect(empty.current?.querySelector("button")).toHaveFocus();

    expect(pressed.current).toBe(screen.getByRole("group", { name: "Pressed" }));
    focusThrough(pressed);
    expect(screen.getByRole("button", { name: "Month", pressed: true })).toHaveFocus();
  });

  it("types: each field's ref is typed to the element it reaches (checked by tsc)", () => {
    const input: ComponentProps<typeof NumberInput>["ref"] = createRef<HTMLInputElement>();
    const numberField: ComponentProps<typeof NumberField>["ref"] = createRef<HTMLInputElement>();
    const integerField: ComponentProps<typeof IntegerField>["ref"] = createRef<HTMLInputElement>();
    const date: ComponentProps<typeof DatePicker>["ref"] = createRef<HTMLButtonElement>();
    const dateRange: ComponentProps<typeof DateRangePicker>["ref"] = createRef<HTMLButtonElement>();
    const month: ComponentProps<typeof MonthPicker>["ref"] = createRef<HTMLButtonElement>();
    const toggle: ComponentProps<typeof ToggleGroup>["ref"] = createRef<HTMLDivElement>();
    const currency: ComponentProps<typeof CurrencySelect>["ref"] = createRef<HTMLButtonElement>();
    const chips: ComponentProps<typeof ChipInput>["ref"] = createRef<HTMLInputElement>();
    // @ts-expect-error — a picker's ref is its trigger button, not the wrapper div
    const wrapper: ComponentProps<typeof CurrencySelect>["ref"] = createRef<HTMLDivElement>();
    expect(
      [input, numberField, integerField, date, dateRange, month, toggle, currency, chips, wrapper].every(Boolean),
    ).toBe(true);
  });
});
