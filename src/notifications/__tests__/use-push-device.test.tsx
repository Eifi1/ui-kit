import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PUSH_SUBSCRIPTION_CHANGED,
  PushDeviceError,
  notifyPushSubscriptionChanged,
  pushSupported,
  usePushDevice,
} from "../use-push-device";
import type { UsePushDeviceOptions } from "../use-push-device";
import { installFakePush, refusal } from "../../test/fake-push";

/**
 * docs/notifications-harmonization.md §2.7, §3.5, §4.2: keksdose's `use-push`, lifted —
 * this account against this browser, the 409 recovery, both timeouts, the event.
 */

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  vi.useRealTimers();
});

function api(overrides: Partial<UsePushDeviceOptions> = {}): UsePushDeviceOptions {
  return {
    pushKey: vi.fn(async () => "BAAA-key_x"),
    register: vi.fn(async () => undefined),
    unregister: vi.fn(async () => undefined),
    devices: vi.fn(async () => []),
    test: vi.fn(async () => ({ sent: 1 })),
    onChange: vi.fn(),
    ...overrides,
  };
}

describe("usePushDevice — what it reads", () => {
  it("is unsupported without the browser's APIs, and asks the server nothing", () => {
    expect(pushSupported()).toBe(false);
    const options = api();
    const { result } = renderHook(() => usePushDevice(options));
    expect(result.current.supported).toBe(false);
    expect(result.current.permission).toBe("unsupported");
    expect(options.pushKey).not.toHaveBeenCalled();
  });

  it("reads whether the server has keys", async () => {
    uninstall = installFakePush().uninstall;
    const { result, rerender } = renderHook((options: UsePushDeviceOptions) => usePushDevice(options), {
      initialProps: api({ pushKey: vi.fn(async () => "") }),
    });
    expect(result.current.configured).toBeUndefined();
    await waitFor(() => expect(result.current.configured).toBe(false));
    rerender(api());
    // Once per mount: a new options object asks nothing again.
    expect(result.current.configured).toBe(false);
  });

  it("subscribed means THIS account holds this browser's subscription", async () => {
    uninstall = installFakePush({ existing: "https://push.example/a", permission: "granted" }).uninstall;
    const mine = renderHook(() =>
      usePushDevice(api({ devices: vi.fn(async () => [{ endpoint: "https://push.example/a" }]) })),
    );
    await waitFor(() => expect(mine.result.current.subscribed).toBe(true));
    expect(mine.result.current.foreignSubscription).toBe(false);
    expect(mine.result.current.currentEndpoint).toBe("https://push.example/a");
    mine.unmount();

    const theirs = renderHook(() =>
      usePushDevice(api({ devices: vi.fn(async () => [{ endpoint: "https://push.example/other" }]) })),
    );
    await waitFor(() => expect(theirs.result.current.foreignSubscription).toBe(true));
    expect(theirs.result.current.subscribed).toBe(false);
  });

  it("falls back to the browser's answer when the device list cannot be read", async () => {
    uninstall = installFakePush({ existing: "https://push.example/a", permission: "granted" }).uninstall;
    const { result } = renderHook(() =>
      usePushDevice(api({ devices: vi.fn(() => Promise.reject(new Error("offline"))) })),
    );
    await waitFor(() => expect(result.current.subscribed).toBe(true));
    expect(result.current.foreignSubscription).toBe(false);
  });

  it("reads an iPad that says it is a Mac by its touch points", () => {
    uninstall = installFakePush().uninstall;
    const ua = vi
      .spyOn(navigator, "userAgent", "get")
      .mockReturnValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15");
    // jsdom has no `maxTouchPoints`.
    Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 5 });
    const { result } = renderHook(() => usePushDevice(api()));
    expect(result.current.ios).toBe(true);
    expect(result.current.installed).toBe(false);
    delete (navigator as unknown as Record<string, unknown>).maxTouchPoints;
    ua.mockRestore();
  });

  it("reads installed and iOS", () => {
    uninstall = installFakePush().uninstall;
    const ua = vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1",
    );
    Object.defineProperty(navigator, "standalone", { configurable: true, value: true });
    const { result } = renderHook(() => usePushDevice(api()));
    expect(result.current.ios).toBe(true);
    expect(result.current.installed).toBe(true);
    delete (navigator as unknown as Record<string, unknown>).standalone;
    ua.mockRestore();
  });
});

