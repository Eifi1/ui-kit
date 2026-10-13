import { useEffect, useRef, useState } from "react";
import type { ComponentPropsWithRef, KeyboardEvent, ReactNode } from "react";
import { MonitorSmartphone } from "lucide-react";

import { useKitLabels, useKitLocale, type LabelOverride } from "../i18n/kit-labels";
import { DEFAULT_COMMON_LABELS } from "../i18n/shared-labels";
import { cn } from "../lib/cn";
import { formatDate } from "../lib/format";
import { Button } from "../components/button";
import { Card } from "../components/card";
import { Chip } from "../components/chip";
import { Skeleton } from "../components/skeleton";
import { COMMIT_EXCEPT_BILLING } from "../components/write-lock";
import { CARD_DESCRIPTION_CLASS } from "../settings/settings-card-classes";
import { SettingsCardTitle } from "../settings/settings-heading";
import { settle, useMounted } from "../account/account-parts";
import { describeFailure, FailureLine, useNotificationsLabels } from "./notification-parts";
import type { NotificationsLabels } from "./notifications-labels";
import type { PushDeviceItem } from "./notification-types";
import { notifyPushSubscriptionChanged } from "./use-push-device";

/**
 * A name for a stored user agent: "Chrome · Android", "Firefox · Windows" (keksdose
 * `push-devices-card.tsx:19-45`). Best effort: an agent it does not recognise comes back
 * as it is, cut at 60 characters so a token soup cannot blow up the row; `null` for none.
 * The order matters — Edge and Opera say "Chrome" too, and Chrome says "Safari".
 */
export function describeUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  const browser = /edg(?:e|a|ios)?\//i.test(ua)
    ? "Edge"
    : /opr\/|opera/i.test(ua)
      ? "Opera"
      : /firefox|fxios/i.test(ua)
        ? "Firefox"
        : /chrome|crios/i.test(ua)
          ? "Chrome"
          : /safari/i.test(ua)
            ? "Safari"
            : null;
  const os = /windows/i.test(ua)
    ? "Windows"
    : /android/i.test(ua)
      ? "Android"
      : /iphone|ipad|ipod/i.test(ua)
        ? "iOS"
        : /mac os x|macintosh/i.test(ua)
          ? "macOS"
          : /linux/i.test(ua)
            ? "Linux"
            : null;
  if (!browser && !os) return ua.length > 60 ? `${ua.slice(0, 60)}…` : ua;
  return [browser, os].filter(Boolean).join(" · ");
}

export interface PushDevicesSettingProps<Id extends string | number = string>
  extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** `GET /notifications/devices`, oldest first; `undefined` while the first load runs. */
  devices: readonly PushDeviceItem<Id>[] | undefined;
  loading?: boolean;
  /** This browser's endpoint (`usePushDevice().currentEndpoint`): its row says "This
   *  device", and removing it also unsubscribes the browser. */
  currentEndpoint?: string | null;
  /** `DELETE /notifications/devices/{id}`. Asked first; refresh `devices` once it
   *  resolves. */
  onRemove: (id: Id) => Promise<unknown> | void;
  /** The dates' text. Default: the provider's locale, medium date. */
  formatDate?: (date: Date) => string;
  /** Overrides the provider's locale for the default format. */
  locale?: string;
  /** The app's own words for a failed removal, or `undefined` for the kit's `failed`. */
  describeError?: (error: unknown) => ReactNode | undefined;
  labels?: LabelOverride<NotificationsLabels>;
}

/** Tear down this browser's subscription after its server row went: otherwise the
 *  browser still holds one, and the push card would say "on" for a device nothing can
 *  reach. Best effort — the row is already gone. */
async function unsubscribeThisBrowser(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe();
  } catch {
    /* the server row is gone either way */
  }
  notifyPushSubscriptionChanged();
}

/**
 * Every device that gets push for the account (docs/notifications-harmonization.md §3.5,
 * §4.2) — keksdose's devices card: the browser and system read from the stored user
 * agent, "This device" on this browser's row, when it was added and last delivered to,
 * the failures in a row in the warning tone, and "Remove".
 *
 * **Remove asks first, in the row**, as `PasskeysSetting` does: the card must work in an
 * app without a `ConfirmProvider`, and the question belongs beside the device it names.
 * Focus moves to Cancel. **Removing this device** also unsubscribes the browser and fires
 * `PUSH_SUBSCRIPTION_CHANGED` (keksdose `push-devices-card.tsx:83-97`), so the push card
 * stops saying "on".
 *
 * Under a write lock Remove is a `commit` control exempt from billing.
 */
