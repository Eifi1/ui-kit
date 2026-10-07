import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Hourglass } from "lucide-react";

import { cn } from "../lib/cn";
import { Button } from "../components/ui";
import { useNoIndex } from "../hooks/use-noindex";
import type { AuthHeadingLevel } from "../auth/status-parts";
import { useAccessAction } from "../landing/access";
import type { AccessChoice } from "../landing/access";
import { useLandingLabels } from "../landing/landing-labels";
import type { LandingLabels } from "../landing/landing-labels";
import { useDemoLabels } from "./demo-labels";
import type { DemoLabels } from "./demo-labels";
import type { DemoModel } from "./demo-session";

export interface DemoEndedProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "title"> {
  /** Which line the page says about the data (§2.3). */
  model: DemoModel;
  /** "Request access". */
  access: AccessChoice;
  /** "Start a new demo". Default `/demo` — a new demo may start after one ends, within
   *  the per-IP window (§2.7). */
  restartHref?: string;
  /** "Sign in". Default `/login`. */
  signInHref?: string;
  /** App content under the line. */
  children?: ReactNode;
  /** `false` adds no `noindex` — for a preview. Default `true` (§4.3). */
  noIndex?: boolean;
  /** Default `h2`, under `AuthLayout`'s `h1`. */
  headingAs?: AuthHeadingLevel;
  labels?: Partial<DemoLabels>;
  /** The access words (`landing` namespace) for this instance. */
  landingLabels?: Partial<LandingLabels>;
}

/**
 * The `/demo/ended` page's content (docs/landing-demo-harmonization.md §5.5): "The demo
 * has ended", one line on what became of the data, and three ways on — "Start a new
 * demo", "Request access", "Sign in".
 *
 * Where a demo lands at `expires_at`, or on ANY 401 while the session is a demo: the
 * client clears the session and replaces to `/demo/ended`, never to `/login`. keksdose's
 * expired demo met an unexplained sign-in form. The server deletes the user at the next
 * reap; nothing is kept.
 *
 * Content, like `NotFoundPage`: put it in the app's `AuthLayout` (its logo, language
 * menu and legal footer). It marks the page `noindex`; robots.txt must NOT disallow it,
 * or a crawler could never read that (§10.8).
 */
export function DemoEnded({
  model,
  access,
  restartHref = "/demo",
  signInHref = "/login",
  children,
  noIndex = true,
  headingAs: Heading = "h2",
  labels: labelsProp,
  landingLabels,
  className,
  ...rest
}: DemoEndedProps) {
  const labels = useDemoLabels(labelsProp);
  const landing = useLandingLabels(landingLabels);
  const accessLink = useAccessAction(access, landingLabels);
  useNoIndex(noIndex);
  return (
    <div {...rest} className={cn("flex flex-col items-center gap-2 py-4 text-center", className)}>
      <Hourglass aria-hidden className="size-10 text-[var(--text-placeholder)]" />
      <Heading className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{labels.endedTitle}</Heading>
      <p className="max-w-prose text-sm text-[var(--text-secondary)]">
        {model === "sandbox" ? labels.endedSandbox : labels.endedReadOnly}
      </p>
      {children}
      <div className="mt-4 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">
        <Button href={restartHref} variant="brand">
          {labels.restart}
        </Button>
        <Button href={accessLink.href} variant="secondary">
          {accessLink.label}
        </Button>
        <Button href={signInHref} variant="secondary">
          {landing.signIn}
        </Button>
      </div>
    </div>
  );
}
