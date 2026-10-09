import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useSyncExternalStore } from "react";

import { toDate } from "../lib/format";
import type { DateInput } from "../lib/format";
import { readStored, writeStored } from "../lib/safe-storage";
import type { BillingStanding } from "./billing-standing";

/**
 * "Payment processing" after the way back from a checkout (docs/billing-harmonization.md
 * §12.21, §14.4; keksdose's `features/billing/checkout-return.ts`, made router-agnostic).
 *
 * The provider tells the app about a payment by WEBHOOK, and the webhook may land after
 * the buyer is back: Cloud Run scales to zero, and a cold start can outlast the
 * provider's redirect. Without this, someone who has just paid comes back to a page that
 * still says their trial has ended. So the return is recognised (`?checkout=done`,
 * `isCheckoutReturn`), the page says "your payment is being processed"
 * (`BillingBanner kind="processing"`), and the overview is asked again every few seconds
 * until it has moved.
 *
 * **"Landed" is judged against the overview at departure** ({@link checkoutFingerprint},
 * noted by {@link noteCheckoutStarted}), not by "is it `active` yet": a trial and a beta
 * grant can both buy, and a running free grant keeps its status whatever the provider
 * says (§12.11) — only its period end moves — so "active" alone would wait for ever on
 * one of them. A return with no departure on record (another tab, another device) waits
 * for `active`. kastlan's 60-second poll for `source === "provider"` is the case this
 * replaces: a payer who bought under a grant never matched it.
 *
 * **Bounded:** after `timeoutMs` (10 minutes) the device stops asking, and the page says
 * what the overview says, whatever that is — a checkout abandoned at the provider must
 * not leave "processing" up for good.
 *
 * **Remembered across the whole-page return, per payer.** The departure goes into the
 * browser's storage through the kit's safe storage (a throwing storage — Safari's
 * private mode — keeps it in memory for this page instead), under `storageKey`; a mark
 * names its payer, so it never speaks for another account on a shared device. It is a
 * browser entry on the app's origin: an app whose privacy text lists its entries names
 * it (Kurvenschmiede passes its own key).
 */

/** The overview fields a completed checkout changes (wire names, `GET /billing/overview`).
 *  Pass the overview as it came; the other fields are ignored. */
export type CheckoutOverview = Pick<BillingStanding, "status" | "in_good_standing"> & {
  plan: string;
  source: string;
  current_period_end?: DateInput;
};

/** How long a return keeps the page in "processing" before it trusts the overview. */
const PROCESSING_FOR = 10 * 60_000;
/** How often the overview is asked meanwhile. */
const POLL_EVERY = 4_000;
/** The browser entry, unless the app names its own. */
const STORAGE_KEY = "eifi1-billing-checkout";

/**
 * What of the overview a completed checkout changes, as one string: the plan (read
 * without case, §12.16), the status, the source, the standing and the period's end (read
 * as an instant, so `…Z` and `…+00:00` agree).
 */
export function checkoutFingerprint(o: CheckoutOverview): string {
  const end = toDate(o.current_period_end ?? null);
  return [
    String(o.plan ?? "").toLowerCase(),
    o.status,
    o.source,
    String(o.in_good_standing),
    end ? end.toISOString() : "",
  ].join("|");
}

/**
 * Whether the overview `now` shows the checkout: it differs from the fingerprint taken
 * at departure (`before`), or — with no departure on record — it is `active`.
 */
export function checkoutLanded(before: string | null, now: CheckoutOverview): boolean {
  return before === null ? now.status === "active" : checkoutFingerprint(now) !== before;
}

/* ── The store: one per storage key, shared by every mounted instance ─────── */

interface PendingCheckout {
  /** Whose checkout: a user's or a company's id, as a string. */
  payer: string;
  /** The overview's fingerprint at departure, or null when it was not known. */
  before: string | null;
  /** When the buyer came back; null while they are (or were) at the provider. */
  returnedAt: number | null;
}

/** One mounted hook: what the shared timers call, kept current on every render. */
interface Instance {
  payer: string | null;
  refetch: () => unknown;
  onLanded: (() => void) | undefined;
  timeoutMs: number;
  pollMs: number;
}

interface CheckoutStore {
  key: string;
  pending: PendingCheckout | null;
  listeners: Set<() => void>;
  /** The mounted instances, in mount order: the last is the latest. */
  instances: Instance[];
  poll: ReturnType<typeof setInterval> | null;
  pollEvery: number;
  expiry: ReturnType<typeof setTimeout> | null;
  expiryAt: number | null;
  /** An instance consumed the marker in this commit; the others leave it be. */
  consuming: boolean;
}

/** Module-level, so the banner's instance and the subscription page's share one state,
 *  one poll and one landing (keksdose mounts the hook twice, §14.4). */
const stores = new Map<string, CheckoutStore>();

