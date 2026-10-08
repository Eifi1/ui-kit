import { toDate } from "../lib/format";
import type { DateInput } from "../lib/format";
import type { SubscriptionStatus } from "./billing-labels";

/**
 * What a device knows of the payer's standing — the fields of `GET /billing/overview`
 * (docs/billing-harmonization.md §4) that decide the read-only lock, under their wire
 * names. Pass the overview as it came; the other fields are ignored.
 */
export interface BillingStanding {
  status: SubscriptionStatus;
  /** The server's answer at the time of the read (§3.3). */
  in_good_standing: boolean;
  /** When a trial ends (§3.2). Empty for a pure guest whose trial has not started (§12.9). */
  trial_ends_at?: DateInput;
  /** When a free grant ends: a beta user's 12 months, an operator's grant. Empty for a
   *  grant without an end (§12.8). */
  comped_until?: DateInput;
}

/**
 * The moment this payer's data becomes read-only by itself, known IN ADVANCE — or `null`
 * when no date says so (docs/billing-harmonization.md §12.5).
 *
 * A device writes locally first and sends later (keksdose's outbox, an encrypted budget
 * always), so a lock that only arrives with the server's 402 comes after the UI already
 * said "saved" — keksdose's phantom save (dev#496). The two dates that end good standing
 * on a schedule are in the overview, so the device locks itself on time, offline too:
 * a trial at `trial_ends_at`, a grant at `comped_until`. Only `past_due` → `expired`
 * depends on the provider's retries and waits for the next sync.
 */
export function billingLockAt(standing: BillingStanding): Date | null {
  if (standing.status === "trialing") return toDate(standing.trial_ends_at ?? null);
  if (standing.status === "comped") return toDate(standing.comped_until ?? null);
  return null;
}

/**
 * Whether the payer's data is read-only at `now` (default: the present moment): the
 * server already said so (`in_good_standing: false`), or a date from
 * {@link billingLockAt} has passed since the overview was read. Mirror it into the app's
 * offline write gate and its `WriteLockProvider` (§3.3, §12.5).
 *
 * A GUEST's device cannot do this for the owner: the owner's dates are the owner's
 * personal data (§12.6). An item shared with a guest carries `locked: "billing" | null`,
 * which the guest's device mirrors as it comes.
 */
export function isBillingReadOnly(standing: BillingStanding, now: number | Date = Date.now()): boolean {
  if (!standing.in_good_standing) return true;
  const at = billingLockAt(standing);
  const instant = typeof now === "number" ? now : now.getTime();
  return at !== null && at.getTime() <= instant;
}

const DAY = 86_400_000;

/**
 * Whole calendar days from `now` to `endsAt`, in the device's time zone — 0 on the day
 * itself (and after it), 1 the day before — or `null` for no readable date. The count a
 * trial or grant banner says ("ends tomorrow", "ends in 5 days"), from the day a reader
 * lives in rather than from 24-hour blocks: a trial ending at 01:00 tomorrow ends
 * "tomorrow", not "today".
 */
export function billingDaysLeft(endsAt: DateInput, now: number | Date = Date.now()): number | null {
  const end = toDate(endsAt);
  if (!end) return null;
  const from = typeof now === "number" ? new Date(now) : now;
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  // `round`, not `floor`: a day across a DST change is 23 or 25 hours long.
  return Math.max(0, Math.round((endDay - fromDay) / DAY));
}
