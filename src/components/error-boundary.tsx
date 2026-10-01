import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { useKitLabels } from "../i18n/kit-labels";
import { Button, EmptyState } from "./ui";
import { CopyButton } from "./copy-button";
import { Disclosure } from "./disclosure";
import { documentNavigation } from "../lib/document-navigation";

/** The words of the default fallback. */
export interface ErrorBoundaryLabels {
  /** The fallback's heading. */
  title: string;
  /** The line under it. */
  message: string;
  /** The button that clears the error and renders the children again. */
  retry: string;
  /** The disclosure that opens the full error report (`showDetails`). */
  details: string;
  /** The button that reloads the whole page (0.13). */
  reload: string;
  /** Heading when a lazy chunk failed to load while online — a deploy replaced the
   *  files this page was built from (0.13). */
  updateTitle: string;
  updateMessage: string;
  /** Heading when the browser says it is offline (0.13). */
  offlineTitle: string;
  offlineMessage: string;
  /** The copy button's words: what it copies is the plain-text report (0.13). */
  copyReport: string;
  /** Shown once `onReport` has filed the crash and returned no reference (0.13). */
  reported: string;
  /** Shown once `onReport` has filed the crash under a reference — rendered as the
   *  app returned it, so return `"#123"` if the hash belongs to it (0.13). */
  reportedAs: (reference: string) => string;
}

export const DEFAULT_ERROR_BOUNDARY_LABELS: ErrorBoundaryLabels = {
  title: "Something went wrong",
  message: "This part of the page could not be shown. Try again, or reload the page.",
  retry: "Try again",
  details: "Error details",
  reload: "Reload",
  updateTitle: "A new version is available",
  updateMessage: "Part of the app has changed since this page was loaded. Reload to get the new version.",
  offlineTitle: "You’re offline",
  offlineMessage: "This page could not be loaded without a connection. Reconnect, then reload the page.",
  copyReport: "Copy error report",
  reported: "This error has been reported automatically.",
  reportedAs: (reference) => `Reported as ${reference}`,
};

/**
 * What was thrown, as flat strings, read ONCE when it arrives.
 *
 * React stores whatever was thrown, hostile or not — `throw { get message() { throw … } }`,
 * `throw { name: Symbol() }`, `throw undefined` — and reading one of those during the
 * fallback's own render would throw INSIDE the boundary, escalating to the next one up
 * (keksdose's error-boundary.tsx learned this as feedback #160: at the app level there is
 * none, and the result is the white screen the boundary exists to prevent).
 */
export interface ErrorBoundaryDetails {
  name: string;
  message: string;
  stack?: string;
}

function read(get: () => unknown): string | undefined {
  try {
    const v = get();
    return typeof v === "string" ? v : v === undefined || v === null ? undefined : String(v);
  } catch {
    return undefined;
  }
}

/** `JSON.stringify` that never throws (a cycle, a BigInt, a hostile getter) and never
 *  returns more than 500 characters. "" when there is nothing to say. */
function safeJson(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    if (!json || json === "{}") return "";
    return json.length > 500 ? `${json.slice(0, 499)}…` : json;
  } catch {
    return "";
  }
}

/** {@link ErrorBoundaryDetails} of any thrown value, without ever throwing. */
export function describeThrown(error: unknown): ErrorBoundaryDetails {
  if (typeof error === "object" && error !== null) {
    const e = error as { name?: unknown; message?: unknown; stack?: unknown };
    const message = read(() => e.message) ?? "";
    return {
      name: read(() => e.name) ?? "Error",
      // `throw { code: 500 }` has no message, and an empty line leaves crash triage with
      // nothing (keksdose G3a; its old reporter filed `{"code":500}`). Such a value is
      // quoted as JSON instead, capped, and never at the cost of a throw.
      message: message || (error instanceof Error ? "" : safeJson(error)),
      stack: read(() => e.stack),
    };
  }
  return { name: "Error", message: read(() => error) ?? "" };
}

/**
 * Is this a failed lazy import — a route chunk that did not arrive?
 *
 * Two causes, and neither is a bug in the page: the device is offline and the chunk was
 * never cached, or a deploy replaced the hashed files the running page still points at.
 * Both are cured by a reload and by nothing else — `React.lazy` caches the rejected
 * import, so Try again re-throws the same error without fetching. The patterns are
 * keksdose's (crash-report.ts), which covers Vite ("dynamically imported module",
 * "module script failed"), webpack ("ChunkLoadError", "Loading chunk") and the bare
 * `fetch` failure a service worker hands back.
 *
 * Never throws: it runs inside the fallback's own render, where a throw is a white
 * screen. An error it cannot read is not a chunk failure.
 */
