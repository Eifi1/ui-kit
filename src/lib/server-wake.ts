/**
 * "Is the server asleep, or is the app broken?" — the cold-start watchdog, lifted
 * from keksdose (feedback #199) so kastlan and Kurvenschmiede get it too.
 *
 * All three backends run on Cloud Run with `--min-instances=0`: after an idle
 * period the container is gone and the first request has to start it, which takes
 * several seconds and occasionally more. Nothing in the UI said so, and none of the
 * axios instances has a timeout, so the honest experience was a spinner that looked
 * stuck. This counts the in-flight requests a cold start would actually delay and
 * escalates in two steps, so a merely slow response says "still loading" and only a
 * genuinely long wait blames the sleeping server.
 *
 * Framework-free on purpose (no zustand, no axios, no React): a counter, two timers
 * and a listener set, read by `useServerWakeStage` through `useSyncExternalStore`.
 * The adapters below take the app's axios instance / fetch as an ARGUMENT, so the
 * kit never imports either.
 *
 * WHAT ARMS IT, and why the default is narrow:
 *   - reads (GET) — what every page does on open — always;
 *   - writes only when the app says so (`watchReadsAnd(/\/auth\/login\b/)`): the
 *     auth POSTs that gate the app are the only writes a user waits on before the
 *     app exists at all, so a cold start there looks exactly like a broken login.
 * An UPLOAD must never be watched — a statement PDF or a photo takes seconds on a
 * perfectly warm server, and "the server is waking up" during a 4 s upload would
 * simply be false. With the default that holds by itself (an upload is a POST);
 * an app widening `shouldWatch` keeps its upload routes out of it.
 *
 * Nor a DOWNLOAD, for the same reason (kastlan 0.18): axios answers only once the
 * whole body is in, so a generated PDF or a large photo — a GET — ran past both
 * thresholds on a warm server, and held the count for every read beside it. The
 * default filter skips a request whose `responseType` is `"blob"`, `"arraybuffer"` or
 * `"stream"`; a custom filter gets the request as its third argument to do the same.
 * (`wrapFetch` ends the wait at the headers, so a download through it is harmless.)
 *
 * It never arms while the browser is offline, whatever `shouldWatch` says: that state
 * has its own, truthful indicator, and a request that never left the device is not
 * evidence of anything about the server.
 */

/** `slow` = longer than a warm server ever takes; `waking` = long enough that a cold
 *  start is the only sensible explanation. */
export type ServerWakeStage = "idle" | "slow" | "waking";

/** Decides which requests count. `method` arrives lower-cased (`"get"` when the
 *  request named none — axios's and fetch's default); `url` as the client had it;
 *  `request` is what the adapter saw — for axios the request config itself, so
 *  `responseType` or the app's own fields can decide. */
export type ServerWakeFilter = (method: string, url: string, request: ServerWakeRequest) => boolean;

export interface ServerWakeOptions {
  /** Past this, a warm round trip is out of the question (a cold database query on a
   *  free tier can still take a second, so it is not tighter). Default 2000 ms. */
  slowMs?: number;
  /** Past this, the container was almost certainly scaled to zero. Default 7000 ms. */
  wakingMs?: number;
  /** Which requests count. Default {@link watchReadsAnd}`()` — GETs only, downloads
   *  excluded. The offline guard runs before it and cannot be overridden. */
  shouldWatch?: ServerWakeFilter;
}

/** What a request is, for {@link ServerWakeWatcher.track} and a {@link ServerWakeFilter}. */
export interface ServerWakeRequest {
  method?: string;
  url?: string;
  /** axios's `responseType`. `"blob"`, `"arraybuffer"` and `"stream"` mark a download,
   *  which the default filter does not count. */
  responseType?: string;
}

