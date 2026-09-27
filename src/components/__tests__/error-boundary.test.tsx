import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary, describeThrown } from "../error-boundary";
import { UiKitProvider } from "../../i18n/kit-labels";

/** The fallback's own alert. The copy button inside it (0.13) carries an empty
 *  assertive live region of its own, also `role="alert"`, so the query is scoped. */
const crashScreen = () => document.querySelector('[role="alert"]:not(:empty)');

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
