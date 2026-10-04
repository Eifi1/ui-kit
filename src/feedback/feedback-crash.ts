import { crashFingerprint } from "../components/error-boundary";
import type { CrashReport } from "../components/error-boundary";
import type { FeedbackEnvironment } from "./feedback-record";

/**
 * Crash auto-filing, the client half — §4.6 of the feedback contract
 * (docs/feedback-harmonization.md), lifted from keksdose's
 * `frontend/src/shared/lib/crash-report.ts` (feedback #160).
 *
 * Until #160 keksdose had no telemetry at all: a render crash was one `console.error`
 * that died with the tab, and live 0.4.26 crashed deterministically on /accounts for a
 * real user without anybody finding out. kastlan and Kurvenschmiede still file nothing
 * (contract §1). The kit's `ErrorBoundary` already owns the screen, the hostile-throw
 * normalisation, the per-page-load dedupe and cap, and the chunk-load test; this module
 * is the other half every app was going to write again — the POST, the buffer and the
 * page redaction — so the three apps keep only what only they know: the endpoint, the
 * token, the demo check and which query params may leave the device.
 *
 * Two rules outrank everything else, both keksdose's:
 *
 * 1. **It never throws.** It runs inside a boundary that has already caught a crash; a
 *    reporter that throws takes the fallback down with it and the user gets the white
 *    screen the boundary exists to prevent. Every function below ends in a `catch`.
 * 2. **Structure, never content.** Nothing the user typed may go into a report — see
 *    {@link CrashReporter.redact}, which rebuilds the query string from an allow-list.
 *
 * One fix over keksdose: a report counts as filed **only when the server answered
 * `stored: true`**. keksdose keys on `res.ok` + `reference` (kk `crash-report.ts:253-255`,
 * `:325`), so its server's `202 { stored: false }` — the 20-an-hour limiter, a demo user
 * — resolved `{}`, and the kit fallback said "This error has been reported
 * automatically." for a report that was dropped (contract §4.6).
 */

/** How many undeliverable reports wait in storage — the newest ones. A device stuck in a
 *  crash loop while offline would otherwise fill `localStorage` with copies of one stack
 *  (kk `crash-report.ts:37-39`, `MAX_PENDING = 3`). */
const MAX_PENDING = 3;

/** How long after a Vite hot update a crash is taken for its fallout (kk
 *  `crash-report.ts:76-79`): long enough for the re-render the update triggers, short
 *  enough that a crash the developer causes by clicking a minute later is still filed. */
const HOT_UPDATE_GRACE_MS = 10_000;

/**
 * `POST /feedback/crash`'s body — `CrashReportCreate`, §3.6 (kk `schemas/feedback.py`),
 * including the optional `origin` and `environment` the server copies into the row's
 * `context`, so a dev crash no longer reads as prod and the admin list shows its env
 * chip (§3.2).
 *
 * Every string is clamped to the server's column width before it is sent: one character
 * over a `max_length` used to come back 422 and the report was lost (kk
 * `crash-report.ts:104-106`) — the diagnostics are worth more truncated than not
 * delivered. Empty strings are sent as `null`.
 */
export interface CrashReportCreate {
  /** The thrown value's `name`, ≤ 200. */
  name: string | null;
  /** 1–2000; `"(no message)"` when the error had none. */
  message: string;
  /** ≤ 8000 each. */
  stack: string | null;
  component_stack: string | null;
  /** The boundary's `placement`: `"app"` stays `"app"`, anything else is `"page"`. */
  boundary: "app" | "page";
  /** `origin` + the redacted page, ≤ 2000. */
  url: string | null;
  /** The redacted page's pathname, ≤ 500. */
  route: string | null;
  /** ≤ 50 each. */
  version: string | null;
  viewport: string | null;
  /** ≤ 500. */
  ua: string | null;
  online: boolean | null;
  /** ISO 8601, UTC — when it crashed, not when a buffered copy was finally sent. */
  occurred_at: string;
  /** `location.origin` — which copy of the app (§3.2). ≤ 200. */
  origin: string | null;
  /** `"prod"` / `"dev"` / `"local"` (§3.2) — the app's `environment` option. ≤ 20. */
  environment: string | null;
}

/** `POST /feedback/crash`'s answer — always a 202 (§3.6). Only `stored` decides. */
export interface CrashReportResponse {
  /** `false` when the server dropped it on purpose: the limiter, a demo user. */
  stored: boolean;
  /** `true` when it was counted onto an open row with the same fingerprint. */
  duplicate?: boolean;
  feedback_id?: number | null;
  /** The fingerprint's first 8 characters, for the user to quote. */
  reference?: string | null;
}

