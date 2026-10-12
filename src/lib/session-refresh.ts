/**
 * Renewing a session when the access token runs out: the client half of
 * docs/auth-harmonization.md §11 (round 0.34 C7, KS U6), lifted from keksdose's
 * `refreshOnce` (Kurvenschmiede's is the same, line for line) and corrected where the
 * three apps' reviews found it wrong. It ends kastlan's sign-out over a network blip (B3).
 *
 * THE KIT OWNS THE RULE, THE APP OWNS THE CALL (§11.2, decision 1). The kit decides when
 * to refresh, who waits, what a failure means, when the session is over and whether a
 * renewal may still be stored. The app keeps its endpoint, its token storage, its
 * sign-out and where it navigates, and hands them in as {@link SessionRefreshOptions}.
 *
 *  - **One flight per tab** (decision 2): every 401 that arrives while a refresh runs
 *    waits for it, and so does `session.refresh()` (kastlan's boot).
 *  - **Definitive** (decision 3): the device holds no refresh token (`refresh` resolves
 *    `null`), the refresh answers 401 or 403, or the request replayed with the fresh
 *    token gets a 401 again. Only then does the app sign out (`onEnded`), and only while
 *    that session is still the app's.
 *  - **Transient** (decision 4): everything else. The session stays: nothing is signed
 *    out, stored or redirected, and the kit shows nothing. The request rejects with its
 *    OWN 401, marked ({@link isTransientRefreshFailure}), so the app's message can say
 *    "can't reach the server" instead of "not signed in".
 *  - **Retries only where waiting helps** (decision 5, KS 7): no answer, the kit's own
 *    timeout, 408, 429 and 5xx get up to three attempts, 1 s and then 3 s apart, each cut
 *    off after 15 s; none while the browser reports itself offline. Any other answer, and
 *    anything that is not an HTTP error, ends the flight at the first attempt.
 *  - **A stale session is never written back** (§11.7, ka 3, KS 3, KS 4): every request
 *    is stamped with `currentToken()` when it goes out, and every flight notes it when it
 *    starts. A 401 to a request sent with an older token replays it with the app's token
 *    now, without a refresh; a flight whose session changed while it ran stores nothing
 *    and ends nothing. The access token is the session's identity because every change
 *    the apps make replaces it — a refresh, another tab, a company switch, a password
 *    change, a sign-in, a demo start, a sign-out.
 *
 * Framework-free like `server-wake.ts`: {@link attachSessionRefresh} takes the app's
 * axios instance as an ARGUMENT, typed structurally, so the kit never imports axios.
 */

import type { AxiosLikeInstance, ServerWakeAxiosConfig } from "./server-wake";

/** What the app's `refresh` resolves: the new access token, plus whatever its `store`
 *  needs (its refresh token, the user). */
export interface SessionRenewal {
  /** The new access token; the waiting requests are replayed with it. */
  token: string;
  /**
   * `false`: store the renewal, but replay nothing — each waiting request rejects with
   * its 401, unmarked. kastlan's refresh can land in another company (§11.5, ka 3): a
   * waiting write, such as the handover's `POST /sync`, must not be replayed into it.
   */
  replay?: false;
}

