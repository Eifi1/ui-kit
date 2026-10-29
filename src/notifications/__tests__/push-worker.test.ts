import { describe, expect, it, vi } from "vitest";
import { PUSH_SUBSCRIPTION_CHANGED, handlePushSubscriptionChange, resubscribeAfterChange } from "../push-worker";
import type { PushReplaceInput, PushSubscriptionChangeEventLike, PushWorkerScope } from "../push-worker";

/** A subscription as the worker sees it; `key` is its applicationServerKey. */
function subscription(
  endpoint: string,
  { auth = `auth-${endpoint}`, key = null as ArrayBuffer | null, keys = true } = {},
) {
  return {
    endpoint,
    options: { applicationServerKey: key, userVisibleOnly: true },
    toJSON: () => (keys ? { endpoint, keys: { p256dh: `p-${endpoint}`, auth } } : { endpoint }),
  } as unknown as PushSubscription;
}

function pushManager(current: PushSubscription | null = null) {
  return {
    getSubscription: vi.fn(async () => current),
    subscribe: vi.fn(async (_init: PushSubscriptionOptionsInit) => subscription("https://push.example/fresh")),
  } as unknown as PushManager & { subscribe: ReturnType<typeof vi.fn>; getSubscription: ReturnType<typeof vi.fn> };
}

const OLD = "https://push.example/old";

describe("resubscribeAfterChange (0.46, pushsubscriptionchange)", () => {
  it("sends the browser's new subscription with the old endpoint and its auth", async () => {
    const replace = vi.fn(async (_input: PushReplaceInput) => {});
    const pushKey = vi.fn(async () => "AAAA");
    const manager = pushManager();
    const outcome = await resubscribeAfterChange(
      { oldSubscription: subscription(OLD), newSubscription: subscription("https://push.example/new") },
      manager,
      { replace, pushKey },
    );
    expect(outcome).toBe("replaced");
    expect(replace).toHaveBeenCalledWith({
      old_endpoint: OLD,
      old_auth: `auth-${OLD}`,
      subscription: {
        endpoint: "https://push.example/new",
        keys: { p256dh: "p-https://push.example/new", auth: "auth-https://push.example/new" },
        user_agent: navigator.userAgent,
      },
    });
    expect(manager.subscribe).not.toHaveBeenCalled();
    expect(pushKey).not.toHaveBeenCalled();
  });

  it("takes the subscription the browser holds when the event names none", async () => {
    const replace = vi.fn(async (_input: PushReplaceInput) => {});
    const manager = pushManager(subscription("https://push.example/held"));
    await resubscribeAfterChange({ oldSubscription: subscription(OLD) }, manager, { replace, pushKey: vi.fn() });
    expect(replace.mock.calls[0][0]).toMatchObject({ subscription: { endpoint: "https://push.example/held" } });
  });

  it("subscribes afresh under the old key, else the server's", async () => {
    const key = new Uint8Array([1, 2, 3]).buffer;
    const withKey = pushManager();
    const replace = vi.fn(async (_input: PushReplaceInput) => {});
    const pushKey = vi.fn(async () => "AQID");
    await resubscribeAfterChange({ oldSubscription: subscription(OLD, { key }) }, withKey, { replace, pushKey });
    expect(withKey.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: key });
    expect(pushKey).not.toHaveBeenCalled();

    const without = pushManager();
    await resubscribeAfterChange({ oldSubscription: subscription(OLD) }, without, { replace, pushKey });
    expect(pushKey).toHaveBeenCalledOnce();
    const init = without.subscribe.mock.calls[0][0] as PushSubscriptionOptionsInit;
    expect([...(init.applicationServerKey as Uint8Array)]).toEqual([1, 2, 3]);
    expect(replace.mock.calls.map((c) => c[0]!.subscription.endpoint)).toEqual([
      "https://push.example/fresh",
      "https://push.example/fresh",
    ]);
  });

  it("does nothing it cannot prove: no old subscription, or one without its keys", async () => {
    const replace = vi.fn();
    const options = { replace, pushKey: vi.fn() };
    expect(await resubscribeAfterChange({}, pushManager(), options)).toBe("no_previous");
    expect(await resubscribeAfterChange({ oldSubscription: null }, pushManager(), options)).toBe("no_previous");
    expect(
      await resubscribeAfterChange({ oldSubscription: subscription(OLD, { keys: false }) }, pushManager(), options),
    ).toBe("no_previous");
    expect(replace).not.toHaveBeenCalled();
  });

  it("says push is off, an incomplete subscription, or a failed request — never throws", async () => {
    const replace = vi.fn(async (_input: PushReplaceInput) => {});
    expect(
      await resubscribeAfterChange({ oldSubscription: subscription(OLD) }, pushManager(), {
        replace,
        pushKey: async () => "",
      }),
    ).toBe("push_off");
    expect(
      await resubscribeAfterChange(
        {
          oldSubscription: subscription(OLD),
          newSubscription: subscription("https://push.example/n", { keys: false }),
        },
        pushManager(),
        { replace, pushKey: vi.fn() },
      ),
    ).toBe("incomplete");
    expect(replace).not.toHaveBeenCalled();
    expect(
      await resubscribeAfterChange(
        { oldSubscription: subscription(OLD), newSubscription: subscription("https://push.example/n") },
        pushManager(),
        { replace: async () => Promise.reject(new Error("409")), pushKey: vi.fn() },
      ),
    ).toBe("failed");
  });
});

describe("handlePushSubscriptionChange", () => {
  it("re-registers inside waitUntil, then tells every open page and the app", async () => {
    let listener: ((event: PushSubscriptionChangeEventLike) => void) | undefined;
    const page = { postMessage: vi.fn() };
    const scope: PushWorkerScope = {
      addEventListener: (type, l) => {
        expect(type).toBe("pushsubscriptionchange");
        listener = l;
      },
      registration: { pushManager: pushManager() },
      clients: { matchAll: vi.fn(async () => [page]) },
    };
    const replace = vi.fn(async (_input: PushReplaceInput) => {});
    const onOutcome = vi.fn();
    handlePushSubscriptionChange(scope, { replace, pushKey: vi.fn(), onOutcome });

    let held: Promise<unknown> | undefined;
    listener!({
      oldSubscription: subscription(OLD),
      newSubscription: subscription("https://push.example/new"),
      waitUntil: (promise) => {
        held = promise;
      },
    });
    await expect(held).resolves.toBe("replaced");
    expect(replace).toHaveBeenCalledOnce();
    expect(onOutcome).toHaveBeenCalledWith("replaced");
    expect(page.postMessage).toHaveBeenCalledWith({ type: PUSH_SUBSCRIPTION_CHANGED, outcome: "replaced" });
  });
});

describe("@eifi1/ui-kit/push-worker (0.46, §10.6 rule 5)", () => {
  it("is the same handler the barrel exports, from an entry a worker can bundle", async () => {
    const entry = await import("../../push-worker");
    const barrel = await import("../../index");
    expect(Object.keys(entry).sort()).toEqual([
      "PUSH_SUBSCRIPTION_CHANGED",
      "handlePushSubscriptionChange",
      "pushSubscriptionInput",
      "resubscribeAfterChange",
    ]);
    expect(entry.handlePushSubscriptionChange).toBe(barrel.handlePushSubscriptionChange);
    expect(entry.resubscribeAfterChange).toBe(barrel.resubscribeAfterChange);
    expect(entry.PUSH_SUBSCRIPTION_CHANGED).toBe(barrel.PUSH_SUBSCRIPTION_CHANGED);
  });
});
