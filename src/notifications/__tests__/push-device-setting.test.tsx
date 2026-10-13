import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PushDeviceSetting } from "../push-device-setting";
import { PushDeviceError } from "../use-push-device";
import type { PushDevice } from "../use-push-device";
import { axeViolations } from "../../test/axe";

/**
 * docs/notifications-harmonization.md §4.2: keksdose's push block as a card — its states
 * in its order, the explainer only before the browser's prompt, the test's outcome.
 */

function device(overrides: Partial<PushDevice> = {}): PushDevice {
  return {
    supported: true,
    configured: true,
    installed: false,
    ios: false,
    permission: "default",
    subscribed: false,
    foreignSubscription: false,
    currentEndpoint: null,
    busy: false,
    enable: vi.fn(async () => true),
    disable: vi.fn(async () => undefined),
    sendTest: vi.fn(async () => ({ sent: 1 })),
    ...overrides,
  };
}

const card = (push: PushDevice, extra: Partial<Parameters<typeof PushDeviceSetting>[0]> = {}) =>
  render(<PushDeviceSetting push={push} appName="Example" {...extra} />);

describe("PushDeviceSetting — the states, in keksdose's order", () => {
  it.each([
    ["unsupported", { supported: false, ios: true, configured: false }, "This browser doesn’t support push notifications."],
    [
      "iOS outside the installed app",
      { ios: true, installed: false, configured: false },
      "On iPhone or iPad, add Example to your Home Screen first: iOS delivers notifications only to the installed app.",
    ],
    ["not set up on the server", { configured: false, permission: "denied" as const }, "Push notifications aren’t set up on this server."],
    ["blocked", { permission: "denied" as const }, "Notifications are blocked in this browser’s settings."],
  ])("%s", (_name, overrides, text) => {
    card(device(overrides));
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("an installed iOS app goes on to the ordinary states", () => {
    card(device({ ios: true, installed: true }));
    expect(screen.getByText("Notifications are off for this device.")).toBeInTheDocument();
  });

  it("off: one button to turn on; on: a test and a way off", () => {
    const { rerender } = card(device());
    expect(screen.getByText("Notifications are off for this device.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Turn on notifications" })).toBeInTheDocument();
    rerender(<PushDeviceSetting push={device({ subscribed: true, permission: "granted" })} appName="Example" />);
    expect(screen.getByText("Notifications are on for this device.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send a test" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Turn off" })).toBeInTheDocument();
  });

  it("says when this browser's subscription is another account's", () => {
    card(device({ foreignSubscription: true, permission: "granted" }));
    expect(screen.getByText(/This browser gets notifications for another account/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Turn on notifications" })).toBeInTheDocument();
  });
});

describe("PushDeviceSetting — turning on", () => {
  it("explains first while the permission is still to be asked, then turns on", async () => {
    const user = userEvent.setup();
    const push = device();
    card(push);
    await user.click(screen.getByRole("button", { name: "Turn on notifications" }));
    const dialog = screen.getByRole("dialog", { name: "Turn on notifications?" });
    expect(dialog).toHaveTextContent(
      "Example sends a notification only for the kinds you choose, and you can turn them off at any time.",
    );
    expect(dialog).toHaveTextContent("Your browser asks for permission next.");
    expect(push.enable).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(push.enable).toHaveBeenCalledTimes(1);
  });

  it("Cancel in the explainer asks nothing", async () => {
    const user = userEvent.setup();
    const push = device();
    card(push);
    await user.click(screen.getByRole("button", { name: "Turn on notifications" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(push.enable).not.toHaveBeenCalled();
  });

  it("with the permission granted, goes straight on", async () => {
    const user = userEvent.setup();
    const push = device({ permission: "granted" });
    card(push);
    await user.click(screen.getByRole("button", { name: "Turn on notifications" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(push.enable).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["no service worker", new PushDeviceError("no_service_worker"), "Couldn’t reach the app’s service worker. Reload the page and try again."],
    ["a silent push service", new PushDeviceError("push_timeout"), "The browser’s push service didn’t answer. Check your connection and try again."],
    ["anything else", new Error("500"), "Couldn’t turn on notifications."],
  ])("says what went wrong: %s", async (_name, error, text) => {
    const user = userEvent.setup();
    card(device({ permission: "granted", enable: vi.fn(() => Promise.reject(error)) }));
    await user.click(screen.getByRole("button", { name: "Turn on notifications" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
  });

  it("an enable that did not finish says so; the app's words win for its own failures", async () => {
    const user = userEvent.setup();
    const { unmount } = card(device({ permission: "granted", enable: vi.fn(async () => false) }));
    await user.click(screen.getByRole("button", { name: "Turn on notifications" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t turn on notifications.");
    unmount();

    const describeError = vi.fn(() => "The server refused this device.");
    const error = new Error("403");
    card(device({ permission: "granted", enable: vi.fn(() => Promise.reject(error)) }), { describeError });
    await user.click(screen.getByRole("button", { name: "Turn on notifications" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The server refused this device.");
    expect(describeError).toHaveBeenCalledWith(error, "enable");
  });
});

describe("PushDeviceSetting — on", () => {
  it("a test reports how many devices got it", async () => {
    const user = userEvent.setup();
    card(device({ subscribed: true, permission: "granted", sendTest: vi.fn(async () => ({ sent: 2 })) }));
    await user.click(screen.getByRole("button", { name: "Send a test" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Test sent to 2 devices");
  });

  it("a test that reached no device says `testNone`", async () => {
    const user = userEvent.setup();
    card(device({ subscribed: true, permission: "granted", sendTest: vi.fn(async () => ({ sent: 0 })) }));
    await user.click(screen.getByRole("button", { name: "Send a test" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "No device accepted the test. Turn notifications on for this device first.",
    );
  });

  it("a failed test says `testFailed`, or the app's words", async () => {
    const user = userEvent.setup();
    card(device({ subscribed: true, permission: "granted", sendTest: vi.fn(() => Promise.reject(new Error("503"))) }));
    await user.click(screen.getByRole("button", { name: "Send a test" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t send a test notification.");
  });

  it("turns off", async () => {
    const user = userEvent.setup();
    const push = device({ subscribed: true, permission: "granted" });
    card(push);
    await user.click(screen.getByRole("button", { name: "Turn off" }));
    expect(push.disable).toHaveBeenCalledTimes(1);
  });

  it("spreads `id` on the card", () => {
    card(device(), { id: "settings-push-card" });
    expect(document.getElementById("settings-push-card")).toHaveTextContent("Push notifications");
  });

  it("passes axe, off and on", async () => {
    const { container } = render(
      <>
        <PushDeviceSetting push={device({ foreignSubscription: true })} appName="Example" />
        <PushDeviceSetting push={device({ subscribed: true, permission: "granted" })} appName="Example" />
      </>,
    );
    expect(await axeViolations(container)).toEqual([]);
  });

  it("passes axe with the explainer open", async () => {
    const user = userEvent.setup();
    card(device());
    await user.click(screen.getByRole("button", { name: "Turn on notifications" }));
    expect(await axeViolations(document.body)).toEqual([]);
  });
});