/** What the app hands {@link createSessionRefresh} (§11.4). */
export interface SessionRefreshOptions<R extends SessionRenewal> {
  /**
   * The app's own `POST /auth/refresh`, on a BARE client — never the instance the kit is
   * attached to, so the refresh cannot re-enter the interceptor. It **writes nothing**:
   * the kit hands the answer to `store`, and only while the session is unchanged.
   *
   * Resolves the answer as a renewal, or `null` when the device holds no refresh token.
   * Throws on failure, and the kit classifies the throw: a 401 or 403 is definitive; no
   * answer (an axios error without a `response`), the kit's own timeout, 408, 429 and
   * 5xx are transient and retried; any other answer, and anything that is not an HTTP
   * error (a bug in this function), is transient and not retried. The status is read
   * from `err.response.status` (axios), `err.status` or `err.statusCode`.
   *
   * `signal` aborts when the attempt runs past `timeoutMs`; pass it to the request.
   */
  refresh: (signal: AbortSignal) => Promise<R | null>;
  /** Writes the renewal: the tokens and the user (a missing refresh token keeps the
   *  stored one). Called only while the session the flight renews is still the app's,
   *  and before the waiting requests are replayed — so it writes the token SYNCHRONOUSLY
   *  where `currentToken` reads it: the replay goes through the app's own request
   *  interceptor again, and is stamped then. A throw is the app's bug: the waiting
   *  requests and `session.refresh()` reject with it. */
  store: (renewal: R) => void;
  /** The access token the app sends NOW, read where its request interceptor reads it;
   *  `null` when there is none. */
  currentToken: () => string | null;
  /** Whether the session is a demo: a demo's 401 ends it, with no refresh tried
   *  (landing-demo §5.5). */
  isDemo: () => boolean;
  /**
   * The session is over: drop the tokens and the user, then navigate — `/demo/ended` for
   * a demo, else the sign-in with the page it came from (auth §5.2). Called once per
   * session, however many requests found out (KS 8), and never by `session.refresh()`.
   */
  onEnded: (ended: { demo: boolean }) => void;
  /** Whether a URL is a signed-out step, whose 401 judges the form and never the
   *  session. Replaces the default list, {@link isSignedOutStep}. */
  isSignedOutStep?: (url: string) => boolean;
  /** Attempts for a refresh that got no answer, timed out, or got a 408, 429 or 5xx.
   *  Default 3. */
  attempts?: number;
  /** The waits before the second and later attempts; the last one repeats. Default
   *  `[1000, 3000]`. */
  backoffMs?: readonly number[];
  /** Each attempt is cut off after this, and its `signal` aborted. Default 15 000. */
  timeoutMs?: number;
}

/** What `session.refresh()` resolves (§11.4), by `result`:
 *
 * | `result` | When | What the kit has done |
 * |---|---|---|
 * | `"renewed"` | a renewal while the session was unchanged | `store(renewal)` |
 * | `"ended"` | definitive | nothing; `onEnded` only for requests that waited on the same flight |
 * | `"transient"` | transient | nothing |
 * | `"changed"` | the session changed while it ran | nothing; read the app's own state |
 */
export type SessionRefreshOutcome<R extends SessionRenewal = SessionRenewal> =
  | { result: "renewed"; renewal: R }
  | { result: "ended" }
  | { result: "transient" }
  | { result: "changed" };

/** The flight {@link createSessionRefresh} makes; {@link attachSessionRefresh} hooks it
 *  to an axios instance. */
export interface SessionRefresh<R extends SessionRenewal = SessionRenewal> {
  /**
   * The same flight, for a caller outside the interceptor — kastlan's boot. Joins a
   * running flight, or starts one. Never calls `onEnded`: the caller decides what an
   * `"ended"` means for it.
   */
  refresh(): Promise<SessionRefreshOutcome<R>>;
}

// ── The signed-out steps ──────────────────────────────────────────────────────

/**
 * Every `/auth/` call made without a session, the union of the three apps' lists
 * (§11.3): signing in (with its `2fa` and `set-password` steps, and a passkey's), up,
 * into a demo, a password reset, the verification link, the invitation check, the email
 * change's confirmation link, and the refresh itself. NOT `resend-verification` (KS 1):
 * in keksdose and Kurvenschmiede it needs a session; in kastlan it never answers 401.
 */
const SIGNED_OUT_STEPS = [
  "login",
  "passkey/login",
  "register",
  "demo-session",
  "password-reset",
  "verify-email",
  "invitations/check",
  "me/email/confirm",
  "refresh",
] as const;

/**
 * Whether a request's URL is a signed-out step — the kit's default list (§11.3), exported
 * for an app's tests and for an app's own `isSignedOutStep` that adds to it.
 *
 * **Whole steps only** (KS 2): the part of the path after its `auth/` segment, without
 * the query string, is the entry itself or starts with the entry and a `/`. So
 * `login/2fa` is `login`'s, but `register` never catches `/auth/passkey/register/begin`
 * (adding a passkey, which needs a session), `invitations/check` never
 * `/auth/invitations/accept`, and `me/email/confirm` never `/auth/me/email`. Relative and
 * absolute URLs alike; a URL with no `auth` segment is no step.
 */
