import type {
  ApiTranslationReview,
  ApiTranslationReviewWrite,
  ServerWakeWatcher,
  TranslationReviewKey,
} from "@eifi1/ui-kit";

/**
 * The kit review's line to keksdose's API — the same three routes keksdose's own
 * /translations page calls (backend `adapters/api/translations_router.py`), plus its
 * public `/health`.
 *
 * WHY IT RETRIES. keksdose runs on Cloud Run with no minimum instance: after a quiet
 * spell the container is gone, and the first request has to start it — tens of seconds,
 * during which the front end may answer 502/503/504 or simply hold the connection. And a
 * gateway error from Google's front end carries no CORS headers, so the browser does not
 * even show the page its status: it reports a `TypeError` ("Failed to fetch"), exactly as
 * it would for a dropped connection. So every call here — the read, the save, the clear,
 * all three idempotent (a PUT of the same verdicts, a clear of the same keys) — gets ONE
 * budget of 60 s, tries again within it on what a waking server answers, and only then
 * gives up with an error the page offers a Retry for.
 *
 *  - per attempt: an AbortController timeout (25 s, or whatever is left of the budget)
 *    covering the headers AND the body;
 *  - tried again: a network error (`TypeError`), a timed-out attempt, 502, 503, 504, and
 *    429 — after its `Retry-After` when it sends one, else the backoff;
 *  - backoff 1 s, 2 s, 4 s, then 8 s between attempts, never past the budget: when the
 *    next wait would end after it, the call gives up now rather than sleep into nothing;
 *  - never tried again: any other status. A 401 is an expired or revoked token, a 403 the
 *    server's refusal (a locale or area outside the grant), a 422 a bad payload — none of
 *    them changes by asking twice.
 *  - `signal` cancels everything, the attempt in flight and the wait between attempts —
 *    the page aborts on unmount.
 *
 * THE COLD-START NOTICE. Each call is counted on the page's ServerWake watcher ONCE, for
 * its whole life, retries and waits included (`watcher.track` around the loop). The kit's
 * `wrapFetch` would count each attempt instead, and end the wait at each answer's headers:
 * a container answering 503 quickly while it starts would then reset the notice to idle
 * between attempts, and "waking the server" would never show. Same watcher, same notice,
 * one level up.
 */

/** `GET /translations/reviews` — keksdose's `TranslationReviewsResponse`. */
export interface ApiTranslationReviews {
  /** The locales the token's holder may review, in keksdose's UI order. */
  locales: string[];
  /** The areas they are limited to (`["legal"]`), `null` for every area. */
  areas?: string[] | null;
  /** Every stored verdict in those locales — app keys and `kit.` keys alike. */
  reviews: ApiTranslationReview[];
}

/** The whole budget of one call, every attempt and wait included. */
export const REVIEW_BUDGET_MS = 60_000;
/** One attempt, headers and body. A cold start that holds the connection longer is cut
 *  off and asked again — the container keeps starting either way. */
export const ATTEMPT_TIMEOUT_MS = 25_000;
/** The wait before attempt n+1 (n from 1): 1 s, 2 s, 4 s, then 8 s. */
export const backoffMs = (attempt: number) => Math.min(1000 * 2 ** (attempt - 1), 8000);

const RETRY_STATUSES = new Set([502, 503, 504]);

export type ReviewErrorKind =
  /** 401: the token expired or was revoked. The page drops it. */
  | "unauthorized"
  /** 403: keksdose refused — `detail` is its words. */
  | "forbidden"
  /** Any other status that is not worth repeating (400, 404, 422, 500 …). */
  | "http"
  /** The budget ran out on network errors, timeouts or gateway answers. */
  | "unavailable"
  /** `signal` was aborted (the page went away). */
  | "aborted";

export class ReviewApiError extends Error {
  readonly kind: ReviewErrorKind;
  readonly status: number | undefined;
  /** keksdose's own words (FastAPI's `detail`), when it sent any. */
  readonly detail: string | undefined;

