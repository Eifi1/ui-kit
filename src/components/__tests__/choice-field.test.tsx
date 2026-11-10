import { createRef, useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChoiceField, type ChoiceFieldOption, type ChoiceFieldProps } from "../choice-field";
import { WriteLockProvider } from "../write-lock";
import { applyTextSize } from "../../theme/text-size";
import { axeViolations } from "../../test/axe";
import {
  DESKTOP_WIDTH,
  PHONE_WIDTH,
  setViewportWidth,
  stubDesktop,
  stubPhone,
  viewportMatchMedia,
} from "../../test/viewport";

/**
 * 0.58: ChoiceField — one answer from a few, a segmented ToggleGroup from `md` up and a
 * Select on a phone (keksdose's price-tab `HeaderChoice`, live #409, and the shopping
 * lists' breakdown `Choice`, SL-18, both hand-rolled). What has to hold is that the two
 * forms are ONE field: one control mounted, the same name and the same value to a screen
 * reader, the value kept across a switch, and the switch where the rest of the phone
 * layout switches, at every text size.
 */

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-text-size");
});

type Grain = "month" | "quarter" | "year";

const GRAINS: ChoiceFieldOption<Grain>[] = [
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

/** A window `width` px wide, live: `setViewportWidth` resizes it. */
function windowOf(width: number) {
  vi.stubGlobal("matchMedia", viewportMatchMedia(width));
}

/** A ChoiceField holding its own value, as a page does. */
function Grains(props: Partial<ChoiceFieldProps<Grain>>) {
  const [grain, setGrain] = useState<Grain>("month");
  return <ChoiceField label="Group by" value={grain} onChange={setGrain} options={GRAINS} {...props} />;
}

function theSelect(name: string | RegExp = "Group by") {
  return screen.getByRole<HTMLSelectElement>("combobox", { name });
}

describe("ChoiceField — the form follows the phone layout", () => {
  it("is a segmented radio group on a desktop, and no select", () => {
    stubDesktop();
    const onChange = vi.fn();
    render(<ChoiceField label="Group by" value="month" onChange={onChange} options={GRAINS} />);
    const group = screen.getByRole("radiogroup", { name: "Group by" });
    expect(
      within(group)
        .getAllByRole("radio")
        .map((r) => r.textContent),
    ).toEqual(["Month", "Quarter", "Year"]);
    expect(within(group).getByRole("radio", { name: "Month" })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByRole("combobox")).toBeNull();
    fireEvent.click(within(group).getByRole("radio", { name: "Year" }));
    expect(onChange).toHaveBeenCalledWith("year");
  });

  it("is the group where there is no matchMedia at all, as every kit hook reads the desktop", () => {
    render(<ChoiceField label="Group by" value="month" onChange={vi.fn()} options={GRAINS} />);
    expect(screen.getByRole("radiogroup", { name: "Group by" })).toBeInTheDocument();
  });

  it("is a select on a phone, listing the same options in the same order, and no group", () => {
    stubPhone();
    const onChange = vi.fn();
    render(<ChoiceField label="Group by" value="month" onChange={onChange} options={GRAINS} />);
    const select = theSelect();
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Month", "Quarter", "Year"]);
    expect(select).toHaveValue("month");
    expect(screen.queryByRole("radiogroup")).toBeNull();
    fireEvent.change(select, { target: { value: "quarter" } });
    expect(onChange).toHaveBeenCalledWith("quarter");
  });

  it("switches at the text size's md: a 900 px window is a desktop at Normal and a phone at Large", () => {
    windowOf(900);
    const { unmount } = render(<Grains />);
    expect(screen.getByRole("radiogroup", { name: "Group by" })).toBeInTheDocument();
    unmount();
    act(() => applyTextSize("large"));
    render(<Grains />);
    expect(theSelect()).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("takes another breakpoint: with `lg`, a 900 px window gets the select", () => {
    windowOf(900);
    render(<Grains breakpoint="lg" />);
    expect(theSelect()).toBeInTheDocument();
    act(() => setViewportWidth(1100));
    expect(screen.getByRole("radiogroup", { name: "Group by" })).toBeInTheDocument();
  });

  it("can be pinned to either form: `segmented` on a phone, `select` on a desktop", () => {
    stubPhone();
    const { unmount } = render(<Grains layout="segmented" />);
    expect(screen.getByRole("radiogroup", { name: "Group by" })).toBeInTheDocument();
    unmount();
    vi.unstubAllGlobals();
    stubDesktop();
    render(<Grains layout="select" />);
    expect(theSelect()).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });
});

describe("ChoiceField — one field in both forms", () => {
  it("is heard with the same name and the same value in both forms", () => {
    stubDesktop();
    const { unmount } = render(<ChoiceField label="Group by" value="quarter" onChange={vi.fn()} options={GRAINS} />);
    const group = screen.getByRole("radiogroup");
    expect(group).toHaveAccessibleName("Group by");
    expect(within(group).getByRole("radio", { checked: true })).toHaveAccessibleName("Quarter");
    unmount();
    vi.unstubAllGlobals();
    stubPhone();
    render(<ChoiceField label="Group by" value="quarter" onChange={vi.fn()} options={GRAINS} />);
    const select = screen.getByRole<HTMLSelectElement>("combobox");
    expect(select).toHaveAccessibleName("Group by");
    expect(select).toHaveDisplayValue("Quarter");
    expect(select.selectedOptions[0]).toHaveAccessibleName("Quarter");
  });

  it("is named by aria-label in both forms when it has no visible label", () => {
    stubDesktop();
    const { unmount } = render(<ChoiceField aria-label="Grain" value="month" onChange={vi.fn()} options={GRAINS} />);
    expect(screen.getByRole("radiogroup", { name: "Grain" })).toBeInTheDocument();
    unmount();
    vi.unstubAllGlobals();
    stubPhone();
    render(<ChoiceField aria-label="Grain" value="month" onChange={vi.fn()} options={GRAINS} />);
    expect(theSelect("Grain")).toHaveValue("month");
  });

  it("passes axe's ARIA and label rules in both forms, the empty stand-in included", async () => {
    for (const stub of [stubDesktop, stubPhone]) {
      stub();
      const { container, unmount } = render(
        <>
          <Grains />
          <ChoiceField aria-label="Grain" value="" onChange={vi.fn()} options={GRAINS} />
        </>,
      );
      expect(await axeViolations(container)).toEqual([]);
      unmount();
      vi.unstubAllGlobals();
    }
  });

  it("keeps the value when the window crosses the breakpoint, both ways", () => {
    windowOf(DESKTOP_WIDTH);
    render(<Grains />);
    fireEvent.click(screen.getByRole("radio", { name: "Quarter" }));
    act(() => setViewportWidth(PHONE_WIDTH));
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(theSelect()).toHaveDisplayValue("Quarter");
    fireEvent.change(theSelect(), { target: { value: "year" } });
    act(() => setViewportWidth(DESKTOP_WIDTH));
    expect(screen.getByRole("radio", { name: "Year" })).toHaveAttribute("aria-checked", "true");
  });

  it("shows nothing chosen in either form for a value no option has, and the first option is pickable", () => {
    stubDesktop();
    const { unmount } = render(<ChoiceField label="Group by" value="" onChange={vi.fn()} options={GRAINS} />);
    for (const radio of screen.getAllByRole("radio")) expect(radio).toHaveAttribute("aria-checked", "false");
    unmount();
    vi.unstubAllGlobals();
    stubPhone();
    const onChange = vi.fn();
    render(<ChoiceField label="Group by" value="" onChange={onChange} options={GRAINS} />);
    const select = theSelect();
    // Not React's fallback to the first option: the stand-in holds the empty value, and
    // it is neither listed nor pickable.
    expect(select).toHaveDisplayValue("");
    expect(select.value).toBe("");
    expect(select.selectedOptions[0]).toBeDisabled();
    expect(within(select).getAllByRole("option")).toHaveLength(3);
    fireEvent.change(select, { target: { value: "month" } });
    expect(onChange).toHaveBeenCalledWith("month");
  });

  it("draws an option's icon in its segment only, hidden, so both forms name it by its label", () => {
    const options: ChoiceFieldOption<Grain>[] = [
      { value: "month", label: "Month", icon: <svg data-testid="icon-month" /> },
      { value: "year", label: "Year" },
    ];
    stubDesktop();
    const { unmount } = render(<ChoiceField label="Group by" value="month" onChange={vi.fn()} options={options} />);
    const month = screen.getByRole("radio", { name: "Month" });
    const icon = within(month).getByTestId("icon-month");
    expect(icon.closest("[aria-hidden]")).not.toBeNull();
    unmount();
    vi.unstubAllGlobals();
    stubPhone();
    render(<ChoiceField label="Group by" value="month" onChange={vi.fn()} options={options} />);
    expect(screen.queryByTestId("icon-month")).toBeNull();
    expect(
      within(theSelect())
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Month", "Year"]);
  });

  it("describes the control with the hint and the error in both forms", () => {
    for (const stub of [stubDesktop, stubPhone]) {
      stub();
      const { unmount } = render(
        <ChoiceField
          label="Group by"
          hint="Applies to every chart"
          error="Pick a grain"
          value="month"
          onChange={vi.fn()}
          options={GRAINS}
        />,
      );
      const control = stub === stubDesktop ? screen.getByRole("radiogroup") : theSelect();
      expect(control).toHaveAccessibleDescription("Applies to every chart Pick a grain");
      expect(control).toHaveAttribute("aria-invalid", "true");
      unmount();
      vi.unstubAllGlobals();
    }
  });

  it("draws `help` as the one '?' named after the label in both forms", () => {
    for (const stub of [stubDesktop, stubPhone]) {
      stub();
      const { unmount } = render(<Grains help="Month, quarter or year: the width of each bar." />);
      expect(screen.getAllByRole("button", { name: "About “Group by”" })).toHaveLength(1);
      unmount();
      vi.unstubAllGlobals();
    }
  });

  it("is disabled in both forms, still showing the choice", () => {
    stubDesktop();
    const { unmount } = render(<Grains disabled />);
    expect(screen.getByRole("radio", { name: "Month" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Month" })).toHaveAttribute("aria-checked", "true");
    unmount();
    vi.unstubAllGlobals();
    stubPhone();
    render(<Grains disabled />);
    expect(theSelect()).toBeDisabled();
    expect(theSelect()).toHaveDisplayValue("Month");
  });

  it("refuses under a locked WriteLockProvider with `commit`, reachable and saying why, in both forms", () => {
    const reason = "This budget is shared: you can look, not change.";
    for (const stub of [stubDesktop, stubPhone]) {
      stub();
      const onChange = vi.fn();
      const { unmount } = render(
        <WriteLockProvider locked reason={reason}>
          <ChoiceField label="Group by" commit value="month" onChange={onChange} options={GRAINS} />
        </WriteLockProvider>,
      );
      if (stub === stubDesktop) {
        const year = screen.getByRole("radio", { name: "Year" });
        expect(year).not.toBeDisabled();
        expect(year).toHaveAttribute("aria-disabled", "true");
        expect(year).toHaveAccessibleDescription(reason);
        fireEvent.click(year);
      } else {
        const select = theSelect();
        expect(select).not.toBeDisabled();
        expect(select).toHaveAttribute("aria-disabled", "true");
        expect(select).toHaveAccessibleDescription(reason);
        fireEvent.change(select, { target: { value: "year" } });
      }
      expect(onChange).not.toHaveBeenCalled();
      unmount();
      vi.unstubAllGlobals();
    }
  });
});

describe("ChoiceField — the control's attributes, box and ref", () => {
  it("hands `data-*` and `id` to the control in both forms, where a tour step anchors", () => {
    stubDesktop();
    const { unmount } = render(<Grains id="grain" data-tour="grain" />);
    expect(document.querySelector('[data-tour="grain"]')).toBe(screen.getByRole("radiogroup"));
    expect(screen.getByRole("radiogroup")).toHaveAttribute("id", "grain");
    unmount();
    vi.unstubAllGlobals();
    stubPhone();
    render(<Grains id="grain" data-tour="grain" />);
    expect(document.querySelector('[data-tour="grain"]')).toBe(theSelect());
    expect(theSelect()).toHaveAttribute("id", "grain");
  });

  it("puts `className` on the field's root in both forms, with no box of its own round the select", () => {
    // Select keeps a box under its field while the caller PASSES `error` or `hint`; a field
    // that passes neither must not grow one on a phone, or `className` (a grid cell's
    // `min-w-0`) would style the select inside a block that the grid sizes instead.
    stubDesktop();
    const desktop = render(<Grains className="min-w-0" />);
    expect(desktop.container.firstElementChild).toHaveClass("min-w-0");
    desktop.unmount();
    vi.unstubAllGlobals();
    stubPhone();
    const phone = render(<Grains className="min-w-0" />);
    expect(phone.container.firstElementChild).toHaveClass("min-w-0");
    expect(phone.container.firstElementChild).toContainElement(theSelect());
  });

  it("`size=\"sm\"`: the group's 12 px segments, and an unlabelled select's toolbar size", () => {
    stubDesktop();
    const { unmount } = render(<Grains size="sm" />);
    expect(screen.getByRole("radio", { name: "Month" })).toHaveClass("text-xs");
    unmount();
    vi.unstubAllGlobals();
    stubPhone();
    render(<Grains label={undefined} aria-label="Group by" size="sm" />);
    expect(theSelect()).toHaveClass("h-7", "text-xs");
  });

  it("points the ref at the control: the group, whose focus() lands on the choice, or the select", () => {
    const ref = createRef<HTMLElement>();
    windowOf(DESKTOP_WIDTH);
    render(<Grains ref={ref} />);
    expect(ref.current).toBe(screen.getByRole("radiogroup"));
    act(() => ref.current?.focus());
    expect(screen.getByRole("radio", { name: "Month" })).toHaveFocus();
    act(() => setViewportWidth(PHONE_WIDTH));
    expect(ref.current).toBe(theSelect());
    act(() => ref.current?.focus());
    expect(theSelect()).toHaveFocus();
  });
});