export function isSignedOutStep(url: string): boolean {
  const path = url.replace(/[?#].*$/s, "").replace(/^([a-z][a-z\d+.-]*:)?\/\/[^/]*/i, "");
  const segments = path.split("/");
  const at = segments.indexOf("auth");
  if (at < 0) return false;
  const step = segments.slice(at + 1).join("/");
  return SIGNED_OUT_STEPS.some((entry) => step === entry || step.startsWith(`${entry}/`));
}

// ── The marker ────────────────────────────────────────────────────────────────

/** On the request's own axios error, after a transient failure (decision 8). A
 *  `Symbol.for` key: shared by every copy of the kit in a page, and left out of
 *  `JSON.stringify`, so a log that serialises the error doesn't print it (kk 2). */
const TRANSIENT = Symbol.for("@eifi1/ui-kit:session-refresh.transient");

/**
 * Whether a request was refused because the refresh behind it failed TRANSIENTLY —
 * offline, a timeout, a 5xx — and not because the session is over (decision 8). The
 * error is the request's own 401, `err.response?.status` and every check an app already
 * has keep working; this reads the mark the kit put on it, so the app's message can say
 * "can't reach the server" instead of "not signed in". Read it FIRST: keksdose's sync
 * chip, kastlan's handover sync and Kurvenschmiede's `apiErrorMessage` count it as
 * offline (§11.5).
 *
 * Not the refresh's own error: its config carries the refresh token in its body, into any
 * log or crash report that keeps the error.
 */
export function isTransientRefreshFailure(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as Record<symbol, unknown>)[TRANSIENT] === true;
}

// ── The flight ────────────────────────────────────────────────────────────────

/** A flight's result, as the interceptor needs it: `"ended"` keeps the session it ended. */
type Flight<R extends SessionRenewal> =
  | { result: "renewed"; renewal: R }
  | { result: "ended"; token: string | null }
  | { result: "transient" }
  | { result: "changed" };

/** What one attempt came to. */
type Attempt<R> = { renewal: R } | "definitive" | "retry" | "transient";

/** What {@link attachSessionRefresh} needs of a session. Kept off the public interface:
 *  only what {@link createSessionRefresh} made can be attached. */
interface Engine {
  token(): string | null;
  isDemo(): boolean;
  isSignedOutStep(url: string): boolean;
  join(): Promise<Flight<SessionRenewal>>;
  end(token: string | null, demo: boolean): void;
}

const engines = new WeakMap<SessionRefresh<SessionRenewal>, Engine>();

/** The kit's own timeout, told apart from anything the app's `refresh` throws. */
const TIMED_OUT = Symbol("timed out");

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** An HTTP status as a number, or undefined. */
function statusOf(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

/** A refresh's throw, classified (§11.4). */
function classify(error: unknown): "definitive" | "retry" | "transient" {
  if (error === TIMED_OUT) return "retry";
  if (typeof error !== "object" || error === null) return "transient";
  const bag = error as { response?: { status?: unknown } | null; status?: unknown; statusCode?: unknown };
  const status = statusOf(bag.response?.status) ?? statusOf(bag.status) ?? statusOf(bag.statusCode);
  if (status === undefined) {
    // No answer: axios marks its own errors, and one without a response never reached a
    // server (offline, DNS, CORS, its own timeout). Anything else is a bug in `refresh`.
    return (error as { isAxiosError?: unknown }).isAxiosError === true ? "retry" : "transient";
  }
  if (status === 401 || status === 403) return "definitive";
  if (status === 408 || status === 429 || status >= 500) return "retry";
  return "transient";
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Make the flight: `const session = createSessionRefresh({ refresh, store, currentToken,
 * isDemo, onEnded })`, then {@link attachSessionRefresh}`(api, session)`. One per tab.
 */
export function createSessionRefresh<R extends SessionRenewal>(options: SessionRefreshOptions<R>): SessionRefresh<R> {
  const { attempts = 3, backoffMs = [1000, 3000], timeoutMs = 15_000 } = options;
  // An empty string is no token: the stamp and the flight compare tokens, and "" against
  // `null` must not read as a change of session.
  const token = () => options.currentToken() || null;

  /** One call of the app's `refresh`, cut off after `timeoutMs` even if it ignores the
   *  signal. */
  const attempt = async (): Promise<Attempt<R>> => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(TIMED_OUT);
        controller.abort();
      }, timeoutMs);
    });
    try {
      // Through `then`, so a `refresh` that throws before it returns a promise is
      // classified like one that rejects.
      const renewal = await Promise.race([Promise.resolve().then(() => options.refresh(controller.signal)), timeout]);
      return renewal ? { renewal } : "definitive";
    } catch (error) {
      return classify(error);
    } finally {
      clearTimeout(timer);
    }
  };

  const run = async (): Promise<Flight<R>> => {
    // The session this flight renews (§11.3 step 5).
    const noted = token();
    const changed = () => token() !== noted;
    let outcome = await attempt();
    for (let made = 1; outcome === "retry"; made += 1) {
      // No further attempt while the browser says it is offline, nor for a session that
      // is no longer the app's: whatever the answer, it would be "changed".
      if (made >= attempts || isOffline() || changed()) break;
      await sleep(backoffMs[made - 1] ?? backoffMs[backoffMs.length - 1] ?? 0);
      if (isOffline() || changed()) break;
      outcome = await attempt();
    }
    // A late answer never writes the old session back over a sign-out, a demo start or a
    // password change, and the old session's refusal never signs anyone out (KS 3).
    if (changed()) return { result: "changed" };
    if (outcome === "definitive") return { result: "ended", token: noted };
    if (outcome === "retry" || outcome === "transient") return { result: "transient" };
    options.store(outcome.renewal);
    return { result: "renewed", renewal: outcome.renewal };
  };

  let flight: Promise<Flight<R>> | null = null;
  const join = () => {
    // Cleared before any waiter resumes (`finally` settles first), so a waiter that
    // needs another flight starts a new one.
    flight ??= run().finally(() => {
      flight = null;
    });
    return flight;
  };

  /** The session `onEnded` was last called for: once per session (KS 8). */
  let ended: { token: string | null } | undefined;

  const session: SessionRefresh<R> = {
    async refresh() {
      const outcome = await join();
      return outcome.result === "ended" ? { result: "ended" } : outcome;
    },
  };
  engines.set(session, {
    token,
    isDemo: () => options.isDemo(),
    isSignedOutStep: options.isSignedOutStep ?? isSignedOutStep,
    join,
    end(endedToken, demo) {
      if (ended && ended.token === endedToken) return;
      ended = { token: endedToken };
      options.onEnded({ demo });
    },
  });
  return session;
}

