import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary, describeThrown } from "../error-boundary";
import { UiKitProvider } from "../../i18n/kit-labels";

/** The crash screen: every one of its modes offers Reload. Not the alert — since 0.52
 *  (DSP-17) that is a live region that speaks a moment after the screen appears. */
const crashScreen = () => screen.queryByRole("button", { name: "Reload" });

let shouldThrow = true;
function Boom({ value }: { value?: unknown }): React.ReactNode {
  if (shouldThrow) throw value ?? new Error("kaputt");
  return <p>fine</p>;
}

describe("ErrorBoundary", () => {
  let spy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    shouldThrow = true;
    // React logs every caught error to console.error; keep the output readable.
    spy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => spy.mockRestore());

  it("shows the danger fallback as an alert, calls onError, and Retry resets", () => {
    const onError = vi.fn();
    const onReset = vi.fn();
    render(
      <ErrorBoundary onError={onError} onReset={onReset}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(crashScreen()).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Something went wrong" })).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0][0] as Error).message).toBe("kaputt");

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText("fine")).toBeInTheDocument();
  });

  it("clears on a resetKeys change", () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={["/a"]}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(crashScreen()).toBeInTheDocument();
    shouldThrow = false;
    rerender(
      <ErrorBoundary resetKeys={["/b"]}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("fine")).toBeInTheDocument();
  });

  it("a resetKeys change in the update that throws does not reset; a later change does", () => {
    const onReset = vi.fn();
    let renders = 0;
    function Page({ path }: { path: string }) {
      renders++;
      if (path === "/broken") throw new Error("kaputt");
      return <p>{path}</p>;
    }
    const at = (path: string) => (
      <ErrorBoundary resetKeys={[path]} onReset={onReset}>
        <Page path={path} />
      </ErrorBoundary>
    );
    const { rerender } = render(at("/a"));
    expect(screen.getByText("/a")).toBeInTheDocument();
    // Navigate to a page that throws: the key changes in the same update.
    renders = 0;
    rerender(at("/broken"));
    expect(crashScreen()).toBeInTheDocument();
    expect(onReset).not.toHaveBeenCalled();
    const brokenRenders = renders;
    // An unrelated re-render with the same keys keeps the error.
    rerender(at("/broken"));
    expect(crashScreen()).toBeInTheDocument();
    expect(onReset).not.toHaveBeenCalled();
    expect(renders).toBe(brokenRenders);
    // Navigating away clears it, once.
    rerender(at("/b"));
    expect(screen.getByText("/b")).toBeInTheDocument();
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("translates through the provider and shows details on request", () => {
    render(
      <UiKitProvider labels={{ errorBoundary: { title: "Etwas ist schiefgelaufen", details: "Fehlerdetails" } }}>
        <ErrorBoundary showDetails>
          <Boom />
        </ErrorBoundary>
      </UiKitProvider>,
    );
    expect(screen.getByText("Etwas ist schiefgelaufen")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Fehlerdetails/ }));
    // The quoted message box, and the report inside the disclosure.
    expect(screen.getAllByText(/Error: kaputt/)).toHaveLength(2);
  });

  it("takes a render-prop fallback with reset", () => {
    render(
      <ErrorBoundary fallback={({ details, reset }) => <button onClick={reset}>{details.message}</button>}>
        <Boom />
      </ErrorBoundary>,
    );
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "kaputt" }));
    expect(screen.getByText("fine")).toBeInTheDocument();
  });

  it("survives hostile and empty throws", () => {
    const hostile = {
      get message(): string {
        throw new Error("gotcha");
      },
      name: Symbol("x"),
    };
    expect(describeThrown(hostile)).toEqual({ name: "Symbol(x)", message: "", stack: undefined });
    render(
      <ErrorBoundary>
        <Boom value={hostile} />
      </ErrorBoundary>,
    );
    expect(crashScreen()).toBeInTheDocument();
    expect(describeThrown(undefined)).toEqual({ name: "Error", message: "" });
    expect(describeThrown("plain")).toEqual({ name: "Error", message: "plain" });
  });

  it("quotes a thrown plain object as JSON when it has no message (keksdose G3a)", () => {
    expect(describeThrown({ code: 500 }).message).toBe('{"code":500}');
    expect(describeThrown({ code: 500, message: "Down" }).message).toBe("Down");
    expect(describeThrown(new Error("")).message).toBe("");
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(describeThrown(cyclic).message).toBe("");
    expect(describeThrown({ blob: "x".repeat(900) }).message).toHaveLength(500);
  });
});

/**
 * Refactor audit 2026-10-30, DSP-17: the fallback's `role="alert"` sat on the whole
 * EmptyState, actions included, so the second render's "Copy error report" and
 * "Details", "Reported as …", and the crash report's `<pre>` on opening Details were
 * each announced as an addition to an assertive region. The title and hint are said
 * once; nothing the reader opens or the boundary adds later is inside a live region.
 */
describe("ErrorBoundary's announcement", () => {
  let spy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    shouldThrow = true;
    spy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => spy.mockRestore());

  const live = (el: Element) => el.closest('[role="alert"], [role="status"], [aria-live]:not([aria-live="off"])');

  it("says the title and the hint once, assertively", async () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    const said = await screen.findByText(/Something went wrong/, { selector: '[role="alert"]' });
    expect(said).toHaveTextContent("This part of the page could not be shown");
    expect(said.querySelector("button")).toBeNull();
  });

  it("keeps the actions, the quoted error and the opened report out of every live region", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    for (const name of ["Try again", "Reload", "Copy error report"]) {
      expect(live(screen.getByRole("button", { name }))).toBeNull();
    }
    expect(live(screen.getByText("Error: kaputt"))).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Error details/ }));
    expect(live(document.querySelector("pre")!)).toBeNull();
  });
});
