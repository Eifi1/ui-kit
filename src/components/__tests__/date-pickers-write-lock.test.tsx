import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { DatePicker, DateRangePicker, type DateRangePickerProps } from "../date-picker";
import { MonthPicker } from "../month-picker";
import { COMMIT_EXCEPT_BILLING, WriteLockProvider } from "../write-lock";

/**
 * The date pickers take the write lock (refactor audit 2026-10-30, API-3). DatePicker,
 * DateRangePicker and MonthPicker were the only value fields with neither `commit` nor
 * `disabledReason` — DateRangePicker could not get the kit's name for it, because its
 * `commit` was the panel's mode. That mode is `apply` now (`commit="apply"` still read,
 * deprecated, for 0.52), and `commit` is a {@link CommitScope} on all three, locked the
 * way Select and CountrySelect are: the trigger focusable, `aria-disabled` and described
 * by the reason, nothing opening and nothing reported.
 */

const REASON = "Shared with you to read";

const descriptions = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);

const locked = (children: ReactNode) => (
  <WriteLockProvider locked reason={REASON} kind="demo">
    {children}
  </WriteLockProvider>
);

/** Locked the focusable way: reachable, refusing, and saying why. */
function expectLockedTrigger(trigger: HTMLElement) {
  expect(trigger).toBeEnabled();
  expect(trigger).toHaveAttribute("aria-disabled", "true");
  trigger.focus();
  expect(trigger).toHaveFocus();
  expect(descriptions(trigger)).toContain(REASON);
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("dialog")).toBeNull();
}

