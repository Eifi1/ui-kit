import { forwardRef, useId, useState } from "react";
import type { ReactNode } from "react";
import { Check, Gauge } from "lucide-react";

import { DEFAULT_COMMON_LABELS, useKitLabels, useKitLocale } from "../i18n/kit-labels";
import type { LabelOverride } from "../i18n/kit-labels";
import { formatNumber } from "../lib/format";
import { cn } from "../lib/cn";
import { ChoiceCard } from "../components/choice-card";
import type { ChoiceCardProps } from "../components/choice-card";
import { Chip } from "../components/chip";
import { ToggleGroup } from "../components/toggle-group";
import { Button } from "../components/ui";
import { useBillingLabels } from "./billing-labels";
import type { BillingLabels } from "./billing-labels";
import { BILLING_INTERVALS, billingCurrencyFor, formatPlanPrice, planPrice } from "./plan-price";
import type { BillingCurrency, BillingInterval, PlanPrices } from "./plan-price";

/**
 * One plan of the app's catalogue (docs/billing-harmonization.md §3.1) as a page shows it:
 * server-kit's `PlanSpec` from `GET /billing/plans`, plus the words, which are the app's
 * (display names and feature lines come from its i18n, never from the provider).
 */
export interface BillingPlan {
  /** The plan code, lowercase on the wire (§12.16); compared without case here. */
  code: string;
  /** The app's display name, in the reader's language: "Pro". */
  name: string;
  /** A line under the price. */
  description?: ReactNode;
  /** Gross prices in minor units, per currency and period (§3.1, §12.17). None at all —
   *  or 0 — is a free plan. */
  prices?: PlanPrices | null;
  /** Dimension → limit; `null` is unlimited (§3.1). Shown in the object's order. */
  limits?: Readonly<Record<string, number | null>>;
  /** The app's feature lines. */
  features?: readonly ReactNode[];
  /** Not choosable — a plan being retired, say. */
  disabled?: boolean;
}

/**
 * How a plan stands to the one the payer pays for now: `current` is it, `upgrade` comes
 * after it in the catalogue's order (`PlanSpec.sort`), `downgrade` before it.
 */
export type PlanRelation = "current" | "upgrade" | "downgrade";

/** The plan's place against `current`, by the order of `plans`; `undefined` without a
 *  current plan (a trial, an ended plan) or for a code that is not in the list. */
export function planRelation(
  plans: readonly Pick<BillingPlan, "code">[],
  code: string,
  current: string | null | undefined,
): PlanRelation | undefined {
  if (!current) return undefined;
  const index = (c: string) => plans.findIndex((p) => p.code.toLowerCase() === c.toLowerCase());
  const at = index(code);
  const now = index(current);
  if (at < 0 || now < 0) return undefined;
  return at === now ? "current" : at > now ? "upgrade" : "downgrade";
}

/** What both parts need to draw a plan. */
interface PlanDisplayProps {
  /** The currency the prices are shown in (§2.6). */
  currency: BillingCurrency;
  /** The period the prices are shown for. */
  interval: BillingInterval;
  /** The app's name of each limit's dimension ("Budgets"). A dimension without one is
   *  shown by its key. */
  dimensionLabels?: Readonly<Record<string, string>>;
  /** How a limit's figure is written — kastlan's storage is bytes (`formatFileSize`).
   *  Default: a number in the kit's locale. */
  formatLimit?: (dimension: string, value: number) => string;
  /** Over the provider's locale. */
  locale?: string;
  /** Prop > `<UiKitProvider labels={{ billing }}>` > English. */
  labels?: LabelOverride<BillingLabels>;
}

export interface PlanCardProps
  extends Omit<ChoiceCardProps, "type" | "title" | "description" | "icon" | "indeterminate" | "value" | "labels">,
    PlanDisplayProps {
  plan: BillingPlan;
  /** See {@link PlanRelation}. `current` draws the "Current plan" chip — a word in the
   *  card's name, never a colour alone. */
  relation?: PlanRelation;
  /**
   * The provider's own localised price in place of the catalogue's figure (§12.17) — a
   * Merchant of Record's price preview for the buyer's country, tax included. The period
   * and "VAT included" stay: the law asks for a gross price, and the card says so.
   */
  pricePreview?: ReactNode;
}

