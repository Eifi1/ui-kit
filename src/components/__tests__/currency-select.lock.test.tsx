import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CurrencySelect, type CurrencySelectProps } from "../currency-select";
import { WriteLockProvider } from "../write-lock";

/**
 * keksdose, 2026-10-23: a budget's currency is locked for a guest or a viewer and while
 * offline, with the reason. keksdose swapped in a one-option Select with
 * `disabledReason`, which kept the reason and the focus and lost the flag. CurrencySelect
 * now locks the way Select does (commit-controls-022's "Select commit / disabledReason").
 */

const REASON = "Shared with you to read";

const descriptions = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);

function BudgetCurrency({ onSave, ...props }: Partial<CurrencySelectProps> & { onSave?: (c: string) => void }) {
  const [code, setCode] = useState("CHF");
  return (
    <CurrencySelect
      label="Budget currency"
      className="w-48"
      commit
      {...props}
      value={code}
      onChange={(c) => {
        setCode(c);
        onSave?.(c);
      }}
    />
  );
}

const trigger = () => screen.getByRole("combobox", { name: /^Budget currency/ });

describe("CurrencySelect commit / disabledReason", () => {
  it("under a lock: focusable, described, settled, keeps its flag, and opens nothing", () => {
    const onSave = vi.fn();
    render(
      <WriteLockProvider locked reason={REASON}>
        <BudgetCurrency onSave={onSave} />
      </WriteLockProvider>,
    );
    const t = trigger();
    expect(t).toBeEnabled();
    expect(t).toHaveAttribute("aria-disabled", "true");
    t.focus();
    expect(t).toHaveFocus();
    expect(descriptions(t)).toEqual([REASON]);
    expect(t.className).toContain("cursor-not-allowed");
    // The value still reads as the currency: the flag and the code stay…
    expect(t).toHaveTextContent("CHF");
    expect(t.querySelector(".fi.fi-ch")).not.toBeNull();
    // …the chevron goes: nothing to drop.
    expect(t.querySelector("svg")).toBeNull();
    fireEvent.click(t);
    fireEvent.keyDown(t, { key: "ArrowDown" });
    fireEvent.keyDown(t, { key: "Enter" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(t).toHaveAttribute("aria-expanded", "false");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("an own disabledReason locks it the same way, and wins over `disabled`", () => {
    render(<BudgetCurrency commit={undefined} disabled disabledReason="Offline" />);
    const t = trigger();
    expect(t).not.toBeDisabled();
    expect(t).toHaveAttribute("aria-disabled", "true");
    expect(descriptions(t)).toEqual(["Offline"]);
    fireEvent.click(t);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("the lock's reason wins over its own", () => {
    render(
      <WriteLockProvider locked reason={REASON}>
        <BudgetCurrency disabledReason="Offline" />
      </WriteLockProvider>,
    );
    expect(descriptions(trigger())).toEqual([REASON]);
  });

  it("the reason is the tooltip at Normal with a mouse, and the wrapper keeps className", () => {
    const { container } = render(
      <WriteLockProvider locked reason={REASON}>
        <BudgetCurrency />
      </WriteLockProvider>,
    );
    expect(container.firstElementChild).toHaveClass("w-48");
    fireEvent.mouseEnter(trigger().parentElement as HTMLElement);
    expect(screen.getByRole("tooltip")).toHaveTextContent(REASON);
  });

  it("is untouched with no lock", () => {
    const onSave = vi.fn();
    render(<BudgetCurrency onSave={onSave} />);
    const t = trigger();
    expect(t).not.toHaveAttribute("aria-disabled");
    expect(t.querySelector("svg")).not.toBeNull();
    fireEvent.click(t);
    fireEvent.mouseDown(screen.getByRole("option", { name: /EUR/ }));
    expect(onSave).toHaveBeenCalledWith("EUR");
  });

  it("without `commit` it stays editable under the lock — its form's Save is the commit", () => {
    render(
      <WriteLockProvider locked reason={REASON}>
        <BudgetCurrency commit={undefined} />
      </WriteLockProvider>,
    );
    expect(trigger()).not.toHaveAttribute("aria-disabled");
    fireEvent.click(trigger());
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("disabled with no reason: the native kind, out of the tab order", () => {
    render(<BudgetCurrency commit={undefined} disabled />);
    expect(trigger()).toBeDisabled();
    fireEvent.click(trigger());
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("with a caption and an error: hint, then reason, then error", () => {
    render(<CurrencySelect aria-label="Pay in" value="EUR" onChange={() => {}} hint="Saved on change" error="Pick one" disabledReason="Archived." />);
    expect(descriptions(screen.getByRole("combobox", { name: "Pay in" }))).toEqual([
      "Saved on change",
      "Archived.",
      "Pick one",
    ]);
  });

  it("a lock arriving while the list is open closes it", () => {
    const { rerender } = render(<CurrencySelect aria-label="Pay in" value="EUR" onChange={() => {}} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Pay in" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    rerender(<CurrencySelect aria-label="Pay in" value="EUR" onChange={() => {}} disabledReason="Locked" />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Pay in" })).toHaveAttribute("aria-expanded", "false");
  });
});
