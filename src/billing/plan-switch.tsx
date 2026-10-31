import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import type { LabelOverride } from "../i18n/kit-labels";
import { DEFAULT_COMMON_LABELS } from "../i18n/shared-labels";
import { pluralForm } from "../i18n/plurals";
import type { PluralForms } from "../i18n/plurals";
import { formatDate, formatMoney, formatNumber } from "../lib/format";
import { AlertBanner } from "../components/alert-banner";
import { Button } from "../components/button";
import { DialogFrame } from "../components/dialog-frame";
import { Spinner } from "../components/spinner";
import { COMMIT_EXCEPT_BILLING } from "../components/write-lock";
import { DEFAULT_PLAN_CHANGE_LABELS } from "../admin/plan-change-labels";
import { useBillingLabels } from "./billing-labels";
import type { BillingLabels } from "./billing-labels";
import type { PlanSwitchPreview } from "./billing-overview";
import { minorToMajor } from "./plan-price";
import type { BillingInterval } from "./plan-price";

/**
 * The payer's plan switch (docs/billing-harmonization.md §15.2.10, ui-kit 0.39): built
 * once in the kits and used by all three apps, instead of Paddle's portal. While a
 * provider subscription runs, the app sends a `PlanPicker` pick to
 * `POST /billing/plan/preview` and opens this dialog with the answer; Confirm is the
 * app's `POST /billing/plan`. Otherwise the pick goes to the checkout, as before.
 *
 * The switch is immediate and prorated: an upgrade charges the difference now, a
 * downgrade credits the unused part to the customer's balance, which Paddle takes off
 * the next charges. So the payer agrees to a figure — Paddle's preview — and sees the
 * dimensions over the new plan's limit before agreeing (§3.4: a limit gates creation
 * only, so the switch is allowed).
 */

/** One side of a switch: a plan code and its billing period. */
export interface PlanSwitchSide {
  plan: string;
  interval: BillingInterval;
}

export interface PlanSwitchConfirmProps {
  open: boolean;
  /** `false` when the payer dismisses it — Cancel, Escape, the backdrop. Confirm leaves
   *  it open: close it once the switch answers. */
  onOpenChange: (open: boolean) => void;
  /** What the payer pays now: the overview's `paid`. */
  from: PlanSwitchSide;
  /** The pick. */
  to: PlanSwitchSide;
  /** `POST /billing/plan/preview`'s answer. Undefined while it loads: a spinner, and
   *  Confirm is held. */
  preview?: PlanSwitchPreview;
  /** `POST /billing/plan` is under way: Confirm's spinner, no second press, and neither
   *  Escape, the backdrop nor Back closes it. */
  pending?: boolean;
  /** The plan's display name, the app's (§3.1). Default: the code. */
  planName?: (code: string) => string;
  /**
   * The app's word per dimension, for the over-limit lines. A heading's word ("Budgets")
   * reads "Budgets: 7 of 5" (`billing.limitUsageLine`); its plural forms
   * (`{ one: "budget", other: "budgets" }`) read "7 of 5 budgets" (`planChange.usageOf`,
   * the form the limit takes). A dimension without one is named by its key.
   */
  dimensionLabels?: Readonly<Record<string, string | PluralForms>>;
  /** How a usage or limit figure is written. Default: a number in the locale. */
  formatLimit?: (dimension: string, value: number) => string;
  /** Confirm: the app's `POST /billing/plan` with `{plan, interval}` of `to`. */
  onConfirm: () => void;
  /** The figures' and the date's locale. Default: the provider's. */
  locale?: string;
  /**
   * 0.42 (§16.2 decision 5, §16.8 B): the payer's free grant runs without an end —
   * `isPermanentGrant(overview)`. The switch changes the PAID plan, not the applied one
   * (§12.11), so the dialog says so above its figures (`grantWarningTitle`,
   * `grantWarningBody`) before the payer agrees. Confirm stays Confirm: the warning is
   * this dialog's own, and `PlanPicker` — told `switching` — shows none of its own on
   * the way here, so the payer reads it once.
   */
  permanentGrant?: boolean;
  /** Prop > `<UiKitProvider labels={{ billing }}>` > English. */
  labels?: LabelOverride<BillingLabels>;
}

