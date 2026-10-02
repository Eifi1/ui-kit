import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { attachServerWake, createServerWake, watchReadsAnd, wrapFetch } from "../server-wake";
import type { ServerWakeAxiosConfig } from "../server-wake";

/**
 * keksdose's cold-start watchdog (feedback #199), now the kit's. What has to hold: it
 * escalates idle → slow (2 s) → waking (7 s) from the FIRST outstanding request, goes
 * back to idle only when the LAST one settles, never counts below zero, and never
 * arms while offline — a stuck notice is worse than none.
 */

function setOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, get: () => online });
}

beforeEach(() => {
  vi.useFakeTimers();
  setOnline(true);
});
afterEach(() => {
  vi.useRealTimers();
  setOnline(true);
});

describe("createServerWake", () => {
  it("escalates idle → slow at 2 s → waking at 7 s, and resets when the request settles", () => {
    const w = createServerWake();
    expect(w.start("get", "/budgets")).toBe(true);
    expect(w.getStage()).toBe("idle");
    vi.advanceTimersByTime(1999);
    expect(w.getStage()).toBe("idle");
    vi.advanceTimersByTime(1);
    expect(w.getStage()).toBe("slow");
    vi.advanceTimersByTime(4999);
    expect(w.getStage()).toBe("slow");
    vi.advanceTimersByTime(1);
    expect(w.getStage()).toBe("waking");
    w.end();
    expect(w.getStage()).toBe("idle");
    // The timers are gone with it: nothing fires later.
    vi.advanceTimersByTime(10_000);
    expect(w.getStage()).toBe("idle");
  });

  it("takes custom timings", () => {
    const w = createServerWake({ slowMs: 100, wakingMs: 300 });
    w.start();
    vi.advanceTimersByTime(100);
    expect(w.getStage()).toBe("slow");
    vi.advanceTimersByTime(200);
    expect(w.getStage()).toBe("waking");
  });

  it("a request answered before 2 s never shows anything", () => {
    const w = createServerWake();
    const listener = vi.fn();
    w.subscribe(listener);
    w.start("GET", "/x");
    vi.advanceTimersByTime(1500);
    w.end();
    vi.advanceTimersByTime(10_000);
    expect(w.getStage()).toBe("idle");
    expect(listener).not.toHaveBeenCalled();
  });

  it("times overlapping requests from the first, and waits for the last", () => {
    const w = createServerWake();
    w.start("get", "/a");
    vi.advanceTimersByTime(1500);
    w.start("get", "/b"); // does not restart the clock
    vi.advanceTimersByTime(500);
    expect(w.getStage()).toBe("slow");
    expect(w.getInFlight()).toBe(2);
    w.end();
    expect(w.getStage()).toBe("slow");
    vi.advanceTimersByTime(5000);
    expect(w.getStage()).toBe("waking");
    w.end();
    expect(w.getStage()).toBe("idle");
    expect(w.getInFlight()).toBe(0);
  });

  it("never counts below zero — a stray end() does not eat the next request", () => {
    const w = createServerWake();
    w.end();
    w.end();
    expect(w.getInFlight()).toBe(0);
    w.start("get", "/x");
    expect(w.getInFlight()).toBe(1);
    vi.advanceTimersByTime(2000);
    expect(w.getStage()).toBe("slow");
  });

  it("does not arm while the browser is offline", () => {
    const w = createServerWake();
    setOnline(false);
    expect(w.start("get", "/x")).toBe(false);
    vi.advanceTimersByTime(10_000);
    expect(w.getStage()).toBe("idle");
    expect(w.getInFlight()).toBe(0);
  });

  it("the offline guard holds whatever shouldWatch says", () => {
    const w = createServerWake({ shouldWatch: () => true });
    setOnline(false);
    expect(w.start("post", "/upload")).toBe(false);
  });

  it("watches GETs by default (and a request without a method), not writes", () => {
    const w = createServerWake();
    expect(w.start(undefined, "/x")).toBe(true);
    expect(w.start("GET", "/x")).toBe(true);
    expect(w.start("post", "/auth/login")).toBe(false);
    expect(w.start("post", "/statements/upload")).toBe(false);
    expect(w.getInFlight()).toBe(2);
  });

  it("watchReadsAnd adds the gating writes — and nothing else", () => {
    const w = createServerWake({ shouldWatch: watchReadsAnd(/\/auth\/(login|register)\b/) });
    expect(w.start("post", "/auth/login")).toBe(true);
    expect(w.start("POST", "/api/v1/auth/register")).toBe(true);
    expect(w.start("post", "/auth/refresh")).toBe(false);
    expect(w.start("post", "/statements/upload")).toBe(false);
  });

  it("notifies subscribers on stage changes only, and unsubscribes", () => {
    const w = createServerWake();
    const listener = vi.fn();
    const off = w.subscribe(listener);
    w.start();
    w.start(); // no stage change
    vi.advanceTimersByTime(2000);
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    vi.advanceTimersByTime(5000);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("reset() returns to a pristine watchdog", () => {
    const w = createServerWake();
    w.start();
    vi.advanceTimersByTime(7000);
    w.reset();
    expect(w.getStage()).toBe("idle");
    expect(w.getInFlight()).toBe(0);
    vi.advanceTimersByTime(10_000);
    expect(w.getStage()).toBe("idle");
  });
});

describe("track()", () => {
  it("counts the promise until it resolves, and passes its value on", async () => {
    const w = createServerWake();
    let resolve!: (v: number) => void;
    const result = w.track(new Promise<number>((r) => (resolve = r)), { method: "get", url: "/x" });
    vi.advanceTimersByTime(2000);
    expect(w.getStage()).toBe("slow");
    resolve(42);
    await expect(result).resolves.toBe(42);
    expect(w.getStage()).toBe("idle");
    expect(w.getInFlight()).toBe(0);
  });

  it("ends the wait on a rejection too, and passes the error on", async () => {
    const w = createServerWake();
    let reject!: (e: Error) => void;
    const result = w.track(() => new Promise<never>((_, r) => (reject = r)));
    vi.advanceTimersByTime(7000);
    expect(w.getStage()).toBe("waking");
    reject(new Error("502"));
    await expect(result).rejects.toThrow("502");
    expect(w.getStage()).toBe("idle");
    expect(w.getInFlight()).toBe(0);
  });

  it("a thunk that throws synchronously is settled, not leaked", async () => {
    const w = createServerWake();
    const result = w.track(() => {
      throw new Error("boom");
    });
    await expect(result).rejects.toThrow("boom");
    expect(w.getInFlight()).toBe(0);
  });

  it("an unwatched request is passed through uncounted", async () => {
    const w = createServerWake();
    const result = w.track(Promise.resolve("ok"), { method: "post", url: "/upload" });
    expect(w.getInFlight()).toBe(0);
    await expect(result).resolves.toBe("ok");
    expect(w.getInFlight()).toBe(0);
  });
});

/** A minimal axios: interceptor managers with `use`/`eject`, run in axios's order. */
function fakeAxios() {
  type Cfg = ServerWakeAxiosConfig & Record<string, unknown>;
  type Res = { config: Cfg; status: number };
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
  return {
    interceptors: { request, response },
    /** `gate`: the network, held open until the test lets it answer. */
    async send(config: Cfg, outcome: "ok" | "fail", gate?: Promise<void>) {
      let cfg = config;
      for (const h of request.handlers) if (h) cfg = await h.ok(cfg);
      await gate;
      if (outcome === "ok") {
        let res: Res = { config: cfg, status: 200 };
        for (const h of response.handlers) if (h) res = await h.ok(res);
        return res;
      }
      let err: unknown = Object.assign(new Error("Network Error"), { config: cfg });
      for (const h of response.handlers) {
        if (!h) continue;
        try {
          return await h.err(err);
        } catch (e) {
          err = e;
        }
      }
      throw err;
    },
  };
}

describe("attachServerWake (axios)", () => {
  it("counts a GET on the way out and ends it on the response", async () => {
    const w = createServerWake();
    const api = fakeAxios();
    attachServerWake(api, w);
    let answer!: () => void;
    const sent = api.send({ method: "get", url: "/budgets" }, "ok", new Promise<void>((r) => (answer = r)));
    await vi.waitFor(() => expect(w.getInFlight()).toBe(1));
    answer();
    await sent;
    expect(w.getInFlight()).toBe(0);
  });

  it("ends it on an error too, re-rejecting the error", async () => {
    const w = createServerWake();
    const api = fakeAxios();
    attachServerWake(api, w);
    await expect(api.send({ method: "get", url: "/x" }, "fail")).rejects.toThrow("Network Error");
    expect(w.getInFlight()).toBe(0);
  });

  it("an unwatched upload is never counted, so nothing is ended for it", async () => {
    const w = createServerWake();
    const api = fakeAxios();
    attachServerWake(api, w);
    w.start("get", "/other"); // a request in flight elsewhere
    await api.send({ method: "post", url: "/statements/upload" }, "ok");
    expect(w.getInFlight()).toBe(1);
  });

  it("a replayed config (a 401 retry) is counted afresh, and the pairing stays balanced", async () => {
    const w = createServerWake();
    const api = fakeAxios();
    attachServerWake(api, w);
    const config = { method: "get", url: "/x" };
    await expect(api.send(config, "fail")).rejects.toThrow();
    await api.send(config, "ok");
    expect(w.getInFlight()).toBe(0);
  });

  it("detaches", async () => {
    const w = createServerWake();
    const api = fakeAxios();
    const detach = attachServerWake(api, w);
    detach();
    const sent = api.send({ method: "get", url: "/x" }, "ok");
    expect(w.getInFlight()).toBe(0);
    await sent;
  });
});

describe("wrapFetch", () => {
  it("counts a GET until the response arrives", async () => {
    const w = createServerWake();
    let resolve!: (r: Response) => void;
    const inner = vi.fn(() => new Promise<Response>((r) => (resolve = r)));
    const apiFetch = wrapFetch(inner as unknown as typeof fetch, w);
    const pending = apiFetch("/api/v1/curves");
    expect(w.getInFlight()).toBe(1);
    resolve(new Response("{}"));
    await pending;
    expect(w.getInFlight()).toBe(0);
    expect(inner).toHaveBeenCalledWith("/api/v1/curves", undefined);
  });

  it("reads the method from init, and leaves a POST alone by default", async () => {
    const w = createServerWake();
    const apiFetch = wrapFetch(vi.fn(() => Promise.resolve(new Response())) as unknown as typeof fetch, w);
    const pending = apiFetch("/upload", { method: "POST" });
    expect(w.getInFlight()).toBe(0);
    await pending;
  });

  it("ends the wait when fetch rejects", async () => {
    const w = createServerWake();
    const apiFetch = wrapFetch(vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))) as unknown as typeof fetch, w);
    await expect(apiFetch(new URL("http://localhost/x"))).rejects.toThrow("Failed to fetch");
    expect(w.getInFlight()).toBe(0);
  });
});