export function isChunkLoadError(
  error: { name?: string | null; message?: string | null } | null | undefined,
): boolean {
  try {
    const s = `${error?.name ?? ""} ${error?.message ?? ""}`;
    return /ChunkLoadError|dynamically imported module|module script failed|Loading chunk|Failed to fetch/i.test(s);
  } catch {
    return false;
  }
}

/**
 * Everything a crash report carries, read once when the boundary catches.
 *
 * Plain strings only, so it survives `JSON.stringify` into an app's crash endpoint as is
 * and {@link formatCrashReport} can print it without a single guard. The wording of the
 * printed report is English on purpose: it is read by whoever fixes the bug, not by the
 * user who copies it, and a report in nine languages cannot be searched.
 */
export interface CrashReport {
  /** The thrown value's `name` ("TypeError"), "Error" for a non-object. */
  name: string;
  message: string;
  stack?: string;
  /** React's component stack from `componentDidCatch` — the part that names the
   *  component, which a minified JS stack no longer does. */
  componentStack?: string;
  /** `pathname + search` at the moment of the crash. The search may carry what the
   *  user typed — see `redact`. */
  page: string;
  /** ISO 8601, UTC. */
  time: string;
  userAgent: string;
  /** The boundary's `appVersion` prop. */
  appVersion?: string;
  /** The boundary's `placement` prop ("app", "page", "widget"): which boundary caught
   *  it, so triage can tell a whole-app crash from one page's (keksdose G3b). */
  placement?: string;
  /** `navigator.onLine` at the moment of the crash; left out where there is none. */
  online?: boolean;
  /** {@link isChunkLoadError} of the thrown value. Such a crash is never handed to
   *  `onReport` — it is a deploy or a dropped connection, not a defect — but it is
   *  still in the copied report. */
  chunkLoad: boolean;
  /** The boundary's `reportExtras()`, stringified. */
  extras: Record<string, string>;
}

/**
 * The report as one plain-text block — what the copy button puts on the clipboard and
 * the details disclosure shows.
 *
 * lenkbank's layout, because that is the one that was already being pasted into
 * feedback messages: the error line first (it is what a search for the bug matches),
 * then where / when / what, then the two stacks.
 */
export function formatCrashReport(report: CrashReport): string {
  const lines = [
    report.message ? `${report.name}: ${report.message}` : report.name,
    `Page: ${report.page}`,
    `Time: ${report.time}`,
    `User agent: ${report.userAgent}`,
  ];
  if (report.appVersion) lines.push(`App version: ${report.appVersion}`);
  if (report.placement) lines.push(`Placement: ${report.placement}`);
  if (report.online === false) lines.push("Online: no");
  for (const [key, value] of Object.entries(report.extras)) lines.push(`${key}: ${value}`);
  if (report.stack) lines.push("", "Stack:", report.stack.trim());
  if (report.componentStack) lines.push("", "Component stack:", report.componentStack.trim());
  return lines.join("\n");
}

/**
 * A key for "the same crash again": the error's name and message and the first frames
 * of its stack.
 *
 * Page-load local, not a server-side grouping key (keksdose's crash-report.ts draws the
 * same line): its only job is to stop one page load filing one bug twice — React's dev
 * StrictMode, a Try again that crashes again, a render loop that trips the boundary many
 * times a second. The page and the time are left out on purpose: the same bug on two
 * routes is still one bug.
 */
export function crashFingerprint(
  report: Pick<CrashReport, "name" | "message" | "stack"> & Pick<Partial<CrashReport>, "placement">,
): string {
  const frames = (report.stack ?? "").split("\n").slice(0, 4).join("|");
  // The placement is part of it (keksdose G3b): the same error caught by the page
  // boundary and, after Try again fails, by the app boundary is two facts for triage.
  const where = report.placement ? `${report.placement}::` : "";
  return `${where}${report.name}::${report.message}::${frames}`;
}

/**
 * What `onReport` may resolve with. `{ reference }` is shown ("Reported as …");
 * nothing (or `{}`) means filed without one. `{ filed: false }` says the app decided NOT
 * to file (a demo session, a hot-reload artefact, a report buffered for later): the
 * screen then claims nothing and keeps the copy button — claiming a report that was
 * never sent is the same false statement as hiding one that was.
 */
