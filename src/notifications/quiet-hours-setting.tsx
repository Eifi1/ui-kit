import { useId, useState } from "react";
import type { ComponentPropsWithRef, ReactNode } from "react";

import type { LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { Card } from "../components/card";
import { TimeInput } from "../components/time-input";
import { COMMIT_EXCEPT_BILLING } from "../components/write-lock";
import { CARD_DESCRIPTION_CLASS } from "../settings/settings-card-classes";
import { SettingsCardTitle } from "../settings/settings-heading";
import { settle, useMounted } from "../account/account-parts";
import { describeFailure, FailureLine, useNotificationsLabels, useWriteOverlay } from "./notification-parts";
import type { NotificationRegionLabels, NotificationsLabels } from "./notifications-labels";
import type { NotificationSettingsPatch } from "./notification-types";

/** The zone the server applies while no device ever reported one (§10.3): every app's. */
const DEFAULT_FALLBACK_ZONE = "Europe/Zurich";

/** A zone for a sentence: "Europe / Zurich", the region in the kit's words (`labels.regions`);
 *  a region the labels do not know keeps its IANA name, a zone with none ("UTC") is itself. */
function zoneName(zone: string, regions: NotificationRegionLabels): string {
  const slash = zone.indexOf("/");
  if (slash < 0) return zone;
  const region = zone.slice(0, slash);
  const named = Object.prototype.hasOwnProperty.call(regions, region)
    ? regions[region as keyof NotificationRegionLabels]
    : region;
  return `${named} / ${zone
    .slice(slash + 1)
    .replace(/_/g, " ")
    .replace(/\//g, " / ")}`;
}

export interface QuietHoursSettingProps extends Omit<ComponentPropsWithRef<"div">, "children" | "onChange"> {
  /** The `GET`'s `quiet_hours_start`, `"HH:MM"`, or `null`. */
  start: string | null;
  /** The `GET`'s `quiet_hours_end`. */
  end: string | null;
  /**
   * 0.46 (§10.3, amended 2026-10-20: automatic only): the account's zone — `/auth/me`'s
   * `device_timezone`, the zone of the device last used; `null` while no device has
   * reported one, and the card then names `fallbackZone`, the zone the server applies.
   * Shown read-only once a time is set ("In your time zone (Europe / Zurich), which follows
   * the device you last used."). No picker: the zone is never chosen.
   */
  zone?: string | null;
  /** 0.46 (§10.4): the app queues a held push and sends it when the window ends (it runs
   *  the notifications tick); the description says so. Default `false`: dropped. */
  held?: boolean;
  /**
   * Save one change — `PATCH /notifications/settings`: a time, or `null` when cleared.
   * Never a zone. The field shows the new value while the call runs and goes back if it
   * rejects.
   */
  onChange: (patch: NotificationSettingsPatch) => Promise<unknown> | void;
  /** The zone named while `zone` names none: the one the server
   *  applies. Default `"Europe/Zurich"`, every app's. */
  fallbackZone?: string;
  /** The app keeps an inbox, and the description says a held push still reaches it. */
  inbox?: boolean;
  disabled?: boolean;
  /** The app's own words for a failed save, or `undefined` for the kit's `failed`. */
  describeError?: (error: unknown) => ReactNode | undefined;
  labels?: LabelOverride<NotificationsLabels>;
}

type QuietField = "quiet_hours_start" | "quiet_hours_end";

/**
 * Quiet hours (docs/notifications-harmonization.md §2.4, §2.6, §4.2): a window of local
 * times in the account's zone, which may cross midnight, when no push of a machine-sent
 * type is sent. A held push is dropped — or, with `held` (0.46, §10.4), sent when the
 * window ends; the inbox row and the mail go as usual. keksdose's block, as a card of its
 * own.
 *
 * **0.46 (§10.3, amended 2026-10-20, Marcel): the zone is the account's, automatic
 * only** — the zone of the device last used, else `Europe/Zurich`. The card names it
 * read-only and never sends one; there is no picker and no "Use it".
 *
 * - **Two times**, each saved as it is entered; a cleared time sends `null`. While only
 *   one is set the card says so: the window fails open until both are.
 * - **The zone** shows while a time is set: `zone`, else `fallbackZone`.
 *
 * Under a write lock the fields are `commit` controls exempt from billing.
 */
export function QuietHoursSetting({
  start,
  end,
  zone,
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
  const overlay = useWriteOverlay<string | null>(`${start}|${end}`);
  const [failure, setFailure] = useState<ReactNode>(null);
  const mounted = useMounted();
  const id = useId();

  const shown = (field: QuietField, server: string | null) =>
    overlay.has(field) ? (overlay.get(field) ?? null) : server;
  const startShown = shown("quiet_hours_start", start);
  const endShown = shown("quiet_hours_end", end);
  const accountZone = zone ?? fallbackZone;

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
    save({ [field]: next });
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
      {anySet && (
        <p className={CARD_DESCRIPTION_CLASS} data-quiet-zone="">
          {labels.quietZone(zoneName(accountZone, labels.regions))}
        </p>
      )}
      <FailureLine>{failure}</FailureLine>
    </Card>
  );
}