export interface ServerWakeWatcher {
  /**
   * Count a request that is going out, and arm the escalation if it is the first.
   * Returns whether it was counted — the caller MUST call {@link end} exactly once
   * for every `true`, or the counter never returns to zero and the notice sticks.
   * (The axios adapter stashes it on the request config for that reason.)
   * `request` reaches the filter as its third argument; default `{ method, url }`.
   */
  start(method?: string, url?: string, request?: ServerWakeRequest): boolean;
  /** A counted request settled — either way: an error still proves the server
   *  answered or gave up. When the last one does, the notice goes away. Never takes
   *  the counter below zero. */
  end(): void;
  /** `start` + `end` around a promise (or a function returning one), for a request
   *  that does not go through an adapter. Resolves and rejects as the work does. */
  track<T>(work: PromiseLike<T> | (() => PromiseLike<T>), request?: ServerWakeRequest): Promise<T>;
  /** Back to a pristine watchdog — for tests, which share an instance across cases. */
  reset(): void;
  /** `useSyncExternalStore`'s pair. Listeners hear stage changes only. */
  subscribe(listener: () => void): () => void;
  getStage(): ServerWakeStage;
  /** Counted requests currently outstanding. */
  getInFlight(): number;
}

/** Response types that make a request a download — see the module comment. */
const DOWNLOAD_RESPONSE_TYPES = new Set(["blob", "arraybuffer", "stream"]);

/**
 * The usual filter: every GET, plus any other request whose URL matches `writes` —
 * keksdose's `/\/auth\/(login|register|demo-session)\b/` — but never a download
 * (`responseType` `"blob"`, `"arraybuffer"` or `"stream"`). Keep upload routes out of
 * the pattern (see the module comment).
 */
