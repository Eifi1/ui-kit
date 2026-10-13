import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { attachServerWake, createServerWake } from "../server-wake";
import type { ServerWakeAxiosConfig } from "../server-wake";
import {
  attachSessionRefresh,
  createSessionRefresh,
  isSignedOutStep,
  isTransientRefreshFailure,
} from "../session-refresh";
import type { SessionRefreshOptions, SessionRenewal } from "../session-refresh";

/**
 * docs/auth-harmonization.md §11 (round 0.34 C7): one refresh per tab, a definitive
 * failure ends the session once, a transient one ends nothing and marks the request's own
 * 401, retries only where waiting helps, and a session that changed meanwhile is never
 * written back or signed out. Every case below is a line of §11.6's test list.
 */

function setOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, get: () => online });
}

beforeEach(() => setOnline(true));
afterEach(() => {
  vi.useRealTimers();
  setOnline(true);
});

type Cfg = ServerWakeAxiosConfig & { headers?: Record<string, unknown>; [key: string]: unknown };
type Res = { config: Cfg; status: number };
type HttpError = Error & { isAxiosError: true; config: Cfg; response: { status: number; config: Cfg } };

/** What axios rejects with for an HTTP answer. */
function httpError(status: number, config: Cfg = {}): HttpError {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true as const,
    config,
    response: { status, config },
  });
}

/** What axios rejects with when nothing answered (offline, DNS, CORS). */
const noAnswer = () => Object.assign(new Error("Network Error"), { isAxiosError: true, code: "ERR_NETWORK" });

/**
 * A minimal axios: interceptor managers run in axios's order (request ones last-added
 * first, response ones in the order added), and `request(config)` COPIES the config, as
 * axios's `mergeConfig` does, so the kit's keys must survive a copy. `server` answers a
 * status for each request as it went out.
 */
function fakeAxios(server: (config: Cfg) => number | Promise<number>) {
  const manager = <V,>() => {
    const handlers: Array<{ ok: (v: V) => V | Promise<V>; err: (e: unknown) => unknown } | null> = [];
    return {
      handlers,
      use(ok: (v: V) => V | Promise<V>, err: (e: unknown) => unknown) {
        handlers.push({ ok, err });
        return handlers.length - 1;
      },
      eject(id: number) {
        handlers[id] = null;
      },
    };
  };
  const request = manager<Cfg>();
  const response = manager<Res>();
  /** Every request as it reached the server — a copy, because the kit writes the replay's
   *  `Authorization` onto the failed request's own config, as keksdose's client does. */
  const sent: Cfg[] = [];
  const send = async (input: Cfg): Promise<Res> => {
    let config: Cfg = { ...input };
    for (const h of [...request.handlers].reverse()) if (h) config = await h.ok(config);
    sent.push({ ...config, headers: { ...config.headers } });
    const status = await server(config);
    let ok = status < 400;
    let value: unknown = ok ? { config, status } : httpError(status, config);
    for (const h of response.handlers) {
      if (!h) continue;
      try {
        value = ok ? await h.ok(value as Res) : await h.err(value);
        ok = true;
      } catch (e) {
        value = e;
        ok = false;
      }
    }
    if (ok) return value as Res;
    throw value;
  };
  return { interceptors: { request, response }, request: send, sent, get: (url: string) => send({ url }) };
}

type Renewal = SessionRenewal & { refreshToken?: string };

/**
 * An app: its token in a variable, its own request interceptor writing it (as the apps'
 * do, from `localStorage`), a server that accepts only `valid`, and the kit attached last.
 */