export type CrashReportResult = { reference?: string; filed?: boolean } | void;

interface Filing {
  filed: boolean;
  reference?: string;
}

const NOT_FILED: Filing = { filed: false };

/** A render loop can trip a boundary dozens of times a second with a different message
 *  each time (a counter in it); without a ceiling the first bad deploy files hundreds of
 *  rows. keksdose's number. */
const MAX_REPORTS_PER_PAGE_LOAD = 5;

/** Fingerprint → the one filing for it in this page load. Module scope IS the page
 *  load: a reload starts it empty. A duplicate gets the first filing's promise, so the
 *  second screen shows the same reference instead of claiming nothing. */
const filings = new Map<string, Promise<Filing>>();

function settle(out: unknown): Filing {
  try {
    if (out && typeof out === "object") {
      const o = out as { filed?: unknown; reference?: unknown };
      if (o.filed === false) return NOT_FILED;
      const reference = typeof o.reference === "string" && o.reference ? o.reference : undefined;
      return { filed: true, reference };
    }
    return { filed: true };
  } catch {
    return NOT_FILED;
  }
}

/** Hand the report to the app, once per fingerprint per page load, and never throw —
 *  not for a synchronous throw, a rejection, or a hostile thenable. */
function fileOnce(report: CrashReport, onReport: (report: CrashReport) => unknown): Promise<Filing> {
  const key = crashFingerprint(report);
  const known = filings.get(key);
  if (known) return known;
  if (filings.size >= MAX_REPORTS_PER_PAGE_LOAD) return Promise.resolve(NOT_FILED);
  let filing: Promise<Filing>;
  try {
    filing = Promise.resolve(onReport(report)).then(settle, () => NOT_FILED);
  } catch {
    filing = Promise.resolve(NOT_FILED);
  }
  // Claimed before the first await: two catches in the same tick (StrictMode) must not
  // both get past the lookup above.
  filings.set(key, filing);
  return filing;
}

function isOffline(): boolean {
  try {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  } catch {
    return false;
  }
}

function reloadPage(): void {
  try {
    documentNavigation.reload();
  } catch {
    /* nothing left to do from here */
  }
}

/** What a render-prop `fallback` is handed. */
export interface ErrorBoundaryFallbackProps {
  /** The thrown value, as it was thrown. Read it with care — see {@link describeThrown}. */
  error: unknown;
  details: ErrorBoundaryDetails;
  /** Clear the error and render the children again. */
  reset: () => void;
  /** The crash report, once `componentDidCatch` has built it (null on the very first
   *  render of the fallback, which happens before it). Already `redact`ed. */
  report: CrashReport | null;
}