// ── axios ─────────────────────────────────────────────────────────────────────

/** The config fields the kit reads and writes — what axios's request config has. */
interface SessionRefreshAxiosConfig extends ServerWakeAxiosConfig {
  /** axios's `AxiosHeaders` (written through its `set`), or a plain record. */
  headers?: unknown;
}

/** An axios instance, structurally: {@link AxiosLikeInstance}, plus `request(config)` for
 *  the replay. `axios.create()`'s result fits it as is. `NoInfer`, because axios's
 *  `request` takes the WIDER `AxiosRequestConfig`: inferred from there, the config type
 *  no longer fits the interceptors, which hand out `InternalAxiosRequestConfig`. */
interface SessionRefreshInstance<C extends SessionRefreshAxiosConfig, R extends { config: C }>
  extends AxiosLikeInstance<C, R> {
  request(config: NoInfer<C>): Promise<unknown>;
}

/** The keys the kit keeps on a request's config, as `attachServerWake` keeps
 *  `_serverWake`: never a header. Plain string keys holding primitives, because axios
 *  copies the config on a replay (`mergeConfig`) and a symbol key would be dropped. */
const STAMP = "_sessionStamp";
const REFRESHED = "_sessionRefreshed";
const RESTAMPED = "_sessionRestamped";
type Marked = {
  /** `currentToken()` when the request went out. */
  [STAMP]?: string | null;
  /** Replayed after a refresh: a 401 now is definitive (decision 3). */
  [REFRESHED]?: boolean;
  /** Replayed because it was sent with an older token: once for this reason. */
  [RESTAMPED]?: boolean;
};

/** `Authorization: Bearer <token>` on a config about to be replayed. The app's own
 *  request interceptor runs again on the replay and writes the same, from the same
 *  source. */
