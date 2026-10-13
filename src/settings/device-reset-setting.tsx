import type { ReactNode } from "react";

import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { resetDeviceSettings } from "../lib/device-settings";
import { Button } from "../components/button";
import { useConfirm } from "../components/confirm-dialog";
import { toast } from "../components/toast";
import { SettingsSection, type SettingsSectionProps } from "./settings-section";
import { DEFAULT_DEVICE_RESET_LABELS } from "./device-reset-setting-labels";

/* ── Labels ──────────────────────────────────────────────────────────────── */

/** Every string {@link DeviceResetSetting} renders — the `deviceReset` namespace of
 *  `<UiKitProvider labels>`, overridable per instance through `labels`
 *  (docs/settings-harmonization.md §11.3). The confirm's Cancel is `confirmDialog.cancel`. */
export interface DeviceResetLabels {
  /** The card's title, and the app's catalogue entry's. */
  title: string;
  /** The line under it: what goes back, and that the account is not touched. */
  description: string;
  /** The button that asks first. */
  action: string;
  /** The question it asks. */
  confirmTitle: string;
  /** What goes, what follows the account again, and what stays. */
  confirmBody: string;
  /** The button that answers it. */
  confirmAction: string;
  /** The toast once it is done. */
  done: string;
  /** For the app's catalogue entry (`keywords`); the card never reads it. */
  keywords: string;
}

// Defined in ./device-reset-setting-labels, which holds no component code.
export { DEFAULT_DEVICE_RESET_LABELS };

/* ── The card ────────────────────────────────────────────────────────────── */

/** The card's DOM id: its catalogue entry's `anchor`, the `?focus=` target. */
export const DEVICE_RESET_ANCHOR = "settings-device-reset";

// `onReset` is the card's own: the DOM's form-reset handler never fires on a div.
export interface DeviceResetSettingProps
  extends Omit<SettingsSectionProps, "anchor" | "title" | "description" | "children" | "onReset"> {
  /** The app's sentence after the kit's description: what of its own goes back, and what
   *  stays (keksdose: the date format, the feature set and the gestures go; presentation
   *  mode and the home position stay). */
  description?: ReactNode;
  labels?: LabelOverride<DeviceResetLabels>;
  /** Runs after the reset and before the toast, with the keys reset or removed. */
  onReset?: (keys: string[]) => void;
}

/**
 * "Reset this device's settings" (docs/settings-harmonization.md §11): the LAST card of
 * the appearance group. It puts this device's appearance — theme, palette, language, text
 * size, contrast and the app's own appearance choices — and its views — table views, the
 * sidebar, folded groups, saved filters — back to what a new device gets, through
 * {@link resetDeviceSettings}. The account, the sign-in, the session and anything waiting
 * to be sent are never touched: they never join the registry.
 *
 * - **A confirm, not an undo** (§11.2 decision 9): `useConfirm` in the neutral tone,
 *   then a toast. An app mounts a `ConfirmProvider` and a `Toaster` already.
 * - **Not a commit**: nothing is written to the account, so a demo or a lapsed plan's
 *   write lock does not disable it (decision 3).
 * - **Live, no reload** (decision 10): each registered store resets through its own
 *   setter; the card stays where it is.
 *
 * The app adds the catalogue entry, `{ id: "device_reset", group: "appearance", anchor:
 * DEVICE_RESET_ANCHOR, title, keywords }` (`title` and `keywords` from these labels), last
 * in its appearance group: inside a `SettingsLayout`, `SettingsSection` throws in
 * development without it.
 */
export function DeviceResetSetting({
  description,
  labels: labelsProp,
  onReset,
  ...rest
}: DeviceResetSettingProps) {
  const labels = useKitLabels("deviceReset", DEFAULT_DEVICE_RESET_LABELS, labelsProp);
  const confirm = useConfirm();

  const reset = async () => {
    const ok = await confirm({
      title: labels.confirmTitle,
      body: labels.confirmBody,
      confirmLabel: labels.confirmAction,
      tone: "neutral",
    });
    if (!ok) return;
    const keys = resetDeviceSettings();
    onReset?.(keys);
    toast.success(labels.done);
  };

  return (
    <SettingsSection
      {...rest}
      anchor={DEVICE_RESET_ANCHOR}
      title={labels.title}
      description={
        description != null ? (
          <>
            {labels.description} {description}
          </>
        ) : (
          labels.description
        )
      }
    >
      <div>
        <Button variant="secondary" onClick={() => void reset()}>
          {labels.action}
        </Button>
      </div>
    </SettingsSection>
  );
}
