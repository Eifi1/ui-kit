import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertBanner } from "../components/alert-banner";
import { Button } from "../components/button";
import { useConfirm } from "../components/confirm-dialog";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { hasContent } from "../lib/presence";
import { DEFAULT_HELD_CHANGES_BANNER_LABELS, type HeldChangesBannerLabels } from "./held-changes-banner-labels";

// Defined in ./held-changes-banner-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_HELD_CHANGES_BANNER_LABELS };
export type { HeldChangesBannerLabels };

export interface HeldChangesBannerProps {
  /**
   * Changes kept on this device that cannot be sent from where the user is now — the
   * indicator's `blocked`, or the part of it this banner is about (kastlan: the ones the
   * server refused). 0 renders nothing.
   */
  count: number;
  /**
   * The app's sentence: why they wait and what would send them — keksdose's "2 changes
   * were made in “Holiday”, which is no longer the active budget…". Default
   * `heldChanges.message(count)`, which names no reason and no way back.
   */
  message?: ReactNode;
  /**
   * Room under the sentence — kastlan's refusal reasons, as a list. For the box: a strip
   * holds its message to one line on a phone, and a list behind "More" is a list nobody
   * opens, so a strip with `extra` is not clamped.
   */
  extra?: ReactNode;
  /**
   * The way back, where there is one — keksdose's switch to the budget the changes were
   * made in, which sends them. Without it Discard is the one way out. A returned promise
   * keeps the button busy until it settles; a rejection is shown as Discard's is.
   */
  onSwitchBack?: () => Promise<unknown> | void;
  /**
   * Lets them go, once the user has said yes to the kit's confirm: the app drops what is
   * held and syncs (keksdose `discardWaitingChanges`, kastlan `discardRejected` then
   * `onSync`). Busy until the promise settles. A rejection leaves the banner where it is,
   * with the error under the sentence; the count going to 0 is what removes it.
   */
  onDiscard: () => Promise<unknown> | void;
  /** Turns a rejection into words. Default `heldChanges.failed`. */
  formatError?: (error: unknown) => ReactNode;
  /**
   * `box` (default): a framed callout above a page (kastlan's handover pages); on a phone
   * its actions take a line of their own under the sentence. `strip`: a band in the
   * shell beside the app's other strips (keksdose), its message held to one line on a
   * phone with "More" (`clampMobile`, keksdose dev#611), so the actions keep theirs.
   */
  variant?: "box" | "strip";
  /** Prop > `<UiKitProvider labels={{ heldChanges }}>` > English. */
  labels?: LabelOverride<HeldChangesBannerLabels>;
  className?: string;
  /** `data-*` attributes go on the banner — a tour's anchor (`data-tour="…"`). */
  [key: `data-${string}`]: string | number | boolean | undefined;
}

/**
 * Changes this device keeps and cannot send from where the user is now, with the two ways
 * out: back to where they can be sent, or let them go (docs/top-bar-harmonization.md
 * §2.6.1). `SyncStatusIndicator` shows the state (`blocked`, ranked first); this is the
 * room for the action that one control in the top bar does not have.
 *
 * Two apps built it by hand:
 * - **keksdose budget switch** (app/held-changes-banner.tsx): the active budget moved
 *   and the queue waits for the budget it was made in. A strip in the shell with "Switch
 *   back" and "Discard…", which asks first with the count, then discards and syncs.
 * - **kastlan handover-sync-banner** (:57-68): the changes the server refused, a danger
 *   box with their reasons and a Discard that asked nothing.
 *
 * The kit's part is the banner and the question; what is held, how to discard it and the
 * sync after are the app's (`onDiscard`). Warning, not danger: nothing is lost until the
 * user says so, and the indicator in the bar already draws the danger. The safe action
 * comes first, so the destructive one is never the only button somebody in a hurry finds
 * (keksdose); Discard is then the quiet one. The confirm is `useConfirm`'s, in the danger
 * tone (focus starts on Cancel), so the app needs a `ConfirmProvider` — all three mount
 * one. Not behind the write lock: the changes are not the page's, and a viewer of what is
 * on screen may still let go of what is held elsewhere (keksdose).
 */
export function HeldChangesBanner(props: HeldChangesBannerProps) {
  // Nothing held: nothing to say. The body's state (a running action, an error) goes with
  // it, so a later hold starts clean.
  if (!(props.count > 0)) return null;
  return <HeldChangesBody {...props} />;
}

function HeldChangesBody({
  count,
  message,
  extra,
  onSwitchBack,
  onDiscard,
  formatError,
  variant = "box",
  labels: labelsProp,
  className,
  ...rest
}: HeldChangesBannerProps) {
  const labels = useKitLabels("heldChanges", DEFAULT_HELD_CHANGES_BANNER_LABELS, labelsProp);
  const confirm = useConfirm();
  // One action at a time: a switch back racing a discard would send what is being dropped.
  const [busy, setBusy] = useState<"switchBack" | "discard" | null>(null);
  const [failure, setFailure] = useState<ReactNode>(null);
  // A discard that worked usually takes the banner with it (the count reaches 0) before
  // its promise settles here.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = async (key: "switchBack" | "discard", action: () => Promise<unknown> | void) => {
    setBusy(key);
    setFailure(null);
    try {
      await action();
    } catch (caught) {
      if (!mounted.current) return;
      const said = formatError?.(caught);
      setFailure(hasContent(said) ? said : labels.failed);
    } finally {
      if (mounted.current) setBusy(null);
    }
  };

  const discard = async () => {
    const yes = await confirm({
      title: labels.confirmTitle(count),
      body: labels.confirmBody(count),
      confirmLabel: labels.confirmAction,
      tone: "danger",
    });
    if (yes && mounted.current) await run("discard", onDiscard);
  };

  const strip = variant === "strip";
  return (
    <AlertBanner
      {...rest}
      tone="warning"
      variant={strip ? "strip" : "box"}
      // A long sentence beside two buttons squeezed into a column on a phone (kastlan 53):
      // the actions get a line of their own under it. AlertBanner's default, said here.
      actionPlacement="own-line"
      // Not while an error shows or `extra` is there: the clamp would hide them behind "More".
      clampMobile={strip && !failure && !hasContent(extra)}
      className={className}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {onSwitchBack && (
            <Button
              variant="secondary"
              size="sm"
              pending={busy === "switchBack"}
              disabled={busy === "discard"}
              onClick={() => void run("switchBack", onSwitchBack)}
            >
              {labels.switchBack}
            </Button>
          )}
          <Button
            variant={onSwitchBack ? "ghost" : "secondary"}
            tone="danger"
            size="sm"
            pending={busy === "discard"}
            disabled={busy === "switchBack"}
            onClick={() => void discard()}
          >
            {labels.discard}
          </Button>
        </div>
      }
    >
      {message ?? labels.message(count)}
      {hasContent(extra) && <div className="mt-1">{extra}</div>}
      {/* Inline, so it is a live region: the answer to the button just pressed is heard. */}
      {hasContent(failure) && (
        <AlertBanner variant="inline" tone="danger" size="sm" block className="mt-1">
          {failure}
        </AlertBanner>
      )}
    </AlertBanner>
  );
}
