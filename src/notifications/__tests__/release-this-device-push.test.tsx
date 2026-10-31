import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PUSH_SUBSCRIPTION_CHANGED, PushDeviceError, releaseThisDevicePush, usePushDevice } from "../use-push-device";
import { installFakePush, refusal } from "../../test/fake-push";

/**
 * docs/notifications-harmonization.md §10.6: an explicit sign-out releases this device's
 * push (refactor audit 2026-10-30, FLW-2) — `disable` without the card mounted.
 */

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  vi.useRealTimers();
});

describe("releaseThisDevicePush — a sign-out leaves no push on the device", () => {
  it("tells the server first, then the browser, then every mounted hook", async () => {
    const push = installFakePush({ existing: "https://push.example/a", permission: "granted" });
    uninstall = push.uninstall;
    const subscription = push.current()!;
    const order: string[] = [];
    const unregister = vi.fn(async () => {
      order.push("server");
    });
    subscription.unsubscribe.mockImplementation(async () => {
      order.push("browser");
      return true;
    });
    const heard = vi.fn(() => order.push("event"));
    window.addEventListener(PUSH_SUBSCRIPTION_CHANGED, heard);
    try {
      await expect(releaseThisDevicePush(unregister)).resolves.toBe(true);
    } finally {
      window.removeEventListener(PUSH_SUBSCRIPTION_CHANGED, heard);
    }
    expect(unregister).toHaveBeenCalledWith("https://push.example/a");
    expect(order).toEqual(["server", "browser", "event"]);
  });

  it("a mounted card hears it and reads off", async () => {
    const push = installFakePush({ existing: "https://push.example/a", permission: "granted" });
    uninstall = push.uninstall;
    const options = {
      pushKey: vi.fn(async () => "BAAA-key_x"),
      register: vi.fn(async () => undefined),
      unregister: vi.fn(async () => undefined),
      devices: vi.fn(async () => (push.current() ? [{ endpoint: push.current()!.endpoint }] : [])),
      test: vi.fn(async () => ({ sent: 1 })),
    };
    const { result } = renderHook(() => usePushDevice(options));
    await waitFor(() => expect(result.current.subscribed).toBe(true));
    await releaseThisDevicePush(vi.fn(async () => undefined));
    await waitFor(() => expect(result.current.subscribed).toBe(false));
    expect(result.current.currentEndpoint).toBeNull();
  });

  it("with no subscription held asks no server, and still announces", async () => {
    uninstall = installFakePush({ permission: "granted" }).uninstall;
    const unregister = vi.fn(async () => undefined);
    const heard = vi.fn();
    window.addEventListener(PUSH_SUBSCRIPTION_CHANGED, heard);
    try {
      await expect(releaseThisDevicePush(unregister)).resolves.toBe(false);
    } finally {
      window.removeEventListener(PUSH_SUBSCRIPTION_CHANGED, heard);
    }
    expect(unregister).not.toHaveBeenCalled();
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("resolves false at once where push is unsupported", async () => {
    const unregister = vi.fn(async () => undefined);
    await expect(releaseThisDevicePush(unregister)).resolves.toBe(false);
    expect(unregister).not.toHaveBeenCalled();
  });

  it("keeps the browser's subscription when the server refuses, and rejects as the request did", async () => {
    const push = installFakePush({ existing: "https://push.example/a", permission: "granted" });
    uninstall = push.uninstall;
    const failure = refusal(500);
    await expect(releaseThisDevicePush(vi.fn(async () => Promise.reject(failure)))).rejects.toBe(failure);
    expect(push.current()?.unsubscribe).not.toHaveBeenCalled();
  });

  it("keeps the hook's cuts: no registration fails at once, a stuck unsubscribe after 15 s", async () => {
    uninstall = installFakePush({ noRegistration: true }).uninstall;
    await expect(releaseThisDevicePush(vi.fn(async () => undefined))).rejects.toMatchObject({
      code: "no_service_worker",
    });
    uninstall();

    const push = installFakePush({ existing: "https://push.example/a", permission: "granted" });
    uninstall = push.uninstall;
    push.current()!.unsubscribe.mockImplementation(() => new Promise<boolean>(() => {}));
    vi.useFakeTimers();
    const running = releaseThisDevicePush(vi.fn(async () => undefined));
    const settled = expect(running).rejects.toBeInstanceOf(PushDeviceError);
    await vi.advanceTimersByTimeAsync(15_000);
    await settled;
    await expect(running).rejects.toMatchObject({ code: "push_timeout" });
  });
});
