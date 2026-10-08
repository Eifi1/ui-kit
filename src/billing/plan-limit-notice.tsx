import type { ComponentPropsWithoutRef } from "react";

import { useKitLocale } from "../i18n/kit-labels";
import type { LabelOverride } from "../i18n/kit-labels";
import { formatNumber } from "../lib/format";
import { AlertBanner } from "../components/alert-banner";
import type { AlertTone } from "../components/alert-banner";
import { ProgressBar } from "../components/progress-bar";
import { Button } from "../components/ui";
import { useBillingLabels } from "./billing-labels";
import type { BillingLabels } from "./billing-labels";

/** RFC 3986 percent-encoding, `!'()*` too — a mail client that splits on `'` is the one
 *  that breaks "Plan limit: Ada's plots" (landing/access.ts keeps the same rule). */
function encodeStrict(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** The `contact` mode's mail: to support, its subject naming the dimension. */
export function planLimitMailto(email: string, subject: string): string {
  const to = encodeStrict(email).replace(/%40/g, "@");
  return `mailto:${to}?subject=${encodeStrict(subject)}`;
}

interface PlanLimitNoticeBaseProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onClick"> {
  /** The dimension as the refusal names it (`"budgets"`, `"seats"`) — `isPlanLimit(err)`'s
   *  `dimension`. Carried as `data-dimension`. */
  dimension: string;
  /** The app's name for it, in the reader's language: "Budgets". Default: the key. */
  dimensionLabel?: string;
  /** How many there are. Left out (keksdose's legacy `plan_budget_limit` body has no
   *  `used`), it is read as `limit`: the create was refused for being at it. */
  used?: number;
  /** The plan's limit for the dimension. Left out — a body without one — the notice says
   *  its words and draws no meter. */
  limit?: number;
  /** The payer's plan code, as `isPlanLimit` reads it — carried as `data-plan`, so the
   *  refusal can be spread in whole: `<PlanLimitNotice {...isPlanLimit(err)} …/>`. */
  plan?: string;
  /** How a figure is written — kastlan's storage limit is bytes (`formatFileSize`).
   *  Default: a number in the kit's locale. */
  formatValue?: (value: number) => string;
  /** Over the provider's locale, for the default figures. */
  locale?: string;
  /** Default `warning`. */
  tone?: AlertTone;
  /** Prop > `<UiKitProvider labels={{ billing }}>` > English. */
  labels?: LabelOverride<BillingLabels>;
}

export type PlanLimitNoticeProps = PlanLimitNoticeBaseProps &
  (
    | {
        /** Plans are bought: "Choose a plan" → the app's subscription page. */
        mode: "upgrade";
        /** The subscription page. */
        href: string;
        email?: never;
      }
    | {
        /** The operator grants plans by hand (keksdose's today): "Ask for more" → a mail. */
        mode: "contact";
        /** The support address: `support@` the app's domain. */
        email: string;
        href?: never;
      }
  );

/**
 * A create refused at the plan's limit (docs/billing-harmonization.md §3.4): "Plan limit
 * reached", what to do, the dimension's meter ("Budgets — 3 of 3") and the app's way to
 * more — `upgrade`, a link to the subscription page, or `contact`, a mail to support.
 *
 * A limit gates CREATION only: a downgrade never deletes or hides what is over the new
 * limit (§3.4), so `used` may be past `limit`; the meter then fills and turns red. Feed it
 * the refusal: `const hit = isPlanLimit(err); hit && <PlanLimitNotice {...hit} …/>`. The
 * kit sends nothing — the mail opens the reader's own client.
 */
export function PlanLimitNotice(props: PlanLimitNoticeProps) {
  const {
    dimension,
    dimensionLabel,
    used: usedProp,
    limit,
    plan,
    formatValue,
    locale: localeProp,
    tone = "warning",
    labels: labelsProp,
    mode,
    href,
    email,
    className,
    ...rest
  } = props;
  const labels = useBillingLabels(labelsProp);
  const locale = useKitLocale(localeProp);
  const used = usedProp ?? limit ?? 0;
  const name = dimensionLabel ?? dimension;
  const figure = (value: number) => (formatValue ? formatValue(value) : formatNumber(value, { locale }));

  const action =
    mode === "upgrade" ? (
      <Button href={href} variant="secondary" size="sm">
        {labels.choosePlan}
      </Button>
    ) : (
      <Button href={planLimitMailto(email, labels.contactSubject(name))} variant="secondary" size="sm">
        {labels.askForMore}
      </Button>
    );

  return (
    <AlertBanner
      {...rest}
      tone={tone}
      action={action}
      data-plan-limit-mode={mode}
      data-dimension={dimension}
      data-plan={plan}
      className={className}
    >
      <span className="block font-medium">{labels.limitReached}</span>
      <span className="block">{mode === "upgrade" ? labels.limitUpgrade : labels.limitContact}</span>
      {limit !== undefined && (
        <ProgressBar
          as="span"
          variant="meter"
          size="slim"
          value={used}
          max={limit}
          label={name}
          showValue
          // The bar is clamped at `max` and hands its formatter the clamped value; the
          // figures are the real ones, so "5 of 3" after a downgrade says what the bar
          // cannot draw.
          formatValue={() => labels.usage(figure(used), figure(limit))}
          tone={used > limit ? "danger" : "warning"}
          className="mt-2"
          locale={locale}
        />
      )}
    </AlertBanner>
  );
}
