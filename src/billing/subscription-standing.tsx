import type { ComponentPropsWithRef } from "react";

import type { LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { useDayFormatter } from "../lib/day-format";
import { formatDate } from "../lib/format";
import type { DateInput } from "../lib/format";
import { useBillingLabels } from "./billing-labels";
import type { BillingLabels } from "./billing-labels";
import type { BillingOverview } from "./billing-overview";

/**
 * What the standing line reads of `GET /billing/overview` (docs/billing-harmonization.md
 * §4), under the wire names. Pass the overview as it came — or with the app's own
 * knowledge laid over it: kastlan says "Ends on …" the moment its in-app cancel is asked
 * (`{ ...overview, cancel_at_period_end: view.cancelScheduled }`, `useCancelRequest`).
 */
export type SubscriptionStandingOverview = Pick<
  BillingOverview,
  "status" | "in_good_standing" | "cancel_at_period_end"
> &
  // The dates may be left out, as `null` (0.55.1): an app's generated overview has them
  // optional with a default, and keksdose had to pass all three by name.
  Partial<Pick<BillingOverview, "trial_ends_at" | "comped_until" | "current_period_end">>;

/** Which of `billing.standing`'s lines applies, and the date it names. */
type Standing =
  | { kind: "ended" | "pastDue" | "free" }
  | { kind: "trialUntil" | "freeUntil" | "endsOn" | "renewsOn"; date: DateInput };

const given = (value: DateInput): boolean => value !== null && value !== undefined && value !== "";

/** Marcel's order (billing §7, 2026-11-04): the first that applies, or none. */
function standingOf(o: SubscriptionStandingOverview): Standing | null {
  // The server's word beats the status: `canceled` and `expired` are never in good
  // standing, and a lapsed `past_due` is no longer "retrying" (§3.3).
  if (!o.in_good_standing) return { kind: "ended" };
  // Still in good standing, and no date: a renewal the retries may not reach.
  if (o.status === "past_due") return { kind: "pastDue" };
  if (o.status === "trialing") return given(o.trial_ends_at) ? { kind: "trialUntil", date: o.trial_ends_at } : null;
  if (o.status === "comped") {
    return given(o.comped_until) ? { kind: "freeUntil", date: o.comped_until } : { kind: "free" };
  }
  if (!given(o.current_period_end)) return null;
  if (o.cancel_at_period_end) return { kind: "endsOn", date: o.current_period_end };
  if (o.status === "active") return { kind: "renewsOn", date: o.current_period_end };
  return null;
}

function standingText(s: Standing, words: BillingLabels["standing"], day: (value: DateInput) => string): string {
  switch (s.kind) {
    case "ended":
    case "pastDue":
    case "free":
      return words[s.kind];
    default:
      return words[s.kind](day(s.date));
  }
}

/**
 * The subscription's standing in one line — or `null` when nothing applies (kastlan reuse
 * audit 2026-11-02, proposal 3; billing §7, Marcel 2026-11-04). The FIRST that applies:
 *
 * 1. not in good standing → "Your plan has ended." (`billing.standing.ended`, the first
 *    sentence of the plan-ended banner's);
 * 2. `past_due` → "Payment failed — we’re retrying. Your plan stays active meanwhile.",
 *    with NO renewal date: the payment-failed banner keeps the action;
 * 3. `trialing` → "Trial until {trial_ends_at}" (a pure guest's trial that has not
 *    started, §12.9, has no date and says nothing);
 * 4. `comped` → "Free until {comped_until}", or "Free, with no end date";
 * 5. set to cancel at the period's end → "Ends on {current_period_end}";
 * 6. `active` → "Renews on {current_period_end}";
 * 7. otherwise nothing.
 *
 * kastlan and keksdose each wrote this line, and they drifted: kastlan said nothing for
 * an ended plan or a failed payment, and keksdose's `past_due` said "Renews on …".
 *
 * `format` prints a date in a sentence; default the kit's `formatDate` (`"medium"`) in
 * the runtime's locale. Inside a component, `<SubscriptionStanding>` prints it the
 * provider's way — its `formatDate` (the app's date preference), else its locale and
 * time zone.
 */
export function subscriptionStanding(
  overview: SubscriptionStandingOverview,
  labels: Pick<BillingLabels, "standing">,
  format: (value: DateInput) => string = (value) => formatDate(value),
): string | null {
  const s = standingOf(overview);
  return s && standingText(s, labels.standing, format);
}

export interface SubscriptionStandingProps extends Omit<ComponentPropsWithRef<"p">, "children"> {
  /** The overview, or the fields of it the line reads. */
  overview: SubscriptionStandingOverview;
  /** The date's locale. Default: the provider's. */
  locale?: string;
  /** Prop > `<UiKitProvider labels={{ billing: { standing } }}>` > English. */
  labels?: LabelOverride<BillingLabels>;
}

/**
 * {@link subscriptionStanding} as the muted line under the plan's name on the
 * subscription page (billing §7) — nothing at all when no line applies. The date is a
 * day in a sentence, without its weekday: the `<UiKitProvider formatDate>` (the app's
 * date preference) when it set one, else the kit's `formatDate`, `"medium"`, in the
 * provider's locale and `timeZone` — as `CancelSubscriptionConfirm` names the same day.
 *
 * Carries `data-standing` with the line's key (`ended`, `pastDue`, `trialUntil`,
 * `freeUntil`, `free`, `endsOn`, `renewsOn`), for a test or a style hook.
 *
 *     <SubscriptionStanding overview={overview} />
 *
 * Back from a checkout whose webhook has not landed (§12.21), the ended line is the stale
 * one: render it only when `useCheckoutProcessing`'s `processing` is false, and the
 * processing banner speaks meanwhile.
 */
export function SubscriptionStanding({
  overview,
  locale: localeProp,
  labels: labelsProp,
  className,
  ...rest
}: SubscriptionStandingProps) {
  const labels = useBillingLabels(labelsProp);
  const day = useDayFormatter(undefined, localeProp);
  const s = standingOf(overview);
  if (!s) return null;
  return (
    <p {...rest} data-standing={s.kind} className={cn("text-sm text-muted", className)}>
      {standingText(s, labels.standing, (value) => day(value))}
    </p>
  );
}
