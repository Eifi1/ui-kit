import { useEffect, useRef } from "react";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { toast } from "../components/toast";
import { DEFAULT_PWA_UPDATE_PROMPT_LABELS } from "./pwa-update-prompt-labels";

/**
 * "A new version is available. — Reload": keksdose's service-worker toast
 * (app/pwa-update-prompt.tsx) as a kit component (docs/local-first-harmonization.md §1.5
 * D8). The app keeps `useRegisterSW` (vite-plugin-pwa, `registerType: "prompt"`) and hands
 * its state in: `needRefresh` from it, `onReload` = `updateServiceWorker(true)`,
 * `onDismiss` = `setNeedRefresh(false)`.
 *
 * `hold` defers the prompt while a reload would hurt — a handover being signed, a tour
 * running. Nothing shows while it holds; the toast appears once it drops. A hold that
 * starts while the toast is up takes it down again until it drops.
 *
 * Renders nothing itself: the toast needs a mounted `<Toaster>`.
 */
export interface PwaUpdatePromptLabels {
  updateAvailable: string;
  reload: string;
}

// Defined in ./pwa-update-prompt-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_PWA_UPDATE_PROMPT_LABELS };

export interface PwaUpdatePromptProps {
  /** A new service worker is waiting. */
  needRefresh: boolean;
  /** Activates it and reloads — `updateServiceWorker(true)`. */
  onReload: () => void;
  /** The toast was closed without reloading. */
  onDismiss?: () => void;
  /** Wait: a handover is open, a tour runs. */
  hold?: boolean;
  labels?: LabelOverride<PwaUpdatePromptLabels>;
}

/** The toast's id: one prompt at a time, replaced in place. */
const PWA_UPDATE_TOAST_ID = "pwa-update";

export function PwaUpdatePrompt({
  needRefresh,
  onReload,
  onDismiss,
  hold = false,
  labels: labelsProp,
}: PwaUpdatePromptProps) {
  const labels = useKitLabels("pwaUpdate", DEFAULT_PWA_UPDATE_PROMPT_LABELS, labelsProp);
  // The callbacks are read at click time, so a new function each render does not
  // re-raise the toast.
  const handlers = useRef({ onReload, onDismiss });
  useEffect(() => {
    handlers.current = { onReload, onDismiss };
  });

  const show = needRefresh && !hold;
  useEffect(() => {
    if (!show) return;
    // sonner calls `onDismiss` for a programmatic dismiss too: the one this effect makes
    // when a hold starts must not tell the app the person waved the update away.
    let ours = false;
    toast(labels.updateAvailable, {
      id: PWA_UPDATE_TOAST_ID,
      duration: Infinity,
      action: { label: labels.reload, onClick: () => handlers.current.onReload() },
      onDismiss: () => {
        if (!ours) handlers.current.onDismiss?.();
      },
    });
    return () => {
      ours = true;
      toast.dismiss(PWA_UPDATE_TOAST_ID);
    };
  }, [show, labels.updateAvailable, labels.reload]);

  return null;
}
