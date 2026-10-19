import { useId, useState } from "react";
import type { ComponentPropsWithRef, ReactNode } from "react";

import type { LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { Button } from "../components/button";
import { Card } from "../components/card";
import { TimeInput } from "../components/time-input";
import { COMMIT_EXCEPT_BILLING } from "../components/write-lock";
import { CARD_DESCRIPTION_CLASS } from "../settings/settings-card-classes";
import { SettingsCardTitle } from "../settings/settings-heading";
import { settle, useMounted } from "../account/account-parts";
import { describeFailure, FailureLine, useNotificationsLabels, useWriteOverlay } from "./notification-parts";
import type { NotificationsLabels } from "./notifications-labels";
import type { NotificationSettingsPatch } from "./notification-types";
import { deviceTimeZone, TimeZoneSelect, zoneName } from "./time-zone-select";

/** The zone the server applies while the account has none (§2.6): every app's. */
const DEFAULT_FALLBACK_ZONE = "Europe/Zurich";

export interface QuietHoursSettingProps extends Omit<ComponentPropsWithRef<"div">, "children" | "onChange"> {
  /** The `GET`'s `quiet_hours_start`, `"HH:MM"`, or `null`. */
  start: string | null;
  /** The `GET`'s `quiet_hours_end`. */
  end: string | null;
  /** The `GET`'s `timezone`, an IANA name, or `null` (the app's zone applies).
   *  @deprecated 0.46 — pass `zone` (§10.3: the zone is the account's); removed in 0.47. Then the
   *  card drops its picker. Read only while `zone` is left out. */
  timezone?: string | null;
  /**
   * 0.46 (§10.3): the account's EFFECTIVE zone (the pick, else the last device's, else the
   * app's), as `/auth/me` answers it. Given, the card has no picker: it says "In your time
   * zone ({zone})" with a link to the time-zone row (`zoneHref`), and a time sends no
   * zone. Left out, the 0.36 card with its picker, for one release.
   */
  zone?: string;
  /** Where the time-zone row is (`TimeZoneSetting`), for the link beside `zone`. */
  zoneHref?: string;
  /** 0.46 (§10.4): the app queues a held push and sends it when the window ends (it runs
   *  the notifications tick); the description says so. Default `false`: dropped. */
  held?: boolean;
  /**
   * Save one change — `PATCH /notifications/settings`: a time (`null` when cleared), with
   * the device's zone the first time one is entered while `timezone` is `null`; or
   * `{timezone}`. The field shows the new value while the call runs and goes back if it
   * rejects.
   */
  onChange: (patch: NotificationSettingsPatch) => Promise<unknown> | void;
  /** The zone shown, and the one the server applies, while `timezone` is `null`.
   *  Default `"Europe/Zurich"`, every app's (decision 6). */
  fallbackZone?: string;
  /** The app keeps an inbox, and the description says a held push still reaches it. */
  inbox?: boolean;
  disabled?: boolean;
  /** The app's own words for a failed save, or `undefined` for the kit's `failed`. */
  describeError?: (error: unknown) => ReactNode | undefined;
  labels?: LabelOverride<NotificationsLabels>;
}

type QuietField = "quiet_hours_start" | "quiet_hours_end" | "timezone";

/**
 * Quiet hours (docs/notifications-harmonization.md §2.4, §2.6, §4.2): a window of local
 * times in the account's zone, which may cross midnight, when no push of a machine-sent
 * type is sent. A held push is dropped — or, with `held` (0.46, §10.4), sent when the
 * window ends; the inbox row and the mail go as usual. keksdose's block, as a card of its
 * own.
 *
 * **0.46 (§10.3): the zone is the account's.** With `zone`, the card names it ("In your
 * time zone (Europe / Zurich)") and links to `TimeZoneSetting`; the rest of this list is
 * the 0.36 card, kept while `zone` is left out.
 *
 * - **Two times**, each saved as it is entered; a cleared time sends `null`. While only
 *   one is set the card says so: the window fails open until both are.
 * - **The zone** shows while a time is set. The first time entered while the account has
 *   none sends this device's zone with it, so "22:00" means the person's 22:00
 *   (keksdose `notifications-card.tsx:288-292`). With none stored, the card shows
 *   `fallbackZone` — the zone the server then applies — never the device's (keksdose's
 *   card showed the device's zone while its server applied UTC).
 * - **"This device is in …"** with "Use it" when the device's zone is not the one in
 *   effect. Never written on its own: a zone is written by a person's pick (§2.6).
 *
 * Under a write lock the fields are `commit` controls exempt from billing.
 */
export function QuietHoursSetting({
  start,
  end,
  timezone = null,
  zone,
  zoneHref,
  held = false,
  onChange,
  fallbackZone = DEFAULT_FALLBACK_ZONE,
  inbox = false,
  disabled = false,
  describeError,
  labels: labelsProp,
  className,
  ...rest
}: QuietHoursSettingProps) {
  const labels = useNotificationsLabels(labelsProp);
  const overlay = useWriteOverlay<string | null>(`${start}|${end}|${timezone}`);
  const [failure, setFailure] = useState<ReactNode>(null);
  const mounted = useMounted();
  const id = useId();

  const shown = (field: QuietField, server: string | null) =>
    overlay.has(field) ? (overlay.get(field) ?? null) : server;
  const startShown = shown("quiet_hours_start", start);
  const endShown = shown("quiet_hours_end", end);
  const zoneShown = shown("timezone", timezone);
  const effectiveZone = zoneShown ?? fallbackZone;
  const device = deviceTimeZone();

  const save = (patch: NotificationSettingsPatch) => {
    const fields = Object.keys(patch) as QuietField[];
    setFailure(null);
    for (const field of fields) overlay.set(field, patch[field] ?? null);
    settle(() => onChange(patch)).then(
      () => {
        if (mounted.current) for (const field of fields) overlay.settle(field, true);
      },
      (error: unknown) => {
        if (!mounted.current) return;
        for (const field of fields) overlay.settle(field, false);
        setFailure(describeFailure(describeError?.(error), labels.failed));
      },
    );
  };

  const saveTime = (field: "quiet_hours_start" | "quiet_hours_end", value: string) => {
    const next = value || null;
    if (next === shown(field, field === "quiet_hours_start" ? start : end)) return;
    const patch: NotificationSettingsPatch = { [field]: next };
    if (next && zoneShown === null && zone === undefined) patch.timezone = device;
    save(patch);
  };

  const anySet = Boolean(startShown || endShown);
  const halfSet = Boolean(startShown) !== Boolean(endShown);

  return (
    <Card {...rest} className={cn("p-4 space-y-3", className)}>
      <div>
        <SettingsCardTitle>{labels.quietTitle}</SettingsCardTitle>
        <div className={CARD_DESCRIPTION_CLASS}>{labels.quietDescription(inbox, held)}</div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <TimeInput
          id={`${id}-start`}
          label={labels.quietFrom}
          value={startShown ?? ""}
          disabled={disabled}
          commit={COMMIT_EXCEPT_BILLING}
          onValueChange={(value) => saveTime("quiet_hours_start", value)}
          className="w-36"
        />
        <TimeInput
          id={`${id}-end`}
          label={labels.quietUntil}
          value={endShown ?? ""}
          disabled={disabled}
          commit={COMMIT_EXCEPT_BILLING}
          onValueChange={(value) => saveTime("quiet_hours_end", value)}
          className="w-36"
        />
      </div>
      {halfSet && (
        <p className="text-xs text-warning" data-quiet-incomplete="">
          {labels.quietIncomplete}
        </p>
      )}
      {anySet && zone !== undefined && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1" data-quiet-zone="">
          <span id={`${id}-zone`} className={CARD_DESCRIPTION_CLASS}>
            {labels.quietZone(zoneName(zone, labels.regions))}
          </span>
          {zoneHref && (
            <Button href={zoneHref} size="sm" variant="link" aria-describedby={`${id}-zone`}>
              {labels.quietZoneLink}
            </Button>
          )}
        </div>
      )}
      {anySet && zone === undefined && (
        <div className="space-y-2">
          <TimeZoneSelect
            id={`${id}-zone`}
            value={effectiveZone}
            disabled={disabled}
            commit={COMMIT_EXCEPT_BILLING}
            onChange={(picked) => save({ timezone: picked })}
            className="max-w-72"
            labels={labelsProp}
          />
          {device !== effectiveZone && (
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
                onClick={() => save({ timezone: device })}
              >
                {labels.useDeviceZone}
              </Button>
            </div>
          )}
        </div>
      )}
      <FailureLine>{failure}</FailureLine>
    </Card>
  );
}
