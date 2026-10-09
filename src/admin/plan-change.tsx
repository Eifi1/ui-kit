import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { formatNumber, EMPTY_FORMATTED_VALUE } from "../lib/format";
import { toLocalIso } from "../lib/dates";
import type { DataTableColumn } from "../components/data-table";
import { DatePicker } from "../components/date-picker";
import { Tooltip } from "../components/tooltip";
import { Select } from "../components/ui";
import { COMMIT_EXCEPT_BILLING } from "../components/write-lock";
import { useBillingLabels } from "../billing/billing-labels";
import type { SubscriptionStatus } from "../billing/billing-labels";
import { SubscriptionStatusChip } from "../billing/subscription-status-chip";
import { AdminActionConfirm } from "./admin-action-confirm";
import type { AdminActionConfirmValues } from "./admin-action-confirm";
import { personLabel, useDayText } from "./admin-parts";
import type { AdminPerson, MaybePromise } from "./admin-parts";

/**
 * The operator's plan parts (docs/billing-harmonization.md §14.12, decision 27):
 * {@link planColumn} for the roster or the companies list, {@link PlanChangeConfirm}
 * for the grant, and {@link usePlanChangeResult} for what the answer says.
 *
 * All three apps have the route (`POST /admin/users/{id}/plan`, kastlan's
 * `POST /platform/companies/{id}/plan`) and server-kit's `PlanChangeRequest` /
 * `PlanChangeResponse`; only keksdose had a UI (`users-panel.tsx`, `PlanConfirm` in
 * `user-admin-confirm.tsx`), and these are its parts, lifted. The plan names are the
 * app's (§3.1): every part takes `planName` or the plans with their names. The plan
 * codes come from `GET /admin/plans` (kastlan `GET /platform/plans`), which answers
 * whatever the billing switch says.
 */

/** The `planChange` namespace: the column, the grant dialog and the result's lines. */
export interface PlanChangeLabels {
  /** The column's header: "Plan". */
  column: string;
  /** The dialog's title: "Change plan". */
  title: string;
  /** Its confirm button: "Change plan". */
  confirm: string;
  /** The plan select's label: "Plan". */
  plan: string;
  /** The line over the select: "Current plan: Free". */
  current: (plan: string) => string;
  /** Under the select — the fact that is not on the button. */
  keepsItems: string;
  /** The end of a free grant's field: "Free until". */
  until: string;
  /** Under it. */
  untilHint: string;
  /** Why the confirm is held while nothing would change. */
  needsChange: string;
  /** The result: the plan moved from one to another. */
  changed: (from: string, to: string) => string;
  /** The result: an account with no plan before, or the same plan again. */
  set: (to: string) => string;
  /** The result: a running beta kept its own end (§12.34); only the plan moved. */
  keptBeta: string;
  /** The result: the grant runs until `date` (formatted). */
  untilDone: (date: string) => string;
  /** The result: the account owns more than the new plan allows. */
  overLimit: string;
  /** The column's usage, spelled out (its tooltip): "1 of 5 budgets". Figures arrive
   *  formatted; `dimension` is the app's word, as `usage` gives it. */
  usageOf: (used: string, limit: string, dimension: string) => string;
}

export const DEFAULT_PLAN_CHANGE_LABELS: PlanChangeLabels = {
  column: "Plan",
  title: "Change plan",
  confirm: "Change plan",
  plan: "Plan",
  current: (plan) => `Current plan: ${plan}`,
  keepsItems: "A smaller plan only blocks creating more; nothing is deleted.",
  until: "Free until",
  untilHint: "Leave empty for no end. A running beta keeps its own end.",
  needsChange: "Pick another plan or an end date.",
  changed: (from, to) => `Plan changed from ${from} to ${to}.`,
  set: (to) => `Plan set to ${to}.`,
  keptBeta: "The beta keeps its end; only the plan changed.",
  untilDone: (date) => `Free until ${date}.`,
  overLimit: "Above the new plan’s limit: nothing is removed, new items are blocked.",
  usageOf: (used, limit, dimension) => `${used} of ${limit} ${dimension}`,
};

