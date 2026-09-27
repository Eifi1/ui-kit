import { useState } from "react";
import { Button, ErrorBoundary, formatCrashReport } from "@eifi1/ui-kit";
import type { CrashReport, CrashReportResult } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * The 0.13 crash screen on the Feedback page: the one fallback lenkbank, keksdose and
 * kastlan all reduce to — the quoted message, Try again AND Reload, the copy-report
 * button and the report in a disclosure, `onReport` with dedupe and the reference on
 * screen, the `actions` slot, and the chunk-load title.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;
const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const CAPTION = "text-xs text-[var(--text-muted)]";

/** Throws the given value during render, so the boundary above it catches. */
function Thrower({ error }: { error: unknown }): React.ReactNode {
  if (error !== undefined) throw error;
  return <p className="text-sm text-[var(--text-primary)]">The account list would be here — all fine.</p>;
}

/* ── The default screen ──────────────────────────────────────────────────── */

function DefaultScreenDemo() {
  const [error, setError] = useState<unknown>(undefined);
  return (
    <Example
      label="ErrorBoundary 0.13 — the one crash screen"
      hint="appVersion, reportExtras; showMessage, showDetails and copyReport are on by default"
    >
      <Row>
        <Button
          variant="secondary"
          size="sm"
          tone="danger"
          disabled={error !== undefined}
          onClick={() => setError(new TypeError("Cannot read properties of undefined (reading 'balance')"))}
        >
          Break the page
        </Button>
      </Row>
      <div className="mt-3 rounded-md border border-[var(--border)] p-2">
        <ErrorBoundary
          headingAs="h4"
          appVersion="0.13.0-showcase"
          reportExtras={() => ({ Theme: document.documentElement.dataset.theme ?? "system" })}
          onReset={() => setError(undefined)}
        >
          <Thrower error={error} />
        </ErrorBoundary>
      </div>
      <div className="mt-3">
        <Note>
          This is lenkbank&rsquo;s whole boundary now: {code("<ErrorBoundary resetKeys={[pathname]} appVersion={__VERSION__} />")}.
          The error&rsquo;s own words are quoted, because three sentences that are true of every crash identify none
          of them. Try again resets the boundary; Reload reloads the page — a deterministic crash survives Try again,
          so there is always a way forward. The copy button puts the plain-text report on the clipboard (error line,
          page, time, user agent, app version, extras, stack, component stack), and the disclosure shows the same
          text. The screen reads no router, query client or auth store — a crash is when those may be what broke.
        </Note>
      </div>
    </Example>
  );
}

/* ── onReport ────────────────────────────────────────────────────────────── */

type Outcome = "reference" | "void" | "refused" | "reject" | "throw";

const OUTCOMES: Array<[Outcome, string]> = [
  ["reference", "{ reference: \"#4711\" }"],
  ["void", "nothing"],
  ["refused", "{ filed: false }"],
  ["reject", "rejects"],
  ["throw", "throws"],
];

