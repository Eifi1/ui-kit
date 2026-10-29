import { useCallback, useEffect, useRef, useState } from "react";

import { useMediaQuery } from "../hooks/use-media-query";
import { httpStatusOf } from "../auth/auth-errors";
import { PUSH_SUBSCRIPTION_CHANGED, keyBytes, pushSubscriptionInput as inputOf } from "./push-worker";
import type { PushSubscriptionInput } from "./push-worker";

export { PUSH_SUBSCRIPTION_CHANGED };
export type { PushSubscriptionInput };

/**
 * This browser's Web Push subscription for the signed-in account
 * (docs/notifications-harmonization.md §2.7, §3.5, §4.2) — keksdose's
 * `shared/push/use-push.ts`, lifted. The service worker with its `push` and
 * `notificationclick` handlers stays the app's; this hook owns the browser's side:
 * permission, subscribe with the server's VAPID key, register the subscription, and
 * unsubscribe. The kit makes no request of its own: the app hands it one function per
 * endpoint.
 */

/** The browser's notification permission, or `"unsupported"` where it has no push. */
export type PushPermission = NotificationPermission | "unsupported";

/** Why turning push on or off could not finish — a {@link PushDeviceError}'s `code`. */
export type PushDeviceErrorCode = "no_service_worker" | "push_timeout";

/**
 * The two failures the card has words of its own for: no service worker registered (or
 * one not ready in 10 s) — "reload and try again" — and a browser push service that did
 * not answer in 15 s — "check your connection". Anything else is the app's request
 * failing, rejected as it came.
 */
export class PushDeviceError extends Error {
  readonly code: PushDeviceErrorCode;
  constructor(code: PushDeviceErrorCode) {
    super(code);
    this.name = "PushDeviceError";
    this.code = code;
  }
}

export interface UsePushDeviceOptions {
  /** `GET /notifications/push-key` → its `key`; `""` when push is off on the server. */
  pushKey: () => Promise<string>;
  /** `POST /notifications/devices`. A 409 (another account's endpoint) is recovered
   *  once: the hook unsubscribes and registers a fresh endpoint. */
  register: (subscription: PushSubscriptionInput) => Promise<unknown>;
  /** `POST /notifications/devices/unregister {endpoint}` — the endpoint never goes in a
   *  URL. */
  unregister: (endpoint: string) => Promise<unknown>;
  /** `GET /notifications/devices`: the account's own list, which says whether THIS
   *  account holds this browser's subscription. */
  devices: () => Promise<readonly { endpoint: string }[]>;
  /** `POST /notifications/test` → how many devices the push service accepted it for. */
  test: () => Promise<{ sent: number }>;
  /** Whether `register` refused another account's endpoint. Default: HTTP 409. */
  isEndpointTaken?: (error: unknown) => boolean;
  /** After an enable or a disable: the app refreshes its device queries. */
  onChange?: () => void;
}

/** What {@link usePushDevice} answers. */
export interface PushDevice {
  /** The browser exposes service workers, `PushManager` and `Notification`. */
  supported: boolean;
  /** The server has VAPID keys; `undefined` until `pushKey` answered (or when it failed). */
  configured: boolean | undefined;
  /** Running as an installed app: `display-mode: standalone`, or iOS's
   *  `navigator.standalone`. */
  installed: boolean;
  /** iPhone or iPad — where push reaches only the installed app. */
  ios: boolean;
  permission: PushPermission;
  /** THIS account holds this browser's subscription. An unreachable device list falls
   *  back to the browser's own answer. */
  subscribed: boolean;
  /** This browser holds a subscription that belongs to another account (two accounts in
   *  one browser profile): `subscribed` is false, and turning on mints a fresh one. */
  foreignSubscription: boolean;
  /** This browser's subscription endpoint, or `null` — marks "This device" in a list. */
  currentEndpoint: string | null;
  /** An enable or a disable is running. */
  busy: boolean;
  /** Ask for permission (the browser's one prompt), subscribe and register. `false` when
   *  the permission was not granted or push is off on the server; rejects with a
   *  {@link PushDeviceError} or the app's request's error. */
  enable: () => Promise<boolean>;
  /** Tell the server first, then the browser, so a dropped device stops at once. */
  disable: () => Promise<void>;
  sendTest: () => Promise<{ sent: number }>;
}

