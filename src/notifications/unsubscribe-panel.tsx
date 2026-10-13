import { useRef, useState } from "react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { CheckCircle2, Link2Off } from "lucide-react";

import type { LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { errorBodyWithCode, httpStatusOf } from "../auth/auth-errors";
import { INTRO_CLASS, OUTCOME_CLASS, STATUS_HEADING_CLASS, useFocusWhen } from "../auth/status-parts";
import type { AuthHeadingLevel } from "../auth/status-parts";
import { Button } from "../components/button";
import { EmptyState } from "../components/empty-state";
import { useMounted } from "../account/account-parts";
import { FailureLine, useNotificationsLabels } from "./notification-parts";
import type { NotificationsLabels } from "./notifications-labels";

/** A type id, as the server's registry allows it (§2.1). */
const TYPE_ID = /^[a-z][a-z0-9_]{1,39}$/;
/** base64url, unpadded, as the token's `<data>` is written (§3.6). */
const BASE64URL = /^[A-Za-z0-9_-]+$/;

/**
 * The notification type an unsubscribe token names, read from its `<data>` half —
 * `v1.<base64url("<user_id>:<type id>")>.<mac>` (docs/notifications-harmonization.md
 * §3.6) — or `null` for a token that does not parse. Only the claim is read: the MAC is
 * the server's to check, so a forged token still names a type here and the server
 * refuses it. For the page's words ("You get e-mails about: Overdue invoices").
 */
export function unsubscribeTokenType(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [version, data, mac] = parts;
  if (version !== "v1" || !BASE64URL.test(data) || !BASE64URL.test(mac) || data.length % 4 === 1) return null;
  let claim: string;
  try {
    claim = atob(data.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (data.length % 4)) % 4));
  } catch {
    return null;
  }
  const colon = claim.indexOf(":");
  if (colon < 1) return null;
  const type = claim.slice(colon + 1);
  return TYPE_ID.test(type) ? type : null;
}

/** server-kit's `UnsubscribeTokenError`: 400 `{code: "unsubscribe_invalid"}`. A body
 *  thrown as it came, with no status, counts on its code. */
function defaultIsInvalid(error: unknown): boolean {
  const coded = errorBodyWithCode(error, (code) => code === "unsubscribe_invalid") !== undefined;
  const status = httpStatusOf(error);
  return coded && (status === undefined || status === 400);
}

export interface UnsubscribePanelProps extends Omit<ComponentPropsWithRef<"div">, "children" | "title"> {
  /** The `token` from the page's query (`/unsubscribe?token=…`). */
  token: string;
  /** The app's name, for "Stop all notification e-mails from {app}". */
  appName: string;
  /** The type's name in the app's words, from {@link unsubscribeTokenType}. Without it
   *  the page says only that notification mail comes. */
  typeLabel?: string;
  /** `POST /notifications/unsubscribe/{token}`: that type's e-mail off. */
  onStop: (token: string) => Promise<unknown>;
  /** `POST /notifications/unsubscribe/{token}/all`: every e-mail switch off. */
  onStopAll: (token: string) => Promise<unknown>;
  /** Settings → Notifications, through the provider's link component. */
  settingsHref: string;
  /** Whether a rejection means the link is no good. Default: a 400 with
   *  `code: "unsubscribe_invalid"`. Anything else is "try again". */
  isInvalid?: (error: unknown) => boolean;
  /** The heading. Default `labels.unsubscribeTitle`; `null` draws none, for a page that
   *  puts it in `AuthLayout`'s `title`. */
  title?: ReactNode;
  /** The heading's level. Default `h2`, under the page's `h1`. */
  headingAs?: AuthHeadingLevel;
  labels?: LabelOverride<NotificationsLabels>;
}

type Phase = "ready" | "these" | "all" | "stopped-these" | "stopped-all" | "invalid" | "failed";

