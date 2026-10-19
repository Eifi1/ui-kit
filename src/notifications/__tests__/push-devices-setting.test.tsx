import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PushDevicesSetting, describeUserAgent } from "../push-devices-setting";
import type { PushDeviceItem } from "../notification-types";
import { PUSH_SUBSCRIPTION_CHANGED } from "../use-push-device";
import { installFakePush } from "../../test/fake-push";
import { axeViolations } from "../../test/axe";

/**
 * docs/notifications-harmonization.md §3.5, §4.2: keksdose's devices card — "This
 * device", the failures, the confirm, and removing this device. Synthetic data only.
 */

const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const FIREFOX_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0";

const DEVICES: PushDeviceItem<number>[] = [
  {
    id: 1,
    endpoint: "https://push.example/phone",
    user_agent: CHROME_ANDROID,
    created_at: "2026-09-01T08:00:00Z",
    last_success_at: "2026-10-12T19:30:00Z",
    failure_count: 0,
  },
  {
    id: 2,
    endpoint: "https://push.example/laptop",
    user_agent: FIREFOX_WINDOWS,
    created_at: "2026-10-01T08:00:00Z",
    last_success_at: null,
    failure_count: 3,
  },
  {
    id: 3,
    endpoint: "https://push.example/old",
    user_agent: null,
    created_at: "2026-01-01T08:00:00Z",
    last_success_at: null,
    failure_count: 1,
  },
];

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
});