function setup(
  overrides: Partial<SessionRefreshOptions<Renewal>> & {
    token?: string | null;
    valid?: string[];
    demo?: boolean;
    /** Runs as a request reaches the server, before it answers. */
    onSend?: (config: Cfg, app: { token: string | null; demo: boolean }) => void;
  } = {},
) {
  const app: { token: string | null; demo: boolean } = {
    token: overrides.token === undefined ? "t1" : overrides.token,
    demo: overrides.demo ?? false,
  };
  const valid = new Set(overrides.valid ?? ["t2"]);
  const refresh = vi.fn(overrides.refresh ?? (async (): Promise<Renewal | null> => ({ token: "t2", refreshToken: "r2" })));
  const store = vi.fn(
    overrides.store ??
      ((renewal: Renewal) => {
        app.token = renewal.token;
      }),
  );
  const onEnded = vi.fn(overrides.onEnded ?? (() => undefined));
  const session = createSessionRefresh<Renewal>({
    ...overrides,
    refresh,
    store,
    currentToken: overrides.currentToken ?? (() => app.token),
    isDemo: overrides.isDemo ?? (() => app.demo),
    onEnded,
  });
  const api = fakeAxios((config) => {
    overrides.onSend?.(config, app);
    const bearer = String(config.headers?.Authorization ?? "").replace(/^Bearer /, "");
    return valid.has(bearer) ? 200 : 401;
  });
  api.interceptors.request.use(
    (config) => {
      if (app.token) config.headers = { ...config.headers, Authorization: `Bearer ${app.token}` };
      return config;
    },
    (e) => Promise.reject(e),
  );
  const detach = attachSessionRefresh(api, session);
  return { app, valid, api, session, refresh, store, onEnded, detach };
}

/** A promise the test settles by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Settle a request either way, for assertions on what it rejected with. */
const settle = <T,>(p: Promise<T>) =>
  p.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error: error as HttpError }),
  );