/**
 * The body of an app's signed-out `/unsubscribe` page (docs/notifications-harmonization.md
 * §3.6, §4.2) — the page a notification mail's footer links to. It works signed in or
 * out (auth §7), and is not a card.
 *
 * **Nothing happens on a GET**: link scanners fetch every URL, so the page asks first —
 * "Stop these e-mails", or "Stop all notification e-mails from {app}" — and only a press
 * POSTs. A mail client's one-click POST goes to the server's route directly, without
 * this page. Account mail is not a notification and keeps coming; the page says so, and
 * then how to turn the mail back on (Settings → Notifications).
 *
 * A token that does not parse is "this link doesn't work" at once, with no request; the
 * server's refusal (`unsubscribe_invalid`) says the same. Any other failure is "try
 * again", the buttons still there. A valid token always answers 200 — also when the
 * switch was already off or the account is gone — so the done state reveals nothing.
 */
export function UnsubscribePanel({
  token,
  appName,
  typeLabel,
  onStop,
  onStopAll,
  settingsHref,
  isInvalid = defaultIsInvalid,
  title,
  headingAs: Heading = "h2",
  labels: labelsProp,
  className,
  ...rest
}: UnsubscribePanelProps) {
  const labels = useNotificationsLabels(labelsProp);
  const parses = unsubscribeTokenType(token) !== null;
  const [phase, setPhase] = useState<Phase>("ready");
  const mounted = useMounted();
  const outcomeRef = useRef<HTMLDivElement>(null);
  const shown: Phase = parses ? phase : "invalid";
  const done = shown === "stopped-these" || shown === "stopped-all";
  useFocusWhen(done, outcomeRef);

  const stop = (which: "these" | "all") => {
    if (shown !== "ready" && shown !== "failed") return;
    setPhase(which);
    const call = which === "these" ? onStop : onStopAll;
    call(token).then(
      () => {
        if (mounted.current) setPhase(which === "these" ? "stopped-these" : "stopped-all");
      },
      (error: unknown) => {
        if (mounted.current) setPhase(isInvalid(error) ? "invalid" : "failed");
      },
    );
  };

  const settingsLink = (
    <Button href={settingsHref} variant="secondary">
      {labels.openSettings}
    </Button>
  );

  let body: ReactNode;
  if (shown === "invalid") {
    body = (
      <EmptyState
        tone="danger"
        icon={<Link2Off />}
        title={labels.invalidLink}
        action={settingsLink}
        className={OUTCOME_CLASS}
      />
    );
  } else if (done) {
    body = (
      <div ref={outcomeRef} tabIndex={-1} className="outline-none">
        <EmptyState
          tone="success"
          icon={<CheckCircle2 />}
          title={shown === "stopped-these" ? labels.stoppedThese : labels.stoppedAll(appName)}
          hint={
            <>
              {labels.accountMail} {labels.turnBackOn}
            </>
          }
          action={settingsLink}
          className={OUTCOME_CLASS}
        />
      </div>
    );
  } else {
    const working = shown === "these" || shown === "all";
    body = (
      <>
        <p className={INTRO_CLASS}>{typeLabel ? labels.unsubscribeAbout(typeLabel) : labels.unsubscribeGeneric}</p>
        <p className={INTRO_CLASS}>{labels.accountMail}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            pending={shown === "these"}
            disabled={working && shown !== "these"}
            onClick={() => stop("these")}
          >
            {labels.stopThese}
          </Button>
          <Button
            type="button"
            variant="secondary"
            pending={shown === "all"}
            disabled={working && shown !== "all"}
            onClick={() => stop("all")}
          >
            {labels.stopAll(appName)}
          </Button>
        </div>
        {shown === "failed" && <FailureLine>{labels.failed}</FailureLine>}
      </>
    );
  }

  return (
    <div {...rest} data-state={shown} className={cn("space-y-3", className)}>
      {title === null ? null : <Heading className={STATUS_HEADING_CLASS}>{title ?? labels.unsubscribeTitle}</Heading>}
      {body}
    </div>
  );
}