export interface ErrorBoundaryProps {
  children?: ReactNode;
  /** Replaces the default fallback: a node, or a render function handed the error and
   *  a `reset`. The same rule applies to it as to the default: see the component docs. */
  fallback?: ReactNode | ((props: ErrorBoundaryFallbackProps) => ReactNode);
  /** Called once per caught error with the raw value — log it. A throw from it is
   *  swallowed: the boundary is the last thing standing. For filing a report, prefer
   *  `onReport`, which gets the finished report, dedupe and the reference on screen. */
  onError?: (error: unknown, info: ErrorInfo) => void;
  /** Called when the error is cleared, by Try again, `reset` or a `resetKeys` change —
   *  drop a cache, refetch. */
  onReset?: () => void;
  /**
   * When any of these changes (compared with `Object.is`) AFTER an error was caught, the
   * error is cleared and the children render again — a change in the same update that
   * threw does not count (it is what the error was shown under) — pass the route path so leaving a broken page does not
   * carry its fallback to the next one (keksdose's `resetKey`).
   */
  resetKeys?: ReadonlyArray<unknown>;
  /** Quote the error's `name: message` in a monospace box under the hint. Default on
   *  (0.13): three sentences true of every crash identify none of them, and the one
   *  line that does is what a user can read out or screenshot (lenkbank P7). Not shown
   *  for a chunk-load / offline screen, where the message is a URL that explains
   *  nothing the title does not. */
  showMessage?: boolean;
  /** A collapsed disclosure holding the full plain-text report. Default on since 0.13
   *  (it was an opt-in showing name, message and stack): closed, it costs one line, and
   *  it is where a support conversation asks the user to look. */
  showDetails?: boolean;
  /** The copy button for the plain-text report (the kit's CopyButton, which says when
   *  the clipboard refused). Default on. Hidden once `onReport` has filed the crash —
   *  there is nothing left to paste anywhere — and shown again whenever it did not. */
  copyReport?: boolean;
  /** The app's version, printed in the report — the first question on every crash. */
  appVersion?: string;
  /** Which boundary this is — "app" at the root, "page" in the layout — carried into
   *  the report (`placement`) and its fingerprint, so `onReport` needs no closure to say
   *  where the crash was caught (keksdose G3b). */
  placement?: string;
  /** More `key: value` lines for the report, read when the boundary catches (a tenant
   *  id, the feature flags). A throw from it is swallowed and the lines are left out. */
  reportExtras?: () => Record<string, string>;
  /**
   * Rewrite the report before anything sees it: the screen, the clipboard and
   * `onReport` all get the returned one.
   *
   * THE REPORT IS STRUCTURE, NEVER CONTENT — and only the app knows which of its query
   * params hold content. keksdose's register put the free-text search in `?q=` and payee
   * names in the `f.*` filters, and its crash channel sent them in the clear to a column
   * every admin reads (crash-report.ts `safeUrl`). The cure there is an ALLOW-list, so a
   * param added later is dropped until somebody decides otherwise — rebuild `page`
   * from `new URL(r.page, location.origin)`, keeping only the listed `searchParams`.
   * `extras` are the app's own and need no second pass. A throw from `redact` falls
   * back to the pathname alone and no extras — failing closed.
   *
   * The same holds inside `onReport`, which is the other place to do it: clamp fields
   * to what the endpoint accepts, drop what it must not store. The kit cannot know.
   */
  redact?: (report: CrashReport) => CrashReport;
  /**
   * File the report automatically. Called from `componentDidCatch`, at most once per
   * {@link crashFingerprint} per page load (and at most five times in all), never for a
   * chunk-load error. It can NOT throw into the boundary: a synchronous throw and a
   * rejection both read as "not filed", and the copy button stays.
   *
   * Resolve with `{ reference }` and the screen says "Reported as …" instead of the copy
   * button; see {@link CrashReportResult} for "filed without a reference" and "decided not
   * to file". Whatever the app's reporter does, it must do without the router, the query
   * client or the auth store's hooks — a bare `fetch` with `keepalive`, so it survives
   * the reload the user is about to press (keksdose crash-report.ts `post`).
   */
  onReport?: (report: CrashReport) => Promise<CrashReportResult> | CrashReportResult;
  /** The app's own escape hatches, beside Reload / Try again — keksdose's "Clear local
   *  data" for a poisoned persisted cache that no in-app action could otherwise break.
   *  A full-width hint under it: wrap it in `<div className="basis-full">`. */
  actions?: ReactNode;
  /** The default fallback's heading level. Default `h2`: the fallback often IS the page. */
  headingAs?: "h2" | "h3" | "h4" | "h5" | "h6";
  /** Classes for the default fallback's box (`m-8 min-h-[400px]`, kastlan). */
  className?: string;
  labels?: Partial<ErrorBoundaryLabels>;
}

type FilingState = "none" | "pending" | "filed" | "failed";

interface ErrorBoundaryState {
  /** A flag of its own, so `throw undefined` is still an error shown. */
  failed: boolean;
  error: unknown;
  details: ErrorBoundaryDetails | null;
  report: CrashReport | null;
  filing: FilingState;
  reference: string | undefined;
}

const CLEAR: ErrorBoundaryState = {
  failed: false,
  error: null,
  details: null,
  report: null,
  filing: "none",
  reference: undefined,
};

function keysChanged(a: ReadonlyArray<unknown> | undefined, b: ReadonlyArray<unknown> | undefined): boolean {
  if (a === b) return false;
  if (!a || !b || a.length !== b.length) return true;
  return a.some((v, i) => !Object.is(v, b[i]));
}

function currentPage(): { page: string; path: string } {
  try {
    const { pathname, search } = window.location;
    return { page: `${pathname}${search}`, path: pathname };
  } catch {
    return { page: "", path: "" };
  }
}