/**
 * What {@link CrashReporter.onReport} resolves with — the kit `ErrorBoundary`'s
 * `CrashReportResult`, narrowed to the three answers the fallback tells apart:
 *
 * - **filed with a reference** — `{ reference: "3fae6774" }`: the server stored it
 *   (`stored === true`) and named it; the screen says "Reported as 3fae6774" and drops
 *   the copy button;
 * - **filed** — `{}`: stored, but the server gave no reference; the screen says "This
 *   error has been reported automatically.";
 * - **not filed** — `{ filed: false }`: suppressed by the app (`suppress`, a hot
 *   update, a chunk-load error), refused by the server (`stored: false`, a 4xx), or
 *   buffered for later (offline, signed out, 401, 5xx, no network). The screen claims
 *   nothing and keeps the copy button.
 *
 * Code that reads it outside a boundary: filed is `result.filed !== false`.
 */
export type CrashFiling = { reference?: string } | { filed: false };

export interface CrashReporterOptions {
  /** The app's crash route, e.g. `${API_BASE}/feedback/crash` (§3.3). */
  endpoint: string;
  /**
   * The bearer token, read at the moment of filing — **never assumed to exist**. Nothing
   * (`null`, `undefined`, `""`) means signed out, or not yet signed in again (kastlan
   * keeps its access token in memory, so it is `null` at start-up until the refresh
   * lands): the report is buffered and {@link CrashReporter.flushPending} sends it once
   * a token appears.
   *
   * Must not touch React — no hooks, no context: it runs from a component that is
   * mid-crash. Read storage or a store's `getState()` (kk `crash-report.ts:175-181`).
   * A throw reads as "no token".
   */
  getToken: () => string | null | undefined;
  /**
   * The query params a report may keep — the app's ALLOW-list (§4.6). Everything else
   * is dropped, so a param added later stays out until somebody decides otherwise.
   * keksdose's: `p ps sort tab g granularity month preset from to tstate future
   * archived uncleared` (kk `crash-report.ts:136-151`) — what locates a render crash
   * (paging, sort, range, grouping), never `q` (free text), `f.*` (filters holding
   * payee names) or ids (`row`, `action`). Copied when the reporter is made.
   */
  allowParams: Iterable<string>;
  /** The `localStorage` key undeliverable reports wait under — one per app, e.g.
   *  keksdose's `"keksdose.pendingCrashReports"` (kk `crash-report.ts:35`). */
  storageKey: string;
  /**
   * The app's own opt-out: `true` files nothing and buffers nothing — keksdose's demo
   * sessions (kk `crash-report.ts:183-193`; its server answers `stored: false` for them
   * anyway). Asked at filing time and again before a flush, which keeps the buffer
   * while it says `true`. Must not touch React; a throw reads as `false`. Optional:
   * kastlan has no demo users.
   */
  suppress?: () => boolean;
  /** The deploy environment, copied into every report (§3.2; kk
   *  `app/deploy-environment.ts`). */
  environment: FeedbackEnvironment | (string & {});
  /** Which copy of the app — default `location.origin` at filing time. */
  origin?: string;
  /** The app build — default the boundary's `appVersion` prop, as the report carries it. */
  version?: string;
  /** The `fetch` to post with — default the global one, looked up at each call. For
   *  tests (no network) and for an app whose `fetch` is wrapped. */
  fetchImpl?: typeof fetch;
}

/** What {@link createCrashReporter} returns. Every member is a free function (no
 *  `this`), safe to pass as a prop or a listener as it stands. */
