import { useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { MonitorSmartphone } from "lucide-react";

import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { formatRelativeTime, toDate } from "../lib/format";
import type { DateInput } from "../lib/format";
import { AlertBanner } from "../components/alert-banner";
import { Chip } from "../components/chip";
import { hasMessage } from "../components/choice-parts";
import { DangerConfirm } from "../components/danger-confirm";
import { Skeleton } from "../components/skeleton";
import { Button, Card } from "../components/ui";
import { CARD_DESCRIPTION_CLASS, CARD_TITLE_CLASS, settle, useMounted } from "./account-parts";

/* ── Labels ──────────────────────────────────────────────────────────────── */

/** Every string {@link SessionsSetting} renders — the `sessions` namespace of
 *  `<UiKitProvider labels>`, overridable per instance through `labels`. The confirm's
 *  Cancel is `dangerConfirm.cancel`. */
export interface SessionsLabels {
  /** The card's title. */
  title: string;
  /** The line under it: what "sign out everywhere" is for. */
  description: string;
  /** The button that asks first. */
  signOutEverywhere: string;
  /** The question it asks: every session ends, this one too. */
  signOutEverywherePrompt: string;
  /** The button that answers it. */
  confirmSignOutEverywhere: string;
  /** The device list's accessible name. */
  list: string;
  /** While the list loads. */
  loading: string;
  /** A list with no rows. */
  empty: string;
  /** The chip on the session this page runs in. */
  current: string;
  /** A session whose device the server could not name. */
  unknownDevice: string;
  /** Given the last activity, formatted ("3 hours ago", "5 Oct 2026"). */
  lastActive: (when: string) => string;
  /** Given the address the session was last seen from. */
  ip: (address: string) => string;
  /** A row's button, visible text. */
  revoke: string;
  /** The same button's accessible name, given the device — it starts with `revoke`,
   *  the visible text, so voice control finds it by what it says. */
  revokeItem: (device: string) => string;
  /** A request failed. */
  failed: string;
}

export const DEFAULT_SESSIONS_LABELS: SessionsLabels = {
  title: "Sessions",
  description: "Signed in on a device you no longer use, or don’t trust? Sign out everywhere.",
  signOutEverywhere: "Sign out everywhere…",
  signOutEverywherePrompt:
    "This ends every session, including this one: you will be signed out on this device too, and sign in again from here.",
  confirmSignOutEverywhere: "Sign out everywhere",
  list: "Where you’re signed in",
  loading: "Loading sessions…",
  empty: "No sessions to show.",
  current: "This device",
  unknownDevice: "Unknown device",
  lastActive: (when) => `Last active ${when}`,
  ip: (address) => `IP ${address}`,
  revoke: "Sign out",
  revokeItem: (device) => `Sign out ${device}`,
  failed: "That didn’t work. Please try again.",
};

/* ── Props ───────────────────────────────────────────────────────────────── */

/** What a session's `id` may be: the app's own key type. */
export type SessionId = string | number;

/** One stored session (kastlan's `GET /auth/sessions`). */
export interface SessionItem<Id extends SessionId = SessionId> {
  id: Id;
  /** The browser and system, as the server reads them ("Firefox on Windows"). Blank
   *  reads as `labels.unknownDevice`. */
  device?: string | null;
  /** The address it was last seen from. */
  ip?: string | null;
  /** A `Date`, an ISO string or epoch ms. */
  lastActiveAt?: DateInput;
  /** The session this page runs in: marked, and offered no "Sign out" of its own — the
   *  app's sign-out does that, and "Sign out everywhere" below. */
  current?: boolean;
}

/** Which request failed — {@link SessionsSettingProps.describeError}'s second argument. */
export type SessionsAction = "sign-out-everywhere" | "revoke";

export interface SessionsSettingProps<Id extends SessionId = SessionId>
  extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /**
   * End every session (`POST /auth/logout`, auth §6.3) — this one included. Asked
   * first; resolve once the server answered, then sign this page out: the card says
   * that the device signs out too, and its own session is gone.
   */
  onSignOutEverywhere: () => Promise<unknown> | void;
  /**
   * The stored sessions, where the app keeps them (kastlan's `user_sessions`, §6.3).
   * Left out, the card is "Sign out everywhere" alone — keksdose and Kurvenschmiede keep
   * a cut-off (`sessions_invalid_before`), not rows. `undefined` with `loading` while the
   * first load runs.
   */
  sessions?: readonly SessionItem<Id>[];
  /** The list is loading. */
  loading?: boolean;
  /** End one other session (`DELETE /auth/sessions/{id}`). Left out, no row buttons.
   *  The row is busy until it settles; refresh `sessions` then. */
  onRevoke?: (id: Id) => Promise<unknown> | void;
  /** The app's own words for a failure, or `undefined` for the kit's `failed`. */
  describeError?: (error: unknown, action: SessionsAction) => ReactNode | undefined;
  /** The "Last active" text. Default: how long ago, in the provider's locale, and the
   *  date once it is more than a week back. */
  formatLastActive?: (date: Date) => string;
  /** Overrides the provider's locale for the default format. */
  locale?: string;
  labels?: Partial<SessionsLabels>;
}

