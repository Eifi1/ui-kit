import { useState } from "react";
import type { ReactNode } from "react";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { Button } from "../components/button";
import { DialogFrame } from "../components/dialog-frame";
import { DEFAULT_SIGN_OUT_PENDING_DIALOG_LABELS } from "./sign-out-pending-dialog-labels";

/**
 * The question before an explicit sign-out while changes still wait to sync — keksdose's
 * confirm (account-menu.tsx:247-317) as a kit dialog (docs/local-first-harmonization.md
 * §1.5 D6, §1.6). Show it only when `queued > 0` and only on a sign-out someone asked for:
 * never from a session-ended hook, which cannot ask anyone.
 *
 * "Sync now" is the primary action: the queued writes are the person's own data. It runs
 * `onSyncNow`, is busy while that runs, then calls `onClose` without signing out — the
 * count has moved and the caller re-evaluates (signs out at once when nothing is left, or
 * opens this again with the new number). "Log out anyway" stays as the escape hatch, usable
 * while a sync runs (a hanging one would trap the person otherwise): a device that cannot
 * reach the server must still be able to sign out. Only a running discard holds it.
 *
 * The words depend on what the app does with the queue at sign-out (`keepsChanges`):
 * kastlan keeps the outbox for its owner, keksdose wipes it — and keksdose's copy must not
 * say the changes stay.
 */
export interface SignOutPendingDialogLabels {
  title: string;
  /** `keepsChanges={false}`: signing out destroys the device's copy. */
  lost: (count: number) => string;
  /** `keepsChanges`: the queue stays on the device for its owner. */
  kept: (count: number) => string;
  syncNow: string;
  signOutAnyway: string;
  /** Only with `onDiscardWaiting` and `waitingForPlan > 0` (the billing kit's words). */
  discardWaiting: string;
  cancel: string;
}

// Defined in ./sign-out-pending-dialog-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_SIGN_OUT_PENDING_DIALOG_LABELS };

export interface SignOutPendingDialogProps {
  open: boolean;
  /** Changes not yet on the server: pending + blocked. The tour `:pending` record is not
   *  one of them (D6). */
  queued: number;
  /** Of those, the ones waiting for a plan (billing's read-only refusal). */
  waitingForPlan: number;
  /** Runs one sync round. The dialog closes when it settles, whatever it managed. */
  onSyncNow: () => Promise<unknown> | void;
  /** Signs out now, queue or not. */
  onSignOutAnyway: () => void;
  /** Lets the plan-waiting changes go; the dialog then signs out as asked. Without it
   *  (or with `waitingForPlan` 0) the button is not shown. */
  onDiscardWaiting?: () => Promise<unknown> | void;
  /** `true` (kastlan): the changes stay on this device for their owner. `false`
   *  (keksdose): they are lost. Picks the words. */
  keepsChanges: boolean;
  /** Room under the sentence — the billing kit's `waitingChanges` line. Shown only while
   *  `waitingForPlan > 0`, so a 0-count line never shows. */
  extra?: ReactNode;
  /** Cancel, Escape, the X — and after "Sync now". */
  onClose: () => void;
  labels?: LabelOverride<SignOutPendingDialogLabels>;
}

export function SignOutPendingDialog({
  open,
  queued,
  waitingForPlan,
  onSyncNow,
  onSignOutAnyway,
  onDiscardWaiting,
  keepsChanges,
  extra,
  onClose,
  labels: labelsProp,
}: SignOutPendingDialogProps) {
  const labels = useKitLabels("signOutPending", DEFAULT_SIGN_OUT_PENDING_DIALOG_LABELS, labelsProp);
  const [syncing, setSyncing] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  const syncNow = async () => {
    setSyncing(true);
    try {
      await onSyncNow();
    } catch {
      /* whatever the sync managed, the decision is the person's again */
    } finally {
      setSyncing(false);
    }
    onClose();
  };

  const discard = async () => {
    if (!onDiscardWaiting) return;
    setDiscarding(true);
    try {
      await onDiscardWaiting();
    } finally {
      setDiscarding(false);
    }
    onSignOutAnyway();
  };

  return (
    <DialogFrame
      open={open}
      role="alertdialog"
      onClose={onClose}
      title={labels.title}
      description={keepsChanges ? labels.kept(queued) : labels.lost(queued)}
      closeButton
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {labels.cancel}
          </Button>
          {onDiscardWaiting && waitingForPlan > 0 && (
            <Button variant="secondary" pending={discarding} disabled={syncing} onClick={() => void discard()}>
              {labels.discardWaiting}
            </Button>
          )}
          <Button pending={syncing} disabled={discarding} onClick={() => void syncNow()}>
            {labels.syncNow}
          </Button>
          <Button variant="secondary" disabled={discarding} onClick={onSignOutAnyway}>
            {labels.signOutAnyway}
          </Button>
        </>
      }
    >
      {waitingForPlan > 0 && (typeof extra === "string" ? <p className="text-sm text-muted">{extra}</p> : extra)}
    </DialogFrame>
  );
}