export function PushDevicesSetting<Id extends string | number = string>({
  devices,
  loading,
  currentEndpoint,
  onRemove,
  formatDate: formatDateProp,
  locale: localeProp,
  describeError,
  labels: labelsProp,
  className,
  ...rest
}: PushDevicesSettingProps<Id>) {
  const labels = useNotificationsLabels(labelsProp);
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const locale = useKitLocale(localeProp);
  const [asking, setAsking] = useState<Id | null>(null);
  const [busyId, setBusyId] = useState<Id | null>(null);
  const [failure, setFailure] = useState<ReactNode>(null);
  const mounted = useMounted();

  const dateText = (iso: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return formatDateProp ? formatDateProp(date) : formatDate(date, "medium", { locale });
  };

  const remove = (device: PushDeviceItem<Id>) => {
    if (busyId !== null) return;
    setBusyId(device.id);
    setFailure(null);
    const isThis = Boolean(currentEndpoint) && device.endpoint === currentEndpoint;
    settle(() => onRemove(device.id))
      .then(async () => {
        if (isThis) await unsubscribeThisBrowser();
        if (!mounted.current) return;
        setBusyId(null);
        setAsking(null);
      })
      .catch((error: unknown) => {
        if (!mounted.current) return;
        setBusyId(null);
        setFailure(describeFailure(describeError?.(error), labels.failed));
      });
  };

  let body: ReactNode;
  if (loading || devices === undefined) {
    body = <Skeleton lines={2} label={labels.devicesLoading} />;
  } else if (devices.length === 0) {
    body = <p className={CARD_DESCRIPTION_CLASS}>{labels.devicesEmpty}</p>;
  } else {
    body = (
      <ul aria-label={labels.devicesTitle} className="divide-y divide-subtle">
        {devices.map((device) => (
          <DeviceRow
            key={device.id}
            device={device}
            name={describeUserAgent(device.user_agent) ?? labels.unknownDevice}
            current={Boolean(currentEndpoint) && device.endpoint === currentEndpoint}
            added={dateText(device.created_at)}
            lastDelivery={device.last_success_at ? dateText(device.last_success_at) : null}
            asking={asking === device.id}
            busy={busyId === device.id}
            blocked={busyId !== null && busyId !== device.id}
            onAsk={() => setAsking(device.id)}
            onCancel={() => setAsking(null)}
            onConfirm={() => remove(device)}
            labels={labels}
            cancelLabel={common.cancel}
          />
        ))}
      </ul>
    );
  }

  return (
    <Card {...rest} className={cn("p-4 space-y-3", className)}>
      <div>
        <SettingsCardTitle>{labels.devicesTitle}</SettingsCardTitle>
        <div className={CARD_DESCRIPTION_CLASS}>{labels.devicesDescription}</div>
      </div>
      {body}
      <FailureLine>{failure}</FailureLine>
    </Card>
  );
}

function DeviceRow<Id extends string | number>({
  device,
  name,
  current,
  added,
  lastDelivery,
  asking,
  busy,
  blocked,
  onAsk,
  onCancel,
  onConfirm,
  labels,
  cancelLabel,
}: {
  device: PushDeviceItem<Id>;
  name: string;
  current: boolean;
  added: string;
  lastDelivery: string | null;
  asking: boolean;
  busy: boolean;
  blocked: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  labels: NotificationsLabels;
  cancelLabel: string;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  // Which way the confirm closed: back to Remove, so focus does not fall to <body>.
  const [returning, setReturning] = useState(false);
  useEffect(() => {
    if (asking) cancelRef.current?.focus();
    else if (returning) removeRef.current?.focus();
  }, [asking, returning]);

  const leave = () => {
    setReturning(true);
    onCancel();
  };
  const escapeLeaves = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      leave();
    }
  };

  const row = { "data-push-device-id": String(device.id), "data-current": current || undefined };

  if (asking) {
    return (
      <li {...row} className="space-y-2 py-2">
        <p role="alert" className="text-sm">
          {labels.removePrompt}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="danger"
            commit={COMMIT_EXCEPT_BILLING}
            pending={busy}
            aria-label={labels.removeItem(name)}
            onClick={onConfirm}
            onKeyDown={escapeLeaves}
          >
            {labels.remove}
          </Button>
          <Button ref={cancelRef} type="button" size="sm" variant="ghost" onClick={leave} onKeyDown={escapeLeaves}>
            {cancelLabel}
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li {...row} className="flex items-center gap-3 py-2">
      <MonitorSmartphone aria-hidden className="size-4 shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 break-words text-sm font-medium">{name}</span>
          {current && (
            <Chip size="sm" tone="brand">
              {labels.thisDevice}
            </Chip>
          )}
        </div>
        <div className={CARD_DESCRIPTION_CLASS}>
          {labels.added(added)}
          {" · "}
          {lastDelivery ? labels.lastDelivery(lastDelivery) : labels.noDelivery}
        </div>
        {device.failure_count > 0 && <div className="text-xs text-warning">{labels.failures(device.failure_count)}</div>}
      </div>
      <Button
        ref={removeRef}
        type="button"
        size="sm"
        variant="ghost"
        commit={COMMIT_EXCEPT_BILLING}
        disabled={blocked}
        aria-label={labels.removeItem(name)}
        onClick={() => {
          setReturning(false);
          onAsk();
        }}
      >
        {labels.remove}
      </Button>
    </li>
  );
}
