import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";
import { Button } from "../components/ui";
import type { ButtonSize } from "../components/ui";
import { useAccessAction } from "./access";
import type { AccessChoice } from "./access";
import { useLandingLabels } from "./landing-labels";
import type { LandingLabels } from "./landing-labels";

/**
 * Who is looking at a public page (docs/landing-demo-harmonization.md §3.1, §4.1):
 * nobody signed in, a demo session, or a real account. The app derives it from its auth
 * state — a demo is `isDemoSession(me)`.
 */
export type LandingSession = "none" | "demo" | "user";

/** keksdose's hero buttons: wider than the kit's `md` (px-5 py-2.5), the page's
 *  largest actions. */
const LARGE = "px-5 py-2.5";

export interface LandingActionsProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  session: LandingSession;
  access: AccessChoice;
  /** "Try the demo" without a session, "Continue the demo" with a demo one. Default
   *  `/demo`, which starts a demo — or, for a live one, continues it (§3.1). */
  demoHref?: string;
  /** "Open app" for a real session: the resume target. Default `/`, which resumes
   *  through `RootEntry`. */
  openAppHref?: string;
  /** `large` (default): the hero's and the CTA band's size. Or a kit `ButtonSize`. */
  size?: ButtonSize | "large";
  /** `start` (default) under the hero's copy; `center` in the CTA band. */
  align?: "start" | "center";
  labels?: Partial<LandingLabels>;
}

/**
 * The landing's action pair for the visitor's state (§4.1), shared by {@link Hero} and
 * {@link CtaBand}:
 *
 * | session | actions |
 * |---|---|
 * | none | **Request access** (primary), Try the demo |
 * | demo | **Request access** (primary), Continue the demo |
 * | user | **Open app** (primary), alone |
 *
 * keksdose showed a signed-in visitor (who reached the landing by its brand link,
 * `/welcome`) the register/demo pair, which `RedirectIfAuthed` then silently bounced
 * back into the app; one "Open app" says where it goes. "Request access" is the mail of
 * {@link accessAction}, or "Get started" once the app opens registration.
 *
 * Stacked full-width on a phone, a row from `sm` up — keksdose's layout.
 */
export function LandingActions({
  session,
  access,
  demoHref = "/demo",
  openAppHref = "/",
  size = "large",
  align = "start",
  labels: labelsProp,
  className,
  ...rest
}: LandingActionsProps) {
  const labels = useLandingLabels(labelsProp);
  const accessLink = useAccessAction(access, labelsProp);
  const buttonSize: ButtonSize = size === "large" ? "md" : size;
  const extra = size === "large" ? LARGE : undefined;
  return (
    <div
      {...rest}
      data-slot="landing-actions"
      className={cn("flex flex-col gap-3 sm:flex-row", align === "center" && "sm:justify-center", className)}
    >
      {session === "user" ? (
        <Button href={openAppHref} variant="brand" size={buttonSize} className={extra}>
          {labels.openApp}
        </Button>
      ) : (
        <>
          <Button href={accessLink.href} variant="brand" size={buttonSize} className={extra}>
            {accessLink.label}
          </Button>
          <Button href={demoHref} variant="secondary" size={buttonSize} className={extra}>
            {session === "demo" ? labels.continueDemo : labels.tryDemo}
          </Button>
        </>
      )}
    </div>
  );
}