export function watchReadsAnd(writes?: RegExp): ServerWakeFilter {
  return (method, url, request) =>
    !DOWNLOAD_RESPONSE_TYPES.has(request?.responseType ?? "") &&
    (method === "get" || (writes !== undefined && writes.test(url)));
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function createServerWake({
  slowMs = 2000,
  wakingMs = 7000,
  shouldWatch = watchReadsAnd(),
}: ServerWakeOptions = {}): ServerWakeWatcher {
  let inFlight = 0;
  let stage: ServerWakeStage = "idle";
  let slowTimer: ReturnType<typeof setTimeout> | null = null;
  let wakingTimer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();

  const setStage = (next: ServerWakeStage) => {
    if (next === stage) return;
    stage = next;
    for (const listener of listeners) listener();
  };

  const clearTimers = () => {
    if (slowTimer !== null) clearTimeout(slowTimer);
    if (wakingTimer !== null) clearTimeout(wakingTimer);
    slowTimer = null;
    wakingTimer = null;
  };

  const start = (method?: string, url?: string, request: ServerWakeRequest = { method, url }): boolean => {
    if (isOffline()) return false;
    if (!shouldWatch((method ?? "get").toLowerCase(), url ?? "", request)) return false;
    inFlight += 1;
    // The clock runs from the FIRST outstanding request: a page firing a second read
    // at 1.9 s is still waiting on the same sleeping server, not starting afresh.
    if (inFlight === 1) {
      clearTimers();
      slowTimer = setTimeout(() => setStage("slow"), slowMs);
      wakingTimer = setTimeout(() => setStage("waking"), wakingMs);
    }
    return true;
  };

  const end = () => {
    inFlight = Math.max(0, inFlight - 1);
    if (inFlight > 0) return;
    clearTimers();
    setStage("idle");
  };

  return {
    start,
    end,
    track<T>(work: PromiseLike<T> | (() => PromiseLike<T>), request: ServerWakeRequest = {}) {
      const counted = start(request.method, request.url, request);
      let promise: Promise<T>;
      try {
        promise = Promise.resolve(typeof work === "function" ? work() : work);
      } catch (error) {
        // A thunk that throws before it returns a promise settled too.
        promise = Promise.reject(error);
      }
      return counted ? promise.finally(end) : promise;
    },
    reset() {
      inFlight = 0;
      clearTimers();
      setStage("idle");
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getStage: () => stage,
    getInFlight: () => inFlight,
  };
}

/**
 * The shared instance: what `<ServerWakeNotice />`, `useServerWakeStage()`,
 * {@link attachServerWake} and {@link wrapFetch} use when no watcher is passed. GETs
 * only, default timings — an app that also watches its login POST creates its own
 * with {@link createServerWake} and passes it to both ends.
 */
export const serverWake: ServerWakeWatcher = createServerWake();

// ── axios ─────────────────────────────────────────────────────────────────────

/** The config fields the watchdog reads — what axios's request config has. The whole
 *  config reaches the filter, so an app's filter can read the rest of it. */
export interface ServerWakeAxiosConfig {
  method?: string;
  url?: string;
  responseType?: string;
}

/** The slice of an interceptor manager the adapter uses. A method (not a function
 *  property) so axios's wider `use(onFulfilled?, onRejected?, options?)` fits it. */
interface InterceptorManagerLike<V> {
  use(onFulfilled: (value: V) => V | Promise<V>, onRejected: (error: unknown) => unknown): number;
  eject(id: number): void;
}

/** An axios instance, structurally — so the kit types the adapter without importing
 *  axios. `axios.create()`'s result fits it as is. */
export interface AxiosLikeInstance<C extends ServerWakeAxiosConfig, R extends { config: C }> {
  interceptors: {
    request: InterceptorManagerLike<C>;
    response: InterceptorManagerLike<R>;
  };
}

/** Whether the watchdog counted this request — the response side owes a matching
 *  `end()` only then. On the config, as keksdose's `_wake` was: it travels with the
 *  request onto the response and onto an error. Cleared once settled, so a 401 replay
 *  of the same config re-enters the request interceptor and is counted afresh — the
 *  pairing stays balanced. */
const COUNTED = "_serverWake";
type Marked = { [COUNTED]?: boolean };

/**
 * Drive a watcher from an axios instance's interceptors: `attachServerWake(api)`.
 * Returns a function that ejects both interceptors again.
 *
 * Attach it BEFORE the app's own response interceptors: axios runs those in the order
 * they were added, so the wake one ends the wait before a 401 handler awaits a token
 * refresh — otherwise the notice would keep counting a request that has already been
 * answered. (Request-side order does not matter.)
 */
export function attachServerWake<C extends ServerWakeAxiosConfig, R extends { config: C }>(
  instance: AxiosLikeInstance<C, R>,
  watcher: ServerWakeWatcher = serverWake,
): () => void {
  const settle = (config: unknown) => {
    const marked = config as Marked | undefined;
    if (marked?.[COUNTED]) {
      marked[COUNTED] = false;
      watcher.end();
    }
  };
  const request = instance.interceptors.request.use(
    (config) => {
      (config as C & Marked)[COUNTED] = watcher.start(config.method, config.url, config);
      return config;
    },
    (error) => Promise.reject(error),
  );
  const response = instance.interceptors.response.use(
    (res) => {
      settle(res.config);
      return res;
    },
    (error) => {
      settle((error as { config?: unknown } | null)?.config);
      return Promise.reject(error);
    },
  );
  return () => {
    instance.interceptors.request.eject(request);
    instance.interceptors.response.eject(response);
  };
}

// ── fetch ─────────────────────────────────────────────────────────────────────

/**
 * A `fetch` that drives a watcher: `const apiFetch = wrapFetch(fetch)`. The wait ends
 * when the response's HEADERS arrive (or the call fails) — the server is awake by then,
 * however long the body takes.
 */
export function wrapFetch(
  fetchImpl: typeof fetch = globalThis.fetch,
  watcher: ServerWakeWatcher = serverWake,
): typeof fetch {
  return (input, init) => {
    const request = typeof Request !== "undefined" && input instanceof Request ? input : undefined;
    const method = init?.method ?? request?.method;
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (request?.url ?? "");
    return watcher.track(() => fetchImpl(input, init), { method, url });
  };
}