function readPending(key: string): PendingCheckout | null {
  const raw = readStored(key);
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingCheckout> | null;
    if (
      value &&
      typeof value.payer === "string" &&
      (value.before === null || typeof value.before === "string") &&
      (value.returnedAt === null || typeof value.returnedAt === "number")
    ) {
      return { payer: value.payer, before: value.before, returnedAt: value.returnedAt };
    }
  } catch {
    // Not ours, or damaged: as if nothing was noted.
  }
  return null;
}

/** Drop the browser entry. lib/safe-storage reads and writes; removing needs the same
 *  guard (a blocked storage throws on access). */
function forget(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore (private mode, partitioned storage)
  }
}

function storeOf(key: string): CheckoutStore {
  let store = stores.get(key);
  if (!store) {
    store = {
      key,
      pending: readPending(key),
      listeners: new Set(),
      instances: [],
      poll: null,
      pollEvery: 0,
      expiry: null,
      expiryAt: null,
      consuming: false,
    };
    stores.set(key, store);
  }
  return store;
}

function setPending(store: CheckoutStore, next: PendingCheckout | null): void {
  store.pending = next;
  if (next) writeStored(store.key, JSON.stringify(next));
  else forget(store.key);
  for (const listener of store.listeners) listener();
  sync(store);
}

/** The latest mounted instance's refetch, failures swallowed: a poll that fails is
 *  simply asked again at the next tick. */
function refetchLatest(store: CheckoutStore): void {
  const latest = store.instances.at(-1);
  if (!latest) return;
  try {
    const result = latest.refetch() as PromiseLike<unknown> | undefined;
    if (result && typeof result.then === "function") result.then(undefined, () => {});
  } catch {
    // as above
  }
}

/** Arms or stops the store's two timers — the bound and the poll — for its state. */
function sync(store: CheckoutStore): void {
  const pending = store.pending;
  const latest = store.instances.at(-1);
  const returnedAt = pending?.returnedAt ?? null;

  if (returnedAt === null) {
    if (store.expiry) clearTimeout(store.expiry);
    store.expiry = null;
    store.expiryAt = null;
  } else {
    const at = returnedAt + (latest?.timeoutMs ?? PROCESSING_FOR);
    if (at <= Date.now()) {
      setPending(store, null);
      return;
    }
    if (store.expiryAt !== at) {
      if (store.expiry) clearTimeout(store.expiry);
      store.expiryAt = at;
      store.expiry = setTimeout(() => {
        store.expiry = null;
        store.expiryAt = null;
        if (store.pending === pending) setPending(store, null);
      }, at - Date.now());
    }
  }

  // One poll for every instance, while a mounted one is the mark's payer.
  const watching = returnedAt !== null && store.instances.some((i) => i.payer === pending!.payer);
  const every = latest?.pollMs ?? POLL_EVERY;
  if (!watching) {
    if (store.poll) clearInterval(store.poll);
    store.poll = null;
  } else if (!store.poll || store.pollEvery !== every) {
    if (store.poll) clearInterval(store.poll);
    store.pollEvery = every;
    store.poll = setInterval(() => refetchLatest(store), every);
  }
}

/** A mounted instance joins the store's timers; the latest is the one they call. */
function register(store: CheckoutStore, instance: Instance): () => void {
  store.instances.push(instance);
  return () => {
    store.instances = store.instances.filter((i) => i !== instance);
    sync(store);
  };
}

/**
 * Whether this instance is the one to consume a return marker: the first in a commit is.
 * Another instance in the same commit sees the same marker and leaves it be; the claim
 * lapses once the commit's effects have run.
 */
function claimReturn(store: CheckoutStore): boolean {
  if (store.consuming) return false;
  store.consuming = true;
  void Promise.resolve().then(() => {
    store.consuming = false;
  });
  return true;
}

/**
 * Note the departure for a checkout — just before the page leaves for the provider (or
 * for the pay page, `payPageUrl(url, locale)`):
 *
 *     noteCheckoutStarted(user.id, overview.data);
 *     window.location.assign(payPageUrl(url, i18n.language));
 *
 * `payer` is the user's or the company's id: a mark never speaks for another payer.
 * `overview` is what the page shows now; left out, the return waits for `active`. Pass
 * the same `storageKey` as the hook's.
 */
export function noteCheckoutStarted(
  payer: string | number,
  overview?: CheckoutOverview,
  opts: { storageKey?: string } = {},
): void {
  const store = storeOf(opts.storageKey ?? STORAGE_KEY);
  setPending(store, {
    payer: String(payer),
    before: overview ? checkoutFingerprint(overview) : null,
    returnedAt: null,
  });
}

