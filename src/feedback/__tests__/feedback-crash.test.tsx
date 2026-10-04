import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "../../components/error-boundary";
import type { CrashReport } from "../../components/error-boundary";
import { createCrashReporter } from "../feedback-crash";
import type { CrashReportCreate, CrashReporterOptions } from "../feedback-crash";

/**
 * §4.6 of the feedback contract: the payload (§3.6 + origin/environment), the page
 * allow-list, "filed" only on `stored: true`, the buffer (no token, offline, 401/5xx;
 * bounded, deduplicated) and its flush, the app's opt-out and the hot-update grace.
 * No network: every reporter gets a `fetchImpl` stub.
 */

const KEY = "example.pendingCrashReports";
const ENDPOINT = "/api/v1/feedback/crash";

function crash(over: Partial<CrashReport> = {}): CrashReport {
  return {
    name: "TypeError",
    message: "x is undefined",
    stack: "TypeError: x is undefined\n    at Ledger (ledger.tsx:12:3)\n    at render (react.js:99:1)",
    componentStack: "\n    at Ledger\n    at Page",
    page: "/accounts?p=2&q=secret&f.payee=Example%20Ltd&sort=date#row-7",
    time: "2026-10-04T09:12:00.000Z",
    userAgent: "Example/1.0",
    appVersion: "0.4.26",
    placement: "page",
    online: true,
    chunkLoad: false,
    extras: { tenant: "000" },
    ...over,
  };
}

function answer(status: number, body: unknown, json = true): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: json ? () => Promise.resolve(body) : () => Promise.reject(new SyntaxError("not json")),
  } as unknown as Response;
}

const STORED = { stored: true, duplicate: false, feedback_id: 512, reference: "3fae6774" };

function setup(over: Partial<CrashReporterOptions> = {}, reply: () => Response | Promise<Response> = () => answer(202, STORED)) {
  const fetchImpl = vi.fn((..._args: Parameters<typeof fetch>) => Promise.resolve(reply()));
  let tok: string | null = "token-000";
  let demo = false;
  const reporter = createCrashReporter({
    endpoint: ENDPOINT,
    getToken: () => tok,
    allowParams: ["p", "ps", "sort", "tab"],
    storageKey: KEY,
    suppress: () => demo,
    environment: "dev",
    origin: "https://dev.example.test",
    fetchImpl: fetchImpl as unknown as typeof fetch,
    ...over,
  });
  return {
    reporter,
    fetchImpl,
    setToken: (t: string | null) => {
      tok = t;
    },
    setDemo: (d: boolean) => {
      demo = d;
    },
  };
}

function sent(fetchImpl: ReturnType<typeof setup>["fetchImpl"], call = 0): CrashReportCreate {
  return JSON.parse(String(fetchImpl.mock.calls[call][1]?.body)) as CrashReportCreate;
}

function pending(): CrashReportCreate[] {
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as CrashReportCreate[]) : [];
}

function setOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, get: () => online });
}

