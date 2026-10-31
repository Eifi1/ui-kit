import { useId, useRef, useState } from "react";
import type { ComponentPropsWithRef, KeyboardEvent, ReactNode } from "react";

import type { LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { Card } from "../components/card";
import { TimeInput } from "../components/time-input";
import { COMMIT_EXCEPT_BILLING } from "../components/write-lock";
import { CARD_DESCRIPTION_CLASS } from "../settings/settings-card-classes";
import { SettingsCardTitle } from "../settings/settings-heading";
import { settle, useMounted } from "../hooks/use-mounted";
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
   * Never a zone. Called when a time is ENTERED — the field left, or Enter — never per
   * keystroke, and one call per field at a time (0.52). The field shows the new value
   * while the call runs and goes back if it rejects.
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
 * - **Two times**, each saved when it is entered — on leaving the field or on Enter — and
 *   a cleared time sends `null`. While only one is set the card says so: the window fails
 *   open until both are.
 * - **One request per field at a time** (0.52): a time entered while that field's save
 *   runs waits for it, and only the latest waiting one is sent. Each input event used to
 *   PATCH — typing "30" over 22:00's minutes sent 22:03 and 22:30, and whichever answer
 *   landed last stayed on the server (refactor audit 2026-10-30, FLW-4).
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

  // What is typed and not yet entered, per field: the field shows it, nothing is sent.
  const [drafts, setDrafts] = useState<Partial<Record<QuietField, string>>>({});
  // Per field: whether a save runs, and the latest time entered while it did (own key =
  // one is waiting). Refs: a save's answer reads them after renders it did not see.
  const running = useRef<Partial<Record<QuietField, boolean>>>({});
  const waiting = useRef<Partial<Record<QuietField, string | null>>>({});

  const server = (field: QuietField) => (field === "quiet_hours_start" ? start : end);
  const saved = (field: QuietField) => (overlay.has(field) ? (overlay.get(field) ?? null) : server(field));
  const shown = (field: QuietField) => drafts[field] ?? saved(field) ?? "";
  const startShown = shown("quiet_hours_start");
  const endShown = shown("quiet_hours_end");
  const accountZone = zone ?? fallbackZone;

  const send = (field: QuietField, value: string | null) => {
    running.current[field] = true;
    if (mounted.current) setFailure(null);
    settle(() => onChange({ [field]: value })).then(
      () => done(field, true),
      (error: unknown) => done(field, false, error),
    );
  };

  /** A save answered: the waiting time goes next — even after an unmount, it is what the
   *  person entered last — and supersedes this answer, a failure included. */
  const done = (field: QuietField, ok: boolean, error?: unknown) => {
    running.current[field] = false;
    if (Object.prototype.hasOwnProperty.call(waiting.current, field)) {
      const next = waiting.current[field] ?? null;
      delete waiting.current[field];
      send(field, next);
      return;
    }
    if (!mounted.current) return;
    overlay.settle(field, ok);
    if (!ok) setFailure(describeFailure(describeError?.(error), labels.failed));
  };

  /** The typed time, entered: saved unless it is what the field already holds. */
  const enter = (field: QuietField) => {
    const draft = drafts[field];
    if (draft === undefined) return;
    setDrafts((current) => {
      const rest = { ...current };
      delete rest[field];
      return rest;
    });
    const next = draft || null;
    if (next === saved(field)) return;
    overlay.set(field, next);
    if (running.current[field]) waiting.current[field] = next;
    else send(field, next);
  };

  const type = (field: QuietField, value: string) => setDrafts((current) => ({ ...current, [field]: value }));
  const enterOnEnter = (field: QuietField, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") enter(field);
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
          value={startShown}
          onValueChange={(value) => type("quiet_hours_start", value)}
          onBlur={() => enter("quiet_hours_start")}
          onKeyDown={(event) => enterOnEnter("quiet_hours_start", event)}
          disabled={disabled}
          commit={COMMIT_EXCEPT_BILLING}
          className="w-36"
        />
        <TimeInput
          id={`${id}-end`}
          label={labels.quietUntil}
          value={endShown}
          onValueChange={(value) => type("quiet_hours_end", value)}
          onBlur={() => enter("quiet_hours_end")}
          onKeyDown={(event) => enterOnEnter("quiet_hours_end", event)}
          disabled={disabled}
          commit={COMMIT_EXCEPT_BILLING}
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
