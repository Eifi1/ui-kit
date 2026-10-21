import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuietHoursSetting } from "../quiet-hours-setting";
import { deviceTimeZone } from "../device-zone-report";
import { axeViolations } from "../../test/axe";

/**
 * docs/notifications-harmonization.md §2.4, §2.6, §4.2, §10.3 (amended 2026-10-20: the
 * zone is automatic only): quiet hours, and the account's zone named read-only. The suite
 * runs in Europe/Berlin (vitest.config.ts), which is not the kit's Europe/Zurich: the
 * "another zone" case comes for free.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

const timeField = (name: "From" | "Until") => screen.getByLabelText(name) as HTMLInputElement;

const setTime = (field: HTMLInputElement, value: string) => fireEvent.change(field, { target: { value } });

describe("deviceTimeZone", () => {
  it("is the runtime's zone", () => {
    expect(deviceTimeZone()).toBe("Europe/Berlin");
  });

  it("is UTC where the runtime names none", () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      timeZone: "",
    } as Intl.ResolvedDateTimeFormatOptions);
    expect(deviceTimeZone()).toBe("UTC");
  });
});

describe("QuietHoursSetting", () => {
  it("says what quiet hours do, with the inbox where the app keeps one", () => {
    const { rerender } = render(<QuietHoursSetting start={null} end={null} zone={null} onChange={vi.fn()} />);
    expect(screen.getByText("Quiet hours")).toBeInTheDocument();
    expect(screen.getByText("No push notifications during this window.")).toBeInTheDocument();
    rerender(<QuietHoursSetting start={null} end={null} zone={null} inbox onChange={vi.fn()} />);
    expect(
      screen.getByText("No push notifications during this window. They still reach your inbox."),
    ).toBeInTheDocument();
    // No time set: no zone to pick.
    expect(screen.queryByRole("combobox", { name: "Time zone" })).not.toBeInTheDocument();
  });

  it("never sends a zone with a time: the zone is the account's, automatic only (§10.3, 2026-10-20)", () => {
    const onChange = vi.fn();
    render(<QuietHoursSetting start={null} end={null} zone={null} onChange={onChange} />);
    setTime(timeField("From"), "22:00");
    expect(onChange).toHaveBeenCalledWith({ quiet_hours_start: "22:00" });
  });

  it("sends a time alone, and `null` for a cleared one", () => {
    const onChange = vi.fn();
    render(<QuietHoursSetting start="22:00" end="07:00" zone="Europe/Zurich" onChange={onChange} />);
    setTime(timeField("Until"), "06:30");
    expect(onChange).toHaveBeenLastCalledWith({ quiet_hours_end: "06:30" });
    setTime(timeField("From"), "");
    expect(onChange).toHaveBeenLastCalledWith({ quiet_hours_start: null });
  });

  it("says a half-set window does nothing yet", () => {
    const { rerender } = render(<QuietHoursSetting start="22:00" end={null} zone="Europe/Zurich" onChange={vi.fn()} />);
    expect(
      screen.getByText("Set both a start and an end time. Quiet hours take effect once both are set."),
    ).toBeInTheDocument();
    rerender(<QuietHoursSetting start="22:00" end="07:00" zone="Europe/Zurich" onChange={vi.fn()} />);
    expect(screen.queryByText(/Set both a start and an end time/)).not.toBeInTheDocument();
  });

  it("names the zone read-only: `zone`, else `fallbackZone`", () => {
    const { rerender } = render(<QuietHoursSetting start="22:00" end="07:00" zone={null} onChange={vi.fn()} />);
    expect(screen.getByText(/In your time zone \(Europe \/ Zurich\)/)).toBeInTheDocument();
    rerender(<QuietHoursSetting start="22:00" end="07:00" zone={null} fallbackZone="Europe/Vienna" onChange={vi.fn()} />);
    expect(screen.getByText(/In your time zone \(Europe \/ Vienna\)/)).toBeInTheDocument();
    rerender(<QuietHoursSetting start="22:00" end="07:00" zone="Pacific/Auckland" onChange={vi.fn()} />);
    expect(screen.getByText(/In your time zone \(Pacific \/ Auckland\)/)).toBeInTheDocument();
    // A region the labels do not know keeps its IANA name; a zone with none is itself.
    rerender(<QuietHoursSetting start="22:00" end="07:00" zone="America/Argentina/Rio_Gallegos" onChange={vi.fn()} />);
    expect(screen.getByText(/In your time zone \(Americas \/ Argentina \/ Rio Gallegos\)/)).toBeInTheDocument();
    rerender(<QuietHoursSetting start="22:00" end="07:00" zone="Example/Old_Alias" onChange={vi.fn()} />);
    expect(screen.getByText(/In your time zone \(Example \/ Old Alias\)/)).toBeInTheDocument();
    rerender(<QuietHoursSetting start="22:00" end="07:00" zone="UTC" onChange={vi.fn()} />);
    expect(screen.getByText(/In your time zone \(UTC\)/)).toBeInTheDocument();
    // No picker and no "Use it" in any form: the zone follows the device last used.
    expect(screen.queryByRole("combobox", { name: "Time zone" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("puts a rejected time back and says so under the card", async () => {
    const onChange = vi.fn(() => Promise.reject(new Error("offline")));
    render(
      <QuietHoursSetting
        start="22:00"
        end="07:00"
        zone="Europe/Zurich"
        onChange={onChange}
        describeError={() => "Saved nothing: you are offline."}
      />,
    );
    setTime(timeField("From"), "23:00");
    expect(timeField("From")).toHaveValue("23:00");
    expect(await screen.findByRole("alert")).toHaveTextContent("Saved nothing: you are offline.");
    expect(timeField("From")).toHaveValue("22:00");
  });

  it("passes axe with a window and the zone", async () => {
    const { container } = render(
      <QuietHoursSetting start="22:00" end={null} zone="Pacific/Auckland" inbox onChange={vi.fn()} />,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("QuietHoursSetting — the account's zone (0.46, §10.3, §10.4)", () => {
  it("with `zone`: no picker, the zone named as following the device", () => {
    render(<QuietHoursSetting start="22:00" end={null} zone="Europe/Zurich" onChange={vi.fn()} />);
    expect(screen.queryByRole("combobox", { name: "Time zone" })).not.toBeInTheDocument();
    expect(
      screen.getByText("In your time zone (Europe / Zurich), which follows the device you last used."),
    ).toBeInTheDocument();
  });

  it("`held`: the description says a held push arrives when the window ends", () => {
    const { rerender } = render(<QuietHoursSetting start={null} end={null} zone="Europe/Zurich" held inbox onChange={vi.fn()} />);
    expect(screen.getByText(/arrive when it ends\. They reach your inbox at once\./)).toBeInTheDocument();
    rerender(<QuietHoursSetting start={null} end={null} zone="Europe/Zurich" onChange={vi.fn()} />);
    expect(screen.getByText("No push notifications during this window.")).toBeInTheDocument();
  });

  it("passes axe with the zone line", async () => {
    const { container } = render(
      <QuietHoursSetting start="22:00" end="07:00" zone="Europe/Zurich" onChange={vi.fn()} />,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
