import { useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { ChevronDown, ChevronUp, Timer } from "lucide-react";

import { cn } from "../lib/cn";
import { AlertBanner } from "../components/alert-banner";
import { Button, IconButton } from "../components/ui";
import { useAccessAction } from "../landing/access";
import type { AccessChoice } from "../landing/access";
import { useLandingLabels } from "../landing/landing-labels";
import type { LandingLabels } from "../landing/landing-labels";
import { useDemoCountdown } from "./demo-countdown";
import type { DemoCountdown, DemoExpiry } from "./demo-countdown";
import { useDemoLabels } from "./demo-labels";
import type { DemoLabels } from "./demo-labels";
import type { DemoModel } from "./demo-session";

/** The default `sessionStorage` key of the collapsed state. */
const COLLAPSE_KEY = "kit.demoBanner.collapsed";

/** `sessionStorage`, guarded like `lib/safe-storage`'s `localStorage`: blocked storage
 *  reads as "not set" and writes nothing. */
function readSession(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // storage blocked: the banner just opens again next time
  }
}

/** "Demo · 23 h 12 min left", "Demo · 50 min left", the end, or plain "Demo". */
function timeText(countdown: DemoCountdown, labels: DemoLabels): string {
  if (countdown.minutesLeft === null) return labels.badge;
  if (countdown.ended) return labels.endedTitle;
  return countdown.lastHour
    ? labels.minutesLeft(countdown.minutes)
    : labels.hoursLeft(countdown.hours, countdown.minutes);
}

export interface DemoBannerProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onClick"> {
  /** The demo's end: `expires_at` from the `TokenResponse`, or `demo_expires_at` from
   *  `/auth/me` (§5.3). */
  expiresAt: DemoExpiry | null | undefined;
  /** Which line the banner says about the data (§2.3). */
  model: DemoModel;
  /** "Request access". */
  access: AccessChoice;
  /** "Sign in" — let through for a demo session by `RedirectIfAuthed allowDemo`. Default
   *  `/login`. */
  signInHref?: string;
  /** The countdown reached zero: clear the session and replace to `/demo/ended` (§5.5). */
  onEnded?: () => void;
  /** Where the collapsed state is kept for the tab's session. Default
   *  `kit.demoBanner.collapsed`. */
  collapseKey?: string;
  /** The clock, for tests and previews. Default `Date.now`. Keep it stable. */
  now?: () => number;
  labels?: Partial<DemoLabels>;
  /** The access words (`landing` namespace) for this instance. */
  landingLabels?: Partial<LandingLabels>;
}

/**
 * The demo's strip under the top bar, on every page of a demo session
 * (docs/landing-demo-harmonization.md §5.4) — a kit `AlertBanner` strip:
 *
 * - the time left, "Demo · 23 h 12 min left" — minutes only in the last hour, and the
 *   warning tone in the last ten minutes (`useDemoCountdown`);
 * - one line on the model: R "You're looking at sample data. Changes aren't possible.",
 *   S "Your own work is deleted when the demo ends.";
 * - "Request access" (the mail) and "Sign in".
 *
 * It collapses to the countdown alone, for the tab's session (`sessionStorage`) — never
 * hidden for good: it is a live state, like keksdose's preview banner, which a demo user
 * gets instead of. At zero it calls `onEnded`.
 *
 * The countdown is no live region: a sentence read out every minute would drown the
 * page. A screen-reader user meets it at the top of the page, and the end page says
 * the rest.
 */
export function DemoBanner({
  expiresAt,
  model,
  access,
  signInHref = "/login",
  onEnded,
  collapseKey = COLLAPSE_KEY,
  now,
  labels: labelsProp,
  landingLabels,
  className,
  ...rest
}: DemoBannerProps) {
  const labels = useDemoLabels(labelsProp);
  const landing = useLandingLabels(landingLabels);
  const accessLink = useAccessAction(access, landingLabels);
  const countdown = useDemoCountdown(expiresAt, { now, onEnded });
  const [collapsed, setCollapsed] = useState(() => readSession(collapseKey) === "1");

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    writeSession(collapseKey, next ? "1" : null);
  };

  return (
    <AlertBanner
      {...rest}
      variant="strip"
      size="sm"
      tone={countdown.warning || countdown.ended ? "warning" : "info"}
      icon={<Timer />}
      data-demo-model={model}
      className={cn("sm:text-sm", className)}
      action={
        <>
          {!collapsed && (
            <>
              <Button href={accessLink.href} variant="brand" size="sm">
                {accessLink.label}
              </Button>
              <Button href={signInHref} variant="secondary" size="sm">
                {landing.signIn}
              </Button>
            </>
          )}
          <IconButton
            size="2xs"
            variant="ghost"
            label={labels.details}
            aria-expanded={!collapsed}
            onClick={toggle}
          >
            {collapsed ? <ChevronDown /> : <ChevronUp />}
          </IconButton>
        </>
      }
    >
      <span className="font-semibold">{timeText(countdown, labels)}</span>
      {!collapsed && (
        <>
          {" "}
          <span>{model === "read-only" ? labels.readOnly : labels.sandbox}</span>
        </>
      )}
    </AlertBanner>
  );
}
