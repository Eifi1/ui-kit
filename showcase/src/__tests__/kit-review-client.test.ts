import { createServerWake } from "@eifi1/ui-kit";
import {
  ATTEMPT_TIMEOUT_MS,
  REVIEW_BUDGET_MS,
  ReviewApiError,
  createReviewClient,
  detailOf,
  retryAfterMs,
} from "../kit-review/client";

/**
 * The kit review's client against a scripted fetch, on fake timers: the cold start it
 * exists for (gateway errors, a dropped connection, a container that holds the request),
 * the budget running out, the answers it must NOT repeat (401, 403, 422), and the abort
 * the page sends on unmount. And that the ServerWake watcher counts each call once, for
 * its whole life — so the "waking the server" notice survives the retries.
 */

const BASE = "https://api.test/api/v1/";
const LIST = { locales: ["fr"], areas: null, reviews: [] };

/** What fetch resolves to — only what the client reads. */
function reply(status: number, body: unknown = {}, headers: Record<string, string> = {}): Response {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return { status, text: async () => text, headers: new Headers(headers) } as unknown as Response;
}

type Step = Response | Error | "hang" | { after: number; then: Response };

/** A fetch that answers `steps` in order: a response, a rejection, a request that never
 *  answers (until its signal aborts), or a response after a delay (a container that
 *  holds the request while it starts). The last step repeats. */
function scripted(...steps: Step[]) {
  return vi.fn((_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const step = steps.length > 1 ? steps.shift()! : steps[0];
    const signal = init?.signal;
    const abortable = (start: (resolve: (r: Response) => void) => void) =>
      new Promise<Response>((resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("The operation was aborted.", "AbortError")));
        start(resolve);
      });
    if (step === "hang") return abortable(() => {});
    if (step instanceof Error) return Promise.reject(step);
    if ("after" in step) return abortable((resolve) => setTimeout(() => resolve(step.then), step.after));
    return Promise.resolve(step);
  });
}