describe("usePushDevice — enable and disable", () => {
  it("asks, subscribes with the server's key, registers, and tells everyone", async () => {
    const push = installFakePush();
    uninstall = push.uninstall;
    const registered: { endpoint: string }[] = [];
    const options = api({
      register: vi.fn(async (input: { endpoint: string }) => {
        registered.push({ endpoint: input.endpoint });
      }),
    });
    // A second card on the same hook (keksdose's check-up): it hears the change.
    const otherDevices = vi.fn(async () => [...registered]);
    const other = renderHook(() => usePushDevice(api({ devices: otherDevices })));
    const heard = vi.fn();
    window.addEventListener(PUSH_SUBSCRIPTION_CHANGED, heard);
    const { result } = renderHook(() => usePushDevice(options));
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.enable();
    });
    expect(ok).toBe(true);
    expect(push.requestPermission).toHaveBeenCalledTimes(1);
    expect(push.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true, applicationServerKey: expect.any(Uint8Array) }),
    );
    const endpoint = push.current()!.endpoint;
    expect(options.register).toHaveBeenCalledWith({
      endpoint,
      keys: { p256dh: "p256dh-key", auth: "auth-key" },
      user_agent: navigator.userAgent,
    });
    expect(result.current.subscribed).toBe(true);
    expect(result.current.currentEndpoint).toBe(endpoint);
    expect(result.current.permission).toBe("granted");
    expect(result.current.busy).toBe(false);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(options.onChange).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(other.result.current.subscribed).toBe(true));
    // The hook that fired it knows what changed and asks the list nothing (at mount the
    // browser held no subscription, so there was nothing to ask about either).
    expect(options.devices).not.toHaveBeenCalled();
    window.removeEventListener(PUSH_SUBSCRIPTION_CHANGED, heard);
  });

  it("answers false when the permission is not granted, or the server has no keys", async () => {
    const push = installFakePush({ prompt: "denied" });
    uninstall = push.uninstall;
    const options = api();
    const { result } = renderHook(() => usePushDevice(options));
    await act(async () => {
      expect(await result.current.enable()).toBe(false);
    });
    expect(result.current.permission).toBe("denied");
    expect(options.register).not.toHaveBeenCalled();

    push.notification.permission = "default";
    const off = api({ pushKey: vi.fn(async () => "") });
    const second = renderHook(() => usePushDevice(off));
    push.requestPermission.mockImplementation(async () => "granted");
    await act(async () => {
      expect(await second.result.current.enable()).toBe(false);
    });
    expect(second.result.current.configured).toBe(false);
    expect(push.subscribe).not.toHaveBeenCalled();
  });

  it("recovers a 409 once: unsubscribes and registers a fresh endpoint", async () => {
    const push = installFakePush({ existing: "https://push.example/theirs" });
    uninstall = push.uninstall;
    const theirs = push.current()!;
    const register = vi.fn().mockRejectedValueOnce(refusal(409, "push_endpoint_taken")).mockResolvedValue(undefined);
    const { result } = renderHook(() => usePushDevice(api({ register })));
    await act(async () => {
      expect(await result.current.enable()).toBe(true);
    });
    expect(theirs.unsubscribe).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledTimes(2);
    expect(register.mock.calls[0][0].endpoint).toBe("https://push.example/theirs");
    expect(register.mock.calls[1][0].endpoint).toMatch(/^https:\/\/push\.example\/fresh-/);
  });

  it("does not loop: a second 409 rejects, and another error is not recovered", async () => {
    uninstall = installFakePush().uninstall;
    const taken = refusal(409, "push_endpoint_taken");
    const twice = vi.fn().mockRejectedValue(taken);
    const first = renderHook(() => usePushDevice(api({ register: twice })));
    await act(async () => {
      await expect(first.result.current.enable()).rejects.toBe(taken);
    });
    expect(twice).toHaveBeenCalledTimes(2);
    expect(first.result.current.busy).toBe(false);

    const broken = refusal(500);
    const once = vi.fn().mockRejectedValue(broken);
    const second = renderHook(() => usePushDevice(api({ register: once })));
    await act(async () => {
      await expect(second.result.current.enable()).rejects.toBe(broken);
    });
    expect(once).toHaveBeenCalledTimes(1);
  });

  it("takes the app's word for “taken”", async () => {
    uninstall = installFakePush().uninstall;
    const register = vi.fn().mockRejectedValueOnce({ kind: "taken" }).mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePushDevice(api({ register, isEndpointTaken: (error) => (error as { kind?: string }).kind === "taken" })),
    );
    await act(async () => {
      expect(await result.current.enable()).toBe(true);
    });
    expect(register).toHaveBeenCalledTimes(2);
  });

  it("disable tells the server first, then the browser", async () => {
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
    const options = api({ unregister, devices: vi.fn(async () => [{ endpoint: "https://push.example/a" }]) });
    const { result } = renderHook(() => usePushDevice(options));
    await waitFor(() => expect(result.current.subscribed).toBe(true));
    await act(async () => {
      await result.current.disable();
    });
    expect(unregister).toHaveBeenCalledWith("https://push.example/a");
    expect(order).toEqual(["server", "browser"]);
    expect(result.current.subscribed).toBe(false);
    expect(result.current.currentEndpoint).toBeNull();
    expect(options.onChange).toHaveBeenCalledTimes(1);
  });

  it("an incomplete subscription from the browser registers nothing", async () => {
    uninstall = installFakePush({ incomplete: true }).uninstall;
    const options = api();
    const { result } = renderHook(() => usePushDevice(options));
    await act(async () => {
      expect(await result.current.enable()).toBe(false);
    });
    expect(options.register).not.toHaveBeenCalled();
    expect(result.current.subscribed).toBe(false);
  });

  it("does nothing where push is unsupported", async () => {
    const options = api();
    const { result } = renderHook(() => usePushDevice(options));
    await act(async () => {
      expect(await result.current.enable()).toBe(false);
      await result.current.disable();
    });
    expect(options.register).not.toHaveBeenCalled();
    expect(options.unregister).not.toHaveBeenCalled();
  });

  it("disable with no subscription held tells nobody's server anything, and still says off", async () => {
    uninstall = installFakePush({ permission: "granted" }).uninstall;
    const options = api();
    const { result } = renderHook(() => usePushDevice(options));
    await act(async () => {
      await result.current.disable();
    });
    expect(options.unregister).not.toHaveBeenCalled();
    expect(result.current.subscribed).toBe(false);
    expect(options.onChange).toHaveBeenCalledTimes(1);
  });

  it("an answer after the card unmounted sets nothing", async () => {
    uninstall = installFakePush().uninstall;
    let release!: () => void;
    const register = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));
    const options = api({ register });
    const { result, unmount } = renderHook(() => usePushDevice(options));
    let running!: Promise<boolean>;
    await act(async () => {
      running = result.current.enable();
      await waitFor(() => expect(register).toHaveBeenCalled());
    });
    unmount();
    release();
    await expect(running).resolves.toBe(true);
  });

  it("sendTest is the app's test", async () => {
    uninstall = installFakePush().uninstall;
    const { result } = renderHook(() => usePushDevice(api({ test: vi.fn(async () => ({ sent: 3 })) })));
    await expect(result.current.sendTest()).resolves.toEqual({ sent: 3 });
  });
});

