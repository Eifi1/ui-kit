import { useEffect } from "react";

import { settle } from "../account/account-parts";
import { deviceTimeZone } from "./time-zone-select";

export interface DeviceZoneReportOptions {
  /** The account's `device_timezone` from `/auth/me`; `undefined` while it loads (no
   *  report until it is known). */
  stored: string | null | undefined;
  /** `PATCH /auth/me {device_timezone}` with this device's zone. */
  report: (deviceTimezone: string) => Promise<unknown> | void;
  /** A demo account: never reported (the server ignores it too, §10.3 Settled). */
  isDemo?: boolean;
}

/** The (stored, device) pairs already reported in this start of the app. */
const reportedThisStart = new Set<string>();

/**
 * Report this device's zone to the account (0.46, §10.3): the account's zone follows the
 * device last used, else `Europe/Zurich`; screens keep showing device time. Once per start
 * of the app, and only when it differs from the stored `device_timezone` — a bench PC in Zurich never
 * PATCHes on a sign-in — and never for a demo. The report IS the account's zone: it is
 * automatic only (§10.3, amended 2026-10-20), so nothing is ever picked. A failed report
 * is not retried in the same start; the next start tries again. Sign-up sends the zone
 * itself (`RegisterRequest.device_timezone`).
 *
 *     useDeviceZoneReport({ stored: me?.device_timezone, isDemo: me?.is_demo,
 *       report: (zone) => api.patch("/auth/me", { device_timezone: zone }) });
 */
export function useDeviceZoneReport({ stored, report, isDemo = false }: DeviceZoneReportOptions): void {
  useEffect(() => {
    if (stored === undefined || isDemo) return;
    const device = deviceTimeZone();
    if (device === stored) return;
    const key = `${stored ?? ""}→${device}`;
    if (reportedThisStart.has(key)) return;
    reportedThisStart.add(key);
    void settle(() => report(device)).catch(() => undefined);
    // `report` is the app's request function: a new closure each render must not report
    // again, so only the values decide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored, isDemo]);
}
