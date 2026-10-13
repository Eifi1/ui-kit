import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuietHoursSetting } from "../quiet-hours-setting";
import { deviceTimeZone, timeZoneOptions } from "../time-zone-select";
import { DEFAULT_NOTIFICATIONS_LABELS } from "../notifications-labels";
import { axeViolations } from "../../test/axe";

/**
 * docs/notifications-harmonization.md §2.4, §2.6, §4.2: quiet hours, the zone that
 * applies while none is stored, the device's zone sent with the first time. The suite
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

  it("sends the device's zone with the first time entered while none is stored", () => {
    const onChange = vi.fn();
    render(<QuietHoursSetting start={null} end={null} timezone={null} onChange={onChange} />);
    setTime(timeField("From"), "22:00");
    expect(onChange).toHaveBeenCalledWith({ quiet_hours_start: "22:00", timezone: "Europe/Berlin" });
  });

  it("sends a time alone once a zone is stored, and `null` for a cleared one", () => {
    const onChange = vi.fn();
    render(<QuietHoursSetting start="22:00" end="07:00" timezone="Europe/Zurich" onChange={onChange} />);
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

  it("shows `fallbackZone` for a stored null — the zone the server applies, never the device's", () => {
    const { rerender } = render(<QuietHoursSetting start="22:00" end="07:00" timezone={null} onChange={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: "Time zone" })).toHaveValue("Zurich");
    rerender(
      <QuietHoursSetting start="22:00" end="07:00" timezone={null} fallbackZone="Europe/Vienna" onChange={vi.fn()} />,
    );
    expect(screen.getByRole("combobox", { name: "Time zone" })).toHaveValue("Vienna");
  });

  it("offers the device's zone when it is not the one in effect, and sends it on “Use it”", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <QuietHoursSetting start="22:00" end="07:00" timezone="Europe/Zurich" onChange={onChange} />,
    );
    expect(screen.getByText("This device is in Europe / Berlin.")).toBeInTheDocument();
    const use = screen.getByRole("button", { name: "Use it" });
    expect(use).toHaveAccessibleDescription("This device is in Europe / Berlin.");
    await user.click(use);
    expect(onChange).toHaveBeenCalledWith({ timezone: "Europe/Berlin" });

    rerender(<QuietHoursSetting start="22:00" end="07:00" timezone="Europe/Berlin" onChange={onChange} />);
    expect(screen.queryByRole("button", { name: "Use it" })).not.toBeInTheDocument();
  });

  it("sends a zone picked from the list", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuietHoursSetting start="22:00" end="07:00" timezone="Europe/Zurich" onChange={onChange} />);
    const zone = screen.getByRole("combobox", { name: "Time zone" });
    await user.clear(zone);
    await user.type(zone, "Vienna");
    await user.click(within(screen.getByRole("listbox")).getByRole("option", { name: /Vienna/ }));
    expect(onChange).toHaveBeenCalledWith({ timezone: "Europe/Vienna" });
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

  it("passes axe with a window, the zone and the device's offer", async () => {
    const { container } = render(
      <QuietHoursSetting start="22:00" end={null} timezone="Pacific/Auckland" inbox onChange={vi.fn()} />,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