export interface CrashReporter {
  /**
   * The boundary's `onReport`: file one crash and say how it went ({@link CrashFiling}).
   * Never throws, never rejects.
   *
   * The report arrives already `redact`ed when this reporter's `redact` is the
   * boundary's too; the page is reduced again here anyway, because the allow-list is
   * the one thing this channel must never get wrong (kk `crash-report.ts:273-276`).
   */
  onReport: (report: CrashReport) => Promise<CrashFiling>;
  /**
   * The boundary's `redact`: the report with its page reduced to the pathname and the
   * allowed query params (no hash). The screen's details and the copy button — whose
   * text ends up pasted into a feedback message — then show the same reduced page as the
   * POST (kk `crash-report.ts:114-135`). `extras` are the app's own and pass unchanged.
   */
  redact: (report: CrashReport) => CrashReport;
  /**
   * Send the buffered reports. Call it at start-up and whenever a token appears (kk
   * `main.tsx:59-61`). One flush at a time — a second call while one runs joins it.
   * Keeps the buffer while there is no token, the app suppresses, or the browser is
   * offline; stops at the first 401/5xx/network failure and keeps the rest. Never
   * rejects.
   */
  flushPending: () => Promise<void>;
  /**
   * Note that Vite has just applied a hot update: a crash within 10 s of one is HMR
   * fallout (a module re-executed under a live React tree), not the app's bug, and is
   * not filed (kk `crash-report.ts:56-102`; eight rows across five keksdose feedback
   * runs were exactly this). Dev only by construction — a production build has no
   * `import.meta.hot` to call it from. The kit cannot listen itself (a pre-bundled
   * dependency sees no `import.meta.hot`), so the app wires both events:
   *
   * ```ts
   * if (import.meta.hot) {
   *   import.meta.hot.on("vite:beforeUpdate", () => crashReporter.noteHotUpdate());
   *   import.meta.hot.on("vite:afterUpdate", () => crashReporter.noteHotUpdate());
   * }
   * ```
   */
  noteHotUpdate: (at?: number) => void;
}

const NOT_FILED: CrashFiling = Object.freeze({ filed: false as const });

