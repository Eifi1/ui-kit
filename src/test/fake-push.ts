import { vi } from "vitest";
import type { Mock } from "vitest";

/**
 * A browser with Web Push, for the push tests: a service worker registration whose
 * `pushManager` hands out fake subscriptions, `Notification` with its permission, and
 * `PushManager` so `pushSupported()` answers yes. jsdom has none of them.
 */

export interface FakeSubscription {
  endpoint: string;
  toJSON: () => PushSubscriptionJSON;
  unsubscribe: Mock<() => Promise<boolean>>;
}

export interface FakePushOptions {
  /** No registration at all (`getRegistration()` answers undefined). */
  noRegistration?: boolean;
  /** `serviceWorker.ready` never settles (a worker stuck installing). */
  neverReady?: boolean;
  /** `pushManager.subscribe()` never settles (an unreachable push service). */
  subscribeHangs?: boolean;
  /** The subscription this browser holds at the start. */
  existing?: string | null;
  permission?: NotificationPermission;
  /** What the permission prompt answers. */
  prompt?: NotificationPermission;
  /** The browser hands back a subscription without its keys. */
  incomplete?: boolean;
}

let counter = 0;

export function fakeSubscription(endpoint: string, incomplete = false): FakeSubscription {
  const subscription: FakeSubscription = {
    endpoint,
    toJSON: () => (incomplete ? { endpoint } : { endpoint, keys: { p256dh: "p256dh-key", auth: "auth-key" } }),
    unsubscribe: vi.fn(async () => {
      if (state.current === subscription) state.current = null;
      return true;
    }),
  };
  return subscription;
}

const state: { current: FakeSubscription | null } = { current: null };

/** Install the fake on `window` / `navigator`; returns its handles and an uninstall. */
export function installFakePush(options: FakePushOptions = {}) {
  state.current = options.existing ? fakeSubscription(options.existing) : null;
  const subscribe = vi.fn(
    (init: PushSubscriptionOptionsInit) =>
      new Promise<FakeSubscription>((resolve) => {
        if (options.subscribeHangs) return;
        void init;
        counter += 1;
        state.current = fakeSubscription(`https://push.example/fresh-${counter}`, options.incomplete);
        resolve(state.current);
      }),
  );
  const registration = {
    active: {},
    pushManager: {
      getSubscription: vi.fn(async () => state.current),
      subscribe,
    },
  };
  const serviceWorker = {
    getRegistration: vi.fn(async () => (options.noRegistration ? undefined : registration)),
    ready: options.neverReady ? new Promise(() => {}) : Promise.resolve(registration),
  };
  const requestPermission = vi.fn(async () => {
    notification.permission = options.prompt ?? "granted";
    return notification.permission;
  });
  const notification = { permission: options.permission ?? "default", requestPermission };

  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: serviceWorker });
  Object.defineProperty(window, "PushManager", { configurable: true, value: function PushManager() {} });
  Object.defineProperty(window, "Notification", { configurable: true, value: notification });

  return {
    registration,
    subscribe,
    requestPermission,
    notification,
    /** The subscription the browser holds now. */
    current: () => state.current,
    uninstall: () => {
      delete (navigator as unknown as Record<string, unknown>).serviceWorker;
      delete (window as unknown as Record<string, unknown>).PushManager;
      delete (window as unknown as Record<string, unknown>).Notification;
      state.current = null;
    },
  };
}

/** An axios-shaped refusal. */
export const refusal = (status: number, code?: string) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { detail: code ?? "refused", ...(code && { code }) } },
  });