function authorize(config: SessionRefreshAxiosConfig, token: string): void {
  const value = `Bearer ${token}`;
  const headers = config.headers;
  if (typeof headers !== "object" || headers === null) {
    config.headers = { Authorization: value };
  } else if (typeof (headers as { set?: unknown }).set === "function") {
    (headers as { set(name: string, value: string): unknown }).set("Authorization", value);
  } else {
    (headers as Record<string, unknown>).Authorization = value;
  }
}

/**
 * Hook a session to an axios instance: `attachSessionRefresh(api, session)`. Adds a
 * request interceptor (the stamp) and a response interceptor (the 401), and returns a
 * function that ejects both.
 *
 * Attach it LAST (§11.3, kk 4): after `attachServerWake`, which asks to be first, and
 * after the app's own response interceptors (logging, a watchdog of its own). axios runs
 * response interceptors in the order they were added, and each of those must see the 401
 * settle before the refresh is awaited. The request side's order does not matter.
 *
 * On a 401, in this order (§11.3):
 *
 *  1. a signed-out step → reject, nothing else;
 *  2. sent with an older token → replayed with the app's token now, with no refresh, once
 *     for this reason; with no token now, reject;
 *  3. a demo → `onEnded({ demo: true })`, reject;
 *  4. already replayed after a refresh → definitive: `onEnded({ demo: false })`, reject;
 *  5. otherwise it joins the flight, or starts it. A renewal replays it once with the
 *     renewal's token (`replay: false`: rejects, unmarked); definitive ends the session;
 *     transient rejects, marked; a session that changed meanwhile sends it through step
 *     2 again.
 *
 * Every rejection is the request's OWN error. Any other status passes through untouched.
 */
export function attachSessionRefresh<C extends SessionRefreshAxiosConfig, R extends { config: C }>(
  instance: SessionRefreshInstance<C, R>,
  session: SessionRefresh<SessionRenewal>,
): () => void {
  const engine = engines.get(session);
  if (!engine) throw new TypeError("attachSessionRefresh takes the session createSessionRefresh made");

  const onUnauthorized = async (error: object, config: C & Marked): Promise<unknown> => {
    if (engine.isSignedOutStep(config.url ?? "")) throw error;
    // A config the kit never stamped (sent before it was attached) counts as current.
    const stamp = config[STAMP] === undefined ? engine.token() : config[STAMP];
    const replay = (token: string) => {
      authorize(config, token);
      return instance.request(config);
    };
    for (;;) {
      const now = engine.token();
      // 2. The session it was sent for is gone, and whatever ended it has already done
      // what follows (ka 3, KS 3, KS 4).
      if (stamp !== now) {
        if (now === null || config[RESTAMPED]) throw error;
        config[RESTAMPED] = true;
        return replay(now);
      }
      // 3. A demo has nothing to refresh: its token lives as long as its account
      // (landing-demo §5.5).
      if (engine.isDemo()) {
        engine.end(now, true);
        throw error;
      }
      // 4. A replay for an older token doesn't count here: the app's current token may
      // simply have expired too, which needs a refresh, not a sign-out.
      if (config[REFRESHED]) {
        engine.end(now, false);
        throw error;
      }
      // 5. The flight.
      const flight = await engine.join();
      if (flight.result === "changed") continue;
      if (flight.result === "ended") {
        engine.end(flight.token, false);
        throw error;
      }
      if (flight.result === "transient") {
        (error as Record<symbol, unknown>)[TRANSIENT] = true;
        throw error;
      }
      if (flight.renewal.replay === false) throw error;
      config[REFRESHED] = true;
      return replay(flight.renewal.token);
    }
  };

  const request = instance.interceptors.request.use(
    (config) => {
      (config as C & Marked)[STAMP] = engine.token();
      return config;
    },
    (error) => Promise.reject(error),
  );
  const response = instance.interceptors.response.use(
    (res) => res,
    (error) => {
      const failed = error as { config?: C & Marked; response?: { status?: unknown } } | null;
      if (failed?.response?.status !== 401 || !failed.config) return Promise.reject(error);
      return onUnauthorized(failed, failed.config);
    },
  );
  return () => {
    instance.interceptors.request.eject(request);
    instance.interceptors.response.eject(response);
  };
}