/**
 * The confirm for a plan switch (§15.2.10): from → to, each with its billing period;
 * Paddle's preview — "Charged now" (an upgrade) or "Credited towards your next charges"
 * (a downgrade), and the next charge with its date — in the subscription's currency;
 * the dimensions over the new plan's limit; and Confirm.
 *
 *     const preview = useMutation({ mutationFn: api.previewPlanSwitch });
 *     <PlanSwitchConfirm
 *       open={pick !== null}
 *       onOpenChange={(open) => !open && setPick(null)}
 *       from={overview.paid}
 *       to={pick}
 *       preview={preview.data}
 *       pending={switching.isPending}
 *       planName={planName}
 *       onConfirm={() => switching.mutate(pick)}
 *     />
 *
 * It takes no billing lock (`COMMIT_EXCEPT_BILLING` built in): a read-only payer may
 * change plan, as they may pay. A demo lock still holds it, as the server's demo guard
 * does. The kit sends no request.
 */
export function PlanSwitchConfirm({
  open,
  onOpenChange,
  from,
  to,
  preview,
  pending = false,
  planName = (code) => code,
  dimensionLabels,
  formatLimit,
  onConfirm,
  locale: localeProp,
  permanentGrant = false,
  labels: labelsProp,
}: PlanSwitchConfirmProps) {
  const labels = useBillingLabels(labelsProp);
  const planChange = useKitLabels("planChange", DEFAULT_PLAN_CHANGE_LABELS);
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const locale = useKitLocale(localeProp);

  const period = (interval: BillingInterval) => (interval === "year" ? labels.yearly : labels.monthly);
  const side = (s: PlanSwitchSide) => `${planName(s.plan.toLowerCase())} (${period(s.interval)})`;
  const money = (minor: number, currency: string) => formatMoney(minorToMajor(minor, currency), currency, { locale });
  const figure = (dimension: string, value: number) =>
    formatLimit ? formatLimit(dimension, value) : formatNumber(value, { locale });

  /** One line per dimension over the new limit, in the word's own sentence. */
  const overLimit = (p: PlanSwitchPreview): string[] =>
    (p.over_limit ?? []).flatMap((dimension) => {
      const limit = p.limits?.[dimension];
      const used = p.usage?.[dimension];
      if (limit === null || limit === undefined || used === undefined) return [];
      const word = dimensionLabels?.[dimension] ?? dimension;
      return [
        typeof word === "string"
          ? labels.limitUsageLine(word, figure(dimension, used), figure(dimension, limit))
          : planChange.usageOf(figure(dimension, used), figure(dimension, limit), pluralForm(limit, word, locale)),
      ];
    });

  const credit = preview !== undefined && preview.now_minor < 0;
  const lines = preview ? overLimit(preview) : [];

  return (
    <DialogFrame
      open={open}
      title={labels.switchTitle}
      description={labels.switchFromTo(side(from), side(to))}
      onClose={() => onOpenChange(false)}
      busy={pending}
      // A preview that loads is busy too, but holds nothing: Cancel stays a way out.
      aria-busy={preview === undefined || undefined}
      actions={(close) => (
        <>
          <Button variant="secondary" onClick={close} disabled={pending}>
            {common.cancel}
          </Button>
          <Button
            commit={COMMIT_EXCEPT_BILLING}
            pending={pending}
            disabled={preview === undefined}
            onClick={() => {
              if (preview !== undefined && !pending) onConfirm();
            }}
          >
            {labels.switchConfirm}
          </Button>
        </>
      )}
    >
      {permanentGrant && (
        <AlertBanner tone="warning" size="sm" data-grant-warning="">
          <strong className="block font-medium">{labels.grantWarningTitle}</strong> {labels.grantWarningBody}
        </AlertBanner>
      )}
      {preview === undefined ? (
        <div className="flex justify-center py-4">
          <Spinner showLabel />
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-sm" data-plan-switch-preview>
            <dt className="text-secondary">{credit ? labels.switchCredited : labels.switchChargedNow}</dt>
            <dd className="text-right font-medium tabular-nums" data-now={credit ? "credit" : "charge"}>
              {money(Math.abs(preview.now_minor), preview.currency)}
            </dd>
            {preview.next_billed_at && preview.next_minor != null && (
              <>
                <dt className="text-secondary">
                  {labels.switchNextCharge(formatDate(preview.next_billed_at, "medium", { locale }))}
                </dt>
                <dd className="text-right tabular-nums">{money(preview.next_minor, preview.currency)}</dd>
              </>
            )}
          </dl>
          {lines.length > 0 && (
            <div className="space-y-1 text-sm" data-plan-switch-over-limit>
              <p>{planChange.overLimit}</p>
              <ul className="list-disc space-y-0.5 ps-5 text-secondary">
                {lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </DialogFrame>
  );
}