const settle = <T>(promise: Promise<T>) =>
  promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error: error as ReviewApiError }),
  );

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("a cold start", () => {
  it("rides out two 503s and answers with the third attempt, counted once on the watcher", async () => {
    const fetch = scripted(reply(503), reply(503), reply(200, LIST));
    const watcher = createServerWake({ shouldWatch: () => true });
    const client = createReviewClient({ base: BASE, token: "abc", fetch, watcher });

    const result = settle(client.list());
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(watcher.getInFlight()).toBe(1);

    await vi.advanceTimersByTimeAsync(1000); // backoff 1 s
    expect(fetch).toHaveBeenCalledTimes(2);
    // Still ONE call in flight between attempts: the notice must not reset to idle.
    expect(watcher.getInFlight()).toBe(1);

    await vi.advanceTimersByTimeAsync(2000); // backoff 2 s
    expect(await result).toEqual({ ok: true, value: LIST });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(watcher.getInFlight()).toBe(0);

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.test/api/v1/translations/reviews");
    expect(init?.method).toBe("GET");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer abc");
    expect(init?.credentials).toBe("omit");
  });

  it("retries a network error (a gateway answer without CORS headers reads as one)", async () => {
    const fetch = scripted(new TypeError("Failed to fetch"), reply(200, LIST));
    const client = createReviewClient({ base: BASE, token: "abc", fetch });
    const result = settle(client.list());
    await vi.advanceTimersByTimeAsync(1000);
    expect(await result).toEqual({ ok: true, value: LIST });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("waits out a container that holds the request for 15 s — and the watcher says it is waking", async () => {
    const fetch = scripted({ after: 15_000, then: reply(200, LIST) });
    const watcher = createServerWake({ shouldWatch: () => true });
    const client = createReviewClient({ base: BASE, token: "abc", fetch, watcher });
    const result = settle(client.list());

    await vi.advanceTimersByTimeAsync(2500);
    expect(watcher.getStage()).toBe("slow");
    await vi.advanceTimersByTimeAsync(5000);
    expect(watcher.getStage()).toBe("waking");
    await vi.advanceTimersByTimeAsync(7500);
    expect(await result).toEqual({ ok: true, value: LIST });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(watcher.getStage()).toBe("idle");
  });

  it("honours Retry-After on a 429", async () => {
    const fetch = scripted(reply(429, {}, { "Retry-After": "5" }), reply(200, LIST));
    const client = createReviewClient({ base: BASE, token: "abc", fetch });
    const result = settle(client.list());
    await vi.advanceTimersByTimeAsync(4900);
    expect(fetch).toHaveBeenCalledTimes(1); // not the 1 s backoff
    await vi.advanceTimersByTimeAsync(100);
    expect(await result).toEqual({ ok: true, value: LIST });
  });
});

describe("the budget", () => {
  it("gives up with a clear error once 60 s of 503s are spent, and asks no more", async () => {
    const fetch = scripted(reply(503));
    const watcher = createServerWake({ shouldWatch: () => true });
    const client = createReviewClient({ base: BASE, token: "abc", fetch, watcher });
    const result = settle(client.list());

    await vi.advanceTimersByTimeAsync(REVIEW_BUDGET_MS);
    const outcome = await result;
    expect(outcome.ok).toBe(false);
    const error = (outcome as { error: ReviewApiError }).error;
    expect(error).toBeInstanceOf(ReviewApiError);
    expect(error.kind).toBe("unavailable");
    expect(error.message).toMatch(/did not answer within 60 s/);
    expect(error.message).toMatch(/503/);
    // 1 s, 2 s, 4 s, then 8 s apart: attempts at 0, 1, 3, 7, 15, 23, 31, 39, 47, 55 s.
    const attempts = fetch.mock.calls.length;
    expect(attempts).toBe(10);
    expect(watcher.getInFlight()).toBe(0);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetch).toHaveBeenCalledTimes(attempts);
  });

  it("cuts off an attempt that hangs, and the budget still bounds the call", async () => {
    const fetch = scripted("hang");
    const client = createReviewClient({ base: BASE, token: "abc", fetch });
    const result = settle(client.list());

    await vi.advanceTimersByTimeAsync(ATTEMPT_TIMEOUT_MS);
    const first = fetch.mock.calls[0][1]?.signal;
    expect(first?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(REVIEW_BUDGET_MS - ATTEMPT_TIMEOUT_MS);
    const outcome = await result;
    expect(outcome.ok).toBe(false);
    expect((outcome as { error: ReviewApiError }).error.kind).toBe("unavailable");
    // 0–25 s, 26–51 s, then 53–60 s: the last attempt gets only what is left.
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("gives up at once when Retry-After asks for longer than the budget has left", async () => {
    const fetch = scripted(reply(429, {}, { "Retry-After": "120" }), reply(200, LIST));
    const client = createReviewClient({ base: BASE, token: "abc", fetch });
    const outcome = await settle(client.list());
    expect(outcome.ok).toBe(false);
    expect((outcome as { error: ReviewApiError }).error.kind).toBe("unavailable");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("answers that are not repeated", () => {
  it("401: the token expired — one request, no retry", async () => {
    const fetch = scripted(reply(401, { detail: "Token expired" }), reply(200, LIST));
    const client = createReviewClient({ base: BASE, token: "old", fetch });
    const outcome = await settle(client.list());
    expect(outcome.ok).toBe(false);
    const error = (outcome as { error: ReviewApiError }).error;
    expect(error.kind).toBe("unauthorized");
    expect(error.status).toBe(401);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("403 on a write: the server's own refusal is the message", async () => {
    const fetch = scripted(reply(403, { detail: "You may not review 'it'" }));
    const client = createReviewClient({ base: BASE, token: "abc", fetch });
    const write = { locale: "it", key: "kit.common.close", text: "Chiudi", reference_text: "Close", verdict: "APPROVED" as const, note: null, suggestion: null };
    const outcome = await settle(client.save([write]));
    const error = (outcome as { error: ReviewApiError }).error;
    expect(error.kind).toBe("forbidden");
    expect(error.message).toBe("You may not review 'it'");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("422 and 500 are reported, not repeated", async () => {
    for (const status of [422, 500]) {
      const fetch = scripted(reply(status, { detail: [{ msg: "field required" }] }));
      const client = createReviewClient({ base: BASE, token: "abc", fetch });
      const error = ((await settle(client.list())) as { error: ReviewApiError }).error;
      expect(error.kind).toBe("http");
      expect(error.message).toBe(`keksdose answered ${status}: field required`);
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });
});

describe("abort", () => {
  it("stops between attempts — no further request, and the watcher lets go", async () => {
    const fetch = scripted(reply(503));
    const watcher = createServerWake({ shouldWatch: () => true });
    const client = createReviewClient({ base: BASE, token: "abc", fetch, watcher });
    const controller = new AbortController();
    const result = settle(client.list({ signal: controller.signal }));

    await vi.advanceTimersByTimeAsync(500); // in the 1 s backoff
    controller.abort();
    const outcome = await result;
    expect((outcome as { error: ReviewApiError }).error.kind).toBe("aborted");
    expect(watcher.getInFlight()).toBe(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("cancels the request in flight", async () => {
    const fetch = scripted("hang");
    const client = createReviewClient({ base: BASE, token: "abc", fetch });
    const controller = new AbortController();
    const result = settle(client.list({ signal: controller.signal }));
    await vi.advanceTimersByTimeAsync(3000);
    controller.abort();
    const outcome = await result;
    expect((outcome as { error: ReviewApiError }).error.kind).toBe("aborted");
    expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
});

describe("the routes", () => {
  it("PUTs the writes and POSTs the clear, as keksdose's router takes them", async () => {
    const stored = { locale: "fr", key: "kit.common.close", text: "Fermer", reference_text: "Close", verdict: "APPROVED", note: null, suggestion: null, reviewer_name: "R", reviewed_at: "2026-10-03T10:00:00Z" };
    const fetch = scripted(reply(200, { reviews: [stored] }), reply(200, { cleared: 1 }));
    const client = createReviewClient({ base: BASE, token: "abc", fetch });
    const write = { locale: "fr", key: "kit.common.close", text: "Fermer", reference_text: "Close", verdict: "APPROVED" as const, note: null, suggestion: null };

    expect(await client.save([write])).toEqual([stored]);
    expect(await client.clear([{ locale: "fr", key: "kit.common.close" }])).toBe(1);

    const [putUrl, put] = fetch.mock.calls[0];
    expect(putUrl).toBe("https://api.test/api/v1/translations/reviews");
    expect(put?.method).toBe("PUT");
    expect(JSON.parse(put?.body as string)).toEqual({ items: [write] });
    expect((put?.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    const [clearUrl, clear] = fetch.mock.calls[1];
    expect(clearUrl).toBe("https://api.test/api/v1/translations/reviews/clear");
    expect(clear?.method).toBe("POST");
    expect(JSON.parse(clear?.body as string)).toEqual({ items: [{ locale: "fr", key: "kit.common.close" }] });
  });

  it("pings /health without the token (public, and no CORS preflight)", async () => {
    const fetch = scripted(reply(200, { status: "ok", version: "0.4.60" }));
    const client = createReviewClient({ base: BASE, token: "abc", fetch });
    await client.health();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.test/api/v1/health");
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});

describe("helpers", () => {
  it("reads Retry-After as seconds or as a date", () => {
    expect(retryAfterMs("7")).toBe(7000);
    expect(retryAfterMs("Sat, 03 Oct 2026 10:00:30 GMT", Date.parse("2026-10-03T10:00:00Z"))).toBe(30_000);
    expect(retryAfterMs(null)).toBeUndefined();
    expect(retryAfterMs("soon")).toBeUndefined();
  });

  it("reads FastAPI's detail, a string or a 422 list", () => {
    expect(detailOf('{"detail":"No translation review access"}')).toBe("No translation review access");
    expect(detailOf('{"detail":[{"msg":"a"},{"msg":"b"}]}')).toBe("a; b");
    expect(detailOf("<html>Bad gateway</html>")).toBeUndefined();
  });
});