/** A plan code as the parts compare it: lowercase (§12.16 — an older row's "FREE" is
 *  the same plan as "free"), and no code at all as null. */
function codeOf(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toLowerCase();
  return code === "" ? null : code;
}

/* ── The column ────────────────────────────────────────────────────────────── */

/** What a row's usage is, for the line under its plan: "1/5". */
export interface PlanColumnUsage {
  used: number;
  /** The plan's limit for it; `null` (unlimited, or none known): no line. */
  limit: number | null;
  /** The app's word for what is counted, as in "1 of 5 budgets". */
  label: string;
}

export interface PlanColumnOptions<T> {
  /** The column's key. Default `"plan"`. */
  key?: string;
  /** The row's plan code, read without case (§12.16); null for none. */
  plan: (row: T) => string | null;
  /** The plan's display name, the app's (§3.1). Gets the lowercase code. */
  planName: (code: string) => string;
  /** The row's standing, as a `SubscriptionStatusChip` beside the name. Left out, or
   *  undefined for a row: no chip — billing off, where a status says nothing. */
  status?: (row: T) => SubscriptionStatus | undefined;
  /** The row's usage of its plan's limit: "1/5" under the name, "1 of 5 budgets" in
   *  the tooltip. Undefined for a row, or a `null` limit: no line. */
  usage?: (row: T) => PlanColumnUsage | undefined;
  /** A select filter over these codes, each named by `planName`. Left out: none. */
  filterPlans?: readonly string[];
  /**
   * The sort. Default: by the plan code (keksdose's, `users-panel.tsx:739`). A function:
   * by its value — the catalogue's `sort` for rank order. `false`: not sortable.
   */
  sortBy?: false | ((row: T) => string | number | null | undefined);
  /** The header's text. Default `planChange.column`. */
  headerText?: string;
  /** The words, already resolved. Default English; {@link usePlanColumn} reads the
   *  provider's `planChange` namespace. */
  labels?: Partial<PlanChangeLabels>;
}

/** The cell: a component, so the figures follow the provider's locale. */
function PlanCell({
  code,
  name,
  status,
  usage,
  usageOf,
}: {
  code: string | null;
  name: string;
  status: SubscriptionStatus | undefined;
  usage: PlanColumnUsage | undefined;
  usageOf: PlanChangeLabels["usageOf"];
}) {
  const locale = useKitLocale();
  const figure = (value: number) => formatNumber(value, { locale });
  return (
    <div className="whitespace-nowrap" data-plan={code ?? undefined}>
      <div className="flex items-center gap-1.5">
        <span className={code ? "font-medium" : "text-[var(--text-muted)]"}>{name}</span>
        {/* The standing at a glance (§6): the kit's word and tone, never colour alone. */}
        {status !== undefined && <SubscriptionStatusChip status={status} size="xs" />}
      </div>
      {usage && usage.limit !== null && (
        // "1/5" under the plan, "1 of 5 budgets" in the tooltip: the sentence spelled out
        // inline was the widest thing in keksdose's table.
        <Tooltip label={usageOf(figure(usage.used), figure(usage.limit), usage.label)}>
          <span className="block text-xs tabular-nums text-[var(--text-muted)]">
            {figure(usage.used)}/{figure(usage.limit)}
          </span>
        </Tooltip>
      )}
    </div>
  );
}

/**
 * The roster's (or the companies list's) plan column: the plan's display name, the
 * standing chip beside it while billing is on, and the usage under it — keksdose's
 * column, `users-panel.tsx:706-745`. Pass it in `userRosterColumns`' `extra`, or in
 * any `DataTable`'s columns:
 *
 *     extra: [planColumn<AdminUserRow>({
 *       plan: (u) => u.plan,
 *       planName,
 *       status: billingOn ? (u) => u.subscription?.status : undefined,
 *       usage: (u) => ({ used: u.budgets_owned, limit: u.limits.budgets, label: t("budgets") }),
 *       filterPlans: plans.map((p) => p.code),
 *     })]
 *
 * Pure: hand it resolved words, or use {@link usePlanColumn}.
 */
