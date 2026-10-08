import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Star } from "lucide-react";
import { SwatchPicker } from "../swatch-picker";
import { IconPicker } from "../icon-picker";
import { Chip } from "../chip";
import { DatePicker, DateRangePicker } from "../date-picker";
import { MonthPicker } from "../month-picker";
import { DateMark } from "../account-chips";
import { FieldHint, FIELD_INVALID } from "../ui";
import { WriteLockProvider } from "../write-lock";
import { UiKitProvider, type KitDateFormatter } from "../../i18n/kit-labels";

/**
 * 0.22.0, the pickers' half of the round: keksdose K2 (labels on the tile pickers), K3
 * (`commit` / `disabledReason` on Chip and SwatchPicker), K4 (`hint` / `error` on the
 * date and month pickers), K12 (the provider's `formatDate`), K13 (`MonthPicker
 * size="sm"`), and kastlan 7 / keksdose's tax tab (`MonthPicker mode="year"`).
 */

const SWATCHES = [
  { value: "red", label: "Red", color: "#f00" },
  { value: "blue", label: "Blue", color: "#00f" },
];

describe("SwatchPicker / IconPicker label (keksdose K2)", () => {
  it("names the group by an 11px label in a 20px strip; className styles the wrapper", () => {
    const { container } = render(
      <SwatchPicker
        label="Flag"
        hint={<FieldHint label="Shown in the register" />}
        className="col-span-2"
        value="red"
        onChange={vi.fn()}
        options={SWATCHES}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Flag" });
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("pt-5");
    expect(wrapper.className).toContain("col-span-2");
    expect(group.className).not.toContain("col-span-2");
    expect(screen.getByText("Flag").className).toContain("text-caption");
    expect(screen.getByRole("button", { name: "Shown in the register" })).toBeInTheDocument();
  });

  it("lets an explicit aria-label win, and renders as before without a label", () => {
    const { container, rerender } = render(
      <SwatchPicker label="Flag" aria-label="Row flag" value="red" onChange={vi.fn()} options={SWATCHES} />,
    );
    expect(screen.getByRole("radiogroup", { name: "Row flag" })).toBeInTheDocument();
    rerender(<SwatchPicker aria-label="Row flag" className="gap-3" value="red" onChange={vi.fn()} options={SWATCHES} />);
    expect(container.firstElementChild).toBe(screen.getByRole("radiogroup"));
    expect(screen.getByRole("radiogroup").className).toContain("gap-3");
  });

  it("IconPicker: the label names the grid; the search keeps its own name", () => {
    render(
      <IconPicker
        label="Symbol"
        searchable
        value={null}
        onChange={vi.fn()}
        options={[{ value: "star", label: "Star", icon: Star }]}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Symbol" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search icons" })).toBeInTheDocument();
  });
});

