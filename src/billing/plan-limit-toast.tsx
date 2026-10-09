import { useCallback } from "react";

import { useKitLocale } from "../i18n/kit-labels";
import type { LabelOverride } from "../i18n/kit-labels";
import { documentNavigation } from "../lib/document-navigation";
import { formatNumber } from "../lib/format";
import { toast } from "../components/toast";
import type { ToastAction, ToastId } from "../components/toast";
import { useBillingLabels } from "./billing-labels";
import type { BillingLabels } from "./billing-labels";
import type { PlanLimitRefusal } from "./plan-limit";
import { planLimitMailto } from "./plan-limit-notice";

export interface PlanLimitToastOptions {
  /** `upgrade`: plans are bought — "Choose a plan". `contact`: the operator grants them
   *  by hand — "Ask for more", a mail to support. */
  mode: "upgrade" | "contact";
  /** `upgrade`: the app's navigation to its subscription page (the kit has no router).
   *  Left out, the toast has no action. */
  onChoosePlan?: () => void;
  /** `contact`: support@ the app's domain, opened as `planLimitMailto(email,
   *  contactSubject(name))`. Left out, the toast has no action. */
  email?: string;
  /** The app's word per dimension: `{ budgets: "Budgets", scans: "Scans this month" }`.
   *  A dimension without one is named by its key. */
  dimensionLabels?: Readonly<Record<string, string>>;
  /** How a figure is written — kastlan's storage limit is bytes. Default: a number in
   *  the kit's locale. */
  formatValue?: (dimension: string, value: number) => string;
  /** Prop > `<UiKitProvider labels={{ billing }}>` > English. */
  labels?: LabelOverride<BillingLabels>;
}

/**
 * `PlanLimitNotice`'s words as a toast (docs/billing-harmonization.md §14.11), for a
 * refused create with no room for the notice — a row's button, a share target: "Plan
 * limit reached", what to do, the figure when the refusal has one ("Budgets: 3 of 3"),
 * and the mode's action.
 *
 *     const showLimit = usePlanLimitToast({
 *       mode: "upgrade",
 *       onChoosePlan: () => navigate("/settings/subscription"),
 *       dimensionLabels: { budgets: t("billing.dim_budgets") },
 *     });
 *     catch (err) { const hit = isPlanLimit(err); if (hit) showLimit(hit); }
 *
 * One toast per dimension: its id is `plan-limit:<dimension>`, so a repeat replaces it
 * in place instead of stacking a second (keksdose's own hook stacked). Called with no
 * hit, it says the words without a figure, under `plan-limit`. No `limit` in the
 * refusal, no figure line; keksdose's legacy `plan_budget_limit` reads as `budgets`
 * (`isPlanLimit`, §12.16). Returns the toast's id.
 */
export function usePlanLimitToast(options: PlanLimitToastOptions): (hit?: PlanLimitRefusal) => ToastId {
  const { mode, onChoosePlan, email, dimensionLabels, formatValue, labels: labelsProp } = options;
  const labels = useBillingLabels(labelsProp);
  const locale = useKitLocale();
  return useCallback(
    (hit?: PlanLimitRefusal) => {
      const dimension = hit?.dimension ?? "";
      const name = dimensionLabels?.[dimension] ?? dimension;
      const figure = (value: number) =>
        formatValue ? formatValue(dimension, value) : formatNumber(value, { locale });
      // A body without `used` was refused for being AT the limit (PlanLimitNotice's rule).
      const usage =
        hit?.limit !== undefined
          ? labels.limitUsageLine(name, figure(hit.used ?? hit.limit), figure(hit.limit))
          : undefined;
      const action: ToastAction | undefined =
        mode === "upgrade"
          ? onChoosePlan && { label: labels.choosePlan, onClick: () => onChoosePlan() }
          : email
            ? {
                label: labels.askForMore,
                // A mailto: hands the address to the reader's mail client; the page stays.
                onClick: () => documentNavigation.replace(planLimitMailto(email, labels.contactSubject(name))),
              }
            : undefined;
      return toast.warning(labels.limitReached, {
        id: dimension ? `plan-limit:${dimension}` : "plan-limit",
        description: (
          <span data-plan-limit-mode={mode} data-dimension={dimension || undefined}>
            <span className="block">{mode === "upgrade" ? labels.limitUpgrade : labels.limitContact}</span>
            {usage !== undefined && <span className="block tabular-nums">{usage}</span>}
          </span>
        ),
        action,
      });
    },
    [mode, onChoosePlan, email, dimensionLabels, formatValue, labels, locale],
  );
}
