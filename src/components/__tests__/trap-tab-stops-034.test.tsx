import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DatePicker } from "../date-picker";
import { EntityCombobox } from "../entity-combobox";
import { MonthPicker } from "../month-picker";

/**
 * Round 0.34 Wave 0, BUG-4 (sev 3): the focus trap counted a `tabindex="-1"` button as a
 * tab stop. Its list matched `button`, `input` and `a[href]` whatever their tabindex, so
 * in a panel that ENDS in a roving grid — a calendar's days, a month grid, the picker
 * sheet's rows — the trap's "last" was a cell no Tab ever reaches:
 *
 *   - Tab from the real last stop was not wrapped, and focus walked out of the panel to
 *     the end of the document with the panel still open;
 *   - Shift+Tab from the first stop "wrapped" onto that cell.
 *
 * Driven with user-event, whose Tab moves focus the way a browser does unless the trap
 * stops it, so a leak shows up as focus outside the panel.
 */

/** What a browser's Tab walks inside `root`: focusable, `tabIndex` ≥ 0, not hidden. */
function tabStops(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>("a[href],button,input,select,textarea,[tabindex]"),
  ).filter(
    (el) =>
      !(el as HTMLButtonElement).disabled && el.tabIndex >= 0 && !el.closest("[hidden],[inert]"),
  );
}

/** The case under test only exists if a control the trap used to count comes AFTER the
 *  real last stop — otherwise the old list would have been right by luck. */
function expectTrailingSkippedControl(root: HTMLElement) {
  const controls = Array.from(root.querySelectorAll<HTMLElement>("a[href],button,input"));
  expect(controls.at(-1)!.tabIndex).toBe(-1);
}

async function expectTabWrapsInside(panel: HTMLElement) {
  const user = userEvent.setup();
  expectTrailingSkippedControl(panel);
  const stops = tabStops(panel);
  expect(stops.length).toBeGreaterThan(1);
  const first = stops[0];
  const last = stops.at(-1)!;

  act(() => last.focus());
  await user.tab();
  expect(first).toHaveFocus();

  act(() => first.focus());
  await user.tab({ shift: true });
  expect(last).toHaveFocus();
}

describe("the focus trap counts only real tab stops (BUG-4)", () => {
  it("keeps Tab inside the DatePicker's calendar popover", async () => {
    const user = userEvent.setup();
    render(
      <>
        <DatePicker value="2026-09-06" onChange={() => {}} locale="en-GB" label="Due date" />
        <button type="button">after</button>
      </>,
    );
    await user.click(screen.getByRole("combobox", { name: /^Due date/ }));
    await expectTabWrapsInside(screen.getByRole("dialog"));
  });

  it("keeps Tab inside the MonthPicker's popover", async () => {
    const user = userEvent.setup();
    render(
      <>
        <MonthPicker value="2026-08" onChange={() => {}} locale="en-GB" currentMonth="2026-09" label="Month" />
        <button type="button">after</button>
      </>,
    );
    await user.click(screen.getByRole("combobox", { name: /^Month/ }));
    await expectTabWrapsInside(screen.getByRole("dialog"));
  });

  describe("on a phone", () => {
    afterEach(() => {
      Reflect.deleteProperty(window, "matchMedia");
    });

    it("keeps Tab inside the picker sheet, whose rows are not tab stops", async () => {
      // jsdom has no matchMedia, which reads as desktop; the sheet is the phone shape.
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as unknown as typeof window.matchMedia;
      const user = userEvent.setup();
      render(
        <>
          <EntityCombobox<string>
            label="Account"
            value={null}
            onChange={() => {}}
            options={[
              { value: "a1", label: "Checking" },
              { value: "a2", label: "Savings" },
            ]}
          />
          <button type="button">after</button>
        </>,
      );
      await user.click(screen.getByRole("combobox", { name: /Account/ }));
      const sheet = await waitFor(() => screen.getByRole("dialog"));
      await expectTabWrapsInside(sheet);
    });
  });
});