function buildReport(details: ErrorBoundaryDetails, componentStack: string | undefined, props: ErrorBoundaryProps): CrashReport {
  const { page, path } = currentPage();
  const extras: Record<string, string> = {};
  try {
    const more = props.reportExtras?.();
    if (more) for (const [k, v] of Object.entries(more)) extras[k] = String(v);
  } catch {
    /* documented: the lines are left out */
  }
  let userAgent = "";
  let online: boolean | undefined;
  try {
    userAgent = navigator.userAgent;
    online = typeof navigator.onLine === "boolean" ? navigator.onLine : undefined;
  } catch {
    /* no navigator (SSR, a worker test) */
  }
  const report: CrashReport = {
    name: details.name,
    message: details.message,
    stack: details.stack,
    componentStack: componentStack ?? undefined,
    page,
    time: new Date().toISOString(),
    userAgent,
    appVersion: props.appVersion,
    placement: props.placement,
    online,
    chunkLoad: isChunkLoadError(details),
    extras,
  };
  if (!props.redact) return report;
  try {
    return props.redact(report);
  } catch {
    // Fail closed: an app that asked for redaction must not get the unredacted page.
    return { ...report, page: path, extras: {} };
  }
}

/**
 * Catch a render error below it and show ONE crash screen instead of an empty page.
 *
 * The three apps each built one. kastlan's and keksdose's sat on `EmptyState
 * tone="danger"`; lenkbank's quoted the error and offered a plain-text report to copy;
 * keksdose's filed the crash itself, told a lazy-chunk failure apart as "offline", and
 * offered "clear local data" when a poisoned cache made Retry useless (feedback #160).
 * This is all of that, so the apps reduce to
 * `<ErrorBoundary resetKeys={[pathname]} appVersion={__VERSION__} />` plus, for an app
 * with a crash endpoint, `onReport` and `actions`:
 *
 * - the error's `name: message`, quoted (`showMessage`);
 * - Try again (reset the boundary) AND Reload (the page) — Try again alone re-renders
 *   the same subtree from the same state, which a deterministic crash survives;
 * - a chunk-load error or an offline browser gets its own title and Reload first
 *   ("A new version is available" / "You're offline");
 * - the copy button and the report in a disclosure; `onReport` for filing it, deduped
 *   per page load, with its reference on screen.
 *
 * THE RULE for this fallback — and for a `fallback` or `actions` an app passes in: it
 * must not depend on the router, the query client or the auth store. A crash is exactly
 * when those may be what broke, and a fallback that throws escalates to the next
 * boundary up — at the app level there is none, and the user gets the white screen this
 * exists to prevent. So no `useNavigate`, no `useQuery`, no `useAuth()` in it; reload
 * with `window.location`, not the router. The kit's own label hooks are the one context
 * it does read (`errorBoundary.*` from `UiKitProvider`), and they degrade to the English
 * defaults when there is no provider above — which is why the app-level boundary may
 * sit OUTSIDE the provider and still render.
 *
 * The fallback is `role="alert"`: a page replaced by an error is news, and a reader
 * that was on it is told.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = CLEAR;

  /** Bumped by every catch and reset, so a filing that settles after the screen moved
   *  on (Try again, a route change, a second crash) does not write into it. */
  private generation = 0;

  /**
   * Forget which crashes this page load has filed, and the count towards the cap.
   *
   * For tests: the dedupe lives in module scope because a page load is what it spans,
   * and a test file is one page load — so without this, the sixth test that files a
   * report finds the cap reached and `onReport` never called. Call it in `beforeEach`.
   * Never needed in an app: a reload is the reset.
   */
  static forgetReports(): void {
    filings.clear();
  }

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { failed: true, error, details: describeThrown(error), report: null, filing: "none", reference: undefined };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    try {
      this.props.onError?.(error, info);
    } catch {
      /* documented: a logger must not take the fallback down */
    }
    const details = this.state.details ?? describeThrown(error);
    const report = buildReport(details, info.componentStack ?? undefined, this.props);
    const { onReport } = this.props;
    const willFile = onReport !== undefined && !report.chunkLoad;
    const generation = ++this.generation;
    this.setState({ report, filing: willFile ? "pending" : "none", reference: undefined });
    if (!willFile) return;
    void fileOnce(report, onReport).then((filing) => {
      if (generation !== this.generation) return;
      this.setState(
        filing.filed ? { filing: "filed", reference: filing.reference } : { filing: "failed", reference: undefined },
      );
    });
  }

  componentDidUpdate(prev: ErrorBoundaryProps, prevState: ErrorBoundaryState): void {
    // Only a change AFTER the error was caught clears it (react-error-boundary's rule).
    // `prevState.failed` is false in the update that caught it: that update may well be
    // the one that changed the keys too — a navigation to a page that throws, with
    // `resetKeys={[pathname]}` — and resetting then would fire `onReset` for nothing and
    // render the failing child a second time. From then on `prev.resetKeys` are the
    // keys the error was shown under, so any change clears it.
    if (this.state.failed && prevState.failed && keysChanged(prev.resetKeys, this.props.resetKeys)) {
      this.reset();
    }
  }

  reset = (): void => {
    this.generation++;
    this.props.onReset?.();
    this.setState(CLEAR);
  };

  render(): ReactNode {
    const { failed, error, details, report, filing, reference } = this.state;
    if (!failed || !details) return this.props.children;
    const { fallback } = this.props;
    if (typeof fallback === "function") return fallback({ error, details, reset: this.reset, report });
    if (fallback !== undefined) return fallback;
    return (
      <ErrorFallback
        details={details}
        report={report}
        filing={filing}
        reference={reference}
        reset={this.reset}
        showMessage={this.props.showMessage ?? true}
        showDetails={this.props.showDetails ?? true}
        copyReport={this.props.copyReport ?? true}
        actions={this.props.actions}
        headingAs={this.props.headingAs ?? "h2"}
        className={this.props.className}
        labels={this.props.labels}
      />
    );
  }
}

