import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ErrorBoundary,
  crashFingerprint,
  formatCrashReport,
  isChunkLoadError,
} from "../error-boundary";
import type { CrashReport } from "../error-boundary";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE } from "../../i18n/locales/de";

/**
 * The 0.13 crash screen: the quoted message, Reload beside Try again, the copy-report
 * button, `onReport` with its reference and dedupe, the chunk-load / offline titles and
 * the `actions` slot. The dedupe is per page load (module scope); `forgetReports()`
 * starts every test on a fresh one.
 */

let shouldThrow = true;
function Boom({ error }: { error: unknown }): React.ReactNode {
  if (shouldThrow) throw error;
  return <p>fine</p>;
}

/** The fallback's own alert. The CopyButton inside it carries an (empty) assertive
 *  live region of its own, which is also `role="alert"`, so the query is scoped. */
const crashScreen = () => document.querySelector('[role="alert"]:not(:empty)');

/** Let the `onReport` promise chain settle and its setState land. */
const settle = () => act(async () => {
  await new Promise((r) => setTimeout(r, 0));
});

describe("ErrorBoundary crash screen", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    shouldThrow = true;
    ErrorBoundary.forgetReports();
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("quotes the error, offers Try again and Reload, and works without a provider", () => {
    render(
      <ErrorBoundary appVersion="1.2.3">
        <Boom error={new TypeError("x is undefined")} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByText("TypeError: x is undefined")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy error report" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Error details/ }));
    const pre = document.querySelector("pre");
    expect(pre?.textContent).toMatch(/^TypeError: x is undefined\nPage: \//);
    expect(pre?.textContent).toContain("App version: 1.2.3");
    expect(pre?.textContent).toContain("Component stack:");
  });

  it("showMessage={false} hides the quote; copyReport and showDetails can go too", () => {
    render(
      <ErrorBoundary showMessage={false} copyReport={false} showDetails={false}>
        <Boom error={new Error("quiet")} />
      </ErrorBoundary>,
    );
    expect(screen.queryByText("Error: quiet")).toBeNull();
    expect(screen.queryByRole("button", { name: "Copy error report" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Error details/ })).toBeNull();
  });

  it("Reload reloads the page", () => {
    const reload = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, reload } as Location);
    render(
      <ErrorBoundary>
        <Boom error={new Error("reload me")} />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("files through onReport once, shows the reference and drops the copy button", async () => {
    const onReport = vi.fn(async (_report: CrashReport) => ({ reference: "#123" }));
    render(
      <ErrorBoundary
        onReport={onReport}
        appVersion="9.9.9"
        reportExtras={() => ({ tenant: "t-1" })}
      >
        <Boom error={new Error("filed")} />
      </ErrorBoundary>,
    );
    await settle();
    expect(onReport).toHaveBeenCalledTimes(1);
    const report = onReport.mock.calls[0][0];
    expect(report).toMatchObject({ name: "Error", message: "filed", appVersion: "9.9.9", extras: { tenant: "t-1" } });
    expect(report.componentStack).toContain("Boom");
    expect(Number.isNaN(Date.parse(report.time))).toBe(false);
    expect(screen.getByText("Reported as #123")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy error report" })).toBeNull();
  });

  it("carries placement into the report, its text and its fingerprint (keksdose G3b)", async () => {
    const onReport = vi.fn(async (_report: CrashReport) => ({ reference: "#1" }));
    const error = new Error("twice");
    render(
      <>
        <ErrorBoundary onReport={onReport} placement="page">
          <Boom error={error} />
        </ErrorBoundary>
        <ErrorBoundary onReport={onReport} placement="app">
          <Boom error={error} />
        </ErrorBoundary>
      </>,
    );
    await settle();
    // Two placements are two facts for triage, not one duplicate.
    expect(onReport.mock.calls.map(([r]) => r.placement)).toEqual(["page", "app"]);
    expect(formatCrashReport(onReport.mock.calls[0][0])).toContain("Placement: page");
    const base = { name: "Error", message: "x", stack: "at a" };
    expect(crashFingerprint({ ...base, placement: "app" })).not.toBe(crashFingerprint({ ...base, placement: "page" }));
    expect(crashFingerprint(base)).toBe(crashFingerprint({ ...base }));
  });

  it("files the same crash once per page load, and a second boundary shows the same reference", async () => {
    const onReport = vi.fn(async () => ({ reference: "abc" }));
    const error = new Error("twice");
    const first = render(
      <ErrorBoundary onReport={onReport}>
        <Boom error={error} />
      </ErrorBoundary>,
    );
    await settle();
    first.unmount();
    render(
      <ErrorBoundary onReport={onReport}>
        <Boom error={error} />
      </ErrorBoundary>,
    );
    await settle();
    expect(onReport).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Reported as abc")).toBeInTheDocument();
  });

  it("a void result means filed without a reference; { filed: false } claims nothing", async () => {
    const { unmount } = render(
      <ErrorBoundary onReport={async () => undefined}>
        <Boom error={new Error("void result")} />
      </ErrorBoundary>,
    );
    await settle();
    expect(screen.getByText("This error has been reported automatically.")).toBeInTheDocument();
    unmount();
    render(
      <ErrorBoundary onReport={async () => ({ filed: false })}>
        <Boom error={new Error("refused")} />
      </ErrorBoundary>,
    );
    await settle();
    expect(screen.queryByText(/reported/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Copy error report" })).toBeInTheDocument();
  });

  it("a throwing or rejecting onReport never reaches the boundary; the copy button stays", async () => {
    const { unmount } = render(
      <ErrorBoundary
        onReport={() => {
          throw new Error("reporter broke");
        }}
      >
        <Boom error={new Error("sync throw")} />
      </ErrorBoundary>,
    );
    await settle();
    expect(crashScreen()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy error report" })).toBeInTheDocument();
    unmount();
    render(
      <ErrorBoundary onReport={() => Promise.reject(new Error("network"))}>
        <Boom error={new Error("rejection")} />
      </ErrorBoundary>,
    );
    await settle();
    expect(crashScreen()).toBeInTheDocument();
    expect(screen.queryByText(/reported/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Copy error report" })).toBeInTheDocument();
  });

  it("a throwing onError or reportExtras is swallowed", () => {
    render(
      <ErrorBoundary
        onError={() => {
          throw new Error("logger broke");
        }}
        reportExtras={() => {
          throw new Error("extras broke");
        }}
      >
        <Boom error={new Error("still shown")} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Error: still shown")).toBeInTheDocument();
  });

  it("a filing that settles after Try again does not write into the next screen", async () => {
    let resolve!: (v: { reference: string }) => void;
    const onReport = vi.fn(() => new Promise<{ reference: string }>((r) => (resolve = r)));
    render(
      <ErrorBoundary onReport={onReport}>
        <Boom error={new Error("late filing")} />
      </ErrorBoundary>,
    );
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await act(async () => {
      resolve({ reference: "late" });
    });
    expect(screen.getByText("fine")).toBeInTheDocument();
    expect(screen.queryByText(/late/)).toBeNull();
  });

  it("redact rewrites what is shown, copied and sent; a throwing redact fails closed", async () => {
    window.history.replaceState(null, "", "/register?q=Secret+Payee&p=2");
    const onReport = vi.fn(async (_report: CrashReport) => undefined);
    const { unmount } = render(
      <ErrorBoundary
        onReport={onReport}
        redact={(r) => {
          const url = new URL(r.page, "http://x");
          const kept = new URLSearchParams([...url.searchParams].filter(([k]) => k === "p"));
          return { ...r, page: `${url.pathname}?${kept.toString()}` };
        }}
      >
        <Boom error={new Error("redacted")} />
      </ErrorBoundary>,
    );
    await settle();
    expect(onReport.mock.calls[0][0].page).toBe("/register?p=2");
    expect(document.body.textContent).not.toContain("Secret");
    unmount();
    render(
      <ErrorBoundary
        onReport={onReport}
        reportExtras={() => ({ memo: "private" })}
        redact={() => {
          throw new Error("redact broke");
        }}
      >
        <Boom error={new Error("redact throws")} />
      </ErrorBoundary>,
    );
    await settle();
    expect(onReport.mock.calls[1][0]).toMatchObject({ page: "/register", extras: {} });
    window.history.replaceState(null, "", "/");
  });

  it("a chunk-load error says a new version is available, Reload first, no Try again, not filed", async () => {
    const onReport = vi.fn(async () => undefined);
    render(
      <ErrorBoundary onReport={onReport}>
        <Boom error={new TypeError("Failed to fetch dynamically imported module: /assets/page-abc.js")} />
      </ErrorBoundary>,
    );
    await settle();
    expect(screen.getByRole("heading", { name: "A new version is available" })).toBeInTheDocument();
    expect(screen.queryByText(/dynamically imported module/)).toBeNull();
    const buttons = screen.getAllByRole("button").map((b) => b.textContent);
    expect(buttons[0]).toBe("Reload");
    expect(buttons).not.toContain("Try again");
    expect(onReport).not.toHaveBeenCalled();
  });

  it("offline says so, with Reload first", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    render(
      <ErrorBoundary>
        <Boom error={new Error("offline crash")} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("heading", { name: "You’re offline" })).toBeInTheDocument();
    const buttons = screen.getAllByRole("button").map((b) => b.textContent);
    expect(buttons.slice(0, 2)).toEqual(["Reload", "Try again"]);
  });

  it("renders the app's actions beside the built-in ones", () => {
    render(
      <ErrorBoundary actions={<button type="button">Clear local data</button>}>
        <Boom error={new Error("actions")} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("button", { name: "Clear local data" })).toBeInTheDocument();
  });

  it("translates through the provider", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE}>
        <ErrorBoundary>
          <Boom error={new Error("übersetzt")} />
        </ErrorBoundary>
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Neu laden" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fehlerbericht kopieren" })).toBeInTheDocument();
  });

  it("hands the report to a render-prop fallback", () => {
    render(
      <ErrorBoundary appVersion="2.0.0" fallback={({ report }) => <p>{report?.appVersion ?? "no report yet"}</p>}>
        <Boom error={new Error("render prop")} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("2.0.0")).toBeInTheDocument();
  });
});

describe("crash report helpers", () => {
  const base: CrashReport = {
    name: "TypeError",
    message: "boom",
    stack: "TypeError: boom\n    at a (a.js:1)\n    at b (b.js:2)\n    at c (c.js:3)\n    at d (d.js:4)",
    componentStack: "\n    at Page\n    at App",
    page: "/a?p=1",
    time: "2026-09-27T10:00:00.000Z",
    userAgent: "UA",
    appVersion: "1.0.0",
    online: false,
    chunkLoad: false,
    extras: { tenant: "t" },
  };

  it("formatCrashReport prints the error line first, then where/when/what, then the stacks", () => {
    expect(formatCrashReport(base)).toBe(
      [
        "TypeError: boom",
        "Page: /a?p=1",
        "Time: 2026-09-27T10:00:00.000Z",
        "User agent: UA",
        "App version: 1.0.0",
        "Online: no",
        "tenant: t",
        "",
        "Stack:",
        base.stack,
        "",
        "Component stack:",
        "at Page\n    at App",
      ].join("\n"),
    );
  });

  it("crashFingerprint ignores page and time, and tells different stacks apart", () => {
    expect(crashFingerprint(base)).toBe(crashFingerprint({ ...base, page: "/b", time: "later" } as CrashReport));
    expect(crashFingerprint(base)).not.toBe(crashFingerprint({ ...base, stack: "TypeError: boom\n    at z (z.js:9)" }));
  });

  it("isChunkLoadError knows Vite and webpack, and never throws", () => {
    expect(isChunkLoadError({ name: "ChunkLoadError", message: "Loading chunk 7 failed." })).toBe(true);
    expect(isChunkLoadError({ name: "TypeError", message: "error loading dynamically imported module" })).toBe(true);
    expect(isChunkLoadError({ name: "TypeError", message: "x is undefined" })).toBe(false);
    const hostile = {
      get message(): string {
        throw new Error("gotcha");
      },
    };
    expect(isChunkLoadError(hostile)).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});
