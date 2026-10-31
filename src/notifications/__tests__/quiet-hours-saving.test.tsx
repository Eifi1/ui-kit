import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuietHoursSetting } from "../quiet-hours-setting";
import type { NotificationSettingsPatch } from "../notification-types";

/**
 * A time field PATCHed on every input event, with nothing keeping the requests in order
 * (refactor audit 2026-10-30, FLW-4): typing "30" over 22:00's minutes sent 22:03 and then
 * 22:30, and an earlier answer landing last left the in-between time on the server. Now a
 * time is saved when it is entered — blur or Enter — and one request per field runs at a
 * time, the latest value sent after it.
 */

const timeField = (name: "From" | "Until") => screen.getByLabelText(name) as HTMLInputElement;
const type = (field: HTMLInputElement, value: string) => fireEvent.change(field, { target: { value } });

function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("QuietHoursSetting — one save per entered time", () => {
  it("sends nothing per keystroke, and the entered time once on blur", () => {
    const onChange = vi.fn();
    render(<QuietHoursSetting start="22:00" end="07:00" zone="Europe/Zurich" onChange={onChange} />);
    type(timeField("From"), "22:03");
    type(timeField("From"), "22:30");
    expect(onChange).not.toHaveBeenCalled();
    expect(timeField("From")).toHaveValue("22:30");
    fireEvent.blur(timeField("From"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ quiet_hours_start: "22:30" });
  });

  it("Enter saves too; an unchanged time saves nothing", () => {
    const onChange = vi.fn();
    render(<QuietHoursSetting start="22:00" end="07:00" zone="Europe/Zurich" onChange={onChange} />);
    fireEvent.blur(timeField("Until"));
    type(timeField("Until"), "07:00");
    fireEvent.keyDown(timeField("Until"), { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
    type(timeField("Until"), "06:45");
    fireEvent.keyDown(timeField("Until"), { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith({ quiet_hours_end: "06:45" });
  });

  it("runs one request per field at a time and sends the latest value after it", async () => {
    const calls: { patch: NotificationSettingsPatch; answer: ReturnType<typeof deferred> }[] = [];
    const onChange = vi.fn((patch: NotificationSettingsPatch) => {
      const answer = deferred();
      calls.push({ patch, answer });
      return answer.promise;
    });
    render(<QuietHoursSetting start="22:00" end="07:00" zone="Europe/Zurich" onChange={onChange} />);
    type(timeField("From"), "22:30");
    fireEvent.blur(timeField("From"));
    type(timeField("From"), "23:00");
    fireEvent.blur(timeField("From"));
    type(timeField("From"), "23:15");
    fireEvent.blur(timeField("From"));
    // The other field is not held behind this one.
    type(timeField("Until"), "06:00");
    fireEvent.blur(timeField("Until"));
    expect(calls.map((c) => c.patch)).toEqual([{ quiet_hours_start: "22:30" }, { quiet_hours_end: "06:00" }]);
    expect(timeField("From")).toHaveValue("23:15");
    await act(async () => calls[0].answer.resolve());
    // 23:00 was overtaken while it waited: only the latest goes.
    expect(calls.map((c) => c.patch)).toEqual([
      { quiet_hours_start: "22:30" },
      { quiet_hours_end: "06:00" },
      { quiet_hours_start: "23:15" },
    ]);
  });

  it("an earlier failure with a later time waiting keeps the later one and sends it", async () => {
    const calls: { patch: NotificationSettingsPatch; answer: ReturnType<typeof deferred> }[] = [];
    const onChange = vi.fn((patch: NotificationSettingsPatch) => {
      const answer = deferred();
      calls.push({ patch, answer });
      return answer.promise;
    });
    render(<QuietHoursSetting start="22:00" end="07:00" zone="Europe/Zurich" onChange={onChange} />);
    type(timeField("From"), "22:30");
    fireEvent.blur(timeField("From"));
    type(timeField("From"), "23:00");
    fireEvent.blur(timeField("From"));
    await act(async () => calls[0].answer.reject(new Error("offline")));
    expect(timeField("From")).toHaveValue("23:00");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(calls.map((c) => c.patch)).toEqual([{ quiet_hours_start: "22:30" }, { quiet_hours_start: "23:00" }]);
  });
});