/*
 * PUSH_SUBSCRIPTION_CHANGED (push-worker.ts): the window event every mounted
 * {@link usePushDevice} re-reads its state on. Fired by every enable and disable, and by
 * `PushDevicesSetting` when it removes this device — so an app's own card on the same
 * hook (keksdose's check-up) stays in step. The hook that fires it does not re-read: it
 * knows what it changed. Since 0.46 also the message a service worker posts after a
 * rotated subscription was re-registered (`handlePushSubscriptionChange`). Namespaced
 * for the kit; keksdose's was `"keksdose:push-subscription-changed"`.
 */

/** Tell every {@link usePushDevice} that this browser's subscription changed. */
export function notifyPushSubscriptionChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PUSH_SUBSCRIPTION_CHANGED));
}

/** Whether this browser has the APIs push needs. iOS exposes them only to an INSTALLED
 *  app (Add to Home Screen). */
export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** iPhone or iPad. iPadOS 13+ reports itself as a Mac; the touch points tell it apart. */
function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

const READY_TIMEOUT_MS = 10_000;
const PUSH_TIMEOUT_MS = 15_000;

/** `promise`, or a {@link PushDeviceError} after `ms`. The timer is cleared either way. */
function within<T>(promise: Promise<T>, ms: number, code: PushDeviceErrorCode): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new PushDeviceError(code)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * The active registration. `navigator.serviceWorker.ready` never settles while the origin
 * has no registration, so a missing one fails at once, and one stuck installing fails
 * after 10 s (keksdose: enable() hung with the button latched before its worker was
 * served).
 */
async function activeRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing) throw new PushDeviceError("no_service_worker");
  return within(navigator.serviceWorker.ready, READY_TIMEOUT_MS, "no_service_worker");
}

const defaultEndpointTaken = (error: unknown) => httpStatusOf(error) === 409;

/**
 * This browser's push for the signed-in account. Hand it one function per endpoint
 * (§3.8); {@link PushDeviceSetting} draws it, and an app's own card may use it too.
 *
 * **"Subscribed" means this account**, not "this browser holds a subscription": a
 * browser profile's subscription has no account in it, so a second account in the same
 * profile would read the first's as its own (keksdose). The endpoint is checked against
 * the account's own `devices()`; when that list cannot be read (offline), the browser's
 * answer stands — a wrong "on" costs what it did before the check, a wrong "off" invites
 * re-subscribing a device that is fine.
 *
 * **A 409 from `register`** — the endpoint belongs to another account, and the server
 * will not re-home what it cannot prove this browser holds — unsubscribes and registers
 * a fresh endpoint, once.
 *
 * **Timeouts:** no registration fails at once and a worker not ready in 10 s fails, both
 * `PushDeviceError("no_service_worker")`; the browser's subscribe and unsubscribe are cut
 * at 15 s, `PushDeviceError("push_timeout")` — so `busy` can never latch.
 *
 * Every mounted hook re-reads its state on {@link PUSH_SUBSCRIPTION_CHANGED}.
 */
