import { useEffect, useId, useState } from "react";
import type { ComponentPropsWithRef, ReactNode } from "react";

import type { LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { Button } from "../components/button";
import { Switch } from "../components/switch";
import { COMMIT_EXCEPT_BILLING } from "../components/write-lock";
import { CARD_DESCRIPTION_CLASS } from "../settings/settings-card-classes";
import { settle, useMounted } from "../account/account-parts";
import { describeFailure, FailureLine, useNotificationsLabels, useWriteOverlay } from "./notification-parts";
import type { NotificationsLabels } from "./notifications-labels";
import { deviceTimeZone, TimeZoneSelect, zoneName } from "./time-zone-select";

export interface TimeZoneSettingProps extends Omit<ComponentPropsWithRef<"div">, "children" | "onChange"> {
  /** The account's pick, `/auth/me`'s `timezone`: an IANA name, or `null` for
   *  "Automatic" (the last device's zone, then the app's). */
  value: string | null;
  /**
   * Save the pick — `PATCH /auth/me {timezone}`: a zone, or `null` for Automatic. The
   * row shows the new value while the call runs and goes back if it rejects.
   */
  onChange: (timezone: string | null) => Promise<unknown> | void;
  disabled?: boolean;
  /** The app's own words for a failed save, or `undefined` for the kit's `failed`. */
  describeError?: (error: unknown) => ReactNode | undefined;
  labels?: LabelOverride<NotificationsLabels>;
}

/**
 * The account's time zone (0.46, docs/notifications-harmonization.md §10.3), for the
 * settings group that holds the language: "Automatic (this device: Europe / Zurich)" — on
 * by default, the zone then follows the device last used — or, off, a zone picked through
 * {@link TimeZoneSelect}. Quiet hours, the digest's day and every date or time the server
 * writes for the person follow it (the effective zone: the pick, else the last device's,
 * else `Europe/Zurich`).
 *
 * - **Turning Automatic off pins this device's zone** as the pick, and the picker
 *   changes it from there; turning it on again sends `null`.
 * - **"This device is in {zone}." with "Use it"** while a picked zone is not this
 *   device's — moved here from the quiet-hours card.
 *
 * The device's own zone is reported by {@link useDeviceZoneReport}, never by this row.
 * Under a write lock the controls are `commit` controls exempt from billing.
 */
export function TimeZoneSetting({
  value,
  onChange,
  disabled = false,
  describeError,
  labels: labelsProp,
  className,
  ...rest
}: TimeZoneSettingProps) {
  const labels = useNotificationsLabels(labelsProp);
  const overlay = useWriteOverlay<string | null>(value);
  const [failure, setFailure] = useState<ReactNode>(null);
  const mounted = useMounted();
  const id = useId();
  const device = deviceTimeZone();
  const shown = overlay.has("timezone") ? (overlay.get("timezone") ?? null) : value;

  const save = (next: string | null) => {
    if (next === shown || overlay.pending("timezone")) return;
    setFailure(null);
    overlay.set("timezone", next);
    settle(() => onChange(next)).then(
      () => {
        if (mounted.current) overlay.settle("timezone", true);
      },
      (error: unknown) => {
        if (!mounted.current) return;
        overlay.settle("timezone", false);
        setFailure(describeFailure(describeError?.(error), labels.failed));
      },
    );
  };

  return (
    <div {...rest} role="group" aria-labelledby={`${id}-title`} className={cn("space-y-2", className)}>
      <div>
        <div id={`${id}-title`} className="text-sm font-medium text-primary">
          {labels.timeZone}
        </div>
        <div className={CARD_DESCRIPTION_CLASS}>{labels.zoneDescription}</div>
      </div>
      <Switch
        label={labels.zoneAutomatic(zoneName(device, labels.regions))}
        checked={shown === null}
        disabled={disabled}
        commit={COMMIT_EXCEPT_BILLING}
        onCheckedChange={(automatic) => save(automatic ? null : device)}
      />
      {shown !== null && (
        <div className="space-y-2 ps-4">
          <TimeZoneSelect
            id={`${id}-zone`}
            value={shown}
            disabled={disabled}
            commit={COMMIT_EXCEPT_BILLING}
            onChange={(zone) => save(zone)}
            className="max-w-72"
            labels={labelsProp}
          />
          {device !== shown && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span id={`${id}-device`} className={CARD_DESCRIPTION_CLASS}>
                {labels.deviceZone(zoneName(device, labels.regions))}
              </span>
              <Button
                type="button"
                size="sm"
                variant="link"
                disabled={disabled}
                commit={COMMIT_EXCEPT_BILLING}
                aria-describedby={`${id}-device`}
                onClick={() => save(device)}
              >
                {labels.useDeviceZone}
              </Button>
            </div>
          )}
        </div>
      )}
      <FailureLine>{failure}</FailureLine>
    </div>
  );
}

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
 * Report this device's zone to the account (0.46, §10.3): once per start of the app, and
 * only when it differs from the stored `device_timezone` — a bench PC in Zurich never
 * PATCHes on a sign-in — and never for a demo. An observation, never a choice: it never
 * touches the picked `timezone` (settings §6.2's rule protects a pick). A failed report
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