export interface CheckoutProcessingOptions {
  /** The signed-in payer — the user's or the company's id; null while unknown (the
   *  marker then waits in the URL). */
  payer: string | number | null;
  /** The page was reached as the way back: `isCheckoutReturn(location.search)`. */
  returned: boolean;
  /** Drop the marker, with replace — `setSearchParams((p) => withoutCheckoutReturn(p),
   *  { replace: true })`. Called once per return, by the first instance that sees it. */
  onConsumed: () => void;
  /** The overview query's data, judged here against the departure. */
  overview: CheckoutOverview | undefined;
  /** The overview query's refetch: the hook polls with it — one timer for every
   *  instance, with the latest mounted one's — and "Check again" calls it. */
  refetch: () => unknown;
  /** Once per landing: refresh what a new standing changes — the plans, the items whose
   *  `locked` may have lifted. The overview itself is already fresh. */
  onLanded?: () => void;
  /** How long a return keeps "processing". Default 600 000 (10 minutes). */
  timeoutMs?: number;
  /** How often the overview is asked meanwhile. Default 4 000. */
  pollMs?: number;
  /** The browser entry. Default `"eifi1-billing-checkout"`. */
  storageKey?: string;
}

/**
 * Whether this payer is back from a checkout whose payment the overview has not shown
 * yet — and the "Check again" for the banner that says so:
 *
 *     const [params, setParams] = useSearchParams();
 *     const overview = useQuery(billingOverviewQuery);
 *     const { processing, checkAgain } = useCheckoutProcessing({
 *       payer: user?.id ?? null,
 *       returned: isCheckoutReturn(params),
 *       onConsumed: () => setParams((p) => withoutCheckoutReturn(p), { replace: true }),
 *       overview: overview.data,
 *       refetch: overview.refetch,
 *       onLanded: () => void qc.invalidateQueries({ queryKey: ["budgets"] }),
 *     });
 *     processing && <BillingBanner kind="processing" onAction={checkAgain} />
 *
 * The kit has no router: the app says whether the URL returned and how to drop the
 * marker. Mount it wherever the return lands and the banner shows — every instance with
 * the same `storageKey` shares one state: the first that sees the marker consumes it,
 * one timer polls, and `onLanded` runs once. The app's `refetchOnWindowFocus` doesn't
 * matter.
 */
export function useCheckoutProcessing(options: CheckoutProcessingOptions): {
  processing: boolean;
  checkAgain: () => void;
} {
  const {
    payer,
    returned,
    onConsumed,
    overview,
    refetch,
    onLanded,
    timeoutMs = PROCESSING_FOR,
    pollMs = POLL_EVERY,
    storageKey = STORAGE_KEY,
  } = options;
  const payerKey = payer === null || payer === undefined ? null : String(payer);
  const store = storeOf(storageKey);
  const subscribe = useCallback(
    (notify: () => void) => {
      store.listeners.add(notify);
      return () => {
        store.listeners.delete(notify);
      };
    },
    [store],
  );
  const snapshot = () => store.pending;
  const pending = useSyncExternalStore(subscribe, snapshot, snapshot);
  const processing = payerKey !== null && pending?.payer === payerKey && pending.returnedAt !== null;

  // This instance, as the shared timers see it. Registered before paint, so a mark that
  // ran out while the page was closed is dropped before "processing" can flash.
  const instanceRef = useRef<Instance>({ payer: payerKey, refetch, onLanded, timeoutMs, pollMs });
  useLayoutEffect(() => register(store, instanceRef.current), [store]);
  useLayoutEffect(() => {
    Object.assign(instanceRef.current, { payer: payerKey, refetch, onLanded, timeoutMs, pollMs });
    sync(store);
  });

  // The return: note it, then drop the marker so a reload does not count it twice.
  const consumed = useEffectEvent(() => onConsumed());
  useEffect(() => {
    if (!returned || payerKey === null || !claimReturn(store)) return;
    const before = store.pending?.payer === payerKey ? store.pending.before : null;
    setPending(store, { payer: payerKey, before, returnedAt: Date.now() });
    consumed();
  }, [returned, payerKey, store]);

  // Caught up: the overview has moved since the departure. Judged against the store as
  // it is NOW, so a second instance in the same commit finds the mark gone.
  useEffect(() => {
    if (!processing || !overview) return;
    const live = store.pending;
    if (!live || live.payer !== payerKey || live.returnedAt === null) return;
    if (!checkoutLanded(live.before, overview)) return;
    setPending(store, null);
    const latest = [...store.instances].reverse().find((i) => i.onLanded);
    latest?.onLanded?.();
  }, [processing, overview, payerKey, store]);

  const checkAgain = useCallback(() => {
    try {
      const result = instanceRef.current.refetch() as PromiseLike<unknown> | undefined;
      if (result && typeof result.then === "function") result.then(undefined, () => {});
    } catch {
      // The banner stays; the next poll asks again.
    }
  }, []);

  return { processing, checkAgain };
}
