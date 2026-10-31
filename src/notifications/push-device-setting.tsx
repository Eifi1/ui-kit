import { useState } from "react";
import type { ComponentPropsWithRef, ReactNode } from "react";

import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { DEFAULT_COMMON_LABELS } from "../i18n/shared-labels";
import { cn } from "../lib/cn";
import { AlertBanner } from "../components/alert-banner";
import { Button } from "../components/button";
import { Card } from "../components/card";
import { DialogFrame } from "../components/dialog-frame";
import { COMMIT_EXCEPT_BILLING } from "../components/write-lock";
import { CARD_DESCRIPTION_CLASS } from "../settings/settings-card-classes";
import { SettingsCardTitle } from "../settings/settings-heading";
import { useMounted } from "../hooks/use-mounted";
import { describeFailure, FailureLine, useNotificationsLabels } from "./notification-parts";
import type { NotificationsLabels } from "./notifications-labels";
import { PushDeviceError } from "./use-push-device";
import type { PushDevice } from "./use-push-device";

/** Which action failed — {@link PushDeviceSettingProps.describeError}'s second argument. */
export type PushDeviceAction = "enable" | "disable" | "test";

export interface PushDeviceSettingProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** This browser's push, from {@link usePushDevice}. */
  push: PushDevice;
  /** The app's name, for the iOS line and the explainer. */
  appName: string;
  /** The app's own words for a failure, or `undefined` for the kit's. The kit already
   *  has words for a missing service worker and an unanswered push service. */
  describeError?: (error: unknown, action: PushDeviceAction) => ReactNode | undefined;
  labels?: LabelOverride<NotificationsLabels>;
}

/** What the line under the buttons says. */
type Outcome = { tone: "status" | "warning" | "danger"; text: ReactNode } | null;

/**
 * Push on THIS device (docs/notifications-harmonization.md §2.2, §2.7, §4.2): keksdose's
 * push block, as a card of its own. Registering the device is the switch — push has no
 * account switch. One state at a time, in keksdose's order
 * (`notifications-card.tsx:333-402`):
 *
 * 1. the browser has no push;
 * 2. iOS outside the installed app (iOS delivers only to the installed app);
 * 3. push is not set up on the server (no VAPID keys);
 * 4. notifications blocked in the browser;
 * 5. on or off — with "another account" when this browser's subscription is someone
 *    else's — and "Turn on notifications", or "Send a test" and "Turn off".
 *
 * **The explainer comes before the browser's one prompt**: turning on while the
 * permission is still `"default"` opens a dialog first (what the notifications are for,
 * that the browser asks next); with it granted, it goes straight on. A test that reached
 * no device says so (`testNone`) — a 404/410 removes the row on the server while this
 * browser still holds its subscription. Outcomes are a line under the buttons; nothing
 * toasts.
 */
export function PushDeviceSetting({
  push,
  appName,
  describeError,
  labels: labelsProp,
  className,
  ...rest
}: PushDeviceSettingProps) {
  const labels = useNotificationsLabels(labelsProp);
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const [explainer, setExplainer] = useState(false);
  const [running, setRunning] = useState<PushDeviceAction | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const mounted = useMounted();

  const failureOf = (error: unknown, action: PushDeviceAction, fallback: string): ReactNode => {
    if (error instanceof PushDeviceError) {
      return error.code === "no_service_worker" ? labels.noServiceWorker : labels.pushTimeout;
    }
    return describeFailure(describeError?.(error, action), fallback);
  };

  const run = <T,>(action: PushDeviceAction, call: () => Promise<T>, done: (value: T) => Outcome, fallback: string) => {
    if (running) return;
    setRunning(action);
    setOutcome(null);
    call().then(
      (value) => {
        if (!mounted.current) return;
        setRunning(null);
        setOutcome(done(value));
      },
      (error: unknown) => {
        if (!mounted.current) return;
        setRunning(null);
        setOutcome({ tone: "danger", text: failureOf(error, action, fallback) });
      },
    );
  };

  const enable = () =>
    run(
      "enable",
      () => push.enable(),
      (ok): Outcome => (ok ? null : { tone: "danger", text: labels.enableFailed }),
      labels.enableFailed,
    );
  const disable = () =>
    run(
      "disable",
      () => push.disable(),
      () => null,
      labels.failed,
    );
  const test = () =>
    run(
      "test",
      () => push.sendTest(),
      ({ sent }): Outcome =>
        sent > 0 ? { tone: "status", text: labels.testSent(sent) } : { tone: "warning", text: labels.testNone },
      labels.testFailed,
    );

  const turnOn = () => {
    if (push.permission === "granted") enable();
    else setExplainer(true);
  };

  let state: ReactNode;
  if (!push.supported) {
    state = <p className={CARD_DESCRIPTION_CLASS}>{labels.unsupported}</p>;
  } else if (push.ios && !push.installed) {
    state = <p className={CARD_DESCRIPTION_CLASS}>{labels.iosInstall(appName)}</p>;
  } else if (push.configured === false) {
    state = <p className={CARD_DESCRIPTION_CLASS}>{labels.notConfigured}</p>;
  } else if (push.permission === "denied") {
    state = <p className="text-xs text-warning">{labels.blocked}</p>;
  } else {
    const busy = push.busy || running !== null;
    state = (
      <>
        <p className={CARD_DESCRIPTION_CLASS} data-push-state={push.subscribed ? "on" : "off"}>
          {push.subscribed ? labels.on : labels.off}
        </p>
        {push.foreignSubscription && <p className="text-xs text-warning">{labels.otherAccount}</p>}
        <div className="flex flex-wrap gap-2">
          {push.subscribed ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                commit={COMMIT_EXCEPT_BILLING}
                pending={running === "test"}
                disabled={busy && running !== "test"}
                onClick={test}
              >
                {labels.sendTest}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                commit={COMMIT_EXCEPT_BILLING}
                pending={running === "disable"}
                disabled={busy && running !== "disable"}
                onClick={disable}
              >
                {labels.disable}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              commit={COMMIT_EXCEPT_BILLING}
              pending={running === "enable"}
              disabled={busy && running !== "enable"}
              onClick={turnOn}
            >
              {labels.enable}
            </Button>
          )}
        </div>
        {outcome?.tone === "status" && (
          <p role="status" className={CARD_DESCRIPTION_CLASS}>
            {outcome.text}
          </p>
        )}
        {outcome?.tone === "warning" && (
          <AlertBanner tone="warning" size="sm" role="status">
            {outcome.text}
          </AlertBanner>
        )}
        {outcome?.tone === "danger" && <FailureLine>{outcome.text}</FailureLine>}
      </>
    );
  }

  return (
    <Card {...rest} className={cn("p-4 space-y-3", className)}>
      <div>
        <SettingsCardTitle>{labels.pushTitle}</SettingsCardTitle>
        <div className={CARD_DESCRIPTION_CLASS}>{labels.pushDescription}</div>
      </div>
      {state}
      <DialogFrame
        open={explainer}
        onClose={() => setExplainer(false)}
        title={labels.explainerTitle}
        description={labels.explainerBody(appName)}
        actions={(close) => (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>
              {common.cancel}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setExplainer(false);
                // Only now the browser's one permission prompt.
                enable();
              }}
            >
              {labels.explainerContinue}
            </Button>
          </div>
        )}
      >
        <p className={CARD_DESCRIPTION_CLASS}>{labels.explainerHint}</p>
      </DialogFrame>
    </Card>
  );
}