export function usePushDevice(options: UsePushDeviceOptions): PushDevice {
  // The app's functions are usually new on every render; the effects read the latest.
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  const supported = pushSupported();
  const ios = isIos();
  const standalone = useMediaQuery("(display-mode: standalone)", false);
  const installed =
    standalone ||
    (typeof navigator !== "undefined" && (navigator as Navigator & { standalone?: boolean }).standalone === true);

  const [permission, setPermission] = useState<PushPermission>(() =>
    supported ? Notification.permission : "unsupported",
  );
  const [configured, setConfigured] = useState<boolean | undefined>(undefined);
  const [subscribed, setSubscribed] = useState(false);
  const [foreignSubscription, setForeignSubscription] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  // Set while this hook fires the event itself: it already knows what changed, and a
  // re-read could only be worse — an app whose `devices()` answers from a cache would
  // hand back the list from before the change.
  const announcing = useRef(false);
  const announce = useCallback(() => {
    announcing.current = true;
    try {
      notifyPushSubscriptionChanged();
    } finally {
      announcing.current = false;
    }
    latest.current.onChange?.();
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Whether the server has keys ("" → push is off there). Once per mount.
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    latest.current.pushKey().then(
      (key) => {
        if (!cancelled) setConfigured(key !== "");
      },
      () => {
        /* unknown: the card shows the ordinary states */
      },
    );
    return () => {
      cancelled = true;
    };
  }, [supported]);

  // What this browser holds, and whether it is this account's — at mount, and whenever
  // a subscription changes anywhere in the app.
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    const sync = async () => {
      try {
        const registration = await activeRegistration();
        const existing = await registration.pushManager.getSubscription();
        if (cancelled) return;
        // Read again: the person may have changed it in the browser's settings.
        setPermission(Notification.permission);
        if (!existing) {
          setSubscribed(false);
          setForeignSubscription(false);
          setCurrentEndpoint(null);
          return;
        }
        let mine: boolean;
        try {
          const devices = await latest.current.devices();
          mine = devices.some((device) => device.endpoint === existing.endpoint);
        } catch {
          mine = true;
        }
        if (cancelled) return;
        setCurrentEndpoint(existing.endpoint);
        setSubscribed(mine);
        setForeignSubscription(!mine);
      } catch {
        /* no active service worker yet: not subscribed */
      }
    };
    const heard = () => {
      if (!announcing.current) void sync();
    };
    // The worker's word after it re-registered a rotated subscription (0.46).
    const fromWorker = (event: MessageEvent) => {
      if ((event.data as { type?: unknown } | null)?.type === PUSH_SUBSCRIPTION_CHANGED) void sync();
    };
    const worker = navigator.serviceWorker as ServiceWorkerContainer | undefined;
    void sync();
    window.addEventListener(PUSH_SUBSCRIPTION_CHANGED, heard);
    worker?.addEventListener?.("message", fromWorker);
    return () => {
      cancelled = true;
      window.removeEventListener(PUSH_SUBSCRIPTION_CHANGED, heard);
      worker?.removeEventListener?.("message", fromWorker);
    };
  }, [supported]);

  const enable = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    const { pushKey, register, isEndpointTaken = defaultEndpointTaken } = latest.current;
    setBusy(true);
    try {
      const granted = await Notification.requestPermission();
      if (mounted.current) setPermission(granted);
      if (granted !== "granted") return false;

      const key = await pushKey();
      if (!key) {
        if (mounted.current) setConfigured(false);
        return false;
      }
      if (mounted.current) setConfigured(true);

      const registration = await activeRegistration();
      // The one place the browser is asked for a subscription, so the timeout and the
      // `{userVisibleOnly, applicationServerKey}` literal are on both paths.
      const subscribe = (reuse: boolean) =>
        within(
          (async () =>
            (reuse ? await registration.pushManager.getSubscription() : null) ??
            (await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: keyBytes(key),
            })))(),
          PUSH_TIMEOUT_MS,
          "push_timeout",
        );

      let subscription = await subscribe(true);
      let input = inputOf(subscription);
      if (!input) return false;
      try {
        await register(input);
      } catch (error) {
        if (!isEndpointTaken(error)) throw error;
        await within(subscription.unsubscribe(), PUSH_TIMEOUT_MS, "push_timeout");
        subscription = await subscribe(false);
        input = inputOf(subscription);
        if (!input) return false;
        await register(input);
      }
      if (mounted.current) {
        setSubscribed(true);
        setForeignSubscription(false);
        setCurrentEndpoint(input.endpoint);
      }
      announce();
      return true;
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [supported, announce]);

  const disable = useCallback(async (): Promise<void> => {
    if (!supported) return;
    setBusy(true);
    try {
      const registration = await activeRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // The server first: a dropped device stops receiving even if the browser's
        // unsubscribe below fails.
        await latest.current.unregister(subscription.endpoint);
        await within(subscription.unsubscribe(), PUSH_TIMEOUT_MS, "push_timeout");
      }
      if (mounted.current) {
        setSubscribed(false);
        setForeignSubscription(false);
        setCurrentEndpoint(null);
      }
      announce();
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [supported, announce]);

  const sendTest = useCallback(() => latest.current.test(), []);

  return {
    supported,
    configured,
    installed,
    ios,
    permission,
    subscribed,
    foreignSubscription,
    currentEndpoint,
    busy,
    enable,
    disable,
    sendTest,
  };
}
