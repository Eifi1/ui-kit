import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { useKitLabels } from "../i18n/kit-labels";
import { Button, EmptyState } from "./ui";
import { Disclosure } from "./disclosure";

/** The words of the default fallback. */
export interface ErrorBoundaryLabels {
  /** The fallback's heading. */
  title: string;
  /** The line under it. */
  message: string;
  /** The button that clears the error and renders the children again. */
  retry: string;
  /** The disclosure that opens the error's own text (`showDetails`). */
  details: string;
}

export const DEFAULT_ERROR_BOUNDARY_LABELS: ErrorBoundaryLabels = {
  title: "Something went wrong",
  message: "This part of the page could not be shown. Try again, or reload the page.",
  retry: "Try again",
  details: "Error details",
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

/** {@link ErrorBoundaryDetails} of any thrown value, without ever throwing. */
export function describeThrown(error: unknown): ErrorBoundaryDetails {
  if (typeof error === "object" && error !== null) {
    const e = error as { name?: unknown; message?: unknown; stack?: unknown };
    return {
      name: read(() => e.name) ?? "Error",
      message: read(() => e.message) ?? "",
      stack: read(() => e.stack),
    };
  }
  return { name: "Error", message: read(() => error) ?? "" };
}

/** What a render-prop `fallback` is handed. */
export interface ErrorBoundaryFallbackProps {
  /** The thrown value, as it was thrown. Read it with care — see {@link describeThrown}. */
  error: unknown;
  details: ErrorBoundaryDetails;
  /** Clear the error and render the children again. */
  reset: () => void;
}

export interface ErrorBoundaryProps {
  children?: ReactNode;
  /** Replaces the default fallback: a node, or a render function handed the error and
   *  a `reset`. */
  fallback?: ReactNode | ((props: ErrorBoundaryFallbackProps) => ReactNode);
  /** Called once per caught error — log it, file a crash report. */
  onError?: (error: unknown, info: ErrorInfo) => void;
  /** Called when the error is cleared, by Retry, `reset` or a `resetKeys` change —
   *  drop a cache, refetch. */
  onReset?: () => void;
  /**
   * When any of these changes (compared with `Object.is`) AFTER an error was caught, the
   * error is cleared and the children render again — a change in the same update that
   * threw does not count (it is what the error was shown under) — pass the route path so leaving a broken page does not
   * carry its fallback to the next one (keksdose's `resetKey`).
   */
  resetKeys?: ReadonlyArray<unknown>;
  /** A disclosure under the message with the error's name, message and stack — for an
   *  internal tool, or while developing. Off by default: a stack means nothing to a user. */
  showDetails?: boolean;
  /** The default fallback's heading level. Default `h2`: the fallback often IS the page. */
  headingAs?: "h2" | "h3" | "h4" | "h5" | "h6";
  /** Classes for the default fallback's box (`m-8 min-h-[400px]`, kastlan). */
  className?: string;
  labels?: Partial<ErrorBoundaryLabels>;
}

interface ErrorBoundaryState {
  /** A flag of its own, so `throw undefined` is still an error shown. */
  failed: boolean;
  error: unknown;
  details: ErrorBoundaryDetails | null;
}

const CLEAR: ErrorBoundaryState = { failed: false, error: null, details: null };

function keysChanged(a: ReadonlyArray<unknown> | undefined, b: ReadonlyArray<unknown> | undefined): boolean {
  if (a === b) return false;
  if (!a || !b || a.length !== b.length) return true;
  return a.some((v, i) => !Object.is(v, b[i]));
}

/**
 * Catch a render error below it and show a fallback instead of an empty page.
 *
 * kastlan (shared/components/error-boundary.tsx) and keksdose (app/error-boundary.tsx)
 * each built one on `EmptyState tone="danger"`: a warning glyph, a title, a line of
 * explanation and a Retry. This is that fallback, translated through the provider
 * (`errorBoundary.*`), with the hooks an app hangs its own behaviour on — `onError`
 * for the crash report, `resetKeys` for the route change, `fallback` for anything else.
 *
 * The fallback is `role="alert"`: a page replaced by an error is news, and a reader
 * that was on it is told.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = CLEAR;

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { failed: true, error, details: describeThrown(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.props.onError?.(error, info);
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
    this.props.onReset?.();
    this.setState(CLEAR);
  };

  render(): ReactNode {
    const { failed, error, details } = this.state;
    if (!failed || !details) return this.props.children;
    const { fallback } = this.props;
    if (typeof fallback === "function") return fallback({ error, details, reset: this.reset });
    if (fallback !== undefined) return fallback;
    return (
      <ErrorFallback
        details={details}
        reset={this.reset}
        showDetails={this.props.showDetails ?? false}
        headingAs={this.props.headingAs ?? "h2"}
        className={this.props.className}
        labels={this.props.labels}
      />
    );
  }
}

function ErrorFallback({
  details,
  reset,
  showDetails,
  headingAs,
  className,
  labels,
}: {
  details: ErrorBoundaryDetails;
  reset: () => void;
  showDetails: boolean;
  headingAs: NonNullable<ErrorBoundaryProps["headingAs"]>;
  className?: string;
  labels?: Partial<ErrorBoundaryLabels>;
}) {
  const text = useKitLabels("errorBoundary", DEFAULT_ERROR_BOUNDARY_LABELS, labels);
  return (
    <EmptyState
      role="alert"
      tone="danger"
      headingAs={headingAs}
      className={className}
      icon={<AlertTriangle />}
      title={text.title}
      hint={text.message}
      action={
        <>
          <Button variant="secondary" onClick={reset}>
            {text.retry}
          </Button>
          {showDetails && (
            <Disclosure variant="bare" title={text.details} className="basis-full text-start">
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words text-xs text-[var(--text-secondary)]">
                {details.message ? `${details.name}: ${details.message}` : details.name}
                {details.stack ? `\n\n${details.stack}` : null}
              </pre>
            </Disclosure>
          )}
        </>
      }
    />
  );
}
