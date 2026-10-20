import { useEffect } from "react";

import { settle } from "../account/account-parts";

export interface DeviceZoneReportOptions {
  /** The account's `device_timezone` from `/auth/me`; `undefined` while it loads (no
   *  report until it is known). */
  stored: string | null | undefined;
  /** `PATCH /auth/me {device_timezone}` with this device's zone. */
  report: (deviceTimezone: string) => Promise<unknown> | void;
  /** A demo account: never reported (the server ignores it too, §10.3 Settled). */
  isDemo?: boolean;
  /** The signed-in account (its user id): the once-per-start guard is per account, so a
   *  second person signed in on a shared PC in the same start is reported too. Without it
   *  the guard is cleared when `stored` goes `undefined` (signed out). */
  account?: string | number | null;
}

/**
 * This device's IANA zone ("Europe/Zurich"), or `"UTC"` where the runtime names none —
 * the zone `useDeviceZoneReport` reports, which becomes the account's (§10.3, automatic
 * only), and the one sign-up sends (`RegisterRequest.device_timezone`). Here since 0.46.1
 * (keksdose N6); the deprecated `time-zone-select` module re-exports it until 0.47.
 */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** The (account, stored, device) triples already reported in this start of the app. */
const reportedThisStart = new Set<string>();

/**
 * Report this device's zone to the account (0.46, §10.3): the account's zone follows the
 * device last used, else `Europe/Zurich`; screens keep showing device time. Once per start
 * of the app, and only when it differs from the stored `device_timezone` — a bench PC in Zurich never
 * PATCHes on a sign-in — and never for a demo. Per account: a sign-out (`stored` back to
 * `undefined`) clears the guard, and `account` keys it. The report IS the account's zone: it is
 * automatic only (§10.3, amended 2026-10-20), so nothing is ever picked. A failed report
 * is not retried in the same start; the next start tries again. Sign-up sends the zone
 * itself (`RegisterRequest.device_timezone`).
 *
 *     useDeviceZoneReport({ stored: me?.device_timezone, isDemo: me?.is_demo, account: me?.id,
 *       report: async (zone) => setUser((await api.patch("/auth/me", { device_timezone: zone })).data) });
 */
export function useDeviceZoneReport({ stored, report, isDemo = false, account = null }: DeviceZoneReportOptions): void {
  useEffect(() => {
    if (stored === undefined) {
      // Signed out (or still loading): the next account in this start is reported afresh.
      reportedThisStart.clear();
      return;
    }
    if (isDemo) return;
    const device = deviceTimeZone();
    if (device === stored) return;
    const key = `${account ?? ""}|${stored ?? ""}→${device}`;
    if (reportedThisStart.has(key)) return;
    reportedThisStart.add(key);
    void settle(() => report(device)).catch(() => undefined);
    // `report` is the app's request function: a new closure each render must not report
    // again, so only the values decide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored, isDemo, account]);
}
