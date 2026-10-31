import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuietHoursSetting } from "../quiet-hours-setting";

/**
 * 0.52 code review, quiet-hours-setting.tsx: since 0.52 a typed time is saved when it is
 * ENTERED — the field left, or Enter (refactor audit 2026-10-30, FLW-4; Marcel's
 * save-on-blur). A card removed while its field still has focus gets no blur: the person
 * types 22:30 and presses Escape on the settings sheet, or a shortcut navigates away, and
 * the draft was dropped while the field had shown it as the value. Leaving the card is
 * leaving the field: a draft still typed is entered as the card goes.
 */

const timeField = (name: "From" | "Until") => screen.getByLabelText(name) as HTMLInputElement;
const type = (field: HTMLInputElement, value: string) => fireEvent.change(field, { target: { value } });

describe("QuietHoursSetting — a time still typed when the card goes", () => {
  it("is saved, once per field, as if it had been entered", () => {
    const onChange = vi.fn();
    const { unmount } = render(
      <QuietHoursSetting start="22:00" end="07:00" zone="Europe/Zurich" onChange={onChange} />,
    );
    type(timeField("From"), "22:30");
    type(timeField("Until"), "");
    timeField("From").focus();
    unmount();
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenCalledWith({ quiet_hours_start: "22:30" });
    expect(onChange).toHaveBeenCalledWith({ quiet_hours_end: null });
  });

  it("an entered or unchanged time is not sent again", () => {
    const onChange = vi.fn();
    const { unmount } = render(
      <QuietHoursSetting start="22:00" end="07:00" zone="Europe/Zurich" onChange={onChange} />,
    );
    type(timeField("From"), "23:00");
    fireEvent.blur(timeField("From"));
    type(timeField("Until"), "07:00");
    unmount();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ quiet_hours_start: "23:00" });
  });

  it("waits behind that field's running save, as an entered time does", async () => {
    let answer!: () => void;
    const onChange = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          answer = resolve;
        }),
    );
    const { unmount } = render(
      <QuietHoursSetting start="22:00" end="07:00" zone="Europe/Zurich" onChange={onChange} />,
    );
    type(timeField("From"), "22:30");
    fireEvent.blur(timeField("From"));
    type(timeField("From"), "23:15");
    unmount();
    expect(onChange).toHaveBeenCalledTimes(1);
    answer();
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(2));
    expect(onChange).toHaveBeenLastCalledWith({ quiet_hours_start: "23:15" });
  });
});