describe("one flight per tab", () => {
  it("N concurrent 401s make one refresh and one store, and each is replayed with the new token", async () => {
    const { api, refresh, store, onEnded } = setup();
    const results = await Promise.all(["/a", "/b", "/c", "/d"].map((url) => api.get(url)));
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(store).toHaveBeenCalledTimes(1);
    expect(store).toHaveBeenCalledWith({ token: "t2", refreshToken: "r2" });
    expect(onEnded).not.toHaveBeenCalled();
    // 4 first sends with t1, 4 replays with t2.
    expect(api.sent.filter((c) => c.headers?.Authorization === "Bearer t2")).toHaveLength(4);
  });

  it("a 401 after the flight starts a new one", async () => {
    const { api, refresh, valid } = setup();
    await api.get("/a");
    valid.clear();
    valid.add("t3");
    refresh.mockResolvedValueOnce({ token: "t3" });
    await api.get("/b");
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("the stamp is a key on the config, never a header", async () => {
    const { api } = setup({ valid: ["t1"] });
    await api.get("/a");
    expect(api.sent[0]._sessionStamp).toBe("t1");
    expect(Object.keys(api.sent[0].headers ?? {})).toEqual(["Authorization"]);
  });

  it("writes Authorization through AxiosHeaders' set when the headers have one", async () => {
    const app = { token: "t1" };
    const headers = {
      set: vi.fn(function (this: Record<string, unknown>, name: string, value: string) {
        this[name] = value;
      }),
    };
    const api = fakeAxios((config) => (config.headers?.Authorization === "Bearer t2" ? 200 : 401));
    attachSessionRefresh(
      api,
      createSessionRefresh({
        refresh: async () => ({ token: "t2" }),
        store: (renewal) => {
          app.token = renewal.token;
        },
        currentToken: () => app.token,
        isDemo: () => false,
        onEnded: vi.fn(),
      }),
    );
    await expect(api.request({ url: "/a", headers })).resolves.toMatchObject({ status: 200 });
    expect(headers.set).toHaveBeenCalledWith("Authorization", "Bearer t2");
  });
});

describe("definitive: the session is over", () => {
  it("a 401 from the refresh calls onEnded once however many waited, and each rejects with its own 401", async () => {
    const { api, refresh, store, onEnded } = setup({ refresh: () => Promise.reject(httpError(401)) });
    const results = await Promise.all(["/a", "/b", "/c"].map((url) => settle(api.get(url))));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(store).not.toHaveBeenCalled();
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(onEnded).toHaveBeenCalledWith({ demo: false });
    for (const [i, r] of results.entries()) {
      expect(r.ok).toBe(false);
      if (r.ok) continue;
      expect(r.error.response.status).toBe(401);
      expect(r.error.config.url).toBe(["/a", "/b", "/c"][i]);
      expect(isTransientRefreshFailure(r.error)).toBe(false);
    }
  });

  it("a 403 from the refresh is definitive too, and so is no refresh token (null)", async () => {
    for (const refresh of [() => Promise.reject(httpError(403)), async () => null]) {
      const { api, onEnded } = setup({ refresh });
      await settle(api.get("/a"));
      expect(onEnded).toHaveBeenCalledTimes(1);
    }
  });

  it("the request replayed with the fresh token getting a 401 again is definitive — at most one replay after a refresh", async () => {
    const { api, refresh, onEnded } = setup({ valid: [] });
    const r = await settle(api.get("/a"));
    expect(r.ok).toBe(false);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(api.sent).toHaveLength(2);
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(onEnded).toHaveBeenCalledWith({ demo: false });
  });

  it("onEnded is called once per session, across flights", async () => {
    // The app does not drop its token here, so the next 401 is about the same session.
    const { api, refresh, onEnded } = setup({ refresh: () => Promise.reject(httpError(401)) });
    await settle(api.get("/a"));
    await settle(api.get("/b"));
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it("a new session ends again", async () => {
    const { api, app, onEnded } = setup({ refresh: () => Promise.reject(httpError(401)) });
    await settle(api.get("/a"));
    app.token = "t9"; // signed in again
    await settle(api.get("/b"));
    expect(onEnded).toHaveBeenCalledTimes(2);
  });
});

describe("a demo", () => {
  it("its N requests end it once, with no refresh tried (landing-demo §5.5, KS 8)", async () => {
    const { api, refresh, onEnded } = setup({ demo: true });
    const results = await Promise.all(["/a", "/b", "/c"].map((url) => settle(api.get(url))));
    expect(results.every((r) => !r.ok)).toBe(true);
    expect(refresh).not.toHaveBeenCalled();
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(onEnded).toHaveBeenCalledWith({ demo: true });
    await settle(api.get("/d"));
    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});

describe("transient: the session stays", () => {
  it("no onEnded, nothing stored; each rejection is the request's own 401, marked", async () => {
    const refreshError = httpError(422, { url: "/auth/refresh", data: '{"refresh_token":"secret"}' });
    const { api, store, onEnded } = setup({ refresh: () => Promise.reject(refreshError) });
    const results = await Promise.all(["/a", "/b"].map((url) => settle(api.get(url))));
    expect(store).not.toHaveBeenCalled();
    expect(onEnded).not.toHaveBeenCalled();
    for (const [i, r] of results.entries()) {
      if (r.ok) throw new Error("resolved");
      expect(r.error).not.toBe(refreshError);
      expect(r.error.response.status).toBe(401);
      expect(r.error.config.url).toBe(["/a", "/b"][i]);
      expect(isTransientRefreshFailure(r.error)).toBe(true);
    }
  });

  it("the marker is a Symbol.for key on the axios error itself, and a log that serialises it doesn't print it", async () => {
    const { api } = setup({ refresh: () => Promise.reject(httpError(400)) });
    const r = await settle(api.get("/a"));
    if (r.ok) throw new Error("resolved");
    expect(r.error).toBeInstanceOf(Error);
    expect((r.error as unknown as Record<symbol, unknown>)[Symbol.for("@eifi1/ui-kit:session-refresh.transient")]).toBe(true);
    expect(JSON.stringify({ ...r.error, config: undefined })).not.toContain("transient");
    expect(Object.keys(r.error)).not.toContain("transient");
  });

  it("isTransientRefreshFailure is false for anything unmarked", () => {
    for (const value of [undefined, null, 401, "x", new Error("x"), httpError(401), { transient: true }]) {
      expect(isTransientRefreshFailure(value)).toBe(false);
    }
  });
});

describe("retry only where waiting helps (decision 5, KS 7)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  const retryable: Array<[string, () => unknown]> = [
    ["no answer", noAnswer],
    ["408", () => httpError(408)],
    ["429", () => httpError(429)],
    ["500", () => httpError(500)],
    ["503", () => httpError(503)],
  ];

  for (const [name, failure] of retryable) {
    it(`${name}: three attempts, at 0, 1 s and 4 s, then transient`, async () => {
      const start = Date.now();
      const at: number[] = [];
      const { api, onEnded } = setup({
        refresh: () => {
          at.push(Date.now() - start);
          return Promise.reject(failure());
        },
      });
      const pending = settle(api.get("/a"));
      await vi.advanceTimersByTimeAsync(10_000);
      const r = await pending;
      expect(at).toEqual([0, 1000, 4000]);
      expect(r.ok).toBe(false);
      expect(isTransientRefreshFailure(r.ok ? undefined : r.error)).toBe(true);
      expect(onEnded).not.toHaveBeenCalled();
    });
  }

  it("a retry that answers ends the flight with a renewal", async () => {
    const { api, refresh, store } = setup();
    refresh.mockRejectedValueOnce(httpError(503));
    const pending = api.get("/a");
    await vi.advanceTimersByTimeAsync(1000);
    expect((await pending).status).toBe(200);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(store).toHaveBeenCalledTimes(1);
  });

  for (const [name, failure] of [
    ["400", () => httpError(400)],
    ["404", () => httpError(404)],
    ["422", () => httpError(422)],
    ["a non-HTTP throw (a bug in refresh)", () => new TypeError("cannot read properties of undefined")],
  ] as Array<[string, () => unknown]>) {
    it(`${name}: one attempt, transient`, async () => {
      const { api, refresh, onEnded } = setup({ refresh: () => Promise.reject(failure()) });
      const pending = settle(api.get("/a"));
      await vi.advanceTimersByTimeAsync(10_000);
      const r = await pending;
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(isTransientRefreshFailure(r.ok ? undefined : r.error)).toBe(true);
      expect(onEnded).not.toHaveBeenCalled();
    });
  }

  it("reads a fetch-style status too: err.status, err.statusCode", async () => {
    const ended = setup({ refresh: () => Promise.reject({ status: 401 }) });
    const first = settle(ended.api.get("/a"));
    await vi.advanceTimersByTimeAsync(0);
    await first;
    expect(ended.onEnded).toHaveBeenCalledTimes(1);

    const busy = setup({ refresh: () => Promise.reject({ statusCode: 503 }) });
    const second = settle(busy.api.get("/a"));
    await vi.advanceTimersByTimeAsync(10_000);
    await second;
    expect(busy.refresh).toHaveBeenCalledTimes(3);
  });

  it("a thrown non-object is a bug: one attempt, transient", async () => {
    const { api, refresh } = setup({ refresh: () => Promise.reject("boom") });
    const pending = settle(api.get("/a"));
    await vi.advanceTimersByTimeAsync(10_000);
    const r = await pending;
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(isTransientRefreshFailure(r.ok ? undefined : r.error)).toBe(true);
  });

  it("a refresh that throws before it returns a promise is classified, not leaked", async () => {
    const { api, refresh } = setup({
      refresh: () => {
        throw new Error("boom");
      },
    });
    const r = await settle(api.get("/a"));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(isTransientRefreshFailure(r.ok ? undefined : r.error)).toBe(true);
  });

  it("no further attempt while the browser reports itself offline", async () => {
    const { api, refresh } = setup({
      refresh: () => {
        setOnline(false);
        return Promise.reject(noAnswer());
      },
    });
    const pending = settle(api.get("/a"));
    await vi.advanceTimersByTimeAsync(10_000);
    const r = await pending;
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(isTransientRefreshFailure(r.ok ? undefined : r.error)).toBe(true);
  });

  it("going offline during the wait stops the next attempt", async () => {
    const { api, refresh } = setup({ refresh: () => Promise.reject(noAnswer()) });
    const pending = settle(api.get("/a"));
    await vi.advanceTimersByTimeAsync(500);
    setOnline(false);
    await vi.advanceTimersByTimeAsync(10_000);
    await pending;
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("the timeout aborts through the signal at 15 s, and is retried", async () => {
    const signals: AbortSignal[] = [];
    const { api, refresh } = setup({
      refresh: (signal) => {
        signals.push(signal);
        return new Promise<never>(() => undefined); // ignores the signal: the kit cuts it off anyway
      },
    });
    const pending = settle(api.get("/a"));
    await vi.advanceTimersByTimeAsync(14_999);
    expect(signals[0].aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(signals[0].aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(60_000);
    const r = await pending;
    expect(refresh).toHaveBeenCalledTimes(3);
    expect(signals.every((s) => s.aborted)).toBe(true);
    expect(isTransientRefreshFailure(r.ok ? undefined : r.error)).toBe(true);
  });

  it("takes its own attempts, backoff and timeout", async () => {
    const start = Date.now();
    const at: number[] = [];
    const { api } = setup({
      attempts: 4,
      backoffMs: [100],
      timeoutMs: 50,
      refresh: () => {
        at.push(Date.now() - start);
        return new Promise<never>(() => undefined);
      },
    });
    const pending = settle(api.get("/a"));
    await vi.advanceTimersByTimeAsync(1000);
    await pending;
    expect(at).toEqual([0, 150, 300, 450]);
  });

  it("an empty backoff retries at once", async () => {
    const { api, refresh } = setup({ backoffMs: [], refresh: () => Promise.reject(httpError(502)) });
    const pending = settle(api.get("/a"));
    await vi.advanceTimersByTimeAsync(5);
    await pending;
    expect(refresh).toHaveBeenCalledTimes(3);
  });
});

describe("signed-out steps", () => {
  it("a signed-out step's 401 never refreshes and ends nothing, a demo's either", async () => {
    for (const demo of [false, true]) {
      const { api, refresh, onEnded } = setup({ demo });
      for (const url of ["/auth/login", "/api/v1/auth/login/2fa", "/auth/passkey/login/finish", "/auth/refresh"]) {
        const r = await settle(api.request({ url, method: "post" }));
        expect(r.ok).toBe(false);
      }
      expect(refresh).not.toHaveBeenCalled();
      expect(onEnded).not.toHaveBeenCalled();
    }
  });

  it("resend-verification refreshes (KS 1)", async () => {
    const { api, refresh } = setup();
    await api.request({ url: "/auth/resend-verification", method: "post" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("an app's isSignedOutStep replaces the list", async () => {
    const { api, refresh } = setup({ isSignedOutStep: (url) => url.startsWith("/public/") });
    await settle(api.get("/public/x"));
    expect(refresh).not.toHaveBeenCalled();
    await api.request({ url: "/auth/login", method: "post" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe("isSignedOutStep", () => {
  it("matches every entry of the default list, and its sub-steps", () => {
    for (const url of [
      "/auth/login",
      "/auth/login/2fa",
      "/auth/login/set-password",
      "/auth/passkey/login/begin",
      "/auth/register",
      "/auth/demo-session",
      "/auth/password-reset/request",
      "/auth/verify-email",
      "/auth/invitations/check",
      "/auth/me/email/confirm",
      "/auth/refresh",
    ]) {
      expect(isSignedOutStep(url), url).toBe(true);
    }
  });

  it("matches whole steps only (KS 2)", () => {
    expect(isSignedOutStep("/auth/passkey/register/begin")).toBe(false);
    expect(isSignedOutStep("/auth/passkey/register/finish")).toBe(false);
    expect(isSignedOutStep("/auth/invitations/accept")).toBe(false);
    expect(isSignedOutStep("/auth/me/email")).toBe(false);
    expect(isSignedOutStep("/auth/registered-devices")).toBe(false);
    expect(isSignedOutStep("/auth/login-history")).toBe(false);
    expect(isSignedOutStep("/auth/resend-verification")).toBe(false);
    expect(isSignedOutStep("/auth/me")).toBe(false);
  });

  it("reads the path after the auth segment, without the query string, in any URL", () => {
    expect(isSignedOutStep("/api/v1/auth/login")).toBe(true);
    expect(isSignedOutStep("auth/login")).toBe(true);
    expect(isSignedOutStep("https://api.example.com/api/v1/auth/refresh")).toBe(true);
    expect(isSignedOutStep("/auth/login?next=/budgets")).toBe(true);
    expect(isSignedOutStep("/auth/me/email?confirm/x")).toBe(false);
    expect(isSignedOutStep("/auth/login#x")).toBe(true);
    expect(isSignedOutStep("/login")).toBe(false);
    expect(isSignedOutStep("/oauth/login")).toBe(false);
    expect(isSignedOutStep("https://auth.example.com/budgets")).toBe(false);
    expect(isSignedOutStep("")).toBe(false);
  });
});

describe("a request sent with an older token", () => {
  /** Another tab, a company switch or a sign-out replaced the token while it was out. */
  const swapTo = (next: string | null) => (_config: Cfg, app: { token: string | null }) => {
    if (app.token === "t1") app.token = next;
  };

  it("is replayed with currentToken() and no refresh", async () => {
    const { api, refresh } = setup({ valid: ["t5"], onSend: swapTo("t5") });
    await expect(api.get("/a")).resolves.toMatchObject({ status: 200 });
    expect(refresh).not.toHaveBeenCalled();
    expect(api.sent.map((c) => c.headers?.Authorization)).toEqual(["Bearer t1", "Bearer t5"]);
  });

  it("rejects without a call when currentToken() is null — the session was signed out", async () => {
    const { api, refresh, onEnded } = setup({ onSend: swapTo(null) });
    const r = await settle(api.get("/a"));
    expect(r.ok ? 0 : r.error.response.status).toBe(401);
    expect(api.sent).toHaveLength(1);
    expect(refresh).not.toHaveBeenCalled();
    expect(onEnded).not.toHaveBeenCalled();
    expect(isTransientRefreshFailure(r.ok ? undefined : r.error)).toBe(false);
  });

  it("if that replay 401s, it refreshes rather than ends the session", async () => {
    const { api, refresh, onEnded } = setup({ valid: ["t2"], onSend: swapTo("t5") }); // t5 has expired too
    await expect(api.get("/a")).resolves.toMatchObject({ status: 200 });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onEnded).not.toHaveBeenCalled();
    expect(api.sent.map((c) => c.headers?.Authorization)).toEqual(["Bearer t1", "Bearer t5", "Bearer t2"]);
  });

  it("is replayed at most once for this reason", async () => {
    let n = 0;
    const app = { token: "t1" as string | null };
    const session = createSessionRefresh({
      refresh: vi.fn(async () => ({ token: "never" })),
      store: vi.fn(),
      currentToken: () => app.token,
      isDemo: () => false,
      onEnded: vi.fn(),
    });
    // Each answer arrives after the token moved on again.
    const api = fakeAxios(() => {
      n += 1;
      app.token = `t${n + 1}`;
      return 401;
    });
    attachSessionRefresh(api, session);
    const r = await settle(api.get("/a"));
    expect(r.ok).toBe(false);
    expect(api.sent).toHaveLength(2);
    expect(api.sent.map((c) => c._sessionStamp)).toEqual(["t1", "t2"]);
  });
});

describe("the session changes while the flight runs", () => {
  /** Let every request that has reached the server reach the flight too. */
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("a sign-out: no store and no onEnded for a renewal; the waiters reject", async () => {
    const answer = deferred<Renewal | null>();
    const { api, app, refresh, store, onEnded } = setup({ refresh: () => answer.promise });
    const pending = Promise.all(["/a", "/b"].map((url) => settle(api.get(url))));
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    await flush();
    app.token = null;
    answer.resolve({ token: "t2" });
    const results = await pending;
    expect(results.every((r) => !r.ok)).toBe(true);
    expect(store).not.toHaveBeenCalled();
    expect(onEnded).not.toHaveBeenCalled();
    expect(api.sent).toHaveLength(2);
  });

  it("a new token from elsewhere: a definitive answer ends nothing, and the waiters replay with the current token", async () => {
    const answer = deferred<Renewal | null>();
    const { api, app, refresh, store, onEnded } = setup({ refresh: () => answer.promise, valid: ["t9"] });
    const pending = Promise.all(["/a", "/b"].map((url) => api.get(url)));
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    await flush();
    app.token = "t9"; // a password change stored a fresh pair (KS 3)
    answer.reject(httpError(401));
    const results = await pending;
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(store).not.toHaveBeenCalled();
    expect(onEnded).not.toHaveBeenCalled();
    expect(api.sent.slice(2).map((c) => c.headers?.Authorization)).toEqual(["Bearer t9", "Bearer t9"]);
  });

  it("a request about the new session that joined the old flight gets a flight of its own", async () => {
    const first = deferred<Renewal | null>();
    const refresh = vi
      .fn<(signal: AbortSignal) => Promise<Renewal | null>>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(async () => ({ token: "t2" }));
    const { api, app, store } = setup({ refresh });
    const old = settle(api.get("/a"));
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    app.token = "t5"; // a new session, and its token has expired too
    const fresh = api.get("/b");
    await vi.waitFor(() => expect(api.sent).toHaveLength(2));
    await flush();
    first.resolve({ token: "old" });
    expect((await fresh).status).toBe(200);
    await old;
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(store).toHaveBeenCalledTimes(1);
    expect(store).toHaveBeenCalledWith({ token: "t2" });
  });
});

describe("replay: false", () => {
  it("stores the renewal; the waiters reject unmarked, and nothing ends", async () => {
    const { api, refresh, store, onEnded } = setup({ refresh: async () => ({ token: "t2", replay: false }) });
    const results = await Promise.all(["/a", "/b"].map((url) => settle(api.get(url))));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(store).toHaveBeenCalledTimes(1);
    expect(onEnded).not.toHaveBeenCalled();
    for (const r of results) {
      if (r.ok) throw new Error("resolved");
      expect(r.error.response.status).toBe(401);
      expect(isTransientRefreshFailure(r.error)).toBe(false);
    }
    expect(api.sent).toHaveLength(2);
  });
});

describe("session.refresh()", () => {
  it("joins a running flight", async () => {
    const answer = deferred<Renewal | null>();
    const { api, session, refresh } = setup({ refresh: () => answer.promise });
    const request = api.get("/a");
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    const boot = session.refresh();
    answer.resolve({ token: "t2" });
    await expect(boot).resolves.toEqual({ result: "renewed", renewal: { token: "t2" } });
    await request;
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("an interceptor 401 joins a flight session.refresh() started (kastlan's boot)", async () => {
    const answer = deferred<Renewal | null>();
    const { api, session, refresh, app } = setup({ refresh: () => answer.promise, token: null });
    const boot = session.refresh();
    const request = api.get("/a");
    await vi.waitFor(() => expect(api.sent).toHaveLength(1));
    answer.resolve({ token: "t2" });
    await expect(boot).resolves.toMatchObject({ result: "renewed" });
    expect((await request).status).toBe(200);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(app.token).toBe("t2");
  });

  it("resolves renewed after store()", async () => {
    const { session, store, app } = setup();
    await expect(session.refresh()).resolves.toEqual({ result: "renewed", renewal: { token: "t2", refreshToken: "r2" } });
    expect(store).toHaveBeenCalledTimes(1);
    expect(app.token).toBe("t2");
  });

  it("resolves ended, and never calls onEnded itself", async () => {
    const { session, onEnded, store } = setup({ refresh: async () => null });
    await expect(session.refresh()).resolves.toEqual({ result: "ended" });
    expect(onEnded).not.toHaveBeenCalled();
    expect(store).not.toHaveBeenCalled();
  });

  it("calls onEnded for requests that waited on the same flight", async () => {
    const answer = deferred<Renewal | null>();
    const { api, session, onEnded } = setup({ refresh: () => answer.promise });
    const boot = session.refresh();
    const request = settle(api.get("/a"));
    await vi.waitFor(() => expect(api.sent).toHaveLength(1));
    answer.reject(httpError(401));
    await expect(boot).resolves.toEqual({ result: "ended" });
    await request;
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it("a throw from store is the app's bug: the waiting request and session.refresh() reject with it", async () => {
    const bug = new Error("store broke");
    const { api, session } = setup({
      store: () => {
        throw bug;
      },
    });
    await expect(api.get("/a")).rejects.toBe(bug);
    await expect(session.refresh()).rejects.toBe(bug);
  });

  it("resolves transient, storing nothing", async () => {
    const { session, store, onEnded } = setup({ refresh: () => Promise.reject(httpError(400)) });
    await expect(session.refresh()).resolves.toEqual({ result: "transient" });
    expect(store).not.toHaveBeenCalled();
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("resolves changed when the session changed while it ran, storing nothing", async () => {
    const answer = deferred<Renewal | null>();
    const { session, store, app } = setup({ refresh: () => answer.promise, token: null });
    const boot = session.refresh();
    app.token = "t7"; // signed in on the form meanwhile
    answer.resolve({ token: "t2" });
    await expect(boot).resolves.toEqual({ result: "changed" });
    expect(store).not.toHaveBeenCalled();
    expect(app.token).toBe("t7");
  });
});

describe("attachSessionRefresh", () => {
  it("passes any other status through untouched", async () => {
    const refresh = vi.fn(async () => ({ token: "t2" }));
    const api = fakeAxios(() => 403);
    attachSessionRefresh(
      api,
      createSessionRefresh({ refresh, store: vi.fn(), currentToken: () => "t1", isDemo: () => false, onEnded: vi.fn() }),
    );
    const r = await settle(api.get("/a"));
    expect(r.ok ? 0 : r.error.response.status).toBe(403);
    expect(isTransientRefreshFailure(r.ok ? undefined : r.error)).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("detaches both interceptors", async () => {
    const { api, detach, refresh } = setup();
    detach();
    const r = await settle(api.get("/a"));
    expect(r.ok).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
    expect(api.sent[0]._sessionStamp).toBeUndefined();
  });

  it("a 401 to a config the kit never stamped (sent before it was attached) counts as current", async () => {
    const { api, refresh } = setup();
    const kit = api.interceptors.response.handlers[0]!;
    // No stamp and no URL: neither an older token nor a signed-out step.
    await expect(kit.err(httpError(401, { headers: {} }))).resolves.toMatchObject({ status: 200 });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("passes a request-side error on untouched", async () => {
    const { api } = setup();
    const kit = api.interceptors.request.handlers[1]!;
    const error = new Error("cancelled");
    await expect(kit.err(error)).rejects.toBe(error);
  });

  it("an empty token is no token: stamped null, like a signed-out request", async () => {
    const { api } = setup({ token: "" });
    await api.get("/a");
    expect(api.sent[0]._sessionStamp).toBeNull();
    expect(api.sent[1].headers?.Authorization).toBe("Bearer t2");
  });

  it("refuses a session it did not make", () => {
    expect(() => attachSessionRefresh(fakeAxios(() => 200), { refresh: async () => ({ result: "transient" as const }) })).toThrow(
      TypeError,
    );
  });

  it("sits after attachServerWake: the replay is counted afresh and the count returns to zero", async () => {
    const wake = createServerWake();
    const app = { token: "t1" as string | null };
    const api = fakeAxios((config) => (config.headers?.Authorization === "Bearer t2" ? 200 : 401));
    attachServerWake(api, wake);
    api.interceptors.request.use(
      (config) => ({ ...config, headers: { ...config.headers, Authorization: `Bearer ${app.token}` } }),
      (e) => Promise.reject(e),
    );
    attachSessionRefresh(
      api,
      createSessionRefresh({
        refresh: async () => ({ token: "t2" }),
        store: (r) => {
          app.token = r.token;
        },
        currentToken: () => app.token,
        isDemo: () => false,
        onEnded: vi.fn(),
      }),
    );
    await api.get("/a");
    expect(wake.getInFlight()).toBe(0);
  });
});