export function planColumn<T>(options: PlanColumnOptions<T>): DataTableColumn<T> {
  const { key = "plan", plan, planName, status, usage, filterPlans, sortBy, headerText, labels: labelsProp } = options;
  const labels: PlanChangeLabels = { ...DEFAULT_PLAN_CHANGE_LABELS, ...labelsProp };
  const header = headerText ?? labels.column;
  const nameOf = (code: string | null) => (code ? planName(code) : EMPTY_FORMATTED_VALUE);
  return {
    key,
    header,
    headerText: header,
    cell: (row) => {
      const code = codeOf(plan(row));
      return (
        <PlanCell
          code={code}
          name={nameOf(code)}
          status={status?.(row)}
          usage={usage?.(row)}
          usageOf={labels.usageOf}
        />
      );
    },
    sortBy: sortBy === false ? undefined : (sortBy ?? ((row) => codeOf(plan(row)) ?? "")),
    filter: filterPlans
      ? {
          type: "select",
          getValue: (row) => codeOf(plan(row)) ?? "",
          options: [...new Set(filterPlans.map((code) => codeOf(code)).filter((code) => code !== null))].map(
            (code) => ({ value: code, label: planName(code) }),
          ),
        }
      : undefined,
  };
}

/**
 * {@link planColumn} with the `planChange` words from the provider, memoised on the
 * options — pass stable callbacks (`useCallback`), or the column is rebuilt on every
 * render.
 */
export function usePlanColumn<T>(options: PlanColumnOptions<T>): DataTableColumn<T> {
  const { key, plan, planName, status, usage, filterPlans, sortBy, headerText, labels: labelsProp } = options;
  const labels = useKitLabels("planChange", DEFAULT_PLAN_CHANGE_LABELS, labelsProp);
  return useMemo(
    () => planColumn<T>({ key, plan, planName, status, usage, filterPlans, sortBy, headerText, labels }),
    [key, plan, planName, status, usage, filterPlans, sortBy, headerText, labels],
  );
}

/* ── The grant ─────────────────────────────────────────────────────────────── */

/** What {@link PlanChangeConfirmProps.onConfirm} sends: server-kit's
 *  `PlanChangeRequest` without its `acknowledged`, which comes in `values`. */
export interface PlanChange {
  /** The picked plan's code. */
  plan: string;
  /** The end of the free grant, as ISO UTC — only when one was picked. */
  comped_until?: string;
}

export interface PlanChangeConfirmProps {
  /**
   * Whom it is about — a user (`AdminActionTarget`), or kastlan's company, which has no
   * address: its name is said instead (the level is `acknowledge`, so nothing is typed).
   */
  target: AdminPerson & { email?: string | null };
  /** The plans to offer, in the catalogue's order, by their display names (§3.1) — from
   *  `GET /admin/plans`. */
  plans: readonly { code: string; name: string }[];
  /** The account's plan now; null for none. The select opens on it. */
  current: string | null;
  /** What the account uses, in the app's sentence: "3 of 5 budgets". */
  usage?: ReactNode;
  /** Offer "Free until" — only meaningful while billing is on, where a grant's end
   *  means something to the payer. */
  grantEnd?: boolean;
  /**
   * Sends it: `{plan}`, and `comped_until` only when an end was picked — the END of the
   * picked day in the operator's time zone, as ISO UTC (a grant "until 31 January" lasts
   * through it). No end: a grant without one, or on a running beta only the plan moves
   * and the beta keeps its own end (§12.34). `values.acknowledged` is the body's
   * `acknowledged`. A promise is handled as `AdminActionConfirm`'s.
   */
  onConfirm: (change: PlanChange, values: AdminActionConfirmValues) => MaybePromise;
  onClose: (done: boolean) => void;
  /** The app's words for a failure the kit has no code for. */
  describeError?: (error: unknown) => ReactNode | undefined;
  labels?: Partial<PlanChangeLabels>;
}

