/**
 * How the three billing confirms — `CancelSubscriptionConfirm`, `PlanSwitchConfirm`,
 * `GrantWarningConfirm` — are closed in 0.52: `onClose`, as every other kit dialog
 * (CONTRIBUTING §4; refactor audit 2026-10-30, API-5), and for one minor the deprecated
 * `onOpenChange`, called with `false` when there is no `onClose`.
 *
 * 0.52 made `onOpenChange` optional for its deprecation and gave `onClose` beside it as
 * optional too, so a confirm given NEITHER compiled — `<CancelSubscriptionConfirm open
 * periodEnd={…} onConfirm={…} />` — and Back, Escape and the backdrop then called nothing:
 * a dialog nobody could dismiss, where 0.51's compiler had required `onOpenChange` (0.52
 * code review, cancel-subscription.tsx). And the fallback between the two was written
 * three times, once per dialog.
 *
 * @internal Not part of the barrel; each dialog's props type is.
 */

/** The two close props as a dialog's own props interface declares them. */
interface CloseProps {
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
}

/**
 * `P` with ONE of its two close props required — `onClose`, or alone the deprecated
 * `onOpenChange`; both may be given, and `onClose` is then the one called. Built from
 * `P`'s own members (`Pick`), so their docs and the deprecation stay the ones `P` writes.
 */
export type WithDialogClose<P extends CloseProps> = P &
  (Required<Pick<P, "onClose">> | Required<Pick<P, "onOpenChange">>);

/** The dialog's close: `onClose`, else `onOpenChange(false)`. */
export function dialogClose({ onClose, onOpenChange }: CloseProps): () => void {
  return () => (onClose ? onClose() : onOpenChange?.(false));
}
