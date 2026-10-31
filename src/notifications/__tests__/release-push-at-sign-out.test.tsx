import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PUSH_SUBSCRIPTION_CHANGED, releaseThisDevicePush, usePushDevice } from "../use-push-device";
import { installFakePush, refusal } from "../../test/fake-push";
import { settleMacrotask } from "../../test/tasks";

/**
 * 0.52 code review, use-push-device.ts — Marcel's decision 2 of the 2026-10-30 audit: an
 * EXPLICIT sign-out releases this device's push (FLW-2). Two ways it did not hold:
 *
 *  - the browser was unsubscribed only after the server had agreed, so a sign-out on a
 *    flaky network (or a 5xx from `/notifications/devices/unregister`) left the device
 *    subscribed, showing the previous account's titles and bodies to the next person.
 *    Unsubscribed anyway, the push service answers the server's next send with 410 and
 *    the server prunes the row;
 *  - a device where push was never set up — most of them: no service worker registration
 *    at all — rejected with `no_service_worker` instead of answering "nothing to release",
 *    so an app that awaited it without the documented `.catch` never signed out, and one
 *    whose worker was stuck installing waited 10 s for `ready` first.
 */

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
});

/** The release's answer if it settles within a turn of the event loop, else "pending". */
async function answerWithinATurn(running: Promise<boolean>) {
  const outcome = running.then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
  return Promise.race([outcome, settleMacrotask().then(() => "pending" as const)]);
}

describe("releaseThisDevicePush at a sign-out", () => {
  it("unsubscribes the browser even when the server refuses, and still rejects as the request did", async () => {
    const push = installFakePush({ existing: "https://push.example/a", permission: "granted" });
    uninstall = push.uninstall;
    const subscription = push.current()!;
    const failure = refusal(503);
    const heard = vi.fn();
    window.addEventListener(PUSH_SUBSCRIPTION_CHANGED, heard);
    try {
      await expect(releaseThisDevicePush(vi.fn(async () => Promise.reject(failure)))).rejects.toBe(failure);
    } finally {
      window.removeEventListener(PUSH_SUBSCRIPTION_CHANGED, heard);
    }
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(push.current()).toBeNull();
    // The cards on screen re-read: the browser holds nothing now.
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("a mounted card reads off after a refused server, too", async () => {
    const push = installFakePush({ existing: "https://push.example/a", permission: "granted" });
    uninstall = push.uninstall;
    const options = {
      pushKey: vi.fn(async () => "BAAA-key_x"),
      register: vi.fn(async () => undefined),
      unregister: vi.fn(async () => undefined),
      devices: vi.fn(async () => [{ endpoint: "https://push.example/a" }]),
      test: vi.fn(async () => ({ sent: 1 })),
    };
    const { result } = renderHook(() => usePushDevice(options));
    await waitFor(() => expect(result.current.subscribed).toBe(true));
    await releaseThisDevicePush(vi.fn(async () => Promise.reject(refusal(500)))).catch(() => undefined);
    await waitFor(() => expect(result.current.subscribed).toBe(false));
  });

  it("resolves false, asking no server, where push was never set up", async () => {
    uninstall = installFakePush({ noRegistration: true }).uninstall;
    const unregister = vi.fn(async () => undefined);
    await expect(answerWithinATurn(releaseThisDevicePush(unregister))).resolves.toEqual({ value: false });
    expect(unregister).not.toHaveBeenCalled();
  });

  it("resolves false at once while the only worker is still installing", async () => {
    const push = installFakePush({ neverReady: true, permission: "granted" });
    uninstall = push.uninstall;
    const registration = (await navigator.serviceWorker.getRegistration()) as unknown as { active: unknown };
    registration.active = null;
    const unregister = vi.fn(async () => undefined);
    await expect(answerWithinATurn(releaseThisDevicePush(unregister))).resolves.toEqual({ value: false });
    expect(unregister).not.toHaveBeenCalled();
  });

  it("releases a subscription without waiting for `ready`", async () => {
    // An active worker with an update stuck installing: the subscription is the
    // registration's, and `ready` has nothing to add to it.
    const push = installFakePush({ neverReady: true, existing: "https://push.example/a", permission: "granted" });
    uninstall = push.uninstall;
    const unregister = vi.fn(async () => undefined);
    await expect(answerWithinATurn(releaseThisDevicePush(unregister))).resolves.toEqual({ value: true });
    expect(unregister).toHaveBeenCalledWith("https://push.example/a");
    expect(push.current()).toBeNull();
  });
});