/**
 * Where the account is signed in, and the way out of all of it
 * (docs/user-admin-harmonization.md §6.3, §2.6).
 *
 * **"Sign out everywhere", in every app.** It ends every session, THIS one included —
 * the server stamps a cut-off (`sessions_invalid_before`) that the page's own token is
 * older than — so the confirm says so before it is pressed, and the app signs out once it
 * resolves. A {@link DangerConfirm} in the warning tone: nothing is lost, but the person
 * has to sign in again on every device. keksdose kept its ordinary sign-out device-only
 * (its offline mirror is wiped on an explicit sign-out), which is why this is an action
 * of its own, not a mode of that one.
 *
 * **The device list, where sessions are stored** (kastlan): device, address, last
 * active, and "This device" on the current one, with "Sign out" on each other row — no
 * confirm, since a session ended is a sign-in away from coming back, not data lost.
 * Without `sessions` there is no list: the other apps keep a cut-off, not rows.
 *
 * Both requests are the app's; a failure is said under the card's action, in the app's
 * words if `describeError` has them.
 */
export function SessionsSetting<Id extends SessionId = SessionId>({
  onSignOutEverywhere,
  sessions,
  loading,
  onRevoke,
  describeError,
  formatLastActive,
  locale: localeProp,
  labels: labelsProp,
  className,
  ...rest
}: SessionsSettingProps<Id>) {
  const labels = useKitLabels("sessions", DEFAULT_SESSIONS_LABELS, labelsProp);
  const locale = useKitLocale(localeProp);
  const [busyId, setBusyId] = useState<Id | null>(null);
  const [failure, setFailure] = useState<ReactNode>(null);
  const mounted = useMounted();

  const describe = (error: unknown, action: SessionsAction): ReactNode => {
    const own = describeError?.(error, action);
    return hasMessage(own) ? own : labels.failed;
  };

  const lastActive = (value: DateInput): string | null => {
    const date = toDate(value);
    if (!date) return null;
    return formatLastActive
      ? formatLastActive(date)
      : formatRelativeTime(date, { locale, absoluteAfterDays: 7, absoluteStyle: "medium" });
  };

  const signOutEverywhere = () => {
    setFailure(null);
    // Rejected again after it is said, so the tile stays armed for a retry.
    return settle(onSignOutEverywhere).catch((error: unknown) => {
      if (mounted.current) setFailure(describe(error, "sign-out-everywhere"));
      throw error;
    });
  };

  const revoke = (id: Id) => {
    if (!onRevoke || busyId !== null) return;
    setBusyId(id);
    setFailure(null);
    settle(() => onRevoke(id)).then(
      () => {
        if (mounted.current) setBusyId(null);
      },
      (error: unknown) => {
        if (!mounted.current) return;
        setBusyId(null);
        setFailure(describe(error, "revoke"));
      },
    );
  };

  const showList = sessions !== undefined || loading;

  return (
    <Card {...rest} className={cn("p-4 space-y-3", className)}>
      <div>
        <div className={CARD_TITLE_CLASS}>{labels.title}</div>
        <div className={CARD_DESCRIPTION_CLASS}>{labels.description}</div>
      </div>
      {showList &&
        (loading || sessions === undefined ? (
          <Skeleton lines={2} label={labels.loading} />
        ) : sessions.length === 0 ? (
          <p className={CARD_DESCRIPTION_CLASS}>{labels.empty}</p>
        ) : (
          <ul aria-label={labels.list} className="divide-y divide-[var(--border)]">
            {sessions.map((session) => {
              const device = session.device?.trim() || labels.unknownDevice;
              const when = lastActive(session.lastActiveAt);
              const ip = session.ip?.trim();
              return (
                <li
                  key={session.id}
                  data-session-id={String(session.id)}
                  data-current={session.current || undefined}
                  className="flex items-center gap-3 py-2"
                >
                  <MonitorSmartphone aria-hidden className="size-4 shrink-0 text-[var(--text-muted)]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="min-w-0 break-words text-sm font-medium">{device}</span>
                      {session.current && (
                        <Chip size="sm" tone="brand">
                          {labels.current}
                        </Chip>
                      )}
                    </div>
                    {(when || ip) && (
                      <div className={CARD_DESCRIPTION_CLASS}>
                        {when && labels.lastActive(when)}
                        {when && ip && " · "}
                        {/* An address reads left to right in any page direction. */}
                        {ip && <span dir="ltr">{labels.ip(ip)}</span>}
                      </div>
                    )}
                  </div>
                  {onRevoke && !session.current && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      commit
                      pending={busyId === session.id}
                      disabled={busyId !== null && busyId !== session.id}
                      aria-label={labels.revokeItem(device)}
                      onClick={() => revoke(session.id)}
                    >
                      {labels.revoke}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ))}
      <DangerConfirm
        tone="warning"
        commit
        armLabel={labels.signOutEverywhere}
        prompt={labels.signOutEverywherePrompt}
        confirmLabel={labels.confirmSignOutEverywhere}
        onConfirm={signOutEverywhere}
      />
      {hasMessage(failure) && (
        <AlertBanner tone="danger" size="sm" role="alert">
          {failure}
        </AlertBanner>
      )}
    </Card>
  );
}