  constructor(kind: ReviewErrorKind, message: string, status?: number, detail?: string) {
    super(message);
    this.name = "ReviewApiError";
    this.kind = kind;
    this.status = status;
    this.detail = detail;
  }
}

export const isReviewApiError = (error: unknown, kind?: ReviewErrorKind): error is ReviewApiError =>
  error instanceof ReviewApiError && (kind === undefined || error.kind === kind);

export interface ReviewClientOptions {
  /** `https://keksdose.app/api/v1` — the paths below are appended. */
  base: string;
  /** The review token, sent as `Authorization: Bearer …`. Not needed for `health()`. */
  token?: string | null;
  /** The watcher whose notice explains a slow answer. Every call is counted once. */
  watcher?: ServerWakeWatcher;
  /** Default: the global `fetch`, looked up per call (so a test may stub it). */
  fetch?: typeof fetch;
  budgetMs?: number;
  attemptTimeoutMs?: number;
}

export interface CallOptions {
  /** Cancels the call — the attempt in flight and any wait. */
  signal?: AbortSignal;
}

export interface ReviewClient {
  /** `GET /health`, public: wakes the container. Resolves once it answered 2xx. */
  health(options?: CallOptions): Promise<void>;
  /** `GET /translations/reviews`. */
  list(options?: CallOptions): Promise<ApiTranslationReviews>;
  /** `PUT /translations/reviews` — the verdicts as stored, in the server's spelling. */
  save(items: ApiTranslationReviewWrite[], options?: CallOptions): Promise<ApiTranslationReview[]>;
  /** `POST /translations/reviews/clear` — how many verdicts were removed. */
  clear(items: TranslationReviewKey[], options?: CallOptions): Promise<number>;
}

interface Call {
  method: "GET" | "PUT" | "POST";
  path: string;
  body?: unknown;
  auth: boolean;
}

/** What one attempt came back with: an answer (any status), or nothing. */
type Outcome =
  | { answered: true; status: number; text: string; retryAfter: string | null }
  | { answered: false; cause: "network" | "timeout" };