describe("SwatchPicker commit / disabledReason (keksdose K3)", () => {
  it("stays reachable, refuses the change and says why", () => {
    const onChange = vi.fn();
    render(
      <SwatchPicker
        aria-label="Flag"
        disabledReason="Reconciled rows are final."
        value="red"
        onChange={onChange}
        options={SWATCHES}
      />,
    );
    const red = screen.getByRole("radio", { name: "Red" });
    const blue = screen.getByRole("radio", { name: "Blue" });
    expect(red).not.toBeDisabled();
    expect(red).toHaveAttribute("tabindex", "0");
    const group = screen.getByRole("radiogroup", { name: "Flag" });
    expect(group).toHaveAttribute("aria-disabled", "true");
    expect(group).toHaveAccessibleDescription("Reconciled rows are final.");
    fireEvent.click(blue);
    expect(onChange).not.toHaveBeenCalled();
    // Automatic activation would choose on the arrow; locked, it only moves.
    red.focus();
    fireEvent.keyDown(red, { key: "ArrowRight" });
    expect(blue).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("commit: the provider's lock and reason; nothing without a lock", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <WriteLockProvider locked reason="Read-only demo.">
        <SwatchPicker aria-label="Flag" commit value="red" onChange={onChange} options={SWATCHES} />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("radiogroup")).toHaveAccessibleDescription("Read-only demo.");
    fireEvent.click(screen.getByRole("radio", { name: "Blue" }));
    expect(onChange).not.toHaveBeenCalled();
    rerender(
      <WriteLockProvider locked={false}>
        <SwatchPicker aria-label="Flag" commit value="red" onChange={onChange} options={SWATCHES} />
      </WriteLockProvider>,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Blue" }));
    expect(onChange).toHaveBeenCalledWith("blue");
  });
});

describe("Chip commit / disabledReason (keksdose K3)", () => {
  it("a toggle chip: focusable, aria-disabled, press and × swallowed, described", () => {
    const onClick = vi.fn();
    const onRemove = vi.fn();
    render(
      <Chip onClick={onClick} selected onRemove={onRemove} disabledReason="Shared with you to read.">
        Groceries
      </Chip>,
    );
    const chip = screen.getByRole("button", { name: "Groceries" });
    expect(chip).not.toBeDisabled();
    expect(chip).toHaveAttribute("aria-disabled", "true");
    expect(chip).toHaveAccessibleDescription("Shared with you to read.");
    fireEvent.click(chip);
    expect(onClick).not.toHaveBeenCalled();
    const remove = screen.getByRole("button", { name: /remove/i });
    expect(remove).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(remove);
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Shared with you to read.");
  });

  it("wins over disabled, and keeps a caller's own description", () => {
    render(
      <>
        <p id="own">Filters the list.</p>
        <Chip onClick={vi.fn()} disabled disabledReason="Locked." aria-describedby="own">
          Open
        </Chip>
      </>,
    );
    const chip = screen.getByRole("button", { name: "Open" });
    expect(chip).not.toBeDisabled();
    expect(chip).toHaveAccessibleDescription("Filters the list. Locked.");
  });

  it("commit: locked by the provider; an unlocked chip is untouched", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <WriteLockProvider locked reason="Read-only demo.">
        <Chip onClick={onClick} commit>
          Open
        </Chip>
      </WriteLockProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(onClick).not.toHaveBeenCalled();
    rerender(
      <WriteLockProvider locked={false}>
        <Chip onClick={onClick} commit>
          Open
        </Chip>
      </WriteLockProvider>,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("DatePicker / DateRangePicker hint and error (keksdose K4)", () => {
  it("text hint is a caption, error is a message, both describe the trigger in that order", () => {
    render(
      <DatePicker
        label="Due date"
        value="2026-09-07"
        onChange={vi.fn()}
        locale="en-GB"
        hint="The day the bank books it."
        error="Before the invoice date."
      />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAccessibleDescription("The day the bank books it. Before the invoice date.");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    for (const token of FIELD_INVALID.split(/\s+/)) expect(trigger.className).toContain(token);
  });

  it("a FieldHint rides the label line", () => {
    render(
      <DatePicker label="Due date" value="" onChange={vi.fn()} hint={<FieldHint label="When it is due" />} />,
    );
    const hint = screen.getByRole("button", { name: "When it is due" });
    // On the label's own row, in the field's top strip.
    expect(hint.closest(".top-1")).not.toBeNull();
    expect(screen.queryByText("When it is due", { selector: "p" })).toBeNull();
  });

  it("puts the error under the whole step row and keeps the trigger mounted as it comes and goes", () => {
    function Harness() {
      const [error, setError] = useState<string | undefined>(undefined);
      return (
        <>
          <DatePicker label="Booked" value="2026-09-07" onChange={vi.fn()} step today="2026-09-08" error={error} />
          <button type="button" onClick={() => setError("Too early")}>
            fail
          </button>
        </>
      );
    }
    render(<Harness />);
    const before = screen.getByRole("combobox");
    fireEvent.click(screen.getByRole("button", { name: "fail" }));
    const after = screen.getByRole("combobox");
    expect(after).toBe(before);
    const message = screen.getByText("Too early");
    // The message follows the joined row (step buttons included), not the field inside it.
    expect(message.previousElementSibling?.querySelector('[aria-label="Previous day"]')).not.toBeNull();
  });

  it("DateRangePicker: the same anatomy", () => {
    render(
      <DateRangePicker label="Period" from="2026-09-01" to="2026-09-30" onChange={vi.fn()} hint="Inclusive." error="Too long." />,
    );
    expect(screen.getByRole("combobox")).toHaveAccessibleDescription("Inclusive. Too long.");
  });

  it("adds nothing without the props", () => {
    const { container } = render(<DatePicker value="" onChange={vi.fn()} className="w-40" />);
    expect((container.firstElementChild as HTMLElement).className).toContain("w-40");
  });
});

describe("MonthPicker error, hint and size=sm (keksdose K4, K13)", () => {
  it("error: message, aria-invalid, description", () => {
    render(<MonthPicker label="Month" value="2026-08" onChange={vi.fn()} locale="en-GB" error="Closed month." hint="Budget period." />);
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAccessibleDescription("Budget period. Closed month.");
  });

  it("sm: a 36px, content-wide trigger in a content-wide root", () => {
    const { container } = render(
      <MonthPicker aria-label="Month" size="sm" value="2026-08" onChange={vi.fn()} locale="en-GB" />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger.className).toContain("h-9");
    expect(trigger.className).toContain("w-auto");
    expect(trigger.className).toContain("py-0");
    expect((container.firstElementChild as HTMLElement).className).toContain("w-fit");
  });

  it("sm is ignored with a label — the floating label needs the tall box", () => {
    render(<MonthPicker label="Month" size="sm" value="2026-08" onChange={vi.fn()} locale="en-GB" />);
    expect(screen.getByRole("combobox").className).not.toContain("h-9");
  });
});

describe('MonthPicker mode="year" (kastlan 7, keksdose tax-tab.tsx:33)', () => {
  it("shows the year and offers exactly the bounded years, with no paging", () => {
    const onChange = vi.fn();
    render(
      <MonthPicker mode="year" label="Tax year" value="2026" min="2022" max="2026" currentMonth="2026-10" onChange={onChange} locale="en-GB" />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAccessibleName("Tax year 2026");
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Choose a year" })).toBeInTheDocument();
    const cells = screen.getAllByRole("gridcell");
    expect(cells.map((c) => c.textContent)).toEqual(["2022", "2023", "2024", "2025", "2026"]);
    expect(screen.queryByRole("button", { name: "Earlier years" })).toBeNull();
    expect(screen.getByRole("gridcell", { name: "2026" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("gridcell", { name: "2026" })).toHaveAttribute("aria-current", "date");
    fireEvent.click(screen.getByRole("gridcell", { name: "2024" }));
    expect(onChange).toHaveBeenCalledWith("2024");
  });

  it("pages twelve years at a time from min, refusing what is out of bounds", () => {
    const onChange = vi.fn();
    render(<MonthPicker mode="year" aria-label="Fiscal year" value="2026" min="2020" onChange={onChange} locale="en-GB" />);
    fireEvent.click(screen.getByRole("combobox"));
    const grid = screen.getByRole("grid");
    expect(within(grid).getAllByRole("gridcell")).toHaveLength(12);
    expect(within(grid).getAllByRole("gridcell")[0]).toHaveTextContent("2020");
    expect(screen.getByRole("button", { name: "Earlier years" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Later years" }));
    expect(within(screen.getByRole("grid")).getAllByRole("gridcell")[0]).toHaveTextContent("2032");
    // The keyboard: PageUp turns back a page, onto the same column.
    const focused = document.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]')!;
    expect(focused).toHaveTextContent("2038");
    focused.focus();
    fireEvent.keyDown(focused, { key: "PageUp" });
    expect(document.activeElement).toHaveTextContent("2026");
  });

  it("the stepper steps a year, and its Today reads This year", () => {
    const onChange = vi.fn();
    render(
      <MonthPicker mode="year" variant="stepper" value="2024" max="2025" currentMonth="2026-10" onChange={onChange} locale="en-GB" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Previous year" }));
    expect(onChange).toHaveBeenLastCalledWith("2023");
    fireEvent.click(screen.getByRole("button", { name: "Next year" }));
    expect(onChange).toHaveBeenLastCalledWith("2025");
    // 2026 is beyond max: This year is dead.
    expect(screen.getByRole("button", { name: "This year" })).toBeDisabled();
  });
});

describe("<UiKitProvider formatDate> (keksdose K12)", () => {
  const fmt: KitDateFormatter = (iso, ctx) => `[${iso} ${ctx.unit} ${ctx.source} ${ctx.weekday ? "wd" : "-"} ${ctx.locale}]`;

  it("writes the DatePicker trigger, with the weekday suggested", () => {
    render(
      <UiKitProvider formatDate={fmt} locale="de-CH">
        <DatePicker aria-label="Due" value="2026-09-07" onChange={vi.fn()} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("[2026-09-07 day datePicker wd de-CH]");
  });

  it("loses to the picker's own formatValue and formatOptions; '' falls back", () => {
    render(
      <UiKitProvider formatDate={(iso) => (iso.endsWith("07") ? "" : "provider")} locale="en-GB">
        <DatePicker aria-label="A" value="2026-09-08" onChange={vi.fn()} formatValue={() => "own"} />
        <DatePicker aria-label="B" value="2026-09-08" onChange={vi.fn()} formatOptions={{ year: "numeric" }} />
        <DatePicker aria-label="C" value="2026-09-07" onChange={vi.fn()} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("combobox", { name: /^A/ })).toHaveTextContent("own");
    expect(screen.getByRole("combobox", { name: /^B/ })).toHaveTextContent("2026");
    expect(screen.getByRole("combobox", { name: /^C/ })).toHaveTextContent("07/09/2026");
  });

  it("writes each end of a range without the weekday", () => {
    render(
      <UiKitProvider formatDate={fmt}>
        <DateRangePicker aria-label="Period" from="2026-09-01" to="2026-09-30" onChange={vi.fn()} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent(
      "[2026-09-01 day dateRangePicker - undefined] – [2026-09-30 day dateRangePicker - undefined]",
    );
  });

  it("writes the MonthPicker trigger in month and year mode", () => {
    render(
      <UiKitProvider formatDate={fmt}>
        <MonthPicker aria-label="Month" value="2026-08" onChange={vi.fn()} />
        <MonthPicker aria-label="Year" mode="year" value="2026" onChange={vi.fn()} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("combobox", { name: /^Month/ })).toHaveTextContent("[2026-08 month monthPicker - undefined]");
    expect(screen.getByRole("combobox", { name: /^Year/ })).toHaveTextContent("[2026 year monthPicker - undefined]");
  });

  it("writes a DateMark's local calendar day, unless it has a dateStyle", () => {
    render(
      <UiKitProvider formatDate={fmt} locale="en-GB">
        <DateMark value="2026-09-07" />
        <DateMark value="2026-09-07" dateStyle="short" />
      </UiKitProvider>,
    );
    const marks = document.querySelectorAll("time");
    expect(marks[0]).toHaveTextContent("[2026-09-07 day dateMark wd en-GB]");
    expect(marks[1]).toHaveTextContent("07/09/2026");
  });

  it("is inherited through a nested provider and absent without one", () => {
    const { rerender } = render(
      <UiKitProvider formatDate={() => "outer"}>
        <UiKitProvider locale="de-DE">
          <DateMark value="2026-09-07" />
        </UiKitProvider>
      </UiKitProvider>,
    );
    expect(document.querySelector("time")).toHaveTextContent("outer");
    rerender(<DateMark value="2026-09-07" locale="en-GB" />);
    expect(document.querySelector("time")).toHaveTextContent("7 Sept 2026");
  });
});
