import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { DatePicker } from "../date-picker";
import { EntityCombobox } from "../entity-combobox";
import { MonthPicker } from "../month-picker";
import { PHONE_WIDTH, stubViewportWidth } from "../../test/viewport";

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

/**
 * Let the frames already asked for run. The picker's list focuses its search box once
 * more a frame after it opens (`combobox-core`'s `requestAnimationFrame`), and a Tab
 * pressed before that frame was undone by it: the trap wrapped focus to the first stop,
 * then the frame put it back on the search box — about one run in ten (round 0.34, D3).
 * A frame asked for now runs after every one asked for before it, so this waits for
 * exactly that, however loaded the machine is.
 */
async function framesRun() {
  await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
}

async function expectTabWrapsInside(panel: HTMLElement) {
  await framesRun();
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
      stubViewportWidth(PHONE_WIDTH, { coarse: true, reducedMotion: true });
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