export function createReviewClient({
  base,
  token,
  watcher,
  fetch: fetchImpl,
  budgetMs = REVIEW_BUDGET_MS,
  attemptTimeoutMs = ATTEMPT_TIMEOUT_MS,
}: ReviewClientOptions): ReviewClient {
  const root = base.replace(/\/+$/, "");

  const attempt = async (call: Call, timeoutMs: number, signal: AbortSignal | undefined): Promise<Outcome> => {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener("abort", cancel);
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (call.auth && token) headers.Authorization = `Bearer ${token}`;
    if (call.body !== undefined) headers["Content-Type"] = "application/json";
    try {
      const response = await (fetchImpl ?? globalThis.fetch)(`${root}${call.path}`, {
        method: call.method,
        headers,
        body: call.body === undefined ? undefined : JSON.stringify(call.body),
        signal: controller.signal,
        // No cookies: the token is the whole credential, and keksdose's CORS answer then
        // does not have to name this origin as one it trusts with a session.
        credentials: "omit",
        cache: "no-store",
      });
      // Inside the timeout: a body that stalls halfway is as dead as a missing answer.
      const text = await response.text();
      return { answered: true, status: response.status, text, retryAfter: response.headers.get("Retry-After") };
    } catch (error) {
      if (signal?.aborted) throw aborted();
      if (timedOut) return { answered: false, cause: "timeout" };
      // fetch rejects with a TypeError for every network-level failure — offline, DNS,
      // a reset, and a gateway error without CORS headers. Anything else is a bug.
      if (error instanceof TypeError) return { answered: false, cause: "network" };
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
    }
  };

  const run = async (call: Call, signal: AbortSignal | undefined): Promise<unknown> => {
    const deadline = Date.now() + budgetMs;
    let attempts = 0;
    let last = "";
    for (;;) {
      if (signal?.aborted) throw aborted();
      const left = deadline - Date.now();
      if (left <= 0) throw unavailable(budgetMs, attempts, last);
      attempts += 1;
      const outcome = await attempt(call, Math.min(attemptTimeoutMs, left), signal);
      let wait = backoffMs(attempts);
      if (outcome.answered) {
        const { status, text } = outcome;
        if (status >= 200 && status < 300) return parse(text, status);
        if (status === 401) {
          throw new ReviewApiError("unauthorized", "The review token has expired or was revoked.", status, detailOf(text));
        }
        if (status === 403) {
          const detail = detailOf(text);
          throw new ReviewApiError("forbidden", detail ?? "keksdose refused this.", status, detail);
        }
        if (status === 429) {
          const after = retryAfterMs(outcome.retryAfter);
          if (after !== undefined) wait = after;
          last = "429 (too many requests)";
        } else if (RETRY_STATUSES.has(status)) {
          last = String(status);
        } else {
          const detail = detailOf(text);
          throw new ReviewApiError("http", `keksdose answered ${status}${detail ? `: ${detail}` : "."}`, status, detail);
        }
      } else {
        last = outcome.cause === "timeout" ? "no answer within the attempt's timeout" : "a network error";
      }
      // Sleeping past the deadline would only delay the same error.
      if (Date.now() + wait >= deadline) throw unavailable(budgetMs, attempts, last);
      await sleep(wait, signal);
    }
  };

  const request = <T>(call: Call, options: CallOptions = {}): Promise<T> => {
    const work = () => run(call, options.signal) as Promise<T>;
    return watcher ? watcher.track(work, { method: call.method, url: `${root}${call.path}` }) : work();
  };

  return {
    health: async (options) => {
      await request<unknown>({ method: "GET", path: "/health", auth: false }, options);
    },
    list: (options) => request<ApiTranslationReviews>({ method: "GET", path: "/translations/reviews", auth: true }, options),
    save: async (items, options) =>
      (
        await request<{ reviews: ApiTranslationReview[] }>(
          { method: "PUT", path: "/translations/reviews", body: { items }, auth: true },
          options,
        )
      ).reviews,
    clear: async (items, options) =>
      (
        await request<{ cleared: number }>(
          { method: "POST", path: "/translations/reviews/clear", body: { items }, auth: true },
          options,
        )
      ).cleared,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const aborted = () => new ReviewApiError("aborted", "Cancelled.");

function unavailable(budgetMs: number, attempts: number, last: string): ReviewApiError {
  const tries = attempts === 1 ? "1 attempt" : `${attempts} attempts`;
  return new ReviewApiError(
    "unavailable",
    `keksdose did not answer within ${Math.round(budgetMs / 1000)} s (${tries}${last ? `, the last: ${last}` : ""}). It may still be starting — try again.`,
  );
}

function parse(text: string, status: number): unknown {
  if (text === "") return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new ReviewApiError("http", `keksdose answered ${status} with something that is not JSON.`, status);
  }
}

/** FastAPI's `{"detail": "…"}`, or a 422's `{"detail": [{ "msg": … }]}`. */
export function detailOf(text: string): string | undefined {
  try {
    const body = JSON.parse(text) as { detail?: unknown };
    const { detail } = body ?? {};
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => (item && typeof item === "object" ? (item as { msg?: unknown }).msg : undefined))
        .filter((msg): msg is string => typeof msg === "string");
      return messages.length > 0 ? messages.join("; ") : undefined;
    }
  } catch {
    // not JSON — a proxy's HTML page; the status says enough
  }
  return undefined;
}

/** `Retry-After` as milliseconds: delta-seconds or an HTTP date. `undefined` when absent
 *  or unreadable, and the backoff applies. */
export function retryAfterMs(value: string | null, now = Date.now()): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  if (/^\d+$/.test(value.trim())) return Number(value.trim()) * 1000;
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - now);
}

function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(aborted());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(aborted());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
