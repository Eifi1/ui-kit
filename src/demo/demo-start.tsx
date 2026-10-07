import { useState } from "react";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";
import { AlertBanner } from "../components/alert-banner";
import { Button, Spinner } from "../components/ui";
import { useNoIndex } from "../hooks/use-noindex";
import { authErrorCode, isRateLimited, retryAfterSeconds } from "../auth/auth-errors";
import { useOncePerKey } from "../auth/status-parts";
import { useAccessAction } from "../landing/access";
import type { AccessChoice } from "../landing/access";
import type { LandingLabels } from "../landing/landing-labels";
import { useDemoLabels } from "./demo-labels";
import type { DemoLabels } from "./demo-labels";

/** Why a start was refused, in the page's terms (§5.2). */
type Refusal =
  | { reason: "rateLimited"; minutes?: number }
  | { reason: "capacity" }
  | { reason: "unavailable" }
  | { reason: "failed" };

/**
 * The server's answer to `POST /auth/demo-session`, read as a refusal (§5.1, §6.2):
 * `demo_rate_limited` (429, with `Retry-After`), `demo_capacity` (429, without),
 * `demo_disabled` (404) and `demo_not_ready` (503) by their codes; a bare 429 as the
 * per-IP window too; anything else is a plain failure.
 */
function refusalOf(error: unknown): Refusal {
  const code = authErrorCode(error);
  if (code === "demo_capacity") return { reason: "capacity" };
  if (code === "demo_disabled" || code === "demo_not_ready") return { reason: "unavailable" };
  if (code === "demo_rate_limited" || (code === undefined && isRateLimited(error))) {
    const seconds = retryAfterSeconds(error);
    return { reason: "rateLimited", minutes: seconds ? Math.ceil(seconds / 60) : undefined };
  }
  return { reason: "failed" };
}

function messageOf(refusal: Refusal, labels: DemoLabels): string {
  switch (refusal.reason) {
    case "rateLimited":
      return labels.rateLimited(refusal.minutes);
    case "capacity":
      return labels.capacity;
    case "unavailable":
      return labels.unavailable;
    case "failed":
      return labels.failed;
  }
}

/** The one start a mount makes. */
const ONCE = "demo";

export interface DemoStartProps<T> extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /**
   * Create the demo: the app's `POST /auth/demo-session {locale}`. Resolve with what it
   * answered (the `TokenResponse`, `refresh_token: null`, `expires_at`); reject with the
   * client's error — the codes are read out of it. Called once per mount.
   */
  start: () => Promise<T>;
  /** The demo exists: store the session (and, for kastlan, `kastlan.demoSession`) and
   *  replace to the app's home. The page keeps saying "Starting the demo…" meanwhile. */
  onStarted: (session: T) => void;
  /** "Request access" beside a refusal. */
  access: AccessChoice;
  /** "Back to the start page". Default `/`. */
  backHref?: string;
  /** `false` adds no `noindex` — for a preview. Default `true`: `/demo` is never indexed
   *  (§4.3). */
  noIndex?: boolean;
  labels?: Partial<DemoLabels>;
  /** The access words (`landing` namespace) for this instance. */
  landingLabels?: Partial<LandingLabels>;
}

/**
 * The `/demo` page's content (docs/landing-demo-harmonization.md §5.2): it starts the
 * demo ONCE — StrictMode's double mount included, keksdose's ref guard — and says
 * "Starting the demo…" until the app has the session and has moved on.
 *
 * A refusal says why, in the visitor's words, and offers "Request access" and "Back to
 * the start page":
 *
 * | code | says |
 * |---|---|
 * | `demo_rate_limited` (429) | "Too many demos from this network. Try again in N min." — N from `Retry-After` |
 * | `demo_capacity` (429) | "The demo is full right now. Try again later." |
 * | `demo_disabled` (404), `demo_not_ready` (503) | "The demo isn't available right now." |
 * | anything else | "The demo could not be started. Please try again." |
 *
 * keksdose fell back to `/register` with a toast; registration is invitation-only now,
 * so the way on is the access mail.
 *
 * Put it in the app's `AuthLayout`. A live demo session never reaches it: the `/demo`
 * route sits in `RedirectIfAuthed` WITHOUT `allowDemo`, which continues the live demo at
 * its resume target instead of starting a second one. A cold start is the kit's
 * `ServerWakeNotice`'s, once the app's watcher counts this POST
 * (`watchReadsAnd(/\/auth\/demo-session\b/)`).
 */
export function DemoStart<T>({
  start,
  onStarted,
  access,
  backHref = "/",
  noIndex = true,
  labels: labelsProp,
  landingLabels,
  className,
  ...rest
}: DemoStartProps<T>) {
  const labels = useDemoLabels(labelsProp);
  const accessLink = useAccessAction(access, landingLabels);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  useNoIndex(noIndex);
  useOncePerKey<T>(ONCE, () => start(), (_key, result) => {
    if (result.ok) onStarted(result.value);
    else setRefusal(refusalOf(result.error));
  });

  return (
    <div {...rest} className={cn("flex flex-col items-center gap-4 py-4 text-center", className)}>
      {/* One live region, there from the start, so the refusal that replaces the
          progress line is announced (a region inserted with its text often is not). */}
      <div role="status" aria-live="polite" className="w-full">
        {refusal === null ? (
          <p className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
            <Spinner label={null} className="size-5" />
            {labels.starting}
          </p>
        ) : (
          <AlertBanner tone={refusal.reason === "failed" ? "danger" : "warning"} className="text-start">
            {messageOf(refusal, labels)}
          </AlertBanner>
        )}
      </div>
      {refusal !== null && (
        <div className="flex flex-wrap justify-center gap-3">
          <Button href={accessLink.href} variant="brand">
            {accessLink.label}
          </Button>
          <Button href={backHref} variant="secondary">
            {labels.backToStart}
          </Button>
        </div>
      )}
    </div>
  );
}