/** A list from spans (`role="list"`): the card is a `<label>`, which may hold phrasing
 *  content only, so a `<ul>` there would be invalid HTML. */
function SpanList({ name, items, icon }: { name: string; items: ReactNode[]; icon: ReactNode }) {
  if (items.length === 0) return null;
  return (
    <span role="list" aria-label={name} className="block space-y-1">
      {items.map((item, i) => (
        <span role="listitem" key={i} className="flex items-start gap-1.5 text-[var(--text-secondary)]">
          <span aria-hidden className="mt-[0.0625rem] flex shrink-0 text-[var(--text-muted)] [&_svg]:size-3.5">
            {icon}
          </span>
          <span className="min-w-0">
            {item}
            {/* A space between the items' texts in the flattened description. */}{" "}
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * One plan as a {@link ChoiceCard} radio (§7): the name (and "Current plan"), the GROSS
 * price in the chosen currency and period through `formatMoney` ("CHF 49 per year, VAT
 * included", §12.17), the limits ("Budgets: 3", "Seats: Unlimited") and the app's feature
 * lines. A plan with prices but none for this currency and period is shown, "Not offered
 * for this billing period", and cannot be picked.
 *
 * A radio of a set: give the cards one `name`, or use {@link PlanPicker}, which does that
 * and owns the choice. Everything else a `ChoiceCard` takes goes to it — `checked`,
 * `onCheckedChange`, `name`, `className`. Carries `data-plan` and `data-relation`.
 */
export const PlanCard = forwardRef<HTMLInputElement, PlanCardProps>(function PlanCard(
  {
    plan,
    relation,
    pricePreview,
    currency,
    interval,
    dimensionLabels,
    formatLimit,
    locale: localeProp,
    labels: labelsProp,
    disabled,
    ...rest
  },
  ref,
) {
  const labels = useBillingLabels(labelsProp);
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const locale = useKitLocale(localeProp);
  const price = planPrice(plan.prices, currency, interval);

  const priced = price.kind === "price";
  const figure = priced
    ? pricePreview !== undefined && pricePreview !== null
      ? pricePreview
      : formatPlanPrice(price.minor, currency, { locale })
    : price.kind === "free"
      ? labels.free
      : labels.notOffered;

  const limitLines = Object.entries(plan.limits ?? {}).map(([dimension, value]) => {
    const name = dimensionLabels?.[dimension] ?? dimension;
    const shown =
      value === null ? labels.unlimited : formatLimit ? formatLimit(dimension, value) : formatNumber(value, { locale });
    return common.fieldValue(name, shown);
  });

  const body = (
    <span className="mt-1 block space-y-2">
      <span className="block">
        <span
          data-part="price"
          className={cn(
            "tabular-nums",
            price.kind === "not-offered"
              ? "text-xs text-[var(--text-muted)]"
              : "text-lg font-semibold leading-tight text-[var(--text-primary)]",
          )}
        >
          {figure}
        </span>
        {priced && (
          <>
            {" "}
            <span className="text-xs text-[var(--text-secondary)]">
              {interval === "year" ? labels.perYear : labels.perMonth}
            </span>{" "}
            <span className="block text-xs text-[var(--text-muted)]">{labels.vatIncluded}</span>
          </>
        )}{" "}
      </span>
      {plan.description !== undefined && plan.description !== null && (
        <span className="block text-[var(--text-secondary)]">{plan.description} </span>
      )}
      <SpanList name={labels.limits} items={limitLines} icon={<Gauge />} />
      <SpanList name={labels.features} items={[...(plan.features ?? [])]} icon={<Check />} />
    </span>
  );

  return (
    <ChoiceCard
      ref={ref}
      {...rest}
      type="radio"
      value={plan.code}
      disabled={disabled || plan.disabled || price.kind === "not-offered"}
      data-plan={plan.code}
      data-relation={relation}
      title={
        <>
          {plan.name}
          {relation === "current" && (
            <>
              {" "}
              <Chip size="xs" tone="brand" shape="square" caps className="ms-1 align-[0.0625rem]">
                {labels.current}
              </Chip>
            </>
          )}
        </>
      }
      description={body}
    />
  );
});
PlanCard.displayName = "PlanCard";

/** What {@link PlanPickerProps.onChoose} is handed: everything `POST /billing/checkout`
 *  takes (§4). */
export interface PlanChoice {
  plan: string;
  interval: BillingInterval;
  currency: BillingCurrency;
}

export interface PlanPickerProps extends Omit<PlanDisplayProps, "currency" | "interval"> {
  /** The catalogue, in its order (`PlanSpec.sort`): cheapest first. The order decides
   *  upgrade and downgrade. */
  plans: readonly BillingPlan[];
  /**
   * The plan the payer pays for now (`plan` of the overview while `active` or
   * `past_due`). Leave it out during a trial and after a plan ended: then every plan is
   * "Choose …", the trial's plan included, since none is paid for yet.
   */
  current?: string | null;
  /** The picked plan, controlled. `null` while none is. */
  value?: string | null;
  /** The picked plan, uncontrolled. Default: `current`, else nothing. */
  defaultValue?: string | null;
  onValueChange?: (plan: string) => void;
  /** The period, controlled. */
  interval?: BillingInterval;
  /** The period, uncontrolled. Default `year` — lead with yearly (§12.17). */
  defaultInterval?: BillingInterval;
  onIntervalChange?: (interval: BillingInterval) => void;
  /** The currency, controlled. */
  currency?: BillingCurrency;
  /** The currency, uncontrolled. Default: the account's stored currency is the app's to
   *  pass here (§12.18); without it, {@link billingCurrencyFor} the kit's locale. */
  defaultCurrency?: BillingCurrency;
  onCurrencyChange?: (currency: BillingCurrency) => void;
  /** The currencies the payer may switch between. Default: every currency a plan has a
   *  price in. The switch shows only for more than one. */
  currencies?: readonly BillingCurrency[];
  /** The button: the app starts its checkout (`POST /billing/checkout`, then off to the
   *  provider's page). The kit sends no request. */
  onChoose: (choice: PlanChoice) => void;
  /** The checkout is being opened: the button's spinner, no second press. */
  pending?: boolean;
  /** The provider's localised price for a plan, or `undefined` for the catalogue's —
   *  see {@link PlanCardProps.pricePreview}. */
  pricePreview?: (plan: BillingPlan, choice: Omit<PlanChoice, "plan">) => ReactNode | undefined;
  /** A visible question over the cards. Without one the set is named "Plans". */
  legend?: ReactNode;
  /** Shared by the radios. Generated if omitted. */
  name?: string;
  /** Classes for the whole picker. */
  className?: string;
  /** Classes for the card grid. Default: one column, two from `sm`, three from `lg`. */
  gridClassName?: string;
  /** Classes for every card. */
  cardClassName?: string;
}

/** Every currency some plan has a price in, CHF first. */
function pricedCurrencies(plans: readonly BillingPlan[]): BillingCurrency[] {
  const found = new Set<BillingCurrency>();
  for (const p of plans) for (const c of Object.keys(p.prices ?? {})) found.add(c as BillingCurrency);
  return (["CHF", "EUR"] as const).filter((c) => found.has(c));
}

/** Every period some plan has a price for, yearly first. */
function pricedIntervals(plans: readonly BillingPlan[]): BillingInterval[] {
  const found = new Set<BillingInterval>();
  for (const p of plans)
    for (const byInterval of Object.values(p.prices ?? {}))
      for (const [k, v] of Object.entries(byInterval ?? {})) if (typeof v === "number") found.add(k as BillingInterval);
  return BILLING_INTERVALS.filter((i) => found.has(i));
}

/**
 * The plans to choose from (§7): the period switch — yearly first (§12.17) — and, where
 * the payer may pay in either, the currency switch (§2.6); a {@link PlanCard} per plan in
 * a radio set; and one button that says what pressing it does: "Upgrade to Pro", "Switch
 * to Free", or "Choose Pro" with no plan paid for yet.
 *
 * One button under the set rather than one per card: each card IS a radio — a `<label>`
 * round an `<input>` — and a button inside a label is interactive content inside
 * interactive content. Picking and committing are two steps anyway: the price under the
 * picked card is what checkout will charge.
 *
 * The button never takes the write lock: billing itself always works, a read-only payer
 * must be able to pay (§3.3). It is off, with the reason on hover and focus, while
 * nothing is picked or the current plan is.
 */
export function PlanPicker({
  plans,
  current,
  value: valueProp,
  defaultValue,
  onValueChange,
  interval: intervalProp,
  defaultInterval = "year",
  onIntervalChange,
  currency: currencyProp,
  defaultCurrency,
  onCurrencyChange,
  currencies: currenciesProp,
  onChoose,
  pending,
  pricePreview,
  legend,
  name,
  className,
  gridClassName,
  cardClassName,
  dimensionLabels,
  formatLimit,
  locale: localeProp,
  labels: labelsProp,
}: PlanPickerProps) {
  const labels = useBillingLabels(labelsProp);
  const locale = useKitLocale(localeProp);
  const generated = useId();
  const groupName = name ?? generated;
  const legendId = `${generated}-legend`;

  const [ownValue, setOwnValue] = useState<string | null>(() => defaultValue ?? current ?? null);
  const [ownInterval, setOwnInterval] = useState<BillingInterval>(defaultInterval);
  const [ownCurrency, setOwnCurrency] = useState<BillingCurrency>(
    () => defaultCurrency ?? billingCurrencyFor(locale),
  );
  const value = valueProp !== undefined ? valueProp : ownValue;
  const interval = intervalProp ?? ownInterval;
  const currency = currencyProp ?? ownCurrency;

  const pick = (code: string) => {
    if (valueProp === undefined) setOwnValue(code);
    onValueChange?.(code);
  };
  const setInterval = (next: BillingInterval) => {
    if (intervalProp === undefined) setOwnInterval(next);
    onIntervalChange?.(next);
  };
  const setCurrency = (next: BillingCurrency) => {
    if (currencyProp === undefined) setOwnCurrency(next);
    onCurrencyChange?.(next);
  };

  const currencies = currenciesProp ?? pricedCurrencies(plans);
  const intervals = pricedIntervals(plans);
  const picked = value ? plans.find((p) => p.code.toLowerCase() === value.toLowerCase()) : undefined;
  const relation = picked ? planRelation(plans, picked.code, current) : undefined;
  const pickedPrice = picked ? planPrice(picked.prices, currency, interval) : undefined;

  const buttonText = !picked
    ? labels.choosePlan
    : relation === "upgrade"
      ? labels.upgrade(picked.name)
      : relation === "downgrade"
        ? labels.downgrade(picked.name)
        : labels.choose(picked.name);
  const blocked = !picked
    ? labels.pickFirst
    : relation === "current"
      ? labels.isCurrent
      : pickedPrice?.kind === "not-offered"
        ? labels.notOffered
        : undefined;

  return (
    <div className={cn("min-w-0 space-y-3", className)} data-billing-interval={interval} data-billing-currency={currency}>
      {(intervals.length > 1 || currencies.length > 1) && (
        <div className="flex flex-wrap items-center gap-2">
          {intervals.length > 1 && (
            <ToggleGroup
              aria-label={labels.interval}
              // Content-wide, so the two switches share a row and wrap only when narrow.
              className="w-auto"
              options={intervals.map((i) => ({ value: i, label: i === "year" ? labels.yearly : labels.monthly }))}
              value={interval}
              onChange={setInterval}
            />
          )}
          {currencies.length > 1 && (
            <ToggleGroup
              aria-label={labels.currency}
              className="w-auto"
              options={currencies.map((c) => ({ value: c, label: c }))}
              value={currency}
              onChange={setCurrency}
            />
          )}
        </div>
      )}
      <fieldset
        className="min-w-0"
        aria-labelledby={legend !== undefined ? legendId : undefined}
        aria-label={legend === undefined ? labels.plans : undefined}
      >
        {legend !== undefined && (
          <legend id={legendId} className="mb-2 text-sm font-medium text-[var(--text-primary)]">
            {legend}
          </legend>
        )}
        <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3", gridClassName)}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.code}
              plan={plan}
              name={groupName}
              currency={currency}
              interval={interval}
              relation={planRelation(plans, plan.code, current)}
              pricePreview={pricePreview?.(plan, { interval, currency })}
              checked={picked?.code === plan.code}
              onCheckedChange={(on) => on && pick(plan.code)}
              dimensionLabels={dimensionLabels}
              formatLimit={formatLimit}
              locale={locale}
              labels={labelsProp}
              className={cardClassName}
            />
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="primary"
          className="max-sm:w-full"
          disabledReason={blocked}
          pending={pending}
          onClick={() => picked && onChoose({ plan: picked.code, interval, currency })}
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
}
