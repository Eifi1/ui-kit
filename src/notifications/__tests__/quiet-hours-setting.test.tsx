import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuietHoursSetting } from "../quiet-hours-setting";
import { deviceTimeZone, timeZoneOptions } from "../time-zone-select";
import { DEFAULT_NOTIFICATIONS_LABELS } from "../notifications-labels";
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

describe("timeZoneOptions", () => {
  const regions = (region: string) => DEFAULT_NOTIFICATIONS_LABELS.regions[region as "Europe"];

  it("lists every zone the runtime knows, city under region, in the kit's words", () => {
    const options = timeZoneOptions("Europe/Zurich", regions);
    expect(options.length).toBe(Intl.supportedValuesOf("timeZone").length);
    expect(options.find((o) => o.value === "Europe/Zurich")).toEqual({
      value: "Europe/Zurich",
      label: "Zurich",
      group: "Europe",
    });
    expect(options.find((o) => o.value === "America/Argentina/Rio_Gallegos")).toEqual({
      value: "America/Argentina/Rio_Gallegos",
      label: "Argentina / Rio Gallegos",
      group: "Americas",
    });
    expect(options.find((o) => o.value.startsWith("Indian/"))?.group).toBe("Indian Ocean");
  });

  it("puts a zone with no region first, and keeps a stored zone the runtime does not list", () => {
    const utc = timeZoneOptions("UTC", regions);
    expect(utc[0]).toEqual({ value: "UTC", label: "UTC" });
    const stored = timeZoneOptions("Example/Old_Alias", regions);
    // A region the labels do not know keeps its IANA name.
    expect(stored.find((o) => o.value === "Example/Old_Alias")).toEqual({
      value: "Example/Old_Alias",
      label: "Old Alias",
      group: "Example",
    });
  });
});

describe("QuietHoursSetting", () => {
  it("says what quiet hours do, with the inbox where the app keeps one", () => {
    const { rerender } = render(<QuietHoursSetting start={null} end={null} timezone={null} onChange={vi.fn()} />);
    expect(screen.getByText("Quiet hours")).toBeInTheDocument();
    expect(screen.getByText("No push notifications during this window.")).toBeInTheDocument();
    rerender(<QuietHoursSetting start={null} end={null} timezone={null} inbox onChange={vi.fn()} />);
    expect(
      screen.getByText("No push notifications during this window. They still reach your inbox."),
    ).toBeInTheDocument();
    // No time set: no zone to pick.
    expect(screen.queryByRole("combobox", { name: "Time zone" })).not.toBeInTheDocument();
  });

  it("never sends a zone with a time: the zone is the account's, automatic only (§10.3, 2026-10-20)", () => {
    const onChange = vi.fn();
    render(<QuietHoursSetting start={null} end={null} timezone={null} onChange={onChange} />);
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
    const { rerender } = render(<QuietHoursSetting start="22:00" end={null} timezone="Europe/Zurich" onChange={vi.fn()} />);
    expect(
      screen.getByText("Set both a start and an end time. Quiet hours take effect once both are set."),
    ).toBeInTheDocument();
    rerender(<QuietHoursSetting start="22:00" end="07:00" timezone="Europe/Zurich" onChange={vi.fn()} />);
    expect(screen.queryByText(/Set both a start and an end time/)).not.toBeInTheDocument();
  });

  it("names the zone read-only: `zone`, else the deprecated `timezone`, else `fallbackZone`", () => {
    const { rerender } = render(<QuietHoursSetting start="22:00" end="07:00" zone={null} onChange={vi.fn()} />);
    expect(screen.getByText(/In your time zone \(Europe \/ Zurich\)/)).toBeInTheDocument();
    rerender(<QuietHoursSetting start="22:00" end="07:00" zone={null} fallbackZone="Europe/Vienna" onChange={vi.fn()} />);
    expect(screen.getByText(/In your time zone \(Europe \/ Vienna\)/)).toBeInTheDocument();
    rerender(<QuietHoursSetting start="22:00" end="07:00" timezone="Pacific/Auckland" onChange={vi.fn()} />);
    expect(screen.getByText(/In your time zone \(Pacific \/ Auckland\)/)).toBeInTheDocument();
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
        timezone="Europe/Zurich"
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
      <QuietHoursSetting start="22:00" end={null} timezone="Pacific/Auckland" inbox onChange={vi.fn()} />,
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