/** The end of the day `date` (YYYY-MM-DD) names, in this device's time zone, as ISO
 *  UTC — keksdose's `endOfDay` (`user-admin-confirm.tsx:44-46`). */
function endOfDay(date: string): string {
  return new Date(`${date}T23:59:59`).toISOString();
}

/**
 * An operator's plan change (§14.12): `AdminActionConfirm` at `acknowledge`, the line
 * with the current plan and the app's usage sentence, a plan select, and — with
 * `grantEnd` — the end of a free grant. The confirm is held while nothing would change.
 *
 * Exempt from a BILLING lock, built in (`COMMIT_EXCEPT_BILLING`, §12.36): a plan change
 * is an admin route (§12.13), and the operator's own account or company may be lapsed —
 * kastlan's review. A demo lock still holds it.
 */
export function PlanChangeConfirm({
  target,
  plans,
  current: currentProp,
  usage,
  grantEnd = false,
  onConfirm,
  onClose,
  describeError,
  labels: labelsProp,
}: PlanChangeConfirmProps) {
  const labels = useKitLabels("planChange", DEFAULT_PLAN_CHANGE_LABELS, labelsProp);
  const locale = useKitLocale();
  // Seeded from the account, so the picker opens on the truth and confirming without
  // touching it is held rather than a silent free → free in the audit.
  const current = codeOf(currentProp);
  const [plan, setPlan] = useState(current ?? "");
  const [until, setUntil] = useState("");
  // A grant ends today at the earliest; read once, not on every render.
  const [today] = useState(() => toLocalIso(new Date()));
  const options = plans.map((p) => ({ code: codeOf(p.code) ?? p.code, name: p.name }));
  const nameOf = (code: string) => options.find((p) => p.code === code)?.name ?? code;
  // An account on a plan the catalogue no longer lists still opens on it.
  if (current && !options.some((p) => p.code === current)) options.unshift({ code: current, name: current });
  const unchanged = plan === "" || (plan === current && !until);
  // A company has no address: the dialog says its name in the address's place.
  const who = { ...target, email: target.email || personLabel(target, locale) };

  return (
    <AdminActionConfirm
      level="acknowledge"
      tone="warning"
      target={who}
      title={labels.title}
      confirmLabel={labels.confirm}
      confirmDisabledReason={unchanged ? labels.needsChange : undefined}
      describeError={describeError}
      commit={COMMIT_EXCEPT_BILLING}
      onConfirm={(values) => onConfirm({ plan, ...(until ? { comped_until: endOfDay(until) } : {}) }, values)}
      onClose={onClose}
    >
      {(current !== null || usage !== undefined) && (
        <div className="space-y-0.5 text-xs text-[var(--text-muted)]" data-plan-current={current ?? undefined}>
          {current !== null && <p>{labels.current(nameOf(current))}</p>}
          {usage !== undefined && <p>{usage}</p>}
        </div>
      )}
      <Select label={labels.plan} hint={labels.keepsItems} value={plan} onChange={(e) => setPlan(e.target.value)}>
        {plan === "" && (
          <option value="" disabled>
            {EMPTY_FORMATTED_VALUE}
          </option>
        )}
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </Select>
      {grantEnd && (
        <DatePicker
          label={labels.until}
          hint={labels.untilHint}
          value={until}
          onChange={setUntil}
          min={today}
          clearable
        />
      )}
    </AdminActionConfirm>
  );
}

/* ── The answer ────────────────────────────────────────────────────────────── */