/** Trimmed and cut to `max`; `null` for a non-string or an empty one. */
function clamp(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/** The page as `pathname?allowed=params` — never anything else. */
function reducePage(page: unknown, allow: ReadonlySet<string>): string {
  const raw = typeof page === "string" ? page : "";
  try {
    // The base only lets a path parse; it never leaves this function.
    const url = new URL(raw, "http://localhost");
    const kept = new URLSearchParams();
    for (const [key, value] of url.searchParams) {
      if (allow.has(key)) kept.append(key, value);
    }
    const query = kept.toString();
    return `${url.pathname}${query ? `?${query}` : ""}`;
  } catch {
    // A page that will not parse still has a pathname worth having (kk `:163-167`).
    return raw.split(/[?#]/)[0];
  }
}

/** The server's message normalisation (kk `feedback_service.py` `_normalise`): hex runs
 *  of 6 or more first, then digit runs, to `#`; whitespace collapsed. */
function normalise(text: string): string {
  return text
    .replace(/\b[0-9a-fA-F]{6,}\b/g, "#")
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * "The same crash again" in the buffer: the kit boundary's {@link crashFingerprint}
 * (name, message, top frames) over the server's normalised message and first three
 * normalised stack lines, plus the version and route — the server's own identity
 * (§3.6) without the user, who is whoever signs in to flush. Placement is left out, as
 * the server leaves it out: two copies that differ only in it end up as one row anyway.
 * Never coarser than the server's key, so the buffer never merges two crashes the server
 * would have filed apart.
 */
function bufferKey(p: CrashReportCreate): string {
  const frames = (p.stack ?? "").split("\n").slice(0, 3).map(normalise).join("\n");
  const crash = crashFingerprint({ name: p.name ?? "", message: normalise(p.message), stack: frames });
  return `${p.version ?? ""}::${p.route ?? ""}::${crash}`;
}

/**
 * The buffer, deduplicated and bounded: one entry per {@link bufferKey}, the FIRST
 * occurrence kept (its `occurred_at` is when the bug first hit) but moved to the position
 * of the latest, so a crash that keeps recurring is the last to be evicted; then the
 * newest {@link MAX_PENDING}.
 */
function compact(list: CrashReportCreate[]): CrashReportCreate[] {
  const first = new Map<string, CrashReportCreate>();
  const last = new Map<string, number>();
  list.forEach((p, i) => {
    const key = bufferKey(p);
    if (!first.has(key)) first.set(key, p);
    last.set(key, i);
  });
  return [...last.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([key]) => first.get(key) as CrashReportCreate)
    .slice(-MAX_PENDING);
}

function isPayload(value: unknown): value is CrashReportCreate {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<CrashReportCreate>;
  return typeof p.message === "string" && p.message !== "" && typeof p.occurred_at === "string";
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // private mode / storage disabled
  }
}

function isOffline(): boolean {
  try {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  } catch {
    return false;
  }
}

function viewport(): string | null {
  try {
    return `${window.innerWidth}x${window.innerHeight}`;
  } catch {
    return null;
  }
}

function currentOrigin(): string {
  try {
    const origin = globalThis.location?.origin;
    return typeof origin === "string" && origin !== "null" ? origin : "";
  } catch {
    return "";
  }
}

type PostResult = { filed: true; reference?: string } | { filed: false; retry: boolean };

/**
 * Make the crash filer for one app — §4.6, the kit's half of keksdose's
 * `shared/lib/crash-report.ts`. Hand the result to both boundaries (`placement="app"`
 * at the root, `"page"` in the layout):
 *
 * ```tsx
 * export const crashReporter = createCrashReporter({
 *   endpoint: `${API_BASE}/feedback/crash`,
 *   getToken: () => localStorage.getItem("auth_token"),
 *   allowParams: ["p", "ps", "sort", "tab"],
 *   storageKey: "myapp.pendingCrashReports",
 *   suppress: () => useAuth.getState().user?.is_demo === true,
 *   environment: deployEnvironment(),
 * });
 *
 * <ErrorBoundary placement="page" appVersion={APP_VERSION}
 *   redact={crashReporter.redact} onReport={crashReporter.onReport}>
 *
 * // start-up, and whenever a token appears (kk main.tsx:59-61)
 * void crashReporter.flushPending();
 * useAuth.subscribe((s, prev) => { if (s.token && !prev.token) void crashReporter.flushPending(); });
 * ```
 *
 * What it sends: §3.6's `CrashReportCreate` ({@link CrashReportCreate}) with `origin`
 * and `environment`, clamped to the server's caps. How: a bare `fetch` with `keepalive`
 * and the bearer token — **not the app's axios client**, whose 401 handler would log the
 * user out of a page that has just crashed (kk `crash-report.ts:222-235`), and
 * `keepalive` so the request survives the Reload the user is about to press.
 *
 * When it files nothing (resolving `{ filed: false }`):
 * - a chunk-load error (the boundary already withholds those) — a deploy or a dropped
 *   connection, not a defect;
 * - `suppress()` says so (demo sessions), or a hot update landed under 10 s ago;
 * - the server answered `stored: false` (limiter, demo) or a 4xx other than 401 —
 *   dropped, never retried: the server will never take that payload.
 *
 * When it buffers (also `{ filed: false }` — not filed *yet*): offline, no token,
 * 401, 5xx, or no network. Up to 3 reports wait under `storageKey`, the newest kept,
 * identical crashes kept once (see `bufferKey`); {@link CrashReporter.flushPending}
 * sends them. A signed-out visitor's crash waits for a sign-in — there is no
 * unauthenticated crash endpoint (Kurvenschmiede's public pages; accepted, §4.6).
 */
export function createCrashReporter(options: CrashReporterOptions): CrashReporter {
  const { endpoint, getToken, storageKey, suppress, environment } = options;
  const allow: ReadonlySet<string> = new Set(options.allowParams);
  let lastHotUpdateAt = 0;
  let flushing: Promise<void> | null = null;

  function token(): string | null {
    try {
      const t = getToken();
      return typeof t === "string" && t !== "" ? t : null;
    } catch {
      return null;
    }
  }

  function suppressed(): boolean {
    try {
      return suppress?.() === true;
    } catch {
      // keksdose's rule (`isDemoSession`): an opt-out that cannot answer does not opt
      // out — the server suppresses demo users itself.
      return false;
    }
  }

  function readPending(): CrashReportCreate[] {
    try {
      const raw = storage()?.getItem(storageKey);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isPayload) : [];
    } catch {
      return [];
    }
  }

  function writePending(list: CrashReportCreate[]): void {
    try {
      const store = storage();
      if (!store) return;
      const kept = compact(list);
      if (kept.length === 0) store.removeItem(storageKey);
      else store.setItem(storageKey, JSON.stringify(kept));
    } catch {
      /* best effort: a report that cannot be buffered is lost */
    }
  }

  function buffer(payload: CrashReportCreate): void {
    writePending([...readPending(), payload]);
  }

  async function post(payload: CrashReportCreate, bearer: string): Promise<PostResult> {
    try {
      // A local, so it is called without `this` — `options.fetchImpl(…)` would bind the
      // options object and a browser's own `fetch` throws "Illegal invocation".
      const send = options.fetchImpl ?? globalThis.fetch;
      if (typeof send !== "function") return { filed: false, retry: true };
      const res = await send(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearer}` },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      if (!res.ok) {
        // 401: the token expired — worth another go after the next sign-in. 5xx: the
        // server's trouble. Any other 4xx refuses this payload for good, and retrying it
        // would wedge the buffer behind it (kk `crash-report.ts:246-252`).
        return { filed: false, retry: res.status === 401 || res.status >= 500 };
      }
      const body: unknown = await res.json().catch(() => null);
      const answer = (body ?? {}) as Partial<Record<keyof CrashReportResponse, unknown>>;
      // THE fix (§4.6): a 202 is not a filing. `stored: false` is the limiter or a
      // demo user, and a body without `stored` is no proof either.
      if (answer.stored !== true) return { filed: false, retry: false };
      const reference = typeof answer.reference === "string" && answer.reference ? answer.reference : undefined;
      return reference ? { filed: true, reference } : { filed: true };
    } catch {
      return { filed: false, retry: true }; // network down, blocked, a hostile fetch
    }
  }

  function payloadOf(report: CrashReport): CrashReportCreate {
    const page = reducePage(report.page, allow);
    const origin = options.origin ?? currentOrigin();
    return {
      name: clamp(report.name, 200),
      message: clamp(report.message, 2000) ?? "(no message)",
      stack: clamp(report.stack, 8000),
      component_stack: clamp(report.componentStack, 8000),
      boundary: report.placement === "app" ? "app" : "page",
      url: clamp(`${origin}${page}`, 2000),
      route: clamp(page.split("?")[0], 500),
      version: clamp(options.version ?? report.appVersion, 50),
      viewport: clamp(viewport(), 50),
      ua: clamp(report.userAgent, 500),
      online: typeof report.online === "boolean" ? report.online : null,
      occurred_at: typeof report.time === "string" && report.time ? report.time : new Date().toISOString(),
      origin: clamp(origin, 200),
      environment: clamp(environment, 20),
    };
  }

  async function onReport(report: CrashReport): Promise<CrashFiling> {
    try {
      // The boundary never hands one over; said here too, so a direct caller cannot
      // buffer a connectivity symptom as if it were a defect.
      if (report.chunkLoad) return NOT_FILED;
      if (suppressed()) return NOT_FILED;
      if (lastHotUpdateAt > 0 && Date.now() - lastHotUpdateAt < HOT_UPDATE_GRACE_MS) {
        // Said out loud: the developer is looking at this screen, and "nothing was
        // filed" only reassures when you know why (kk `crash-report.ts:284-288`).
        console.info("[ui-kit] crash not filed: a hot update landed moments ago", report.message);
        return NOT_FILED;
      }
      // Built before any wait, so it carries the state at crash time (`online: false`
      // included) whenever it is finally sent.
      const payload = payloadOf(report);
      const bearer = token();
      // Offline: the crashes hardest to reproduce are the ones with no network (kk
      // `crash-report.ts:308-315`). Signed out: nobody to file it under yet.
      if (isOffline() || !bearer) {
        buffer(payload);
        return NOT_FILED;
      }
      const result = await post(payload, bearer);
      if (result.filed) return result.reference ? { reference: result.reference } : {};
      if (result.retry) buffer(payload);
      return NOT_FILED;
    } catch {
      // Last line of defence: whatever went wrong in here, the fallback still renders.
      return NOT_FILED;
    }
  }

  async function drain(): Promise<void> {
    try {
      const pending = readPending();
      if (pending.length === 0) return;
      // Still unattributable, opted out or offline: keep them rather than burn them.
      const bearer = token();
      if (!bearer || suppressed() || isOffline()) return;
      // Clear first and re-buffer only what failed for a reason worth retrying: should
      // the tab die mid-flush, losing a report beats re-posting the same rows on every
      // load forever (kk `crash-report.ts:353-356`).
      writePending([]);
      const keep: CrashReportCreate[] = [];
      for (const [i, payload] of pending.entries()) {
        const result = await post(payload, bearer);
        if (!result.filed && result.retry) {
          // The token or the server is the trouble, not this report — the rest would
          // fail the same way. Keep it and everything after it for the next flush.
          keep.push(...pending.slice(i));
          break;
        }
      }
      // Merged with what arrived meanwhile, never overwritten: a crash that buffered
      // while the POSTs above were in flight (the start-up flush runs exactly when a
      // boot-time crash fires) comes after them and is the newest (kk `:362-367`).
      if (keep.length > 0) writePending([...keep, ...readPending()]);
    } catch {
      /* never throws: a failed flush must not break start-up */
    }
  }

  function flushPending(): Promise<void> {
    flushing ??= drain().finally(() => {
      flushing = null;
    });
    return flushing;
  }

  function redact(report: CrashReport): CrashReport {
    try {
      return { ...report, page: reducePage(report.page, allow) };
    } catch {
      // Only a hostile object gets here (a getter that throws on the spread), so
      // nothing of it is read again: fail closed with an empty report.
      return { name: "Error", message: "", page: "", time: "", userAgent: "", chunkLoad: false, extras: {} };
    }
  }

  function noteHotUpdate(at: number = Date.now()): void {
    lastHotUpdateAt = at;
  }

  return { onReport, redact, flushPending, noteHotUpdate };
}
