/**
 * The service worker's half of Web Push that the kit can own (0.46,
 * docs/notifications-harmonization.md NT:1028): re-registering a subscription the
 * browser ROTATED. A push service may replace a subscription (expiry, a key rotation, a
 * browser update) and fires `pushsubscriptionchange` in the worker; until 0.46 the
 * server kept sending to the old endpoint, got 410, deleted the device, and the person
 * had to turn push on again without knowing why.
 *
 * {@link handlePushSubscriptionChange} listens for the event in the app's worker and
 * calls the app's `replace` — `POST /notifications/devices/replace` (server-kit
 * `PushReplaceIn`): the OLD endpoint and the old subscription's `auth` secret, which only
 * this browser and the server hold, prove the device without a session (a worker has no
 * `Authorization` header to send), and the server moves that row to the new endpoint in
 * place — same account, same device. Open pages are told with a
 * {@link PUSH_SUBSCRIPTION_CHANGED} message, and every mounted `usePushDevice` re-reads.
 *
 * Dependency-free (no React), so an app's worker bundle takes only this file — through
 * the worker-safe subpath `@eifi1/ui-kit/push-worker` (0.46, §10.6 rule 5), not the main
 * barrel, which reaches React and the components:
 *
 *     // sw.ts
 *     import { handlePushSubscriptionChange } from "@eifi1/ui-kit/push-worker";
 *     handlePushSubscriptionChange(self, {
 *       pushKey: () => fetch("/api/notifications/push-key").then((r) => r.json()).then((b) => b.key),
 *       replace: (body) => fetch("/api/notifications/devices/replace", {
 *         method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
 *       }).then((r) => { if (!r.ok) throw new Error(String(r.status)); }),
 *     });
 */

/** What `register` sends: `POST /notifications/devices` (§3.5). */
export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  user_agent: string | null;
}

/** What `replace` sends: `POST /notifications/devices/replace` (server-kit
 *  `PushReplaceIn`). The endpoint never goes in a URL. */
export interface PushReplaceInput {
  /** The rotated-away subscription's endpoint. */
  old_endpoint: string;
  /** Its `keys.auth` as registered — the proof that this browser held it. */
  old_auth: string;
  /** The browser's new subscription. */
  subscription: PushSubscriptionInput;
}

/** The message a worker posts to its pages after a rotation, and the window event the
 *  hooks re-read on — the same name. */
export const PUSH_SUBSCRIPTION_CHANGED = "eifi1:push-subscription-changed";

/** A VAPID public key (base64url) as the bytes `PushManager.subscribe` wants. */
export function keyBytes(key: string): Uint8Array<ArrayBuffer> {
  const base64 = key.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (key.length % 4)) % 4);
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** A subscription's register body, or `null` when the browser handed back an incomplete
 *  one. */
export function pushSubscriptionInput(subscription: PushSubscription): PushSubscriptionInput | null {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) return null;
  return {
    endpoint: json.endpoint,
    keys: { p256dh, auth },
    user_agent: (typeof navigator !== "undefined" && navigator.userAgent) || null,
  };
}

/** The `pushsubscriptionchange` event as the worker receives it (not in TypeScript's
 *  DOM lib). Either subscription may be missing: Chrome often hands neither. */
export interface PushSubscriptionChangeEventLike {
  readonly oldSubscription?: PushSubscription | null;
  readonly newSubscription?: PushSubscription | null;
  waitUntil?: (promise: Promise<unknown>) => void;
}

export interface PushSubscriptionChangeOptions {
  /** `GET /notifications/push-key` → its `key` — asked only when the browser handed no
   *  new subscription and the old one does not carry its key. `""`: push is off. */
  pushKey: () => Promise<string>;
  /** `POST /notifications/devices/replace`. A rejection is the outcome `"failed"`. */
  replace: (input: PushReplaceInput) => Promise<unknown>;
}

/**
 * What a rotation came to: `"replaced"` — the server moved the device; `"no_previous"` —
 * the browser named no old subscription (or one without its keys), so there is nothing
 * to prove the device with and the page shows push as off; `"push_off"` — the server has
 * no key; `"incomplete"` — the new subscription has no keys; `"failed"` — `replace` (or
 * the browser's subscribe) threw.
 */
export type PushResubscribeOutcome = "replaced" | "no_previous" | "push_off" | "incomplete" | "failed";

/**
 * Re-register after `pushsubscriptionchange`: the browser's new subscription — or, when
 * it handed none, the one it holds now, or a fresh one under the old subscription's key
 * (else `pushKey()`) — sent to `replace` with the old endpoint and its `auth`.
 */
export async function resubscribeAfterChange(
  event: PushSubscriptionChangeEventLike,
  pushManager: PushManager,
  options: PushSubscriptionChangeOptions,
): Promise<PushResubscribeOutcome> {
  const old = event.oldSubscription;
  const oldAuth = old?.toJSON().keys?.auth;
  if (!old?.endpoint || !oldAuth) return "no_previous";
  try {
    let next = event.newSubscription ?? (await pushManager.getSubscription());
    if (!next || next.endpoint === old.endpoint) {
      const kept = old.options?.applicationServerKey;
      const key = kept ? null : await options.pushKey();
      if (key === "") return "push_off";
      next = await pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: kept ?? keyBytes(key ?? ""),
      });
    }
    const subscription = pushSubscriptionInput(next);
    if (!subscription) return "incomplete";
    await options.replace({ old_endpoint: old.endpoint, old_auth: oldAuth, subscription });
    return "replaced";
  } catch {
    return "failed";
  }
}

/** The parts of a `ServiceWorkerGlobalScope` this needs. */
export interface PushWorkerScope {
  addEventListener: (type: "pushsubscriptionchange", listener: (event: PushSubscriptionChangeEventLike) => void) => void;
  registration: { pushManager: PushManager };
  clients?: { matchAll: (options?: { type?: "window"; includeUncontrolled?: boolean }) => Promise<readonly { postMessage: (message: unknown) => void }[]> };
}

/**
 * Listen for `pushsubscriptionchange` in the app's service worker (`self`) and
 * re-register through {@link resubscribeAfterChange}, holding the worker alive until it
 * is done (`waitUntil`). Then every open page gets `{ type: PUSH_SUBSCRIPTION_CHANGED,
 * outcome }`; `usePushDevice` re-reads on it. `onOutcome` is for the app's own logging.
 */
export function handlePushSubscriptionChange(
  scope: PushWorkerScope,
  options: PushSubscriptionChangeOptions & { onOutcome?: (outcome: PushResubscribeOutcome) => void },
): void {
  scope.addEventListener("pushsubscriptionchange", (event) => {
    const done = resubscribeAfterChange(event, scope.registration.pushManager, options).then(async (outcome) => {
      options.onOutcome?.(outcome);
      const pages = (await scope.clients?.matchAll({ type: "window", includeUncontrolled: true })) ?? [];
      for (const page of pages) page.postMessage({ type: PUSH_SUBSCRIPTION_CHANGED, outcome });
      return outcome;
    });
    event.waitUntil?.(done);
  });
}