beforeEach(() => {
  localStorage.clear();
  setOnline(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setOnline(true);
});

describe("createCrashReporter — the payload", () => {
  it("posts §3.6 with origin and environment, the page reduced to the allow-list", async () => {
    const { reporter, fetchImpl } = setup();
    await reporter.onReport(crash());
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(init?.method).toBe("POST");
    expect(init?.keepalive).toBe(true);
    expect(init?.headers).toEqual({ "Content-Type": "application/json", Authorization: "Bearer token-000" });
    expect(sent(fetchImpl)).toEqual({
      name: "TypeError",
      message: "x is undefined",
      stack: "TypeError: x is undefined\n    at Ledger (ledger.tsx:12:3)\n    at render (react.js:99:1)",
      component_stack: "at Ledger\n    at Page",
      boundary: "page",
      url: "https://dev.example.test/accounts?p=2&sort=date",
      route: "/accounts",
      version: "0.4.26",
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      ua: "Example/1.0",
      online: true,
      occurred_at: "2026-10-04T09:12:00.000Z",
      origin: "https://dev.example.test",
      environment: "dev",
    });
  });

  it("maps placement: app stays app, anything else (or none) is page", async () => {
    const { reporter, fetchImpl } = setup();
    await reporter.onReport(crash({ placement: "app" }));
    await reporter.onReport(crash({ placement: "widget" }));
    await reporter.onReport(crash({ placement: undefined }));
    expect([0, 1, 2].map((i) => sent(fetchImpl, i).boundary)).toEqual(["app", "page", "page"]);
  });

  it("clamps every string to the server's caps and never sends an empty message", async () => {
    const { reporter, fetchImpl } = setup();
    await reporter.onReport(
      crash({
        name: "N".repeat(300),
        message: "   ",
        stack: "s".repeat(9000),
        componentStack: "",
        userAgent: "u".repeat(600),
        appVersion: "v".repeat(60),
        online: undefined,
      }),
    );
    const p = sent(fetchImpl);
    expect(p.name).toHaveLength(200);
    expect(p.message).toBe("(no message)");
    expect(p.stack).toHaveLength(8000);
    expect(p.component_stack).toBeNull();
    expect(p.ua).toHaveLength(500);
    expect(p.version).toHaveLength(50);
    expect(p.online).toBeNull();

    await reporter.onReport(crash({ message: "m".repeat(2500) }));
    expect(sent(fetchImpl, 1).message).toHaveLength(2000);
  });

  it("clamps origin to 200 and environment to 20, keksdose's CrashReportCreate caps", async () => {
    const { reporter, fetchImpl } = setup({ origin: `https://${"o".repeat(300)}.test`, environment: "e".repeat(40) });
    await reporter.onReport(crash());
    const p = sent(fetchImpl);
    expect(p.origin).toHaveLength(200);
    expect(p.environment).toBe("e".repeat(20));
  });

  it("takes version and origin from the options over the report and location", async () => {
    const { reporter, fetchImpl } = setup({ version: "9.9.9", origin: undefined, environment: "prod" });
    await reporter.onReport(crash());
    const p = sent(fetchImpl);
    expect(p.version).toBe("9.9.9");
    expect(p.origin).toBe(window.location.origin);
    expect(p.url).toBe(`${window.location.origin}/accounts?p=2&sort=date`);
    expect(p.environment).toBe("prod");
  });

  it("re-reduces the page even when the report was not redacted first", async () => {
    const { reporter, fetchImpl } = setup();
    await reporter.onReport(crash({ page: "/register?q=Example%20Ltd&row=41&tab=open" }));
    expect(sent(fetchImpl).url).toBe("https://dev.example.test/register?tab=open");
  });

  it("calls the injected fetch without a `this` (a browser fetch would throw Illegal invocation)", async () => {
    const seen: unknown[] = [];
    const fetchImpl = function (this: unknown) {
      seen.push(this);
      return Promise.resolve(answer(202, STORED));
    } as unknown as typeof fetch;
    const { reporter } = setup({ fetchImpl });
    await reporter.onReport(crash());
    expect(seen).toEqual([undefined]);
  });

  it("falls back to the global fetch, looked up at call time", async () => {
    const global = vi.fn(() => Promise.resolve(answer(202, STORED)));
    vi.stubGlobal("fetch", global);
    const { reporter } = setup({ fetchImpl: undefined });
    expect(await reporter.onReport(crash())).toEqual({ reference: "3fae6774" });
    expect(global).toHaveBeenCalledTimes(1);
  });
});

describe("createCrashReporter — redact", () => {
  it("keeps the pathname and the allowed params, drops the rest, the hash and nothing else", () => {
    const { reporter } = setup();
    const report = crash();
    const out = reporter.redact(report);
    expect(out.page).toBe("/accounts?p=2&sort=date");
    expect(out).toEqual({ ...report, page: "/accounts?p=2&sort=date" });
    expect(report.page).toContain("q=secret"); // the input is not mutated
  });

  it("drops every param when the allow-list is empty, and copies the list it was given", () => {
    const allow = ["p"];
    const { reporter } = setup({ allowParams: allow });
    allow.push("q");
    expect(reporter.redact(crash({ page: "/a?q=1&p=3" })).page).toBe("/a?p=3");
    expect(setup({ allowParams: [] }).reporter.redact(crash()).page).toBe("/accounts");
  });

  it("never throws, not even on a hostile report", () => {
    const { reporter } = setup();
    const hostile = new Proxy(crash(), {
      ownKeys() {
        throw new Error("no");
      },
    });
    expect(reporter.redact(hostile).page).toBe("");
    expect(reporter.redact(crash({ page: undefined as unknown as string })).page).toBe("/");
  });
});

describe("createCrashReporter — filed only on stored === true (§4.6)", () => {
  it("resolves the reference when stored with one, {} when stored without", async () => {
    expect(await setup().reporter.onReport(crash())).toEqual({ reference: "3fae6774" });
    const bare = setup({}, () => answer(202, { stored: true, reference: null }));
    expect(await bare.reporter.onReport(crash())).toEqual({});
  });

  it("a 202 stored:false (limiter, demo) is not filed and not buffered", async () => {
    const { reporter } = setup({}, () => answer(202, { stored: false }));
    expect(await reporter.onReport(crash())).toEqual({ filed: false });
    expect(pending()).toEqual([]);
  });

  it("a 2xx without `stored`, or without JSON, is no proof of a filing", async () => {
    expect(await setup({}, () => answer(202, { reference: "3fae6774" })).reporter.onReport(crash())).toEqual({
      filed: false,
    });
    expect(await setup({}, () => answer(202, null, false)).reporter.onReport(crash())).toEqual({ filed: false });
    expect(pending()).toEqual([]);
  });

  it("other 4xx are dropped; 401, 5xx and a network failure are buffered", async () => {
    expect(await setup({}, () => answer(422, { detail: [] })).reporter.onReport(crash())).toEqual({ filed: false });
    expect(pending()).toEqual([]);

    await setup({}, () => answer(401, {})).reporter.onReport(crash({ message: "first" }));
    await setup({}, () => answer(503, {})).reporter.onReport(crash({ message: "second" }));
    await setup({}, () => Promise.reject(new TypeError("Failed to fetch"))).reporter.onReport(
      crash({ message: "third" }),
    );
    expect(pending().map((p) => p.message)).toEqual(["first", "second", "third"]);
  });

  it("drives the kit ErrorBoundary: stored:false claims nothing, stored:true shows the reference", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const settle = () =>
      act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
    function Boom(): React.ReactNode {
      throw new TypeError("x is undefined");
    }

    ErrorBoundary.forgetReports();
    const refused = setup({}, () => answer(202, { stored: false }));
    const a = render(
      <ErrorBoundary onReport={refused.reporter.onReport} redact={refused.reporter.redact}>
        <Boom />
      </ErrorBoundary>,
    );
    await settle();
    expect(screen.queryByText(/reported/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Copy error report" })).toBeTruthy();
    a.unmount();

    ErrorBoundary.forgetReports();
    const stored = setup();
    render(
      <ErrorBoundary onReport={stored.reporter.onReport} redact={stored.reporter.redact}>
        <Boom />
      </ErrorBoundary>,
    );
    await settle();
    expect(screen.getByText("Reported as 3fae6774")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Copy error report" })).toBeNull();
  });
});

describe("createCrashReporter — what it never files", () => {
  it("a chunk-load error: no POST, no buffer", async () => {
    const { reporter, fetchImpl } = setup();
    expect(await reporter.onReport(crash({ chunkLoad: true }))).toEqual({ filed: false });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(pending()).toEqual([]);
  });

  it("the app's suppress() (demo sessions): no POST, no buffer; a throwing one does not opt out", async () => {
    const { reporter, fetchImpl, setDemo } = setup();
    setDemo(true);
    expect(await reporter.onReport(crash())).toEqual({ filed: false });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(pending()).toEqual([]);

    const throwing = setup({
      suppress: () => {
        throw new Error("store gone");
      },
    });
    expect(await throwing.reporter.onReport(crash())).toEqual({ reference: "3fae6774" });
  });

  it("a crash within 10 s of a hot update, said on the console", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { reporter, fetchImpl } = setup();
    reporter.noteHotUpdate();
    expect(await reporter.onReport(crash())).toEqual({ filed: false });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledTimes(1);

    reporter.noteHotUpdate(Date.now() - 10_001);
    expect(await reporter.onReport(crash())).toEqual({ reference: "3fae6774" });
  });

  it("never throws or rejects: a hostile report, a throwing fetch, a broken storage", async () => {
    const { reporter } = setup({
      fetchImpl: (() => {
        throw new Error("sync throw");
      }) as unknown as typeof fetch,
    });
    await expect(reporter.onReport(null as unknown as CrashReport)).resolves.toEqual({ filed: false });
    await expect(reporter.onReport(crash())).resolves.toEqual({ filed: false });
    expect(pending()).toHaveLength(1); // a sync throw is a network failure: buffered

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const offline = setup({ getToken: () => null });
    await expect(offline.reporter.onReport(crash({ message: "other" }))).resolves.toEqual({ filed: false });
    await expect(offline.reporter.flushPending()).resolves.toBeUndefined();
  });
});

describe("createCrashReporter — the buffer", () => {
  it("never assumes a token: nothing (or a throwing getToken) buffers without a POST", async () => {
    const { reporter, fetchImpl, setToken } = setup();
    setToken(null);
    expect(await reporter.onReport(crash({ message: "a" }))).toEqual({ filed: false });
    setToken("");
    await reporter.onReport(crash({ message: "b" }));
    const throwing = setup({
      getToken: () => {
        throw new Error("no store");
      },
    });
    await throwing.reporter.onReport(crash({ message: "c" }));
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(throwing.fetchImpl).not.toHaveBeenCalled();
    expect(pending().map((p) => p.message)).toEqual(["a", "b", "c"]);
  });

  it("buffers while offline even with a token, carrying online:false", async () => {
    const { reporter, fetchImpl } = setup();
    setOnline(false);
    await reporter.onReport(crash({ online: false }));
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(pending()).toHaveLength(1);
    expect(pending()[0].online).toBe(false);
    expect(pending()[0].url).toBe("https://dev.example.test/accounts?p=2&sort=date"); // redacted at rest too
  });

  it("keeps the newest three", async () => {
    const { reporter, setToken } = setup();
    setToken(null);
    for (const m of ["one", "two", "three", "four", "five"]) await reporter.onReport(crash({ message: m }));
    expect(pending().map((p) => p.message)).toEqual(["three", "four", "five"]);
  });

  it("keeps an identical crash once — the first copy, moved to the newest place", async () => {
    const { reporter, setToken } = setup();
    setToken(null);
    await reporter.onReport(crash({ message: "Row 123 missing", time: "2026-10-04T09:00:00.000Z" }));
    await reporter.onReport(crash({ message: "other" }));
    // Digits and hex runs fold like the server's fingerprint: the same defect.
    await reporter.onReport(crash({ message: "Row 456 missing", time: "2026-10-04T09:05:00.000Z" }));
    expect(pending().map((p) => [p.message, p.occurred_at])).toEqual([
      ["other", "2026-10-04T09:12:00.000Z"],
      ["Row 123 missing", "2026-10-04T09:00:00.000Z"],
    ]);
    // A loop of the same crash cannot push the others out.
    for (let i = 0; i < 5; i++) await reporter.onReport(crash({ message: `Row ${i} missing` }));
    expect(pending()).toHaveLength(2);
  });

  it("never merges what the server would file apart: another route, version or error", async () => {
    const { reporter, setToken } = setup();
    setToken(null);
    await reporter.onReport(crash());
    await reporter.onReport(crash({ page: "/budgets" }));
    await reporter.onReport(crash({ appVersion: "0.4.27" }));
    expect(pending()).toHaveLength(3);
    await reporter.onReport(crash({ placement: "app" })); // the server ignores the boundary
    expect(pending()).toHaveLength(3);
  });

  it("ignores a corrupt buffer", async () => {
    localStorage.setItem(KEY, "{not json");
    const { reporter, setToken } = setup();
    setToken(null);
    await reporter.onReport(crash());
    expect(pending()).toHaveLength(1);
    localStorage.setItem(KEY, JSON.stringify([null, 3, { message: "" }, ...pending()]));
    await reporter.onReport(crash()); // the same crash again: the junk goes on this write
    expect(pending()).toHaveLength(1);
  });
});

describe("createCrashReporter — flushPending", () => {
  async function bufferThree(r: ReturnType<typeof setup>) {
    r.setToken(null);
    for (const m of ["one", "two", "three"]) await r.reporter.onReport(crash({ message: m }));
    r.setToken("token-000");
  }

  it("sends the buffer once a token is there, in order, and empties it", async () => {
    const r = setup();
    await bufferThree(r);
    await r.reporter.flushPending();
    expect(r.fetchImpl).toHaveBeenCalledTimes(3);
    expect([0, 1, 2].map((i) => sent(r.fetchImpl, i).message)).toEqual(["one", "two", "three"]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("keeps the buffer while there is no token, the app suppresses, or the browser is offline", async () => {
    const r = setup();
    await bufferThree(r);
    r.setToken(null);
    await r.reporter.flushPending();
    r.setToken("token-000");
    r.setDemo(true);
    await r.reporter.flushPending();
    r.setDemo(false);
    setOnline(false);
    await r.reporter.flushPending();
    expect(r.fetchImpl).not.toHaveBeenCalled();
    expect(pending()).toHaveLength(3);
  });

  it("drops what the server refuses for good (stored:false, 4xx)", async () => {
    let n = 0;
    const replies = [answer(202, { stored: false }), answer(422, {}), answer(202, STORED)];
    const r = setup({}, () => replies[n++]);
    await bufferThree(r);
    await r.reporter.flushPending();
    expect(r.fetchImpl).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("stops at the first 401 / 5xx / network failure and keeps it and the rest", async () => {
    let n = 0;
    const replies = [() => answer(202, STORED), () => answer(401, {})];
    const r = setup({}, () => replies[Math.min(n++, 1)]());
    await bufferThree(r);
    await r.reporter.flushPending();
    expect(r.fetchImpl).toHaveBeenCalledTimes(2);
    expect(pending().map((p) => p.message)).toEqual(["two", "three"]);
  });

  it("runs one flush at a time and keeps a crash that buffered meanwhile", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const r = setup({}, async () => {
      await gate;
      return answer(503, {});
    });
    await bufferThree(r);
    const first = r.reporter.flushPending();
    const second = r.reporter.flushPending();
    expect(second).toBe(first);
    // A boot-time crash while the start-up flush waits on the server.
    r.setToken(null);
    await r.reporter.onReport(crash({ message: "during" }));
    release();
    await first;
    expect(r.fetchImpl).toHaveBeenCalledTimes(1);
    expect(pending().map((p) => p.message)).toEqual(["two", "three", "during"]);
  });
});