/**
 * A `PlanChangeResponse` as the page reads it — server-kit 0.7's (§14.12), which gained
 * `previous_plan` nullable, `usage`, `kept_beta` and `comped_until`.
 */
export interface PlanChangeOutcome {
  /** null: the account had no subscription. */
  previous_plan: string | null;
  plan: string;
  over_limit: boolean;
  /** The new plan's limits; null for unlimited. */
  limits: Readonly<Record<string, number | null>>;
  /** What the payer has, per dimension — the figures for the over-limit lines:
   *  `{ budgets: 7 }`. */
  usage: Readonly<Record<string, number>>;
  /** A running beta kept its own end (§12.34). */
  kept_beta?: boolean;
  /** The grant's end as the change wrote it; null: no end, or no grant. */
  comped_until?: string | null;
}

/** A line's tone: the app's toast kind. */
export type PlanChangeTone = "success" | "info" | "warning";

export interface PlanChangeLine {
  tone: PlanChangeTone;
  text: string;
}

export interface PlanChangeResultOptions {
  /** The app's word per dimension, for the over-limit figures: `{ budgets: "Budgets" }`.
   *  A dimension without one is named by its key. */
  dimensionLabels?: Readonly<Record<string, string>>;
  /** How a figure is written. Default: a number in the kit's locale. */
  formatValue?: (dimension: string, value: number) => string;
}

/**
 * The lines for a plan change's answer, each with its tone, for the app's toasts —
 * echoing the SERVER's before and after, not what was picked: a toast that reported the
 * request would say "done" to a write that landed differently (keksdose's rule).
 *
 *     const lines = usePlanChangeResult();
 *     for (const line of lines(res, planName)) toast[line.tone](line.text);
 *
 * - `changed(from, to)`, or `set(to)` with no previous plan (or the same one): success;
 * - a running beta that kept its end: `keptBeta`, info; else a grant's end:
 *   `untilDone(date)`, success;
 * - over the new limit: `overLimit`, then one figure line per dimension over it ("Budgets:
 *   7 of 5", `billing.limitUsageLine`), from `usage` and `limits`: warning. A `null`
 *   limit gives no figure line.
 */
export function usePlanChangeResult(): (
  res: PlanChangeOutcome,
  planName: (code: string) => string,
  options?: PlanChangeResultOptions,
) => PlanChangeLine[] {
  const labels = useKitLabels("planChange", DEFAULT_PLAN_CHANGE_LABELS);
  const billing = useBillingLabels();
  const locale = useKitLocale();
  const dayText = useDayText();
  return useCallback(
    (res, planName, options = {}) => {
      const { dimensionLabels, formatValue } = options;
      const name = (raw: string) => planName(codeOf(raw) ?? raw);
      const to = name(res.plan);
      const from = codeOf(res.previous_plan);
      const lines: PlanChangeLine[] = [
        {
          tone: "success",
          text: from !== null && from !== codeOf(res.plan) ? labels.changed(name(from), to) : labels.set(to),
        },
      ];
      if (res.kept_beta) lines.push({ tone: "info", text: labels.keptBeta });
      else if (res.comped_until) lines.push({ tone: "success", text: labels.untilDone(dayText(res.comped_until)) });
      if (res.over_limit) {
        lines.push({ tone: "warning", text: labels.overLimit });
        const figure = (dimension: string, value: number) =>
          formatValue ? formatValue(dimension, value) : formatNumber(value, { locale });
        // Read defensively: an app's server from before 0.7 sent neither.
        for (const [dimension, limit] of Object.entries(res.limits ?? {})) {
          const used = res.usage?.[dimension];
          if (limit === null || used === undefined || used <= limit) continue;
          lines.push({
            tone: "warning",
            text: billing.limitUsageLine(
              dimensionLabels?.[dimension] ?? dimension,
              figure(dimension, used),
              figure(dimension, limit),
            ),
          });
        }
      }
      return lines;
    },
    [labels, billing, locale, dayText],
  );
}