function OnReportDemo() {
  const [error, setError] = useState<unknown>(undefined);
  const [outcome, setOutcome] = useState<Outcome>("reference");
  const [log, setLog] = useState<string[]>([]);
  const note = (s: string) => setLog((l) => [...l.slice(-4), s]);

  const onReport = (report: CrashReport): Promise<CrashReportResult> => {
    note(`onReport(${report.name}: ${report.message}) → ${outcome}`);
    if (outcome === "throw") throw new Error("the reporter itself broke");
    return new Promise((resolve, reject) =>
      setTimeout(() => {
        if (outcome === "reject") reject(new Error("network down"));
        else if (outcome === "refused") resolve({ filed: false });
        else if (outcome === "void") resolve();
        else resolve({ reference: "#4711" });
      }, 600),
    );
  };

  return (
    <Example
      label="onReport — filed once per page load, the reference on screen"
      hint="and the actions slot for the app's own escape hatch"
    >
      <Row>
        {OUTCOMES.map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={outcome === value ? "primary" : "ghost"}
            aria-pressed={outcome === value}
            onClick={() => setOutcome(value)}
          >
            {label}
          </Button>
        ))}
      </Row>
      <Row className="mt-2">
        <Button
          variant="secondary"
          size="sm"
          tone="danger"
          disabled={error !== undefined}
          onClick={() => setError(new RangeError("Invalid time value"))}
        >
          Break the page
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            ErrorBoundary.forgetReports();
            note("forgetReports() — as if the page had reloaded");
          }}
        >
          Start a new page load
        </Button>
      </Row>
      <div className="mt-3 rounded-md border border-[var(--border)] p-2">
        <ErrorBoundary
          headingAs="h4"
          appVersion="0.13.0-showcase"
          onReport={onReport}
          onReset={() => setError(undefined)}
          actions={
            <Button variant="ghost" onClick={() => note("actions: clear local data and reload")}>
              Clear local data
            </Button>
          }
        >
          <Thrower error={error} />
        </ErrorBoundary>
      </div>
      <p className={`${READOUT} mt-3 whitespace-pre-wrap`}>{log.length ? log.join("\n") : "onReport: —"}</p>
      <div className="mt-3">
        <Note>
          Break, Try again, break again: the same crash is filed once per page load
          ({code("crashFingerprint")}: name, message, first stack frames), and the second screen shows the first
          filing&rsquo;s reference. A throw or a rejection from {code("onReport")} never reaches the boundary; the
          screen claims nothing and keeps the copy button. {code("{ filed: false }")} is the app saying it chose not to
          file (a demo session, a buffered offline report). What the report may carry is the app&rsquo;s call: rewrite
          it in {code("redact")} (an allow-list of query params, as keksdose&rsquo;s crash-report.ts does) and the
          screen, the clipboard and {code("onReport")} all get the redacted one.
        </Note>
      </div>
    </Example>
  );
}

/* ── Chunk-load ──────────────────────────────────────────────────────────── */

function ChunkLoadDemo() {
  const [error, setError] = useState<unknown>(undefined);
  const sample: CrashReport = {
    name: "TypeError",
    message: "Failed to fetch dynamically imported module: /assets/accounts-3f9c.js",
    page: "/accounts?p=2",
    time: "2026-09-27T08:15:00.000Z",
    userAgent: "Mozilla/5.0 …",
    appVersion: "1.4.2",
    chunkLoad: true,
    extras: {},
  };
  return (
    <Example
      label="A lazy chunk that did not load — a new version, or offline"
      hint="Reload first; no Try again, since React.lazy keeps the rejected import"
    >
      <Row>
        <Button
          variant="secondary"
          size="sm"
          tone="danger"
          disabled={error !== undefined}
          onClick={() => setError(new TypeError(sample.message))}
        >
          Fail a lazy import
        </Button>
        <Button variant="ghost" size="sm" disabled={error === undefined} onClick={() => setError(undefined)}>
          Put it back
        </Button>
      </Row>
      <div className="mt-3 rounded-md border border-[var(--border)] p-2">
        <ErrorBoundary headingAs="h4" resetKeys={[error === undefined]}>
          <Thrower error={error} />
        </ErrorBoundary>
      </div>
      <p className={`${CAPTION} mt-3`}>formatCrashReport(sample):</p>
      <pre className={`${READOUT} mt-1 whitespace-pre-wrap`}>{formatCrashReport(sample)}</pre>
      <div className="mt-3">
        <Note>
          {code("isChunkLoadError")} (keksdose&rsquo;s patterns: Vite, webpack, a service worker&rsquo;s failed fetch)
          turns the screen into &ldquo;A new version is available&rdquo;; with {code("navigator.onLine === false")} any
          crash reads &ldquo;You&rsquo;re offline&rdquo;. Either way Reload is the primary action, and a chunk failure
          is never handed to {code("onReport")} — it is a deploy or a dropped connection, not a defect.
        </Note>
      </div>
    </Example>
  );
}

export function ErrorBoundary013Demo() {
  return (
    <>
      <DefaultScreenDemo />
      <OnReportDemo />
      <ChunkLoadDemo />
    </>
  );
}