describe("describeUserAgent", () => {
  it.each([
    [CHROME_ANDROID, "Chrome · Android"],
    [FIREFOX_WINDOWS, "Firefox · Windows"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15", "Safari · macOS"],
    ["Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/129.0 Safari/537.36 Edg/129.0", "Edge · Windows"],
    ["Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/129.0 Safari/537.36 OPR/114.0", "Opera · Linux"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/129.0 Mobile Safari", "Chrome · iOS"],
    ["curl/8.0", "curl/8.0"],
    [null, null],
    ["", null],
  ])("%s → %s", (ua, name) => {
    expect(describeUserAgent(ua)).toBe(name);
  });

  it("cuts an agent it does not know at 60 characters", () => {
    expect(describeUserAgent("x".repeat(80))).toBe(`${"x".repeat(60)}…`);
  });
});

describe("PushDevicesSetting", () => {
  it("lists every device, this one marked, with its dates and failures", () => {
    render(
      <PushDevicesSetting
        devices={DEVICES}
        currentEndpoint="https://push.example/laptop"
        onRemove={vi.fn()}
        formatDate={formatDate}
      />,
    );
    expect(screen.getByText("Notification devices")).toBeInTheDocument();
    const rows = within(screen.getByRole("list", { name: "Notification devices" })).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Chrome · Android");
    expect(rows[0]).toHaveTextContent("Added 2026-09-01 · Last delivery 2026-10-12");
    expect(rows[0]).not.toHaveTextContent("This device");
    expect(rows[1]).toHaveTextContent("Firefox · Windows");
    expect(rows[1]).toHaveTextContent("This device");
    expect(rows[1]).toHaveTextContent("No delivery yet");
    expect(rows[1]).toHaveTextContent("3 failed deliveries in a row");
    expect(rows[2]).toHaveTextContent("Unknown device");
    expect(rows[2]).toHaveTextContent("1 failed delivery in a row");
  });

  it("formats in the locale by default", () => {
    render(<PushDevicesSetting devices={DEVICES.slice(0, 1)} onRemove={vi.fn()} locale="de-CH" />);
    expect(screen.getByRole("listitem")).toHaveTextContent(
      `Added ${new Intl.DateTimeFormat("de-CH", { dateStyle: "medium" }).format(new Date(DEVICES[0].created_at))}`,
    );
  });

  it("says when it loads and when there are none", () => {
    const { rerender } = render(<PushDevicesSetting devices={undefined} onRemove={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading devices…");
    rerender(<PushDevicesSetting devices={[]} onRemove={vi.fn()} />);
    expect(screen.getByText("No device gets notifications yet.")).toBeInTheDocument();
  });

  it("asks before it removes, in the row, focus on Cancel; Cancel and Escape leave", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn(async () => undefined);
    render(<PushDevicesSetting devices={DEVICES} onRemove={onRemove} formatDate={formatDate} />);
    await user.click(screen.getByRole("button", { name: "Remove Chrome · Android" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Stop sending notifications to this device?");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Chrome · Android" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Remove Chrome · Android" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Remove Chrome · Android" }));
    await user.click(screen.getByRole("button", { name: "Remove Chrome · Android" }));
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it("removing THIS device also unsubscribes the browser and fires the event", async () => {
    const user = userEvent.setup();
    const push = installFakePush({ existing: "https://push.example/laptop", permission: "granted" });
    uninstall = push.uninstall;
    const subscription = push.current()!;
    const heard = vi.fn();
    window.addEventListener(PUSH_SUBSCRIPTION_CHANGED, heard);
    render(
      <PushDevicesSetting
        devices={DEVICES}
        currentEndpoint="https://push.example/laptop"
        onRemove={vi.fn(async () => undefined)}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Remove Firefox · Windows" }));
    await user.click(screen.getByRole("button", { name: "Remove Firefox · Windows" }));
    await waitFor(() => expect(heard).toHaveBeenCalledTimes(1));
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    window.removeEventListener(PUSH_SUBSCRIPTION_CHANGED, heard);
  });

  it("removing another device leaves this browser alone", async () => {
    const user = userEvent.setup();
    const push = installFakePush({ existing: "https://push.example/laptop", permission: "granted" });
    uninstall = push.uninstall;
    const heard = vi.fn();
    window.addEventListener(PUSH_SUBSCRIPTION_CHANGED, heard);
    const onRemove = vi.fn(async () => undefined);
    render(<PushDevicesSetting devices={DEVICES} currentEndpoint="https://push.example/laptop" onRemove={onRemove} />);
    await user.click(screen.getByRole("button", { name: "Remove Chrome · Android" }));
    await user.click(screen.getByRole("button", { name: "Remove Chrome · Android" }));
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith(1));
    expect(push.current()!.unsubscribe).not.toHaveBeenCalled();
    expect(heard).not.toHaveBeenCalled();
    window.removeEventListener(PUSH_SUBSCRIPTION_CHANGED, heard);
  });

  it("a failed removal is said under the card, the confirm still open", async () => {
    const user = userEvent.setup();
    render(
      <PushDevicesSetting
        devices={DEVICES}
        onRemove={() => Promise.reject(new Error("offline"))}
        describeError={() => "You are offline."}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Remove Chrome · Android" }));
    await user.click(screen.getByRole("button", { name: "Remove Chrome · Android" }));
    expect(await screen.findByText("You are offline.")).toBeInTheDocument();
    expect(screen.getByText("Stop sending notifications to this device?")).toBeInTheDocument();
  });

  it("spreads `id` on the card, and passes axe", async () => {
    const { container } = render(
      <PushDevicesSetting
        id="settings-devices-card"
        devices={DEVICES}
        currentEndpoint="https://push.example/phone"
        onRemove={vi.fn()}
      />,
    );
    expect(document.getElementById("settings-devices-card")).toHaveTextContent("Notification devices");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("passes axe with a confirm open", async () => {
    const user = userEvent.setup();
    const { container } = render(<PushDevicesSetting devices={DEVICES} onRemove={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Remove Chrome · Android" }));
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("PushDevicesSetting — types on this device (0.46, §10.2)", () => {
  const TYPES = [
    { id: "scan_done", label: "Finished scans" },
    { id: "overspend", label: "Overspent categories" },
    { id: "digest", label: "Budget digest" },
  ];
  // `digest` has push off for the account: not listed. `old_type` was dropped by the registry.
  const SWITCHES = {
    scan_done: { app: true, push: true, email: null },
    overspend: { app: false, push: true, email: null },
    digest: { app: true, push: false, email: null },
  };
  const MUTING: PushDeviceItem<number>[] = [{ ...DEVICES[0], muted_types: ["overspend", "old_type"] }, DEVICES[1]];

  it("lists the types with push on, each a switch, on unless the device mutes it", async () => {
    const user = userEvent.setup();
    render(
      <PushDevicesSetting
        devices={MUTING}
        onRemove={vi.fn()}
        onMutedTypesChange={vi.fn()}
        types={TYPES}
        typeSwitches={SWITCHES}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Types on this device: Chrome · Android" }));
    const phone = document.querySelector('[data-push-device-id="1"]') as HTMLElement;
    expect(within(phone).getAllByRole("switch")).toHaveLength(2);
    expect(within(phone).getByRole("switch", { name: "Finished scans" })).toBeChecked();
    expect(within(phone).getByRole("switch", { name: "Overspent categories" })).not.toBeChecked();
    expect(within(phone).queryByRole("switch", { name: "Budget digest" })).not.toBeInTheDocument();
  });

  it("writes the device's whole list on each flip, without the ids the registry dropped", async () => {
    const user = userEvent.setup();
    const onMutedTypesChange = vi.fn(async () => undefined);
    render(
      <PushDevicesSetting
        devices={MUTING}
        onRemove={vi.fn()}
        onMutedTypesChange={onMutedTypesChange}
        types={TYPES}
        typeSwitches={SWITCHES}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Types on this device: Chrome · Android" }));
    const phone = document.querySelector('[data-push-device-id="1"]') as HTMLElement;
    await user.click(within(phone).getByRole("switch", { name: "Finished scans" }));
    expect(onMutedTypesChange).toHaveBeenLastCalledWith(1, ["overspend", "scan_done"]);
    expect(within(phone).getByRole("switch", { name: "Finished scans" })).not.toBeChecked();
    await user.click(within(phone).getByRole("switch", { name: "Overspent categories" }));
    expect(onMutedTypesChange).toHaveBeenLastCalledWith(1, ["scan_done"]);
    // The other device keeps its own (empty) list.
    await user.click(screen.getByRole("button", { name: "Types on this device: Firefox · Windows" }));
    const laptop = document.querySelector('[data-push-device-id="2"]') as HTMLElement;
    await user.click(within(laptop).getByRole("switch", { name: "Overspent categories" }));
    expect(onMutedTypesChange).toHaveBeenLastCalledWith(2, ["overspend"]);
  });

  it("puts a rejected flip back and says so; no disclosure without `onMutedTypesChange`", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <PushDevicesSetting
        devices={MUTING}
        onRemove={vi.fn()}
        onMutedTypesChange={() => Promise.reject(new Error("offline"))}
        types={TYPES}
        typeSwitches={SWITCHES}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Types on this device: Chrome · Android" }));
    await user.click(screen.getByRole("switch", { name: "Finished scans" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That didn’t work. Please try again.");
    expect(screen.getByRole("switch", { name: "Finished scans" })).toBeChecked();
    unmount();
    render(<PushDevicesSetting devices={MUTING} onRemove={vi.fn()} types={TYPES} typeSwitches={SWITCHES} />);
    expect(screen.queryByRole("button", { name: /Types on this device/ })).not.toBeInTheDocument();
  });

  it("says so when no type has push on, and passes axe open", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PushDevicesSetting
        devices={DEVICES.slice(0, 1)}
        onRemove={vi.fn()}
        onMutedTypesChange={vi.fn()}
        types={TYPES}
        typeSwitches={{ scan_done: { app: true, push: false, email: null } }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Types on this device/ }));
    expect(screen.getByText("No type has push notifications turned on.")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});