describe("usePushDevice — timeouts", () => {
  it("no registration is `no_service_worker` at once", async () => {
    uninstall = installFakePush({ noRegistration: true }).uninstall;
    const { result } = renderHook(() => usePushDevice(api()));
    await act(async () => {
      await expect(result.current.enable()).rejects.toEqual(new PushDeviceError("no_service_worker"));
    });
    expect(result.current.busy).toBe(false);
  });

  it("a worker not ready in 10 s is `no_service_worker`", async () => {
    vi.useFakeTimers();
    uninstall = installFakePush({ neverReady: true }).uninstall;
    const { result } = renderHook(() => usePushDevice(api()));
    let outcome: unknown;
    await act(async () => {
      const running = result.current.enable().catch((error: unknown) => {
        outcome = error;
      });
      await vi.advanceTimersByTimeAsync(10_000);
      await running;
    });
    expect(outcome).toBeInstanceOf(PushDeviceError);
    expect((outcome as PushDeviceError).code).toBe("no_service_worker");
    expect(result.current.busy).toBe(false);
  });

  it("a push service that does not answer in 15 s is `push_timeout`", async () => {
    vi.useFakeTimers();
    uninstall = installFakePush({ subscribeHangs: true }).uninstall;
    const { result } = renderHook(() => usePushDevice(api()));
    let outcome: unknown;
    await act(async () => {
      const running = result.current.enable().catch((error: unknown) => {
        outcome = error;
      });
      await vi.advanceTimersByTimeAsync(15_000);
      await running;
    });
    expect((outcome as PushDeviceError).code).toBe("push_timeout");
    expect(result.current.busy).toBe(false);
  });
});

describe("PUSH_SUBSCRIPTION_CHANGED", () => {
  it("every mounted hook re-reads its state on it", async () => {
    const push = installFakePush({ existing: "https://push.example/a", permission: "granted" });
    uninstall = push.uninstall;
    const devices = vi.fn(async () => [{ endpoint: "https://push.example/a" }]);
    const { result } = renderHook(() => usePushDevice(api({ devices })));
    await waitFor(() => expect(result.current.subscribed).toBe(true));
    // Another card removed this device: the browser no longer holds it.
    await push.current()!.unsubscribe();
    await act(async () => {
      notifyPushSubscriptionChanged();
    });
    await waitFor(() => expect(result.current.subscribed).toBe(false));
    expect(result.current.currentEndpoint).toBeNull();
  });

  it("is the kit's own event name", () => {
    expect(PUSH_SUBSCRIPTION_CHANGED).toBe("eifi1:push-subscription-changed");
  });
});
