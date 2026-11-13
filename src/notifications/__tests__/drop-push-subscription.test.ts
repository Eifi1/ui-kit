import { afterEach, describe, expect, it, vi } from "vitest";

import { dropPushSubscription } from "../use-push-device";
import { installFakePush, refusal } from "../../test/fake-push";

/**
 * 0.62 (Marcel 2026-11-13): every sign-out drops this device's push, and a sign-out must
 * not fail on it. `releaseThisDevicePush` rejects as the app's request did, for a caller
 * that wants to know; every sign-out wrapped it in `.catch(() => undefined)`, and one that
 * forgot never signed out when the server refused.
 */

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
});

const ENDPOINT = "https://push.example/library-pc";

describe("dropPushSubscription", () => {
  it("tells the server through the app's call, and unsubscribes the browser", async () => {
    const push = installFakePush({ existing: ENDPOINT, permission: "granted" });
    uninstall = push.uninstall;
    const subscription = push.current()!;
    const unregister = vi.fn(async () => undefined);
    await expect(dropPushSubscription(unregister)).resolves.toBe(true);
    expect(unregister).toHaveBeenCalledWith(ENDPOINT);
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(push.current()).toBeNull();
  });

  it("does not reject when the server refuses, and the browser lets go all the same", async () => {
    const push = installFakePush({ existing: ENDPOINT, permission: "granted" });
    uninstall = push.uninstall;
    const subscription = push.current()!;
    await expect(dropPushSubscription(vi.fn(async () => Promise.reject(refusal(401))))).resolves.toBe(false);
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(push.current()).toBeNull();
  });

  it("does not reject when the browser's unsubscribe fails, after telling the server", async () => {
    const push = installFakePush({ existing: ENDPOINT, permission: "granted" });
    uninstall = push.uninstall;
    push.current()!.unsubscribe.mockRejectedValueOnce(new Error("AbortError"));
    const unregister = vi.fn(async () => undefined);
    await expect(dropPushSubscription(unregister)).resolves.toBe(false);
    expect(unregister).toHaveBeenCalledWith(ENDPOINT);
  });

  it("does not reject when the server call throws before it returns a promise", async () => {
    uninstall = installFakePush({ existing: ENDPOINT, permission: "granted" }).uninstall;
    const unregister = vi.fn((): Promise<unknown> => {
      throw new TypeError("api is not ready");
    });
    await expect(dropPushSubscription(unregister)).resolves.toBe(false);
  });

  it("does not reject when the browser cannot even be asked", async () => {
    const push = installFakePush({ existing: ENDPOINT, permission: "granted" });
    uninstall = push.uninstall;
    push.serviceWorker.getRegistration.mockRejectedValueOnce(new DOMException("denied", "SecurityError"));
    const unregister = vi.fn(async () => undefined);
    await expect(dropPushSubscription(unregister)).resolves.toBe(false);
    expect(unregister).not.toHaveBeenCalled();
  });

  it("resolves false, asking nothing, where this browser holds no subscription", async () => {
    uninstall = installFakePush({ permission: "granted" }).uninstall;
    const unregister = vi.fn(async () => undefined);
    await expect(dropPushSubscription(unregister)).resolves.toBe(false);
    expect(unregister).not.toHaveBeenCalled();
  });
});