function ErrorFallback({
  details,
  report,
  filing,
  reference,
  reset,
  showMessage,
  showDetails,
  copyReport,
  actions,
  headingAs,
  className,
  labels,
}: {
  details: ErrorBoundaryDetails;
  report: CrashReport | null;
  filing: FilingState;
  reference: string | undefined;
  reset: () => void;
  showMessage: boolean;
  showDetails: boolean;
  copyReport: boolean;
  actions?: ReactNode;
  headingAs: NonNullable<ErrorBoundaryProps["headingAs"]>;
  className?: string;
  labels?: Partial<ErrorBoundaryLabels>;
}) {
  const text = useKitLabels("errorBoundary", DEFAULT_ERROR_BOUNDARY_LABELS, labels);
  const chunk = isChunkLoadError(details);
  // Offline first, as keksdose has it: offline, a chunk failure is the connection, and
  // any other crash most likely a request that could not be made — either way "reload
  // once you are back" is the advice, and "a new version" would be a false one.
  const mode = isOffline() ? "offline" : chunk ? "update" : "error";
  const title = mode === "offline" ? text.offlineTitle : mode === "update" ? text.updateTitle : text.title;
  const hint = mode === "offline" ? text.offlineMessage : mode === "update" ? text.updateMessage : text.message;
  const Icon = mode === "offline" ? WifiOff : mode === "update" ? RefreshCw : AlertTriangle;
  const reportText = report ? formatCrashReport(report) : null;
  const errorLine = details.message ? `${details.name}: ${details.message}` : details.name;

  const reloadButton = (
    <Button key="reload" variant={mode === "error" ? "secondary" : "primary"} onClick={reloadPage}>
      {text.reload}
    </Button>
  );
  // Not after a chunk failure: `React.lazy` keeps the rejected import, so Try again
  // could only throw the same error again.
  const retryButton = chunk ? null : (
    <Button key="retry" variant={mode === "error" ? "primary" : "secondary"} onClick={reset}>
      {text.retry}
    </Button>
  );

  return (
    <EmptyState
      role="alert"
      tone={mode === "error" ? "danger" : undefined}
      headingAs={headingAs}
      className={className}
      icon={<Icon />}
      title={title}
      hint={hint}
      action={
        <>
          {showMessage && mode === "error" && (
            // A quotation, not prose: left-aligned and monospaced, so it reads as the
            // program's words and can be read out or screenshotted verbatim.
            <p
              data-error-message=""
              className="-mt-1 mb-1 basis-full whitespace-pre-wrap break-words rounded-md border border-[var(--danger-border-strong)] bg-[var(--danger-bg)] px-3 py-2 text-start font-mono text-xs text-[var(--text-primary)]"
            >
              {errorLine}
            </p>
          )}
          {filing === "filed" && (
            <p className="-mt-1 mb-1 basis-full text-xs">
              {reference ? text.reportedAs(reference) : text.reported}
            </p>
          )}
          {mode === "error" ? [retryButton, reloadButton] : [reloadButton, retryButton]}
          {copyReport && reportText !== null && filing !== "filed" && (
            <CopyButton variant="label" buttonVariant="ghost" label={text.copyReport} text={reportText} />
          )}
          {actions}
          {showDetails && reportText !== null && (
            <Disclosure variant="bare" title={text.details} className="basis-full text-start">
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words text-xs text-[var(--text-secondary)]">
                {reportText}
              </pre>
            </Disclosure>
          )}
        </>
      }
    />
  );
}
