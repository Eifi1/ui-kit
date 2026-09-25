import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ToggleGroup } from "../toggle-group";

/**
 * The `disabled` group (Keksdose live #288: *"For future payments disable the state
 * select in the edit and create windows"*).
 *
 * The interesting half is not that the clicks stop — it is that the group still SAYS
 * something. A control that goes blank when it is refused has taken the answer away
 * along with the question, and here the answer ("this row is not accepted") is exactly
 * what the user opened the editor to see.
 */
const OPTIONS = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
];

describe("ToggleGroup", () => {
  it("changes on a click while it is live", () => {
    const onChange = vi.fn();
    render(<ToggleGroup value="a" onChange={onChange} options={OPTIONS} />);
    fireEvent.click(screen.getByRole("radio", { name: "B" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("still shows which option is chosen when disabled", () => {
    render(<ToggleGroup value="a" onChange={vi.fn()} options={OPTIONS} disabled />);
    expect(screen.getByRole("radio", { name: "A" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "B" })).toHaveAttribute("aria-checked", "false");
  });

  it("refuses the click and says so to a screen reader", () => {
    const onChange = vi.fn();
    render(
      <ToggleGroup
        value="a"
        onChange={onChange}
        options={OPTIONS}
        ariaLabel="Status"
        disabled
      />,
    );
    // `disabled` on each button is what actually stops the click; `aria-disabled` on
    // the group is what names the thing being refused, which is the GROUP.
    expect(screen.getByRole("radiogroup", { name: "Status" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    for (const option of OPTIONS) {
      expect(screen.getByRole("radio", { name: option.label })).toBeDisabled();
    }
    fireEvent.click(screen.getByRole("radio", { name: "B" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("says nothing about being disabled when it is not", () => {
    // `aria-disabled="false"` is a claim of its own and screen readers announce it;
    // an ordinary group should carry no such attribute at all.
    render(<ToggleGroup value="a" onChange={vi.fn()} options={OPTIONS} ariaLabel="Status" />);
    expect(screen.getByRole("radiogroup", { name: "Status" })).not.toHaveAttribute(
      "aria-disabled",
    );
  });
});

describe("ToggleGroup — allowEmpty (0.6.0)", () => {
  it("clears when the active option is clicked, and becomes toggle buttons", () => {
    const onChange = vi.fn();
    render(
      <ToggleGroup allowEmpty value="a" onChange={onChange} options={OPTIONS} aria-label="Filter" />,
    );
    // Not a radiogroup: a radio cannot be unchecked by pressing it again, and a
    // screen reader would not say that it had been.
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Filter" })).toBeInTheDocument();
    const a = screen.getByRole("button", { name: "A" });
    expect(a).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "B" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(a);
    expect(onChange).toHaveBeenLastCalledWith(null);
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(onChange).toHaveBeenLastCalledWith("b");
  });

  it("shows nothing pressed for a null value", () => {
    render(<ToggleGroup allowEmpty value={null} onChange={vi.fn()} options={OPTIONS} />);
    for (const b of screen.getAllByRole("button")) {
      expect(b).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("keeps sending the same value again without allowEmpty", () => {
    const onChange = vi.fn();
    render(<ToggleGroup value="a" onChange={onChange} options={OPTIONS} />);
    fireEvent.click(screen.getByRole("radio", { name: "A" }));
    expect(onChange).toHaveBeenCalledWith("a");
  });
});

/**
 * keksdose, "Gaps found adopting 0.6.0" #7: with `allowEmpty` the value type widened
 * to `string`, so a `useState<Status | null>` setter did not type-check as `onChange`
 * unless the caller wrote `<ToggleGroup<Status>>`. This file is type-checked by `tsc`;
 * the render is only there so the component is exercised at all.
 */
describe("ToggleGroup type inference", () => {
  type Status = "OPEN" | "CLOSED";
  function Clearable() {
    const [status, setStatus] = useState<Status | null>(null);
    return (
      <ToggleGroup
        allowEmpty
        aria-label="Status"
        value={status}
        onChange={setStatus}
        options={(["OPEN", "CLOSED"] as const).map((value) => ({ value, label: value }))}
      />
    );
  }
  function Required() {
    const [status, setStatus] = useState<Status>("OPEN");
    return (
      <ToggleGroup
        aria-label="Status"
        value={status}
        onChange={setStatus}
        options={(["OPEN", "CLOSED"] as const).map((value) => ({ value, label: value }))}
      />
    );
  }

  it("infers the value type in both modes without an explicit generic", () => {
    render(
      <>
        <Clearable />
        <Required />
      </>,
    );
    const open = screen.getAllByRole("button", { name: "OPEN" })[0];
    fireEvent.click(open);
    expect(open).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(open);
    expect(open).toHaveAttribute("aria-pressed", "false");
  });

  it("still refuses a setter that cannot take null in the clearable mode", () => {
    function Wrong() {
      const [status, setStatus] = useState<Status>("OPEN");
      // @ts-expect-error — `allowEmpty` can emit null, which this setter cannot hold.
      return <ToggleGroup allowEmpty value={status} onChange={setStatus} options={[]} />;
    }
    expect(Wrong).toBeTypeOf("function");
  });
});

describe("ToggleGroup keyboard (radio mode)", () => {
  const OPTS = [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
    { value: "c", label: "C" },
  ];

  it("is one tab stop on the checked radio, and arrows move the choice with wrap-around", () => {
    const onChange = vi.fn();
    render(<ToggleGroup options={OPTS} value="b" onChange={onChange} aria-label="Pick" />);
    const [a, b, c] = screen.getAllByRole("radio");
    expect([a, b, c].map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
    b.focus();
    fireEvent.keyDown(b, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("c");
    expect(c).toHaveFocus();
    fireEvent.keyDown(c, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("a");
    fireEvent.keyDown(a, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("c");
  });

  it("follows the reading direction in RTL", () => {
    const onChange = vi.fn();
    render(
      <div dir="rtl">
        <ToggleGroup options={OPTS} value="b" onChange={onChange} aria-label="Pick" />
      </div>,
    );
    const b = screen.getAllByRole("radio")[1];
    fireEvent.keyDown(b, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("a");
  });

  it("keeps separate tab stops and no arrow handling in the clearable (toggle-button) mode", () => {
    const onChange = vi.fn();
    render(<ToggleGroup allowEmpty options={OPTS} value={null} onChange={onChange} aria-label="Pick" />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((x) => x.tabIndex)).toEqual([0, 0, 0]);
    fireEvent.keyDown(buttons[0], { key: "ArrowRight" });
    expect(onChange).not.toHaveBeenCalled();
  });
});
