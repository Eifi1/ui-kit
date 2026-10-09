import type { ReactNode } from "react";

import type { LabelOverride } from "../i18n/kit-labels";
import type { WriteLockHold, WriteLockKind } from "../components/write-lock";
import { useBillingLabels } from "./billing-labels";
import type { BillingLabels } from "./billing-labels";

/** One reason an app may lock writing: whether it locks now, its one sentence, and what
 *  kind of lock it is. */
export interface WriteLockSource {
  locked: boolean;
  /** The sentence a locked commit shows ("Not possible in the demo."). */
  reason?: ReactNode;
  /**
   * `"demo"`, `"billing"`, or the app's own (§12.36): a control's `commit` may be exempt
   * from a kind — `COMMIT_EXCEPT_BILLING`. Left out, no control can be exempt from it.
   */
  kind?: WriteLockKind;
}

/** What {@link combineWriteLocks} answers: the props of one `WriteLockProvider`. */
export interface CombinedWriteLock {
  locked: boolean;
  /** The first locked source's reason; `undefined` while nothing locks. */
  reason: ReactNode | undefined;
  /** EVERY locked source, kind and reason, in the order given (§12.36) — so a control
   *  exempt from billing under the demo's lock and billing's still finds the demo's. */
  holds: WriteLockHold[];
}

/**
 * Several reasons to lock writing, as ONE `WriteLockProvider` (docs/billing-harmonization.md
 * §12.6): the demo's read-only data and billing's read-only lapse, in keksdose's case on
 * the same budget page.
 *
 *     const demo = useDemoLabels();
 *     const billingReason = useBillingLockReason({ guest: !isOwner, item: budget.name });
 *     <WriteLockProvider {...combineWriteLocks([
 *       { locked: demoReadOnly, reason: demo.writeLocked },
 *       { locked: budget.locked === "billing", reason: billingReason },
 *     ])}>
 *
 * WHY NOT TWO NESTED PROVIDERS: the nearest provider wins (write-lock.tsx), and an inner
 * `locked={false}` REOPENS an outer lock on purpose — a viewer's own notes on a shared
 * curve. So `<Demo locked><Billing locked={false}>` would unlock the demo's data, and an
 * app would have to mount the inner provider only while it locks. One provider fed by
 * this function has no such order to get wrong.
 *
 * Locked when any source is; the reason is the FIRST locked source's, so list them in the
 * order the server refuses them (§12.3): the demo's 403 before billing's 402. One sentence,
 * not two joined: a tooltip answers "why can't I?" once, and in practice one source locks
 * at a time — demo users have no subscription row and are never gated (§12.7). `null`,
 * `undefined` and `false` entries are skipped, for `cond && { … }`.
 *
 * 0.33 (§12.36): name each source's `kind` — `{ locked, reason, kind: "demo" }`,
 * {@link useBillingWriteLock} for billing — and `holds` carries every locked one, in
 * order, so the kit's parts that a lapsed plan still allows (removing access, the
 * account's own settings, an operator's plan change) reopen under billing by themselves
 * while the demo's lock still holds them.
 */
export function combineWriteLocks(
  sources: ReadonlyArray<WriteLockSource | null | undefined | false>,
): CombinedWriteLock {
  const holds: WriteLockHold[] = [];
  for (const source of sources) {
    if (source && source.locked) holds.push({ kind: source.kind, reason: source.reason });
  }
  return { locked: holds.length > 0, reason: holds[0]?.reason, holds };
}

export interface BillingLockReasonOptions {
  /**
   * The reader is a GUEST in someone else's item (§12.6): the reason never says why
   * beyond "for now", because the owner's payment status is the owner's personal data —
   * "This budget is read-only for now; its owner can lift that." Default false: the
   * reader is the payer, "Your plan has ended. Choose a plan to make changes again."
   */
  guest?: boolean;
  /** A guest's item, by its own name ("Household 2026"). Ignored for the payer. */
  item?: string;
  labels?: LabelOverride<BillingLabels>;
}

/**
 * The billing lock's sentence for a `WriteLockProvider` (§3.3), in the `billing` words of
 * the nearest provider: the payer's `lockReason`, or a guest's `guestReadOnly`. Feed it
 * to {@link combineWriteLocks} beside the demo's.
 */
export function useBillingLockReason(options: BillingLockReasonOptions = {}): string {
  const labels = useBillingLabels(options.labels);
  return options.guest ? labels.guestReadOnly(options.item) : labels.lockReason;
}

/**
 * Billing's lock as one source for {@link combineWriteLocks}: `{ locked, reason, kind:
 * "billing" }`, the reason the payer's or a guest's as {@link useBillingLockReason} says
 * it (§12.36). The kind is what lets the kit's parts that §3.3 and §12.13 allow stay live
 * under it.
 *
 *     <WriteLockProvider {...combineWriteLocks([
 *       { locked: demoReadOnly, reason: demo.writeLocked, kind: "demo" },
 *       useBillingWriteLock(budget.locked === "billing", { guest: !isOwner, item: budget.name }),
 *     ])}>
 */
export function useBillingWriteLock(locked: boolean, options: BillingLockReasonOptions = {}): WriteLockSource {
  const reason = useBillingLockReason(options);
  return { locked, reason, kind: "billing" };
}