describe("DatePicker commit / disabledReason", () => {
  it("under a lock: the trigger, the ‹ › and Today refuse and say why; no clear", () => {
    const onChange = vi.fn();
    render(
      locked(
        <DatePicker
          label="Booked"
          value="2026-10-20"
          onChange={onChange}
          locale="en-GB"
          commit
          step
          today="2026-10-31"
          clearable
        />,
      ),
    );
    const trigger = screen.getByRole("combobox", { name: /^Booked/ });
    expectLockedTrigger(trigger);
    // One frame for the whole row: every part is described by the one copy of the reason.
    const reasonId = trigger.getAttribute("aria-describedby");
    for (const name of ["Previous day", "Next day", "Today"]) {
      const button = screen.getByRole("button", { name });
      expect(button, name).toBeEnabled();
      expect(button, name).toHaveAttribute("aria-disabled", "true");
      expect(button.getAttribute("aria-describedby"), name).toBe(reasonId);
      fireEvent.click(button);
    }
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("an own disabledReason locks it the same way, and wins over `disabled`", () => {
    render(
      <DatePicker
        aria-label="Booked"
        value="2026-10-20"
        onChange={() => {}}
        disabled
        disabledReason="Offline"
        disabledReasonDisplay="line"
      />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("aria-disabled", "true");
    // The line form: the reason is on screen, and it is the description.
    expect(descriptions(trigger)).toEqual(["Offline"]);
    expect(screen.getByText("Offline")).toBeVisible();
  });

  it("stays editable without `commit`, and for a kind its scope is exempt from", () => {
    render(
      <>
        {locked(<DatePicker aria-label="Form date" value="" onChange={() => {}} />)}
        <WriteLockProvider locked reason="Plan lapsed" kind="billing">
          <DatePicker aria-label="Own setting" value="" onChange={() => {}} commit={COMMIT_EXCEPT_BILLING} />
        </WriteLockProvider>
      </>,
    );
    for (const name of ["Form date", "Own setting"]) {
      const trigger = screen.getByRole("combobox", { name });
      expect(trigger).not.toHaveAttribute("aria-disabled");
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      fireEvent.click(trigger);
    }
  });

  it("moves the caller's classes onto the reason's frame, so a lock does not reflow the form", () => {
    const { container } = render(
      locked(<DatePicker aria-label="Booked" value="" onChange={() => {}} commit className="col-span-2 w-48" />),
    );
    const marked = container.querySelectorAll(".col-span-2");
    expect(marked).toHaveLength(1);
    const trigger = screen.getByRole("combobox");
    expect(marked[0]).toContainElement(trigger);
    // Not the field's own box, which the frame holds.
    expect(trigger.parentElement).not.toHaveClass("col-span-2");
  });

  it("closes an open calendar when the lock arrives", () => {
    function Page() {
      const [lock, setLock] = useState(false);
      return (
        <WriteLockProvider locked={lock} reason={REASON}>
          <DatePicker aria-label="Booked" value="2026-10-20" onChange={() => {}} locale="en-GB" commit />
          <button type="button" onClick={() => setLock(true)}>
            go offline
          </button>
        </WriteLockProvider>
      );
    }
    render(<Page />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    act(() => screen.getByRole("button", { name: "go offline", hidden: true }).click());
    expect(screen.queryByRole("dialog")).toBeNull();
    // Re-read: the field moves into the reason's frame, as Select's does.
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-disabled", "true");
  });
});

describe("DateRangePicker: `apply`, and `commit` as the lock", () => {
  function Range(props: Partial<DateRangePickerProps> & { onCommit?: (from: string, to: string) => void }) {
    const { onCommit, ...rest } = props;
    const [range, setRange] = useState({ from: "2026-10-01", to: "2026-10-31" });
    return (
      <DateRangePicker
        label="Period"
        locale="en-GB"
        {...rest}
        from={range.from}
        to={range.to}
        onChange={(from, to) => {
          setRange({ from, to });
          onCommit?.(from, to);
        }}
      />
    );
  }
  const open = () => fireEvent.click(screen.getByRole("combobox", { name: /^Period/ }));

  it("drafts with `apply`: nothing reaches onChange until Apply", () => {
    const onCommit = vi.fn();
    render(<Range apply onCommit={onCommit} />);
    open();
    fireEvent.click(screen.getByRole("gridcell", { name: /\b5 October 2026$/ }));
    fireEvent.click(screen.getByRole("gridcell", { name: /\b9 October 2026$/ }));
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onCommit).toHaveBeenCalledWith("2026-10-05", "2026-10-09");
  });

  it('still reads the deprecated `commit="apply"` as `apply` for 0.52; `apply` wins over it', () => {
    const { unmount } = render(<Range commit="apply" />);
    open();
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    unmount();

    const onCommit = vi.fn();
    render(<Range commit="apply" apply={false} onCommit={onCommit} />);
    open();
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
    fireEvent.click(screen.getByRole("gridcell", { name: /\b5 October 2026$/ }));
    expect(onCommit).toHaveBeenCalledWith("2026-10-05", "");
  });

  it("locks with `commit` as a scope — a mode string is not a lock opt-in", () => {
    render(locked(<Range commit clearable />));
    expectLockedTrigger(screen.getByRole("combobox", { name: /^Period/ }));
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });

  it('is not locked by `commit="apply"`', () => {
    render(locked(<Range commit="apply" />));
    const trigger = screen.getByRole("combobox", { name: /^Period/ });
    expect(trigger).not.toHaveAttribute("aria-disabled");
    open();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("hands a custom trigger the lock with the rest of its attributes", () => {
    render(
      locked(
        <Range
          commit
          renderTrigger={({ triggerProps, valueProps, text }) => (
            <button {...triggerProps}>
              <span {...valueProps}>{text}</span>
            </button>
          )}
        />,
      ),
    );
    expectLockedTrigger(screen.getByRole("combobox"));
  });
});

describe("MonthPicker commit / disabledReason", () => {
  it("under a lock: the field's trigger refuses and says why", () => {
    const onChange = vi.fn();
    render(locked(<MonthPicker label="Budget month" value="2026-10" onChange={onChange} commit />));
    expectLockedTrigger(screen.getByRole("combobox", { name: /^Budget month/ }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("under a lock: the stepper's heading, Today and ‹ › refuse and say why", () => {
    const onChange = vi.fn();
    render(
      locked(
        <MonthPicker
          variant="stepper"
          value="2026-08"
          onChange={onChange}
          locale="en-GB"
          currentMonth="2026-09"
          commit
        />,
      ),
    );
    const heading = screen.getByRole("button", { name: "August 2026" });
    expect(heading).toHaveAttribute("aria-disabled", "true");
    expect(descriptions(heading)).toEqual([REASON]);
    fireEvent.click(heading);
    expect(screen.queryByRole("dialog")).toBeNull();
    for (const name of ["Today", "Previous month", "Next month"]) {
      const button = screen.getByRole("button", { name });
      expect(button, name).toBeEnabled();
      expect(button, name).toHaveAttribute("aria-disabled", "true");
      expect(descriptions(button), name).toEqual([REASON]);
      fireEvent.click(button);
    }
    expect(onChange).not.toHaveBeenCalled();
  });

  it("an own disabledReason locks the year grid's picker too", () => {
    render(
      <MonthPicker aria-label="Fiscal year" mode="year" value="2026" onChange={() => {}} disabledReason="Closed" />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("aria-disabled", "true");
    expect(descriptions(trigger)).toEqual(["Closed"]);
    fireEvent.click(trigger);
    expect(screen.queryByRole("grid")).toBeNull();
  });
});
